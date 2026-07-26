import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BalansRegel } from './BalansRegel'

describe('BalansRegel', () => {
  it('benoemt een overschot met het bedrag', () => {
    render(<BalansRegel inkomsten={240000} uitgaven={127000} />)
    expect(screen.getByText('Overschot')).toBeInTheDocument()
    expect(
      screen.getByText('Je houdt deze maand € 1.130,00 over. Dat is het deel dat naar sparen of een doel kan.'),
    ).toBeInTheDocument()
  })

  it('benoemt een tekort met het bedrag', () => {
    render(<BalansRegel inkomsten={100000} uitgaven={130000} />)
    expect(screen.getByText('Tekort')).toBeInTheDocument()
    expect(screen.getByText(/€ 300,00 meer uit dan er binnenkomt/)).toBeInTheDocument()
  })

  it('benoemt een exacte balans', () => {
    render(<BalansRegel inkomsten={100000} uitgaven={100000} />)
    expect(screen.getByText('In balans')).toBeInTheDocument()
  })

  it('zwijgt wanneer er deze maand niets geboekt is', () => {
    render(<BalansRegel inkomsten={0} uitgaven={0} />)
    expect(screen.queryByText('In balans')).not.toBeInTheDocument()
    expect(document.querySelector('[data-balans]')).toBeNull()
  })
})
