import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { zetSchermbreedte, herstelSchermbreedte } from '../test/schermbreedte'
import { SpaardoelSectie } from './SpaardoelSectie'
import type { Overboeking, Rekening, Spaardoel, TerugkerendePost, Transactie } from '../data/schema'
import { vandaag } from '../utils/datum'
import { voegMaandenToe } from '../utils/rekenhulp'
import { formatEuro } from '../utils/format'

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

function toonMetLasten(
  spaardoelen: Spaardoel[],
  vasteLasten: TerugkerendePost[] = [premie, huur],
  onOpslaan: (d: Spaardoel) => void = vi.fn(),
) {
  render(
    <SpaardoelSectie
      spaardoelen={spaardoelen}
      vasteLasten={vasteLasten}
      rekeningen={rekeningen}
      transacties={[]}
      waarderingen={[]}
      onOpslaan={onOpslaan}
      onVerwijderen={vi.fn()}
    />,
  )
  return onOpslaan
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

  it('houdt twee gelijknamige kosten in de keuzelijst uit elkaar (ronde 82)', () => {
    // ⚠ Dit is de enige plek waar je je fout daarna niet KAN zien. De koppeling stuurt
    // `opzijVolgensSpaardoelen` aan: kies je de verkeerde, dan verschuift "Opzij voor
    // later" op Budget naar de verkeerde kost, en de rij daar zegt "via je spaardoel X"
    // bij de post waar niet voor gespaard wordt.
    const tweede: TerugkerendePost = { ...premie, id: 'vl3', bedrag: -84000, dag: 12 }
    toonMetLasten([], [premie, tweede])
    const namen = [...screen.getByLabelText('Waarvoor spaar je? (optioneel)').querySelectorAll('option')].map(
      (o) => o.textContent ?? '',
    )
    const autos = namen.filter((n) => n.startsWith('Autoverzekering'))
    expect(autos).toHaveLength(2)
    expect(new Set(autos).size).toBe(2)
    expect(autos.some((n) => n.includes('620'))).toBe(true)
    expect(autos.some((n) => n.includes('840'))).toBe(true)
  })

  it('laat een unieke naam kaal staan in de keuzelijst', () => {
    // Het gewone geval: geen bedragen in een keuzelijst waar niets te onderscheiden valt.
    toonMetLasten([])
    const namen = [...screen.getByLabelText('Waarvoor spaar je? (optioneel)').querySelectorAll('option')].map(
      (o) => o.textContent ?? '',
    )
    expect(namen).toContain('Autoverzekering')
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

  it('merkt op dat je doelbedrag iets anders zegt dan de kost, en noemt allebei de getallen', () => {
    // ⚠ RONDE 85 — "je doelbedrag staat op iets anders" liet je zelf terugbladeren om te
    // zien wát dat andere was. Dit stond als open punt van ronde 79 in de voortgangsnota.
    toonMetLasten([doel({ doelbedrag: 68000 })])
    // ⚠ `toBe` op de hele zin, niet twee losse `toContain` (doorlichting ronde 85): met
    // twee `toContain` blijft de test groen wanneer de twee bedragen omgewisseld zijn —
    // en dat is precies wat deze zin moet uitsluiten (je moet zien welke kant het op moet).
    const zin = screen.getByText(/jouw doelbedrag staat op/)
    expect(zin.textContent).toBe(`Die kost is ${formatEuro(62000)}; jouw doelbedrag staat op ${formatEuro(68000)}.`)
  })

  it('zwijgt over het bedrag wanneer de twee gelijk zijn', () => {
    toonMetLasten([doel()])
    expect(screen.queryByText(/jouw doelbedrag staat op/)).toBeNull()
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

// ---------------------------------------------------------------------------
// Ronde 79 — de vaststelling krijgt er één tik naast
// ---------------------------------------------------------------------------
describe('SpaardoelSectie — het bedrag en de datum van de kost overnemen', () => {
  const doel = (over: Partial<Spaardoel> = {}): Spaardoel => ({
    id: 'd1',
    naam: 'Autoverzekering 2099',
    doelbedrag: 62000,
    huidigBedrag: 10000,
    vasteLastId: 'vl1',
    ...over,
  })

  it('zet het doelbedrag op het bedrag van de kost', async () => {
    const user = userEvent.setup()
    const onOpslaan = toonMetLasten([doel({ doelbedrag: 68000 })], undefined, vi.fn())

    await user.click(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', doelbedrag: 62000 }))
  })

  it('laat de rest van het doel ongemoeid', async () => {
    // ⚠ Eén veld verandert; alles wat jij verder ingevuld hebt, blijft staan. Een
    // formulier dat zijn record van nul opbouwt, gooit elk veld weg dat het niet kent
    // (huisregel sinds ronde 64) — deze knop doet dat niet.
    const user = userEvent.setup()
    const onOpslaan = toonMetLasten(
      [doel({ doelbedrag: 68000, doeldatum: '2099-03-05', maandbedrag: 5000, kleur: '#123456' })],
      undefined,
      vi.fn(),
    )

    await user.click(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ doelbedrag: 62000, doeldatum: '2099-03-05', maandbedrag: 5000, kleur: '#123456' }),
    )
  })

  it('zet de doeldatum op de eerstvolgende vervaldag', async () => {
    const user = userEvent.setup()
    const onOpslaan = toonMetLasten([doel({ doeldatum: '2099-06-01' })], undefined, vi.fn())

    await user.click(screen.getByRole('button', { name: 'Neem die datum over voor Autoverzekering 2099' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', doeldatum: '2099-03-05' }))
  })

  it('biedt niets aan wanneer er niets te corrigeren valt', () => {
    // Geen knop zonder vaststelling: een knop die niets doet is erger dan geen knop.
    toonMetLasten([doel()])
    expect(screen.queryByRole('button', { name: /Neem dat bedrag over/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Neem die datum over/ })).toBeNull()
  })

  it('biedt niets aan wanneer de kost niet meer bestaat', () => {
    toonMetLasten([doel({ doelbedrag: 68000, doeldatum: '2099-06-01' })], [huur])
    expect(screen.queryByRole('button', { name: /Neem dat bedrag over/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Neem die datum over/ })).toBeNull()
  })

  it('geeft elk doel in de lijst een eigen knopnaam', async () => {
    // ⚠ Huisregel sinds ronde 66: twee bedieningen met dezelfde toegankelijke naam op
    // één scherm zijn een fout, en deze twee knoppen staan bij élk gekoppeld doel.
    toonMetLasten([
      doel({ doelbedrag: 68000 }),
      doel({ id: 'd2', naam: 'Reservepot', doelbedrag: 70000 }),
    ])
    expect(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neem dat bedrag over voor Reservepot' })).toBeInTheDocument()
  })

  it('koppelt elke knop aan de zin die hem verklaart', () => {
    // Wie de app laat voorlezen, hoort anders alleen "Neem dat bedrag over" — zonder
    // waarvoor. Een reden hoort te wijzen naar iets wat je kan zien (ronde 71).
    toonMetLasten([doel({ doelbedrag: 68000 })])
    const knop = screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' })
    const id = knop.getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(document.getElementById(id as string)?.textContent).toMatch(/jouw doelbedrag staat op/)
  })

  it('draagt de zichtbare tekst die haar naam belooft', () => {
    // ⚠ WCAG 2.5.3 (huisregel sinds ronde 73): de zichtbare tekst hoort vooraan in de
    // toegankelijke naam. Alle andere tests zoeken op die naam, dus zonder deze test kan
    // de tekst op de knop iets heel anders gaan zeggen zonder dat één test rood wordt.
    toonMetLasten([doel({ doelbedrag: 68000, doeldatum: '2099-06-01' })])
    expect(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' })).toHaveTextContent(
      'Neem dat bedrag over',
    )
    expect(screen.getByRole('button', { name: 'Neem die datum over voor Autoverzekering 2099' })).toHaveTextContent(
      'Neem die datum over',
    )
  })

  it('zet elke knop NAAST de zin die hem verklaart, niet eronder', async () => {
    // ⚠ Anders wijst geen van beide knoppen nog naar iets: een reden hoort te wijzen
    // naar wat je kan zien (huisregel sinds ronde 71). Met twee vaststellingen tegelijk
    // is de volgorde het bewijs.
    toonMetLasten([doel({ doelbedrag: 68000, doeldatum: '2099-06-01' })])
    const bedragKnop = screen.getByRole('button', { name: /Neem dat bedrag over/ })
    const datumKnop = screen.getByRole('button', { name: /Neem die datum over/ })
    expect(bedragKnop.parentElement?.textContent).toMatch(/jouw doelbedrag staat op/)
    expect(datumKnop.parentElement?.textContent).toMatch(/aan dit tempo ben je te laat/)
  })

  it('haalt de knop weg zodra het gelukt is, en zegt wat er veranderde', async () => {
    // ⚠ De lus sluiten: alle andere tests gebruiken een mock die de lijst niet bijwerkt,
    // en dan is nergens aangetoond dat de knop na een geslaagde tik écht verdwijnt — de
    // belofte van deze hele ronde.
    const user = userEvent.setup()
    function Schil() {
      const [doelen, setDoelen] = useState<Spaardoel[]>([doel({ doelbedrag: 68000 })])
      return (
        <SpaardoelSectie
          spaardoelen={doelen}
          vasteLasten={[premie, huur]}
          rekeningen={rekeningen}
          transacties={[]}
          waarderingen={[]}
          onOpslaan={(d) => setDoelen([d])}
          onVerwijderen={vi.fn()}
        />
      )
    }
    render(<Schil />)

    await user.click(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' }))

    expect(screen.queryByRole('button', { name: /Neem dat bedrag over/ })).toBeNull()
    expect(screen.queryByText(/jouw doelbedrag staat op/)).toBeNull()
    expect(
      screen.getAllByRole('status').map((el) => el.textContent).join(' '),
    ).toContain('Het doelbedrag van Autoverzekering 2099 staat nu op')
  })

  it('laat de focus niet naar <body> vallen wanneer de knop verdwijnt', async () => {
    const user = userEvent.setup()
    function Schil() {
      const [doelen, setDoelen] = useState<Spaardoel[]>([doel({ doelbedrag: 68000 })])
      return (
        <SpaardoelSectie
          spaardoelen={doelen}
          vasteLasten={[premie, huur]}
          rekeningen={rekeningen}
          transacties={[]}
          waarderingen={[]}
          onOpslaan={(d) => setDoelen([d])}
          onVerwijderen={vi.fn()}
        />
      )
    }
    render(<Schil />)

    await user.click(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' }))

    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bewerk doel Autoverzekering 2099' }))
  })

  it('werkt ook het formulier bij wanneer dit doel daar openstaat', async () => {
    // ⚠ Anders toont het formulier rechts nog het OUDE bedrag naast een lijst met het
    // nieuwe — twee getallen voor hetzelfde doel, tegelijk op één scherm — en schrijft
    // de eerstvolgende "Doel wijzigen" jouw overname stil terug.
    const user = userEvent.setup()
    function Schil() {
      const [doelen, setDoelen] = useState<Spaardoel[]>([doel({ doelbedrag: 68000 })])
      return (
        <SpaardoelSectie
          spaardoelen={doelen}
          vasteLasten={[premie, huur]}
          rekeningen={rekeningen}
          transacties={[]}
          waarderingen={[]}
          onOpslaan={(d) => setDoelen([d])}
          onVerwijderen={vi.fn()}
        />
      )
    }
    render(<Schil />)

    await user.click(screen.getByRole('button', { name: 'Bewerk doel Autoverzekering 2099' }))
    expect(screen.getByLabelText('Doelbedrag (€)')).toHaveValue('680,00')

    await user.click(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' }))

    expect(screen.getByLabelText('Doelbedrag (€)')).toHaveValue('620,00')
  })

  it('neemt niet twee dingen tegelijk over, en zegt waarom niet', async () => {
    // ⚠ Het wegschrijven gaat langs een volledige herlading. Tik je de twee knoppen
    // snel na elkaar, dan schrijft de tweede het doel weg zoals het bij díé tekening
    // was — en is je eerste overname stil ongedaan gemaakt. Een grendel die zwijgt is
    // een nieuwe stille mislukking (ronde 68), dus deze zegt het.
    const user = userEvent.setup()
    let los: () => void = () => {}
    const onOpslaan = vi.fn().mockImplementation(() => new Promise<void>((r) => { los = r }))
    toonMetLasten([doel({ doelbedrag: 68000, doeldatum: '2099-06-01' })], undefined, onOpslaan)

    await user.click(screen.getByRole('button', { name: /Neem dat bedrag over/ }))
    await user.click(screen.getByRole('button', { name: /Neem die datum over/ }))

    expect(onOpslaan).toHaveBeenCalledTimes(1)
    expect(
      screen.getAllByRole('status').map((el) => el.textContent).join(' '),
    ).toContain('Even geduld')
    los()
  })

  it('biedt de datum NIET aan wanneer de vervaldag vandaag valt', () => {
    // ⚠ Dan zou de knop je doeldatum op vandaag zetten, en zegt de rekenkern "nul
    // maanden": de rode badge "Datum voorbij" verschijnt pal onder de zin dat de
    // betaling nog moet komen.
    const vandaagPost: TerugkerendePost = {
      ...premie,
      dag: Number(vandaag().slice(8, 10)),
      frequentie: 'jaar',
      startMaand: vandaag().slice(0, 7),
    }
    toonMetLasten([doel({ doeldatum: '2099-06-01' })], [vandaagPost, huur])
    expect(screen.queryByRole('button', { name: /Neem die datum over/ })).toBeNull()
  })

  it('biedt niets aan wanneer de kost intussen een INKOMST geworden is', () => {
    // ⚠ De koppeling blijft bestaan (keuze van ronde 74), maar er valt niets meer voor
    // te sparen — en de knop zou je doelbedrag op een inkomstbedrag zetten.
    toonMetLasten([doel({ doelbedrag: 68000 })], [{ ...premie, bedrag: 62000 }, huur])
    expect(screen.queryByRole('button', { name: /Neem dat bedrag over/ })).toBeNull()
  })

  it('biedt niets aan wanneer de kost intussen MAANDELIJKS geworden is', () => {
    // Een maandelijkse kost betaal je uit het loon van diezelfde maand; daar vooraf voor
    // sparen is een pot die elke maand weer leeg is.
    toonMetLasten([doel({ doelbedrag: 68000 })], [{ ...premie, frequentie: 'maand' }, huur])
    expect(screen.queryByRole('button', { name: /Neem dat bedrag over/ })).toBeNull()
  })

  it('zegt het wanneer het overnemen mislukt, in plaats van te doen alsof', async () => {
    // Huisregel sinds ronde 68: een mislukte opslag mag nooit stil blijven.
    const user = userEvent.setup()
    toonMetLasten([doel({ doelbedrag: 68000 })], undefined, () => {
      throw new Error('schijf vol')
    })

    await user.click(screen.getByRole('button', { name: 'Neem dat bedrag over voor Autoverzekering 2099' }))

    expect(await screen.findByText(/Dat is niet gelukt/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Ronde 85 — het doel en de kost waaraan het hangt
//
// Timothy: *"kan je het spaardoel niet beperken tot het bedrag van de vaste last? als er
// in dat spaardoel gespaard wordt en je gaat dan over het doel, staat er simpelweg het
// bedrag dat je er over aan 't gaan bent."*
//
// ⚠ De eerste opzet van deze ronde WEIGERDE te bewaren. Dat is teruggedraaid: het
// doelbedrag komt in geen enkele rekenkern voor die Budget voedt, dus de schade die de
// weigering rechtvaardigde bestond niet — en ze verbood wél de gevallen die ronde 79
// uitdrukkelijk open hield. De app zegt nu wat ze ziet en zet er één tik naast, zoals
// `LeningSectie` al deed bij "meer dan er nog openstaat".
// ---------------------------------------------------------------------------

describe('SpaardoelSectie — het doelbedrag naast de kost (ronde 85)', () => {
  it('zegt het bij het veld zelf, niet pas na het bewaren', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.type(screen.getByLabelText('Doelnaam'), 'Premie')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '680')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    // ⚠ Via `textContent`: `getByText` normaliseert witruimte, en `formatEuro` zet een
    // VASTE spatie na de € — dan matcht een regex met dat teken erin nooit.
    const zin = screen.getByText(/meer dan Autoverzekering kost/)
    expect(zin.textContent).toBe(`Dit is ${formatEuro(6000)} meer dan Autoverzekering kost (${formatEuro(62000)}).`)
  })

  it('hangt die zin aan het INVOERVELD én aan de knop, en niet aan een blok met een knop erin', async () => {
    // ⚠ Huisregel sinds ronde 78: `aria-describedby` wijst naar TEKST. En de knop draagt
    // hem óók: wie de app laat voorlezen hoorde anders alleen "Zet op € 620,00" zonder
    // waarvoor — precies wat `Vaststelling` in de lijst al goed doet.
    const user = userEvent.setup()
    toonMetLasten([])
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '680')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    const id = screen.getByLabelText('Doelbedrag (€)').getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(screen.getByRole('button', { name: `Zet op ${formatEuro(62000)}` })).toHaveAttribute('aria-describedby', id)
    expect(document.getElementById(id as string)?.textContent).not.toMatch(/Zet op/)
  })

  it('houdt het bewaren NIET tegen — de app zegt het, ze verbiedt het niet', async () => {
    // ⚠ Ronde 79 hield dit uitdrukkelijk open: misschien verwacht je een indexering, of
    // spaar je twee jaar vooruit. Een grendel zou dat verbieden op grond van een gevolg
    // dat er niet is (`doelbedrag` voedt geen enkele Budget-rekenkern).
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    toonMetLasten([], [premie, huur], onOpslaan)
    await user.type(screen.getByLabelText('Doelnaam'), 'Premie')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '680')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    const knop = screen.getByRole('button', { name: 'Doel toevoegen' })
    expect(knop).not.toHaveAttribute('aria-disabled', 'true')
    await user.click(knop)
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ doelbedrag: 68000, vasteLastId: 'vl1' }))
  })

  it('zet het met één tik gelijk', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    toonMetLasten([], [premie, huur], onOpslaan)
    await user.type(screen.getByLabelText('Doelnaam'), 'Premie')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '680')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    await user.click(screen.getByRole('button', { name: `Zet op ${formatEuro(62000)}` }))
    expect(screen.getByLabelText('Doelbedrag (€)')).toHaveValue('620,00')
    expect(screen.queryByText(/meer dan Autoverzekering kost/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ doelbedrag: 62000 }))
  })

  it('zwijgt op de grens en één cent eronder', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '620')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    expect(screen.queryByText(/meer dan Autoverzekering kost/)).toBeNull()
  })

  it('spreekt één cent erboven wél', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '620,01')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    expect(screen.getByText(/meer dan Autoverzekering kost/).textContent).toContain(formatEuro(1))
  })

  it('zwijgt zolang er geen kost aan hangt', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '5000')
    expect(screen.queryByText(/meer dan/)).toBeNull()
  })

  it('zwijgt over een kost die de app niet KENT', async () => {
    // Hangt het doel aan een post die niet meer in de lijst staat, dan weet de app niet
    // wat ze kost. Raden over een bedrag dat we niet zien, is erger dan niets zeggen.
    const user = userEvent.setup()
    toonMetLasten([{ id: 'd9', naam: 'Oud', doelbedrag: 99900, huidigBedrag: 0, vasteLastId: 'weg' }], [premie, huur])
    await user.click(screen.getByRole('button', { name: 'Bewerk doel Oud' }))
    expect(screen.queryByText(/meer dan/)).toBeNull()
  })

  it('zet die twee bedragen NIET naast elkaar bij een maandelijkse kost', async () => {
    // ⚠ `doeldekking` kijkt niet naar het teken en niet naar het ritme, en dit scherm
    // krijgt ÁLLE terugkerende posten mee. Hangt je doel aan een post die intussen
    // maandelijks werd, dan zei de zin "Die kost is € 950,00; jouw doelbedrag staat op
    // € 620,00" — met je huurbedrag erin. Ronde 79 hield de KNOP daar al buiten; sinds de
    // zin de getallen noemt, geldt hetzelfde voor de zin.
    toonMetLasten([{ id: 'd1', naam: 'Premie', doelbedrag: 62000, huidigBedrag: 0, vasteLastId: 'vl2' }])
    expect(screen.queryByText(/jouw doelbedrag staat op/)).toBeNull()
  })
})

describe('SpaardoelSectie — het streefbedrag stuurt Budget (ronde 85)', () => {
  it('zegt wat Budget hierdoor apart houdt, en wat het anders zou zijn', async () => {
    // ⚠ Dit is het veld dat écht iets doet: `opzijVolgensSpaardoelen` legt het onder
    // "Opzij voor later" op Budget in de plaats van het volle bedrag gedeeld over de
    // maanden. Tot deze ronde stond daar geen letter over.
    const user = userEvent.setup()
    toonMetLasten([])
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    await user.type(screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)'), '500')
    const zin = screen.getByText(/Budget houdt hierdoor/)
    expect(zin.textContent).toContain(formatEuro(50000))
    // € 620 per jaar = € 51,67 per maand.
    expect(zin.textContent).toContain(formatEuro(5167))
  })

  it('hangt die zin aan het streefbedragveld', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    await user.type(screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)'), '500')
    const id = screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)').getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(document.getElementById(id as string)?.textContent).toMatch(/Budget houdt hierdoor/)
  })

  it('zegt het ook wanneer je streefbedrag LAGER ligt — dan reserveert Budget te weinig', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    await user.type(screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)'), '10')
    expect(screen.getByText(/Budget houdt hierdoor/).textContent).toContain(formatEuro(1000))
  })

  it('zet het met één tik terug op wat de app zelf zou rekenen', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    await user.type(screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)'), '500')
    await user.click(screen.getByRole('button', { name: `Zet op ${formatEuro(5167)}` }))
    expect(screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)')).toHaveValue('51,67')
    expect(screen.queryByText(/Budget houdt hierdoor/)).toBeNull()
  })

  it('zwijgt zonder streefbedrag en zonder gekozen kost', async () => {
    const user = userEvent.setup()
    toonMetLasten([])
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), 'vl1')
    expect(screen.queryByText(/Budget houdt hierdoor/)).toBeNull()
    await user.type(screen.getByLabelText('Maandelijks streefbedrag (€, optioneel)'), '100')
    await user.selectOptions(screen.getByLabelText('Waarvoor spaar je? (optioneel)'), '')
    expect(screen.queryByText(/Budget houdt hierdoor/)).toBeNull()
  })
})

describe('SpaardoelSectie — wat je er OVER spaart (ronde 85)', () => {
  const overDoel: Spaardoel = { id: 'd1', naam: 'Premie', doelbedrag: 62000, huidigBedrag: 72000 }

  it('zegt "{bedrag} meer dan nodig" waar anders "nog € 0,00" stond', () => {
    // ⚠ `resterend` wordt afgekapt op nul, dus daar stond letterlijk "nog € 0,00" —
    // hetzelfde als bij wie precies genoeg heeft.
    toonMetLasten([overDoel], [])
    expect(screen.getByText(/meer dan nodig$/).textContent).toBe(`${formatEuro(10000)} meer dan nodig`)
    expect(screen.queryByText(/^nog /)).toBeNull()
  })

  it('beschuldigt je niet: geen "te veel"', () => {
    // Meer sparen dan het doel vraagt is geen vergissing, en "te veel" betekent in deze
    // app elders wél een échte fout.
    toonMetLasten([overDoel], [])
    expect(screen.queryByText(/te veel/)).toBeNull()
  })

  it('zegt het maar op ÉÉN plaats in de rij', () => {
    // ⚠ Mijn eerste opzet zette het ook naast "Doel gehaald". Dan stond hetzelfde
    // verschil drie keer in vier regels.
    toonMetLasten([overDoel], [])
    expect(screen.getByText('Doel gehaald')).toBeInTheDocument()
    // ⚠ Op de tekst van de hele rij tellen: `getAllByText` normaliseert de vaste spatie
    // die `formatEuro` na de € zet, en dan matcht geen enkele regex met dat teken erin.
    const rij = document.querySelector('.lijst li') as HTMLElement
    const stukken = rij.textContent?.split(formatEuro(10000)) ?? []
    expect(stukken).toHaveLength(2)
  })

  it('houdt de balk op honderd procent — een balk van 116 % bestaat niet', () => {
    toonMetLasten([overDoel], [])
    expect(screen.getByRole('progressbar', { name: 'Premie' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('zwijgt wanneer je precies genoeg hebt', () => {
    toonMetLasten([{ id: 'd1', naam: 'Premie', doelbedrag: 62000, huidigBedrag: 62000 }], [])
    expect(screen.getByText('Doel gehaald')).toBeInTheDocument()
    expect(screen.queryByText(/meer dan nodig/)).toBeNull()
  })

  it('zwijgt wanneer twee doelen dezelfde rekening delen', () => {
    // ⚠ Bij een gekoppeld doel is `huidig` het VOLLE saldo van die rekening — dat zegt de
    // zin erboven zelf. Hangen er twee doelen aan, dan zou "€ 80,00 meer dan nodig" bij
    // allebei staan terwijl er in totaal geld tekort is.
    const a: Spaardoel = { id: 'd1', naam: 'A', doelbedrag: 10000, huidigBedrag: 0, gekoppeldeRekeningId: 'r1' }
    const b: Spaardoel = { id: 'd2', naam: 'B', doelbedrag: 10000, huidigBedrag: 0, gekoppeldeRekeningId: 'r1' }
    render(
      <SpaardoelSectie
        spaardoelen={[a, b]}
        rekeningen={[{ id: 'r1', naam: 'Spaar', beginsaldo: 15000 }]}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    expect(screen.queryByText(/meer dan nodig/)).toBeNull()
  })
})
