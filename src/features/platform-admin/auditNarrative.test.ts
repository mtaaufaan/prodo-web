import { describe, expect, it } from 'vitest'

import { formatAuditNarrative } from './auditNarrative'
import type { PlatformAuditLogEntry } from './types'

function entry(overrides: Partial<PlatformAuditLogEntry>): PlatformAuditLogEntry {
  return {
    id: 'log-1',
    actor_id: 'pa-1',
    actor_email: 'pa@prodo-platform.io',
    actor_display_name: 'PA',
    actor_role: 'platform_admin',
    action: 'user.updated',
    entity_type: 'user',
    entity_id: 'ga-1',
    target_user_name: null,
    target_user_role: null,
    target_tier_name: null,
    actor_ip: null,
    metadata: null,
    logged_at: '2026-08-28T08:07:47Z',
    ...overrides,
  }
}

describe('formatAuditNarrative', () => {
  it('names the target Group Admin when resolved', () => {
    const msg = formatAuditNarrative(entry({ action: 'user.suspended', target_user_name: 'Farhan H.' }))
    expect(msg).toContain('Farhan H.')
    expect(msg).toContain('suspend')
  })

  it('names the target tier when resolved', () => {
    const msg = formatAuditNarrative(entry({ action: 'tier.updated', entity_type: 'tier', target_tier_name: 'GOLD' }))
    expect(msg).toContain('GOLD')
  })

  it('falls back gracefully for an unrecognized action code', () => {
    const msg = formatAuditNarrative(entry({ action: 'something.new', entity_type: 'widget' }))
    expect(msg).toContain('something.new')
    expect(msg).toContain('widget')
  })

  it('does not mention the actor -- that is a separate table column', () => {
    const msg = formatAuditNarrative(entry({ action: 'user.login', actor_display_name: 'PA Name' }))
    expect(msg).not.toContain('PA Name')
  })

  it('names the erasure subject when executed', () => {
    const msg = formatAuditNarrative(entry({ action: 'erasure.executed', target_user_name: 'User [REDACTED]' }))
    expect(msg).toContain('User [REDACTED]')
    expect(msg).toContain('Erasure')
  })

  it('names the erasure subject when rejected', () => {
    const msg = formatAuditNarrative(entry({ action: 'erasure.rejected', target_user_name: 'Farhan H.' }))
    expect(msg).toContain('Farhan H.')
    expect(msg).toContain('Menolak')
  })

  it('says Group Admin for user.suspended when target role is group_admin', () => {
    const msg = formatAuditNarrative(entry({ action: 'user.suspended', target_user_name: 'Farhan H.', target_user_role: 'group_admin' }))
    expect(msg).toContain('Group Admin')
  })

  it('says Platform Admin for user.suspended when target role is platform_admin', () => {
    const msg = formatAuditNarrative(entry({ action: 'user.suspended', target_user_name: 'Rina S.', target_user_role: 'platform_admin' }))
    expect(msg).toContain('Platform Admin')
    expect(msg).not.toContain('Group Admin')
  })

  it('names the Platform Admin target and explains the effect for user.mfa_reset', () => {
    const msg = formatAuditNarrative(entry({ action: 'user.mfa_reset', target_user_name: 'Rina S.', target_user_role: 'platform_admin' }))
    expect(msg).toContain('Rina S.')
    expect(msg).toContain('Platform Admin')
    expect(msg).toContain('setup ulang')
  })
})
