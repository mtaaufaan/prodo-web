import { describe, expect, it } from 'vitest'

import { aggregateByTier } from './TierDistributionChart'
import type { GroupAdmin } from '@/features/platform-admin/types'

function ga(tier: GroupAdmin['tier']): GroupAdmin {
  return {
    id: 'x',
    email: 'x@x.com',
    display_name: 'X',
    status: 'AKTIF',
    created_at: '2026-01-01T00:00:00Z',
    group_id: 'g1',
    group_name: 'Grup X',
    job_title: null,
    address: null,
    phone: null,
    tier_id: tier,
    tier,
    storage_quota_gb: null,
    tier_max_org: 1,
    tier_max_storage_gb: 20,
    tier_max_members: 250,
    used_org_count: 0,
    used_storage_mb: 0,
    used_member_count: 0,
  }
}

describe('aggregateByTier', () => {
  it('counts group admins per tier', () => {
    const counts = aggregateByTier([ga('starter'), ga('starter'), ga('business'), ga('enterprise')])
    expect(counts.starter).toBe(2)
    expect(counts.business).toBe(1)
    expect(counts.enterprise).toBe(1)
  })

  it('ignores group admins without a tier (no group yet)', () => {
    const counts = aggregateByTier([ga(null), ga('starter')])
    expect(counts.starter).toBe(1)
    expect(Object.keys(counts)).toEqual(['starter'])
  })

  it('returns an empty object for an empty list', () => {
    expect(aggregateByTier([])).toEqual({})
  })
})
