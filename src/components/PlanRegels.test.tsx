import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PlanRegels } from './PlanRegels'
import type { Budget, Spaardoel, TerugkerendePost } from '../data/schema'

const doelVoorPremie: Spaardoel = {
  id: 'd1',
  naam: 'Autoverzekering 2027',
  doelbedrag: 60000,
  huidigBedrag: 0,
  vasteLastId: 'prem',
}

const huur: TerugkerendePost = { id: 'huur', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
const premie: TerugkerendePost = {
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -60000,
  rekeningId: 'r1',
  dag: 5,
  frequentie: 'semester',
  startMaand: '2026-08',
  opbouwen: true,
}

function toon(
  posten: TerugkerendePost[],
  budgetten: Budget[] = [],
  maand = '2026-07',
  inkomsten = 240000,
  geboekt = 0,
  onGaNaarTransacties?: (filter: { maand: string; richting: 'in' }) => void,
  onNaarVast?: () => void,
  spaardoelen: Spaardoel[] = [],
) {
  render(
    <PlanRegels
      posten={posten}
      budgetten={budgetten}
      maand={maand}
      verwachteInkomsten={inkomsten}
      geboekteInkomsten={geboekt}
      onGaNaarTransacties={onGaNaarTransacties}
      onNaarVast={onNaarVast}
      spaardoelen={spaardoelen}
    />,
  )
}

function teVerdelen(): string {
  return document.querySelector('[data-te-verdelen] .bedrag')?.textContent ?? ''
}

describe('PlanRegels', () => {
  it('trekt de vaste lasten van de verwachte inkomsten af', () => {
    toon([huur])
    // € 2.400 − € 950 = € 1.450
    expect(teVerdelen()).toMatch(/1[.\s]?450/)
  })

  it('zet in een maand zonder betaling het maandelijkse deel opzij', () => {
    toon([huur, premie], [], '2026-07')
    expect(screen.getByText('Opzij voor later')).toBeInTheDocument()
    // € 2.400 − € 950 − € 100 = € 1.350
    expect(teVerdelen()).toMatch(/1[.\s]?350/)
  })

  it('betaalt in de vervalmaand het volle bedrag en zet dan niets opzij', () => {
    toon([huur, premie], [], '2026-08')
    expect(screen.queryByText('Opzij voor later')).not.toBeInTheDocument()
    // € 2.400 − € 950 − € 600 = € 850
    expect(teVerdelen()).toMatch(/850/)
  })

  it('waarschuwt wanneer de budgetten samen meer vragen dan er overblijft', () => {
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 200000 }])
    expect(screen.getByText(/Je budgetten vragen samen € 2.000,00, en dat is meer/)).toBeInTheDocument()
  })

  it('meldt gewoon hoeveel de budgetten opeisen wanneer het past', () => {
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }])
    expect(screen.getByText(/vragen je budgetten samen/)).toBeInTheDocument()
    expect(screen.queryByText(/en dat is meer/)).not.toBeInTheDocument()
  })

  // Ronde 62. Dit is de ENIGE plek die budgetten optelt, en dus de plek waar een
  // dubbeltelling het stilst zou zijn: er verschijnt geen dubbele regel, er staat
  // gewoon een te hoog getal.
  it('telt een standaardbudget en zijn uitzondering NIET samen', () => {
    toon(
      [huur],
      [
        { id: 'budget-ov-voeding', categorieId: 'ov-voeding', bedrag: 40000 },
        { id: 'budget-ov-voeding-2026-07', categorieId: 'ov-voeding', bedrag: 50000, maand: '2026-07' },
      ],
      '2026-07',
    )
    // Alleen de uitzondering telt: € 500, niet € 900.
    expect(screen.getByText(/vragen je budgetten samen/)).toHaveTextContent(/500/)
    expect(screen.queryByText(/900/)).not.toBeInTheDocument()
  })

  it('rekent in een andere maand gewoon met je standaardbudget', () => {
    toon(
      [huur],
      [
        { id: 'budget-ov-voeding', categorieId: 'ov-voeding', bedrag: 40000 },
        { id: 'budget-ov-voeding-2026-12', categorieId: 'ov-voeding', bedrag: 50000, maand: '2026-12' },
      ],
      '2026-07',
    )
    expect(screen.getByText(/vragen je budgetten samen/)).toHaveTextContent(/400/)
  })

  it('toont het jaargemiddelde apart van het bedrag van deze maand', () => {
    // ⚠ Augustus en niet juli: de premie start in 2026-08, en sinds ronde 71 telt een
    // post pas vanaf zijn eerste betaling mee in het gemiddelde.
    toon([huur, premie], [], '2026-08')
    // € 950 + € 100 omgerekende premie = € 1.050 gemiddeld per maand.
    expect(screen.getByText(/gemiddeld.*1[.\s]?050/)).toBeInTheDocument()
  })

  it('laat zich niet foppen door één regel statiegeld (ronde 104)', () => {
    // ⚠ DE KLACHT. `verwachteInkomsten` telt per REGEL — zoals het hoort, want een
    // gesplitst kassaticket telt overal per regel mee. Maar één regel statiegeld van
    // € 0,25 binnen een boodschappenticket maakte dat bedrag positief, en Budget las dat
    // als "de app kent je inkomsten". Wat je dan zag was een groot rood "Te verdelen"
    // terwijl je nog geen enkele inkomst had ingevuld — een oordeel over een plan dat er
    // niet is, precies wat het commentaar in dit onderdeel zegt te willen vermijden.
    //
    // ⚠ Een eerste versie van dit herstel hing het aan het AANTAL inkomstenboekingen, en
    // een doorlichting toonde aan dat dat het gat alleen versmalde: boek diezelfde € 0,25
    // als een LOSSE teruggave — van de mutualiteit, een retour — en het rode oordeel stond
    // er weer. Het gaat om de verhouding, niet om het aantal.
    toon([huur], [], '2026-07', 25)
    expect(document.querySelector('[data-te-verdelen]')).toBeNull()
    expect(document.querySelector('[data-geen-inkomsten]')).not.toBeNull()
  })

  it('toont het plan wél zodra de inkomsten in verhouding staan tot de vaste lasten', () => {
    // De positieve tegencontrole: zonder haar slaagt de test hierboven ook wanneer het
    // plan nooit meer verschijnt.
    //
    // ⚠ OP DE GRENS ZELF, en aan beide kanten. Een doorlichting toonde met een mutatie aan
    // dat de eerste versie hier € 950 meegaf — tien keer de grens — en dat de factor
    // daardoor alles tussen 2 en 3800 mocht zijn zonder dat één test knipperde. Huur is
    // € 950, dus de grens ligt op € 95: één cent erboven hoort het plan te tonen, één cent
    // eronder niet.
    toon([huur], [], '2026-07', 9500)
    expect(document.querySelector('[data-te-verdelen]')).not.toBeNull()
  })

  it('zwijgt één cent ónder die grens', () => {
    toon([huur], [], '2026-07', 9499)
    expect(document.querySelector('[data-te-verdelen]')).toBeNull()
    expect(document.querySelector('[data-geen-inkomsten]')).not.toBeNull()
  })

  it('telt "opzij voor later" mee in wat er tegenover moet staan', () => {
    // ⚠ `vastMoetenBetalen` is `vastDezeMaand + opzij`. Zonder deze test mag die tweede
    // term weg, en dan is de grens te laag zodra je ook geld apart zet — precies het geval
    // waarin het plan het meeste betekent. Huur € 950 + € 500 opzij = € 1.450; de grens
    // ligt dan op € 145, niet op € 95.
    const doelpost: TerugkerendePost = {
      id: 'prem2',
      omschrijving: 'Autoverzekering',
      bedrag: -600000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2026-01',
      opbouwen: true,
    }
    // € 6.000 per jaar = € 500 per maand opzij. € 100 inkomsten is boven de grens van € 95
    // (alleen huur) maar onder die van € 145 (huur + opzij).
    toon([huur, doelpost], [], '2026-07', 10000)
    expect(document.querySelector('[data-te-verdelen]')).toBeNull()
  })

  it('meent nog niet dat het je plan kent bij een inkomst die pas later begint', () => {
    // ⚠ HET LEK AAN DE ANDERE KANT. `heeftVasteInkomst` keek eerst alleen naar `isGestopt`.
    // Vul je een nieuw loon in dat pas volgend jaar start, dan meende de app vandaag al dat
    // ze je plan kende — en stond er wéér een groot rood bedrag dat volledig door 25 cent
    // statiegeld bepaald werd.
    const laterLoon: TerugkerendePost = {
      id: 'nieuwloon',
      omschrijving: 'Nieuw loon',
      bedrag: 300000,
      rekeningId: 'r1',
      dag: 25,
      frequentie: 'jaar',
      startMaand: '2029-01',
    }
    toon([huur, laterLoon], [], '2026-07', 25)
    expect(document.querySelector('[data-te-verdelen]')).toBeNull()
    expect(document.querySelector('[data-geen-inkomsten]')).not.toBeNull()
  })

  it('kent je inkomsten ook in een maand waarin je vaste inkomst niet vervalt', () => {
    // ⚠ DE TWEEDE FOUT IN DEZELFDE REGEL, en ze wees de andere kant op. `vasteInkomsten`
    // telt alleen de posten die DEZE maand vervallen. Een zelfstandige die per kwartaal
    // factureert, kreeg in twee van de drie maanden "Vul je vaste inkomsten in" — met een
    // knop naar een scherm waar zijn inkomst gewoon staat ingevuld.
    const perKwartaal: TerugkerendePost = {
      id: 'fact',
      omschrijving: 'Facturatie',
      bedrag: 900000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'kwartaal',
      startMaand: '2026-07',
    }
    // Augustus: de post vervalt niet, er komt niets binnen — en tóch kent de app je plan.
    toon([huur, perKwartaal], [], '2026-08', 0)
    expect(document.querySelector('[data-te-verdelen]')).not.toBeNull()
    expect(document.querySelector('[data-geen-inkomsten]')).toBeNull()
  })

  it('zwijgt wél wanneer je vaste inkomst is opgezegd', () => {
    // De tegencontrole bij de test hierboven: "je hebt ooit een inkomst ingevuld" is niet
    // hetzelfde als "je hebt er nog een".
    const gestopt: TerugkerendePost = {
      id: 'oud',
      omschrijving: 'Oud loon',
      bedrag: 240000,
      rekeningId: 'r1',
      dag: 25,
      eindMaand: '2026-01',
    }
    toon([huur, gestopt], [], '2026-08', 0)
    expect(document.querySelector('[data-geen-inkomsten]')).not.toBeNull()
  })

  it('toont niets op een lege app', () => {
    const { container } = render(
      <PlanRegels posten={[]} budgetten={[]} maand="2026-07" verwachteInkomsten={0} geboekteInkomsten={0} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

// --- Ronde 25: geen misleidend cijfer, en de vergelijking met wat er binnenkwam ---

const loon: TerugkerendePost = { id: 'loon', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', dag: 25 }

describe('PlanRegels — zonder bekende inkomsten', () => {
  it('toont geen negatief "te verdelen" maar zegt wat er ontbreekt', () => {
    // Wel vaste lasten, geen vaste inkomst en nog niets geboekt: een groot rood
    // bedrag zou hier een oordeel lijken over je situatie, terwijl het gewoon
    // betekent dat er nog niets ingevuld is.
    toon([huur], [], '2026-07', 0)
    expect(document.querySelector('[data-te-verdelen]')).toBeNull()
    expect(screen.getByText(/kent je vaste inkomsten nog niet/)).toBeInTheDocument()
  })

  it('wijst naar het tabblad waar je die inkomsten ook echt invult', async () => {
    // ⚠ RONDE 66, slotronde. Hier stond "Vul HIERONDER je vaste inkomsten in",
    // maar deze kaart hangt op het tabblad "Te verdelen" en het formulier op
    // "Vast". Onder deze regel stond dus niets. De test toetste alleen de tekst en
    // kon dat verschil daarom niet zien.
    const naarVast = vi.fn()
    toon([huur], [], '2026-07', 0, 0, undefined, naarVast)
    await userEvent.click(screen.getByRole('button', { name: 'Vul je vaste inkomsten in' }))
    expect(naarVast).toHaveBeenCalledTimes(1)
  })

  it('belooft geen knop wanneer er geen bestemming is', () => {
    toon([huur], [], '2026-07', 0)
    expect(screen.queryByRole('button', { name: 'Vul je vaste inkomsten in' })).toBeNull()
  })

  it('toont het cijfer wél zodra er een vaste inkomst is', () => {
    toon([huur, loon], [], '2026-07', 240000)
    expect(document.querySelector('[data-te-verdelen]')).not.toBeNull()
  })
})

describe('PlanRegels — verwacht tegenover werkelijk binnengekomen', () => {
  function vergelijking(): string {
    return document.querySelector('[data-inkomstenvergelijking]')?.textContent ?? ''
  }

  it('zwijgt zolang er nog niets binnengekomen is', () => {
    toon([huur, loon], [], '2026-07', 240000, 0)
    expect(vergelijking()).toBe('')
  })

  it('meldt hoeveel er méér binnenkwam', () => {
    // € 2.530 gekregen tegenover € 2.400 vaste inkomsten = € 130 meer.
    toon([huur, loon], [], '2026-07', 253000, 253000)
    expect(vergelijking()).toMatch(/meer dan je vaste inkomsten/)
    expect(vergelijking()).toMatch(/130,00/)
  })

  it('meldt hoeveel er minder binnenkwam', () => {
    toon([huur, loon], [], '2026-07', 230000, 230000)
    expect(vergelijking()).toMatch(/minder dan je vaste inkomsten/)
    expect(vergelijking()).toMatch(/100,00/)
  })

  it('zegt het ook wanneer het precies klopt', () => {
    toon([huur, loon], [], '2026-07', 240000, 240000)
    expect(vergelijking()).toMatch(/precies je vaste inkomsten/)
  })
})

// --- Ronde 48: van een cijfer naar de boekingen --------------------------------

describe('PlanRegels — doorklikken', () => {
  const MAAND = '2026-07'
  // De vergelijkingsregel verschijnt pas met een vaste INKOMST én iets geboekt.
  const loon: TerugkerendePost = { id: 'loon', omschrijving: 'Loon', bedrag: 200000, rekeningId: 'r1', dag: 25 }

  it('laat alleen het GEBOEKTE bedrag doorklikken, niet het verwachte', async () => {
    // "Verwachte inkomsten" telt ook vaste posten mee die nog niet geboekt zijn —
    // daar bestaat geen transactie voor. Wie daarop klikt, zou een lege lijst
    // krijgen. Het geboekte bedrag telt regel voor regel exact hetzelfde op als de
    // lijst zelf.
    const gebruiker = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    toon([huur, loon], [], MAAND, 240000, 200000, onGaNaarTransacties)
    expect(screen.queryByRole('button', { name: /Verwachte inkomsten/ })).toBeNull()
    const knop = screen.getByRole('button', { name: /^Bekijk die boekingen/ })
    await gebruiker.click(knop)
    expect(onGaNaarTransacties).toHaveBeenCalledWith({ maand: MAAND, richting: 'in' })
  })

  it('maakt geen knop wanneer de app er niets mee kan', () => {
    toon([huur, loon], [], MAAND, 240000, 200000)
    expect(screen.queryByRole('button', { name: /^Bekijk die boekingen/ })).toBeNull()
  })
})

describe('PlanRegels — een vaste last met een spaardoel (ronde 74)', () => {
  it('rekent met je streefbedrag in plaats van met de deling van het jaarbedrag', () => {
    // ⚠ Het bedrag wordt VERVANGEN, niet weggehaald. Weglaten zou "Te verdelen" te HOOG
    // zetten: `Spaardoel.maandbedrag` komt in geen enkele rekenkern die Budget voedt,
    // dus er stond niets tegenover.
    toon([huur, premie], [], '2026-09')
    expect(screen.getByText('Opzij voor later').closest('li')).toHaveTextContent(/100,00/)

    document.body.innerHTML = ''
    toon([huur, premie], [], '2026-09', 240000, 0, undefined, undefined, [{ ...doelVoorPremie, maandbedrag: 7500 }])
    expect(screen.getByText('Opzij voor later').closest('li')).toHaveTextContent(/75,00/)
  })

  it('zegt waar dat bedrag vandaan komt', () => {
    // Wie er plots een ander getal ziet staan, moet kunnen zien waarom.
    toon([huur, premie], [], '2026-09', 240000, 0, undefined, undefined, [{ ...doelVoorPremie, maandbedrag: 7500 }])
    expect(screen.getByText(/Autoverzekering.*met je spaardoel/)).toBeInTheDocument()
  })

  it('telt "Te verdelen" met dat bedrag erin', () => {
    // € 3.000 − € 950 huur − € 75 opzij.
    toon([huur, premie], [], '2026-09', 300000, 0, undefined, undefined, [{ ...doelVoorPremie, maandbedrag: 7500 }])
    const rij = document.querySelector('[data-te-verdelen]') as HTMLElement
    expect(rij).toHaveTextContent(/1\.975,00/)
  })

  it('reserveert ook wanneer het vinkje "opzijzetten" uit staat', () => {
    // Het doel is nu net het alternatief voor dat vinkje. Zonder deze regel zou je
    // € 75 per maand wegzetten en zou je plan er geen cent voor opzijhouden.
    const zonderVinkje = { ...premie, opbouwen: false }
    toon([zonderVinkje], [], '2026-09', 300000, 0, undefined, undefined, [{ ...doelVoorPremie, maandbedrag: 7500 }])
    expect(screen.getByText('Opzij voor later').closest('li')).toHaveTextContent(/75,00/)
  })

  it('zegt niets zolang het doel geen streefbedrag heeft', () => {
    // Dan verandert er niets aan het bedrag, en dan valt er ook niets uit te leggen.
    toon([huur, premie], [], '2026-09', 240000, 0, undefined, undefined, [doelVoorPremie])
    expect(screen.getByText('Opzij voor later').closest('li')).toHaveTextContent(/100,00/)
    expect(screen.queryByText(/met je spaardoel/)).toBeNull()
  })

  it('legt niets uit boven een kost die hier nooit iets vroeg', () => {
    // ⚠ Zonder vinkje én zonder streefbedrag draagt de koppeling niets bij. De zin
    // "dit rekent met je spaardoel" boven een plan waarin die kost nooit stond, verklaart
    // een verandering die er niet is.
    toon([huur, { ...premie, opbouwen: false }], [], '2026-09', 240000, 0, undefined, undefined, [doelVoorPremie])
    expect(screen.queryByText(/met je spaardoel/)).toBeNull()
  })

  it('zwijgt over de koppeling in de maand dat de kost wél valt', () => {
    // Dan staat er sowieso geen opzij, dus er is niets uit te leggen.
    toon([huur, premie], [], '2026-08', 240000, 0, undefined, undefined, [{ ...doelVoorPremie, maandbedrag: 7500 }])
    expect(screen.queryByText(/met je spaardoel/)).toBeNull()
  })

  it('laat de kaart niet verdwijnen door een koppeling', () => {
    // ⚠ De nulcontrole bovenaan brak af op "geen inkomsten, niets vast, niets opzij".
    // Met een koppeling zonder streefbedrag kon `opzij` op nul komen, en dan verdween
    // de hele kaart — inclusief de uitleg die er net in staat.
    toon([{ ...premie, opbouwen: false }], [], '2026-09', 0, 0, undefined, undefined, [
      { ...doelVoorPremie, maandbedrag: 7500 },
    ])
    expect(screen.getByText('Opzij voor later')).toBeInTheDocument()
  })
})

// ── Ronde 80 — "van je inkomen staat € X nog nergens ondergebracht" ─────────────
//
// Het getal waarop je stuurt, en dat de kaart je zelf liet uitrekenen.
describe('PlanRegels — wat er nog nergens in zit (ronde 80)', () => {
  function badge(): string {
    return document.querySelector('[data-nog-nergens] .badge')?.textContent ?? ''
  }
  function zin(): string {
    return document.querySelector('[data-nog-nergens] .rij-meta')?.textContent ?? ''
  }

  it('trekt de budgetten van het te verdelen bedrag af en noemt de rest', () => {
    // € 2.400 − € 950 huur = € 1.450 te verdelen, min € 400 budget = € 1.050
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }])
    expect(badge()).toMatch(/1[.\s]?050/)
    expect(badge()).toMatch(/nog nergens ondergebracht/)
  })

  it('vraagt een budget binnen een ander budget maar één keer (ronde 106)', () => {
    // € 900 op "Woning en vaste lasten" en € 120 op "Energie" — een middencategorie daaronder.
    // De zin zei "je budgetten vragen samen € 1.020,00" terwijl er hoogstens € 900 vastligt,
    // en de badge stond dus € 120 te laag.
    toon([huur], [
      { id: 'b1', categorieId: 'ov-woning-en-vaste-lasten', bedrag: 90000 },
      { id: 'b2', categorieId: 'cat-energie-en-nutsvoorzieningen', bedrag: 12000 },
    ])
    // € 2.400 − € 950 huur = € 1.450 te verdelen, min € 900 = € 550.
    expect(zin()).toMatch(/900,00/)
    expect(zin()).not.toMatch(/1[.\s]?020/)
    expect(badge()).toMatch(/550,00/)
  })

  it('zegt erbij dat nul geen doel is', () => {
    // Bij YNAB moet dit bedrag naar nul; hier kan het gewoon je buffer zijn. Zonder
    // deze zin leest het cijfer als een opdracht in plaats van een vaststelling.
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }])
    expect(zin()).toMatch(/Dat hoeft ook niet/)
    expect(zin()).toMatch(/geld vrij houden/)
  })

  it('schrijft de hele aftrekking uit, zodat het cijfer na te rekenen is', () => {
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }])
    // € 1.450 te verdelen − € 400 budgetten = € 1.050 in de badge. Staat "te
    // verdelen" er niet bij, dan rekent de lezer inkomsten − vaste lasten −
    // budgetten na en mist hij "Opzij voor later" — een derde bak.
    expect(zin()).toMatch(/1[.\s]?450/)
    expect(zin()).toMatch(/400/)
  })

  it('zegt "alles ondergebracht" wanneer er precies niets overblijft', () => {
    // € 1.450 te verdelen, € 1.450 aan budgetten.
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 145000 }])
    expect(badge()).toMatch(/Alles ondergebracht/)
    expect(zin()).not.toMatch(/geld vrij houden/)
  })

  it('noemt het tekort wanneer de budgetten te veel vragen', () => {
    // € 1.450 te verdelen, € 2.000 aan budgetten → € 550 te veel.
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 200000 }])
    expect(badge()).toMatch(/550/)
    expect(badge()).toMatch(/te veel ondergebracht/)
  })

  it('toont niets zolang er geen enkel budget staat', () => {
    // Zonder budgetten is dit cijfer exact "Te verdelen" hierboven, en dan zou de
    // regel hetzelfde getal een tweede keer zeggen.
    toon([huur], [])
    expect(document.querySelector('[data-nog-nergens]')).toBeNull()
  })

  it('vergelijkt niets zolang de app je inkomsten niet kent', () => {
    // Zonder inkomsten bestaat "te verdelen" niet. De oude zin zei hier toch "dat is
    // meer dan er te verdelen valt" — tegen iemand die nog niets ingevuld had.
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 200000 }], '2026-07', 0)
    expect(document.querySelector('[data-nog-nergens]')).toBeNull()
    const kaal = document.querySelector('[data-budgetten-zonder-inkomsten]')?.textContent ?? ''
    expect(kaal).toMatch(/Je budgetten vragen samen/)
    expect(kaal).not.toMatch(/te verdelen/)
  })

  it('waarschuwt wanneer een vaste last ook binnen een budget valt', () => {
    // Dan gaat die kost er twee keer af: één keer als vaste last, één keer via het
    // budget. De app corrigeert dat niet — ze kan niet weten hoe je het budget
    // bedoeld hebt — maar ze zwijgt er ook niet over.
    const huurMetCategorie = { ...huur, categorieId: 'ov-woning-en-vaste-lasten' }
    toon([huurMetCategorie], [{ id: 'b1', categorieId: 'ov-woning-en-vaste-lasten', bedrag: 100000 }])
    expect(zin()).toMatch(/mogelijk twee keer/)
    expect(zin()).toMatch(/Huur/)
  })

  // ⚠ DEZE DRIE TESTEN KOMEN UIT EEN NAKIJKRONDE. Ze bestonden niet, en drie mutaties
  // overleefden daardoor de volledige suite: "opzij" uit de aftrekking laten vallen,
  // de kale budgettenlijst gebruiken in plaats van de geldende, en de gestopte posten
  // niet uitsluiten. Alle drie raken ze precies waar deze ronde over gaat.
  it('trekt ook "Opzij voor later" van het cijfer af', () => {
    // € 2.400 − € 950 huur − € 100 opzij voor de premie = € 1.350, min € 400 budget
    // = € 950. Vergeet je de opzij, dan staat er € 1.050.
    toon([huur, premie], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }], '2026-07')
    expect(badge()).toMatch(/950/)
    expect(badge()).not.toMatch(/1[.\s]?050/)
  })

  it('waarschuwt niet voor dubbeltelling op grond van een budget voor een ANDERE maand', () => {
    // Het decemberbudget geldt in juli niet, dus het kan de huur van juli ook niet
    // dubbel tellen. Zonder `geldendeBudgetten` zou de waarschuwing hier wél staan.
    //
    // ⚠ Er staat OOK een gewoon budget bij, en dat is de hele test. Zonder dat budget
    // is `gebudgetteerd` nul, verdwijnt het hele blok en slaagt deze test ook mét de
    // fout erin — precies wat een mutatietest liet zien voor ik dit budget toevoegde.
    const huurMetCategorie = { ...huur, categorieId: 'ov-woning-en-vaste-lasten' }
    toon(
      [huurMetCategorie],
      [
        { id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 },
        { id: 'b2', categorieId: 'ov-woning-en-vaste-lasten', bedrag: 100000, maand: '2026-12' },
      ],
      '2026-07',
    )
    expect(document.querySelector('[data-nog-nergens]')).not.toBeNull()
    // ⚠ EERST VASTSTELLEN DAT ER IETS STAAT (doorlichting ronde 94). `zin()` geeft een lege
    // tekenreeks zodra `.rij-meta` er niet is, en een lege tekenreeks bevat "mogelijk twee
    // keer" ook niet — dan slaagt de regel hieronder zonder ook maar iets te bewaken.
    expect(zin()).toMatch(/te verdelen/)
    expect(zin()).not.toMatch(/mogelijk twee keer/)
  })

  it('kapt de namenlijst af in plaats van er acht achter elkaar te zetten', () => {
    // De grens ligt in `namenlijst` (utils/namenlijst.ts). Zonder haar groeit deze
    // grijze regel met elke vaste last die in een budget valt.
    const posten = ['Huur', 'Elektriciteit', 'Water', 'Internet', 'Verzekering'].map((naam, i) => ({
      ...huur,
      id: `p${i}`,
      omschrijving: naam,
      categorieId: 'ov-woning-en-vaste-lasten',
    }))
    toon(posten, [{ id: 'b1', categorieId: 'ov-woning-en-vaste-lasten', bedrag: 100000 }])
    expect(zin()).toMatch(/en 2 andere/)
    expect(zin()).not.toMatch(/Verzekering/)
  })

  it('houdt de badge neutraal zolang er een dubbeltelling in kan zitten', () => {
    // € 1.450 te verdelen, € 1.450 aan budgetten → zonder overlap groen "Alles
    // ondergebracht". Mét overlap kan dat cijfer te laag staan, en dan mag de badge
    // geen "in orde" beloven dat ze niet kan waarmaken.
    const huurMetCategorie = { ...huur, categorieId: 'ov-woning-en-vaste-lasten' }
    toon([huurMetCategorie], [{ id: 'b1', categorieId: 'ov-woning-en-vaste-lasten', bedrag: 145000 }])
    expect(document.querySelector('[data-nog-nergens] .badge')?.className).toContain('badge-info')
    expect(document.querySelector('[data-nog-nergens] .badge')?.className).not.toContain('badge-ok')
  })

  it('schrijft bij meer dan één post een meervoudszin', () => {
    // "Huur, Elektriciteit valt ook onder een van je budgetten" zou fout staan.
    const huurMetCategorie = { ...huur, categorieId: 'ov-woning-en-vaste-lasten' }
    const elek = { ...huur, id: 'e', omschrijving: 'Elektriciteit', categorieId: 'cat-energie-en-nutsvoorzieningen' }
    toon([huurMetCategorie, elek], [{ id: 'b1', categorieId: 'ov-woning-en-vaste-lasten', bedrag: 100000 }])
    expect(zin()).toMatch(/vallen ook onder je budgetten/)
    expect(zin()).not.toMatch(/valt ook onder een van je budgetten/)
  })

  it('zwijgt over dubbeltelling wanneer het budget een andere categorie is', () => {
    const huurMetCategorie = { ...huur, categorieId: 'ov-woning-en-vaste-lasten' }
    toon([huurMetCategorie], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }])
    // ⚠ Zonder deze eerste regel bewaakt de tweede niets: staat de hele regel er niet, dan
    // geeft `zin()` een lege tekenreeks terug en slaagt "bevat het niet" vanzelf.
    expect(zin()).toMatch(/te verdelen/)
    expect(zin()).not.toMatch(/mogelijk twee keer/)
  })
})
