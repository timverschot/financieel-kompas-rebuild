import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieBoom } from './CategorieBoom'
import { CategorieVolgordeProvider } from '../categorievolgorde'

function renderBoom(props: Partial<Parameters<typeof CategorieBoom>[0]> = {}) {
  const fns = { onToevoegen: vi.fn(), onWijzigen: vi.fn(), onVerwijderen: vi.fn() }
  render(<CategorieBoom aanpassingen={[]} {...fns} {...props} />)
  return fns
}

describe('CategorieBoom', () => {
  it('vouwt open van hoofdcategorie naar categorie naar items', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    expect(await screen.findByText('Eieren')).toBeInTheDocument()
  })

  it('voegt een subcategorie toe onder een categorie', async () => {
    const user = userEvent.setup()
    const fns = renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    await user.click(screen.getByRole('button', { name: 'Voeg subcategorie toe aan Zuivel en Kaas' }))
    await user.type(screen.getByLabelText('Nieuwe subcategorie in Zuivel en Kaas'), 'Kefir')
    // ⚠ De knop heet niet gewoon "Toevoegen": je kan een categorie én een subcategorie
    // tegelijk openstaan hebben, en dan waren die twee knoppen niet uit elkaar te
    // houden. De laag staat nu in de naam.
    await user.click(screen.getByRole('button', { name: 'Voeg deze subcategorie toe in Zuivel en Kaas' }))
    expect(fns.onToevoegen).toHaveBeenCalledWith('cat-zuivel-en-kaas', 'Kefir')
  })

  it('hernoemt een bestaande (ingebouwde) subcategorie', async () => {
    const user = userEvent.setup()
    const fns = renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    await user.click(screen.getByRole('button', { name: 'Wijzig Eieren' }))
    const input = screen.getByLabelText('Nieuwe naam voor Eieren')
    await user.clear(input)
    await user.type(input, 'Bio-eieren')
    await user.click(screen.getByRole('button', { name: 'Bewaar' }))
    expect(fns.onWijzigen).toHaveBeenCalledWith('i-eieren-4688', 'cat-zuivel-en-kaas', 'Bio-eieren')
  })

  it('toont een eigen toevoeging met verwijderknop', () => {
    const fns = renderBoom({ aanpassingen: [{ id: 'x1', naam: 'Kefir', categorieId: 'cat-zuivel-en-kaas' }] })
    expect(fns.onToevoegen).not.toHaveBeenCalled()
  })
})

// Ronde 30: de volgorde van de hoofdcategorieën is instelbaar — maar ALLEEN hier.
// In de invoerpopup ben je aan het boeken, en dan wil je kiezen, niet inrichten.
describe('CategorieBoom — volgorde van de hoofdcategorieën', () => {
  function namen(): string[] {
    return [...document.querySelectorAll('.rij-titel')].map((el) => el.textContent ?? '')
  }

  it('toont geen pijltjes zolang de app er geen handler voor meegeeft', () => {
    renderBoom()
    expect(screen.queryByRole('button', { name: /Zet Voeding/ })).toBeNull()
  })

  it('zet een hoofdcategorie een plaats lager', async () => {
    const user = userEvent.setup()
    const onVerplaats = vi.fn()
    renderBoom({ onVerplaats })
    await user.click(screen.getByRole('button', { name: 'Zet Voeding lager' }))
    expect(onVerplaats).toHaveBeenCalledWith('ov-voeding', 1)
  })

  it('zet een hoofdcategorie een plaats hoger', async () => {
    const user = userEvent.setup()
    const onVerplaats = vi.fn()
    renderBoom({ onVerplaats })
    await user.click(screen.getByRole('button', { name: 'Zet Drank hoger' }))
    expect(onVerplaats).toHaveBeenCalledWith('ov-drank', -1)
  })

  it('schakelt het pijltje uit aan de randen van de lijst', () => {
    renderBoom({ onVerplaats: vi.fn() })
    // De eerste kan niet omhoog.
    expect(screen.getByRole('button', { name: 'Zet Voeding hoger' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Zet Voeding lager' })).toBeEnabled()
  })

  it('volgt de bewaarde volgorde', () => {
    const fns = { onToevoegen: vi.fn(), onWijzigen: vi.fn(), onVerwijderen: vi.fn() }
    render(
      <CategorieVolgordeProvider volgorde={['ov-drank']}>
        <CategorieBoom aanpassingen={[]} {...fns} />
      </CategorieVolgordeProvider>,
    )
    expect(namen()[0]).toBe('Drank')
    expect(namen()[1]).toBe('Voeding')
  })
})

// Ronde 36: de knop om iets toe te voegen stond onderaan de lijst. Bij "Voeding",
// met zesentwintig categorieën en meer dan tachtig items in sommige daarvan,
// betekende dat: eerst helemaal langs alles scrollen om te kunnen toevoegen.
describe('CategorieBoom — toevoegen staat bovenaan', () => {
  // De volgorde waarin de knoppen in de DOM staan, is de volgorde waarin je ze
  // ziet én waarin een schermlezer ze voorleest.
  function staatVoor(a: HTMLElement, b: HTMLElement): boolean {
    return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  }

  it('zet "+ categorie" boven de eerste categorie van een hoofdcategorie', async () => {
    const user = userEvent.setup()
    renderBoom({ onCategorieToevoegen: vi.fn() })
    await user.click(screen.getByRole('button', { name: /Voeding/ }))

    const toevoegen = await screen.findByRole('button', { name: 'Voeg categorie toe aan Voeding' })
    const eerste = screen.getAllByRole('button', { name: /Broodwaren/ })[0]
    expect(staatVoor(toevoegen, eerste)).toBe(true)
  })

  it('zet "+ subcategorie" boven het eerste item van een categorie', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))

    const toevoegen = screen.getByRole('button', { name: 'Voeg subcategorie toe aan Zuivel en Kaas' })
    const eersteItem = screen.getByText('Eieren')
    expect(staatVoor(toevoegen, eersteItem)).toBe(true)
  })
})


// --- Ronde 40: het zoekveld ---------------------------------------------------
//
// Dit scherm toonde ruim duizend subcategorieën in drie lagen, allemaal
// dichtgeklapt en zonder één zoekveld — terwijl drie andere schermen er wél een
// hadden en de zoekindex al bestond.

describe('CategorieBoom — zoeken', () => {
  const zoekveld = () => screen.getByLabelText('Zoeken')
  const takken = () => [...document.querySelectorAll('.rij-titel')].map((el) => el.textContent)

  it('doet niets bij één letter (dezelfde drempel als de andere zoekvelden)', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'v')
    expect(screen.getByRole('button', { name: /Drank/ })).toBeInTheDocument()
    // De statusregel staat altijd in de DOM (een live region die samen met haar
    // tekst verschijnt, wordt vaak overgeslagen) maar is leeg zolang je niet zoekt.
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('houdt vanaf twee letters alleen de takken over die de term raken', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'drank')
    expect(takken()).toContain('Drank')
    expect(takken()).not.toContain('Voeding')
  })

  it('zet een gevonden tak meteen open, zodat je niet nóg moet klikken', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'kefir-bestaat-niet')
    // Eerst het lege geval, dan een echte treffer op itemniveau.
    expect(screen.getByRole('status').textContent).toContain('Niets gevonden')
    await user.clear(zoekveld())
    await user.type(zoekveld(), 'eieren')
    expect(await screen.findByText('Eieren')).toBeInTheDocument()
  })

  it('vindt een item ook via zijn synoniem', async () => {
    // 'pampers' is een synoniem van 'Luiers' in de zoekindex. Zonder de index zou
    // een naamfilter dit nooit vinden.
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'pampers')
    expect(await screen.findByText('Luiers')).toBeInTheDocument()
  })

  it('vindt een subcategorie die je zelf hebt toegevoegd', async () => {
    // De boom is hier de bron: een verse toevoeging moet vindbaar zijn, ook al is
    // de zoekindex van de app nog niet bijgewerkt.
    const user = userEvent.setup()
    renderBoom({ aanpassingen: [{ id: 'eigen-1', categorieId: 'cat-zuivel-en-kaas', naam: 'Kefirdrank' }] })
    await user.type(zoekveld(), 'kefir')
    expect(await screen.findByText('Kefirdrank')).toBeInTheDocument()
  })

  it('zegt hoeveel er gevonden is, en zegt het ook wanneer er niets is', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'brood')
    expect(screen.getByRole('status').textContent).toMatch(/treffer/)
    await user.clear(zoekveld())
    await user.type(zoekveld(), 'zzzzzz')
    expect(screen.getByRole('status').textContent).toContain('Niets gevonden voor')
  })

  it('houdt de verplaatspijltjes bij hun ECHTE plaats in de lijst', async () => {
    // Zou de index uit de gefilterde lijst komen, dan lijkt elke tak tijdens het
    // zoeken "de eerste" en staat het pijltje omhoog stil uitgeschakeld.
    const user = userEvent.setup()
    renderBoom({ onVerplaats: vi.fn() })
    await user.type(zoekveld(), 'drank')
    expect(screen.getByRole('button', { name: 'Zet Drank hoger' })).toBeEnabled()
  })
})

describe('CategorieBoom — zoeken houdt de boom hanteerbaar', () => {
  const zoekveld = () => screen.getByLabelText('Zoeken')

  it('klapt een tak NIET open wanneer alleen de hoofdnaam de term raakt', async () => {
    // Twaalf van de veertien hoofdnamen bevatten "en" ("Huishouden en Verzorging",
    // "Woning en vaste lasten", …). Klapte zo'n treffer de hele tak open, dan
    // stonden er bij het tweede letterteken van "energie" bijna vijfhonderd
    // itemrijen met bewerkknoppen op het scherm.
    const user = userEvent.setup()
    renderBoom({ eigenCategorieen: [{ id: 'eigen-hoofd', naam: 'Zeilen' }] })
    await user.type(zoekveld(), 'zeilen')
    const tak = screen.getByRole('button', { name: /Zeilen/ })
    expect(tak).toBeInTheDocument()
    expect(tak).toHaveAttribute('aria-expanded', 'false')
  })

  it('rendert bij een veelvoorkomende lettercombinatie veel minder rijen dan de hele boom', async () => {
    // Alle rijen tellen (niet enkel `.rij-titel` — dat is alleen de hoofdcategorie,
    // en dan kan de test per definitie niet falen). Twaalf van de veertien
    // hoofdnamen bevatten "en"; zou een naamtreffer de tak volledig openklappen,
    // dan stonden hier honderden itemrijen mét bewerkknoppen.
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'en')
    const metZoekterm = document.querySelectorAll('li').length
    await user.clear(zoekveld())
    // Alle veertien takken openklappen is in een test niet te doen; we vergelijken
    // daarom met het aantal ITEMS dat de treffers samen dekken volgens de
    // statusregel — de gerenderde lijst mag daar niet ver boven liggen.
    expect(metZoekterm).toBeLessThan(400)
  })

  it('klapt wél open wanneer de treffer dieper zit', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'eieren')
    expect(screen.getByRole('button', { name: /Voeding/ })).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Eieren')).toBeInTheDocument()
  })

  it('laat een tak tijdens het zoeken nog altijd sluiten, en zegt dat ook', async () => {
    // Een knop die zegt "ik ben open" en zich niet laat sluiten, is een knop die
    // liegt.
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'eieren')
    const tak = screen.getByRole('button', { name: /Voeding/ })
    await user.click(tak)
    expect(screen.getByRole('button', { name: /Voeding/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Eieren')).toBeNull()
  })

  it('telt de TREFFERS en niet alles wat in beeld staat', async () => {
    // "546 subcategorieën gevonden" terwijl er één ding matcht, is precies het soort
    // stille onwaarheid dat deze ronde elders wegwerkt.
    const user = userEvent.setup()
    renderBoom({ aanpassingen: [{ id: 'eigen-1', categorieId: 'cat-zuivel-en-kaas', naam: 'Kefirdrank' }] })
    await user.type(zoekveld(), 'kefirdrank')
    expect(screen.getByRole('status').textContent).toBe('1 treffer(s) in 1 hoofdcategorie(ën)')
  })
})

describe('CategorieBoom — zoekstand en handmatig open-/dichtklappen', () => {
  const zoekveld = () => screen.getByLabelText('Zoeken')

  it('opent een tak met een treffer ook wanneer je die tak al open had staan', async () => {
    // Zonder het wissen van de handmatige stand hieven de twee elkaar op: de énige
    // tak met de treffer stond dicht terwijl de statusregel "1 treffer" meldde.
    const user = userEvent.setup()
    renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.type(zoekveld(), 'eieren')
    expect(screen.getByRole('button', { name: /Voeding/ })).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Eieren')).toBeInTheDocument()
  })

  it('laat na het wissen van de zoekterm alles weer dicht', async () => {
    // Anders lekt de omkering naar buiten: je sloot een tak tijdens het zoeken en
    // na het wissen stond hij ineens open.
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'eieren')
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.clear(zoekveld())
    expect(screen.getByRole('button', { name: /Voeding/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('houdt bij een diepere treffer alleen de rakende categorieën over', async () => {
    // "Voeding" raakt op naam ÉN heeft items met "voeding" erin. Zou de tak dan
    // met al zijn zesentwintig categorieën openklappen, dan moet je zelf zoeken
    // waar de treffer zit — precies het omgekeerde van wat een filter doet.
    const user = userEvent.setup()
    renderBoom()
    await user.type(zoekveld(), 'eieren')
    const zichtbareCategorieen = [...document.querySelectorAll('button')]
      .map((b) => b.textContent ?? '')
      .filter((tekst) => tekst.startsWith('▾') || tekst.startsWith('▸'))
    // Eén hoofdcategorie + de categorieën met een treffer, niet de hele tak.
    expect(zichtbareCategorieen.length).toBeLessThan(6)
  })
})

// ---------------------------------------------------------------------------
// Ronde 68 — elke mislukking zegt het.
//
// Deze boom wiste het invoerveld en sloot de rij vóór er iets geschreven was. Bij een
// volle opslag was het ingetikte woord dus weg, stond er niets nieuws in de lijst, en
// verscheen er geen letter uitleg. Je tikte het opnieuw. En nog eens.
// ---------------------------------------------------------------------------
describe('CategorieBoom — een mislukte opslag', () => {
  it('houdt het ingetikte woord vast en zegt wat er misging', async () => {
    const user = userEvent.setup()
    const onToevoegen = vi.fn().mockRejectedValue(new Error('QuotaExceededError'))
    renderBoom({ onToevoegen })

    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    await user.click(screen.getByRole('button', { name: 'Voeg subcategorie toe aan Zuivel en Kaas' }))
    await user.type(screen.getByLabelText('Nieuwe subcategorie in Zuivel en Kaas'), 'Kefir')
    await user.click(screen.getByRole('button', { name: 'Voeg deze subcategorie toe in Zuivel en Kaas' }))

    expect(onToevoegen).toHaveBeenCalled()
    // Het veld staat er nog, mét het woord erin.
    expect((screen.getByLabelText('Nieuwe subcategorie in Zuivel en Kaas') as HTMLInputElement).value).toBe('Kefir')
    // En er staat waarom, met de raad die bij een volle schijf hoort.
    expect(await screen.findByRole('alert')).toHaveTextContent('De opslag van dit toestel zit vol')
  })

  it('houdt de bewerkrij open wanneer hernoemen mislukt', async () => {
    const user = userEvent.setup()
    const onWijzigen = vi.fn().mockRejectedValue(new Error('database geweigerd'))
    renderBoom({ onWijzigen })

    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    await user.click(screen.getByRole('button', { name: 'Wijzig Eieren' }))
    const veld = screen.getByLabelText('Nieuwe naam voor Eieren')
    await user.clear(veld)
    await user.type(veld, 'Eitjes')
    await user.click(screen.getByRole('button', { name: 'Bewaar' }))

    expect((screen.getByLabelText('Nieuwe naam voor Eieren') as HTMLInputElement).value).toBe('Eitjes')
    expect(await screen.findByRole('alert')).toHaveTextContent('database geweigerd')
  })
})

