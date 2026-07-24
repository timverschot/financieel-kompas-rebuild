import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieLijst } from './TransactieLijst'
import type { Transactie } from '../data/schema'

const rekeningen = [
  { id: 'r1', naam: 'Betaal', beginsaldo: 0 },
  { id: 'r2', naam: 'Spaar', beginsaldo: 0 },
]

// Een 'recente' datum (vandaag) zodat de transactie zeker binnen het historiek-
// venster van 6 maanden valt, ongeacht de systeemklok waarop de test draait.
const recent = new Date().toISOString().slice(0, 10)

const tx = (extra: Partial<Transactie> & { id: string }): Transactie => ({
  datum: recent,
  omschrijving: 'Winkel',
  bedrag: -1000,
  rekeningId: 'r1',
  ...extra,
})

function toon(transacties: Transactie[]) {
  const onBewerk = vi.fn()
  const onVerwijder = vi.fn()
  render(<TransactieLijst transacties={transacties} categorieen={[]} rekeningen={rekeningen} onBewerk={onBewerk} onVerwijder={onVerwijder} />)
  return { onBewerk, onVerwijder }
}

describe('TransactieLijst', () => {
  it('zoekt op omschrijving', async () => {
    const user = userEvent.setup()
    toon([
      tx({ id: '1', omschrijving: 'Colruyt' }),
      tx({ id: '2', omschrijving: 'Delhaize' }),
    ])
    expect(screen.getByText('Colruyt')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Zoek in transacties'), 'delh')
    expect(screen.queryByText('Colruyt')).not.toBeInTheDocument()
    expect(screen.getByText('Delhaize')).toBeInTheDocument()
  })

  it('filtert op richting inkomsten', async () => {
    const user = userEvent.setup()
    toon([
      tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 }),
      tx({ id: '2', omschrijving: 'Winkel', bedrag: -3000 }),
    ])
    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    expect(screen.getByText('Loon')).toBeInTheDocument()
    expect(screen.queryByText('Winkel')).not.toBeInTheDocument()
  })

  it('verbergt oude transacties standaard en toont ze op aanvraag', async () => {
    const user = userEvent.setup()
    // Een heel oude transactie (2019) valt buiten het venster van 6 maanden.
    toon([
      tx({ id: 'oud', omschrijving: 'AntiekeAankoop', datum: '2019-01-01' }),
      tx({ id: 'nieuw', omschrijving: 'RecenteAankoop' }),
    ])
    expect(screen.queryByText('AntiekeAankoop')).not.toBeInTheDocument()
    const knop = screen.getByRole('button', { name: /Toon oudere transacties/ })
    await user.click(knop)
    expect(screen.getByText('AntiekeAankoop')).toBeInTheDocument()
  })

  it('roept onVerwijder aan met het juiste id', async () => {
    const user = userEvent.setup()
    const { onVerwijder } = toon([tx({ id: '1', omschrijving: 'Colruyt' })])
    const rij = screen.getByText('Colruyt').closest('li') as HTMLElement
    await user.click(within(rij).getByRole('button', { name: 'Verwijder Colruyt' }))
    expect(onVerwijder).toHaveBeenCalledWith('1')
  })
})
