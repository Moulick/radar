import { useRef } from 'react'

/**
 * Returns the most recent non-`undefined` value of `value`, or
 * `undefined` if no defined value has been seen yet. Useful when a
 * parent briefly drops a prop to `undefined` during a route transition
 * (e.g. while the new route's React Query cache is warming) and you
 * don't want the UI to blank out / flicker for that frame.
 *
 * Critically this differs from a state-based "cache" in that:
 *   - it doesn't trigger re-renders by itself,
 *   - it never overrides a defined value with stale data — it only
 *     plugs the gap when the current value is `undefined`.
 *
 * Use case (SKY-824 bug 65): the Resources sidebar received
 * `apiResources={undefined}` for a single render during nav
 * transitions, which made it fall back to its flat-layout placeholder
 * for ~2 seconds. Caching the last-known apiResources here keeps the
 * hierarchical layout visible across the gap.
 */
export function useLastDefined<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(value)
  if (value !== undefined) {
    ref.current = value
  }
  return ref.current
}
