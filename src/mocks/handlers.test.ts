import { describe, expect, it } from 'vitest'
import { handlers } from './handlers'

describe('mock handlers', () => {
  it('exports at least one handler', () => {
    expect(handlers.length).toBeGreaterThan(0)
  })
})
