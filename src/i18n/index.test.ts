import { renderHook } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import './index'

describe('i18n', () => {
  it("useTranslation('common').t('app.name') returns the correct string", () => {
    const { result } = renderHook(() => useTranslation('common'))
    expect(result.current.t('app.name')).toBe('PRODO')
  })
})
