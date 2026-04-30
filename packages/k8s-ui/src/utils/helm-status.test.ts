import { describe, it, expect } from 'vitest'
import { isFailedHelmStatus } from './badge-colors'

// SKY-829 bug 58: failed Helm releases used to render in the list as
// just a red badge with no hint that the row was the path forward.
// `isFailedHelmStatus` is the predicate the row uses to decide whether
// to wrap the status badge in an actionable tooltip ("Click row to
// view rollback / history / logs and recover").
//
// These tests pin the set of statuses we treat as "needs user
// recovery" so it doesn't drift silently — adding e.g. a new
// `pending-test` status to Helm should be a deliberate choice here.

describe('isFailedHelmStatus', () => {
  it('returns true for `failed`', () => {
    expect(isFailedHelmStatus('failed')).toBe(true)
  })

  it('returns true for the three pending-* statuses (rollback hangs included)', () => {
    expect(isFailedHelmStatus('pending-install')).toBe(true)
    expect(isFailedHelmStatus('pending-upgrade')).toBe(true)
    expect(isFailedHelmStatus('pending-rollback')).toBe(true)
  })

  it('is case-insensitive (matches Helm SDK serialisation variants)', () => {
    expect(isFailedHelmStatus('FAILED')).toBe(true)
    expect(isFailedHelmStatus('Failed')).toBe(true)
    expect(isFailedHelmStatus('PENDING-UPGRADE')).toBe(true)
  })

  it('returns false for the success / normal statuses', () => {
    expect(isFailedHelmStatus('deployed')).toBe(false)
    expect(isFailedHelmStatus('superseded')).toBe(false)
    expect(isFailedHelmStatus('uninstalled')).toBe(false)
  })

  it('returns false for transient-but-not-stuck states', () => {
    // `uninstalling` is in-progress but not a failure that requires
    // user recovery action, so we deliberately do NOT mark it as
    // failed (the user shouldn't try to rollback during an active
    // uninstall).
    expect(isFailedHelmStatus('uninstalling')).toBe(false)
  })

  it('returns false for null / undefined / empty', () => {
    expect(isFailedHelmStatus(null)).toBe(false)
    expect(isFailedHelmStatus(undefined)).toBe(false)
    expect(isFailedHelmStatus('')).toBe(false)
  })

  it('returns false for unknown strings (defensive)', () => {
    expect(isFailedHelmStatus('mystery-status')).toBe(false)
    expect(isFailedHelmStatus('error')).toBe(false) // Helm uses 'failed', not 'error'
  })
})
