import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MaandafsluitingSectie } from './MaandafsluitingSectie'
import type { Budget, Maandafsluiting, TerugkerendePost, Transactie } from '../data/schema'
import { bouwHandelaarIndex } from '../utils/categorieVoorstel'
import { formatEuro } from '../utils/format'

const VANDAAG = '2026-07-10'

const tx = (id: string, datum: string, bedrag: number, omschrijving: string, categorieId?: string): Transactie => ({
  id,
  datum,
  omschrijving,
  bedrag,
  rekeningId: 'r1',
  ...(categorieId ? { categorieId } : {}),
})

function toon(
  opties: {
    transacties?: Transactie[]
    budgetten?: Budget[]
    terugkerendePosten?: TerugkerendePost[]
    afsluitingen?: Maandafsluiting[]
  } = {},
) {
  const onCategoriseer = vi.fn()
  const onAfsluiten = vi.fn()
  const onHeropen = vi.fn()
  const onGaNaarInlezen = vi.fn()
  const onToonBoekingen = vi.fn()
  const onToonZonderCategorie = vi.fn()
  const transacties = opties.transacties ?? []
  const resultaat = render(
    <MaandafsluitingSectie
      transacties={transacties}
      categorieen={[]}
      budgetten={opties.budgetten ?? []}
      terugkerendePosten={opties.terugkerendePosten ?? []}
      afsluitingen={opties.afsluitingen ?? []}
      handelaarIndex={bouwHandelaarIndex(transacties)}
      onCategoriseer={onCategoriseer}
      onAfsluiten={onAfsluiten}
      onHeropen={onHeropen}
      onGaNaarInlezen={onGaNaarInlezen}
      onToonBoekingen={onToonBoekingen}
      onToonZonderCategorie={onToonZonderCategorie}
      vandaagISO={VANDAAG}
    />,
  )
  return {
    ...resultaat,
    onCategoriseer,
    onAfsluiten,
    onHeropen,
    onGaNaarInlezen,
    onToonBoekingen,
    onToonZonderCategorie,
  }
}

// Juni 2026 is de vorige maand en dus de maand die standaard afgesloten wordt.
const juni = [
  tx('loon', '2026-06-01', 240000, 'Loon', 'ov-inkomsten'),
  tx('huur', '2026-06-03', -95000, 'Huur', 'cat-huisvesting'),
]

describe('MaandafsluitingSectie — de drie stappen', () => {
  it('kiest standaard de oudste maand die nog open staat', () => {
    const { container } = toon({ transacties: [...juni, tx('mei', '2026-05-04', -3000, 'Winkel', 'ov-voeding')] })
    // Mei is ouder dan juni en staat nog open, dus daar begin je.
    expect(container.textContent).toContain('mei 2026')
  })

  it('vinkt stap 1 af zodra er boekingen zijn', () => {
    toon({ transacties: juni })
    const kaart = screen.getByText(/Staat alles erin\?/).closest('.kaart') as HTMLElement
    expect(within(kaart).getByText('rond')).toBeInTheDocument()
  })

  it('zegt het wanneer een maand nog helemaal leeg is', () => {
    const { container } = toon()
    expect(container.textContent).toContain('Er staat nog geen enkele boeking')
  })

  it('brengt je naar het inlezen', async () => {
    const gebruiker = userEvent.setup()
    const { onGaNaarInlezen } = toon({ transacties: juni })
    await gebruiker.click(screen.getByRole('button', { name: 'Uittreksel inlezen' }))
    expect(onGaNaarInlezen).toHaveBeenCalled()
  })

  it('meldt stap 2 rond wanneer alles een categorie heeft', () => {
    toon({ transacties: juni })
    const kaart = screen.getByText(/Waar hoort het bij\?/).closest('.kaart') as HTMLElement
    expect(within(kaart).getByText('rond')).toBeInTheDocument()
    expect(kaart.textContent).toContain('Alles heeft een categorie')
  })

  it('toont de boekingen zonder categorie met een keuzelijst', () => {
    toon({ transacties: [...juni, tx('los', '2026-06-07', -2500, 'Onbekende winkel')] })
    const kaart = screen.getByText(/Waar hoort het bij\?/).closest('.kaart') as HTMLElement
    expect(within(kaart).getByText('open')).toBeInTheDocument()
    expect(kaart.textContent).toContain('Onbekende winkel')
    expect(screen.getByLabelText('Categorie voor Onbekende winkel')).toBeInTheDocument()
  })

  it('bewaart een categorie meteen bij het kiezen', async () => {
    // Een aparte bewaarknop per rij zou van één handeling er twee maken, en dat is
    // precies wat de maandafsluiting wil wegnemen.
    const gebruiker = userEvent.setup()
    const { onCategoriseer } = toon({ transacties: [...juni, tx('los', '2026-06-07', -2500, 'Onbekende winkel')] })
    await gebruiker.selectOptions(screen.getByLabelText('Categorie voor Onbekende winkel'), 'ov-voeding')
    expect(onCategoriseer).toHaveBeenCalledWith('los', 'ov-voeding')
  })

  it('biedt de categorie van de vorige keer aan als knop', async () => {
    // Q8 stond eerder al op Vervoer. Het voorstel in de keuzelijst zetten zou lezen
    // alsof de boeking al een categorie heeft — en een <select> meldt geen wijziging
    // wanneer je de al gekozen optie nog eens aanklikt, dus je kon het niet eens
    // overnemen. Vandaar een eigen knop.
    const gebruiker = userEvent.setup()
    const { onCategoriseer } = toon({
      transacties: [
        ...juni,
        tx('oud', '2026-06-02', -6000, 'Q8', 'ov-vervoer-en-mobiliteit'),
        tx('nieuw', '2026-06-08', -6500, 'Q8'),
      ],
    })
    const keuze = screen.getByLabelText('Categorie voor Q8') as HTMLSelectElement
    expect(keuze.value).toBe('')
    await gebruiker.click(screen.getByRole('button', { name: /^Neem .* over$/ }))
    expect(onCategoriseer).toHaveBeenCalledWith('nieuw', 'ov-vervoer-en-mobiliteit')
  })

  it('biedt geen knop aan wanneer de app niets kan voorstellen', () => {
    toon({ transacties: [...juni, tx('los', '2026-06-07', -2500, 'Nooit eerder gezien')] })
    expect(screen.queryByRole('button', { name: /^Neem .* over$/ })).not.toBeInTheDocument()
  })

  it('toont het oordeel van de maand', () => {
    const { container } = toon({ transacties: juni })
    expect(container.textContent).toContain(formatEuro(240000))
    expect(container.textContent).toContain(formatEuro(95000))
    expect(container.textContent).toContain('Je hield')
  })
})

describe('MaandafsluitingSectie — afsluiten', () => {
  it('sluit de maand af met de datum van vandaag', async () => {
    const gebruiker = userEvent.setup()
    const { onAfsluiten } = toon({ transacties: juni })
    await gebruiker.click(screen.getByRole('button', { name: 'Maand afsluiten' }))
    expect(onAfsluiten).toHaveBeenCalledWith(expect.objectContaining({ id: '2026-06', afgeslotenOp: VANDAAG }))
  })

  it('onthoudt wat er bleef liggen', async () => {
    // Je mag afsluiten met werk dat open staat, maar dan hoort de app te onthouden
    // dat je dat wist — anders lijkt die maand later helemaal rond.
    const gebruiker = userEvent.setup()
    const { onAfsluiten } = toon({ transacties: [...juni, tx('los', '2026-06-07', -2500, 'Onbekend')] })
    await gebruiker.click(screen.getByRole('button', { name: 'Maand afsluiten' }))
    expect(onAfsluiten).toHaveBeenCalledWith(expect.objectContaining({ zonderCategorie: 1 }))
  })

  it('zegt het wanneer er nog werk open staat', () => {
    const { container } = toon({ transacties: [...juni, tx('los', '2026-06-07', -2500, 'Onbekend')] })
    expect(container.textContent).toContain('Er staat nog werk open')
  })

  it('toont een afgesloten maand als afgesloten, met een weg terug', async () => {
    const gebruiker = userEvent.setup()
    const { container, onHeropen } = toon({
      transacties: juni,
      afsluitingen: [{ id: '2026-06', afgeslotenOp: '2026-07-06' }],
    })
    expect(container.textContent).toContain('is afgesloten op 2026-07-06')
    expect(screen.queryByRole('button', { name: 'Maand afsluiten' })).not.toBeInTheDocument()
    await gebruiker.click(screen.getByRole('button', { name: 'Toch nog openzetten' }))
    expect(onHeropen).toHaveBeenCalledWith('2026-06')
  })

  it('houdt zich aan de regel van één gevulde knop', () => {
    // DESIGN.md: hoogstens één `knop-primair` per scherm.
    const { container } = toon({ transacties: juni })
    expect(container.querySelectorAll('.knop-primair').length).toBe(1)
  })

  it('meldt een mislukte afsluiting in plaats van te zwijgen', async () => {
    const gebruiker = userEvent.setup()
    render(
      <MaandafsluitingSectie
        transacties={juni}
        categorieen={[]}
        budgetten={[]}
        terugkerendePosten={[]}
        afsluitingen={[]}
        handelaarIndex={bouwHandelaarIndex(juni)}
        onCategoriseer={vi.fn()}
        onAfsluiten={() => {
          throw new Error('stuk')
        }}
        onHeropen={vi.fn()}
        onGaNaarInlezen={vi.fn()}
        onToonBoekingen={vi.fn()}
        onToonZonderCategorie={vi.fn()}
        vandaagISO={VANDAAG}
      />,
    )
    await gebruiker.click(screen.getByRole('button', { name: 'Maand afsluiten' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Afsluiten is niet gelukt')
  })
})

describe('MaandafsluitingSectie — doorklikken', () => {
  it('toont enkel wat nog geen categorie heeft', async () => {
    const gebruiker = userEvent.setup()
    const { onToonZonderCategorie } = toon({
      transacties: [...juni, tx('los', '2026-06-07', -2500, 'Onbekend')],
    })
    await gebruiker.click(screen.getByRole('button', { name: 'Bekijk ze in de lijst ›' }))
    expect(onToonZonderCategorie).toHaveBeenCalledWith('2026-06')
  })

  it('brengt je naar de boekingen van die maand', async () => {
    const gebruiker = userEvent.setup()
    const { onToonBoekingen } = toon({ transacties: juni })
    await gebruiker.click(screen.getByRole('button', { name: 'Bekijk de boekingen ›' }))
    expect(onToonBoekingen).toHaveBeenCalledWith('2026-06')
  })

  it('laat je een andere maand kiezen', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon({ transacties: [...juni, tx('mei', '2026-05-04', -3000, 'Winkel', 'ov-voeding')] })
    await gebruiker.selectOptions(screen.getByLabelText('Welke maand sluit je af?'), '2026-06')
    expect(container.textContent).toContain('juni 2026')
  })
})

describe('MaandafsluitingSectie — de punten uit de review', () => {
  it('blijft op de maand die je net afsloot', () => {
    // Zonder deze regel verschoof het scherm naar de volgende maand, met daaronder
    // meteen weer een actieve knop "Maand afsluiten" — één klik verder sloot je een
    // maand af die je niet bedoelde.
    const transacties = [...juni, tx('mei', '2026-05-04', -3000, 'Winkel', 'ov-voeding')]
    const { container, rerender } = render(
      <MaandafsluitingSectie
        transacties={transacties}
        categorieen={[]}
        budgetten={[]}
        terugkerendePosten={[]}
        afsluitingen={[]}
        handelaarIndex={bouwHandelaarIndex(transacties)}
        onCategoriseer={vi.fn()}
        onAfsluiten={vi.fn()}
        onHeropen={vi.fn()}
        onGaNaarInlezen={vi.fn()}
        onToonBoekingen={vi.fn()}
        onToonZonderCategorie={vi.fn()}
        vandaagISO={VANDAAG}
      />,
    )
    expect(container.textContent).toContain('mei 2026')
    return userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Maand afsluiten' }))
      .then(() => {
        // De app herlaadt en mei is nu afgesloten.
        rerender(
          <MaandafsluitingSectie
            transacties={transacties}
            categorieen={[]}
            budgetten={[]}
            terugkerendePosten={[]}
            afsluitingen={[{ id: '2026-05', afgeslotenOp: VANDAAG }]}
            handelaarIndex={bouwHandelaarIndex(transacties)}
            onCategoriseer={vi.fn()}
            onAfsluiten={vi.fn()}
            onHeropen={vi.fn()}
            onGaNaarInlezen={vi.fn()}
            onToonBoekingen={vi.fn()}
            onToonZonderCategorie={vi.fn()}
            vandaagISO={VANDAAG}
          />,
        )
        expect(container.textContent).toContain('mei 2026 is afgesloten op')
        expect(screen.queryByRole('button', { name: 'Maand afsluiten' })).not.toBeInTheDocument()
        // En mei blijft bereikbaar in de keuzelijst.
        const keuze = screen.getByLabelText('Welke maand sluit je af?') as HTMLSelectElement
        expect([...keuze.options].map((o) => o.value)).toContain('2026-05')
      })
  })

  it('geeft de rij de layoutklasse die de rest van de app gebruikt', () => {
    // `.rij-kost` alleen zet enkel flex-wrap; alle padding en scheidingslijnen
    // zitten op `.rij`. jsdom rekent geen layout uit, dus dit is de enige plek waar
    // een test dit kan vastleggen.
    const { container } = toon({ transacties: [...juni, tx('los', '2026-06-07', -2500, 'Onbekend')] })
    const rij = container.querySelector('[data-te-categoriseren]') as HTMLElement
    expect(rij.className.split(' ')).toContain('rij')
    expect(rij.className.split(' ')).toContain('rij-kost')
  })
})
