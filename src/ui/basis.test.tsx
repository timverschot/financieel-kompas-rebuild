import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EersteStapKnop, Kaart, Kengetal, Leeg, PaginaKop, Stat } from './basis'

// Ronde 66 — de eerste stap in een lege toestand.
//
// De doorlichting telde negentien lege toestanden die alleen een CONSTATERING
// toonden en niets zeiden over wat je dan moest doen. Voor wie de app al kent is dat
// genoeg; voor wie ze leert is het een doodlopend scherm.
describe('Leeg', () => {
  it('blijft één zin wanneer er niets te doen valt', () => {
    const { container } = render(<Leeg>Nog geen inkomsten deze maand.</Leeg>)
    // ⚠ Een knop die nergens heen gaat is erger dan geen knop: "Geen inkomsten deze
    // maand" is gewoon waar, en er is niets aan te doen.
    expect(container.querySelector('p.leeg')).not.toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('zet de eerste stap onder de zin wanneer er wél iets te doen valt', async () => {
    const user = userEvent.setup()
    const onKlik = vi.fn()
    const { container } = render(
      <Leeg actie={<EersteStapKnop onClick={onKlik}>Maak een rekening aan</EersteStapKnop>}>
        Nog geen rekeningen.
      </Leeg>,
    )
    expect(container.querySelector('.leeg-met-stap')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    expect(onKlik).toHaveBeenCalled()
  })

  it('geeft elke eerste stap dezelfde vorm', () => {
    const { container } = render(<EersteStapKnop onClick={vi.fn()}>Doe dit</EersteStapKnop>)
    const knop = container.querySelector('button') as HTMLElement
    // Eén vorm, zodat je hem na één keer herkent — en nooit de gevulde knop, want
    // die is voor de hoofdactie van het scherm (DESIGN.md, regel 2).
    expect(knop).toHaveClass('knop-secundair')
    expect(knop).not.toHaveClass('knop-primair')
    expect(knop).toHaveAttribute('type', 'button')
  })
})

describe('Kaart', () => {
  it('toont een bijschrift ook zonder titel', () => {
    // ⚠ RONDE 66. De kop werd alleen gerenderd bij een titel of een actie, dus een
    // kaart met enkel een bijschrift slikte die zin geruisloos in. Dat gebeurde toen
    // een kaart haar titel afstond aan het tabblad erboven.
    render(<Kaart bijschrift="Zo werkt deze lade.">inhoud</Kaart>)
    expect(screen.getByText('Zo werkt deze lade.')).toBeInTheDocument()
  })

  it('laat de kop weg wanneer er niets in staat', () => {
    const { container } = render(<Kaart>inhoud</Kaart>)
    expect(container.querySelector('.kaart-kop')).toBeNull()
  })
})

// Ronde 69 — elk getal verantwoordt zich. Een cijfer hoort te zeggen over welke
// periode het gaat en wat er niet in meegeteld is.
describe('Stat en Kengetal met een bron', () => {
  it('zet de herkomstzin onder het cijfer', () => {
    const { container } = render(
      <Stat label="Vaste lasten per maand" bron="Omgerekend naar één maand.">
        € 840,00
      </Stat>,
    )
    expect(container.querySelector('.getal-bron')?.textContent).toBe('Omgerekend naar één maand.')
  })

  it('laat een cijfer zonder bron ongemoeid', () => {
    // De prop is optioneel; een cijfer dat zichzelf verklaart hoeft geen zin.
    const { container } = render(<Stat label="Netto">€ 10,00</Stat>)
    expect(container.querySelector('.getal-bron')).toBeNull()
  })

  it('zet de herkomstzin ook in de naam van een doorklikbaar cijfer', () => {
    // ⚠ Op een knop vervangt `aria-label` ALLE tekst binnenin. Zonder deze regel zag
    // een ziende gebruiker de beperking staan en hoorde een schermlezer ze niet.
    render(
      <Kengetal
        label="Uitgaven"
        bron="Alleen de laatste 6 maanden."
        doorklik={{ naam: 'Uitgaven € 500,00 — bekijk de boekingen', naar: vi.fn() }}
      >
        € 500,00
      </Kengetal>,
    )
    expect(
      screen.getByRole('button', { name: 'Uitgaven € 500,00 — bekijk de boekingen. Alleen de laatste 6 maanden.' }),
    ).toBeInTheDocument()
  })
})

// Ronde 69 — de klasse `stat-met-bron` is de ENIGE haak van twee opmaakregels.
//
// `.stat-met-bron { flex: 1 1 220px }` en `.tegelrij > .stat-met-bron { grid-column:
// 1 / -1 }` in index.css hangen allebei aan deze ene klassenaam. Ze staat er bewust
// niet als `:has(> .getal-bron)`: die selector werkt niet op oudere iOS-versies, en
// dan valt de regel stil weg op precies het toestel waar het probleem zit. Gevolg:
// haal je de klasse uit `Stat` of `Kengetal` weg, dan blijft ELKE andere test groen
// terwijl de herkomstzin op een telefoon van 393 px in een kolom van 154 px valt en
// acht regeltjes hoog wordt. Alleen deze tests zien dat.
describe('de merkklasse stat-met-bron', () => {
  it('markeert een Stat met een herkomstzin', () => {
    const { container } = render(
      <Stat label="Vaste lasten per maand" bron="Omgerekend naar één maand.">
        € 840,00
      </Stat>,
    )
    expect(container.querySelector('.stat')).toHaveClass('stat-met-bron')
  })

  it('laat een Stat zonder herkomstzin ongemerkt', () => {
    // Zonder zin is er niets om te laten wrappen; de tegel hoort gewoon een halve
    // kolom te blijven, anders duwt ze haar buur zonder reden naar beneden.
    const { container } = render(<Stat label="Netto">€ 10,00</Stat>)
    expect(container.querySelector('.stat')).not.toHaveClass('stat-met-bron')
  })

  it('markeert ook de knopvariant van een Stat', () => {
    // "Netto vermogen" op Je situatie is vandaag de enige plek die `bron` én
    // `doorklik` combineert. Zat de klasse alleen op het blokje zonder knop, dan
    // viel juist die tegel — de langste zin van het scherm — in het gat.
    render(
      <Stat label="Netto vermogen" bron="Je rekeningen min je schulden." doorklik={{ naam: 'Netto vermogen', naar: vi.fn() }}>
        € 12.400,00
      </Stat>,
    )
    expect(screen.getByRole('button', { name: /Netto vermogen/ })).toHaveClass('stat-met-bron')
  })

  it('markeert een Kengetal met een herkomstzin, ook als knop', () => {
    // `.tegelrij` is een raster van twee kolommen; daar is de klasse nog nodiger dan
    // in een flexrij. Vandaag gebruikt geen enkel scherm `Kengetal bron` — zou de
    // klasse hier ontbreken, dan valt de eerste die het wél doet in precies dat gat.
    const { container } = render(<Kengetal label="Uitgaven" bron="Alleen deze maand.">€ 500,00</Kengetal>)
    expect(container.querySelector('.kengetal')).toHaveClass('stat-met-bron')

    render(
      <Kengetal label="Inkomsten" bron="Alleen deze maand." doorklik={{ naam: 'Inkomsten', naar: vi.fn() }}>
        € 900,00
      </Kengetal>,
    )
    expect(screen.getByRole('button', { name: /Inkomsten/ })).toHaveClass('stat-met-bron')
  })

  it('laat een Kengetal zonder herkomstzin ongemerkt', () => {
    const { container } = render(<Kengetal label="Saldo">€ 10,00</Kengetal>)
    expect(container.querySelector('.kengetal')).not.toHaveClass('stat-met-bron')
  })
})

describe('PaginaKop', () => {
  // ⚠ RONDE 101 — GEMETEN IN EEN ECHTE BROWSER, niet hier. Op een scherm van 360 px liep het
  // Overzicht 20 pixels breder dan het venster, Budget 34 en Analyse 43: de titel en de
  // maandnavigatie (‹ augustus 2026 ›, 248 px breed) stonden in één rij die niet mocht
  // afbreken. Resultaat: een horizontale schuifbalk op élke telefoon.
  //
  // ⚠ WAT DEZE TEST WÉL EN NIET DOET. jsdom rekent geen opmaak uit, dus ze kan de overloop
  // niet meten. Ze bewaakt alleen dat de twee eigenschappen die het oplossen er nog staan —
  // een vangnet tegen het stil verdwijnen ervan bij een volgende bewerking. De échte meting
  // gebeurt in de browser, en staat in de nota van ronde 101.
  it('laat de rij afbreken en de titel krimpen', () => {
    const { container } = render(<PaginaKop titel="Overzicht" actie={<button>‹ augustus 2026 ›</button>} />)
    const rij = container.firstElementChild as HTMLElement
    expect(rij.style.flexWrap).toBe('wrap')
    const titelblok = rij.firstElementChild as HTMLElement
    expect(titelblok.style.minWidth).toBe('0')
  })

  it('toont de titel, het bijschrift en de actie', () => {
    // De positieve tegencontrole: zonder haar zou een lege component ook groen zijn.
    render(<PaginaKop titel="Budget" bijschrift="Wat je deze maand van plan bent" actie={<button>Volgende</button>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Budget' })).toBeInTheDocument()
    expect(screen.getByText('Wat je deze maand van plan bent')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volgende' })).toBeInTheDocument()
  })
})
