import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { AnalyseSectie } from './AnalyseSectie'
import type { Transactie } from '../data/schema'
import { vandaag } from '../utils/datum'

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
