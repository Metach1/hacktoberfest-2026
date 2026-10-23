import "server-only";

import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ModerationStatus } from "./moderation";
import { isLocalStorageEnabled } from "./image-policy.mjs";

export interface StoredPostImage {
  id: string;
  ownerId: string;
  postId: string;
  fileName: string;
  mimeType: string;
  alt: string;
  status: ModerationStatus;
  reason: string;
  createdAt: string;
}

export interface ModerationDecision {
  userId: string;
  result: ModerationStatus;
  reason: string;
  time: string;
}

export interface StoredReport {
  id: string;
  reporterId: string;
  targetType: "post" | "image";
  targetId: string;
  reason: string;
  outcome: "pending" | "dismissed" | "warning" | "content_removed" | "account_suspended";
  createdAt: string;
}

const root = join(process.cwd(), "uploads");
const imagesDirectory = join(root, "images");
const metadataDirectory = join(root, "metadata");
const imagePath = (fileName: string) => join(imagesDirectory, fileName);
const metadataPath = (id: string) => join(metadataDirectory, `${id}.json`);

export function assertLocalStorage() {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    throw new Error("Local image storage is development-only. Configure durable storage before deployment.");
  }
}

async function ensureDirectories() {
  assertLocalStorage();
  await Promise.all([mkdir(imagesDirectory, { recursive: true }), mkdir(metadataDirectory, { recursive: true })]);
}

export async function saveImage(
  input: Omit<StoredPostImage, "id" | "fileName" | "createdAt">,
  bytes: Buffer,
  extension: string,
) {
  await ensureDirectories();
  const id = randomUUID();
  const fileName = `${randomUUID()}.${extension}`;
  const record: StoredPostImage = { ...input, id, fileName, createdAt: new Date().toISOString() };
  await writeFile(imagePath(fileName), bytes, { flag: "wx" });
  try {
    await writeFile(metadataPath(id), JSON.stringify(record), { flag: "wx" });
  } catch (error) {
    await rm(imagePath(fileName), { force: true });
    throw error;
  }
  return record;
}

export async function getImage(id: string): Promise<StoredPostImage | null> {
  assertLocalStorage();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    return JSON.parse(await readFile(metadataPath(id), "utf8")) as StoredPostImage;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readImageBytes(image: StoredPostImage) {
  assertLocalStorage();
  return readFile(imagePath(image.fileName));
}

export async function listImages(): Promise<StoredPostImage[]> {
  await ensureDirectories();
  const files = await readdir(metadataDirectory);
  const records = await Promise.all(
    files.filter((file) => file.endsWith(".json")).map(async (file) =>
      JSON.parse(await readFile(join(metadataDirectory, file), "utf8")) as StoredPostImage,
    ),
  );
  return records;
}

export async function updateImageStatus(id: string, status: ModerationStatus, reason: string) {
  const image = await getImage(id);
  if (!image) return null;
  const updated = { ...image, status, reason };
  await writeFile(metadataPath(id), JSON.stringify(updated));
  if (status === "rejected") await rm(imagePath(image.fileName), { force: true });
  return updated;
}

export async function deleteImage(id: string) {
  const image = await getImage(id);
  if (!image) return false;
  await Promise.all([
    rm(imagePath(image.fileName), { force: true }),
    rm(metadataPath(id), { force: true }),
  ]);
  return true;
}

export async function appendModerationDecision(decision: ModerationDecision) {
  assertLocalStorage();
  await mkdir(root, { recursive: true });
  await appendFile(join(root, "moderation-decisions.jsonl"), `${JSON.stringify(decision)}\n`);
}

export async function listModerationDecisions(): Promise<ModerationDecision[]> {
  assertLocalStorage();
  try {
    const contents = await readFile(join(root, "moderation-decisions.jsonl"), "utf8");
    return contents.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as ModerationDecision);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

const reportsPath = join(root, "reports.json");

export async function listReports(): Promise<StoredReport[]> {
  assertLocalStorage();
  try {
    return JSON.parse(await readFile(reportsPath, "utf8")) as StoredReport[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function saveReport(report: StoredReport) {
  assertLocalStorage();
  await mkdir(root, { recursive: true });
  const reports = await listReports();
  await writeFile(reportsPath, JSON.stringify([report, ...reports]));
}

export async function updateReportOutcome(id: string, outcome: StoredReport["outcome"]) {
  const reports = await listReports();
  const report = reports.find((item) => item.id === id);
  if (!report) return null;
  report.outcome = outcome;
  await writeFile(reportsPath, JSON.stringify(reports));
  return report;
}
