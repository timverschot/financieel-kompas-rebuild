import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BudgetFormulier } from './BudgetFormulier'
import type { Budget } from '../data/schema'

// Ronde 62. Een budget kan sinds deze ronde voor één maand gelden, en het formulier
// vult voor wat er al staat. Dat voorvullen is handig én gevaarlijk: het schrijft in
// een veld waar de gebruiker zelf in typt.

const budgetten: Budget[] = [
  { id: 'budget-cat-voeding', categorieId: 'cat-voeding', bedrag: 40000 },
  { id: 'budget-cat-voeding-2026-12', categorieId: 'cat-voeding', bedrag: 60000, maand: '2026-12' },
]

const categorieen = [
  { id: 'cat-voeding', naam: 'Voeding' },
  { id: 'cat-wonen', naam: 'Huisvesting' },
]

function toon(over: Partial<Parameters<typeof BudgetFormulier>[0]> = {}) {
  const onOpslaan = vi.fn()
  const { rerender } = render(
    <BudgetFormulier
      categorieen={categorieen}
      budgetten={budgetten}
      maand="2026-12"
      maandLabel="december 2026"
      onOpslaan={onOpslaan}
      {...over}
    />,
  )
  return { onOpslaan, rerender }
}

describe('BudgetFormulier — elke maand of alleen deze', () => {
  it('bewaart standaard een budget zonder maand', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-wonen')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '900')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))

    expect(onOpslaan).toHaveBeenCalledWith({ id: 'budget-cat-wonen', categorieId: 'cat-wonen', bedrag: 90000 })
    // ⚠ Het veld `maand` hoort er dan NIET te zijn — niet als lege tekst. Zo blijft een
    // standaardbudget byte voor byte hetzelfde record als vóór deze ronde.
    expect('maand' in onOpslaan.mock.calls[0][0]).toBe(false)
  })

  it('bewaart met "Alleen december 2026" een budget voor die ene maand', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-wonen')
    await user.click(screen.getByRole('button', { name: 'Alleen december 2026' }))
    await user.type(screen.getByLabelText('Maandbudget (€)'), '900')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))

    expect(onOpslaan).toHaveBeenCalledWith({
      id: 'budget-cat-wonen-2026-12',
      categorieId: 'cat-wonen',
      bedrag: 90000,
      maand: '2026-12',
    })
  })

  it('vult voor wat er al staat, zodat je ziet waarvan je afwijkt', async () => {
    const user = userEvent.setup()
    toon()
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    // Het standaardbudget van € 400.
    expect(screen.getByLabelText('Maandbudget (€)')).toHaveValue('400,00')

    await user.click(screen.getByRole('button', { name: 'Alleen december 2026' }))
    // De uitzondering die er voor december al staat.
    expect(screen.getByLabelText('Maandbudget (€)')).toHaveValue('600,00')
  })

  it('begint een nieuwe uitzondering bij je standaardbedrag', async () => {
    // "Deze maand mag het wat meer" begint bij wat het normaal is; anders tik je een
    // bedrag in zonder te zien waarvan je afwijkt.
    const user = userEvent.setup()
    toon({ maand: '2027-03', maandLabel: 'maart 2027' })
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.click(screen.getByRole('button', { name: 'Alleen maart 2027' }))
    expect(screen.getByLabelText('Maandbudget (€)')).toHaveValue('400,00')
  })

  it('overschrijft NIET wat je aan het typen bent', async () => {
    // ⚠ De val die de nakijkronde van ronde 62 ving. Na een geslaagde opslag maakt het
    // formulier zichzelf leeg. Liep het geheugentje van het voorvullen daarbij uit de
    // pas met de categorie die dan opnieuw gekozen staat, dan sprong het voorvullen
    // alsnog aan bij de eerstvolgende keer dat de app haar gegevens opnieuw inlas — en
    // die komt vanzelf, want dat gebeurt na élke opslag en om de 45 seconden bij het
    // synchroniseren. Je tikte 250, er stond plots weer 400, en dat bewaarde je dan ook.
    //
    // Daarom blijft de categorie hier op de BEGINkeuze staan (ov-voeding, de eerste
    // ingebouwde): net dan verandert er bij het leegmaken niets aan de categorie, en
    // net dan bleef het geheugentje op leeg staan.
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    const eigen: Budget[] = [{ id: 'budget-ov-voeding', categorieId: 'ov-voeding', bedrag: 40000 }]
    const { rerender } = render(
      <BudgetFormulier categorieen={categorieen} budgetten={eigen} maand="2026-12" maandLabel="december 2026" onOpslaan={onOpslaan} />,
    )

    await user.type(screen.getByLabelText('Maandbudget (€)'), '5')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    expect(onOpslaan).toHaveBeenCalled()

    // Het formulier staat weer leeg…
    expect(screen.getByLabelText('Maandbudget (€)')).toHaveValue('')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '250')

    // …en dan leest de app haar gegevens opnieuw in: een NIEUWE lijst met nieuwe
    // records, precies wat het voorvullen weer wakker maakte.
    rerender(
      <BudgetFormulier
        categorieen={categorieen}
        budgetten={eigen.map((b) => ({ ...b }))}
        maand="2026-12"
        maandLabel="december 2026"
        onOpslaan={onOpslaan}
      />,
    )
    expect(screen.getByLabelText('Maandbudget (€)')).toHaveValue('250')
  })

  it('laat de keuze weg wanneer de pagina geen maand kent', () => {
    // "Alleen deze maand" zou dan naar niets verwijzen.
    toon({ maand: undefined, maandLabel: undefined })
    expect(screen.queryByText('Voor welke maanden geldt dit?')).toBeNull()
  })
})
