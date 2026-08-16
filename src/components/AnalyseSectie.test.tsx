import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AnalyseSectie } from './AnalyseSectie'
import type { Transactie } from '../data/schema'
import { vandaag, huidigeMaand } from '../utils/datum'
import { verschuifMaand } from '../utils/maandverloop'

const rekeningen = [{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]
const recent = vandaag()

const tx = (id: string, categorieId: string, bedrag: number, omschrijving = 'Winkel'): Transactie => ({
  id,
  datum: recent,
  omschrijving,
  bedrag,
  rekeningId: 'r1',
  categorieId,
})

function toon(transacties: Transactie[]) {
  render(
    <AnalyseSectie
      transacties={transacties}
      categorieen={[]}
      rekeningen={rekeningen}
      overboekingen={[]}
      waarderingen={[]}
      terugkerendePosten={[]}
    />,
  )
}

// 'i-brood--wit-9238' valt onder Voeding; we nemen daarnaast een uitgave op een
// andere hoofdcategorie zodat de ranglijst twee rijen heeft.
const boodschappen = tx('a', 'i-brood--wit-9238', -7500, 'Colruyt')
const tanken = tx('b', 'ov-vervoer-en-mobiliteit', -2500, 'Q8')

function kaart(titel: string): HTMLElement {
  return screen.getByText(titel).closest('section.kaart') as HTMLElement
}

describe('AnalyseSectie — verdeling en ranglijst', () => {
  // Ronde 30: de donut en haar cijfers horen in ÉÉN kaart, met de lijst ernaast —
  // precies zoals de andere donutkaarten op deze pagina. Ronde 26 had er twee
  // losse kaarten van gemaakt, en dat was het enige plekje dat afweek.
  it('zet de donut en de ranglijst in één kaart, met de lijst ernaast', () => {
    toon([boodschappen, tanken])
    const k = kaart('Verdeling uitgaven')
    expect(screen.queryByText('Ranglijst')).toBeNull()
    expect(k.querySelector('.donut-naast')).not.toBeNull()
    // De donut én de aanklikbare rijen zitten in datzelfde raster.
    expect(within(k).getByRole('button', { name: 'Toon details van Voeding' })).toBeInTheDocument()
    expect(k.querySelector('svg')).not.toBeNull()
  })

  it('zet het totaal in dezelfde kaart', () => {
    toon([boodschappen, tanken])
    expect(within(kaart('Verdeling uitgaven')).getByText('Totaal')).toBeInTheDocument()
  })

  it('toont per rij het aandeel als een eigen kolom', () => {
    toon([boodschappen, tanken])
    // € 75 van € 100 = 75%, € 25 = 25%. Samen exact 100%.
    const pcts = kaart('Verdeling uitgaven').querySelectorAll('.rij-pct')
    expect([...pcts].map((el) => el.textContent)).toEqual(['75%', '25%'])
  })

  it('geeft elke ranglijstrij een zichtbare chevron', () => {
    toon([boodschappen, tanken])
    expect(kaart('Verdeling uitgaven').querySelectorAll('.rij-chevron')).toHaveLength(2)
  })

  it('klikt een rij open naar het detail', async () => {
    const user = userEvent.setup()
    toon([boodschappen, tanken])
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    expect(await screen.findByRole('button', { name: /Terug/ })).toBeInTheDocument()
  })

  // Ronde 32: de terugknop stond náást de paginatitel, dus helemaal bovenaan. Nu
  // staat ze op dezelfde rij als de periodekaartjes — de knoppen die je op deze
  // pagina toch al gebruikt.
  it('zet de terugknop bij de periodekaartjes en niet bij de paginatitel', async () => {
    const user = userEvent.setup()
    toon([boodschappen, tanken])
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))

    const terug = await screen.findByRole('button', { name: /Terug/ })
    const rij = terug.closest('.knoprij') as HTMLElement
    expect(rij).not.toBeNull()
    // Dezelfde rij bevat de periodekeuzes.
    expect(within(rij).getByRole('button', { name: 'Deze maand' })).toBeInTheDocument()
    // En ze staat NIET meer in de kop van de pagina.
    expect(terug.closest('h1')).toBeNull()
    expect(document.querySelector('.paginakop')?.parentElement?.contains(terug)).toBe(false)
  })

  it('toont één kaart met een lege toestand wanneer er niets is', () => {
    toon([])
    expect(screen.getByText('Geen uitgaven in deze periode')).toBeInTheDocument()
  })
})

describe('AnalyseSectie — legende naast de donut', () => {
  it('zet de legende in hetzelfde raster als de donut', () => {
    toon([boodschappen, tanken])
    // De kaart per product/dienst gebruikt .donut-naast: op een breed scherm
    // staat de legende ernaast in plaats van eronder.
    const perProduct = kaart('Verdeling per product/dienst')
    expect(perProduct.querySelector('.donut-naast')).not.toBeNull()
    expect(perProduct.querySelectorAll('.donut-naast .rij-pct').length).toBeGreaterThan(0)
  })
})

// Ronde 30: de knop "Toon alle 19 — incl. 9 overige" liet er MINDER zien.
// Oorzaak: de lijst kreeg bij het uitklappen een hoogte van 260 px met een eigen
// schuifbalk, dus tien volledig zichtbare rijen werden er negentien in een venster
// dat kleiner was dan daarvoor.
describe('AnalyseSectie — "toon alle" toont ook echt meer', () => {
  // Vijftien verschillende items binnen Voeding, met aflopende bedragen zodat de
  // volgorde vastligt en er dus een 'Overige'-schijf ontstaat.
  const items = [
    'i-brood--wit-9238',
    'i-brood--bruin-6023',
    'i-sandwiches-1736',
    'i-pistolets-9968',
    'i-wraps-2928',
    'i-pitabroodjes-1623',
    'i-knakbrood-3482',
    'i-crackers-2702',
    'i-rijstwafels-171',
    'i-belegde-broodjes-2217',
    'i-worstenbrood--curryrol-5080',
    'i-worstenbrood-speciaal--curryro-8286',
    'i-worstenbrood--klassiek-6316',
    'i-appelbol-5409',
    'i-x-stokbrood',
  ]
  const veel = items.map((id, i) => tx(`t${i}`, id, -(1000 - i * 10), `Winkel ${i}`))

  it('laat na het uitklappen meer rijen zien dan ervoor, zonder eigen schuifvenster', async () => {
    const user = userEvent.setup()
    toon(veel)
    const k = kaart('Verdeling per product/dienst')
    const lijst = k.querySelector('.donut-naast .lijst') as HTMLElement
    const voor = lijst.querySelectorAll('li').length

    await user.click(within(k).getByRole('button', { name: /^Toon alle/ }))

    const na = (k.querySelector('.donut-naast .lijst') as HTMLElement).querySelectorAll('li').length
    expect(na).toBeGreaterThan(voor)
    // En de lijst krijgt geen eigen hoogte meer: de kaart mag gewoon groeien.
    expect((k.querySelector('.donut-naast .lijst') as HTMLElement).style.maxHeight).toBe('')
  })
})

// --- Ronde 40: de klokken en het doorklikken ----------------------------------

function toonMet(transacties: Transactie[], over: Partial<React.ComponentProps<typeof AnalyseSectie>> = {}) {
  render(
    <AnalyseSectie
      transacties={transacties}
      categorieen={[]}
      rekeningen={rekeningen}
      overboekingen={[]}
      waarderingen={[]}
      terugkerendePosten={[]}
      {...over}
    />,
  )
}

describe('AnalyseSectie — de periodekaartjes volgen de maandschakelaar', () => {
  const nu = huidigeMaand()
  const vorige = verschuifMaand(nu, -1)

  it('noemt de kaartjes bij hun vertrouwde naam zolang je op deze maand staat', () => {
    toonMet([boodschappen])
    expect(screen.getByRole('button', { name: 'Deze maand' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vorige maand' })).toBeInTheDocument()
  })

  it('noemt de ECHTE maand zodra je terugbladert', () => {
    // Een kaartje "Deze maand" dat maart toont is precies het soort stille
    // onwaarheid dat deze ronde wegwerkt.
    toonMet([boodschappen], { ankerMaand: '2026-03' })
    expect(screen.queryByRole('button', { name: 'Deze maand' })).toBeNull()
    expect(screen.getByRole('button', { name: 'maart 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'februari 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument()
  })

  it('rekent op de gekozen maand en niet op vandaag', () => {
    // De boekingen staan in deze maand; ankeren we op de vorige, dan is er niets
    // te zien in plaats van "toevallig toch alles".
    toonMet([boodschappen, tanken], { ankerMaand: vorige })
    expect(screen.getByText('Geen uitgaven in deze periode')).toBeInTheDocument()
  })

  it('zet de maandschakelaar van de app in de paginakop', () => {
    toonMet([boodschappen], { maandNav: <button type="button">‹ maandschakelaar ›</button> })
    expect(screen.getByRole('button', { name: '‹ maandschakelaar ›' })).toBeInTheDocument()
  })

  it('blijft zonder ankerMaand precies doen wat ze vroeger deed', () => {
    toonMet([boodschappen])
    expect(screen.getByRole('button', { name: 'Deze maand' })).toBeInTheDocument()
    // De boeking van vandaag valt dus nog steeds onder "Deze maand".
    expect(kaart('Verdeling uitgaven')).toBeInTheDocument()
    expect(nu).toBe(huidigeMaand())
  })
})

describe('AnalyseSectie — doorklikken naar de transacties', () => {
  it('brengt je van een rij in de drilldown naar de boeking zelf', async () => {
    const user = userEvent.setup()
    const onBewerkTransactie = vi.fn()
    toonMet([boodschappen, tanken], { onBewerkTransactie })
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    await user.click(await screen.findByRole('button', { name: /^Bewerk Colruyt —/ }))
    expect(onBewerkTransactie).toHaveBeenCalledWith(boodschappen)
  })

  it('geeft de ingezoomde hoofdcategorie een weg naar de Transacties-pagina', async () => {
    const user = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    // Boekingen ín maart, want de pagina ankert op maart: anders is er niets om
    // in te zoomen.
    const inMaart: Transactie = { ...boodschappen, id: 'maart', datum: '2026-03-12' }
    toonMet([inMaart], { onGaNaarTransacties, ankerMaand: '2026-03' })
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    await user.click(await screen.findByRole('button', { name: 'Bekijk in Transacties ›' }))
    // Het filter erft de periode van de pagina: klik je op een cijfer over maart,
    // dan hoort de lijst maart te tonen en niet je hele historiek.
    // Eén maand geeft `maand` mee en geen van/tot-paar: zo werkt de maandschakelaar
    // bovenaan de lijst gewoon, en er komt nooit een 31 februari in een datumveld.
    expect(onGaNaarTransacties).toHaveBeenCalledWith({
      hoofdId: 'ov-voeding',
      richting: 'uit',
      maand: '2026-03',
    })
  })

  it('laat een subcategorie in de drilldown doorklikken op haar eigen niveau', async () => {
    const user = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    toonMet([boodschappen, tanken], { onGaNaarTransacties })
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    await user.click(await screen.findByRole('button', { name: /^Bekijk de boekingen van Brood \(wit\) —/ }))
    expect(onGaNaarTransacties.mock.calls[0][0].catId).toBe('i-brood--wit-9238')
  })

  it('biedt GEEN doorklik op een drilldown-rij die geen item is', async () => {
    // Zo'n rij telt alleen wat rechtstreeks op die categorie geboekt staat, terwijl
    // een categoriefilter juist alles eronder vangt. Klikte je op "Voeding € 3,00",
    // dan toonde de lijst ook alle broodboekingen en stond er € 8,00 boven.
    const user = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    const opHoofd: Transactie = { ...boodschappen, id: 'direct', categorieId: 'ov-voeding' }
    toonMet([boodschappen, opHoofd], { onGaNaarTransacties })
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    expect(await screen.findByRole('button', { name: /^Bekijk de boekingen van Brood \(wit\) —/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bekijk de boekingen van Voeding —/ })).toBeNull()
  })

  it('maakt geen enkele doorklik-knop wanneer de app er niets mee kan', async () => {
    const user = userEvent.setup()
    toonMet([boodschappen, tanken])
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    expect(screen.queryByRole('button', { name: 'Bekijk in Transacties ›' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Bewerk Colruyt/ })).toBeNull()
  })
})

// --- Ronde 48: de legende "per winkel" -----------------------------------------

describe('AnalyseSectie — doorklikken vanaf de winkellegende', () => {
  it('filtert op de exacte omschrijving, met de periode en de richting erbij', async () => {
    const user = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    toonMet([boodschappen, tanken], { onGaNaarTransacties })
    await user.click(await screen.findByRole('button', { name: /^Colruyt .* bekijk de boekingen$/ }))
    // `perWinkel` groepeert op de letterlijke omschrijving, dus het filter doet dat
    // ook. Zou het via `handelaar` gaan, dan kwamen er boekingen bij die niet in
    // het bedrag op deze rij zitten.
    expect(onGaNaarTransacties).toHaveBeenCalledWith(
      expect.objectContaining({ omschrijving: 'Colruyt', richting: 'uit' }),
    )
  })

  it('maakt geen knop van een legenderij wanneer de app er niets mee kan', () => {
    toonMet([boodschappen, tanken])
    expect(screen.queryByRole('button', { name: /bekijk de boekingen$/ })).toBeNull()
  })

  it('laat de legendes per product/dienst en per gezinslid bewust met rust', () => {
    // Die twee rekenkernen gooien hun sleutel weg (per naam gegroepeerd) of
    // VERDELEN een bedrag over meerdere personen. Een filter selecteert hele
    // transacties, dus daar zou de lijst een ander bedrag tonen dan de rij. Zolang
    // dat niet opgelost is, hoort daar geen knop te staan.
    const onGaNaarTransacties = vi.fn()
    toonMet([boodschappen, tanken], { onGaNaarTransacties })
    const namen = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? '')
    // Wel de winkel (de omschrijving), niet de subcategorie.
    expect(namen.some((n) => n.startsWith('Colruyt '))).toBe(true)
    expect(namen.some((n) => n.startsWith('Brood (wit) ') && n.endsWith('bekijk de boekingen'))).toBe(false)
  })
})
