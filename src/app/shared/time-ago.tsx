"use client";

import { useSyncExternalStore } from "react";
import { formatDate, timeAgo } from "@/src/app/data/posts";

// A no-op external store: the server snapshot is always `false` and the client
// snapshot is always `true`. This lets us read "are we on the client?" during
// render without a setState-in-effect (which the project's lint config forbids)
// and without a hydration mismatch — the first client paint matches the server.
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Renders a relative time (e.g. "3 days ago"). The clock is only read on the
 * client, after hydration, so it is never evaluated during the static prerender
 * (a hard requirement under Next.js 16 Cache Components). Before hydration it
 * shows a stable absolute date.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const onClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  return <>{onClient ? timeAgo(iso) : formatDate(iso)}</>;
}
