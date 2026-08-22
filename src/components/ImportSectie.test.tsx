import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportSectie } from './ImportSectie'
import { bouwHandelaarIndex } from '../utils/categorieVoorstel'
import type { Rekening, Transactie } from '../data/schema'

const rekeningen: Rekening[] = [
  { id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 },
  { id: 'r2', naam: 'Spaarrekening', beginsaldo: 0 },
]

const UITTREKSEL = [
  'Boekingsdatum;Tegenpartij;Mededeling;Bedrag',
  '01/02/2026;COLRUYT HALLE;aankoop;-12,50',
  '02/02/2026;DELHAIZE;;-8,20',
  '03/02/2026;WERKGEVER NV;loon februari;2400,00',
].join('\n')

// jsdom kent `File.arrayBuffer` niet in elke versie; de component valt daarom terug
// op FileReader, en die bestaat hier wél.
function bestand(inhoud: string, naam = 'uittreksel.csv'): File {
  return new File([inhoud], naam, { type: 'text/csv' })
}

function toon(transacties: Transactie[] = []) {
  const onImporteer = vi.fn()
  render(
    <ImportSectie
      rekeningen={rekeningen}
      transacties={transacties}
      categorieen={[]}
      handelaarIndex={bouwHandelaarIndex(transacties)}
      onImporteer={onImporteer}
    />,
  )
  return onImporteer
}

beforeEach(() => {
  localStorage.clear()
})

describe('ImportSectie', () => {
  it('leest een uittreksel en toont de gevonden boekingen', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))

    expect(await screen.findByText('COLRUYT HALLE')).toBeInTheDocument()
    expect(screen.getByText('DELHAIZE')).toBeInTheDocument()
    expect(screen.getByText('WERKGEVER NV')).toBeInTheDocument()
    expect(screen.getByText('3 van 3 geselecteerd')).toBeInTheDocument()
  })

  it('raadt de kolommen en zegt dat het een gok is', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))

    await screen.findByText('Kloppen de kolommen?')
    expect(screen.getByText(/Kompal heeft geraden/)).toBeInTheDocument()
    expect(screen.getByLabelText('Wat staat er in de kolom Boekingsdatum?')).toHaveValue('datum')
    expect(screen.getByLabelText('Wat staat er in de kolom Bedrag?')).toHaveValue('bedrag')
  })

  it('bewaart de kolomkeuze en herkent hetzelfde formaat de volgende keer', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('Kloppen de kolommen?')

    // De gebruiker corrigeert iets — dat moet bewaard worden.
    await user.selectOptions(screen.getByLabelText('Wat staat er in de kolom Mededeling?'), 'omschrijving')

    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL, 'andere-naam.csv'))
    expect(await screen.findByText(/Dit formaat kennen we van de vorige keer/)).toBeInTheDocument()
  })

  it('bewaart de boekingen met het juiste teken en op de gekozen rekening', async () => {
    const user = userEvent.setup()
    const onImporteer = toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('COLRUYT HALLE')

    await user.selectOptions(screen.getByLabelText('Op welke rekening?'), 'r2')
    await user.click(screen.getByRole('button', { name: /Lees 3 boeking/ }))

    await waitFor(() => expect(onImporteer).toHaveBeenCalled())
    const nieuwe = onImporteer.mock.calls[0][0] as Transactie[]
    expect(nieuwe).toHaveLength(3)
    expect(nieuwe[0]).toMatchObject({ datum: '2026-02-01', bedrag: -1250, rekeningId: 'r2' })
    expect(nieuwe[2]).toMatchObject({ datum: '2026-02-03', bedrag: 240000 })
  })

  it('zet een regel die al geboekt lijkt standaard uit', async () => {
    const user = userEvent.setup()
    const bestaand: Transactie[] = [
      { id: 't1', datum: '2026-02-01', omschrijving: 'Colruyt', bedrag: -1250, rekeningId: 'r1' },
    ]
    const onImporteer = toon(bestaand)
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))

    expect(await screen.findByText('lijkt al geboekt')).toBeInTheDocument()
    expect(screen.getByText('2 van 3 geselecteerd')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Lees 2 boeking/ }))
    await waitFor(() => expect(onImporteer).toHaveBeenCalled())
    const nieuwe = onImporteer.mock.calls[0][0] as Transactie[]
    expect(nieuwe.map((n) => n.bedrag)).toEqual([-820, 240000])
  })

  it('laat je een vermoedelijke dubbel toch meenemen', async () => {
    const user = userEvent.setup()
    const bestaand: Transactie[] = [
      { id: 't1', datum: '2026-02-01', omschrijving: 'Colruyt', bedrag: -1250, rekeningId: 'r1' },
    ]
    toon(bestaand)
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('lijkt al geboekt')

    await user.click(screen.getByLabelText(/Neem COLRUYT HALLE/))
    expect(screen.getByText('3 van 3 geselecteerd')).toBeInTheDocument()
  })

  it('stelt een categorie voor op basis van wat je eerder bij die winkel boekte', async () => {
    const user = userEvent.setup()
    const bestaand: Transactie[] = [
      {
        id: 't9',
        datum: '2026-01-05',
        omschrijving: 'DELHAIZE',
        bedrag: -3000,
        rekeningId: 'r1',
        categorieId: 'ov-voeding',
      },
    ]
    const onImporteer = toon(bestaand)
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('DELHAIZE')

    await user.click(screen.getByRole('button', { name: /Lees 3 boeking/ }))
    await waitFor(() => expect(onImporteer).toHaveBeenCalled())
    const nieuwe = onImporteer.mock.calls[0][0] as Transactie[]
    expect(nieuwe.find((n) => n.omschrijving === 'DELHAIZE')?.categorieId).toBe('ov-voeding')
    // Een winkel die je nooit eerder boekte, krijgt niets opgedrongen.
    expect(nieuwe.find((n) => n.omschrijving.startsWith('COLRUYT'))?.categorieId).toBeUndefined()
  })

  it('meldt regels die niet gelezen konden worden in plaats van ze stil te laten vallen', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(
      screen.getByLabelText('Bestand'),
      bestand([UITTREKSEL, '"";KAPOTTE REGEL;;'].join('\n')),
    )

    expect(await screen.findByText(/1 regels overgeslagen/)).toBeInTheDocument()
  })

  it('vraagt eerst om een rekening wanneer er nog geen is', () => {
    render(
      <ImportSectie
        rekeningen={[]}
        transacties={[]}
        categorieen={[]}
        handelaarIndex={bouwHandelaarIndex([])}
        onImporteer={vi.fn()}
      />,
    )
    expect(screen.getByText(/Maak eerst een rekening aan/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Bestand')).toBeNull()
  })

  // --- Ronde 37, na de verificatieronde ---

  it('leest een bestand met rekeninginfo boven de tabel', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(
      screen.getByLabelText('Bestand'),
      bestand(['Rekening: BE12 3456 7890 1234, EUR, Zichtrekening', 'Periode: 01/02 - 28/02', UITTREKSEL].join('\n')),
    )

    // Vroeger telde de app hier één kolom en kon je niet eens de juiste aanduiden.
    expect(await screen.findByText('COLRUYT HALLE')).toBeInTheDocument()
    expect(screen.getByText(/2 regel\(s\) bovenaan overgeslagen/)).toBeInTheDocument()
  })

  it('zegt dat een bestand geen CSV is in plaats van tekenbrij te tonen', async () => {
    const user = userEvent.setup()
    toon()
    const brij = Array.from({ length: 500 }, (_, i) => String.fromCharCode(i % 30)).join('')
    await user.upload(screen.getByLabelText('Bestand'), bestand(brij, 'uittreksel.pdf'))

    expect(await screen.findByText(/Dit lijkt geen CSV-bestand/)).toBeInTheDocument()
  })

  it('zet alles aan of alles uit in één klik', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('COLRUYT HALLE')

    await user.click(screen.getByRole('button', { name: 'Alles uit' }))
    expect(screen.getByText('0 van 3 geselecteerd')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alles aan' }))
    expect(screen.getByText('3 van 3 geselecteerd')).toBeInTheDocument()
  })

  it('zet in één klik alle vermoedelijke dubbels uit', async () => {
    const user = userEvent.setup()
    const bestaand: Transactie[] = [
      { id: 't1', datum: '2026-02-01', omschrijving: 'Colruyt', bedrag: -1250, rekeningId: 'r1' },
    ]
    toon(bestaand)
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('lijkt al geboekt')

    await user.click(screen.getByRole('button', { name: 'Alles aan' }))
    expect(screen.getByText('3 van 3 geselecteerd')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Zet de 1 vermoedelijke dubbels uit/ }))
    expect(screen.getByText('2 van 3 geselecteerd')).toBeInTheDocument()
  })

  it('toont een samenvatting van wat er ingelezen wordt', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))

    // 3 boekingen, −12,50 − 8,20 + 2400,00 = 2379,30
    expect(await screen.findByText(/3 boekingen van .* t\/m .*, samen/)).toBeInTheDocument()
  })

  it('geeft de ingelezen boekingen een invoertijdstip, zodat ze bovenaan komen', async () => {
    const user = userEvent.setup()
    const onImporteer = toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('COLRUYT HALLE')
    await user.click(screen.getByRole('button', { name: /Lees 3 boeking/ }))

    await waitFor(() => expect(onImporteer).toHaveBeenCalled())
    const nieuwe = onImporteer.mock.calls[0][0] as Transactie[]
    expect(nieuwe.every((n) => typeof n.ingevoerdOp === 'string')).toBe(true)
  })

  it('vraagt eerst welke kolom het bedrag is voor er iets na te kijken valt', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('Kloppen de kolommen?')

    await user.selectOptions(screen.getByLabelText('Wat staat er in de kolom Bedrag?'), 'negeren')
    expect(screen.getByText('Duid aan welke kolom het bedrag bevat.')).toBeInTheDocument()
    // En dan verschijnt de nakijklijst NIET, in plaats van een lege lijst met een
    // nietszeggende melding.
    expect(screen.queryByText('Nakijken en inlezen')).toBeNull()
  })
})

// Ronde 65: op dit scherm zet de verkeerde rekening kiezen de dubbelherkenning
// zelf uit — ze kijkt immers alleen binnen de gekozen rekening.
describe('ImportSectie — de juiste rekening kiezen', () => {
  it('toont rekeningen met hun volledige label, niet alleen hun naam', async () => {
    const onImporteer = vi.fn()
    render(
      <ImportSectie
        rekeningen={[
          { id: 'r1', naam: 'Betaalrekening', beginsaldo: 0, rubriek: 'Samen', rekeningnummer: 'BE68 5390 0754 7034' },
          { id: 'r2', naam: 'Betaalrekening', beginsaldo: 0, rubriek: 'Ik' },
        ]}
        transacties={[]}
        categorieen={[]}
        handelaarIndex={bouwHandelaarIndex([])}
        onImporteer={onImporteer}
      />,
    )
    // ⚠ Twee rekeningen die allebei "Betaalrekening" heten waren hier niet uit
    // elkaar te houden: dit was het enige keuzemenu zonder rekeningLabel.
    expect(screen.getByRole('option', { name: 'Betaalrekening · Samen · …7034' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Betaalrekening · Ik' })).toBeInTheDocument()
  })

  it('waarschuwt wanneer deze regels al op een andere rekening staan', async () => {
    const user = userEvent.setup()
    toon([
      { id: 't1', datum: '2026-02-01', omschrijving: 'Colruyt', bedrag: -1250, rekeningId: 'r2' },
      { id: 't2', datum: '2026-02-02', omschrijving: 'Delhaize', bedrag: -820, rekeningId: 'r2' },
    ])
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('COLRUYT HALLE')

    expect(screen.getByText(/2 van deze regels staan al op Spaarrekening/)).toBeInTheDocument()
    // De waarschuwing hangt aan het keuzemenu zelf, zodat wie er later opnieuw in
    // belandt ze nog steeds hoort.
    expect(screen.getByLabelText('Op welke rekening?')).toHaveAttribute('aria-describedby', 'imp-elders')
  })

  it('zwijgt zodra je de rekening corrigeert', async () => {
    const user = userEvent.setup()
    toon([
      { id: 't1', datum: '2026-02-01', omschrijving: 'Colruyt', bedrag: -1250, rekeningId: 'r2' },
      { id: 't2', datum: '2026-02-02', omschrijving: 'Delhaize', bedrag: -820, rekeningId: 'r2' },
    ])
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('COLRUYT HALLE')
    await user.selectOptions(screen.getByLabelText('Op welke rekening?'), 'r2')

    await waitFor(() => expect(screen.queryByText(/staan al op/)).toBeNull())
  })

  it('zwijgt wanneer er nergens anders iets op lijkt', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bestand'), bestand(UITTREKSEL))
    await screen.findByText('COLRUYT HALLE')

    expect(screen.queryByText(/staan al op/)).toBeNull()
  })
})

// Ronde 66: de beste uitleg van de app stond dicht, achter een vraag.
describe('ImportSectie — de uitleg over het bankbestand', () => {
  it('staat open zolang de app nog geen enkele boeking heeft', () => {
    toon()
    const blok = screen.getByText('Zo vind je dat bestand bij je bank').closest('details') as HTMLElement
    // ⚠ Wie niet weet dát hij het niet weet, klapt een dichte vraag niet open.
    expect(blok).toHaveAttribute('open')
    expect(screen.getByText(/zoek je bij je rekeninguittreksels/)).toBeInTheDocument()
  })

  it('staat dicht zodra je al boekingen hebt', () => {
    toon([{ id: 't1', datum: '2026-02-01', omschrijving: 'Colruyt', bedrag: -1250, rekeningId: 'r1' }])
    const blok = screen.getByText('Zo vind je dat bestand bij je bank').closest('details') as HTMLElement
    expect(blok).not.toHaveAttribute('open')
  })

  it('heet geen vraag meer, maar zegt wat het is', () => {
    toon()
    expect(screen.queryByText('Waar vind ik dat bestand bij mijn bank?')).toBeNull()
  })

  it('biedt een weg naar een rekening wanneer er nog geen is', async () => {
    const user = userEvent.setup()
    const onNaarRekeningen = vi.fn()
    render(
      <ImportSectie
        rekeningen={[]}
        transacties={[]}
        categorieen={[]}
        handelaarIndex={bouwHandelaarIndex([])}
        onImporteer={vi.fn()}
        onNaarRekeningen={onNaarRekeningen}
      />,
    )
    // ⚠ Zonder deze knop was dit scherm doodlopend: de zin zei wat je moest doen,
    // maar er stond nergens een weg erheen.
    await user.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    expect(onNaarRekeningen).toHaveBeenCalled()
  })
})
