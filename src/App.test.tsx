import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App, formatEuro } from './App'

// Dit is een echte, automatische test. Vanaf nu draait dit bij elke wijziging;
// breekt iets, dan weet je het meteen - in plaats van via de handmatige checklist.
describe('formatEuro', () => {
  it('formatteert een uitgave als eurobedrag', () => {
    expect(formatEuro(-950)).toContain('950')
  })
})

describe('App', () => {
  it('berekent en toont het juiste saldo (2400 - 950 - 320 = 1130)', () => {
    render(<App />)
    expect(screen.getByText('Saldo')).toBeInTheDocument()
    expect(screen.getByText(/1[.\s]?130/)).toBeInTheDocument()
  })
})
