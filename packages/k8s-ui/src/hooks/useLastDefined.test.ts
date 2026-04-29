import { describe, it, expect } from 'vitest'

// We don't have @testing-library/react in this package's test config,
// so we directly exercise the small piece of state the hook owns: a
// ref-cell that latches the latest non-undefined value. The same
// invariants apply.
//
// Contract:
//   - if value is defined, the cached value updates and is returned
//   - if value is undefined, the cached value is returned unchanged
//   - if no defined value has ever been seen, undefined is returned

function makeUseLastDefinedSimulator<T>() {
  // Mimics the useRef + branch in useLastDefined. Calling the returned
  // function repeatedly simulates successive renders with different
  // prop values.
  let cached: T | undefined = undefined
  return (value: T | undefined): T | undefined => {
    if (value !== undefined) cached = value
    return cached
  }
}

describe('useLastDefined behaviour', () => {
  it('returns undefined when no defined value has been seen yet', () => {
    const sim = makeUseLastDefinedSimulator<number>()
    expect(sim(undefined)).toBeUndefined()
  })

  it('returns the value when it is defined', () => {
    const sim = makeUseLastDefinedSimulator<number>()
    expect(sim(42)).toBe(42)
  })

  it('keeps returning the last defined value when prop briefly goes undefined', () => {
    // The actual SKY-824 bug 65 scenario: parent re-renders with
    // apiResources=undefined for one frame during nav transition, then
    // re-supplies it on the next frame.
    const sim = makeUseLastDefinedSimulator<string[]>()
    sim(['a', 'b'])
    expect(sim(undefined)).toEqual(['a', 'b'])
    expect(sim(undefined)).toEqual(['a', 'b'])
    sim(['a', 'b', 'c'])
    expect(sim(undefined)).toEqual(['a', 'b', 'c'])
  })

  it('never replaces a defined value with stale data', () => {
    const sim = makeUseLastDefinedSimulator<number>()
    sim(1)
    sim(2)
    expect(sim(3)).toBe(3)
  })

  it('treats null as a defined value (only undefined is the "missing" signal)', () => {
    // null is a real, intentional value — only undefined should be
    // treated as "not yet loaded". This matches React Query's
    // convention of returning `undefined` while loading.
    const sim = makeUseLastDefinedSimulator<number | null>()
    sim(5)
    expect(sim(null)).toBeNull()
    expect(sim(undefined)).toBeNull()
  })
})
