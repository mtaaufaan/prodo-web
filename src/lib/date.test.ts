import { describe, expect, it } from 'vitest'

import { formatDateDMY } from './date'

describe('formatDateDMY', () => {
  it.each([
    ['2026-10-06', '06/10/2026'],
    ['2026-10-06T00:00:00Z', '06/10/2026'],
    ['2026-01-02', '02/01/2026'],
    [null, '—'],
    [undefined, '—'],
    ['', '—'],
    ['bukan tanggal', '—'],
  ])('%s -> %s', (input, want) => {
    expect(formatDateDMY(input)).toBe(want)
  })
})
