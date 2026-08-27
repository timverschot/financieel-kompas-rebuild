import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TerugkerendeSectie } from './TerugkerendeSectie'
import type { Spaardoel, TerugkerendePost, Transactie } from '../data/schema'
import { vertaal } from '../i18n'
import { knopnaamVoorPost } from '../utils/postkenmerk'

// ⚠ RONDE 82 — de toegankelijke naam van elke knop op een rij draagt sinds deze ronde
// het bedrag en de dag erbij, zodat twee posten die allebei "Autoverzekering" heten uit
// elkaar te houden zijn. Deze hulpfunctie bouwt hem uit dezelfde bron als het scherm.
// Dat is bewust geen kopie van de verwachte tekst: WAT er in die naam staat, wordt
// getest in utils/postkenmerk.test.ts; de tests hieronder moeten alleen de juiste knop
// kunnen vinden, en die zoektocht hoort niet om te vallen bij een woordwijziging.
const knopnaam = (actie: string, post: TerugkerendePost, alle: TerugkerendePost[] = [post]) =>
  knopnaamVoorPost((sleutel, params) => vertaal('nl', sleutel, params), actie, post, alle)

const rekeningen = [{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]

const huur: TerugkerendePost = { id: 'huur', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
const premie: TerugkerendePost = {
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -60000,
  rekeningId: 'r1',
  dag: 5,
  frequentie: 'semester',
  startMaand: '2026-08',
}

// Een VASTE dag, geen `new Date()`. De contractregel gaat over de echte dag van
// vandaag, en met de klok van de testmachine erin zouden deze tests op de 29e, 30e of
// 31e van een maand iets anders meten dan op de 5e. Zie
// `claude/Kompal_tijdafhankelijke-tests.md`.
const VANDAAG = '2026-07-15'

function toon(posten: TerugkerendePost[], maand = '2026-07', vandaagISO = VANDAAG) {
  const onBoek = vi.fn()
  render(
    <TerugkerendeSectie
      posten={posten}
      rekeningen={rekeningen}
      categorieen={[]}
      transacties={[]}
      maand={maand}
      maandLabel="juli 2026"
      vandaagISO={vandaagISO}
      onOpslaan={vi.fn()}
      onVerwijderen={vi.fn()}
      onBoek={onBoek}
    />,
  )
  return { onBoek }
}

/**
 * ⚠ RONDE 98 — HET FORMULIER STAAT IN EEN VENSTER.
 *
 * Tot deze ronde stond het gewoon open onder de lijst, en kon een test meteen naar
 * `getByLabelText('Omschrijving')` grijpen. Nu hoort ze eerst het venster te openen —
 * precies zoals een mens dat doet. Elke test hieronder die iets over de VELDEN zegt,
 * begint met deze regel.
 */
function openNieuw(naam = '+ Een vaste last') {
  fireEvent.click(screen.getByRole('button', { name: naam }))
}

describe('TerugkerendeSectie — andere termijnen', () => {
  it('biedt "Boek in" aan voor een maandelijkse post', () => {
    toon([huur])
    expect(screen.getByRole('button', { name: /^Boek in/ })).toBeInTheDocument()
  })

  it('biedt geen "Boek in" aan in een maand waarin de post niet vervalt', () => {
    // Halfjaarlijks vanaf augustus: in juli valt er niets te boeken. Zonder deze
    // regel zou je dezelfde jaarpremie twaalf keer kunnen inboeken.
    toon([premie], '2026-07')
    expect(screen.queryByRole('button', { name: /^Boek in/ })).not.toBeInTheDocument()
    expect(screen.getByText('Niet deze maand')).toBeInTheDocument()
  })

  it('biedt "Boek in" wél aan in de vervalmaand', () => {
    toon([premie], '2026-08')
    expect(screen.getByRole('button', { name: /^Boek in/ })).toBeInTheDocument()
  })

  // De keuzelijst van het formulier eronder bevat dezelfde woorden, dus zoeken we
  // bewust binnen de lijst met posten.
  function lijst(): HTMLElement {
    return document.querySelector('ul.lijst') as HTMLElement
  }

  it('zet de frequentie en de volgende vervaldag bij een niet-maandelijkse post', () => {
    toon([premie], '2026-08')
    expect(within(lijst()).getByText(/Om de 6 maanden/)).toBeInTheDocument()
    expect(within(lijst()).getByText(/volgende keer/)).toBeInTheDocument()
  })

  it('zegt niets over frequentie bij een gewone maandelijkse post', () => {
    toon([huur])
    expect(within(lijst()).queryByText(/Om de/)).not.toBeInTheDocument()
    expect(within(lijst()).queryByText(/volgende keer/)).not.toBeInTheDocument()
  })
})

describe('TerugkerendeSectie — een gestopte post (ronde 38)', () => {
  const opgezegd: TerugkerendePost = { ...huur, id: 'weg', omschrijving: 'Netflix', eindMaand: '2026-07' }

  it('toont "Gestopt" en niet "Niet deze maand"', () => {
    // Het verschil moet zichtbaar zijn: anders lees je bij een opgezegd abonnement
    // elke maand opnieuw "Niet deze maand" en snap je niet waarom er niets gebeurt.
    toon([opgezegd], '2026-07')
    const rij = screen.getByText('Netflix').closest('li') as HTMLElement
    expect(within(rij).getByText('Gestopt')).toBeInTheDocument()
    expect(within(rij).queryByText('Niet deze maand')).not.toBeInTheDocument()
  })

  it('biedt geen knop "Boek in" meer aan', () => {
    toon([opgezegd], '2026-07')
    const rij = screen.getByText('Netflix').closest('li') as HTMLElement
    expect(within(rij).queryByRole('button', { name: /Boek in/i })).not.toBeInTheDocument()
  })

  it('vraagt bij een PERIODIEKE gestopte post niet langer om geld opzij te zetten', () => {
    // Zonder deze test bleef de regel "€ 200,00 per maand opzij" onbewaakt: de
    // gestopte testpost hierboven is maandelijks, en dat blok toont zich alleen bij
    // een periodieke post.
    const opgezegdePremie: TerugkerendePost = { ...premie, opbouwen: true, eindMaand: '2026-09' }
    toon([opgezegdePremie], '2026-09')
    const rij = screen.getByText('Autoverzekering').closest('li') as HTMLElement
    expect(within(rij).getByText('Gestopt')).toBeInTheDocument()
    expect(within(rij).queryByText(/per maand opzij/)).not.toBeInTheDocument()
    expect(within(rij).queryByText(/volgende keer/)).not.toBeInTheDocument()
  })

  it('zegt wanneer de post gestopt is, zichtbaar en niet in een tooltip', () => {
    toon([{ ...premie, eindMaand: '2026-09' }], '2026-09')
    const rij = screen.getByText('Autoverzekering').closest('li') as HTMLElement
    expect(within(rij).getByText(/Gestopt na/)).toBeInTheDocument()
  })

  it('toont hem in de maand vóór de eindmaand nog gewoon', () => {
    toon([opgezegd], '2026-06')
    const rij = screen.getByText('Netflix').closest('li') as HTMLElement
    expect(within(rij).queryByText('Gestopt')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Het contract achter een vaste last (ronde 57)
//
// Deze regel staat bewust OP de rij en niet achter een knop: het is een datum
// waarop je moet handelen, en wat je moet opzoeken, doe je niet.
//
// Alle datums hieronder zijn VAST, en `vandaag` is 15 juli 2026 (zie `VANDAAG`).
// ---------------------------------------------------------------------------
describe('TerugkerendeSectie — het contract', () => {
  it('toont niets extra bij een gewone vaste last', () => {
    toon([huur])
    expect(screen.queryByText(/verlengt/)).not.toBeInTheDocument()
  })

  it('toont de verlengdatum en de dag waarop je moet beslissen', () => {
    const energie: TerugkerendePost = {
      ...huur,
      id: 'energie',
      omschrijving: 'Energie',
      contractsoort: 'energie',
      verlengtOp: '2026-09-01',
    }
    toon([energie])
    // Eén maand terug vanaf 1 september is 1 augustus, en dat is 17 dagen na
    // 15 juli — binnen het beslisvenster van dertig dagen.
    expect(screen.getByText(/verlengt .* beslissen vóór/)).toBeInTheDocument()
  })

  it('zegt niet dat opzeggen "nog kan" wanneer de beslisdatum voorbij is', () => {
    // ⚠ Tweede nakijkronde van ronde 57. Hier stond "opzeggen kan nog, met 1 maand".
    // Dat klopt voor energie, maar de app zei het ook bij een verzekering in haar
    // eerste jaar en bij een abonnement in zijn eerste periode — en dáár zit je wél
    // vast tot de volgende vervaldag. Ze stelt nu vast wat ze weet.
    const energie: TerugkerendePost = {
      ...huur,
      id: 'energie',
      omschrijving: 'Energie',
      contractsoort: 'energie',
      verlengtOp: '2026-07-29',
    }
    toon([energie])
    expect(screen.getByText(/beslisdatum voorbij, opzegtermijn 1 maand\(en\)/)).toBeInTheDocument()
    expect(screen.queryByText(/opzeggen kan nog/)).not.toBeInTheDocument()
  })

  it('zegt erbij wanneer de datum uit de WET komt en niet uit jouw contract', () => {
    // Een hospitalisatieverzekering vraagt drie maanden, geen twee. De app kent dat
    // onderscheid niet, dus mag ze de datum niet als zekerheid neerzetten.
    const verzekering: TerugkerendePost = {
      ...huur,
      id: 'verz',
      omschrijving: 'Hospitalisatie',
      contractsoort: 'verzekering',
      verlengtOp: '2026-09-10',
    }
    toon([verzekering])
    expect(screen.getByText(/\(wettelijke termijn\)/)).toBeInTheDocument()
  })

  it('zwijgt over de wet zodra jij zelf een termijn invult', () => {
    const verzekering: TerugkerendePost = {
      ...huur,
      id: 'verz',
      omschrijving: 'Hospitalisatie',
      contractsoort: 'verzekering',
      verlengtOp: '2026-09-10',
      opzegtermijnMaanden: 3,
    }
    toon([verzekering])
    expect(screen.queryByText(/wettelijke termijn/)).not.toBeInTheDocument()
  })

  it('vraagt de nieuwe datum wanneer de oude voorbij is, mét die oude datum erbij', () => {
    const oud: TerugkerendePost = {
      ...huur,
      id: 'oud',
      omschrijving: 'Internet',
      contractsoort: 'telecom',
      verlengtOp: '2020-01-01',
    }
    toon([oud])
    // De oude datum erbij, zodat je weet wat er bij te werken valt zonder het
    // formulier te openen.
    expect(screen.getByText(/verlengdatum \(.*2020.*\) is voorbij/)).toBeInTheDocument()
  })

  it('zegt het wanneer de opgeslagen datum onleesbaar is', () => {
    // 30 februari bestaat niet. Zo'n waarde kan uit het Drive-logboek komen. Vroeger
    // zweeg de rij hierover volledig.
    const kapot: TerugkerendePost = {
      ...huur,
      id: 'kapot',
      omschrijving: 'Alarmsysteem',
      contractsoort: 'abonnement',
      verlengtOp: '2026-02-30',
    }
    toon([kapot])
    expect(screen.getByText(/verlengdatum is onleesbaar/)).toBeInTheDocument()
  })

  it('zegt het wanneer er geen opzegtermijn bekend is', () => {
    const ander: TerugkerendePost = {
      ...huur,
      id: 'ander',
      omschrijving: 'Zwembadonderhoud',
      contractsoort: 'ander',
      verlengtOp: '2027-01-15',
    }
    toon([ander])
    expect(screen.getByText(/geen opzegtermijn ingevuld/)).toBeInTheDocument()
  })

  it('zwijgt over een contract van een post die vóór die verlenging stopt', () => {
    // ⚠ Tweede nakijkronde van ronde 57: het belletje paste deze regel toe en de rij
    // niet. Wie december bekeek, las hier nog "beslissen vóór …" over een contract
    // dat sowieso eind december stopt, terwijl het belletje er terecht over zweeg.
    const stopt: TerugkerendePost = {
      ...huur,
      id: 'stopt',
      omschrijving: 'Alarm',
      contractsoort: 'energie',
      verlengtOp: '2026-08-10',
      eindMaand: '2026-08',
    }
    toon([stopt], '2026-07')
    expect(screen.queryByText(/verlengt/)).not.toBeInTheDocument()
  })

  it('zwijgt over het contract van een post die je al opgezegd hebt', () => {
    const gestopt: TerugkerendePost = {
      ...huur,
      id: 'gestopt',
      omschrijving: 'Fitness',
      contractsoort: 'abonnement',
      verlengtOp: '2027-01-15',
      eindMaand: '2026-06',
    }
    toon([gestopt], '2026-07')
    expect(screen.queryByText(/verlengt/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
describe('TerugkerendeSectie — het contractformulier', () => {
  function kiesEnergie() {
    toon([huur])
    openNieuw()
    fireEvent.change(screen.getByLabelText('Zit hier een contract achter? (optioneel)'), {
      target: { value: 'energie' },
    })
  }

  it('zegt met welke termijn ze zal rekenen, in maanden', () => {
    kiesEnergie()
    expect(screen.getByText(/De app rekent met de wettelijke 1 maand\(en\)/)).toBeInTheDocument()
  })

  it('laat een onleesbare opzegtermijn niet stil vallen', () => {
    // Uit de nakijkronde van ronde 57. Vroeger sloeg de app zo'n waarde gewoon niet
    // op en rekende ze verder met de wettelijke termijn — zonder dat er iets op het
    // scherm veranderde. Je dacht dus dat je 14 dagen had ingesteld.
    kiesEnergie()
    fireEvent.change(screen.getByLabelText('Je eigen opzegtermijn (optioneel)'), { target: { value: '3abc' } })
    expect(screen.getByText(/Vul een heel aantal maanden in, van 0 tot 24/)).toBeInTheDocument()
    expect(screen.getByText(/contractblok staat een getal dat de app niet kan gebruiken/)).toBeInTheDocument()
  })

  it('rekent wél met een geldige eigen termijn, in maanden', () => {
    // Maanden is het vertrekpunt, want zo staat het in een Belgisch contract.
    kiesEnergie()
    fireEvent.change(screen.getByLabelText('Je eigen opzegtermijn (optioneel)'), { target: { value: '3' } })
    expect(screen.getByText('De app rekent met jouw 3 maand(en).')).toBeInTheDocument()
  })

  it('kan ook in dagen, voor een contract dat het zo zegt', () => {
    kiesEnergie()
    fireEvent.change(screen.getByLabelText('Eenheid van de opzegtermijn'), { target: { value: 'dag' } })
    fireEvent.change(screen.getByLabelText('Je eigen opzegtermijn (optioneel)'), { target: { value: '14' } })
    expect(screen.getByText('De app rekent met jouw 14 dagen.')).toBeInTheDocument()
  })

  it('slaat de eigen termijn op in de eenheid die je koos', () => {
    // Meet wat er in de DATABASE belandt, niet alleen wat er op het scherm staat.
    // Precies hier zat het gevaar: het oude dagenveld mag niet blijven staan naast een
    // nieuw maandenveld, want dan zeggen twee velden iets anders.
    const onOpslaan = vi.fn()
    render(
      <TerugkerendeSectie
        posten={[]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    openNieuw()
    fireEvent.change(screen.getByLabelText('Omschrijving'), { target: { value: 'Autoverzekering' } })
    fireEvent.change(screen.getByLabelText('Bedrag (€)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Zit hier een contract achter? (optioneel)'), {
      target: { value: 'verzekering' },
    })
    fireEvent.change(screen.getByLabelText('Verlengt of loopt af op'), { target: { value: '2027-01-15' } })
    fireEvent.change(screen.getByLabelText('Je eigen opzegtermijn (optioneel)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Toevoegen' }))
    const bewaard = onOpslaan.mock.calls[0][0]
    expect(bewaard.opzegtermijnMaanden).toBe(3)
    expect('opzegtermijnDagen' in bewaard).toBe(false)
  })

  it('houdt de uitleg en het voorbehoud uit elkaar', () => {
    kiesEnergie()
    expect(screen.getByText('Let op:')).toBeInTheDocument()
  })
})

// --- Ronde 66, slotronde: zonder rekening geen formulier, maar wél je posten ---
describe('TerugkerendeSectie — een kost waar een spaardoel aan hangt (ronde 74)', () => {
  const doel = { id: 'd1', naam: 'Autoverzekering 2027', doelbedrag: 60000, huidigBedrag: 0, vasteLastId: 'prem' }

  function toonMetDoel(
    spaardoelen: { id: string; naam: string; doelbedrag: number; huidigBedrag: number; vasteLastId?: string; maandbedrag?: number }[],
  ) {
    render(
      <TerugkerendeSectie
        posten={[{ ...premie, opbouwen: true }]}
        spaardoelen={spaardoelen}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
  }

  it('zegt door welk doel de reservering loopt, met het bedrag waarmee Budget rekent', () => {
    // ⚠ Het bedrag wordt VERVANGEN, niet weggehaald: Budget reserveert nu € 75 in
    // plaats van de kale deling van € 100. Bleef hier het oude bedrag staan, dan zei
    // dit scherm iets anders dan Budget — over dezelfde kost, in dezelfde maand.
    toonMetDoel([{ ...doel, maandbedrag: 7500 }])
    expect(screen.getByText(/via je spaardoel Autoverzekering 2027/)).toBeInTheDocument()
    expect(screen.getByText(/75,00 per maand opzij/)).toBeInTheDocument()
    expect(screen.queryByText(/100,00 per maand opzij/)).toBeNull()
  })

  it('houdt de kale deling zolang het doel geen streefbedrag heeft', () => {
    // Zonder streefbedrag valt de app terug op wat er vóór de koppeling stond. Dan
    // verandert er niets aan het bedrag — alleen de zin erachter komt erbij.
    toonMetDoel([doel])
    expect(screen.getByText(/100,00 per maand opzij/)).toBeInTheDocument()
    expect(screen.getByText(/via je spaardoel/)).toBeInTheDocument()
  })

  it('vraagt gewoon om opzij te zetten zolang er geen doel aan hangt', () => {
    toonMetDoel([])
    expect(screen.getByText(/per maand opzij/)).toBeInTheDocument()
  })

  it('zegt in het bewerkvenster met welk bedrag je plan écht rekent', async () => {
    // ⚠ Onder het vinkje "Hier maandelijks voor opzijzetten" stond "je plan rekent op
    // € 100,00 opzij". Rekent Budget intussen met jouw streefbedrag van € 75, dan zei
    // dit venster iets anders dan het scherm eronder — over dezelfde kost.
    const gebruiker = userEvent.setup()
    toonMetDoel([{ ...doel, maandbedrag: 7500 }])
    await gebruiker.click(screen.getByRole('button', { name: knopnaam('Bewerken', premie) }))

    expect(screen.getByText(/rekent hiervoor met je spaardoel Autoverzekering 2027/)).toHaveTextContent(/75,00 per maand/)
  })

  it('laat een doel dat aan een ANDERE kost hangt met rust', () => {
    toonMetDoel([{ ...doel, vasteLastId: 'iets-anders' }])
    expect(screen.getByText(/per maand opzij/)).toBeInTheDocument()
  })
})

describe('TerugkerendeSectie — het formulier leest wat er staat (ronde 73)', () => {
  it('leest "12abc" NIET stil als 12', () => {
    // ⚠ `Number.parseInt` stopt bij het eerste teken dat geen cijfer is en zegt niets.
    // Ronde 71 vond dat verschil al eens: de aanvinklijst weigerde zo'n waarde, dit
    // formulier las er 12 van. Ronde 73 voegde de twee invulwegen samen tot dít
    // formulier, dus de losse regel zou anders stil gewonnen hebben.
    toon([huur])
    openNieuw()
    fireEvent.change(screen.getByLabelText('Omschrijving'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Bedrag (€)'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Dag van de maand'), { target: { value: '12abc' } })

    // ⚠ RONDE 98 — de knop heet in een venster gewoon "Toevoegen": de vensterkop zegt
    // al wat je aan het maken bent (regel van ronde 83).
    expect(screen.getByRole('button', { name: 'Toevoegen' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('laat een gewone dag gewoon door', () => {
    toon([huur])
    openNieuw()
    fireEvent.change(screen.getByLabelText('Omschrijving'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Bedrag (€)'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Dag van de maand'), { target: { value: '12' } })

    expect(screen.getByRole('button', { name: 'Toevoegen' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('waarschuwt bij een naam die al bestaat, zonder het opslaan te blokkeren', () => {
    // Ronde 71 had deze controle in het inline blok van "Je situatie"; die verdween met
    // dat blok. Nu staat ze in het formulier, dus ze geldt op élk scherm. Bewust een
    // waarschuwing: twee gezinsauto's met allebei "Autoverzekering" bestaan echt.
    toon([huur])
    openNieuw()
    fireEvent.change(screen.getByLabelText('Omschrijving'), { target: { value: 'Huur' } })
    fireEvent.change(screen.getByLabelText('Bedrag (€)'), { target: { value: '10' } })

    expect(screen.getByText(/al een vaste last die zo heet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toevoegen' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('waarschuwt niet tegen de post die je zelf aan het bewerken bent', () => {
    toon([huur])
    fireEvent.click(screen.getByRole('button', { name: knopnaam('Bewerken', huur) }))

    expect(screen.queryByText(/al een vaste last die zo heet/)).toBeNull()
  })
})

describe('TerugkerendeSectie — zonder rekening', () => {
  const huurpost: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'oud', dag: 3 }

  function toonZonderRekening() {
    render(
      <TerugkerendeSectie
        soort="uitgave"
        posten={[huurpost]}
        rekeningen={[]}
        categorieen={[]}
        transacties={[]}
        maand="2026-08"
        maandLabel="augustus 2026"
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
  }

  it('laat het formulier weg — het kon toch niet opgeslagen worden', () => {
    // ⚠ WAT HIER MIS WAS. Zonder rekening had de keuzelijst "Rekening" geen
    // enkele optie, bleef `rekeningId` leeg, en stond de opslaanknop dus voor altijd
    // uit — met als reden "Geef een naam en een geldig bedrag om op te slaan.", ook
    // nadat je naam én bedrag had ingevuld. Je zocht je blind naar iets wat je niet
    // kon zien. De weg naar een rekening staat één keer bovenaan het tabblad.
    toonZonderRekening()
    expect(screen.queryByLabelText('Omschrijving')).toBeNull()
    expect(screen.queryByRole('button', { name: knopnaam('Bewerken', huur) })).toBeNull()
  })

  it('houdt je bestaande posten wél zichtbaar en verwijderbaar', () => {
    // ⚠ Wie zijn laatste rekening archiveert, mag zijn twaalf vaste lasten niet
    // kwijtspelen: de teller op het tabblad telt ze nog, dus er moet een scherm zijn
    // waar je ze ziet staan. Alleen invullen en bewerken kan even niet.
    toonZonderRekening()
    expect(screen.getByText('Huur')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) })).toBeInTheDocument()
  })
})

// --- Ronde 66, slotronde: geen zin die naar een formulier wijst dat er niet is ---
describe('TerugkerendeSectie — de lege tekst volgt de knop', () => {
  function toonInkomsten(rekeningen: { id: string; naam: string; beginsaldo: number }[]) {
    render(
      <TerugkerendeSectie
        soort="inkomst"
        posten={[]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-08"
        maandLabel="augustus 2026"
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
  }

  it('wijst zonder rekening naar niets, want er staat dan ook geen knop', () => {
    toonInkomsten([])
    expect(screen.queryByText(/met de knop hierboven/)).toBeNull()
    expect(screen.getByText(/Zodra je een rekening hebt, vul je hier je loon in/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Een vaste inkomst' })).toBeNull()
  })

  it('wijst mét rekening naar de knop, en die staat er ook echt', () => {
    // ⚠ RONDE 98 — de zin zei "vul hieronder in" terwijl het formulier sinds deze ronde
    // BOVEN de lijst achter een knop zit. Een wegwijzer moet naar een plek wijzen die er
    // is (ronde 66); na de verbouwing wees deze naar een leegte.
    toonInkomsten(rekeningen)
    expect(screen.getByText(/met de knop hierboven/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Een vaste inkomst' })).toBeInTheDocument()
    // En het formulier staat er pas ná die knop.
    expect(screen.queryByLabelText('Omschrijving')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Ronde 76 — het kruisje vraagt eerst wat er aan de kost hangt
// ---------------------------------------------------------------------------
describe('TerugkerendeSectie — verwijderen vraagt wat eraan hangt', () => {
  const geboekt: Transactie = {
    id: 'tk-huur-2026-07',
    datum: '2026-07-03',
    omschrijving: 'Huur',
    bedrag: -95000,
    rekeningId: 'r1',
  }
  const doelVoorHuur: Spaardoel = {
    id: 'd1',
    naam: 'Huurpot',
    doelbedrag: 95000,
    huidigBedrag: 0,
    vasteLastId: 'huur',
  }

  function toonMet(over: {
    transacties?: Transactie[]
    spaardoelen?: Spaardoel[]
    onVerwijderen?: (id: string) => void
  } = {}) {
    const onVerwijderen = over.onVerwijderen ?? vi.fn()
    const r = render(
      <TerugkerendeSectie
        posten={[huur]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={over.transacties ?? []}
        spaardoelen={over.spaardoelen ?? []}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={onVerwijderen}
        onBoek={vi.fn()}
      />,
    )
    return { onVerwijderen, ...r }
  }

  it('wist METEEN wanneer er niets aan de kost hangt', async () => {
    // ⚠ Bewust geen venster in dit geval. Er valt niets te vertellen, en de
    // ongedaan-balk is het vangnet — precies zoals vóór deze ronde.
    const { onVerwijderen } = toonMet()
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onVerwijderen).toHaveBeenCalledWith('huur')
  })

  it('vraagt eerst wanneer er een ingeboekte betaling aan hangt', async () => {
    const { onVerwijderen } = toonMet({ transacties: [geboekt] })
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(onVerwijderen).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: /^Huur verwijderen\?/ })).toBeInTheDocument()
    expect(screen.getByText('1 boeking(en) die je hier inboekte')).toBeInTheDocument()
    expect(screen.getByText(/Ze blijven staan als gewone boeking/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ja, verwijder' }))
    expect(onVerwijderen).toHaveBeenCalledWith('huur')
  })

  it('vraagt eerst wanneer er een spaardoel aan hangt', async () => {
    const { onVerwijderen } = toonMet({ spaardoelen: [doelVoorHuur] })
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(onVerwijderen).not.toHaveBeenCalled()
    expect(screen.getByText('1 spaardoel(en) sparen hiervoor')).toBeInTheDocument()
  })

  it('telt een boeking die je zélf als deze kost aanduidde', async () => {
    toonMet({
      transacties: [
        { id: 'zelf', datum: '2026-07-03', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', vasteLastId: 'huur' },
      ],
    })
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(screen.getByText('1 boeking(en) waarvan je zei dat ze deze vaste last zijn')).toBeInTheDocument()
  })

  it('houdt de kost wanneer je "Nee, behouden" kiest', async () => {
    const { onVerwijderen } = toonMet({ transacties: [geboekt] })
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    await userEvent.click(screen.getByRole('button', { name: 'Nee, behouden' }))
    expect(onVerwijderen).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('brengt "Liever opzeggen" naar het bewerkformulier van diezelfde kost', async () => {
    // ⚠ Anders is het een knop die zichtbaar niets doet. Het formulier staat in
    // bewerkstand zodra er een "Annuleer" naast de opslaanknop verschijnt.
    const { onVerwijderen } = toonMet({ transacties: [geboekt] })
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    await userEvent.click(screen.getByRole('button', { name: 'Liever opzeggen' }))
    expect(onVerwijderen).not.toHaveBeenCalled()
    // ⚠ RONDE 98 — het verwijdervenster is weg, en het BEWERKvenster staat er in de
    // plaats. Allebei zijn het `role="dialog"`, dus "er is geen dialoog meer" zegt hier
    // niets: de test moet zeggen wélke.
    expect(screen.queryByRole('heading', { name: /^Huur verwijderen\?/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Vaste last bewerken' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Deze vaste last' })).toBeInTheDocument()
    expect(screen.getByLabelText('Omschrijving')).toHaveValue('Huur')
  })

  it('laat de focus niet naar <body> vallen wanneer de rij verdwijnt', async () => {
    // ⚠ Huisregel sinds ronde 73: een knop die zichzelf uit het scherm haalt, laat de
    // focus vallen — en dan sta je met je toetsenbord weer bovenaan de pagina.
    toonMet()
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.textContent).toBe('Vaste lasten')
  })
})

describe('TerugkerendeSectie — het venster in bewegende toestanden (ronde 76)', () => {
  const geboekt: Transactie = {
    id: 'tk-huur-2026-07',
    datum: '2026-07-03',
    omschrijving: 'Huur',
    bedrag: -95000,
    rekeningId: 'r1',
  }

  function schil(posten: TerugkerendePost[]) {
    return (
      <TerugkerendeSectie
        posten={posten}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[geboekt]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />
    )
  }

  it('sluit zichzelf wanneer de post intussen elders verdwenen is', async () => {
    // ⚠ De app haalt elke 45 seconden stil nieuwe gegevens op. Hield het venster
    // een KOPIE van de post vast, dan bleef het staan met een oude naam en gaf
    // "Ja, verwijder" zichtbaar niets — er is geen record meer om te herstellen, dus
    // ook geen ongedaan-balk.
    const { rerender } = render(schil([huur]))
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(screen.getByRole('heading', { name: /^Huur verwijderen\?/ })).toBeInTheDocument()

    rerender(schil([]))
    expect(screen.queryByRole('heading', { name: /^Huur verwijderen\?/ })).not.toBeInTheDocument()
  })

  it('volgt een naamswijziging die van een ander toestel binnenkomt', async () => {
    const { rerender } = render(schil([huur]))
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))

    rerender(schil([{ ...huur, omschrijving: 'Huur appartement' }]))
    expect(screen.getByRole('heading', { name: /^Huur appartement verwijderen\?/ })).toBeInTheDocument()
  })

  it('geeft de focus terug aan het kruisje na "Nee, behouden"', async () => {
    // ⚠ Dat is wat `Dialoog` belooft: de focus komt terug naar de knop waarmee je de
    // popup opende. Die knop staat er nog — er is immers niets gewist.
    render(schil([huur]))
    const kruisje = screen.getByRole('button', { name: knopnaam('Verwijderen', huur) })
    await userEvent.click(kruisje)
    await userEvent.click(screen.getByRole('button', { name: 'Nee, behouden' }))
    expect(document.activeElement).toBe(kruisje)
  })

  it('grijpt de cursor NIET bij het opbouwen van het scherm', () => {
    // ⚠ De teller staat bij het opbouwen op nul, en dan hoort het formulier niets aan
    // de focus te doen. Zonder die uitzondering sprong de cursor bij élke hertekening
    // naar het einddatumveld — midden in het invullen van een nieuwe kost.
    render(schil([huur]))
    // ⚠ RONDE 98 — bij het opbouwen staat het venster dicht, dus het veld bestaat nog
    // niet eens. Dat is een sterkere garantie dan "de focus staat er niet op", en het is
    // precies waarom deze test na de verbouwing anders moet meten.
    expect(screen.queryByLabelText('Loopt tot en met')).toBeNull()
    expect(document.activeElement).toBe(document.body)
  })

  it('sluit zichzelf wanneer de post naar de ándere lijst verhuist', async () => {
    // Van een vaste last een vaste inkomst maken (op een ander toestel) haalt de rij
    // uit déze sectie. Dan hoort het venster erover ook hier weg te zijn.
    const { rerender } = render(schil([huur]))
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    expect(screen.getByRole('heading', { name: /^Huur verwijderen\?/ })).toBeInTheDocument()

    rerender(schil([{ ...huur, bedrag: 95000 }]))
    expect(screen.queryByRole('heading', { name: /^Huur verwijderen\?/ })).not.toBeInTheDocument()
  })

  it('verzet de cursor NIET wanneer je gewoon op het potloodje klikt', async () => {
    // ⚠ De tegenhanger van de test hieronder: het formulier mag niet bij élke
    // bewerkbeurt naar het einddatumveld springen — alleen wanneer je erom vroeg.
    render(schil([huur]))
    const potlood = screen.getByRole('button', { name: knopnaam('Bewerken', huur) })
    await userEvent.click(potlood)
    expect(document.activeElement).not.toBe(screen.getByLabelText('Loopt tot en met'))
  })

  it('zet met "Liever opzeggen" de cursor in "Loopt tot en met"', async () => {
    // ⚠ Zonder dit gebeurde er zichtbaar niets: het formulier staat gewoon op de
    // pagina, soms tien vaste lasten naar beneden.
    render(schil([huur]))
    await userEvent.click(screen.getByRole('button', { name: knopnaam('Verwijderen', huur) }))
    await userEvent.click(screen.getByRole('button', { name: 'Liever opzeggen' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Loopt tot en met'))
  })
})


// --- Ronde 82: twee gelijknamige vaste lasten uit elkaar houden -----------------
//
// Ronde 73 koos bewust voor een waarschuwing in plaats van een blokkade bij een dubbele
// naam, dus twee posten die allebei "Autoverzekering" heten zijn uitdrukkelijk
// toegestaan. Ronde 73 gaf de knoppen op "Je situatie" daarom bedrag en dag mee; dit
// scherm was nooit meegegaan, en het punt stond sinds ronde 76 op de open lijst.

describe('TerugkerendeSectie — knopnamen bij gelijknamige posten (ronde 82)', () => {
  const auto: TerugkerendePost = {
    id: 'a',
    omschrijving: 'Autoverzekering',
    bedrag: -62000,
    rekeningId: 'r1',
    dag: 5,
    frequentie: 'jaar',
    startMaand: '2026-07',
  }
  const bestelwagen: TerugkerendePost = { ...auto, id: 'b', bedrag: -84000, dag: 12 }
  const paar = [auto, bestelwagen]

  it('geeft twee gelijknamige posten twee verschillende knopnamen', () => {
    toon(paar)
    // Twee knoppen met exact dezelfde naam zijn voor een schermlezer niet uit elkaar te
    // houden — dan wis je de verkeerde. `getByRole` in het ENKELVOUD doet hier het
    // eigenlijke werk: droegen ze dezelfde naam, dan gooit Testing Library
    // "found multiple elements".
    for (const actie of ['Bewerken', 'Verwijderen']) {
      expect(screen.getByRole('button', { name: knopnaam(actie, auto, paar) })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: knopnaam(actie, bestelwagen, paar) })).toBeInTheDocument()
    }
  })

  it('zet het bedrag en de dag in de knopnaam zodra dat nodig is', () => {
    toon(paar)
    const knop = screen.getByRole('button', { name: knopnaam('Verwijderen', auto, paar) })
    expect(knop.getAttribute('aria-label')).toContain('620')
    expect(knop.getAttribute('aria-label')).toContain('dag 5')
  })

  it('houdt de knopnaam KORT wanneer er niets te onderscheiden valt', () => {
    // Het gewone geval. Een schermlezer leest dit label bij élke knop op élke rij voor.
    toon([auto])
    const knop = screen.getByRole('button', { name: 'Verwijderen — Autoverzekering' })
    expect(knop.getAttribute('aria-label')).not.toContain('620')
  })

  it('zet de zichtbare tekst vooraan in de knopnaam (WCAG 2.5.3)', () => {
    toon([auto])
    const knop = screen.getByRole('button', { name: /^Boek in/ })
    expect(knop.getAttribute('aria-label')?.startsWith('Boek in')).toBe(true)
  })

  it('geeft élke knop op de rij een eigen naam — vijf keer, niet één', () => {
    // ⚠ Deze test bestaat omdat een mutatietest liet zien dat `Uitboeken`, `Losmaken`
    // en `Bewerken` nergens op hun toegankelijke naam getoetst werden: het `aria-label`
    // eraf halen bleef groen, want de tests zochten op een prefix die de zichtbare
    // tekst zelf ook levert.
    const een: TerugkerendePost = { id: 'x', omschrijving: 'Netflix', bedrag: -1600, rekeningId: 'r1', dag: 8 }
    const twee: TerugkerendePost = { ...een, id: 'y', bedrag: -2400, dag: 20 }
    toon([een, twee])
    const namen = screen
      .getAllByRole('button')
      .map((k) => k.getAttribute('aria-label'))
      .filter((n): n is string => n !== null && / — Netflix/.test(n))
    // Twee rijen × (Boek in, Bewerken, Verwijderen) = zes namen, allemaal verschillend.
    expect(namen).toHaveLength(6)
    expect(new Set(namen).size).toBe(6)
  })

  it('geeft ook "Uitboeken" en "Losmaken" een naam per rij', () => {
    // ⚠ Deze twee kwamen in geen enkele test op hun toegankelijke naam voor: het
    // `aria-label` weghalen bleef groen, want de tests zochten op een prefix die de
    // zichtbare tekst zelf ook levert. Gevonden met een mutatietest.
    const een: TerugkerendePost = { id: 'x', omschrijving: 'Netflix', bedrag: -1600, rekeningId: 'r1', dag: 8 }
    const twee: TerugkerendePost = { ...een, id: 'y', bedrag: -2400, dag: 20 }
    const boekingVan = (post: TerugkerendePost): Transactie => ({
      // Het vaste id van "Boek in" — dan biedt de rij "Uitboeken" aan.
      id: `tk-${post.id}-2026-07`,
      datum: `2026-07-0${post.dag === 8 ? '8' : '1'}`,
      omschrijving: post.omschrijving,
      bedrag: post.bedrag,
      rekeningId: 'r1',
    })
    render(
      <TerugkerendeSectie
        posten={[een, twee]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[boekingVan(een), boekingVan(twee)]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
        onOngedaan={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: knopnaam('Uitboeken', een, [een, twee]) })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: knopnaam('Uitboeken', twee, [een, twee]) })).toBeInTheDocument()
  })

  it('geeft "Losmaken" een naam per rij', () => {
    const een: TerugkerendePost = { id: 'x', omschrijving: 'Netflix', bedrag: -1600, rekeningId: 'r1', dag: 8 }
    const twee: TerugkerendePost = { ...een, id: 'y', bedrag: -2400, dag: 20 }
    // Een boeking die JIJ aanduidde als deze vaste last (ronde 64) — geen vast id, dus
    // de rij biedt "Losmaken" aan in plaats van "Uitboeken".
    const aangeduid = (post: TerugkerendePost, id: string): Transactie => ({
      id,
      datum: '2026-07-08',
      omschrijving: post.omschrijving,
      bedrag: post.bedrag,
      rekeningId: 'r1',
      vasteLastId: post.id,
    })
    render(
      <TerugkerendeSectie
        posten={[een, twee]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[aangeduid(een, 't1'), aangeduid(twee, 't2')]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
        onLosmaken={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: knopnaam('Losmaken', een, [een, twee]) })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: knopnaam('Losmaken', twee, [een, twee]) })).toBeInTheDocument()
  })

  it('noemt in het bevestigingsvenster wélke van de twee je wist', async () => {
    const user = userEvent.setup()
    const geboekt: Transactie = {
      id: 'tk-a-2026-07',
      datum: '2026-07-05',
      omschrijving: 'Autoverzekering',
      bedrag: -62000,
      rekeningId: 'r1',
    }
    render(
      <TerugkerendeSectie
        posten={paar}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[geboekt]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: knopnaam('Verwijderen', auto, paar) }))
    // ⚠ De KOP stelt de vraag en draagt geen gegevens — dezelfde vorm als de twee andere
    // verwijdervensters van de app. Het kenmerk staat in de body.
    expect(await screen.findByRole('heading', { name: 'Autoverzekering verwijderen?' })).toBeInTheDocument()
    const zin = await screen.findByText(/Het gaat over de vaste last van/)
    expect(zin.textContent).toContain('620')
    expect(zin.textContent).toContain('dag 5')
  })

  it('zegt niets extra in het venster wanneer de naam al ondubbelzinnig is', async () => {
    const user = userEvent.setup()
    const geboekt: Transactie = {
      id: 'tk-a-2026-07',
      datum: '2026-07-05',
      omschrijving: 'Autoverzekering',
      bedrag: -62000,
      rekeningId: 'r1',
    }
    render(
      <TerugkerendeSectie
        posten={[auto]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[geboekt]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: knopnaam('Verwijderen', auto) }))
    expect(await screen.findByRole('heading', { name: 'Autoverzekering verwijderen?' })).toBeInTheDocument()
    // ⚠ EERST VASTSTELLEN DAT DE BODY ER IS (doorlichting ronde 94). De kop alleen bewijst
    // niet dat de tekst eronder gerenderd is — en in een leeg venster ontbreekt élke zin,
    // dus ook de zin die hier niet mág staan. Deze zin staat in diezelfde body.
    expect(screen.getByText(/hangt/)).toBeInTheDocument()
    expect(screen.queryByText(/Het gaat over de vaste last van/)).toBeNull()
  })
})


// --- Ronde 83: de twee formulieren op Budget → Vast zijn uit elkaar te houden ----
//
// Op dat scherm staan twee `TerugkerendePostFormulier`'s onder elkaar, één per soort.
// Hun negen tot veertien velden heten allemaal hetzelfde. Een formulier met een NAAM is
// in HTML een landmark: een schermlezer kondigt het aan zodra je erin komt.

describe('TerugkerendeSectie — de velden heten gewoon bij hun naam (ronde 88)', () => {
  it('noemt ze zonder "vast" ervoor', () => {
    // ⚠ Tot ronde 88 heetten ze "Vaste omschrijving", "Vast bedrag (€)", "Vaste rekening"
    // en "Vaste categorie". Het voorvoegsel stond er om botsingen te vermijden — en deed
    // dat nooit waar het nodig was: op dít scherm droegen ALLEBEI de formulieren precies
    // dezelfde vier namen. Wat ze uit elkaar houdt, is de naam van het formulier.
    toon([huur])
    openNieuw()
    const form = screen.getByRole('form', { name: 'Nieuwe vaste last' })
    // ⚠ RONDE 98 — "Categorie" staat er niet meer als LABEL bij: dat veld is nu de
    // categoriekiezer met knoppen, en die draagt haar naam zelf ("Categorie:" met de
    // keuze ernaast) in plaats van via een `<label for>`. De drie andere blijven.
    for (const naam of ['Omschrijving', 'Bedrag (€)', 'Rekening']) {
      expect(within(form).getByLabelText(naam)).toBeInTheDocument()
    }
    expect(within(form).getByLabelText(/^Zoek een categorie of subcategorie/)).toBeInTheDocument()
  })

  it('laat het oude label nergens op het scherm staan', () => {
    // ⚠ OVER HET HELE SCHERM en niet binnen het formulier (doorlichting ronde 88). Binnen
    // het formulier kon deze regel niet falen: draai je één label terug, dan valt de lus
    // hierboven al om. Buiten het formulier vangt ze wél iets — een kaarttitel, een
    // bijschrift of een tweede formulier dat het oude woord terugbrengt.
    toon([huur])
    openNieuw()
    for (const oud of ['Vaste omschrijving', 'Vast bedrag (€)', 'Vaste rekening', 'Vaste categorie']) {
      expect(screen.queryByText(oud)).toBeNull()
    }
  })
})

describe('TerugkerendeSectie — welk formulier is dit? (ronde 83)', () => {
  it('geeft het formulier een naam die zegt waar je bent', () => {
    // ⚠ Een zelfstandig naamwoord, geen bevel: elke andere regio in de app heet
    // "Hoofdnavigatie", "Weergave" of "Wat wil je boeken?". Een schermlezer maakt
    // hiervan "Nieuwe vaste last, formulier".
    toon([huur])
    openNieuw()
    expect(screen.getByRole('form', { name: 'Nieuwe vaste last' })).toBeInTheDocument()
  })

  it('noemt een BEWERKformulier niet "nieuw"', async () => {
    // ⚠ Anders kondigt een schermlezer "nieuwe vaste last" aan boven een formulier
    // waarin je je bestaande huur zit te wijzigen — met een knop eronder die "Vaste
    // last wijzigen" heet.
    const user = userEvent.setup()
    toon([huur])
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', huur) }))
    expect(screen.getByRole('form', { name: 'Deze vaste last' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Nieuwe vaste last' })).toBeNull()
  })

  it('noemt het inkomstenformulier anders dan het lastenformulier', () => {
    render(
      <TerugkerendeSectie
        soort="inkomst"
        posten={[]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    openNieuw('+ Een vaste inkomst')
    expect(screen.getByRole('form', { name: 'Nieuwe vaste inkomst' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Nieuwe vaste last' })).toBeNull()
  })

  it('houdt een gelijknamige INKOMST en LAST op één scherm uit elkaar', () => {
    // ⚠ Kotgeld-"Huur" als inkomst naast je eigen "Huur" als last. De twee secties
    // staan onder elkaar op Budget → Vast, dus met alleen de posten van de eigen soort
    // heetten er twee knoppen allebei "Verwijderen — Huur". Gevonden door een
    // nakijkronde: ronde 82 redeneerde het op "Je situatie" al goed, maar gaf hier de
    // verkeerde lijst mee.
    const kotgeld: TerugkerendePost = { id: 'k', omschrijving: 'Huur', bedrag: 40000, rekeningId: 'r1', dag: 1 }
    const beide = [huur, kotgeld]
    render(
      <TerugkerendeSectie
        posten={beide}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    // Deze sectie toont alleen de LAST, maar haar knopnaam houdt rekening met de
    // inkomst die op hetzelfde scherm staat.
    const knop = screen.getByRole('button', { name: knopnaam('Verwijderen', huur, beide) })
    expect(knop.getAttribute('aria-label')).toContain('950')
  })

  it('zet de soort in de VENSTERKOP en houdt de knop kort', () => {
    // ⚠ RONDE 98 — tot deze ronde heette de knop zelf "Vaste last toevoegen", want er
    // was geen kop boven het formulier. Nu is er een venster, en dan herhaalt een knop
    // die kop niet (regel van ronde 83, precies zoals in de ➕-popup).
    toon([huur])
    openNieuw()
    expect(screen.getByRole('heading', { name: 'Vaste last toevoegen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toevoegen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /vaste post/i })).toBeNull()
  })

  it('noemt het bewerken van een vaste INKOMST ook zo', async () => {
    // ⚠ Deze test bestond niet: de knoptekst hard op "Vaste last wijzigen" zetten bleef
    // groen, want geen enkele test bewerkte een inkomst. Gevonden met een mutatietest.
    const user = userEvent.setup()
    const loon: TerugkerendePost = { id: 'l', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', dag: 25 }
    render(
      <TerugkerendeSectie
        soort="inkomst"
        posten={[loon]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', loon) }))
    expect(screen.getByRole('button', { name: 'Vaste inkomst wijzigen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vaste last wijzigen' })).toBeNull()
    expect(screen.getByRole('form', { name: 'Deze vaste inkomst' })).toBeInTheDocument()
  })

  it('heeft GEEN eigen "Annuleer" meer — het venster is de weg naar buiten', async () => {
    // ⚠ RONDE 98 — ronde 92 gaf deze knop een eigen naam per formulier, omdat er met
    // twee open bewerkformulieren twee keer exact "Annuleer" stond. Die situatie kan
    // niet meer bestaan: er staat er nog hoogstens één, en die zit in een venster met
    // een kruisje en Escape. Een derde knop met dezelfde uitwerking ernaast is precies
    // de fout die ronde 84 opschreef (twee knoppen die hetzelfde doen).
    const user = userEvent.setup()
    toon([huur])
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', huur) }))
    expect(screen.getByRole('form', { name: 'Deze vaste last' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Annuleer/ })).toBeNull()
    // En het kruisje sluit het wél.
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    expect(screen.queryByRole('form', { name: 'Deze vaste last' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Ronde 98 — twee groepen in één lijst, en één knop erboven
// ---------------------------------------------------------------------------
//
// ⚠ EEN SLUIPENDE LAST IS GEEN APART SOORT. Het is een vaste last die op een
// abonnementscategorie staat (of die je via een sluipend voorstel toevoegde). Vandaar
// één knop: twee knoppen zouden allebei precies hetzelfde record maken. Wat de groepen
// doen is uitsluitend TONEN.

const netflix: TerugkerendePost = {
  id: 'nf',
  omschrijving: 'Netflix',
  bedrag: -1599,
  rekeningId: 'r1',
  dag: 8,
  categorieId: 'i-streaming-video-5157',
}

describe('TerugkerendeSectie — twee groepen met elk hun totaal (ronde 98)', () => {
  it('zet de sluipende lasten in een eigen groep, apart van de grote posten', () => {
    toon([huur, netflix])
    const sluipend = screen.getByRole('list', { name: 'Je sluipende lasten' })
    const groot = screen.getByRole('list', { name: 'De grote posten' })
    expect(within(sluipend).getByText('Netflix')).toBeInTheDocument()
    expect(within(sluipend).queryByText('Huur')).toBeNull()
    expect(within(groot).getByText('Huur')).toBeInTheDocument()
  })

  it('zet er GEEN koppen boven zolang er niets sluipends is', () => {
    // ⚠ Een kop boven één groep onderscheidt niets, en "De grote posten" boven een
    // gewone lijst van vier vaste lasten is een woord dat niets toevoegt.
    toon([huur])
    expect(screen.queryByRole('list', { name: 'De grote posten' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Je sluipende lasten' })).toBeNull()
    expect(screen.getByText('Huur')).toBeInTheDocument()
  })

  it('geeft elke groep haar eigen totaal per maand', () => {
    toon([huur, netflix])
    // Huur € 950 en Netflix € 15,99, allebei maandelijks.
    expect(screen.getByText(/Samen € -950,00 per maand/)).toBeInTheDocument()
    expect(screen.getByText(/Samen € -15,99 per maand/)).toBeInTheDocument()
  })

  it('zegt erbij wanneer er iets NIET in het totaal zit', () => {
    // ⚠ Regel van ronde 69: elk getal zegt over welke verzameling het gaat. Zonder deze
    // zin lijkt het totaal te laag zodra er een opgezegde post in de lijst staat.
    const opgezegd: TerugkerendePost = { ...netflix, id: 'weg', omschrijving: 'Streamz', eindMaand: '2026-06' }
    toon([netflix, opgezegd], '2026-07')
    expect(screen.getByText(/tellen niet mee/)).toBeInTheDocument()
    // En het bedrag telt hem ook echt niet mee.
    expect(screen.getByText(/Samen € -15,99 per maand/)).toBeInTheDocument()
  })

  it('zwijgt over die uitzondering wanneer er niets uitgesloten wordt', () => {
    // ⚠ Een voorbehoud noemen zonder geval is ruis — en het is precies de fout die
    // ronde 81 opschreef: een zin over een toestand die niet kan voorkomen.
    toon([huur])
    expect(screen.queryByText(/tellen niet mee/)).toBeNull()
  })

  it('kent bij de INKOMSTEN maar één groep en dus geen koppen', () => {
    const loon: TerugkerendePost = { id: 'l', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', dag: 25 }
    render(
      <TerugkerendeSectie
        soort="inkomst"
        posten={[loon]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    expect(screen.queryByRole('list', { name: 'Je sluipende lasten' })).toBeNull()
    expect(screen.getByText(/Samen € 2.400,00 per maand/)).toBeInTheDocument()
  })
})

describe('TerugkerendeSectie — het venster (ronde 98)', () => {
  it('staat dicht tot je op de knop duwt', () => {
    toon([huur])
    expect(screen.queryByRole('form')).toBeNull()
    openNieuw()
    expect(screen.getByRole('form', { name: 'Nieuwe vaste last' })).toBeInTheDocument()
  })

  it('sluit zichzelf na een geslaagde opslag', async () => {
    const user = userEvent.setup()
    toon([huur])
    openNieuw()
    await user.type(screen.getByLabelText('Omschrijving'), 'Netflix')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(screen.queryByRole('form', { name: 'Nieuwe vaste last' })).toBeNull()
  })

  it('blijft open bij "Opslaan + volgende", met een leeg formulier', async () => {
    // Voor wie er drie na elkaar intikt. Zonder dit is elke volgende kost vier klikken.
    const user = userEvent.setup()
    toon([huur])
    openNieuw()
    await user.type(screen.getByLabelText('Omschrijving'), 'Netflix')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Opslaan + volgende' }))
    expect(screen.getByRole('form', { name: 'Nieuwe vaste last' })).toBeInTheDocument()
    expect(screen.getByLabelText('Omschrijving')).toHaveValue('')
  })

  it('opent "+ Een vaste last" schoon ná een bewerkbeurt', async () => {
    // ⚠ Het venster blijft in de boom staan zolang deze kaart er staat. Zonder een verse
    // `key` per opening hield het formulier de velden vast van de post die je daarnet
    // bewerkte, en opende "+ Een vaste last" met de huur van zonet erin.
    const user = userEvent.setup()
    toon([huur])
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', huur) }))
    expect(screen.getByLabelText('Omschrijving')).toHaveValue('Huur')
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    openNieuw()
    expect(screen.getByLabelText('Omschrijving')).toHaveValue('')
  })

  it('laat de knop weg zonder rekening — er valt dan niets in te vullen', () => {
    render(
      <TerugkerendeSectie
        posten={[huur]}
        rekeningen={[]}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: '+ Een vaste last' })).toBeNull()
    // De lijst blijft wél staan (regel van ronde 66).
    expect(screen.getByText('Huur')).toBeInTheDocument()
  })
})

describe('TerugkerendeSectie — de categoriekiezer met knoppen (ronde 98)', () => {
  it('kan een MIDDENcategorie kiezen en bewaart die ook echt', async () => {
    // ⚠ DIT IS DE METING DIE DE RONDE MOEST DOORSTAAN. In `CategorieNiveauKiezer` stond
    // te lezen dat deze kiezer "de middenlaag niet kent en altijd een item teruggeeft".
    // Zou dat waar zijn, dan kon een vaste last niet meer op "Elektriciteit" staan en
    // viel ze bij het inboeken uit elke analyse. Het klopt niet meer — en dat wordt hier
    // vastgelegd op de plek waar het ertoe doet: in het formulier zelf.
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <TerugkerendeSectie
        posten={[]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    openNieuw()
    await user.type(screen.getByLabelText('Omschrijving'), 'Elektriciteit')
    await user.type(screen.getByLabelText('Bedrag (€)'), '80')
    // Eerst de hoofdcategorie via de chiprij, dan de laag eronder.
    // ⚠ De naam draagt de toevoeging van ronde 92/95 erachter — "(vaste last)" — omdat
    // deze kiezer bovenop een ander scherm kan komen te liggen via de ➕-popup.
    await user.click(screen.getByRole('button', { name: /^Selecteer hoofdcategorie \(optioneel\)/ }))
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(screen.getByRole('button', { name: 'Broodwaren' }))
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan.mock.calls[0][0].categorieId).toBe('cat-broodwaren')
  })

  it('laat de categorie ook weer los, zonder de rest van het formulier te raken', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <TerugkerendeSectie
        posten={[]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    openNieuw()
    await user.type(screen.getByLabelText('Omschrijving'), 'Iets')
    await user.type(screen.getByLabelText('Bedrag (€)'), '10')
    // ⚠ De naam draagt de toevoeging van ronde 92/95 erachter — "(vaste last)" — omdat
    // deze kiezer bovenop een ander scherm kan komen te liggen via de ➕-popup.
    await user.click(screen.getByRole('button', { name: /^Selecteer hoofdcategorie \(optioneel\)/ }))
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(screen.getByRole('button', { name: 'opnieuw kiezen' }))
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    const bewaard = onOpslaan.mock.calls[0][0]
    expect('categorieId' in bewaard).toBe(false)
    expect(bewaard.omschrijving).toBe('Iets')
  })
})

// ---------------------------------------------------------------------------
// Ronde 98 — wat de twee doorlichtingen aanwezen
// ---------------------------------------------------------------------------

describe('TerugkerendeSectie — wat de doorlichting van ronde 98 vond', () => {
  it('zet de knop VÓÓR de zin die naar hem verwijst', async () => {
    // ⚠ De zin zegt "voeg je loon toe met de knop hierboven". In mijn eerste opzet stond
    // de knop erónder — letterlijk de fout die ronde 66 hier kwam weghalen ("vul hieronder
    // in" wees naar een leegte), nu omgekeerd. En dit is het állereerste scherm van een
    // verse app.
    //
    // ⚠ Gemeten op de VOLGORDE in het document, niet op "allebei bestaan ze". Een test
    // die alleen hun bestaan meet, blijft groen wanneer ze morgen weer omdraaien.
    render(
      <TerugkerendeSectie
        soort="inkomst"
        posten={[]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-08"
        maandLabel="augustus 2026"
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    const knop = screen.getByRole('button', { name: '+ Een vaste inkomst' })
    const zin = screen.getByText(/met de knop hierboven/)
    // Node.compareDocumentPosition: 4 = 'volgt op'.
    expect(knop.compareDocumentPosition(zin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('houdt je invoer vast wanneer de post intussen elders verdwijnt', async () => {
    // ⚠ DE ZWAARSTE VONDST VAN DE DOORLICHTING. De app haalt elke 45 seconden stil nieuwe
    // gegevens op. Verdween de post die je aan het bewerken was, dan viel het venster weg
    // mét je halve zin, zonder één woord — terwijl het oude inline formulier een kopie
    // vasthield en dus gewoon bleef staan. De huisregel is hard: een mislukte opslag mag
    // de gebruiker nooit zijn invoer kosten.
    const user = userEvent.setup()
    const props = {
      rekeningen,
      categorieen: [],
      transacties: [],
      maand: '2026-07',
      maandLabel: 'juli 2026',
      vandaagISO: VANDAAG,
      onOpslaan: vi.fn(),
      onVerwijderen: vi.fn(),
      onBoek: vi.fn(),
    }
    const { rerender } = render(<TerugkerendeSectie posten={[huur]} {...props} />)
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', huur) }))
    const veld = screen.getByLabelText('Omschrijving')
    await user.clear(veld)
    await user.type(veld, 'Huur nieuw')

    // Een ander toestel wist de post.
    rerender(<TerugkerendeSectie posten={[]} {...props} />)

    expect(screen.getByRole('form', { name: 'Deze vaste last' })).toBeInTheDocument()
    expect(screen.getByLabelText('Omschrijving')).toHaveValue('Huur nieuw')
  })

  it('opent het venster niet vanzelf opnieuw wanneer de post terugkomt', async () => {
    // ⚠ De tweede helft van dezelfde vondst: met de eerste opzet sloot het venster bij het
    // verdwijnen en sprong het vanzelf wéér open zodra de post terugkwam (een
    // ongedaan-balk, of een synchronisatie) — een modaal venster uit het niets. Het gaat
    // nu niet meer dicht, dus dat kan ook niet meer.
    const user = userEvent.setup()
    const props = {
      rekeningen,
      categorieen: [],
      transacties: [],
      maand: '2026-07',
      maandLabel: 'juli 2026',
      vandaagISO: VANDAAG,
      onOpslaan: vi.fn(),
      onVerwijderen: vi.fn(),
      onBoek: vi.fn(),
    }
    const { rerender } = render(<TerugkerendeSectie posten={[huur]} {...props} />)
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', huur) }))
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    expect(screen.queryByRole('form')).toBeNull()

    rerender(<TerugkerendeSectie posten={[]} {...props} />)
    rerender(<TerugkerendeSectie posten={[huur]} {...props} />)
    expect(screen.queryByRole('form')).toBeNull()
  })

  it('zet GEEN kop boven één groep, ook niet wanneer alles sluipend is', () => {
    // ⚠ Mijn eerste opzet hing die voorwaarde alleen aan de eerste groep. Wie uitsluitend
    // abonnementen heeft, kreeg dan in een kaart met de titel "Vaste lasten" één lijst met
    // de kop "Je sluipende lasten" — een kop die niets onderscheidt.
    toon([netflix])
    expect(screen.queryByRole('list', { name: 'Je sluipende lasten' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'De grote posten' })).toBeNull()
    expect(screen.getByText('Netflix')).toBeInTheDocument()
  })

  it('noemt alleen de uitzondering die er ECHT is', () => {
    // ⚠ De zin noemde er twee zodra er één van toepassing was. Wie alleen een opgezegd
    // abonnement had, las tóch iets over "posten die nog niet begonnen zijn".
    const opgezegd: TerugkerendePost = { ...netflix, id: 'weg', omschrijving: 'Streamz', eindMaand: '2026-06' }
    toon([netflix, opgezegd], '2026-07')
    expect(screen.getByText(/gestopte posten tellen niet mee/)).toBeInTheDocument()
    expect(screen.queryByText(/nog niet begonnen/)).toBeNull()
  })

  it('noemt de andere uitzondering wanneer díé er is', () => {
    const later: TerugkerendePost = {
      id: 'later',
      omschrijving: 'Domeinnaam',
      bedrag: -6000,
      rekeningId: 'r1',
      dag: 1,
      frequentie: 'jaar',
      startMaand: '2027-03',
      categorieId: 'i-streaming-video-5157',
    }
    toon([netflix, later], '2026-07')
    expect(screen.getByText(/posten die nog niet begonnen zijn, tellen niet mee/)).toBeInTheDocument()
    expect(screen.queryByText(/gestopte posten tellen niet mee/)).toBeNull()
  })

  it('zet helemaal geen totaal onder een lege lijst', () => {
    // ⚠ Een groep zonder posten wordt weggefilterd. Zonder die filter stond er "Samen
    // € 0,00 per maand" onder een kaart waarin niets staat.
    toon([])
    expect(screen.queryByText(/Samen .* per maand/)).toBeNull()
  })

  it('houdt de bestaande categorie vast bij het BEWERKEN van een post', async () => {
    // ⚠ De twee andere kiezer-tests gaan allebei over een NIEUWE post. De wissel van
    // keuzelijst naar chiprij is juist waar een bewerkbeurt stil kan breken: als de kiezer
    // de opgeslagen waarde niet toont, wist een gewone bedragwijziging je categorie.
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <TerugkerendeSectie
        posten={[{ ...huur, categorieId: 'cat-broodwaren' }]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
        onBoek={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: knopnaam('Bewerken', { ...huur, categorieId: 'cat-broodwaren' }) }))
    // De kiezer toont waar de post hangt — op de plek waar ze de KEUZE noemt, en niet
    // in de chiprij eronder (daar staat "Broodwaren" ook als knop).
    expect(screen.getByText('Categorie:').parentElement).toHaveTextContent('Broodwaren')
    // …en een wijziging aan een ander veld laat de categorie staan.
    const bedrag = screen.getByLabelText('Bedrag (€)')
    await user.clear(bedrag)
    await user.type(bedrag, '1000')
    await user.click(screen.getByRole('button', { name: 'Vaste last wijzigen' }))
    expect(onOpslaan.mock.calls[0][0].categorieId).toBe('cat-broodwaren')
  })

  it('zegt bij het zoekveld van de kiezer om welk formulier het gaat', async () => {
    // ⚠ De ronde-92-test die dit uitrekende is met het oude blok verdwenen, en wat ervoor
    // in de plaats kwam gebruikt een prefix-regex die precies vóór de toevoeging stopt.
    // Haal de prop weg en alles bleef groen — terwijl dit de enige regel is die bewaakt
    // dat de ➕-popup geen tweede "Zoek een categorie of subcategorie" op het scherm zet.
    toon([huur])
    openNieuw()
    expect(screen.getByLabelText('Zoek een categorie of subcategorie (vaste last)')).toBeInTheDocument()
  })

  it('wist een oude foutmelding vóór het venster opengaat', async () => {
    // ⚠ Regel uit de tweede doorlichting van ronde 68: een melding van een vorige poging
    // hoort niet achter een vers venster te blijven staan.
    const user = userEvent.setup()
    render(
      <TerugkerendeSectie
        posten={[huur]}
        rekeningen={rekeningen}
        categorieen={[]}
        transacties={[]}
        maand="2026-07"
        maandLabel="juli 2026"
        vandaagISO={VANDAAG}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
        onBoek={() => {
          throw new Error('stuk')
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^Boek in/ }))
    expect(await screen.findByText(/Dat is niet gelukt/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ Een vaste last' }))
    expect(screen.queryByText(/Dat is niet gelukt/)).toBeNull()
  })
})
