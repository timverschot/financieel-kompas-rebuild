import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { zetSchermbreedte, herstelSchermbreedte } from '../test/schermbreedte'
import { SpaardoelSectie } from './SpaardoelSectie'
import type { Overboeking, Rekening, Spaardoel, TerugkerendePost, Transactie } from '../data/schema'
import { vandaag } from '../utils/datum'
import { voegMaandenToe } from '../utils/rekenhulp'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

describe('SpaardoelSectie', () => {
  it('voegt een manueel spaardoel toe met bedragen in centen', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Buffer')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '3000')
    await user.type(screen.getByLabelText('Huidig bedrag (€)'), '1500')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }),
    )
  })

  it('zet de lijst vóór het formulier in de leesvolgorde', () => {
    // ⚠ Ronde 61. Tot die ronde stond de formulierkolom EERST in de code en zette een
    // CSS-regel (`order`) haar op een smal scherm naar onderen. Wat je ZAG klopte dus,
    // maar de tab-toets en een schermlezer volgen de code: je zag bovenaan je lijst
    // spaardoelen, maar Tab landde eerst in "Nieuw spaardoel · naam · bedrag · kleur".
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )
    const lijst = document.querySelector('.kolom-lijst') as HTMLElement
    const formulier = document.querySelector('.kolom-formulier') as HTMLElement
    expect(lijst).toBeInTheDocument()
    expect(formulier).toBeInTheDocument()
    expect(lijst.compareDocumentPosition(formulier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('toont een voortgangsbalk voor een bestaand doel', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }
    render(
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )
    expect(screen.getByRole('progressbar', { name: 'Buffer' })).toBeInTheDocument()
  })

  it('toont het gekozen icoon, en anders de beginletter van het doel', () => {
    const metIcoon: Spaardoel = { id: 'd1', naam: 'Reis', doelbedrag: 100000, huidigBedrag: 0, icoon: '\u2708\ufe0f' }
    const zonder: Spaardoel = { id: 'd2', naam: 'Buffer', doelbedrag: 100000, huidigBedrag: 0 }
    const { container } = render(
      <SpaardoelSectie
        spaardoelen={[metIcoon, zonder]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    // Scopen op de lijst: de icoonkiezer in het formulier bevat dezelfde emoji.
    const tekens = [...container.querySelectorAll('.lijst .rij-teken')].map((e) => e.textContent)
    expect(tekens).toEqual(['\u2708\ufe0f', 'B'])
  })

  it('laat een icoon en een kleur kiezen bij een nieuw doel', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Reis')
    await user.type(screen.getByLabelText('Doelbedrag (\u20ac)'), '2000')
    await user.click(screen.getByRole('button', { name: 'Kies icoon Reizen' }))
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Reis', icoon: expect.any(String) }),
    )
  })

  it('opent een doel in het formulier wanneer je de regel aanklikt', async () => {
    const user = userEvent.setup()
    const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }
    render(
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )

    // Vooraf staat het formulier klaar voor een NIEUW doel.
    expect(screen.getByRole('button', { name: 'Doel toevoegen' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bewerk doel Buffer' }))

    // Nu staat het doel in het formulier en verandert de knop mee.
    expect(screen.getByLabelText('Doelnaam')).toHaveValue('Buffer')
    expect(screen.getByRole('button', { name: 'Doel wijzigen' })).toBeInTheDocument()
  })

  it('zet lijst en formulier naast elkaar op desktop', () => {
    zetSchermbreedte(1440)
    try {
      const { container } = render(
        <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
      )
      const raster = container.querySelector('.raster-lijst-formulier')
      expect(raster).not.toBeNull()
      expect(raster?.querySelector('.kolom-formulier')).not.toBeNull()
      expect(raster?.querySelector('.kolom-lijst')).not.toBeNull()
    } finally {
      herstelSchermbreedte()
    }
  })
})

// Ronde 18: elk doel zegt nu zelf of je het haalt.
describe('SpaardoelSectie — haal ik het?', () => {
  const spaarRekeningen: Rekening[] = [{ id: 'sp', naam: 'Spaar', beginsaldo: 0, type: 'spaar' }]

  function toonDoel(doel: Spaardoel, transacties: Transactie[] = [], overboekingen: Overboeking[] = []) {
    render(
      <SpaardoelSectie
        spaardoelen={[doel]}
        rekeningen={spaarRekeningen}
        transacties={transacties}
        waarderingen={[]}
        overboekingen={overboekingen}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
  }

  it('legt uit wat er ontbreekt bij een doel zonder datum en zonder tempo', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0 })
    expect(screen.getByText('Koppel een rekening of zet een doeldatum om te zien of je op schema zit.')).toBeInTheDocument()
  })

  it('meldt een bereikt doel', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 600000 })
    expect(screen.getByText('Doel gehaald')).toBeInTheDocument()
  })

  // De doeldatum wordt uit de dag van vandaag afgeleid, zodat de test niet
  // vastzit aan de maand waarin ze gedraaid wordt.
  const overDrieMaanden = voegMaandenToe(vandaag(), 3)

  it('zegt bij een streefbedrag dat te laag is dat je achterloopt', () => {
    // € 6.000 te gaan in ongeveer drie maanden: dat is zo'n € 2.000 per maand.
    // Met een streefbedrag van € 10 per maand haal je dat nooit.
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: overDrieMaanden, maandbedrag: 1000 })
    expect(screen.getByText('Achter op schema')).toBeInTheDocument()
    expect(screen.getByText(/jouw streefbedrag: € 10,00/)).toBeInTheDocument()
  })

  it('meldt "Op schema" wanneer het streefbedrag volstaat', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: overDrieMaanden, maandbedrag: 500000 })
    expect(screen.getByText('Op schema')).toBeInTheDocument()
  })

  it('waarschuwt wanneer de doeldatum verstreken is', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 10000, doeldatum: '2020-01-01' })
    expect(screen.getByText('Datum voorbij')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Ronde 68 — de sectie mag de fout van het FORMULIER niet opvangen.
//
// ⚠ Dit ging in deze ronde eerst mis en is door de doorlichting gevonden: de sectie
// ving de mislukking op, het formulier zag daardoor "gelukt", maakte zichzelf leeg,
// en je invoer was tóch weg — mét een melding erbij. Precies de fout die deze ronde
// moest uitroeien.
// ---------------------------------------------------------------------------
describe('SpaardoelSectie — een mislukte opslag van het formulier', () => {
  it('laat de mislukking dóór naar het formulier, dat je invoer vasthoudt', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn().mockRejectedValue(new Error('geweigerd'))
    render(
      <SpaardoelSectie
        spaardoelen={[]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        overboekingen={[]}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Buffer')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '3000')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalled()
    // De velden staan er nog: leegmaken hoort ná een GESLAAGDE opslag.
    expect((screen.getByLabelText('Doelnaam') as HTMLInputElement).value).toBe('Buffer')
    expect((screen.getByLabelText('Doelbedrag (€)') as HTMLInputElement).value).toBe('3000')
    expect(await screen.findByRole('alert')).toHaveTextContent('Je invoer staat er nog')
  })
})


// ---------------------------------------------------------------------------
// Ronde 69 — elk getal verantwoordt zich.
//
// Het bedrag links van "van € X" is bij een doel MET gekoppelde rekening het
// VOLLEDIGE saldo van die rekening, zoals het vandaag staat. Dat is bruikbaar zolang die rekening één doel dient, maar wie twee
// doelen aan dezelfde spaarrekening hangt, ziet hetzelfde geld twee keer als
// voortgang staan — en dan lijken allebei de doelen bijna gehaald terwijl er maar
// één keer geld is. Het cijfer zwijgt daarover, dus moet het scherm het zeggen.
// ---------------------------------------------------------------------------
describe('SpaardoelSectie — waar het gespaarde bedrag vandaan komt', () => {
  const spaarRekeningen: Rekening[] = [
    { id: 'sp', naam: 'Spaar', beginsaldo: 200000, type: 'spaar' },
    { id: 'sp2', naam: 'Tweede spaarpot', beginsaldo: 100000, type: 'spaar' },
  ]

  function toonDoelen(doelen: Spaardoel[]) {
    render(
      <SpaardoelSectie
        spaardoelen={doelen}
        rekeningen={spaarRekeningen}
        transacties={[]}
        waarderingen={[]}
        overboekingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
  }

  // De bronregels van de doelenlijst; scopen op `.lijst` omdat het formulier
  // ernaast zijn eigen uitlegregels kan hebben.
  const bronnen = () => [...document.querySelectorAll('.lijst .getal-bron')].map((el) => el.textContent ?? '')

  it('noemt de rekening waarvan het volledige saldo geteld wordt', () => {
    toonDoelen([{ id: 'd1', naam: 'Buffer', doelbedrag: 600000, huidigBedrag: 0, gekoppeldeRekeningId: 'sp' }])
    expect(bronnen()).toHaveLength(1)
    expect(bronnen()[0]).toContain('Het eerste bedrag hierboven is het volledige saldo van Spaar zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.')
    // Er hangt maar één doel aan die rekening, dus telt er niets dubbel en hoort
    // die waarschuwing er niet te staan.
    expect(bronnen()[0]).not.toContain('diezelfde rekening')
  })

  it('waarschuwt bij elk doel dat hetzelfde geld deelt met een ander doel', () => {
    // ⚠ Dit is de fout die de zin moet vangen: twee doelen aan dezelfde
    // spaarrekening tellen allebei het VOLLEDIGE saldo mee. Zonder de zin lijken
    // allebei de doelen halverwege, terwijl het geld er maar één keer is.
    toonDoelen([
      { id: 'd1', naam: 'Buffer', doelbedrag: 600000, huidigBedrag: 0, gekoppeldeRekeningId: 'sp' },
      { id: 'd2', naam: 'Reis', doelbedrag: 400000, huidigBedrag: 0, gekoppeldeRekeningId: 'sp' },
    ])
    const regels = bronnen()
    expect(regels).toHaveLength(2)
    for (const regel of regels) {
      expect(regel).toContain('Het eerste bedrag hierboven is het volledige saldo van Spaar zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.')
      expect(regel).toContain('Er hangt nog een doel aan diezelfde rekening: hetzelfde geld telt bij allebei mee.')
    }
  })

  it('telt alleen de doelen op DEZELFDE rekening mee in die waarschuwing', () => {
    // Een doel op een andere spaarpot deelt niets, dus mag het de telling niet
    // opblazen — anders waarschuwt de app over geld dat helemaal niet dubbel telt.
    toonDoelen([
      { id: 'd1', naam: 'Buffer', doelbedrag: 600000, huidigBedrag: 0, gekoppeldeRekeningId: 'sp' },
      { id: 'd2', naam: 'Reis', doelbedrag: 400000, huidigBedrag: 0, gekoppeldeRekeningId: 'sp2' },
    ])
    const regels = bronnen()
    expect(regels).toHaveLength(2)
    expect(regels[0]).toContain('Het eerste bedrag hierboven is het volledige saldo van Spaar zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.')
    expect(regels[1]).toContain('Het eerste bedrag hierboven is het volledige saldo van Tweede spaarpot zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.')
    for (const regel of regels) {
      expect(regel).not.toContain('diezelfde rekening')
    }
  })

  it('zwijgt bij een doel waarvan je het bedrag zelf bijhoudt', () => {
    // Zonder gekoppelde rekening komt "Al gespaard" uit je eigen invoer; er is dan
    // geen saldo waarnaar te verwijzen valt en niets dat dubbel kan tellen.
    toonDoelen([{ id: 'd1', naam: 'Buffer', doelbedrag: 600000, huidigBedrag: 150000 }])
    expect(document.querySelectorAll('.lijst .getal-bron')).toHaveLength(0)
  })
})


// ---------------------------------------------------------------------------
// Ronde 74 — het doel weet welke vaste last het dient
// ---------------------------------------------------------------------------

const premie: TerugkerendePost = {
  id: 'vl1',
  omschrijving: 'Autoverzekering',
  bedrag: -62000,
  rekeningId: 'r1',
  dag: 5,
  frequentie: 'jaar',
  startMaand: '2099-03',
  opbouwen: true,
}

const huur: TerugkerendePost = { id: 'vl2', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }

function toonMetLasten(spaardoelen: Spaardoel[], vasteLasten: TerugkerendePost[] = [premie, huur]) {
  render(
    <SpaardoelSectie
      spaardoelen={spaardoelen}
      vasteLasten={vasteLasten}
      rekeningen={rekeningen}
      transacties={[]}
      waarderingen={[]}
      onOpslaan={vi.fn()}
      onVerwijderen={vi.fn()}
    />,
  )
}

describe('SpaardoelSectie — waarvoor spaar je?', () => {
  it('biedt alleen de kosten aan waar sparen zin heeft', () => {
    // Een maandelijkse kost betaal je uit het loon van diezelfde maand; daar vooraf
    // voor sparen is een pot die elke maand weer leeg is.
    toonMetLasten([])
    const keuze = screen.getByLabelText('Waarvoor spaar je? (optioneel)')
    const namen = [...keuze.querySelectorAll('option')].map((o) => o.textContent)
    expect(namen).toContain('Autoverzekering')
    expect(namen).not.toContain('Huur')
  })

  it('toont het veld helemaal niet zonder spaarbare kosten', () => {
    // Een keuzelijst met alleen "Voor niets in het bijzonder" erin stelt een vraag
    // die niemand kan beantwoorden.
    toonMetLasten([], [huur])
    expect(screen.queryByLabelText('Waarvoor spaar je? (optioneel)')).toBeNull()
  })

  it('vult de lege velden in zodra je een vaste last kiest', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')

    expect(screen.getByLabelText('Doelnaam')).toHaveValue('Autoverzekering')
    expect(screen.getByLabelText('Doelbedrag (€)')).toHaveValue('620,00')
    expect(screen.getByLabelText('Doeldatum (optioneel)')).toHaveValue('2099-03-05')
  })

  it('overschrijft NIET wat je zelf al ingetikt hebt', async () => {
    // ⚠ Een keuzelijst die je bedrag vervangt is precies de fout die ronde 62 kostte.
    const user = userEvent.setup()
    toonMetLasten([])
    await user.type(screen.getByLabelText('Doelnaam'), 'Mijn eigen naam')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '1000')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')

    expect(screen.getByLabelText('Doelnaam')).toHaveValue('Mijn eigen naam')
    expect(screen.getByLabelText('Doelbedrag (€)')).toHaveValue('1000')
  })

  it('schrijft de koppeling mee weg', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie
        spaardoelen={[]}
        vasteLasten={[premie]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
      />,
    )
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ vasteLastId: 'vl1', doelbedrag: 62000 }))
  })
})

describe('SpaardoelSectie — wat de koppeling op de lijst zegt', () => {
  const doel = (over: Partial<Spaardoel> = {}): Spaardoel => ({
    id: 'd1',
    naam: 'Autoverzekering 2099',
    doelbedrag: 62000,
    huidigBedrag: 10000,
    vasteLastId: 'vl1',
    ...over,
  })

  it('zegt voor welke kost je spaart en wanneer die valt', () => {
    // ⚠ Deze regel MAG NIET ONTBREKEN: het doel haalt die kost weg uit "Opzij voor
    // later" op Budget. Wie dat bedrag daar ziet verdwijnen zonder dat hier iets
    // staat, ziet een app die uit zichzelf getallen verandert.
    toonMetLasten([doel()])
    expect(screen.getByText(/Voor Autoverzekering, de volgende keer op/)).toBeInTheDocument()
  })

  it('merkt op dat je doelbedrag iets anders zegt dan de kost', () => {
    toonMetLasten([doel({ doelbedrag: 68000 })])
    expect(screen.getByText(/doelbedrag staat op iets anders/)).toBeInTheDocument()
  })

  it('zwijgt over het bedrag wanneer de twee gelijk zijn', () => {
    toonMetLasten([doel()])
    expect(screen.queryByText(/doelbedrag staat op iets anders/)).toBeNull()
  })

  it('waarschuwt wanneer je doeldatum ná de betaling ligt', () => {
    toonMetLasten([doel({ doeldatum: '2099-06-01' })])
    expect(screen.getByText(/aan dit tempo ben je te laat/)).toBeInTheDocument()
  })

  it('zegt het wanneer de kost niet meer bestaat', () => {
    toonMetLasten([doel()], [huur])
    expect(screen.getByText('Kost bestaat niet meer')).toBeInTheDocument()
  })

  it('zegt het wanneer de kost opgezegd is', () => {
    toonMetLasten([doel()], [{ ...premie, eindMaand: '2026-01' }])
    expect(screen.getByText(/daar komt geen betaling meer van/)).toBeInTheDocument()
  })

  it('zwijgt volledig bij een doel zonder koppeling', () => {
    toonMetLasten([doel({ vasteLastId: undefined })])
    expect(screen.queryByText(/Voor Autoverzekering/)).toBeNull()
    expect(screen.queryByText('Kost bestaat niet meer')).toBeNull()
  })
})


describe('SpaardoelSectie — de koppeling bij het bewerken (ronde 74, doorlichting)', () => {
  const gekoppeld: Spaardoel = {
    id: 'd1',
    naam: 'Autoverzekering 2099',
    doelbedrag: 62000,
    huidigBedrag: 10000,
    vasteLastId: 'vl1',
  }

  it('houdt de koppeling vast wanneer je alleen de naam aanpast', async () => {
    // ⚠ De belofte "een koppeling mag nooit stil verdwijnen" hing aan één regel, en
    // geen enkele test raakte hem: je kon hem weghalen en alles bleef groen. Zou hij
    // wegvallen, dan zou élke bewerking de koppeling wissen — en dan komt op Budget
    // het oude bedrag terug zonder dat iets het zegt.
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie
        spaardoelen={[gekoppeld]}
        vasteLasten={[premie, huur]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Bewerk doel Autoverzekering 2099' }))
    await user.type(screen.getByLabelText('Doelnaam'), ' bis')
    await user.click(screen.getByRole('button', { name: 'Doel wijzigen' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', vasteLastId: 'vl1' }))
  })

  it('toont de gekoppelde kost ook in de keuzelijst', async () => {
    const user = userEvent.setup()
    render(
      <SpaardoelSectie
        spaardoelen={[gekoppeld]}
        vasteLasten={[premie, huur]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Bewerk doel Autoverzekering 2099' }))
    expect(screen.getByLabelText('Waarvoor spaar je? (optioneel)')).toHaveValue('vl1')
  })

  it('liegt niet wanneer de gekoppelde kost intussen opgezegd is', async () => {
    // ⚠ De keuzelijst toont alleen SPAARBARE kosten. Een opgezegde kost staat er niet
    // in, dus viel het veld stil terug op "Voor niets in het bijzonder" — terwijl de
    // lijst ernaast wél een koppeling toonde. En je kon ze niet meer losmaken.
    const user = userEvent.setup()
    const anderePost: TerugkerendePost = { ...premie, id: 'vl9', omschrijving: 'Brandverzekering' }
    render(
      <SpaardoelSectie
        spaardoelen={[gekoppeld]}
        vasteLasten={[{ ...premie, eindMaand: '2026-01' }, anderePost]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Bewerk doel Autoverzekering 2099' }))
    expect(screen.getByLabelText('Waarvoor spaar je? (optioneel)')).toHaveValue('vl1')
    expect(screen.getByText(/om de koppeling los te maken/)).toBeInTheDocument()
  })

  it('laat de koppeling los te maken, ook als er geen enkele spaarbare kost meer is', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie
        spaardoelen={[gekoppeld]}
        vasteLasten={[{ ...premie, eindMaand: '2026-01' }]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Bewerk doel Autoverzekering 2099' }))
    const keuze = screen.getByLabelText('Waarvoor spaar je? (optioneel)')
    await user.selectOptions(keuze, '')
    await user.click(screen.getByRole('button', { name: 'Doel wijzigen' }))

    expect(onOpslaan.mock.calls[0][0].vasteLastId).toBeUndefined()
  })
})

describe('SpaardoelSectie — te laat, en dubbel sparen (ronde 74, doorlichting)', () => {
  it('zet geen groene badge naast "je bent te laat"', async () => {
    // ⚠ De badge is het opvallendste element van de regel. Stond er "Op schema" boven
    // "aan dit tempo ben je te laat", dan won de badge het gesprek — over hetzelfde doel.
    const doel: Spaardoel = {
      id: 'd1',
      naam: 'Auto',
      doelbedrag: 62000,
      huidigBedrag: 0,
      vasteLastId: 'vl1',
      maandbedrag: 70000,
      doeldatum: '2099-06-01',
    }
    render(
      <SpaardoelSectie
        spaardoelen={[doel]}
        vasteLasten={[premie]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    expect(screen.getByText(/aan dit tempo ben je te laat/)).toBeInTheDocument()
    expect(screen.queryByText('Op schema')).toBeNull()
  })

  it('zegt het wanneer je aan je tempo pas ná de betaling genoeg hebt', () => {
    // Zonder doeldatum rekent het doel met je streefbedrag; de app kende beide datums
    // en liet jou ze vergelijken.
    const traag: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 62000, huidigBedrag: 0, vasteLastId: 'vl1', maandbedrag: 2000 }
    // ⚠ Een kwartaalpost ZONDER startmaand valt deze of volgende maand; zo hangt deze
    // test niet aan een vast jaartal (zie claude/Kompal_tijdafhankelijke-tests.md).
    const binnenkort: TerugkerendePost = { id: 'vl1', omschrijving: 'Autoverzekering', bedrag: -62000, rekeningId: 'r1', dag: 5, frequentie: 'kwartaal' }
    render(
      <SpaardoelSectie
        spaardoelen={[traag]}
        vasteLasten={[binnenkort]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    expect(screen.getByText(/pas ná die betaling genoeg/)).toBeInTheDocument()
  })

  it('waarschuwt wanneer twee doelen aan dezelfde kost hangen', () => {
    // Dezelfde soort waarschuwing als bij twee doelen op één rekening (ronde 69), maar
    // dan voor de kostkant: Budget reserveert dan ook allebei de bedragen.
    const a: Spaardoel = { id: 'd1', naam: 'Pot A', doelbedrag: 62000, huidigBedrag: 0, vasteLastId: 'vl1' }
    const b: Spaardoel = { id: 'd2', naam: 'Pot B', doelbedrag: 62000, huidigBedrag: 0, vasteLastId: 'vl1' }
    render(
      <SpaardoelSectie
        spaardoelen={[a, b]}
        vasteLasten={[premie]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    expect(screen.getAllByText(/je spaart er dus dubbel voor/)).toHaveLength(2)
  })
})
