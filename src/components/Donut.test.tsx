import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
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
