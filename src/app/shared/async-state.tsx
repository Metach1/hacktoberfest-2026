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
 * roll it. Runs the async loader on mount and whenever `deps` change; exposes
 * `reload` for a retry button and `setData` for optimistic updates.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loaderRef.current()
      .then((result) => { if (active) setDataState(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Something went wrong."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => run(), deps);
  /* eslint-enable react-hooks/exhaustive-deps */

  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    setDataState((prev) => updater(prev));
  }, []);

  return { data, loading, error, reload: run, setData };
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
