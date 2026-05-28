import { useRef, useCallback } from "react";

/**
 * Returns a wrapper that prevents double-submission:
 * the inner function is called at most once per invocation until it resolves.
 *
 * Usage:
 *   const safeSubmit = useSubmitOnce(async (data) => { ... });
 *   <Button onClick={() => safeSubmit(data)} />
 */
export function useSubmitOnce<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  const pending = useRef(false);

  return useCallback(
    async (...args: T) => {
      if (pending.current) return;
      pending.current = true;
      try {
        await fn(...args);
      } finally {
        pending.current = false;
      }
    },
    [fn]
  );
}
