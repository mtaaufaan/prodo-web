import { describe, expect, it } from 'vitest'

import { queryClient } from './query-client'

describe('queryClient', () => {
  it('initializes without error', () => {
    expect(queryClient).toBeDefined()
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60 * 1000)
  })
})
