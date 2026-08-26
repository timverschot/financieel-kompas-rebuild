import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BoekingDialoog } from './BoekingDialoog'
import type { Overboeking, Rekening } from '../data/schema'

const REKENINGEN: Rekening[] = [
  { id: 'r1', naam: 'Betaalrekening', beginsaldo: 100000 },
  { id: 'r2', naam: 'Spaarrekening', beginsaldo: 500000 },
]

function toon(extra: Partial<Parameters<typeof BoekingDialoog>[0]> = {}) {
  const onTransactie = vi.fn()
  const onVastePost = vi.fn()
  const onOverboeking = vi.fn()
  const onSluiten = vi.fn()
  const overboekingen: Overboeking[] = []
  render(
    <BoekingDialoog
      open
      onSluiten={onSluiten}
      rekeningen={REKENINGEN}
      categorieen={[]}
      handelaars={[]}
      overboekingen={overboekingen}
      waarderingen={[]}
      transacties={[]}
      onTransactie={onTransactie}
      onVastePost={onVastePost}
      onOverboeking={onOverboeking}
      {...extra}
    />,
  )
  return { onTransactie, onVastePost, onOverboeking, onSluiten }
}

describe('BoekingDialoog', () => {
  it('toont de vier soorten en begint op Uitgave', () => {
    toon()
    for (const naam of ['Uitgave', 'Inkomst', 'Vaste last', 'Sparen']) {
      expect(screen.getByRole('button', { name: naam })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Uitgave' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Uitgave toevoegen')
  })

  it('boekt een uitgave met een minteken', async () => {
    const user = userEvent.setup()
    const { onTransactie } = toon()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onTransactie).toHaveBeenCalledWith(expect.objectContaining({ bedrag: -1250, omschrijving: 'Colruyt' }))
  })

  it('boekt een inkomst met een plusbedrag na één klik op de soortknop', async () => {
    const user = userEvent.setup()
    const { onTransactie } = toon()
    await user.click(screen.getByRole('button', { name: 'Inkomst' }))
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Loon')
    await user.type(screen.getByLabelText('Bedrag (€)'), '2400')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onTransactie).toHaveBeenCalledWith(expect.objectContaining({ bedrag: 240000 }))
  })

  it('verbergt de radiobolletjes voor uitgave/inkomst op de transactietabbladen', () => {
    toon()
    // Zou de keuze op twee plaatsen staan, dan kan ze uit elkaar lopen: je klikt
    // 'Inkomst' bovenaan en het bolletje onderaan staat nog op 'Uitgave'.
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('houdt onder "Vaste last" de bolletjes wél, en de knop volgt ze (ronde 83)', async () => {
    // ⚠ Deze test bestond niet, en de test hierboven meette het verkeerde tabblad: ze
    // opende op "Uitgave", waar sowieso geen bolletje staat. Onder "Vaste last" zijn er
    // er twee — dat is de enige plek in de app waar de soort niet van buiten vastligt.
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Vaste last' }))
    expect(screen.getByRole('form', { name: 'Nieuwe vaste last' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Inkomst' }))
    expect(screen.getByRole('form', { name: 'Nieuwe vaste inkomst' })).toBeInTheDocument()
  })

  it('zegt in de popup niet twee keer hetzelfde, en spreekt zichzelf niet tegen', async () => {
    // ⚠ MIJN EIGEN FOUT VAN RONDE 83, gevonden door een nakijkronde. De knop heette
    // even "Vaste last toevoegen" — dezelfde vier woorden als de vensterkop erboven —
    // en zodra je het bolletje op "Inkomst" zette, stond er boven "Vaste last
    // toevoegen" en onder "Vaste inkomst toevoegen". Nu heet de knop hier gewoon
    // "Toevoegen": de kop zegt al waarover het gaat.
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Vaste last' }))
    expect(screen.getByRole('button', { name: 'Toevoegen' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Inkomst' }))
    expect(screen.getByRole('button', { name: 'Toevoegen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Vaste (last|inkomst) toevoegen/ })).toBeNull()
  })

  it('maakt bij "Vaste last" een terugkerende post en niet een transactie', async () => {
    const user = userEvent.setup()
    const { onVastePost, onTransactie } = toon()
    await user.click(screen.getByRole('button', { name: 'Vaste last' }))
    await user.type(screen.getByLabelText('Omschrijving'), 'Huur')
    await user.type(screen.getByLabelText('Bedrag (€)'), '950')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onVastePost).toHaveBeenCalledWith(expect.objectContaining({ omschrijving: 'Huur', bedrag: -95000, dag: 1 }))
    expect(onTransactie).not.toHaveBeenCalled()
  })

  it('maakt bij "Sparen" een overboeking en niet een uitgave', async () => {
    const user = userEvent.setup()
    const { onOverboeking, onTransactie } = toon()
    await user.click(screen.getByRole('button', { name: 'Sparen' }))
    await user.selectOptions(screen.getByLabelText('Van rekening'), 'r1')
    await user.selectOptions(screen.getByLabelText('Naar rekening'), 'r2')
    await user.type(screen.getByLabelText('Over te boeken bedrag (€)'), '200')
    await user.click(screen.getByRole('button', { name: 'Overboeking toevoegen' }))
    expect(onOverboeking).toHaveBeenCalledWith(
      expect.objectContaining({ vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 20000 }),
    )
    expect(onTransactie).not.toHaveBeenCalled()
  })

  it('sluit na het opslaan, maar niet na "Opslaan + volgende"', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')

    await user.click(screen.getByRole('button', { name: /^Opslaan \+ volgende/ }))
    expect(onSluiten).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Krant')
    await user.type(screen.getByLabelText('Bedrag (€)'), '3')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onSluiten).toHaveBeenCalled()
  })

  it('houdt de popup niet open na een mislukte "Opslaan + volgende" (ronde 47)', async () => {
    // Sinds die knop `aria-disabled` is in plaats van `disabled`, loopt zijn onClick
    // óók bij een onvolledig formulier. Zonder het wissen van de vlag hield de
    // volgende, gewone opslag de popup open met lege velden — en dan denk je dat het
    // niet gelukt is en boek je alles een tweede keer.
    const user = userEvent.setup()
    const { onSluiten, onOverboeking } = toon()
    await user.click(screen.getByRole('button', { name: 'Sparen' }))

    // Nog geen rekeningen gekozen: deze klik hoort niets te doen.
    await user.click(screen.getByRole('button', { name: /^Opslaan \+ volgende/ }))
    expect(onOverboeking).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText('Van rekening'), 'r1')
    await user.selectOptions(screen.getByLabelText('Naar rekening'), 'r2')
    await user.type(screen.getByLabelText('Over te boeken bedrag (€)'), '200')
    await user.click(screen.getByRole('button', { name: 'Overboeking toevoegen' }))
    expect(onOverboeking).toHaveBeenCalledTimes(1)
    expect(onSluiten).toHaveBeenCalled()
  })

  it('houdt de popup ook bij een VASTE POST niet open na een mislukte "Opslaan + volgende"', async () => {
    // ⚠ Ronde 61 gaf dezelfde knop op het vaste-postformulier `aria-disabled` in plaats
    // van `disabled`. Zijn onClick loopt daardoor ook bij een leeg formulier, en dan
    // blijft de vlag "houd de popup open" hangen — waarna de volgende, geslaagde opslag
    // de popup openhoudt met lege velden. Je denkt dan dat het niet gelukt is en boekt
    // alles een tweede keer. Precies de val die in ronde 47 bij de overboeking zat.
    const user = userEvent.setup()
    const { onSluiten, onVastePost } = toon()
    await user.click(screen.getByRole('button', { name: 'Vaste last' }))

    // Nog niets ingevuld: deze klik hoort niets te doen.
    await user.click(screen.getByRole('button', { name: /^Opslaan \+ volgende/ }))
    expect(onVastePost).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Omschrijving'), 'Huur')
    await user.type(screen.getByLabelText('Bedrag (€)'), '950')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onVastePost).toHaveBeenCalledTimes(1)
    expect(onSluiten).toHaveBeenCalled()
  })

  it('zegt waarom de knop uitstaat in plaats van enkel niet te reageren', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Sparen' }))
    expect(screen.getByText('Kies eerst van welke rekening naar welke rekening je overboekt.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Van rekening'), 'r1')
    await user.selectOptions(screen.getByLabelText('Naar rekening'), 'r1')
    expect(screen.getByText('Kies twee verschillende rekeningen.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Naar rekening'), 'r2')
    expect(screen.getByText('Vul een bedrag groter dan nul in.')).toBeInTheDocument()
  })

  it('opent op de soort waarmee ze geopend werd', () => {
    toon({ beginSoort: 'sparen' })
    expect(screen.getByRole('button', { name: 'Sparen' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Van rekening')).toBeInTheDocument()
  })

  it('zegt bij Sparen dat het geen uitgave is', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Sparen' }))
    expect(screen.getByText(/geen uitgave/)).toBeInTheDocument()
  })
})

// --- Ronde 66, slotronde: de popup mag nooit doodlopen ---
describe('BoekingDialoog — zonder (genoeg) rekeningen', () => {
  it('zet één eerste stap in plaats van vier onbruikbare formulieren', async () => {
    // ⚠ Zonder rekening leidt élk van de vier soorten naar een formulier met een
    // uitgezette opslaanknop. De ➕ staat op elk scherm en is precies wat een
    // nieuwe gebruiker als eerste probeert; hij mocht daar niet stranden.
    const user = userEvent.setup()
    const onNaarRekeningen = vi.fn()
    const { onSluiten } = toon({ rekeningen: [], onNaarRekeningen })
    expect(screen.queryByRole('button', { name: 'Uitgave' })).toBeNull()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Eerst een rekening')
    await user.click(screen.getByRole('button', { name: 'Maak je eerste rekening aan' }))
    expect(onNaarRekeningen).toHaveBeenCalledTimes(1)
    // Eerst sluiten, anders staat de popup nog over de pagina waar je heen ging.
    expect(onSluiten).toHaveBeenCalled()
  })

  it('belooft geen knop wanneer er geen bestemming meegegeven is', () => {
    toon({ rekeningen: [] })
    expect(screen.getByText(/Een boeking moet ergens op staan/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Maak je eerste rekening aan' })).toBeNull()
  })

  it('geeft ook bij Sparen met één rekening een weg naar buiten', async () => {
    // Eén rekening: uitgaven en inkomsten kunnen wél, sparen niet. Die tab zei
    // "je hebt minstens twee rekeningen nodig" en liet je daar staan.
    const user = userEvent.setup()
    const onNaarRekeningen = vi.fn()
    toon({ rekeningen: [REKENINGEN[0]], onNaarRekeningen })
    await user.click(screen.getByRole('button', { name: 'Sparen' }))
    expect(screen.getByText(/minstens twee rekeningen nodig/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    expect(onNaarRekeningen).toHaveBeenCalledTimes(1)
  })
})
