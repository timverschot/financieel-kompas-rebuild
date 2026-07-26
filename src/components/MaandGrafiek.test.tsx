import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MaandGrafiek } from './MaandGrafiek'
import type { MaandPaar } from '../utils/maandverloop'
import { formatEuro } from '../utils/format'

// Ronde 31: de oude staafgrafiek toonde zes kale staafjes met alleen de uitgaven —
// geen bedrag, geen schaal, geen referentiepunt. En omdat de lopende maand nog niet
// af is, stond die altijd te laag: de grafiek suggereerde elke maand opnieuw dat je
// zuiniger geworden was.

const reeks: MaandPaar[] = [
  { maand: '2026-05', inkomsten: 200000, uitgaven: 100000 },
  { maand: '2026-06', inkomsten: 200000, uitgaven: 140000 },
  { maand: '2026-07', inkomsten: 50000, uitgaven: 20000 },
]

describe('MaandGrafiek', () => {
  it('noemt per maand zowel wat er binnenkwam als wat eruit ging', () => {
    render(<MaandGrafiek data={reeks} lopendeMaand="2026-07" />)
    // formatEuro zet een vaste spatie tussen teken en getal, dus we bouwen de
    // verwachting met dezelfde functie in plaats van ze over te typen.
    const labels = screen.getAllByRole('img').map((el) => el.getAttribute('aria-label'))
    expect(labels).toContain(`jun: in ${formatEuro(200000)}, uit ${formatEuro(140000)}`)
  })

  it('markeert de lopende maand als onvolledig', () => {
    render(<MaandGrafiek data={reeks} lopendeMaand="2026-07" />)
    const labels = screen.getAllByRole('img').map((el) => el.getAttribute('aria-label') ?? '')
    expect(labels.some((l) => l.startsWith('jul:') && l.includes('loopt nog'))).toBe(true)
    expect(screen.getByText('* Deze maand loopt nog, dus die staaf is nog niet volledig.')).toBeInTheDocument()
  })

  it('toont het gemiddelde zonder de lopende maand mee te tellen', () => {
    render(<MaandGrafiek data={reeks} lopendeMaand="2026-07" />)
    // (1000 + 1400) / 2 = 1200. Zou juli meetellen, dan stond er € 866,67 en zou
    // de lat elke maand opnieuw verlaagd worden door een halve maand.
    // Op de ruwe tekst vergelijken: getByText maakt van de vaste spatie in
    // formatEuro een gewone spatie, en dan matcht de string nooit.
    const teksten = [...document.querySelectorAll('.rij-meta')].map((el) => el.textContent)
    expect(teksten).toContain(`Gemiddeld ${formatEuro(120000)} per maand`)
  })

  it('legt uit welke kleur waarvoor staat', () => {
    render(<MaandGrafiek data={reeks} lopendeMaand="2026-07" />)
    expect(screen.getByText('Inkomsten')).toBeInTheDocument()
    expect(screen.getByText('Uitgaven')).toBeInTheDocument()
  })

  it('toont niets bij een lege reeks', () => {
    const { container } = render(<MaandGrafiek data={[]} lopendeMaand="2026-07" />)
    expect(container.firstChild).toBeNull()
  })

  it('zegt het in één regel wanneer er niets geboekt is', () => {
    const leeg: MaandPaar[] = [
      { maand: '2026-06', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-07', inkomsten: 0, uitgaven: 0 },
    ]
    render(<MaandGrafiek data={leeg} lopendeMaand="2026-07" />)
    // Platte staven en een lijn op nul zouden druk doen over niets.
    expect(screen.getByText('Nog niets geboekt in deze maanden.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
