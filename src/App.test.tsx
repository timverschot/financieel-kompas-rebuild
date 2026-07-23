import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
})

describe('App', () => {
  it('laadt transacties uit de database en toont het juiste saldo (2400 - 950 - 320 = 1130)', async () => {
    render(<App />)
    // findByText wacht tot de asynchrone data uit de database geladen is.
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
    expect(await screen.findByText(/1[.\s]?130/)).toBeInTheDocument()
  })
})
