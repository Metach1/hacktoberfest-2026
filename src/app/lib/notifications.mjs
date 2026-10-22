/**
 * Pure notification logic for the Starlete demo.
 *
 * In-memory + localStorage only — there is no backend. Notifications are a flat
 * list scoped by `audience` ("athlete" | "supporter"), which maps directly to
 * the current `role`. DEMO LIMITATION: there is one supporter identity
 * (SUPPORTER_ID) and the athlete dashboard represents a single athlete
 * (athletes[0]); there is NO follow system, so a "new post" notification goes
 * to the whole supporter audience for ANY athlete's post. Likewise, every
 * athlete-audience notification is shown to whoever is signed in as an athlete.
 *
 * These builders are pure: they return a Notification object (or null when no
 * notification should be emitted). The store stamps id/createdAt/read and
 * prepends the result; keeping that here lets the UI and tests share one rule.
 */

/** @typedef {"athlete"|"supporter"} NotificationAudience */
/**
 * @typedef {"donation_pending"|"post_like"|"post_comment"
 *   |"donation_confirmed"|"donation_rejected"|"new_post"} NotificationType
 */
/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {NotificationAudience} audience
 * @property {NotificationType} type
 * @property {string} title
 * @property {string} body
 * @property {number} createdAt  Epoch ms.
 * @property {boolean} read
 * @property {string} [href]
 */

/** Trim a long string to a short preview for a notification body. */
export function snippet(text, max = 80) {
  const t = String(text ?? "").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Format a peso amount for notification copy (mirrors the UI's peso()). */
export function pesoText(amount) {
  const n = Number(amount);
  return `₱${(Number.isFinite(n) ? n : 0).toLocaleString("en-PH")}`;
}

/**
 * Build the notification payload (without id/createdAt/read) for an event, or
 * null when no notification should be emitted. The store wraps a non-null
 * result with a fresh id, createdAt, and read:false.
 *
 * @param {Object} event
 * @param {NotificationType} event.type
 * @param {Object} event.data
 * @returns {{audience: NotificationAudience, type: NotificationType, title: string, body: string, href?: string}|null}
 */
export function buildNotification(event) {
  const { type, data = {} } = event;
  switch (type) {
    case "donation_pending":
      return {
        audience: "athlete",
        type,
        // Athlete-audience: the donation comes FROM a supporter.
        title: "New pending donation",
        body: `${pesoText(data.amount)} from ${data.supporterName ?? "Anonymous supporter"} is awaiting your review.`,
        href: "/dashboard",
      };
    case "donation_confirmed":
      return {
        audience: "supporter",
        type,
        title: "Donation confirmed",
        body: `Your ${pesoText(data.amount)} donation to ${data.athleteName ?? "the athlete"} was confirmed.`,
        href: "/dashboard",
      };
    case "donation_rejected":
      return {
        audience: "supporter",
        type,
        title: "Donation rejected",
        body: `Your ${pesoText(data.amount)} donation to ${data.athleteName ?? "the athlete"} was rejected${
          data.reasonLabel ? ` · ${data.reasonLabel}` : ""
        }.`,
        href: "/dashboard",
      };
    case "new_post":
      return {
        audience: "supporter",
        type,
        title: `New post from ${data.athleteName ?? "an athlete"}`,
        body: snippet(data.text),
        href: "/feed",
      };
    case "post_like":
      return {
        audience: "athlete",
        type,
        title: "New like on your post",
        body: `${data.actorName ?? "Someone"} liked your post${data.text ? `: “${snippet(data.text, 48)}”` : ""}.`,
        href: "/feed",
      };
    case "post_comment":
      return {
        audience: "athlete",
        type,
        title: "New comment on your post",
        body: `${data.actorName ?? "Someone"} commented${data.text ? `: “${snippet(data.text, 48)}”` : ""}.`,
        href: "/feed",
      };
    default:
      return null;
  }
}

/** Audience that maps to a given role (null role -> no audience). */
export function audienceForRole(role) {
  if (role === "athlete") return "athlete";
  if (role === "supporter") return "supporter";
  return null;
}

/** Notifications for the given role, newest first (empty when role is null). */
export function notificationsForRole(notifications, role) {
  const audience = audienceForRole(role);
  if (!audience) return [];
  return notifications
    .filter((n) => n.audience === audience)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Count of unread notifications for the given role. */
export function unreadCountForRole(notifications, role) {
  return notificationsForRole(notifications, role).filter((n) => !n.read).length;
}

/** Return a new list with the notification `id` marked read. */
export function markRead(notifications, id) {
  return notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
}

/**
 * Return a new list with every notification for the given role marked read.
 * Other audiences are untouched.
 */
export function markAllRead(notifications, role) {
  const audience = audienceForRole(role);
  if (!audience) return notifications;
  return notifications.map((n) => (n.audience === audience && !n.read ? { ...n, read: true } : n));
}

/** Normalize a persisted notification to the current shape (defensive). */
export function normalizeNotification(n, fallbackId) {
  return {
    id: String(n?.id ?? fallbackId),
    audience: n?.audience === "athlete" ? "athlete" : "supporter",
    type: n?.type ?? "new_post",
    title: n?.title ?? "",
    body: n?.body ?? "",
    createdAt: Number(n?.createdAt ?? Date.now()),
    read: Boolean(n?.read),
    ...(n?.href ? { href: String(n.href) } : {}),
  };
}
