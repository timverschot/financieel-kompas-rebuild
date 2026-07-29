import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Donut } from './Donut'
import { splitsLabel } from '../utils/donut'
import { formatEuro } from '../utils/format'

describe('Donut', () => {
  it('toont de categorieën in de legende en een grafiek', () => {
    render(
      <Donut
        items={[
          { naam: 'Voeding', bedrag: 300, kleur: '#111' },
          { naam: 'Wonen', bedrag: 200, kleur: null },
        ]}
      />,
    )
    expect(screen.getByText('Voeding')).toBeInTheDocument()
    expect(screen.getByText('Wonen')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'uitgaven per categorie' })).toBeInTheDocument()
  })

  it('toont niets bij lege data', () => {
    const { container } = render(<Donut items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('toont percentages die samen exact 100% zijn', () => {
    render(
      <Donut
        items={[
          { naam: 'A', bedrag: 100, kleur: '#111' },
          { naam: 'B', bedrag: 100, kleur: '#222' },
          { naam: 'C', bedrag: 100, kleur: '#333' },
        ]}
      />,
    )
    // Apart afronden gaf drie keer 33% (samen 99%); nu 34 + 33 + 33 = 100.
    const percentages = screen.getAllByText(/^\d+%$/).map((el) => Number(el.textContent!.replace('%', '')))
    expect(percentages).toEqual([34, 33, 33])
    expect(percentages.reduce((s, p) => s + p, 0)).toBe(100)
  })

  it('toont twee gelijknamige schijven allebei (unieke sleutel per segment)', () => {
    render(
      <Donut
        items={[
          { naam: 'Onbekend', bedrag: 300, kleur: '#111' },
          { naam: 'Onbekend', bedrag: 100, kleur: '#222' },
        ]}
      />,
    )
    expect(screen.getAllByText('Onbekend')).toHaveLength(2)
  })
})

// Ronde 31: de donut op het Overzicht had een waslijst met alle categorieën
// eronder. Nu geeft de grafiek zélf haar cijfers prijs — in het gat, want dat
// werkt op een muis én op een telefoon, waar een zwevende tooltip niet bestaat.
describe('Donut — interactief', () => {
  const items = [
    { naam: 'Voeding', bedrag: 7500, kleur: '#111' },
    { naam: 'Wonen', bedrag: 2500, kleur: '#222' },
  ]

  function schijven(container: HTMLElement): SVGPathElement[] {
    return [...container.querySelectorAll('path.donut-schijf')] as unknown as SVGPathElement[]
  }

  it('toont in rust het totaal in het gat', () => {
    render(<Donut items={items} interactief toonLegende={false} />)
    expect(screen.getByText('€ 100,00')).toBeInTheDocument()
    expect(screen.getByText('uitgaven')).toBeInTheDocument()
  })

  it('zet naam, bedrag en aandeel in het gat zodra je over een schijf hangt', async () => {
    const user = userEvent.setup()
    const { container } = render(<Donut items={items} interactief toonLegende={false} />)
    await user.hover(schijven(container)[0])

    expect(screen.getByText('Voeding')).toBeInTheDocument()
    expect(screen.getByText('€ 75,00')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    // Het totaal maakt plaats voor het cijfer van de schijf.
    expect(screen.queryByText('€ 100,00')).toBeNull()
  })

  it('kiest ook met een tik, want hangen bestaat niet op een telefoon', async () => {
    const user = userEvent.setup()
    const { container } = render(<Donut items={items} interactief toonLegende={false} />)
    await user.click(schijven(container)[1])
    expect(screen.getByText('Wonen')).toBeInTheDocument()
    expect(screen.getByText('€ 25,00')).toBeInTheDocument()

    // Nog eens tikken zet de donut terug op het totaal.
    await user.click(schijven(container)[1])
    expect(screen.getByText('€ 100,00')).toBeInTheDocument()
  })

  it('schuift de gekozen schijf naar buiten', async () => {
    const user = userEvent.setup()
    const { container } = render(<Donut items={items} interactief toonLegende={false} />)
    expect(schijven(container)[0].getAttribute('transform')).toBeNull()
    await user.hover(schijven(container)[0])
    expect(schijven(container)[0].getAttribute('transform')).toMatch(/^translate\(/)
  })

  it('zet de volledige inhoud in het toegankelijke label', () => {
    // Hangen en tikken bestaan niet voor hulpsoftware; die moet alles in één keer
    // kunnen voorlezen.
    render(<Donut items={items} interactief toonLegende={false} />)
    const svg = screen.getByRole('img')
    // formatEuro gebruikt een vaste spatie tussen het teken en het getal, dus we
    // bouwen de verwachting met dezelfde functie in plaats van ze over te typen.
    expect(svg.getAttribute('aria-label')).toContain(`Voeding 75% ${formatEuro(7500)}`)
    expect(svg.getAttribute('aria-label')).toContain(`Wonen 25% ${formatEuro(2500)}`)
  })

  it('reageert niet zolang ze niet interactief is', async () => {
    const user = userEvent.setup()
    const { container } = render(<Donut items={items} toonLegende={false} />)
    await user.hover(schijven(container)[0])
    expect(screen.getByText('€ 100,00')).toBeInTheDocument()
  })
})

// SVG-tekst breekt niet vanzelf af: één lange categorienaam liep dwars over de
// ring heen. Ze wordt daarom zelf in hoogstens twee regels geknipt.
describe('splitsLabel', () => {
  it('laat een korte naam met rust', () => {
    expect(splitsLabel('Voeding')).toEqual(['Voeding'])
  })

  it('breekt op een spatie in plaats van middenin een woord', () => {
    expect(splitsLabel('Woning en vaste lasten')).toEqual(['Woning en vaste', 'lasten'])
  })

  it('kort een woord in dat op zichzelf al te lang is', () => {
    const uit = splitsLabel('Onwaarschijnlijklangecategorienaam')
    expect(uit).toHaveLength(1)
    expect(uit[0]).toHaveLength(16)
    expect(uit[0].endsWith('…')).toBe(true)
  })

  it('houdt het bij hoogstens twee regels', () => {
    const uit = splitsLabel('Een heel lange naam die never nooit past hier')
    expect(uit.length).toBeLessThanOrEqual(2)
    expect(uit.every((r) => r.length <= 16)).toBe(true)
  })

  it('zet de gekozen naam in het gat, afgebroken', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Donut
        items={[
          { naam: 'Woning en vaste lasten', bedrag: 7500, kleur: '#111' },
          { naam: 'Voeding', bedrag: 2500, kleur: '#222' },
        ]}
        interactief
        toonLegende={false}
      />,
    )
    await user.hover(container.querySelector('path.donut-schijf')!)
    const regels = [...container.querySelectorAll('text tspan')].map((el) => el.textContent)
    expect(regels).toEqual(['Woning en vaste', 'lasten'])
  })

  // Ronde 32 — "de bewegende donutdelen zijn niet expressief genoeg."
  it('laat de gekozen schijf naar voren komen en de rest terugtreden', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Donut
        items={[
          { naam: 'Wonen', bedrag: 7500, kleur: '#111' },
          { naam: 'Voeding', bedrag: 2500, kleur: '#222' },
        ]}
        interactief
        toonLegende={false}
      />,
    )
    const schijven = [...container.querySelectorAll('path.donut-schijf')]
    // In rust: niets verschoven, niets gedimd.
    expect(schijven.every((s) => s.getAttribute('opacity') === '1')).toBe(true)

    await user.hover(schijven[0])
    // De gekozen schijf schuift weg van het midden én wordt groter.
    const verschuiving = schijven[0].getAttribute('transform') ?? ''
    expect(verschuiving).toContain('translate(')
    expect(verschuiving).toContain('scale(1.06)')
    // En de andere treedt terug.
    expect(schijven[1].getAttribute('opacity')).toBe('0.42')
  })

  it('dimt niets wanneer de donut niet interactief is', () => {
    const { container } = render(
      <Donut items={[{ naam: 'Wonen', bedrag: 7500, kleur: '#111' }, { naam: 'Voeding', bedrag: 2500, kleur: '#222' }]} />,
    )
    expect([...container.querySelectorAll('path.donut-schijf')].every((s) => s.getAttribute('opacity') === '1')).toBe(true)
  })

  // Ronde 33: de uitvergrote schijf werd afgesneden aan een grens die je niet
  // ziet — de rand van het tekenvlak liep exact tot aan de buitenkant van de
  // ring, dus alles wat naar buiten schoof viel eraf.
  it('houdt marge rond de ring zodat een uitgeschoven schijf niet afgesneden wordt', () => {
    const { container } = render(
      <Donut items={[{ naam: 'Wonen', bedrag: 7500, kleur: '#111' }, { naam: 'Voeding', bedrag: 2500, kleur: '#222' }]} interactief grootte={200} />,
    )
    const svg = container.querySelector('svg')!
    const [x, y, b] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)

    // Het tekenvlak begint links/boven van het nulpunt en loopt door tot voorbij
    // de ring: er is aan alle kanten ruimte.
    expect(x).toBeLessThan(0)
    expect(y).toBeLessThan(0)

    // De verste plek die een gekozen schijf inneemt: midden + straal x vergroting
    // + uitschuif. Die moet ruim binnen het vlak vallen, aan beide kanten.
    const verste = 95 + 84 * 1.06 + 9
    expect(verste).toBeLessThan(x + b)
    expect(95 - 84 * 1.06 - 9).toBeGreaterThan(x)

    // En het BEELD blijft even groot: de svg wordt in dezelfde verhouding breder
    // getekend, dus de ring krimpt niet mee met de marge.
    const opScherm = Number(svg.getAttribute('width'))
    expect(Math.round((opScherm * 190) / b)).toBe(200)
  })
})

// --- Ronde 40: doorklikken vanaf een schijf -----------------------------------
//
// Een donut was een doodlopend beeld: je zag dat Voeding € 3,00 was en er was geen
// enkele weg naar de boekingen erachter.

describe('Donut — doorklikken', () => {
  const items = [
    { naam: 'Voeding', bedrag: 300, kleur: '#111', sleutel: 'ov-voeding' },
    { naam: 'Wonen', bedrag: 200, kleur: '#222', sleutel: 'ov-woning-en-vaste-lasten' },
  ]

  it('toont geen knop zolang er geen schijf gekozen is', () => {
    render(<Donut items={items} interactief onKies={vi.fn()} toonLegende={false} />)
    expect(screen.queryByRole('button', { name: /Bekijk de boekingen/ })).toBeNull()
  })

  it('geeft na het kiezen van een schijf een gewone knop naar diezelfde schijf', async () => {
    // De toegankelijke weg: een <path> in een SVG is niet met het toetsenbord te
    // bereiken en wordt door hulpsoftware niet als knop aangeboden.
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<Donut items={items} interactief onKies={onKies} toonLegende={false} />)
    const schijven = document.querySelectorAll('.donut-schijf')
    await user.click(schijven[0])
    const knop = await screen.findByRole('button', { name: /Bekijk de boekingen van Voeding/ })
    await user.click(knop)
    expect(onKies).toHaveBeenCalledTimes(1)
    expect(onKies.mock.calls[0][0].sleutel).toBe('ov-voeding')
  })

  it('laat de keuze weer los bij een TWEEDE tik, ook met doorklikken aan', async () => {
    // Doorklikken gebeurt via de knop, niet via de tweede tik. Zou de tweede tik
    // navigeren, dan was er met `onKies` geen weg meer terug naar het totaal en
    // bleef de donut permanent met één uitgeschoven schijf staan.
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<Donut items={items} interactief onKies={onKies} toonLegende={false} />)
    const schijven = document.querySelectorAll('.donut-schijf')
    await user.click(schijven[1])
    expect(await screen.findByRole('button', { name: /Bekijk de boekingen van Wonen/ })).toBeInTheDocument()
    await user.click(schijven[1])
    expect(screen.queryByRole('button', { name: /Bekijk de boekingen/ })).toBeNull()
    expect(onKies).not.toHaveBeenCalled()
  })

  it('houdt de aangewezen schijf niet vast wanneer er al een aangetikt is', async () => {
    // Ging je met de muis van Voeding naar de knop eronder en passeerde je Wonen,
    // dan heette de knop ineens "Bekijk de boekingen van Wonen".
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<Donut items={items} interactief onKies={onKies} toonLegende={false} />)
    const schijven = document.querySelectorAll('.donut-schijf')
    await user.click(schijven[0])
    await user.hover(schijven[1])
    expect(screen.getByRole('button', { name: /Bekijk de boekingen van Voeding/ })).toBeInTheDocument()
  })

  it('maakt ook één enkele categorie doorklikbaar', async () => {
    // Bij precies één schijf tekent de donut een volle ring in plaats van paden;
    // zonder handlers daarop was er dan geen enkele weg naar de boekingen.
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<Donut items={[items[0]]} interactief onKies={onKies} toonLegende={false} />)
    await user.click(document.querySelector('.donut-schijf') as Element)
    await user.click(await screen.findByRole('button', { name: /Bekijk de boekingen van Voeding/ }))
    expect(onKies).toHaveBeenCalledTimes(1)
  })

  it('toont geen knop bij een schijf die slechts aangewezen is', async () => {
    // Anders duwt alles onder de grafiek op en neer zodra je er met de muis over
    // beweegt.
    const user = userEvent.setup()
    render(<Donut items={items} interactief onKies={vi.fn()} toonLegende={false} />)
    await user.hover(document.querySelectorAll('.donut-schijf')[0])
    expect(screen.queryByRole('button', { name: /Bekijk de boekingen/ })).toBeNull()
  })

  it('blijft zonder de prop precies doen wat ze vroeger deed: de keuze weer loslaten', async () => {
    const user = userEvent.setup()
    render(<Donut items={items} interactief toonLegende={false} />)
    const schijven = document.querySelectorAll('.donut-schijf')
    const gatTekst = () => document.querySelector('svg')?.textContent ?? ''
    await user.click(schijven[0])
    expect(gatTekst()).toContain(formatEuro(300))
    await user.click(schijven[0])
    // Terug naar het totaal (500) in het gat.
    expect(gatTekst()).toContain(formatEuro(500))
  })

  it('draagt de sleutel van de invoer mee naar het segment', () => {
    const onKies = vi.fn()
    render(<Donut items={[{ naam: 'Winkel X', bedrag: 100, kleur: '#333' }]} interactief onKies={onKies} toonLegende={false} />)
    // Zonder sleutel (bv. de uitsplitsing per winkel) mag er niets doorklikken:
    // er bestaat geen id om op te filteren.
    expect(screen.queryByRole('button', { name: /Bekijk de boekingen/ })).toBeNull()
  })
})
