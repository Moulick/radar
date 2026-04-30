import { describe, it, expect } from 'vitest'
import { isHelmReleaseActionable } from './badge-colors'

// Predicate the Helm row uses to decide whether to wrap the status
// badge in an actionable tooltip ("Operation pending or stuck —
// click row to inspect"). Pin the membership set so adding a new
// status to Helm becomes a deliberate decision here.

describe('isHelmReleaseActionable', () => {
  it('returns true for `failed`', () => {
    expect(isHelmReleaseActionable('failed')).toBe(true)
  })

  it('returns true for the three pending-* statuses', () => {
    // pending-* covers two distinct situations: an in-flight
    // operation (transient) AND a controller that crashed
    // mid-flight and never wrote a terminal state (stuck). The
    // tooltip copy in the renderer must be accurate for BOTH —
    // never mention rollback (clicking rollback on a still-running
    // install can leave the release in a worse state).
    expect(isHelmReleaseActionable('pending-install')).toBe(true)
    expect(isHelmReleaseActionable('pending-upgrade')).toBe(true)
    expect(isHelmReleaseActionable('pending-rollback')).toBe(true)
  })

  it('is case-insensitive (matches Helm SDK serialisation variants)', () => {
    expect(isHelmReleaseActionable('FAILED')).toBe(true)
    expect(isHelmReleaseActionable('Failed')).toBe(true)
    expect(isHelmReleaseActionable('PENDING-UPGRADE')).toBe(true)
  })

  it('returns false for the success / normal statuses', () => {
    expect(isHelmReleaseActionable('deployed')).toBe(false)
    expect(isHelmReleaseActionable('superseded')).toBe(false)
    expect(isHelmReleaseActionable('uninstalled')).toBe(false)
  })

  it('returns false for `uninstalling` (in-progress, not stuck)', () => {
    // Deliberately NOT actionable — the user shouldn't try to
    // rollback or interfere with an active uninstall.
    expect(isHelmReleaseActionable('uninstalling')).toBe(false)
  })

  it('returns false for null / undefined / empty', () => {
    expect(isHelmReleaseActionable(null)).toBe(false)
    expect(isHelmReleaseActionable(undefined)).toBe(false)
    expect(isHelmReleaseActionable('')).toBe(false)
  })

  it('returns false for unknown strings (defensive)', () => {
    expect(isHelmReleaseActionable('mystery-status')).toBe(false)
    expect(isHelmReleaseActionable('error')).toBe(false) // Helm uses 'failed', not 'error'
  })
})
