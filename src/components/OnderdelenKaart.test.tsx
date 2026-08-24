import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnderdelenKaart } from './OnderdelenKaart'
import { OnderNavigatie } from './OnderNavigatie'
import { Zijbalk } from './Zijbalk'
import { InstellingenProvider } from '../instellingen'
import { ALLEEN_DE_BASIS, APP_ONDERDELEN } from '../utils/appOnderdelen'
import type { Pagina } from './navigatie'

// Ronde 75 — "Minder tegelijk", de laatste van de vier uit de twaalfjarigetest.
// Timothy's voorwaarde stond er meteen bij: **verbergen mag, maar verbergen is niet
// weghalen** — er moet een plek zijn waar je het weer aanzet, mét een zin die zegt
// wat het is.

// ⚠ Centraal opruimen en niet per test (doorlichting ronde 75). Vijf tests zetten een
// voorkeur in `localStorage`; stond het wissen als laatste regel van de testbody, dan
// werd het bij een FALENDE test nooit bereikt en erfde de volgende test die rommel.
// Drie andere bestanden in dit project doen het al zo (`instellingen.test.tsx`,
// `InstellingenSectie.test.tsx`, `thema.test.ts`).
beforeEach(() => localStorage.clear())

function toonKaart(verborgen: Pagina[] = [], gegevens: Partial<Record<Pagina, number>> = {}) {
  const onWissel = vi.fn()
  const onZetAlles = vi.fn()
  render(
    <OnderdelenKaart verborgen={verborgen} onWissel={onWissel} onZetAlles={onZetAlles} gegevens={gegevens} />,
  )
  return { onWissel, onZetAlles }
}

describe('OnderdelenKaart — de plek waar je iets aan- of uitzet', () => {
  it('zegt bij élk onderdeel wat het is', () => {
    // ⚠ De kern van de afspraak. Een vinkje met alleen "Fiscaal" ernaast is een
    // schakelaar waarvan je niet weet wat hij doet, en dan durf je hem niet aan te
    // raken. Zonder die zinnen is deze kaart een lijst valstrikken.
    toonKaart()
    for (const o of APP_ONDERDELEN) {
      expect(screen.getByText(o.uitleg)).toBeInTheDocument()
    }
  })

  it('belooft dat er niets verloren gaat', () => {
    toonKaart()
    expect(screen.getByText(/er gaat niets verloren/)).toBeInTheDocument()
  })

  it('zegt dat een uitgezette pagina blijft bestaan en met één tik terugkomt', () => {
    // Verbergen is opruimen, geen slot. Wie dat niet weet, durft niets uit te zetten.
    // ⚠ De zin belooft bewust GEEN knop elders in de app: voor vijf van de negen
    // pagina's wijst er nergens iets naartoe (doorlichting ronde 75).
    toonKaart()
    expect(screen.getByText(/blijft bestaan/)).toBeInTheDocument()
    expect(screen.getByText(/met één tik terug/)).toBeInTheDocument()
    expect(screen.queryByText(/blijft werken/)).toBeNull()
  })

  it('toont een vinkje per onderdeel, aan wanneer het onderdeel aan staat', async () => {
    const gebruiker = userEvent.setup()
    const { onWissel } = toonKaart()
    const analyse = screen.getByRole('checkbox', { name: 'Analyse' })
    expect(analyse).toBeChecked()
    await gebruiker.click(analyse)
    expect(onWissel).toHaveBeenCalledWith('analyse')
  })

  it('toont een uitgezet onderdeel als niet aangevinkt', () => {
    toonKaart(['analyse'])
    expect(screen.getByRole('checkbox', { name: 'Analyse' })).not.toBeChecked()
  })

  it('zet met één knop alles uit wat uit mag', () => {
    // ⚠ Een KNOP en geen standaardwaarde: wie de app al gebruikt, mag niet wakker
    // worden met negen verdwenen pagina's (regel van ronde 60).
    const gebruiker = userEvent.setup()
    const { onZetAlles } = toonKaart()
    return gebruiker.click(screen.getByRole('button', { name: 'Toon me alleen de basis' })).then(() => {
      expect(onZetAlles).toHaveBeenCalledWith([...ALLEEN_DE_BASIS])
    })
  })

  it('zet met één knop alles weer aan', async () => {
    const gebruiker = userEvent.setup()
    const { onZetAlles } = toonKaart([...ALLEEN_DE_BASIS])
    await gebruiker.click(screen.getByRole('button', { name: 'Zet alles weer aan' }))
    expect(onZetAlles).toHaveBeenCalledWith([])
  })

  it('gebruikt aria-disabled en niet disabled op een knop die niets te doen heeft', async () => {
    // Huisregel sinds ronde 41: `disabled` haalt een knop uit de tab-volgorde.
    const gebruiker = userEvent.setup()
    const { onZetAlles } = toonKaart()
    const knop = screen.getByRole('button', { name: 'Zet alles weer aan' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    expect(knop).not.toBeDisabled()
    await gebruiker.click(knop)
    expect(onZetAlles).not.toHaveBeenCalled()
  })

  it('telt hoeveel er uitstaat, in enkelvoud en meervoud', () => {
    toonKaart([])
    expect(screen.getByText('Alle pagina\'s staan aan.')).toBeInTheDocument()

    document.body.innerHTML = ''
    toonKaart(['analyse'])
    expect(screen.getByText('Eén pagina staat uit.')).toBeInTheDocument()

    document.body.innerHTML = ''
    toonKaart(['analyse', 'fiscaal'])
    expect(screen.getByText('2 pagina\'s staan uit.')).toBeInTheDocument()
  })

  it('kondigt die stand aan, en gebruikt hem als reden bij een knop die uitstaat', () => {
    // ⚠ Eén tik op "Toon me alleen de basis" verandert negen vinkjes tegelijk en zet de
    // knop waarop je staat uit. Zonder live-rol hoort wie met een schermlezer werkt
    // helemaal niets gebeuren — en zonder `aria-describedby` weet hij ook niet waarom
    // de knop niets doet (de tweede helft van de huisregel van ronde 41).
    toonKaart([])
    const stand = screen.getByRole('status')
    expect(stand).toHaveTextContent('Alle pagina\'s staan aan.')
    expect(screen.getByRole('button', { name: 'Zet alles weer aan' })).toHaveAttribute(
      'aria-describedby',
      stand.id,
    )
    // De knop die wél iets te doen heeft, wijst nergens heen: er is geen reden.
    expect(screen.getByRole('button', { name: 'Toon me alleen de basis' })).not.toHaveAttribute('aria-describedby')
  })

  it('blokkeert ook de ándere knop wanneer die niets te doen heeft', () => {
    // Beide knoppen dragen dezelfde regel; eerst was er maar één van getest.
    const gebruiker = userEvent.setup()
    const { onZetAlles } = toonKaart([...ALLEEN_DE_BASIS])
    const knop = screen.getByRole('button', { name: 'Toon me alleen de basis' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    expect(knop).not.toBeDisabled()
    return gebruiker.click(knop).then(() => expect(onZetAlles).not.toHaveBeenCalled())
  })

  it('geeft elk vinkje een raakvlak van 44 px', () => {
    // `raak-label` is de klasse die dat doet (ronde 61). Zonder test sneuvelt ze stil.
    toonKaart()
    expect(screen.getByRole('checkbox', { name: 'Analyse' }).closest('label')).toHaveClass('raak-label')
  })

  it('laat een schermlezer de uitlegzin bij het vinkje horen', () => {
    // ⚠ Wie door de bedienbare elementen tabt, hoorde anders alleen "Analyse,
    // selectievakje" — en nooit de zin die zegt wát Analyse is. Dat is precies de zin
    // die deze ronde "de kern van de afspraak" noemt.
    toonKaart()
    const vinkje = screen.getByRole('checkbox', { name: 'Analyse' })
    const id = vinkje.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(id.split(' ')[0])).toHaveTextContent(/Grafieken over waar je geld/)
  })

  it('hangt ook de "er staat nog iets in"-regel aan het vinkje', () => {
    toonKaart(['dossiers'], { dossiers: 3 })
    const vinkje = screen.getByRole('checkbox', { name: 'Dossiers' })
    const ids = (vinkje.getAttribute('aria-describedby') ?? '').split(' ')
    expect(ids).toHaveLength(2)
    expect(document.getElementById(ids[1])).toHaveTextContent(/nog 3 dingen in/)
  })

  it('zegt het wanneer er in een uitgezet onderdeel nog gegevens zitten', () => {
    // ⚠ De regel van ronde 60. Zonder haar verdwijnt Dossiers uit je menu terwijl er
    // drie dossiers in zitten, en lijkt het alsof je gegevens weg zijn.
    toonKaart(['dossiers'], { dossiers: 3 })
    expect(screen.getByText(/nog 3 dingen in/)).toBeInTheDocument()
  })

  it('zegt dat ook in het enkelvoud, en zet het apart van de gewone uitleg', () => {
    // ⚠ Eigen opmaak (`foutregel`, net als in ronde 60): twee identieke grijze regels
    // onder elkaar, waarvan de tweede de waarschuwing is, laat die waarschuwing
    // verdwijnen in de ruis.
    toonKaart(['dossiers'], { dossiers: 1 })
    const regel = screen.getByText(/nog 1 ding in/)
    expect(regel).toBeInTheDocument()
    expect(regel).toHaveClass('foutregel')
  })

  it('zwijgt daarover zolang het onderdeel gewoon aan staat', () => {
    toonKaart([], { dossiers: 3 })
    expect(screen.queryByText(/nog 3 dingen in/)).toBeNull()
  })

  it('zwijgt daarover bij een leeg onderdeel', () => {
    toonKaart(['dossiers'], { dossiers: 0 })
    expect(screen.queryByText(/dingen in/)).toBeNull()
  })
})

describe('De navigatie volgt de keuze (ronde 75)', () => {
  function metVoorkeur(verborgen: Pagina[], kind: React.ReactNode) {
    localStorage.setItem('fk_verborgen_paginas', JSON.stringify(verborgen))
    render(<InstellingenProvider>{kind}</InstellingenProvider>)
  }

  it('haalt een uitgezette pagina uit het zijpaneel', () => {
    metVoorkeur(['analyse'], <Zijbalk actief="overzicht" onKies={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Analyse' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Budget' })).toBeInTheDocument()
  })

  it('laat de pagina waar je STAAT altijd staan', () => {
    // ⚠ Zet je Analyse uit terwijl je erop staat, dan zou de knop met
    // `aria-current="page"` onder je vandaan verdwijnen: het paneel zegt dan nergens
    // meer waar je bent, en je kan er ook niet met één tik weg.
    metVoorkeur(['analyse'], <Zijbalk actief="analyse" onKies={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Analyse' })).toHaveAttribute('aria-current', 'page')
  })

  it('haalt een uitgezette pagina ook uit de lade op een telefoon', async () => {
    const gebruiker = userEvent.setup()
    metVoorkeur(['analyse'], <OnderNavigatie actief="overzicht" onKies={vi.fn()} onNieuweTransactie={vi.fn()} />)
    await gebruiker.click(screen.getByRole('button', { name: /Meer/ }))
    const lade = screen.getByRole('group', { name: /Meer/ })
    expect(within(lade).queryByRole('button', { name: 'Analyse' })).toBeNull()
    expect(within(lade).getByRole('button', { name: 'Dossiers' })).toBeInTheDocument()
  })

  it('laat de pagina waar je STAAT ook in de lade staan', async () => {
    // ⚠ Dezelfde regel als in het zijpaneel, en op een telefoon de belangrijkste van
    // de twee: de lade is daar je ENIGE menu. Zet je Analyse uit terwijl je erop staat,
    // dan zou de plek waar je bent uit dat menu verdwijnen.
    const gebruiker = userEvent.setup()
    metVoorkeur(['analyse'], <OnderNavigatie actief="analyse" onKies={vi.fn()} onNieuweTransactie={vi.fn()} />)
    await gebruiker.click(screen.getByRole('button', { name: /Meer/ }))
    const lade = screen.getByRole('group', { name: /Meer/ })
    expect(within(lade).getByRole('button', { name: 'Analyse' })).toHaveAttribute('aria-current', 'page')
  })

  it('houdt beide koppen staan, ook met alles uit wat uit mag', async () => {
    // ⚠ Deze test heette eerst "laat de groep verdwijnen wanneer élke pagina erin
    // uitstaat" en toetste het tegenovergestelde. Dat kán ook niet gebeuren: "Elke
    // maand" bevat Rekeningen, en "Af en toe" bevat Je situatie én Instellingen — en
    // die drie zijn niet uitzetbaar. De filter die dat afdekte, is weggehaald (zie
    // OnderNavigatie). Wat hier bewaakt wordt, is dat de lade bruikbaar BLIJFT met
    // alles uit: twee koppen, en onder elk minstens één pagina.
    const gebruiker = userEvent.setup()
    metVoorkeur([...ALLEEN_DE_BASIS], <OnderNavigatie actief="overzicht" onKies={vi.fn()} onNieuweTransactie={vi.fn()} />)
    await gebruiker.click(screen.getByRole('button', { name: /Meer/ }))
    const lade = screen.getByRole('group', { name: /Meer/ })
    expect(within(lade).getByText('Elke maand')).toBeInTheDocument()
    expect(within(lade).getByText('Af en toe')).toBeInTheDocument()
    expect(within(lade).getByRole('button', { name: 'Rekeningen' })).toBeInTheDocument()
    // ⚠ De belangrijkste: Instellingen blijft bereikbaar, want daar zet je het terug.
    expect(within(lade).getByRole('button', { name: 'Instellingen' })).toBeInTheDocument()
    expect(within(lade).queryByRole('button', { name: 'Dossiers' })).toBeNull()
  })
})
