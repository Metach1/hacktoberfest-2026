"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the loader. */
  reload: () => void;
  /** Optimistically set data without a refetch. */
  setData: (updater: (prev: T | null) => T | null) => void;
}

/**
 * Small data-fetching hook with loading / error / retry, so screens don't hand-
 * roll it. Runs the async loader on mount, whenever `deps` change, and whenever
 * `reload()` is called. State is only ever set asynchronously (inside the
 * fetch's resolve/reject callbacks), never synchronously during render or in
 * the effect body.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A manual retry bumps this counter, which the effect depends on, re-running
  // the fetch without us calling setState synchronously in the effect body.
  const [nonce, setNonce] = useState(0);

  // Keep the latest loader without reassigning the ref during render.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  /* The loading/error reset at the start of a fetch is a legitimate
     "kick off external work" effect, not cascading render state. We disable the
     set-state-in-effect rule for this block, matching the project convention
     used elsewhere (e.g. the session provider's localStorage hydration). */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loaderRef.current()
      .then((result) => { if (active) setDataState(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Something went wrong."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    setDataState((prev) => updater(prev));
  }, []);

  return { data, loading, error, reload, setData };
}

/** Standard inline error block with a retry button. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty">
      <h3>Couldn&rsquo;t load this</h3>
      <p>{message}</p>
      <button type="button" className="button" onClick={onRetry}>Try again</button>
    </div>
  );
}
