import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AnalyseSectie } from './AnalyseSectie'
import { TaalProvider } from '../i18n'
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

  it('laat een product/dienst doorklikken op zijn eigen categorie', () => {
    const onGaNaarTransacties = vi.fn()
    toonMet([boodschappen, tanken], { onGaNaarTransacties })
    const knop = screen.getByRole('button', { name: /^Brood \(wit\) .* bekijk de boekingen$/ })
    knop.click()
    expect(onGaNaarTransacties).toHaveBeenCalledWith(
      expect.objectContaining({ catId: 'i-brood--wit-9238', richting: 'uit' }),
    )
  })
})

// --- Ronde 49: de legende per gezinslid ----------------------------------------
//
// `uitgavenPerPersoon` VERDEELT een kost die aan meerdere gezinsleden hangt. Zo'n
// aandeel bestaat nergens als boeking, dus daar hoort geen doorklik te staan. Een
// regel waar niets verdeeld is, wijst wél een echte verzameling aan.

describe('AnalyseSectie — doorklikken vanaf de gezinslegende', () => {
  const metPersoon = (id: string, personen: string[], bedrag: number): Transactie => ({
    ...tx(id, 'i-brood--wit-9238', bedrag),
    persoonIds: personen,
  })

  it('laat een zuivere persoonsregel doorklikken op dat gezinslid', async () => {
    const user = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    toonMet([metPersoon('p', ['k1'], -4000)], { onGaNaarTransacties, gezinsleden: [{ id: 'k1', naam: 'Emma' }] })
    await user.click(await screen.findByRole('button', { name: /^Emma .* bekijk de boekingen$/ }))
    expect(onGaNaarTransacties).toHaveBeenCalledWith(expect.objectContaining({ persoonId: 'k1' }))
  })

  it('laat de groep Het gezin doorklikken op "zonder persoon"', async () => {
    const user = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    // De kaart verschijnt alleen wanneer er gezinsleden bestaan; de boeking zelf
    // hangt bewust aan niemand, en valt dus onder "Het gezin".
    toonMet([tx('g', 'i-brood--wit-9238', -3000)], {
      onGaNaarTransacties,
      gezinsleden: [{ id: 'k1', naam: 'Emma' }],
    })
    await user.click(await screen.findByRole('button', { name: /^Het gezin .* bekijk de boekingen$/ }))
    expect(onGaNaarTransacties).toHaveBeenCalledWith(expect.objectContaining({ zonderPersoon: true }))
  })

  it('geeft GEEN knop aan een gezinslid dat niet meer bestaat', () => {
    // De chip boven de lijst zou dan geen naam hebben, en twee verwijderde leden
    // zouden allebei dezelfde chip krijgen naar een andere lijst.
    toonMet([metPersoon('w', ['weg'], -4000)], {
      onGaNaarTransacties: vi.fn(),
      gezinsleden: [{ id: 'k1', naam: 'Emma' }],
    })
    expect(screen.queryByRole('button', { name: /^Onbekend gezinslid .* bekijk de boekingen$/ })).toBeNull()
  })

  it('geeft GEEN knop aan een gedeelde kost', () => {
    // Emma's helft van € 40 bestaat niet als boeking; de lijst zou € 40 tonen waar
    // € 20 staat.
    toonMet([metPersoon('d', ['k1', 'k2'], -4000)], {
      onGaNaarTransacties: vi.fn(),
      gezinsleden: [
        { id: 'k1', naam: 'Emma' },
        { id: 'k2', naam: 'Noah' },
      ],
    })
    expect(screen.queryByRole('button', { name: /^Emma .* bekijk de boekingen$/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Noah .* bekijk de boekingen$/ })).toBeNull()
  })
})

describe('AnalyseSectie — welke rijen mogen doorklikken', () => {
  // Een boeking rechtstreeks op een MIDDENcategorie: het filter zou daar alles
  // meenemen wat eronder hangt, dus een groter bedrag dan de rij zelf toont.
  const opMidden = tx('m', 'cat-broodwaren', -900, 'Bakker')

  it('geeft geen knop aan een rij die een groter bedrag zou tonen dan ze zelf is', () => {
    toonMet([opMidden, boodschappen], { onGaNaarTransacties: vi.fn() })
    expect(screen.queryByRole('button', { name: /^Broodwaren .* bekijk de boekingen$/ })).toBeNull()
    expect(screen.getByRole('button', { name: /^Brood \(wit\) .* bekijk de boekingen$/ })).toBeInTheDocument()
  })

  it('laat "Zonder categorie" wél doorklikken, naar haar eigen filter', async () => {
    // Ronde 51. Deze rij liep dood terwijl de app precies wist welke boekingen ze
    // bedoelde: het filter `zonderCategorie` bestond al. En juist die boekingen wil
    // je openen — dat zijn de uitgaven die je nog moet indelen.
    const gebruiker = userEvent.setup()
    const naarTransacties = vi.fn()
    const zonder: Transactie = { ...tx('z', '', -1000), categorieId: undefined }
    toonMet([zonder, boodschappen], { onGaNaarTransacties: naarTransacties })
    const kaartje = screen.getByText('Verdeling per product/dienst').closest('section.kaart') as HTMLElement
    await gebruiker.click(
      within(kaartje).getByRole('button', { name: /^Zonder categorie .* bekijk de boekingen$/ }),
    )
    expect(naarTransacties).toHaveBeenCalledWith(expect.objectContaining({ zonderCategorie: true, richting: 'uit' }))
  })

  it('toont het pijltje alleen op een rij die ergens heen gaat', () => {
    toonMet([opMidden, boodschappen], { onGaNaarTransacties: vi.fn() })
    const kaartje = screen.getByText('Verdeling per product/dienst').closest('section.kaart') as HTMLElement
    const pijltjes = [...kaartje.querySelectorAll('.rij-chevron')]
    // Even veel pijltjes als rijen, maar alleen zichtbaar waar er een knop is:
    // zo blijft de bedragkolom van alle rijen op dezelfde plek staan.
    expect(pijltjes.length).toBe(2)
    const verborgen = pijltjes.filter((p) => (p as HTMLElement).style.visibility === 'hidden')
    expect(verborgen).toHaveLength(1)
  })
})

describe('AnalyseSectie — "Het gezin" bij een groot gezin', () => {
  // Ronde 51. "Het gezin" staat altijd achteraan in de lijst, en de donut toonde de
  // tien grootste plus één restschijf. Bij tien of meer gezinsleden viel die groep
  // dus weg — en de restschijf had toevallig dezelfde kleur, dus je zag het niet.
  const veelLeden = Array.from({ length: 12 }, (_, i) => ({ id: `g${i}`, naam: `Lid ${i}` }))
  const boekingen: Transactie[] = [
    // Elk lid een eigen uitgave, aflopend van groot naar klein.
    ...veelLeden.map((lid, i) => ({ ...tx(`p${i}`, '', -(50000 - i * 1000)), persoonIds: [lid.id] })),
    // En één uitgave die aan niemand hangt: dat is "Het gezin", en ze is de kleinste.
    tx('gezin', '', -100),
  ]

  function toonGezin(over: Record<string, unknown> = {}) {
    render(
      <AnalyseSectie
        transacties={boekingen}
        categorieen={[]}
        rekeningen={rekeningen}
        overboekingen={[]}
        waarderingen={[]}
        terugkerendePosten={[]}
        gezinsleden={veelLeden}
        {...over}
      />,
    )
  }

  it('houdt de rij in de legende staan, ook al is ze de kleinste van dertien', () => {
    toonGezin()
    const kaartje = screen.getByText('Uitgaven per gezinslid').closest('section.kaart') as HTMLElement
    expect(within(kaartje).getByText('Het gezin')).toBeInTheDocument()
    // En de rij die ze verdrong staat er niet: de lijst blijft even lang.
    expect(within(kaartje).queryByText('Lid 11')).toBeNull()
  })

  it('geeft haar een andere kleur dan de restschijf', () => {
    // Dit is de kern: "Het gezin" en de schijf "Overige" staan nu naast elkaar in
    // dezelfde ring. Deelden ze een kleur, dan kan je geen van beide nog aan haar
    // legende koppelen — en dat is precies waar een donut voor dient.
    toonGezin()
    const kaartje = screen.getByText('Uitgaven per gezinslid').closest('section.kaart') as HTMLElement
    const schijven = [...kaartje.querySelectorAll('svg path[fill]')].map((e) => e.getAttribute('fill'))
    const gekleurd = schijven.filter((k) => k !== null && k !== 'none')
    // Elf schijven (tien grootste + "Het gezin") plus één "Overige".
    expect(gekleurd).toHaveLength(12)
    expect(new Set(gekleurd).size).toBe(gekleurd.length)
  })

  it('laat haar doorklikken, ook vanaf die vastgepinde plaats', async () => {
    // De plaats in de lijst bepaalt welk filter eraan hangt; werd die verschoven,
    // dan kwam je bij een ander gezinslid uit.
    const gebruiker = userEvent.setup()
    const naarTransacties = vi.fn()
    toonGezin({ onGaNaarTransacties: naarTransacties })
    const kaartje = screen.getByText('Uitgaven per gezinslid').closest('section.kaart') as HTMLElement
    await gebruiker.click(within(kaartje).getByRole('button', { name: /^Het gezin .* bekijk de boekingen$/ }))
    expect(naarTransacties).toHaveBeenCalledWith(expect.objectContaining({ zonderPersoon: true }))
  })
})

describe('AnalyseSectie — uitklappen zonder de donut te verbouwen', () => {
  // Ronde 51. Bij het vastpinnen van "Het gezin" werd de ring per ongeluk aan het
  // uitklappen gekoppeld: na "Toon alle …" kreeg je vijftien haarfijne schijfjes en
  // was de knop om weer in te klappen verdwenen.
  const veel: Transactie[] = Array.from({ length: 15 }, (_, i) =>
    tx(`w${i}`, '', -(50000 - i * 1000), `Winkel ${i}`),
  )

  it('houdt de ring op de grootste schijven plus Overige, ook uitgeklapt', async () => {
    const gebruiker = userEvent.setup()
    toon(veel)
    const kaartje = screen.getByText('Uitgaven per winkel').closest('section.kaart') as HTMLElement
    const schijven = () => kaartje.querySelectorAll('svg path[fill]:not([fill="none"])').length
    expect(schijven()).toBe(11)
    await gebruiker.click(within(kaartje).getByRole('button', { name: /Toon alle 15/ }))
    expect(schijven()).toBe(11)
  })

  it('laat je weer inklappen', async () => {
    const gebruiker = userEvent.setup()
    toon(veel)
    const kaartje = screen.getByText('Uitgaven per winkel').closest('section.kaart') as HTMLElement
    await gebruiker.click(within(kaartje).getByRole('button', { name: /Toon alle 15/ }))
    expect(within(kaartje).getByText('Winkel 14')).toBeInTheDocument()
    await gebruiker.click(within(kaartje).getByRole('button', { name: 'Toon minder' }))
    expect(within(kaartje).queryByText('Winkel 14')).toBeNull()
  })
})

describe('AnalyseSectie — "Zonder categorie" in een andere taal', () => {
  // Deze rij is een woord van de app zelf, geen winkelnaam. Ze bleef Nederlands in
  // de legende terwijl de zusterlijst eronder ze wél vertaalde — dan heet hetzelfde
  // begrip twee dingen op één scherm.
  it('vertaalt de rij, en laat winkelnamen met rust', () => {
    localStorage.setItem('fk_taal', 'en')
    const zonder: Transactie = { ...tx('z', '', -1000), categorieId: undefined, omschrijving: 'Colruyt' }
    render(
      <TaalProvider>
        <AnalyseSectie
          transacties={[zonder, boodschappen]}
          categorieen={[]}
          rekeningen={rekeningen}
          overboekingen={[]}
          waarderingen={[]}
          terugkerendePosten={[]}
        />
      </TaalProvider>,
    )
    const kaartje = screen.getByText('Breakdown by product/service').closest('section.kaart') as HTMLElement
    expect(within(kaartje).getByText('Uncategorised')).toBeInTheDocument()
    expect(within(kaartje).queryByText('Zonder categorie')).toBeNull()
    // De winkelnaam blijft staan zoals ze op je afschrift stond.
    expect(within(kaartje).getByText('Brood (wit)')).toBeInTheDocument()
    localStorage.removeItem('fk_taal')
  })
})

describe('AnalyseSectie — "Zonder categorie" in de drilldown', () => {
  // De derde en vierde plek waar deze rij doodliep. Op de donut kon je er zelfs op
  // tikken zonder dat er iets gebeurde.
  const zonder: Transactie = { ...tx('z', '', -1000), categorieId: undefined }

  it('opent de boekingen vanaf de knop onder de ingezoomde kaart', async () => {
    const gebruiker = userEvent.setup()
    const naarTransacties = vi.fn()
    toonMet([zonder, boodschappen], { onGaNaarTransacties: naarTransacties })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon details van Zonder categorie' }))
    await gebruiker.click(screen.getByRole('button', { name: /Bekijk in Transacties/ }))
    expect(naarTransacties).toHaveBeenCalledWith(expect.objectContaining({ zonderCategorie: true }))
  })

  it('laat ook de rij in de lijst per subcategorie doorklikken', async () => {
    const gebruiker = userEvent.setup()
    const naarTransacties = vi.fn()
    toonMet([zonder, boodschappen], { onGaNaarTransacties: naarTransacties })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon details van Zonder categorie' }))
    const kaartje = screen.getByText('Per subcategorie').closest('section.kaart') as HTMLElement
    await gebruiker.click(
      within(kaartje).getByRole('button', { name: /^Bekijk de boekingen van Zonder categorie/ }),
    )
    expect(naarTransacties).toHaveBeenCalledWith(expect.objectContaining({ zonderCategorie: true }))
  })
})
