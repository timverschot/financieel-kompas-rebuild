import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ToekomstlastenKaart, ToekomstlastenWidget } from './ToekomstLasten'
import type { TerugkerendePost } from '../data/schema'
import { formatEuro } from '../utils/format'

// ⚠ Bedragen NOOIT als letterlijke tekst vergelijken: `formatEuro` zet een vaste
// spatie (U+00A0) tussen het euroteken en het getal, en die ziet er in een
// testbestand precies uit als een gewone spatie. Vier tests hier meldden daardoor
// ooit "expected 'maart 2027: € 1.570,00' to be 'maart 2027: € 1.570,00'".

const NU = '2026-08'

const huur: TerugkerendePost = { id: 'huur', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
const premie: TerugkerendePost = {
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -62000,
  rekeningId: 'r1',
  dag: 5,
  frequentie: 'jaar',
  startMaand: '2027-03',
}

function toonKaart(posten: TerugkerendePost[], onNaarVast?: () => void) {
  return render(<ToekomstlastenKaart terugkerendePosten={posten} beginMaand={NU} onNaarVast={onNaarVast} />)
}

/** De toegankelijke naam van elke staaf; dat is wat een schermlezer voorleest. */
function staafnamen(): string[] {
  return screen.getAllByRole('img').map((el) => el.getAttribute('aria-label') ?? '')
}

function tekstVan(kenmerk: string): string {
  return document.querySelector(`[${kenmerk}]`)?.textContent ?? ''
}

function knop(naam: RegExp): HTMLElement {
  return screen.getByRole('button', { name: naam })
}

describe('ToekomstlastenKaart', () => {
  it('noemt in het bijschrift precies de twaalf maanden die je ziet', () => {
    // ⚠ De eindmaand is INCLUSIEF: augustus t.e.m. juli is twaalf maanden. Eén maand
    // ernaast en het bijschrift belooft er dertien.
    toonKaart([huur])
    const kop = screen.getByRole('heading', { name: 'Wat komt eraan' }).closest('section') as HTMLElement
    expect(kop.querySelector('.kaart-bijschrift')?.textContent).toBe(
      'Je vaste lasten per maand, augustus 2026 – juli 2027.',
    )
  })

  it('tekent twaalf staven, één per maand, met het jaar erbij', () => {
    toonKaart([huur])
    const namen = staafnamen()
    expect(namen).toHaveLength(12)
    // ⚠ Het JAAR hoort in de naam. Zonder jaartal zijn de twaalf namen van het
    // volgende venster identiek aan die van dit venster, en dan verandert er voor
    // voorleessoftware hoorbaar niets wanneer je doorbladert.
    expect(namen[0]).toContain('augustus 2026')
    expect(namen[11]).toContain('juli 2027')
  })

  it('zet de jaarpremie met haar volle bedrag in haar eigen maand', () => {
    toonKaart([huur, premie])
    // € 950 huur + € 620 premie. Niet € 950 + € 51,67: de staaf toont wat er die
    // maand van je rekening gaat, niet wat het je gemiddeld kost.
    expect(staafnamen().find((n) => n.startsWith('maart 2027'))).toContain(formatEuro(157000))
    expect(staafnamen().find((n) => n.startsWith('april 2027'))).toContain(formatEuro(95000))
  })

  it('noemt de zwaarste maand met naam en bedrag', () => {
    toonKaart([huur, premie])
    expect(tekstVan('data-zwaarste')).toContain('maart 2027')
    expect(tekstVan('data-zwaarste')).toContain(formatEuro(157000))
    // ⚠ En het is de ENKELVOUDSZIN. De meervoudszin noemt óók een maand en een bedrag,
    // dus zonder deze regel kon de enkelvoudstak verdwijnen en zei de app "1 maanden
    // zijn even zwaar" zonder dat er iets rood werd.
    expect(tekstVan('data-zwaarste')).toContain('Je zwaarste maand is')
    expect(tekstVan('data-zwaarste')).not.toContain('even zwaar')
  })

  it('noemt ALLE maanden die even zwaar zijn, niet alleen de eerste', () => {
    // ⚠ Een halfjaarlijkse premie geeft twee even zware maanden. "Je zwaarste maand is
    // september" leest als een unieke piek; wie daarvoor spaarde, liep in maart tegen
    // exact hetzelfde bedrag aan zonder dat de app het ooit genoemd had.
    const semester: TerugkerendePost = { ...premie, id: 'sem', frequentie: 'semester', startMaand: '2026-09' }
    toonKaart([huur, semester])
    const zin = tekstVan('data-zwaarste')
    expect(zin).toContain('2')
    expect(zin).toContain('september 2026')
    expect(zin).not.toContain('zwaarste maand is')
    expect(zin).not.toContain('Van wat de app kan plaatsen')
  })

  it('spreekt niet van een zwaarste maand wanneer elke maand hetzelfde kost', () => {
    toonKaart([huur])
    expect(tekstVan('data-zwaarste')).toContain('evenveel')
    expect(tekstVan('data-zwaarste')).not.toContain('zwaarste')
    // ⚠ En ZONDER voorbehoud: er ontbreekt niets, dus "van wat de app kan plaatsen"
    // zou een tekortkoming suggereren die er niet is.
    expect(tekstVan('data-zwaarste')).not.toContain('Van wat de app kan plaatsen')
  })

  it('zegt waar de staven vandaan komen en wat er niet in zit', () => {
    toonKaart([huur])
    const bron = tekstVan('data-toekomstbron')
    expect(bron).toContain('volle bedrag')
    expect(bron).toContain('inkomsten')
    // ⚠ Wat je APART bijhoudt — bij Leningen, bij een onderhoudsbijdrage, bij de
    // kindrekening of bij een spaardoel — zit er niet in. Wie € 400 aflossing en € 650
    // bijdrage betaalt, leest anders een grafiek die er duizend euro per maand naast
    // zit zonder dat iets het zegt. En het gaat om wat je apart bijhoudt, niet om de
    // soort kost: zet je je woonkrediet gewoon bij je vaste lasten, dan staat het wél
    // in de staven, en dan mag de zin niet beweren dat leningen er niet in zitten.
    expect(bron).toContain('apart bijhoudt')
    expect(bron).toContain('Leningen')
    expect(bron).toContain('onderhoudsbijdrage')
  })

  it('deelt het gemiddelde door twaalf, ook als er maanden op nul staan', () => {
    // ⚠ Delen door het aantal NIET-lege maanden zou een heel ander getal geven, en het
    // bijschrift belooft "over deze twaalf maanden". Eén jaarpremie van € 620 komt
    // uit op € 51,67 per maand, niet op € 620.
    toonKaart([premie])
    expect(tekstVan('data-gemiddelde')).toContain(formatEuro(Math.round(62000 / 12)))
  })

  it('kondigt de piekzin aan wanneer je doorbladert', () => {
    // Het bijschrift van de kaart is geen live gebied en de maandnamen van het volgende
    // venster klinken hetzelfde; zonder dit hoort een schermlezer niets veranderen.
    toonKaart([huur])
    expect(document.querySelector('[data-zwaarste]')?.getAttribute('role')).toBe('status')
  })

  it('geeft de streepjeslijn een naam', () => {
    // Een lijn zonder bijschrift is een lijn zonder betekenis — en verwarbaar met het
    // ándere gemiddelde dat de app kent, dat op de Plan-pagina over het hele jaar gaat.
    toonKaart([huur])
    expect(tekstVan('data-gemiddelde')).toContain(formatEuro(95000))
    // ⚠ Zowel het BEREIK als de PERIODE moeten uit de zin zelf blijken. Op het
    // Overzicht staat vlak erboven een tweede streepjeslijn ("Gemiddeld … per maand")
    // die over álle uitgaven gaat en zes maanden terugkijkt.
    expect(tekstVan('data-gemiddelde')).toContain('aan vaste lasten')
    expect(tekstVan('data-gemiddelde')).toContain('twaalf maanden')
  })

  it('tekent geen gemiddelde-lijn in een venster waarin niets valt', () => {
    const laat: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2029-05' }
    toonKaart([laat])
    expect(document.querySelector('[data-gemiddelde]')).toBeNull()
    expect(document.querySelector('.toekomst-gemiddelde')).toBeNull()
  })

  it('houdt een klein bedrag naast een jaarpremie zichtbaar', () => {
    // € 12 naast € 1.200 is één procent van de hoogte; zonder ondergrens is dat geen
    // streepje meer maar niets.
    const klein: TerugkerendePost = { id: 'klein', omschrijving: 'App', bedrag: -1200, rekeningId: 'r1', dag: 8 }
    const groot: TerugkerendePost = { ...premie, id: 'groot', bedrag: -120000, startMaand: '2026-08' }
    toonKaart([klein, groot])
    const staven = Array.from(document.querySelectorAll('.toekomst-staaf')) as HTMLElement[]
    expect(staven[1].style.minHeight).toBe('3px')
    expect(staven[1].style.height).toBe('1%')

  })

  it('geeft elke staaf de klassen die haar animeren en laten printen', () => {
    // ⚠ `print-kleur` staat in de uitzonderingslijst van de printregel die álle
    // achtergronden weghaalt. Zonder die klasse drukt de grafiek af als een leeg kader.
    toonKaart([huur])
    const staaf = document.querySelector('.toekomst-staaf') as HTMLElement
    expect(staaf.classList.contains('print-kleur')).toBe(true)
    expect(staaf.classList.contains('staaf-in')).toBe(true)
  })

  it('laat terugkerende inkomsten buiten beeld', () => {
    const loon: TerugkerendePost = { id: 'loon', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', dag: 25 }
    toonKaart([loon, huur])
    expect(staafnamen().every((n) => n.includes(formatEuro(95000)))).toBe(true)
  })

  it('vraagt om vaste lasten wanneer je er nog geen hebt, zonder tweede knop', () => {
    // ⚠ Bij NUL terugkerende posten draagt de kaart hierboven op ditzelfde tabblad al
    // een knop "Vul je vaste lasten in". Twee knoppen met dezelfde naam op één scherm
    // zijn voor voorleessoftware twee identieke regels die naar dezelfde plek gaan.
    toonKaart([], () => {})
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText(/Zodra je vaste lasten hebt ingevuld/)).toBeTruthy()
  })

  it('geeft WEL een eerste stap wanneer je alleen een vast inkomen hebt', () => {
    // ⚠ De buurkaart toont haar knop alleen bij nul terugkerende posten. Vulde je enkel
    // je loon in, dan stond hier een uitnodiging zonder knop en op het hele tabblad
    // geen enkele weg vooruit — precies de toestand waarin een wegwijzer het hardst
    // nodig is.
    const loon: TerugkerendePost = { id: 'loon', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', dag: 25 }
    const naarVast = vi.fn()
    toonKaart([loon], naarVast)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    screen.getByRole('button', { name: /vaste lasten/i }).click()
    expect(naarVast).toHaveBeenCalledTimes(1)
  })

  it('vertelt welke posten niet in de grafiek staan en waarom', () => {
    const zwerver: TerugkerendePost = {
      id: 'zw',
      omschrijving: 'Onroerende voorheffing',
      bedrag: -80000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
    }
    toonKaart([huur, zwerver])
    expect(tekstVan('data-ontbreken')).toContain('Onroerende voorheffing')
  })

  it('zwijgt over ontbrekende posten wanneer alles geplaatst kan worden', () => {
    toonKaart([huur, premie])
    expect(document.querySelector('[data-ontbreken]')).toBeNull()
  })

  it('zwijgt over een ontbrekende post in een venster waar ze al gestopt was', async () => {
    // ⚠ Deze zin keek naar de BEGINMAAND in plaats van naar het venster dat je bekijkt.
    // Een post die in 2027 stopte, kon in het venster van 2028 niets meer missen — en
    // toch meldde de app daar dat er iets ontbrak.
    const zwerver: TerugkerendePost = {
      id: 'zw',
      omschrijving: 'Onroerende voorheffing',
      bedrag: -80000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      eindMaand: '2027-01',
    }
    const langlopend: TerugkerendePost = { ...premie, id: 'lang', startMaand: '2028-04' }
    toonKaart([huur, zwerver, langlopend])
    expect(tekstVan('data-ontbreken')).toContain('Onroerende voorheffing')

    // Een venster verder is januari 2027 lang voorbij: daar kan die post niets meer
    // missen, dus hoort de zin te verdwijnen.
    await userEvent.setup().click(knop(/Volgende twaalf maanden/))
    expect(document.querySelector('[data-ontbreken]')).toBeNull()
  })
})

describe('ToekomstlastenKaart — de maandnamen en de lopende maand', () => {
  it('schrijft op een smal scherm alleen om de drie maanden een naam', async () => {
    // ⚠ NAGEMETEN: op een telefoon van 360 px is er ongeveer 20 px per kolom, en "sep"
    // vraagt er 21 — het Franse "sept." zelfs 29. Twaalf namen naast elkaar werden aan
    // beide kanten geklemd: je las "eptembe". De andere maanden lees je af aan hun
    // plaats; elke staaf draagt zijn volledige naam in zijn eigen label.
    toonKaart([huur])
    const smal = Array.from(document.querySelectorAll('.toekomst-naam .alleen-smal')).map((e) => e.textContent)
    expect(smal).toEqual(['aug', '', '', 'nov', '', '', 'feb', '', '', 'mei', '', ''])
    // Op een breed scherm staan ze er alle twaalf, ook als afkorting: "september"
    // paste daar evenmin.
    const breed = Array.from(document.querySelectorAll('.toekomst-naam .alleen-breed')).map((e) => e.textContent)
    expect(breed.filter((tekst) => tekst !== '')).toHaveLength(12)
  })

  it('merkt de lopende maand NIET aan wanneer er die maand niets vervalt', () => {
    // ⚠ Er is dan geen staaf, en er is dus ook niets van betaald. De kaart drukte toch
    // af dat een deel van die staaf misschien al betaald was.
    const laterDitJaar: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2026-12' }
    toonKaart([laterDitJaar])
    expect(screen.queryByText(/augustus loopt al/)).toBeNull()
    expect(staafnamen()[0]).toBe('augustus 2026: geen vaste lasten')
    // ⚠ Twee spans per cel — één voor smalle, één voor brede schermen; CSS verbergt er
    // altijd precies één. In jsdom staan ze allebei in de DOM, dus we kijken naar de
    // twee apart in plaats van naar de samengeplakte tekst.
    const eerste = document.querySelector('.toekomst-naam') as HTMLElement
    expect(eerste.querySelector('.alleen-smal')?.textContent).toBe('aug')
    expect(eerste.querySelector('.alleen-breed')?.textContent).toBe('aug')
    expect(eerste.textContent).not.toContain('*')
    // En de staaf staat niet lichter: er is niets om lichter te zetten. ⚠ Ze krijgt
    // ook géén streepje van 3 px — anders is "niets" niet te onderscheiden van
    // "twaalf euro".
    const staven = Array.from(document.querySelectorAll('.toekomst-staaf')) as HTMLElement[]
    expect(staven[0].style.opacity).toBe('1')
    expect(staven[0].style.height).toBe('0%')
    expect(staven[0].style.minHeight).toBe('0')
  })
})

describe('ToekomstlastenKaart — lange lijsten', () => {
  function veelPosten(aantal: number): TerugkerendePost[] {
    return Array.from({ length: aantal }, (_, i) => ({
      id: `p${i}`,
      omschrijving: `Verzekering ${i + 1}`,
      bedrag: -10000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar' as const,
    }))
  }

  it('kapt de opsomming van ontbrekende posten af en zegt hoeveel er nog zijn', () => {
    // ⚠ Zonder grens somde deze zin er veertig achter elkaar op: 1.845 tekens in één
    // alinea. Stil afkappen zou lezen als "dit is alles", dus wat wegvalt wordt geteld.
    toonKaart(veelPosten(10))
    const zin = tekstVan('data-ontbreken')
    expect(zin).toContain('Verzekering 1, Verzekering 2, Verzekering 3')
    expect(zin).toContain('7 andere')
    expect(zin).not.toContain('Verzekering 4')
  })

  it('kapt ook de opsomming in een maandrij af', async () => {
    // Zestig kwartaalposten in dezelfde maand gaven één lijstrij van 2.731 tekens, en
    // dan wordt het bedrag rechts de kaart uit geduwd.
    const veel = veelPosten(8).map((p) => ({ ...p, startMaand: '2026-08' }))
    toonKaart(veel)
    await userEvent.setup().click(knop(/Toon per maand/))
    const rij = document.querySelector('.lijst > .rij') as HTMLElement
    expect(rij.textContent).toContain('5 andere')
    expect(rij.textContent).not.toContain('Verzekering 4')
  })
})

describe('ToekomstlastenKaart — doorbladeren', () => {
  it('laat je niet vooruit wanneer alles maandelijks doorloopt, en zegt waarom', () => {
    toonKaart([huur])
    const verder = knop(/Volgende twaalf maanden/)
    // ⚠ `aria-disabled` en niet `disabled` — huisregel sinds ronde 41. Met `disabled`
    // valt de focus na de laatste klik naar de pagina, precies bij de knop waarmee je
    // aan het bladeren was.
    expect(verder.getAttribute('aria-disabled')).toBe('true')
    expect(verder.hasAttribute('disabled')).toBe(false)
    expect(verder.getAttribute('aria-describedby')).toBe('toekomst-einde')
    expect(tekstVan('data-einde')).toContain('herhaalt elk jaar zich')
  })

  it('zegt dat er NIETS meer komt wanneer alles een keer ophoudt', () => {
    // ⚠ Eén zin voor twee tegengestelde gevallen was gewoon onwaar. "Vanaf hier
    // herhaalt elk jaar zich" stond onder vijf staven die zichtbaar op nul stonden.
    const eindigt: TerugkerendePost = { ...huur, id: 'eind', eindMaand: '2027-03' }
    toonKaart([eindigt])
    expect(tekstVan('data-einde')).toContain('februari 2027')
    expect(tekstVan('data-einde')).not.toContain('herhaalt')
  })

  it('merkt de lopende maand aan, en alleen zolang ze in beeld staat', async () => {
    const laat: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2028-05' }
    toonKaart([huur, laat])
    expect(screen.getByText(/augustus loopt al/)).toBeTruthy()
    expect(staafnamen()[0]).toContain('deze maand loopt al')
    // Het sterretje waar die voetnoot naar verwijst, staat er ook echt.
    expect(document.querySelector('.toekomst-naam')?.textContent).toContain('*')
    const staven = Array.from(document.querySelectorAll('.toekomst-staaf')) as HTMLElement[]
    expect(staven[0].style.opacity).toBe('0.55')
    expect(staven[1].style.opacity).toBe('1')

    await userEvent.setup().click(knop(/Volgende twaalf maanden/))
    expect(screen.queryByText(/augustus loopt al/)).toBeNull()
  })

  it('hangt de reden alleen aan de knop zolang die niets kan', async () => {
    // ⚠ Zou `aria-describedby` er altijd staan, dan wees hij naar een alinea die alleen
    // bij een geblokkeerde knop getekend wordt — een verwijzing naar niets.
    const laat: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2028-05' }
    toonKaart([huur, laat])
    expect(knop(/Volgende twaalf maanden/).getAttribute('aria-describedby')).toBeNull()
    expect(document.querySelector('[data-einde]')).toBeNull()

    const gebruiker = userEvent.setup()
    await gebruiker.click(knop(/Volgende twaalf maanden/))
    expect(knop(/Volgende twaalf maanden/).getAttribute('aria-describedby')).toBeNull()
    await gebruiker.click(knop(/Volgende twaalf maanden/))
    expect(knop(/Volgende twaalf maanden/).getAttribute('aria-describedby')).toBe('toekomst-einde')
  })

  it('bladert naar het volgende jaar en terug', async () => {
    const laat: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2028-05' }
    toonKaart([huur, laat])
    const gebruiker = userEvent.setup()

    await gebruiker.click(knop(/Volgende twaalf maanden/))
    expect(staafnamen()[0]).toContain('augustus 2027')
    const terug = knop(/Vorige twaalf maanden/)
    expect(terug.getAttribute('aria-disabled')).toBe('false')

    await gebruiker.click(terug)
    expect(staafnamen()[0]).toContain('augustus 2026')
    expect(knop(/Vorige twaalf maanden/).getAttribute('aria-disabled')).toBe('true')
  })

  it('doet niets wanneer je op een knop klikt die niet meer verder kan', async () => {
    // `aria-disabled` houdt de knop bereikbaar, dus de klik komt binnen; de handler
    // moet hem zelf tegenhouden. BEIDE knoppen: met alleen de terugknop hier bleef de
    // vooruitknop een gat, en dan kon je met een maandelijkse huur oneindig ver
    // doorbladeren langs de horizon heen.
    const gebruiker = userEvent.setup()
    toonKaart([huur])
    await gebruiker.click(knop(/Vorige twaalf maanden/))
    expect(staafnamen()[0]).toContain('augustus 2026')
    await gebruiker.click(knop(/Volgende twaalf maanden/))
    expect(staafnamen()[0]).toContain('augustus 2026')
  })

  it('laat je door een leeg jaar heen naar de maand die je zoekt', async () => {
    // ⚠ Hier stond eerst een tweede controle ("valt er in dat venster wel iets?").
    // Ze leek veiliger en sloot precies deze weg af: de vensters van 2027 en 2028
    // zijn leeg, dus je kon nooit bij mei 2029 komen.
    const laat: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2029-05' }
    toonKaart([laat])
    const gebruiker = userEvent.setup()

    await gebruiker.click(knop(/Volgende twaalf maanden/))
    expect(tekstVan('data-zwaarste')).toBe('In deze twaalf maanden vervalt er geen enkele vaste last.')
    expect(staafnamen()[0]).toBe('augustus 2027: geen vaste lasten')
    await gebruiker.click(knop(/Volgende twaalf maanden/))
    // Twee vensters verder loopt augustus 2028 t.e.m. juli 2029, en dáár staat mei 2029.
    expect(staafnamen().find((n) => n.startsWith('mei 2029'))).toContain(formatEuro(62000))
  })
})

describe('ToekomstlastenKaart — wat de app niet kan plaatsen', () => {
  const zwerver: TerugkerendePost = {
    id: 'zw',
    omschrijving: 'Brandverzekering',
    bedrag: -120000,
    rekeningId: 'r1',
    dag: 5,
    frequentie: 'jaar',
  }

  it('beweert niet dat er niets vervalt wanneer ze een post niet kan plaatsen', () => {
    // ⚠ Een jaarpremie valt per definitie één keer in élke twaalf maanden. "Er vervalt
    // geen enkele vaste last" is dan aantoonbaar fout — en wordt bovendien
    // tegengesproken door de zin die er pal onder staat.
    toonKaart([zwerver])
    expect(tekstVan('data-zwaarste')).toBe(
      'In deze twaalf maanden vervalt er geen enkele vaste last waarvan de app de maand kent.',
    )
    expect(tekstVan('data-ontbreken')).toContain('Brandverzekering')
  })

  it('zegt niet dat elke maand evenveel kost wanneer ze er een niet kan plaatsen', () => {
    // ⚠ "Elke maand kost je evenveel: € 950" is aantoonbaar onwaar wanneer er ergens
    // nog € 1.200 bij komt — en die zin wordt tegengesproken door de regel eronder.
    toonKaart([huur, zwerver])
    expect(tekstVan('data-zwaarste')).toContain('Van wat de app kan plaatsen')
    expect(tekstVan('data-zwaarste')).not.toContain('Elke maand kost je evenveel')
  })

  it('houdt datzelfde voorbehoud bij een piek en bij een gelijkstand', () => {
    toonKaart([huur, premie, zwerver])
    expect(tekstVan('data-zwaarste')).toContain('Van wat de app kan plaatsen')
    expect(tekstVan('data-zwaarste')).toContain('maart 2027')
    expect(tekstVan('data-zwaarste')).not.toContain('Je zwaarste maand is')

    const semester: TerugkerendePost = { ...premie, id: 'sem', frequentie: 'semester', startMaand: '2026-09' }
    document.body.innerHTML = ''
    toonKaart([huur, semester, zwerver])
    expect(tekstVan('data-zwaarste')).toContain('Van wat de app kan plaatsen')
    expect(tekstVan('data-zwaarste')).toContain('2')
  })

  it('noemt het einde van je vaste lasten óók wanneer ze er een niet kan plaatsen', () => {
    // ⚠ De ontbreken-tak stond eerst vóór de stopt-tak, en dan verving een vage zin de
    // enige mededeling die telde: je huur houdt op. Nu staan ze allebei in de zin.
    const eindigt: TerugkerendePost = { ...huur, id: 'eind', eindMaand: '2027-03' }
    toonKaart([eindigt, zwerver])
    const zin = tekstVan('data-einde')
    expect(zin).toContain('februari 2027')
    expect(zin).toContain('kan ze niets zeggen')
    // ⚠ En niet "vanaf hier herhaalt elk jaar zich": vanaf maart 2027 staat de grafiek
    // op nul, dus die zin zou het omgekeerde beweren van wat er gebeurt.
    expect(zin).not.toContain('herhaalt')
  })

  it('geeft ook bij een leeg venster een reden waarom de knoppen niets doen', () => {
    // ⚠ Beide knoppen stonden op slot ZONDER uitleg: een knop die niets doet en niets
    // zegt. De kaart tekent zich hier wél helemaal uit, want de post bestáát — hij
    // vervalt alleen nooit (opgezegd vóór zijn eerste betaling).
    const nooit: TerugkerendePost = { ...premie, id: 'nooit', startMaand: '2027-03', eindMaand: '2026-12' }
    toonKaart([nooit])
    expect(knop(/Volgende twaalf maanden/).getAttribute('aria-describedby')).toBe('toekomst-einde')
    expect(tekstVan('data-einde')).toBe('Verder vooruit verandert er niets meer.')
    expect(document.querySelector('[data-ontbreken]')).toBeNull()
  })
})

describe('ToekomstlastenKaart — de lijst per maand', () => {
  it('staat dicht tot je hem opent', async () => {
    toonKaart([huur, premie])
    const uitklap = knop(/Toon per maand/)
    expect(uitklap.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('.lijst')).toBeNull()

    await userEvent.setup().click(uitklap)
    expect(uitklap.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelectorAll('.lijst > .rij')).toHaveLength(12)
  })

  it('noemt in elke maand wat er bovenop je maandelijkse kosten komt', async () => {
    toonKaart([huur, premie])
    await userEvent.setup().click(knop(/Toon per maand/))
    const rijen = Array.from(document.querySelectorAll('.lijst > .rij')) as HTMLElement[]
    const maart = rijen.find((r) => r.textContent?.includes('maart 2027'))
    expect(maart).toBeTruthy()
    expect(within(maart as HTMLElement).getByText(/Autoverzekering/)).toBeTruthy()
    // April kent alleen de huur; die staat elke maand en is dus geen bijzonderheid.
    // ⚠ Ook op "waaronder" en op "Huur" controleren: zou élke post als bijzonder
    // gelden, dan stond er twaalf keer "waaronder Huur" — precies de ruis die deze
    // regel moet weren — en de test zou dat niet gemerkt hebben.
    const april = rijen.find((r) => r.textContent?.includes('april 2027'))
    expect(april?.textContent).not.toContain('Autoverzekering')
    expect(april?.textContent).not.toContain('waaronder')
    expect(april?.textContent).not.toContain('Huur')
  })

  it('zegt bij een maand zonder vaste lasten dat er niets valt', async () => {
    const laat: TerugkerendePost = { ...premie, id: 'laat', startMaand: '2027-03' }
    toonKaart([laat])
    await userEvent.setup().click(knop(/Toon per maand/))
    const rijen = Array.from(document.querySelectorAll('.lijst > .rij')) as HTMLElement[]
    const augustus = rijen.find((r) => r.textContent?.includes('augustus 2026'))
    expect(augustus?.textContent).toContain('geen vaste lasten')
  })

  it('laat "waaronder" weg wanneer de opsomming volledig is', async () => {
    // "waaronder" betekent "onder andere". Is er die maand niets anders, dan
    // suggereert het woord ten onrechte dat er meer achter zit.
    toonKaart([premie])
    await userEvent.setup().click(knop(/Toon per maand/))
    const rijen = Array.from(document.querySelectorAll('.lijst > .rij')) as HTMLElement[]
    const maart = rijen.find((r) => r.textContent?.includes('maart 2027')) as HTMLElement
    expect(maart.textContent).toContain('Autoverzekering')
    expect(maart.textContent).not.toContain('waaronder')
  })

  it('wisselt de tekst van de uitklapknop mee', async () => {
    toonKaart([huur])
    const gebruiker = userEvent.setup()
    await gebruiker.click(knop(/Toon per maand/))
    expect(screen.queryByRole('button', { name: /Toon per maand/ })).toBeNull()
    await gebruiker.click(knop(/Verberg per maand/))
    expect(knop(/Toon per maand/)).toBeTruthy()
  })
})

describe('ToekomstlastenKaart — de maand die omrolt', () => {
  it('schuift het venster mee wanneer de beginmaand verandert', () => {
    // De app kan een nacht openstaan. Zonder deze hersynchronisatie bleef de kaart in
    // de oude maand hangen, en stond "Vorige" op slot omdat het venster gelijk leek
    // aan het begin.
    const { rerender } = render(<ToekomstlastenKaart terugkerendePosten={[huur]} beginMaand={NU} />)
    expect(staafnamen()[0]).toContain('augustus 2026')
    rerender(<ToekomstlastenKaart terugkerendePosten={[huur]} beginMaand="2026-09" />)
    expect(staafnamen()[0]).toContain('september 2026')
    expect(knop(/Vorige twaalf maanden/).getAttribute('aria-disabled')).toBe('true')
  })

  it('draagt het aanknopingspunt waar het Overzicht naartoe schuift', () => {
    toonKaart([huur])
    expect(document.querySelector('[data-toekomstkaart]')).not.toBeNull()
  })
})

describe('ToekomstlastenWidget', () => {
  it('tekent zichzelf niet wanneer er niets te tonen valt', () => {
    const { container } = render(
      <ToekomstlastenWidget terugkerendePosten={[]} beginMaand={NU} onNaarVooruitblik={() => {}} />,
    )
    expect(container.textContent).toBe('')
  })

  it('rekent haar gemiddelde over twaalf maanden, net als de kaart', () => {
    // Eén jaarpremie van € 620 kost gemiddeld € 51,67 per maand, niet € 620.
    render(<ToekomstlastenWidget terugkerendePosten={[premie]} beginMaand={NU} onNaarVooruitblik={() => {}} />)
    expect(tekstVan('data-gemiddelde')).toContain(formatEuro(Math.round(62000 / 12)))
  })

  it('zwijgt NIET wanneer ze van elke vaste last de maand mist', () => {
    // ⚠ Het totaal is dan nul en de kaart verdween spoorloos van de startpagina —
    // precies op het moment dat ze iets te melden had. De waarschuwing stond dan alleen
    // op Analyse, waar je zelf naartoe moest.
    const zwerver: TerugkerendePost = {
      id: 'zw',
      omschrijving: 'Brandverzekering',
      bedrag: -120000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
    }
    render(<ToekomstlastenWidget terugkerendePosten={[zwerver]} beginMaand={NU} onNaarVooruitblik={() => {}} />)
    expect(tekstVan('data-ontbreken')).toContain('1')
    expect(screen.getByRole('button', { name: /Bekijk vooruit/ })).toBeTruthy()
    // ⚠ Maar zonder staven: twaalf kolommen op nul zijn op de startpagina een leeg
    // kader van 132 px waar de zinnen eronder het werk doen.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('toont de staven met de herkomst, één zin en een weg naar het volledige beeld', async () => {
    const naarVooruit = vi.fn()
    render(<ToekomstlastenWidget terugkerendePosten={[huur, premie]} beginMaand={NU} onNaarVooruitblik={naarVooruit} />)
    expect(screen.getAllByRole('img')).toHaveLength(12)
    expect(tekstVan('data-widget-zwaarste')).toContain('maart 2027')
    // ⚠ Deze kaart staat op het Overzicht onder "Inkomsten en uitgaven per maand",
    // een grafiek die wél alles bevat. Zonder deze zin staan er twee staafgrafieken
    // op verschillende schaal onder elkaar, waarvan de nieuwste zonder uitleg.
    expect(tekstVan('data-widgetbron')).toContain('Alleen wat je bij je vaste lasten invulde')

    await userEvent.setup().click(knop(/Bekijk vooruit/))
    expect(naarVooruit).toHaveBeenCalledTimes(1)
  })

  it('verzwijgt ook hier niet dat er posten buiten de grafiek vallen', () => {
    const zwerver: TerugkerendePost = {
      id: 'zw',
      omschrijving: 'Onroerende voorheffing',
      bedrag: -80000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
    }
    render(
      <ToekomstlastenWidget terugkerendePosten={[huur, zwerver]} beginMaand={NU} onNaarVooruitblik={() => {}} />,
    )
    // ⚠ De KORTE zin: op de startpagina hoort geen namenlijst die met veertig posten
    // een halve kaart vult. De weg naar de details is de knop "Bekijk vooruit".
    expect(tekstVan('data-ontbreken')).toContain('1')
    expect(tekstVan('data-ontbreken')).not.toContain('Onroerende voorheffing')
  })
})
