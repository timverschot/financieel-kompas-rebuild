import { describe, it, expect } from 'vitest'
import { formatEuro } from './format'

describe('formatEuro', () => {
  it('formatteert een uitgave als eurobedrag', () => {
    expect(formatEuro(-950)).toContain('950')
  })
})
