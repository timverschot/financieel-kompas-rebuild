import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RekeningDetail } from './RekeningDetail'
import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { formatEuro } from '../utils/format'
import { vandaag } from '../utils/datum'

// Alles speelt zich vandaag af, dus de test klopt op elke systeemdatum: die dag
// valt altijd binnen 'deze maand' en altijd t.e.m. vandaag.
const vandaagTekst = vandaag()

const rekening: Rekening = { id: 'r1', naam: 'Zichtrekening', beginsaldo: 100000 }

const tx = (extra: Partial<Transactie> & { id: string }): Transactie => ({
  datum: vandaagTekst,
  omschrijving: 'Winkel',
  bedrag: -1000,
  rekeningId: 'r1',
  ...extra,
})

const ob = (extra: Partial<Overboeking> & { id: string }): Overboeking => ({
  datum: vandaagTekst,
  vanRekeningId: 'r1',
  naarRekeningId: 'r2',
  bedrag: 10000,
  ...extra,
})

const namen: Record<string, string> = { r1: 'Zichtrekening', r2: 'Spaarrekening' }

function toon(opties: {
  rekening?: Rekening
  transacties?: Transactie[]
  overboekingen?: Overboeking[]
  waarderingen?: Waardering[]
  onWaardering?: (w: Waardering) => void
  rekeningen?: Rekening[]
  onOverboeking?: (o: Overboeking) => void
  onGaNaarTransacties?: (filter: unknown) => void
  onBewerkTransactie?: (tx: Transactie) => void
} = {}) {
  const onBewerk = vi.fn()
  const onArchiveer = vi.fn()
  const onVerwijder = vi.fn()
  const onWaardering = opties.onWaardering ?? vi.fn()
  const onOverboeking = opties.onOverboeking ?? vi.fn()
  const resultaat = render(
    <RekeningDetail
      rekening={opties.rekening ?? rekening}
      transacties={opties.transacties ?? []}
      overboekingen={opties.overboekingen ?? []}
      waarderingen={opties.waarderingen ?? []}
      onWaardering={onWaardering}
      onWaarderingVerwijderen={vi.fn()}
      categorieen={[]}
      rekeningNaam={(id) => namen[id]}
      onBewerk={onBewerk}
      onArchiveer={onArchiveer}
      onVerwijder={onVerwijder}
      rekeningen={opties.rekeningen}
      onOverboeking={onOverboeking}
      onGaNaarTransacties={opties.onGaNaarTransacties}
      onBewerkTransactie={opties.onBewerkTransactie}
    />,
  )
  return { ...resultaat, onBewerk, onArchiveer, onVerwijder, onOverboeking }
}

// Het grote saldocijfer bovenaan.
function grootSaldo(container: HTMLElement): string {
  return container.querySelector('.bedrag-groot')?.textContent ?? ''
}

// Het cijfer dat bij een kengetal-label hoort.
function kengetal(label: string): string {
  const blok = screen.getByText(label).closest('.stat') as HTMLElement
  return blok.querySelector('.stat-waarde')?.textContent ?? ''
}

describe('RekeningDetail', () => {
  it('toont het saldo van vandaag: beginsaldo + transacties + overboekingen', () => {
    const { container } = toon({
      transacties: [
        tx({ id: 't1', omschrijving: 'Loon', bedrag: 50000 }),
        tx({ id: 't2', omschrijving: 'Colruyt', bedrag: -20000 }),
        // Een boeking op een ANDERE rekening mag niet meetellen.
        tx({ id: 't3', omschrijving: 'Elders', bedrag: -99900, rekeningId: 'r2' }),
      ],
      overboekingen: [
        // Binnenkomend: verhoogt het saldo van deze rekening.
        ob({ id: 'o1', vanRekeningId: 'r2', naarRekeningId: 'r1', bedrag: 30000 }),
        // Uitgaand: verlaagt het.
        ob({ id: 'o2', vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 5000 }),
      ],
    })

    // 1000,00 + 500,00 - 200,00 + 300,00 - 50,00 = 1550,00
    expect(grootSaldo(container)).toBe(formatEuro(155000))
    // Het startsaldo staat eronder, zodat het verschil navolgbaar is. We
    // vergelijken op textContent: formatEuro zet een vaste spatie na het
    // euroteken, en die wordt in een tekstzoekopdracht platgeslagen.
    expect(screen.getByText(/^startsaldo/).textContent).toBe(`startsaldo ${formatEuro(100000)}`)
  })

  it('telt de maandcijfers per regel, zonder overboekingen', () => {
    toon({
      transacties: [
        tx({ id: 't1', omschrijving: 'Loon', bedrag: 200000 }),
        tx({ id: 't2', omschrijving: 'Colruyt', bedrag: -30000 }),
        tx({ id: 't3', omschrijving: 'Q8', bedrag: -20000 }),
        // Vorig jaar, zelfde dag: valt buiten deze maand.
        tx({ id: 't4', omschrijving: 'Oud', bedrag: -777700, datum: `${Number(vandaagTekst.slice(0, 4)) - 1}${vandaagTekst.slice(4)}` }),
      ],
      overboekingen: [
        // Grote bedragen: zouden meteen opvallen als ze zouden meetellen.
        ob({ id: 'o1', vanRekeningId: 'r2', naarRekeningId: 'r1', bedrag: 900000 }),
        ob({ id: 'o2', vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 800000 }),
      ],
    })

    expect(kengetal('Inkomsten')).toBe(formatEuro(200000))
    expect(kengetal('Uitgaven')).toBe(formatEuro(50000))
    expect(kengetal('Netto')).toBe(formatEuro(150000))
    expect(
      screen.getByText('Overboekingen tellen hier niet mee: die verschuiven enkel geld tussen je eigen rekeningen.'),
    ).toBeInTheDocument()
  })

  it('toont een gesplitst ticket volledig op deze rekening, niet per categorie', () => {
    toon({
      transacties: [
        tx({
          id: 't1',
          omschrijving: 'Colruyt',
          bedrag: -5000,
          regels: [
            { categorieId: 'voeding', bedrag: -3000 },
            { categorieId: 'huishouden', bedrag: -2000 },
          ],
        }),
      ],
    })
    // Het volledige ticketbedrag, niet één van de deelregels.
    expect(kengetal('Uitgaven')).toBe(formatEuro(5000))
  })

  it('splitst een ticket met een regel in de andere richting uit (ronde 69)', () => {
    // Een ticket van − € 50: € 60 boodschappen en € 10 statiegeld terug. Op de
    // MOEDERtransactie geteld stond hier € 50 uitgaven en € 0 inkomsten, terwijl
    // Analyse en de budgetten er € 60 en € 10 van maken — twee schermen, twee
    // waarheden. Het netto was toevallig wel gelijk, dus het viel niet op.
    toon({
      transacties: [
        tx({
          id: 't1',
          omschrijving: 'Colruyt',
          bedrag: -5000,
          regels: [
            { categorieId: 'voeding', bedrag: -6000 },
            { categorieId: 'statiegeld', bedrag: 1000 },
          ],
        }),
      ],
    })
    expect(kengetal('Uitgaven')).toBe(formatEuro(6000))
    expect(kengetal('Inkomsten')).toBe(formatEuro(1000))
    expect(kengetal('Netto')).toBe(formatEuro(-5000))
  })

  it('toont de laatste transacties nieuwste eerst en meldt de rest', () => {
    const veel = Array.from({ length: 10 }, (_, i) =>
      tx({ id: `t${i}`, omschrijving: `Boeking ${i}`, datum: `2026-01-${String(i + 1).padStart(2, '0')}` }),
    )
    toon({ transacties: veel })

    const rijen = screen.getAllByText(/^Boeking \d$/)
    expect(rijen).toHaveLength(8)
    // Nieuwste (hoogste dagnummer) staat bovenaan.
    expect(rijen[0].textContent).toBe('Boeking 9')
    expect(screen.getByText('+ nog 2')).toBeInTheDocument()
  })

  it('toont de richting van een overboeking en de naam van de andere rekening', () => {
    toon({
      overboekingen: [
        ob({ id: 'o1', vanRekeningId: 'r2', naarRekeningId: 'r1', bedrag: 25000 }),
        ob({ id: 'o2', vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 15000 }),
      ],
    })

    const binnen = screen.getByText('van Spaarrekening').closest('li') as HTMLElement
    expect(binnen.querySelector('.bedrag-positief')?.textContent).toBe(formatEuro(25000))

    const uit = screen.getByText('naar Spaarrekening').closest('li') as HTMLElement
    expect(uit.querySelector('.bedrag-negatief')?.textContent).toBe(formatEuro(-15000))
  })

  it('toont bij een gearchiveerde rekening de badge en de herstel-knop', async () => {
    const user = userEvent.setup()
    const gearchiveerd: Rekening = { ...rekening, gearchiveerd: true }
    const { onArchiveer } = toon({ rekening: gearchiveerd })

    expect(screen.getByText('gearchiveerd')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archiveer rekening Zichtrekening' })).not.toBeInTheDocument()

    const herstel = screen.getByRole('button', { name: 'Herstel rekening Zichtrekening' })
    await user.click(herstel)
    // Heropenen betekent: archiveer = false.
    expect(onArchiveer).toHaveBeenCalledWith(gearchiveerd, false)
  })

  it('toont bij een actieve rekening de archiveerknop en geen badge', async () => {
    const user = userEvent.setup()
    const { onArchiveer, onBewerk, onVerwijder } = toon()

    expect(screen.queryByText('gearchiveerd')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Archiveer rekening Zichtrekening' }))
    expect(onArchiveer).toHaveBeenCalledWith(rekening, true)

    await user.click(screen.getByRole('button', { name: 'Bewerk rekening Zichtrekening' }))
    expect(onBewerk).toHaveBeenCalledWith(rekening)

    await user.click(screen.getByRole('button', { name: 'Verwijder rekening Zichtrekening' }))
    expect(onVerwijder).toHaveBeenCalledWith('r1')
  })

  it('toont één lege-toestandzin zonder transacties en zonder overboekingen', () => {
    const { container } = toon()

    expect(screen.getByText(/Nog geen boekingen op deze rekening/)).toBeInTheDocument()
    expect(container.querySelectorAll('li.rij')).toHaveLength(0)
    // Het saldo blijft wel gewoon staan: het startbedrag.
    expect(grootSaldo(container)).toBe(formatEuro(100000))
  })

  it('toont type, rubriek en rekeningnummer enkel wanneer ze ingevuld zijn', () => {
    const { rerender } = toon()
    expect(screen.queryByText(/Betaalrekening/)).not.toBeInTheDocument()

    rerender(
      <RekeningDetail
        rekening={{ ...rekening, type: 'spaar', rubriek: 'Reserve', rekeningnummer: 'BE68 5390 0754 7034' }}
        transacties={[]}
        overboekingen={[]}
        categorieen={[]}
        rekeningNaam={(id) => namen[id]}
        onBewerk={vi.fn()}
        onArchiveer={vi.fn()}
        onVerwijder={vi.fn()}
        waarderingen={[]}
        onWaardering={vi.fn()}
        onWaarderingVerwijderen={vi.fn()}
      />,
    )
    expect(screen.getByText('Spaarrekening · Reserve · BE68 5390 0754 7034')).toBeInTheDocument()
  })
})

describe('RekeningDetail — waarde bijwerken (ronde 38)', () => {
  it('legt een waardering vast met datum, bedrag en notitie', async () => {
    const gebruiker = userEvent.setup()
    const onWaardering = vi.fn()
    toon({ onWaardering })

    await gebruiker.click(screen.getByText('Waarde bijwerken'))
    await gebruiker.clear(screen.getByLabelText('Op welke dag?'))
    await gebruiker.type(screen.getByLabelText('Op welke dag?'), '2026-07-15')
    await gebruiker.type(screen.getByLabelText('Werkelijke waarde (€)'), '1234,56')
    await gebruiker.type(screen.getByLabelText('Notitie'), 'jaaroverzicht')
    await gebruiker.click(screen.getByRole('button', { name: 'Waarde vastleggen' }))

    expect(onWaardering).toHaveBeenCalledWith(
      expect.objectContaining({ rekeningId: 'r1', datum: '2026-07-15', saldo: 123456, notitie: 'jaaroverzicht' }),
    )
  })

  it('houdt de knop uit zolang er geen bedrag staat, en zegt waarom', async () => {
    const gebruiker = userEvent.setup()
    toon()
    await gebruiker.click(screen.getByText('Waarde bijwerken'))

    // Bewust aria-disabled en niet disabled: een echt uitgeschakelde knop krijgt
    // geen focus, dus wie met een toetsenbord werkt zou nooit horen waaróm hij niet
    // werkt. Zie de regel in index.css en TransactieFormulier.
    const knop = screen.getByRole('button', { name: 'Waarde vastleggen' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    expect(knop).not.toBeDisabled()
    expect(knop).toHaveAttribute('aria-describedby')
    expect(screen.getByText('Vul een datum en een bedrag in.')).toBeInTheDocument()
  })

  it('toont het saldo dat uit de waardering volgt in plaats van uit het beginsaldo', () => {
    // De rekening heeft beginsaldo 100000; de waardering zet hem op 5000.
    const { container } = toon({ waarderingen: [{ id: 'w1', rekeningId: 'r1', datum: '2026-01-01', saldo: 5000 }] })
    expect(grootSaldo(container)).toBe(formatEuro(5000))
  })

  it('somt eerder vastgelegde waarderingen op', async () => {
    const gebruiker = userEvent.setup()
    toon({ waarderingen: [{ id: 'w1', rekeningId: 'r1', datum: '2026-01-01', saldo: 5000, notitie: 'start' }] })
    await gebruiker.click(screen.getByText('Waarde bijwerken'))
    expect(screen.getByText('Eerder vastgelegd')).toBeInTheDocument()
    expect(screen.getByText('start')).toBeInTheDocument()
  })
})

describe('RekeningDetail — een kredietkaart (ronde 43)', () => {
  // De datums staan vast, zodat de afsluiting van 26 juli altijd voorbij is en de
  // afboeking van 5 augustus altijd nog moet komen. 'vandaag' komt uit het systeem,
  // dus alle boekingen krijgen die dag: de afsluitdag zetten we op 1 en de
  // afboekdag op 28, waardoor de afsluiting altijd al geweest is.
  const kaart: Rekening = {
    id: 'k1',
    naam: 'Mastercard',
    type: 'krediet',
    beginsaldo: -100000,
    kredietlimiet: 400000,
    afrekendag: 1,
    afboekdag: 28,
  }
  const betaal: Rekening = { id: 'b1', naam: 'Betaalrekening', beginsaldo: 200000, type: 'betaal' }

  it('noemt het bedrag "openstaand" en toont het positief', () => {
    // "Saldo € -1.000,00" is een tekenpuzzel; "Openstaand € 1.000,00" niet.
    const { container } = toon({ rekening: kaart })
    expect(screen.getByText('Nog openstaand')).toBeInTheDocument()
    expect(screen.queryByText('Saldo vandaag')).not.toBeInTheDocument()
    expect(grootSaldo(container)).toBe(formatEuro(100000))
  })

  it('trekt het openstaande bedrag af van de limiet', () => {
    // Dit is de melding van Timothy: er stond "nog € 4.000,00 van € 4.000,00".
    const { container } = toon({ rekening: kaart })
    // formatEuro gebruikt een vaste spatie na het euroteken; vandaar de helper.
    expect(container.textContent).toContain(
      `nog ${formatEuro(300000)} van je limiet van ${formatEuro(400000)} beschikbaar`,
    )
  })

  it('waarschuwt wanneer het bedrag als tegoed is ingevoerd', () => {
    const fout = { ...kaart, beginsaldo: 100000 }
    const { container } = toon({ rekening: fout })
    expect(screen.getByText('Tegoed op de kaart')).toBeInTheDocument()
    expect(container.textContent).toContain('Er staat een tegoed op deze kaart, geen schuld')
  })

  it('toont de afsluiting, wat er nog te betalen is en de lopende periode', () => {
    const { container } = toon({ rekening: kaart })
    const blok = container.querySelector('[data-afrekening]') as HTMLElement
    expect(blok.textContent).toContain('Afgesloten op')
    expect(blok.textContent).toContain('Nog te betalen')
    expect(blok.textContent).toContain('Sinds de afsluiting')
  })

  it('boekt de afrekening als overboeking naar de kaart, niet als uitgave', async () => {
    const gebruiker = userEvent.setup()
    const onOverboeking = vi.fn()
    toon({ rekening: kaart, rekeningen: [betaal, kaart], onOverboeking })

    await gebruiker.click(screen.getByRole('button', { name: 'Afrekening boeken' }))
    await gebruiker.click(screen.getByRole('button', { name: 'Boek de overboeking' }))

    expect(onOverboeking).toHaveBeenCalledWith(
      expect.objectContaining({ vanRekeningId: 'b1', naarRekeningId: 'k1', bedrag: 100000 }),
    )
  })

  it('laat de knop weg wanneer er niets meer te betalen valt', () => {
    const betaald = { ...kaart, beginsaldo: 0 }
    toon({ rekening: betaald, rekeningen: [betaal, betaald] })
    expect(screen.queryByRole('button', { name: 'Afrekening boeken' })).not.toBeInTheDocument()
  })

  it('biedt de kaart zelf niet aan als bron van haar eigen afrekening', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekening: kaart, rekeningen: [betaal, kaart] })
    await gebruiker.click(screen.getByRole('button', { name: 'Afrekening boeken' }))
    const keuze = screen.getByLabelText('Van welke rekening') as HTMLSelectElement
    expect([...keuze.options].map((o) => o.value)).toEqual(['b1'])
  })

  it('laat een gewone rekening ongemoeid', () => {
    const { container } = toon()
    expect(screen.getByText('Saldo vandaag')).toBeInTheDocument()
    expect(container.querySelector('[data-afrekening]')).toBeNull()
  })
})

describe('RekeningDetail — de punten uit de review (ronde 43)', () => {
  // Afsluitdag 1 en afboekdag 28 zorgen dat de afsluiting altijd geweest is; de
  // afboekdatum ligt dan in dezelfde maand.
  const kaart: Rekening = {
    id: 'k1',
    naam: 'Mastercard',
    type: 'krediet',
    beginsaldo: -100000,
    kredietlimiet: 400000,
    afrekendag: 1,
    afboekdag: 28,
  }
  const tweede: Rekening = { ...kaart, id: 'k2', naam: 'Visa', beginsaldo: -25000 }
  const betaal: Rekening = { id: 'b1', naam: 'Betaalrekening', beginsaldo: 500000, type: 'betaal' }

  it('begint met een leeg formulier wanneer je naar een andere kaart gaat', async () => {
    // Zonder een eigen sleutel per rekening bleef het bedrag van de vorige kaart in
    // het formulier staan — en boekte je dat bedrag naar de verkeerde kaart.
    const gebruiker = userEvent.setup()
    const { rerender } = render(
      <RekeningDetail
        rekening={kaart}
        transacties={[]}
        overboekingen={[]}
        waarderingen={[]}
        onWaardering={vi.fn()}
        onWaarderingVerwijderen={vi.fn()}
        categorieen={[]}
        rekeningNaam={(id) => namen[id]}
        onBewerk={vi.fn()}
        onArchiveer={vi.fn()}
        onVerwijder={vi.fn()}
        rekeningen={[betaal, kaart, tweede]}
        onOverboeking={vi.fn()}
      />,
    )
    await gebruiker.click(screen.getByRole('button', { name: 'Afrekening boeken' }))
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('1000,00')

    rerender(
      <RekeningDetail
        rekening={tweede}
        transacties={[]}
        overboekingen={[]}
        waarderingen={[]}
        onWaardering={vi.fn()}
        onWaarderingVerwijderen={vi.fn()}
        categorieen={[]}
        rekeningNaam={(id) => namen[id]}
        onBewerk={vi.fn()}
        onArchiveer={vi.fn()}
        onVerwijder={vi.fn()}
        rekeningen={[betaal, kaart, tweede]}
        onOverboeking={vi.fn()}
      />,
    )
    // Het paneel is dicht en het bedrag van de vorige kaart is weg.
    expect(screen.queryByLabelText('Bedrag (€)')).not.toBeInTheDocument()
    await gebruiker.click(screen.getByRole('button', { name: 'Afrekening boeken' }))
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('250,00')
  })

  it('biedt de knop niet nog eens aan wanneer de afrekening al klaarstaat', () => {
    // Een overboeking met de datum van de afboeking staat in de toekomst en telt
    // dus nergens mee. Zonder deze controle boekte je ze een tweede keer.
    const morgen = new Date(Date.parse(vandaagTekst) + 86400000).toISOString().slice(0, 10)
    const { container } = toon({
      rekening: kaart,
      rekeningen: [betaal, kaart],
      overboekingen: [ob({ id: 'o1', datum: morgen, vanRekeningId: 'b1', naarRekeningId: 'k1', bedrag: 100000 })],
    })
    expect(container.textContent).toContain('Er staat al een overboeking van')
    expect(screen.queryByRole('button', { name: 'Afrekening boeken' })).not.toBeInTheDocument()
  })

  it('legt uit waarom er niet geboekt kan worden zonder tweede rekening', () => {
    const { container } = toon({ rekening: kaart, rekeningen: [kaart] })
    expect(screen.queryByRole('button', { name: 'Afrekening boeken' })).not.toBeInTheDocument()
    expect(container.textContent).toContain('heb je nog een andere rekening nodig')
  })

  it('leest een kaart die als tegoed bewaard is als tegoed, ook in het startbedrag', () => {
    const oud = { ...kaart, beginsaldo: 100000 }
    const { container } = toon({ rekening: oud })
    expect(container.textContent).toContain('bij de start stond er')
    expect(container.textContent).not.toContain('€ -1.000,00')
  })
})

// --- Ronde 48: van een cijfer naar de boekingen --------------------------------

describe('RekeningDetail — doorklikken', () => {
  it('laat alleen Netto doorklikken, niet Inkomsten of Uitgaven', () => {
    // Die twee tellen op TRANSACTIEniveau, terwijl het richting-filter van de lijst
    // op regelniveau werkt. Een kassaticket van € 47 met een regel statiegeld van
    // + € 3 staat hier volledig onder "eraf", maar de gefilterde lijst zou er € 50
    // uitgaven boven zetten — en bij "in" zou je op € 0,00 klikken en tóch een
    // boeking krijgen. Verschil telt in beide berekeningen hetzelfde op.
    toon({ onGaNaarTransacties: vi.fn() })
    expect(screen.getByRole('button', { name: /^Netto / })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Binnengekomen / })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Eraf gegaan / })).toBeNull()
  })

  it('geeft bij Netto de rekening én de maand mee', async () => {
    const gebruiker = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    toon({ onGaNaarTransacties })
    await gebruiker.click(screen.getByRole('button', { name: /^Netto / }))
    const filter = onGaNaarTransacties.mock.calls[0][0]
    expect(filter.rekeningId).toBe('r1')
    // De maand van dit scherm, niet die van de maandschakelaar elders in de app:
    // de Rekeningen-pagina heeft er geen, dus het cijfer gaat altijd over nu.
    expect(filter.maand).toBe(new Date().toISOString().slice(0, 7))
  })

  it('maakt van de kengetallen geen knoppen zonder bestemming', () => {
    toon()
    expect(screen.queryByRole('button', { name: /^Netto / })).toBeNull()
  })

  it('opent een boeking vanaf haar rij', async () => {
    const gebruiker = userEvent.setup()
    const onBewerkTransactie = vi.fn()
    const boeking = tx({ id: 't1', omschrijving: 'Colruyt' })
    toon({ transacties: [boeking], onBewerkTransactie })
    await gebruiker.click(screen.getByRole('button', { name: /^Colruyt / }))
    expect(onBewerkTransactie).toHaveBeenCalledWith(boeking)
  })

  it('houdt "+ nog n" als tekst staan naast de knop', async () => {
    // De printregels verbergen elke knop. Verving de knop de tekst, dan stond er op
    // een afdruk een lijst van acht boekingen zonder één woord over de rest.
    const gebruiker = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    const veel = Array.from({ length: 10 }, (_, i) => tx({ id: `t${i}` }))
    toon({ transacties: veel, onGaNaarTransacties })
    expect(screen.getByText('+ nog 2')).toBeInTheDocument()
    await gebruiker.click(screen.getByRole('button', { name: 'Bekijk ze allemaal' }))
    expect(onGaNaarTransacties).toHaveBeenCalledWith({ rekeningId: 'r1' })
  })
})


// ---------------------------------------------------------------------------
// Ronde 69 — de drie herkomstzinnen boven de boekingen van deze maand
//
// `binnen`, `eraf` en `verschil` komen alle drie uit dezelfde `maandLijnen`, en die
// telt op REGELniveau: een kassaticket van € 47 met een regel statiegeld van + € 3
// levert € 50 uitgaven en € 3 inkomsten op, niet één bedrag van € 47. Zonder die zin
// lijkt het cijfer niet te kloppen met de rij eronder.
//
// En Netto hoort de zin net zo goed te krijgen. Niet alleen omdat het inhoudelijk
// waar is: zonder zin krijgt Netto als enige van de drie géén `stat-met-bron`, en dan
// gaat de `.stat-rij` op een telefoon scheef staan — twee tegels over de volle
// breedte en Netto ernaast geplakt.

describe('RekeningDetail — de maandcijfers verantwoorden zich', () => {
  const SPLITSZIN = 'Een gesplitst kassaticket telt per regel mee.'

  // De herkomstzin onder één van de drie kengetallen.
  function bron(label: string): string {
    const blok = screen.getByText(label).closest('.stat') as HTMLElement
    return blok.querySelector('.getal-bron')?.textContent ?? ''
  }

  it('zegt bij alle drie de cijfers dat een gesplitst ticket per regel telt', () => {
    toon({ transacties: [tx({ id: 't1', bedrag: 50000 }), tx({ id: 't2', bedrag: -20000 })] })
    expect(bron('Inkomsten')).toBe(SPLITSZIN)
    expect(bron('Uitgaven')).toBe(SPLITSZIN)
    expect(bron('Netto')).toBe(SPLITSZIN)
  })

  it('houdt de rij van drie recht doordat alle drie de tegels gemerkt zijn', () => {
    // ⚠ `.stat-met-bron` geeft de tegel een flex-basis van 220 px. Kreeg één van de
    // drie die klasse niet, dan wrapt de rij op een telefoon scheef: twee tegels over
    // de volle breedte en de derde ernaast geplakt.
    const { container } = toon({ transacties: [tx({ id: 't1', bedrag: 50000 })] })
    const rij = screen.getByText('Netto').closest('.stat-rij') as HTMLElement
    expect(rij.querySelectorAll('.stat').length).toBe(3)
    expect(rij.querySelectorAll('.stat-met-bron').length).toBe(3)
    expect(container.querySelectorAll('.stat-rij .getal-bron').length).toBeGreaterThanOrEqual(3)
  })

  it('houdt de zin ook overeind wanneer Netto een knop wordt', () => {
    // Netto is het enige van de drie dat doorklikt (Inkomsten en Uitgaven tellen op
    // transactieniveau en zouden naar een andere lijst leiden). Op een knop vervangt
    // `aria-label` ALLE tekst binnenin, dus de zin hoort er ook in te staan.
    toon({ onGaNaarTransacties: vi.fn() })
    expect(bron('Netto')).toBe(SPLITSZIN)
    const knop = screen.getByRole('button', { name: /^Netto / })
    expect(knop).toHaveClass('stat-met-bron')
    expect(knop.getAttribute('aria-label')).toContain(SPLITSZIN)
  })
})
