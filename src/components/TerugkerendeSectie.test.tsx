import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TerugkerendeSectie } from './TerugkerendeSectie'
import type { TerugkerendePost } from '../data/schema'

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

describe('TerugkerendeSectie — andere termijnen', () => {
  it('biedt "Boek in" aan voor een maandelijkse post', () => {
    toon([huur])
    expect(screen.getByRole('button', { name: 'Boek in' })).toBeInTheDocument()
  })

  it('biedt geen "Boek in" aan in een maand waarin de post niet vervalt', () => {
    // Halfjaarlijks vanaf augustus: in juli valt er niets te boeken. Zonder deze
    // regel zou je dezelfde jaarpremie twaalf keer kunnen inboeken.
    toon([premie], '2026-07')
    expect(screen.queryByRole('button', { name: 'Boek in' })).not.toBeInTheDocument()
    expect(screen.getByText('Niet deze maand')).toBeInTheDocument()
  })

  it('biedt "Boek in" wél aan in de vervalmaand', () => {
    toon([premie], '2026-08')
    expect(screen.getByRole('button', { name: 'Boek in' })).toBeInTheDocument()
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
    fireEvent.change(screen.getByLabelText('Vaste omschrijving'), { target: { value: 'Autoverzekering' } })
    fireEvent.change(screen.getByLabelText('Vast bedrag (€)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Zit hier een contract achter? (optioneel)'), {
      target: { value: 'verzekering' },
    })
    fireEvent.change(screen.getByLabelText('Verlengt of loopt af op'), { target: { value: '2027-01-15' } })
    fireEvent.change(screen.getByLabelText('Je eigen opzegtermijn (optioneel)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Vaste post toevoegen' }))
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
    await gebruiker.click(screen.getByRole('button', { name: /Bewerk vaste post Autoverzekering/ }))

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
    fireEvent.change(screen.getByLabelText('Vaste omschrijving'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Vast bedrag (€)'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Dag van de maand'), { target: { value: '12abc' } })

    expect(screen.getByRole('button', { name: 'Vaste post toevoegen' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('laat een gewone dag gewoon door', () => {
    toon([huur])
    fireEvent.change(screen.getByLabelText('Vaste omschrijving'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Vast bedrag (€)'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Dag van de maand'), { target: { value: '12' } })

    expect(screen.getByRole('button', { name: 'Vaste post toevoegen' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('waarschuwt bij een naam die al bestaat, zonder het opslaan te blokkeren', () => {
    // Ronde 71 had deze controle in het inline blok van "Je situatie"; die verdween met
    // dat blok. Nu staat ze in het formulier, dus ze geldt op élk scherm. Bewust een
    // waarschuwing: twee gezinsauto's met allebei "Autoverzekering" bestaan echt.
    toon([huur])
    fireEvent.change(screen.getByLabelText('Vaste omschrijving'), { target: { value: 'Huur' } })
    fireEvent.change(screen.getByLabelText('Vast bedrag (€)'), { target: { value: '10' } })

    expect(screen.getByText(/al een vaste last die zo heet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vaste post toevoegen' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('waarschuwt niet tegen de post die je zelf aan het bewerken bent', () => {
    toon([huur])
    fireEvent.click(screen.getByRole('button', { name: /Bewerk vaste post Huur/ }))

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
    // ⚠ WAT HIER MIS WAS. Zonder rekening had de keuzelijst "Vaste rekening" geen
    // enkele optie, bleef `rekeningId` leeg, en stond de opslaanknop dus voor altijd
    // uit — met als reden "Geef een naam en een geldig bedrag om op te slaan.", ook
    // nadat je naam én bedrag had ingevuld. Je zocht je blind naar iets wat je niet
    // kon zien. De weg naar een rekening staat één keer bovenaan het tabblad.
    toonZonderRekening()
    expect(screen.queryByLabelText('Vaste omschrijving')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Bewerk vaste post Huur' })).toBeNull()
  })

  it('houdt je bestaande posten wél zichtbaar en verwijderbaar', () => {
    // ⚠ Wie zijn laatste rekening archiveert, mag zijn twaalf vaste lasten niet
    // kwijtspelen: de teller op het tabblad telt ze nog, dus er moet een scherm zijn
    // waar je ze ziet staan. Alleen invullen en bewerken kan even niet.
    toonZonderRekening()
    expect(screen.getByText('Huur')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verwijder vaste post Huur' })).toBeInTheDocument()
  })
})

// --- Ronde 66, slotronde: geen zin die naar een formulier wijst dat er niet is ---
describe('TerugkerendeSectie — de lege tekst volgt het formulier', () => {
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

  it('zegt "hieronder" alleen wanneer daar ook echt een formulier staat', () => {
    toonInkomsten([])
    expect(screen.queryByText(/Vul hieronder je loon in/)).toBeNull()
    expect(screen.getByText(/Zodra je een rekening hebt, vul je hier je loon in/)).toBeInTheDocument()
  })

  it('wijst mét rekening wél naar het formulier eronder', () => {
    toonInkomsten(rekeningen)
    expect(screen.getByText(/Vul hieronder je loon in/)).toBeInTheDocument()
    expect(screen.getByLabelText('Vaste omschrijving')).toBeInTheDocument()
  })
})
