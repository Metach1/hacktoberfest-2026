import "server-only";

import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";
import { decisionFromScores, runModerationProvider } from "./moderation-policy.mjs";
import { MODERATION_CONFIG } from "./moderation-config.mjs";

export type ModerationStatus = "approved" | "needs_review" | "rejected";

export interface ModerationResult {
  result: ModerationStatus;
  reason: string;
}

export interface ModerationProvider {
  moderate(image: Buffer): Promise<ModerationResult>;
}

type Prediction = { className: string; probability: number };

let modelPromise: ReturnType<typeof nsfwjs.load> | undefined;

async function localProvider(image: Buffer): Promise<ModerationResult> {
  modelPromise ??= nsfwjs.load();
  const model = await modelPromise;
  const { data, info } = await sharp(image)
    .resize(224, 224, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels]);
  try {
    const predictions: Prediction[] = await model.classify(tensor);
    const scores = Object.fromEntries(
      predictions.map(({ className, probability }) => [className, probability]),
    );
    return decisionFromScores(scores);
  } finally {
    tensor.dispose();
  }
}

async function hostedProvider(image: Buffer): Promise<ModerationResult> {
  const endpoint = process.env.IMAGE_MODERATION_API_URL;
  if (!endpoint) return localProvider(image);

  const body = new FormData();
  body.append("image", new Blob([new Uint8Array(image)], { type: "application/octet-stream" }), "upload");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: process.env.IMAGE_MODERATION_API_KEY
      ? { Authorization: `Bearer ${process.env.IMAGE_MODERATION_API_KEY}` }
      : undefined,
    body,
    signal: AbortSignal.timeout(MODERATION_CONFIG.timeoutMs),
  });
  if (!response.ok) throw new Error(`Moderation provider returned ${response.status}.`);

  const value: unknown = await response.json();
  if (
    !value ||
    typeof value !== "object" ||
    !("result" in value) ||
    !("reason" in value) ||
    !["approved", "needs_review", "rejected"].includes(String(value.result)) ||
    typeof value.reason !== "string"
  ) {
    throw new Error("Moderation provider returned an invalid response.");
  }
  return { result: value.result as ModerationStatus, reason: value.reason };
}

export async function moderateImage(file: File): Promise<ModerationResult> {
  return runModerationProvider(async () => {
    const image = Buffer.from(await file.arrayBuffer());
    const provider: ModerationProvider = {
      moderate: process.env.IMAGE_MODERATION_API_URL ? hostedProvider : localProvider,
    };
    return provider.moderate(image);
  });
}
