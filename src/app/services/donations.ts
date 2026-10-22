"use client";

import { createClient } from "@/src/app/lib/supabase/client";

export type DirectDonationStatus = "pending" | "confirmed" | "rejected";

export const DIRECT_TRANSFER_REJECTION_REASONS = [
  { value: "amount_mismatch", label: "Amount does not match" },
  { value: "transfer_not_received", label: "Transfer not received" },
  { value: "duplicate_reference", label: "Duplicate transaction reference" },
  { value: "other", label: "Other" },
] as const;

export function directTransferRejectionLabel(value: string | null): string {
  return DIRECT_TRANSFER_REJECTION_REASONS.find((reason) => reason.value === value)?.label ?? value ?? "";
}

export interface DirectDonation {
  id: string;
  athleteOwnerId: string;
  supporterId: string | null;
  amount: number;
  method: string;
  reference: string;
  supporterName: string;
  note: string;
  status: DirectDonationStatus;
  createdAt: number;
  confirmedAt: number | null;
  rejectionReason: string | null;
  rejectionNote: string;
}

interface DonationRow {
  id: string;
  athlete_owner_id: string;
  supporter_id: string | null;
  amount: number;
  method: string;
  reference: string;
  supporter_name: string;
  note: string;
  status: DirectDonationStatus;
  created_at: string;
  confirmed_at: string | null;
  rejection_reason: string | null;
  rejection_note: string;
}

function mapDonation(row: DonationRow): DirectDonation {
  return {
    id: row.id,
    athleteOwnerId: row.athlete_owner_id,
    supporterId: row.supporter_id,
    amount: row.amount,
    method: row.method,
    reference: row.reference,
    supporterName: row.supporter_name,
    note: row.note,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : null,
    rejectionReason: row.rejection_reason,
    rejectionNote: row.rejection_note,
  };
}

async function requireSignedInUser(expectedRole?: "athlete" | "supporter"): Promise<string> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in.");
  if (expectedRole) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (profile?.role !== expectedRole) throw new Error(`Only ${expectedRole}s can do this.`);
  }
  return userId;
}

/** Record a supporter-reported transfer; this does not process or verify payment. */
export async function reportDirectDonation(input: {
  athleteOwnerId: string;
  amount: number;
  method: string;
  reference: string;
  supporterName?: string;
  note?: string;
}): Promise<DirectDonation> {
  const supporterId = await requireSignedInUser("supporter");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  if (!input.method.trim() || !input.reference.trim()) {
    throw new Error("Payment method and transaction reference are required.");
  }
  if (input.athleteOwnerId === supporterId) {
    throw new Error("You can't report a transfer to your own account.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .insert({
      supporter_id: supporterId,
      athlete_owner_id: input.athleteOwnerId,
      amount: input.amount,
      method: input.method.trim(),
      reference: input.reference.trim(),
      supporter_name: input.supporterName?.trim() || "Anonymous supporter",
      note: input.note?.trim() ?? "",
      status: "pending",
    })
    .select("id, athlete_owner_id, supporter_id, amount, method, reference, supporter_name, note, status, created_at, confirmed_at, rejection_reason, rejection_note")
    .single();
  if (error) throw new Error(error.message);
  return mapDonation(data as DonationRow);
}

/** Load the signed-in supporter's direct-transfer reports. */
export async function getMyDirectDonations(): Promise<DirectDonation[]> {
  const supporterId = await requireSignedInUser("supporter");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("id, athlete_owner_id, supporter_id, amount, method, reference, supporter_name, note, status, created_at, confirmed_at, rejection_reason, rejection_note")
    .eq("supporter_id", supporterId)
    .not("athlete_owner_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DonationRow[]).map(mapDonation);
}

/** Load direct-transfer reports received by the signed-in athlete. */
export async function getMyIncomingDirectDonations(): Promise<DirectDonation[]> {
  const athleteId = await requireSignedInUser("athlete");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("id, athlete_owner_id, supporter_id, amount, method, reference, supporter_name, note, status, created_at, confirmed_at, rejection_reason, rejection_note")
    .eq("athlete_owner_id", athleteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DonationRow[]).map(mapDonation);
}

/** Athlete confirmation records their assertion that the transfer arrived. */
export async function confirmDirectDonation(donationId: string): Promise<void> {
  await requireSignedInUser("athlete");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", donationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This transfer is no longer pending or isn't available to you.");
}

/** Athlete rejection records that the reported transfer could not be confirmed. */
export async function rejectDirectDonation(
  donationId: string,
  reason: string,
  note: string,
): Promise<void> {
  await requireSignedInUser("athlete");
  if (!reason.trim()) throw new Error("Choose a rejection reason.");
  if (!DIRECT_TRANSFER_REJECTION_REASONS.some((item) => item.value === reason)) {
    throw new Error("Choose a valid rejection reason.");
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      rejection_note: note.trim(),
    })
    .eq("id", donationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This transfer is no longer pending or isn't available to you.");
}
