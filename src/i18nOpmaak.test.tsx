import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, afterEach } from 'vitest'
import { TaalProvider, useT } from './i18n'
import { zetOpmaaktaal } from './utils/opmaaktaal'
import { formatEuro } from './utils/format'
import { maandJaarLabel } from './utils/datum'

// Verandert de OPMAAK van bedragen en datums mee zodra je van taal wisselt? (ronde 54)
//
// Dit stond eerst in een effect, en een effect draait NA het tekenen. De teksten
// vertaalden dus meteen en de bedragen pas bij de volgende hertekening — die er
// vaak niet kwam. Je kreeg een Engels scherm met "juli 2026" en "€ 12,50" erin.
// Deze test tekent één scherm en kijkt naar wat er in dezelfde beurt op staat.

function Scherm() {
  const { zetTaal } = useT()
  return (
    <div>
      <button type="button" onClick={() => zetTaal('en')}>
        Engels
      </button>
      <p data-bedrag>{formatEuro(123456)}</p>
      <p data-maand>{maandJaarLabel('2026-07-04')}</p>
    </div>
  )
}

const bedrag = () => document.querySelector('[data-bedrag]')?.textContent ?? ''
const maand = () => document.querySelector('[data-maand]')?.textContent ?? ''

afterEach(() => zetOpmaaktaal('nl'))

describe('taal wisselen — de opmaak volgt in dezelfde beurt', () => {
  it('zet bedrag én maandnaam mee om, zonder tweede aanleiding', async () => {
    const gebruiker = userEvent.setup()
    render(
      <TaalProvider>
        <Scherm />
      </TaalProvider>,
    )
    expect(bedrag()).toContain('1.234,56')
    expect(maand()).toBe('juli 2026')

    await gebruiker.click(screen.getByRole('button', { name: 'Engels' }))

    // Niets anders aangeraakt: geen tabwissel, geen herladen.
    expect(bedrag()).toContain('1,234.56')
    expect(maand()).toBe('July 2026')
  })
})
