"use client";

/**
 * Payment-QR service — the signed-in athlete's own QR codes, backed by Supabase
 * (`qr_codes` table, owner_id = the athlete's profile id). RLS ensures an
 * athlete can only read/write their own codes; everyone can read (supporters
 * need to see an athlete's codes to pay).
 */
import { createClient } from "@/src/app/lib/supabase/client";

export interface QrCodeRow {
  id: string;
  method: string;
  label: string;
  accountNumber: string;
  image: string;
}

interface RawQr {
  id: string;
  method: string;
  label: string;
  account_number: string | null;
  image: string | null;
}

function mapRow(r: RawQr): QrCodeRow {
  return {
    id: r.id,
    method: r.method,
    label: r.label,
    accountNumber: r.account_number ?? "",
    image: r.image ?? "",
  };
}

/** Load the QR codes owned by a given athlete user id (public read). */
export async function getQrCodesForOwner(ownerId: string): Promise<QrCodeRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, method, label, account_number, image")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRow(r as RawQr));
}

/** Load the current signed-in athlete's own QR codes. */
export async function getMyQrCodes(): Promise<QrCodeRow[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  return getQrCodesForOwner(uid);
}

export interface QrInput {
  method: string;
  label: string;
  accountNumber: string;
  image?: string;
}

/** Add a QR code owned by the signed-in athlete. */
export async function addMyQrCode(input: QrInput): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in.");
  const { error } = await supabase.from("qr_codes").insert({
    owner_id: uid,
    method: input.method,
    label: input.label.trim(),
    account_number: input.accountNumber.trim(),
    image: input.image ?? "",
  });
  if (error) throw new Error(error.message);
}

/** Update one of the signed-in athlete's QR codes (RLS enforces ownership). */
export async function updateMyQrCode(id: string, patch: Partial<QrInput>): Promise<void> {
  const supabase = createClient();
  const update: Record<string, string> = {};
  if (patch.method !== undefined) update.method = patch.method;
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.accountNumber !== undefined) update.account_number = patch.accountNumber.trim();
  if (patch.image !== undefined) update.image = patch.image;
  const { error } = await supabase.from("qr_codes").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Remove one of the signed-in athlete's QR codes. */
export async function removeMyQrCode(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("qr_codes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
