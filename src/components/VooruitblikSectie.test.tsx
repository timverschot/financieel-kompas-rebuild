import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VooruitblikSectie } from './VooruitblikSectie'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { huidigeMaand, verschuifMaandVoorTest } from '../test/maandhulp'

// Ronde 40 gaf deze kaart twee dingen die ze niet had:
//
//  1. de regel "n vaste lasten nog in te boeken deze maand" liep dood — je las dat
//     er drie openstonden en moest zelf naar de Plan-pagina om uit te zoeken wélke;
//  2. de kaart rekende altijd met de HUIDIGE maand, ook wanneer de rest van de
//     pagina naar een andere maand bladerde.
//
// Waarom deze tests met de VOLGENDE en de VORIGE maand werken in plaats van met
// een vaste maand: of een post "nog te komen" of "achterstallig" is, hangt af van
// de dag van vandaag. Het schema laat hoogstens dag 28 toe, dus op de 29e, 30e en
// 31e bestaat "nog te komen" in de huidige maand niet meer. In een maand die nog
// moet komen is alles per definitie komend, in een maand die voorbij is alles
// achterstallig — en dan zegt de test elke dag van het jaar hetzelfde.

const dezeMaand = huidigeMaand()
const volgendeMaand = verschuifMaandVoorTest(dezeMaand, 1)
const vorigeMaand = verschuifMaandVoorTest(dezeMaand, -1)

function post(over: Partial<TerugkerendePost> & { id: string; dag: number; bedrag: number }): TerugkerendePost {
  return { omschrijving: over.id, rekeningId: 'r1', ...over }
}

const inkomst: Transactie = {
  id: 'loon',
  datum: `${dezeMaand}-01`,
  omschrijving: 'Loon',
  bedrag: 200000,
  rekeningId: 'r1',
}

const huur = post({ id: 'Huur', dag: 5, bedrag: -90000 })

function toon(props: Partial<Parameters<typeof VooruitblikSectie>[0]> = {}) {
  const onBoekVasteLast = vi.fn()
  render(
    <VooruitblikSectie
      transacties={[inkomst]}
      terugkerendePosten={[huur]}
      periode={{ van: `${volgendeMaand}-01`, tot: `${volgendeMaand}-31` }}
      periodeLabel="Volgende maand"
      maand={volgendeMaand}
      onBoekVasteLast={onBoekVasteLast}
      {...props}
    />,
  )
  return { onBoekVasteLast }
}

describe('VooruitblikSectie — een vaste last meteen inboeken', () => {
  const telregel = () => screen.getByRole('button', { name: /nog in te boeken in/ })

  it('maakt van de telregel een knop die de posten eronder toont', async () => {
    const user = userEvent.setup()
    toon()
    expect(telregel()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Huur')).toBeNull()
    await user.click(telregel())
    expect(telregel()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Huur')).toBeInTheDocument()
  })

  it('klapt de lijst met een tweede klik weer dicht', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(telregel())
    await user.click(telregel())
    expect(screen.queryByText('Huur')).toBeNull()
  })

  it('boekt de post in voor de maand die deze kaart toont', async () => {
    const user = userEvent.setup()
    const { onBoekVasteLast } = toon()
    await user.click(telregel())
    await user.click(screen.getByRole('button', { name: 'Boek Huur in' }))
    expect(onBoekVasteLast).toHaveBeenCalledWith('Huur', volgendeMaand)
  })

  it('boekt ook een achterstallige post in de maand van de kaart', async () => {
    // Dit is het verschil met het meldingenbelletje: dat gaat over nu, deze kaart
    // over de maand die je aan het bekijken bent.
    const user = userEvent.setup()
    const { onBoekVasteLast } = toon({
      maand: vorigeMaand,
      periode: { van: `${vorigeMaand}-01`, tot: `${vorigeMaand}-31` },
    })
    await user.click(screen.getByRole('button', { name: /achterstallig/ }))
    await user.click(screen.getByRole('button', { name: 'Boek Huur in' }))
    expect(onBoekVasteLast).toHaveBeenCalledWith('Huur', vorigeMaand)
  })

  it('blijft een gewone regel zonder knop wanneer de app niet kan inboeken', () => {
    toon({ onBoekVasteLast: undefined })
    expect(screen.queryByRole('button', { name: /nog in te boeken/ })).toBeNull()
    const metas = [...document.querySelectorAll('.rij-meta')].map((el) => el.textContent ?? '')
    expect(metas.some((m) => m.includes('nog in te boeken in'))).toBe(true)
  })

  it('noemt de maand van de kaart in de kop, niet altijd de huidige', () => {
    toon({ maand: vorigeMaand, periode: { van: `${vorigeMaand}-01`, tot: `${vorigeMaand}-31` } })
    const koppen = [...document.querySelectorAll('.kaart-bijschrift')].map((el) => el.textContent ?? '')
    expect(koppen.some((k) => k.startsWith('Vooruitblik —'))).toBe(true)
    // De maandnaam van vandaag mag er dan NIET meer staan.
    const maandVanNu = new Intl.DateTimeFormat('nl-BE', { month: 'long' }).format(new Date())
    expect(koppen.some((k) => k === `Vooruitblik — ${maandVanNu}`)).toBe(false)
  })

  it('zegt nog steeds wanneer er helemaal geen vaste lasten zijn', () => {
    toon({ terugkerendePosten: [] })
    expect(
      screen.getByText('Je hebt nog geen vaste lasten ingesteld. Zonder die weet de app niet wat er nog moet komen.'),
    ).toBeInTheDocument()
  })

  it('toont elke openstaande post met haar dag en haar bedrag', async () => {
    const user = userEvent.setup()
    toon({ terugkerendePosten: [huur, post({ id: 'Netflix', dag: 12, bedrag: -1399 })] })
    await user.click(telregel())
    expect(screen.getByText('Huur')).toBeInTheDocument()
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Boek Huur in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Boek Netflix in' })).toBeInTheDocument()
    const metas = [...document.querySelectorAll('.rij-meta')].map((el) => el.textContent ?? '')
    expect(metas).toContain('dag 12')
  })

  // Ronde 66: de zin zei wat er ontbrak, maar niet waar je het invult.
  it('biedt een weg naar je vaste lasten wanneer er nog geen zijn', async () => {
    const user = userEvent.setup()
    const onNaarVast = vi.fn()
    toon({ terugkerendePosten: [], onNaarVast })
    await user.click(screen.getByRole('button', { name: 'Vul je vaste lasten in' }))
    expect(onNaarVast).toHaveBeenCalled()
  })

  it('laat de knop weg wanneer de kaart nergens heen kan wijzen', () => {
    toon({ terugkerendePosten: [] })
    expect(screen.queryByRole('button', { name: 'Vul je vaste lasten in' })).toBeNull()
    expect(screen.getByText(/nog geen vaste lasten ingesteld/)).toBeInTheDocument()
  })
})

// --- Ronde 66, slotronde: geen bevestiging van een controle die niet gedaan is ---
describe('VooruitblikSectie — een maand waarin niets vervalt', () => {
  it('zegt niet "alles al ingeboekt" wanneer er niets te boeken viel', () => {
    // ⚠ De zin hing aan de TOTALE lijst posten, terwijl de tellers alleen gaan over
    // wat déze maand vervalt. Heb je enkel een jaarlijkse verzekering die in een
    // andere maand valt, dan stonden beide tellers op nul en meldde de app dat alles
    // al ingeboekt was — terwijl er niets te boeken viel. Dezelfde valse
    // geruststelling die ronde 65 uit de maandafsluiting gehaald heeft.
    const jaarpost = post({
      id: 'Autoverzekering',
      dag: 5,
      bedrag: -62000,
      frequentie: 'jaar',
      startMaand: verschuifMaandVoorTest(volgendeMaand, 3),
    })
    toon({ terugkerendePosten: [jaarpost] })
    expect(screen.getByText(/vervalt er geen enkele vaste last/)).toBeInTheDocument()
    expect(screen.queryByText(/zijn al ingeboekt/)).toBeNull()
  })

  it('zegt het wél wanneer er deze maand iets viel en het geboekt is', () => {
    // Huur vervalt elke maand; met een boeking ervoor is de telling terecht nul.
    const geboekt: Transactie = {
      id: 'huurboeking',
      datum: `${volgendeMaand}-05`,
      omschrijving: 'Huur',
      bedrag: -90000,
      rekeningId: 'r1',
      vasteLastId: 'Huur',
    }
    toon({ transacties: [inkomst, geboekt] })
    expect(screen.getByText(/zijn al ingeboekt/)).toBeInTheDocument()
    expect(screen.queryByText(/vervalt er geen enkele vaste last/)).toBeNull()
  })
})

// --- Ronde 69: elk getal verantwoordt zich ---
describe('VooruitblikSectie — waar het verwachte cijfer vandaan komt', () => {
  // Deze kaart toont standaard de VOLGENDE maand (zie `toon` hierboven), maar de
  // bronzin hoort alleen bij de maand die nog loopt. Vandaar telkens de huidige
  // maand meegeven.
  function toonDezeMaand() {
    toon({ maand: dezeMaand, periode: { van: `${dezeMaand}-01`, tot: `${dezeMaand}-31` }, periodeLabel: 'Deze maand' })
  }

  it('zegt onder het verwachte saldo dat losse uitgaven er niet in zitten', () => {
    // ⚠ `bepaalVooruitblik` telt alleen wat er al geboekt is plus de terugkerende
    // posten. Er zit GEEN schatting in van de boodschappen en de tankbeurten voor
    // de resterende dagen. Op de 3de van de maand staat er daardoor een royaal
    // overschot dat op de 30ste verdwenen is, zonder dat er iets misgelopen is —
    // het cijfer beloofde alleen iets anders dan het rekende. Zonder deze zin
    // leest "+ € 900 verwacht in september" als geld dat je overhoudt.
    toonDezeMaand()
    expect(document.querySelector('[data-vooruitblikbron]')?.textContent).toBe(
      'Hierin zit wat er deze maand al geboekt is, plus de terugkerende posten die déze maand vervallen — ook de te late. Losse uitgaven die nog komen — boodschappen, tanken — zitten er niet in.',
    )
  })

  it('zet die zin onder het cijfer waar ze over gaat, niet ergens anders op de kaart', () => {
    // De zin verantwoordt het bedrag bij "verwacht in {maand}". Staat ze boven de
    // spaarquote, dan verklaart ze het verkeerde getal.
    toonDezeMaand()
    const metas = [...document.querySelectorAll('.rij-meta')].map((el) => el.textContent ?? '')
    const cijfer = metas.findIndex((m) => m.includes('verwacht in'))
    const bron = metas.findIndex((m) => m.startsWith('Hierin zit wat er deze maand al geboekt is'))
    expect(cijfer).toBeGreaterThanOrEqual(0)
    expect(bron).toBeGreaterThan(cijfer)
  })

  it('zwijgt zodra je naar een maand bladert die al voorbij is', () => {
    // ⚠ De zin kondigt aan dat er nog losse uitgaven bij komen. Bij een afgesloten
    // maand komt er niets meer bij: dan zou ze een onderschatting beloven bij een
    // cijfer dat al definitief is, en dat is erger dan zwijgen.
    toon({ maand: vorigeMaand, periode: { van: `${vorigeMaand}-01`, tot: `${vorigeMaand}-31` } })
    expect(document.querySelector('[data-vooruitblikbron]')).toBeNull()
  })
})
