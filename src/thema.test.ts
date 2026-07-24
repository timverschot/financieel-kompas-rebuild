import { describe, it, expect } from 'vitest'
import { isDonkerActief, THEMAKEUZES } from './thema'

describe('thema', () => {
  it('licht is nooit donker', () => {
    expect(isDonkerActief('licht')).toBe(false)
  })

  it('donker is altijd donker', () => {
    expect(isDonkerActief('donker')).toBe(true)
  })

  it('biedt drie keuzes aan', () => {
    expect(THEMAKEUZES.map((k) => k.waarde)).toEqual(['licht', 'donker', 'systeem'])
  })
})
