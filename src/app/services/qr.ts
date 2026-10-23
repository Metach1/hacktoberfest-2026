"use client";

import { createClient } from "@/src/app/lib/supabase/client";

export interface QrCodeRecord {
  id: string;
  method: string;
  label: string;
  accountNumber: string;
  image: string;
}

interface QrCodeRow {
  id: string;
  method: string;
  label: string;
  account_number: string;
  image: string;
}

function mapQrCode(row: QrCodeRow): QrCodeRecord {
  return {
    id: row.id,
    method: row.method,
    label: row.label,
    accountNumber: row.account_number,
    image: row.image,
  };
}

async function requireAthleteId(): Promise<string> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (profile?.role !== "athlete") throw new Error("Only athlete accounts can manage payment QR codes.");
  return userId;
}

/** Load an athlete's publicly readable payment QR codes. */
export async function listQrCodes(ownerId: string): Promise<QrCodeRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, method, label, account_number, image")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as QrCodeRow[]).map(mapQrCode);
}

/** Load the signed-in athlete's QR codes. */
export async function listMyQrCodes(): Promise<QrCodeRecord[]> {
  return listQrCodes(await requireAthleteId());
}

/** Publish a payment QR code for the signed-in athlete. */
export async function createQrCode(input: Omit<QrCodeRecord, "id">): Promise<QrCodeRecord> {
  const ownerId = await requireAthleteId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .insert({
      owner_id: ownerId,
      method: input.method,
      label: input.label.trim(),
      account_number: input.accountNumber.trim(),
      image: input.image,
    })
    .select("id, method, label, account_number, image")
    .single();
  if (error) throw new Error(error.message);
  return mapQrCode(data as QrCodeRow);
}

/** Edit a QR code owned by the signed-in athlete. */
export async function updateQrCode(
  id: string,
  patch: Partial<Omit<QrCodeRecord, "id">>,
): Promise<void> {
  await requireAthleteId();
  const update: Record<string, string> = {};
  if (patch.method !== undefined) update.method = patch.method;
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.accountNumber !== undefined) update.account_number = patch.accountNumber.trim();
  if (patch.image !== undefined) update.image = patch.image;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This QR code could not be found or you do not own it.");
}

/** Remove a QR code owned by the signed-in athlete. */
export async function deleteQrCode(id: string): Promise<void> {
  await requireAthleteId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This QR code could not be found or you do not own it.");
}
