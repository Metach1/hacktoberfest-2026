
"use client";

import { createClient } from "@/src/app/lib/supabase/client";

/** A notification row as stored in Supabase, mapped to the UI shape. */
export interface NotificationRecord {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  /** Epoch ms, to match the existing in-memory Notification shape. */
  createdAt: number;
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

const COLUMNS = "id, recipient_id, type, title, body, href, read, created_at";

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: new Date(row.created_at).getTime(),
    ...(row.href ? { href: row.href } : {}),
  };
}

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user?.id ?? null;
}

/** Notifications addressed to the signed-in user, newest first. RLS enforces
 *  that only the recipient's own rows are returned. */
export async function listMyNotifications(): Promise<NotificationRecord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export interface CreateNotificationInput {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
}

/** Insert a notification addressed to a recipient. No-op (returns null) when
 *  there is no recipient to address.
 *
 *  IMPORTANT: this intentionally does NOT chain `.select()`/`.single()` after
 *  the insert. The actor creating a notification is (almost) never its
 *  recipient — a supporter's donation addresses the athlete, an athlete's
 *  decision addresses the supporter, a liker/commenter addresses the post
 *  author. The notifications_recipient_read RLS policy only returns rows where
 *  recipient_id = auth.uid(), so an insert-returning read is filtered to zero
 *  rows for the actor and `.single()` would throw (PGRST116) even though the
 *  INSERT itself committed. That is the exact failure that made every
 *  notification silently vanish. We only need to know the insert succeeded; the
 *  recipient loads the row for themselves via listMyNotifications (RLS-scoped),
 *  so there is nothing to surface back to the actor here. */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationRecord | null> {
  if (!input.recipientId) return null;
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    });
  if (error) throw new Error(error.message);
  // The inserted row is not readable by the actor under RLS, so there is no
  // server-assigned id/created_at to return. Returning null signals "inserted,
  // nothing to surface locally"; the recipient's own session will load it.
  return null;
}

/** Mark a single notification read (recipient-scoped by RLS). */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Mark all of the signed-in user's unread notifications read. */
export async function markAllMyNotificationsRead(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);
}
