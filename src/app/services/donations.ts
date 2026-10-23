"use client";

import { createClient } from "@/src/app/lib/supabase/client";

export type DonationStatus = "pending" | "confirmed" | "rejected";

export interface DonationRecord {
  id: string;
  athleteId: number;
  athleteProfileId: string | null;
  athleteName?: string;
  supporterId: string | null;
  amount: number;
  method: string;
  reference: string;
  supporterName: string;
  receiptName: string;
  receiptPreview: string;
  note: string;
  status: DonationStatus;
  createdAt: number;
  confirmedAt: number | null;
  confirmedBy: "athlete" | "auto" | null;
  rejectedAt: number | null;
  rejectionReason: string | null;
  rejectionNote: string;
}

interface DonationRow {
  id: string;
  athlete_owner_id: string | null;
  catalog_athlete_id: number | null;
  supporter_id: string | null;
  amount: number;
  method: string;
  reference: string;
  supporter_name: string;
  receipt_name: string;
  receipt_preview: string;
  note: string;
  status: DonationStatus;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: "athlete" | "auto" | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_note: string;
}

interface PublicDonationRow {
  id: string;
  athlete_owner_id: string | null;
  catalog_athlete_id: number | null;
  amount: number;
  supporter_name: string;
  status: "confirmed";
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: "athlete" | "auto" | null;
}

interface AthleteProfileRow {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
}

const DONATION_COLUMNS =
  "id, athlete_owner_id, catalog_athlete_id, supporter_id, amount, method, reference, supporter_name, receipt_name, receipt_preview, note, status, created_at, confirmed_at, confirmed_by, rejected_at, rejection_reason, rejection_note";

function mapDonation(row: DonationRow, athleteId: number, athleteName?: string): DonationRecord {
  return {
    id: row.id,
    athleteId,
    athleteProfileId: row.athlete_owner_id,
    ...(athleteName ? { athleteName } : {}),
    supporterId: row.supporter_id,
    amount: row.amount,
    method: row.method,
    reference: row.reference,
    supporterName: row.supporter_name,
    receiptName: row.receipt_name,
    receiptPreview: row.receipt_preview,
    note: row.note,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : null,
    confirmedBy: row.confirmed_by,
    rejectedAt: row.rejected_at ? new Date(row.rejected_at).getTime() : null,
    rejectionReason: row.rejection_reason,
    rejectionNote: row.rejection_note,
  };
}

async function requireUser(expectedRole: "athlete" | "supporter"): Promise<string> {
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
  if (profile?.role !== expectedRole) throw new Error(`Only ${expectedRole}s can do this.`);
  return userId;
}

/** Load donations readable by the current user and map registered athletes to UI ids. */
export async function listDonations(): Promise<DonationRecord[]> {
  const supabase = createClient();
  const { error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);

  const [donationsResult, publicDonationsResult, profilesResult] = await Promise.all([
    supabase.from("donations").select(DONATION_COLUMNS).order("created_at", { ascending: false }),
    supabase.rpc("list_public_confirmed_donations"),
    supabase
      .from("profiles")
      .select("id, created_at, first_name, last_name")
      .eq("role", "athlete")
      .order("created_at", { ascending: false }),
  ]);
  if (donationsResult.error) throw new Error(donationsResult.error.message);
  if (publicDonationsResult.error) throw new Error(publicDonationsResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);

  const profiles = (profilesResult.data ?? []) as AthleteProfileRow[];
  const ownerIds = new Map(profiles.map((profile, index) => [profile.id, -(index + 1)]));
  const profileNames = new Map(profiles.map((profile) => [
    profile.id,
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Athlete",
  ]));
  const rows = (donationsResult.data ?? []) as DonationRow[];
  const privateRecords = rows.map((row) => mapDonation(
    row,
    row.catalog_athlete_id ?? ownerIds.get(row.athlete_owner_id ?? "") ?? 0,
    row.athlete_owner_id ? profileNames.get(row.athlete_owner_id) : undefined,
  ));
  const privateIds = new Set(privateRecords.map((record) => record.id));
  const publicRecords = ((publicDonationsResult.data ?? []) as PublicDonationRow[])
    .filter((row) => !privateIds.has(row.id))
    .map((row): DonationRecord => ({
      id: row.id,
      athleteId: row.catalog_athlete_id ?? ownerIds.get(row.athlete_owner_id ?? "") ?? 0,
      athleteProfileId: row.athlete_owner_id,
      ...(row.athlete_owner_id && profileNames.get(row.athlete_owner_id)
        ? { athleteName: profileNames.get(row.athlete_owner_id) }
        : {}),
      supporterId: null,
      amount: row.amount,
      method: "",
      reference: "",
      supporterName: row.supporter_name,
      receiptName: "",
      receiptPreview: "",
      note: "",
      status: row.status,
      createdAt: new Date(row.created_at).getTime(),
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : null,
      confirmedBy: row.confirmed_by,
      rejectedAt: null,
      rejectionReason: null,
      rejectionNote: "",
    }));
  return [...privateRecords, ...publicRecords].sort((a, b) => b.createdAt - a.createdAt);
}

/** Submit a donation to a registered athlete or fictional catalog athlete. */
export async function createDonation(input: {
  athleteId: number;
  athleteProfileId: string | null;
  amount: number;
  method: string;
  reference: string;
  supporterName?: string;
  receiptName?: string;
  receiptPreview?: string;
  note?: string;
}): Promise<DonationRecord> {
  const supporterId = await requireUser("supporter");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Donation amount must be a positive whole number.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .insert({
      supporter_id: supporterId,
      athlete_owner_id: input.athleteProfileId,
      catalog_athlete_id: input.athleteProfileId ? null : input.athleteId,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      supporter_name: input.supporterName?.trim() || "Anonymous supporter",
      receipt_name: input.receiptName ?? "",
      receipt_preview: input.receiptPreview ?? "",
      note: input.note ?? "",
      status: "pending",
    })
    .select(DONATION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapDonation(data as DonationRow, input.athleteId);
}

/** Confirm a pending donation as its recipient athlete. */
export async function confirmDonation(id: string): Promise<DonationRecord> {
  await requireUser("athlete");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .update({ status: "confirmed", confirmed_by: "athlete" })
    .eq("id", id)
    .eq("status", "pending")
    .select(DONATION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This donation is no longer pending or isn't available to you.");
  return mapDonation(data as DonationRow, 0);
}

/** Reject a pending donation as its recipient athlete. */
export async function rejectDonation(
  id: string,
  reason: string,
  note: string,
): Promise<DonationRecord> {
  await requireUser("athlete");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .update({
      status: "rejected",
      rejection_reason: reason,
      rejection_note: note.trim(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select(DONATION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This donation is no longer pending or isn't available to you.");
  return mapDonation(data as DonationRow, 0);
}

/** Resubmit an owned rejected donation, clearing stale review metadata. */
export async function resubmitDonation(
  id: string,
  input: {
    amount: number;
    method: string;
    reference: string;
    supporterName?: string;
    receiptName?: string;
    receiptPreview?: string;
    note?: string;
  },
): Promise<DonationRecord> {
  await requireUser("supporter");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Donation amount must be a positive whole number.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .update({
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      supporter_name: input.supporterName?.trim() || "Anonymous supporter",
      receipt_name: input.receiptName ?? "",
      receipt_preview: input.receiptPreview ?? "",
      note: input.note ?? "",
      status: "pending",
      created_at: new Date().toISOString(),
      confirmed_at: null,
      confirmed_by: null,
      rejected_at: null,
      rejection_reason: null,
      rejection_note: "",
    })
    .eq("id", id)
    .eq("status", "rejected")
    .select(DONATION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This rejected donation could not be found or is no longer yours to resubmit.");
  return mapDonation(data as DonationRow, 0);
}

/** Remove an owned pending or rejected donation. */
export async function deleteDonation(id: string): Promise<void> {
  await requireUser("supporter");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .delete()
    .eq("id", id)
    .in("status", ["pending", "rejected"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This donation could not be found or can no longer be removed.");
}

/** Persist demo auto-confirmation for all pending records past the three-day window. */
export async function autoConfirmDueDonations(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("auto_confirm_due_donations");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
