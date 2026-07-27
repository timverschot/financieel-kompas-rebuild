import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dialoog } from './Dialoog'

// Het scrollslot staat op `document.body`, en dat overleeft een test. Zonder deze
// reset lekt de waarde uit de ene test in de verwachting van de volgende.
beforeEach(() => {
  document.body.style.overflow = ''
})

function toon(open = true, onSluiten = vi.fn()) {
  render(
    <>
      <button type="button">Opener</button>
      <Dialoog titel="Nieuwe boeking" open={open} onSluiten={onSluiten} voet={<button type="button">Opslaan</button>}>
        <input aria-label="Bedrag" />
        <button type="button">Iets</button>
      </Dialoog>
    </>,
  )
  return { onSluiten }
}

describe('Dialoog', () => {
  it('toont niets zolang ze dicht staat', () => {
    toon(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is een echte modale dialoog met een naam', () => {
    toon()
    const d = screen.getByRole('dialog')
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(d).toHaveAccessibleName('Nieuwe boeking')
  })

  it('zet de focus op het eerste veld, niet op de sluitknop', () => {
    // De sluitknop staat in de HTML vóór de inhoud. Zou de focus daar landen, dan
    // sluit een druk op Enter de popup meteen weer.
    toon()
    expect(screen.getByLabelText('Bedrag')).toHaveFocus()
  })

  it('slaat knoppen vóór het eerste veld over', () => {
    // De boekingspopup begint met vier keuzeknoppen. Landt de focus daarop, dan moet
    // je alsnog gaan tabben voor je kan typen.
    render(
      <Dialoog titel="X" open onSluiten={vi.fn()}>
        <button type="button">Uitgave</button>
        <button type="button">Inkomst</button>
        <input aria-label="Handelaar" />
      </Dialoog>,
    )
    expect(screen.getByLabelText('Handelaar')).toHaveFocus()
  })

  it('begint bij de inhoud als er geen veld is, en niet op de eerste knop', () => {
    // Ronde 35. Vroeger landde de focus hier op "Ja". Dat leek behulpzaam, maar in
    // de popup die een bewaarde bon toont is de eerste knop "Bewaren op dit
    // toestel": één druk op Enter startte dan meteen een download, en de
    // beschrijving van de foto werd nooit voorgelezen. Nu begint de focus bij wat
    // er te zien is; één keer Tab brengt je naar de eerste knop.
    render(
      <Dialoog titel="X" open onSluiten={vi.fn()}>
        <button type="button">Ja</button>
        <button type="button">Nee</button>
      </Dialoog>,
    )
    const vak = document.querySelector('.dialoog-inhoud') as HTMLElement
    expect(vak).toHaveFocus()
    // En het vak zelf staat niet in de tab-volgorde: het is enkel een startpunt.
    expect(vak.tabIndex).toBe(-1)
  })

  it('sluit met Escape, ook vanuit een invoerveld', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.type(screen.getByLabelText('Bedrag'), '12')
    await user.keyboard('{Escape}')
    expect(onSluiten).toHaveBeenCalled()
  })

  it('sluit met de kruisknop', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    expect(onSluiten).toHaveBeenCalled()
  })

  it('sluit bij een klik naast de popup', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.click(document.querySelector('.dialoog-laag') as HTMLElement)
    expect(onSluiten).toHaveBeenCalled()
  })

  it('sluit NIET bij een klik in de popup zelf', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.click(screen.getByRole('button', { name: 'Iets' }))
    expect(onSluiten).not.toHaveBeenCalled()
  })

  it('houdt de focus binnen: Tab vanaf het laatste element gaat naar het eerste', async () => {
    const user = userEvent.setup()
    toon()
    // Tab-volgorde volgt de HTML: sluitknop, velden, voetknop. Vanaf de voetknop
    // moet je dus rond naar de sluitknop, en niet naar de pagina eronder.
    screen.getByRole('button', { name: 'Opslaan' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sluiten' })).toHaveFocus()
  })

  it('houdt de focus binnen: Shift+Tab vanaf het eerste gaat naar het laatste', async () => {
    const user = userEvent.setup()
    toon()
    screen.getByRole('button', { name: 'Sluiten' }).focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Opslaan' })).toHaveFocus()
  })

  it('laat de focus niet ontsnappen naar de knop achter de popup', async () => {
    const user = userEvent.setup()
    toon()
    // Vier keer tabben brengt je langs alle vier de focusbare elementen en terug
    // aan het begin — nooit op de opener die achter de popup staat.
    for (let i = 0; i < 4; i++) await user.tab()
    expect(screen.getByRole('button', { name: 'Opener' })).not.toHaveFocus()
  })

  it('blokkeert het scrollen van de pagina eronder, en geeft het terug', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = render(
      <Dialoog titel="X" open onSluiten={vi.fn()}>
        <input aria-label="A" />
      </Dialoog>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    // Terug naar exact wat het WAS, niet zomaar "iets anders dan hidden": stond de
    // pagina op 'scroll', dan moet ze daar weer op staan.
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('hangt aan de pagina zelf, niet in een vak dat kan verschuiven', () => {
    // Ronde 35, gemeten in een echte browser. Een voorouder met een `transform`
    // wordt het referentiekader voor alles wat eronder `position: fixed` is. De
    // pagina's schuiven bij het wisselen van tabblad kort omhoog, en opende je in
    // die halve seconde een bon, dan stond de popup niet meer op het scherm maar op
    // de pagina — met de sluitknop bóven de bovenrand.
    render(
      <div className="pagina-in" style={{ transform: 'translateY(8px)' }}>
        <Dialoog titel="Bon" open onSluiten={vi.fn()}>
          <p>Inhoud</p>
        </Dialoog>
      </div>,
    )
    const laag = document.querySelector('.dialoog-laag') as HTMLElement
    expect(laag.parentElement).toBe(document.body)
    expect(document.querySelector('.pagina-in')?.contains(laag)).toBe(false)
  })

  it('laat één druk op Escape maar één popup sluiten, ook als ze naast elkaar staan', async () => {
    const user = userEvent.setup()
    const eerste = vi.fn()
    const tweede = vi.fn()
    render(
      <>
        <Dialoog titel="Een" open onSluiten={eerste}>
          <p>A</p>
        </Dialoog>
        <Dialoog titel="Twee" open onSluiten={tweede}>
          <p>B</p>
        </Dialoog>
      </>,
    )
    await user.keyboard('{Escape}')
    // De laatst geopende wint; de andere blijft staan, zodat je nooit per ongeluk
    // twee vensters tegelijk kwijtraakt.
    expect(tweede).toHaveBeenCalledTimes(1)
    expect(eerste).not.toHaveBeenCalled()
  })

  it('geeft het scrollen ook terug wanneer twee popups tegelijk verdwijnen', () => {
    document.body.style.overflow = 'auto'
    // Ronde 35. Dit ging mis en de gevolgen waren blijvend: React ruimt bij het
    // verwijderen van een boom de BUITENSTE popup eerst op. Die zag de binnenste
    // nog openstaan en liet het slot dus liggen; de binnenste kende de
    // oorspronkelijke waarde niet en liet het óók liggen. Daarna scrolde de app
    // nergens meer, tot je ze afsloot en opnieuw opende. Bereikbaar in de praktijk
    // wanneer het formulier vastloopt terwijl er een bon openstaat: dan verdwijnen
    // beide popups in dezelfde stap.
    const { unmount } = render(
      <Dialoog titel="Buiten" open onSluiten={vi.fn()}>
        <input aria-label="A" />
        <Dialoog titel="Binnen" open onSluiten={vi.fn()}>
          <input aria-label="B" />
        </Dialoog>
      </Dialoog>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  // --- Ronde 34: het toetsenbord op een telefoon ---
  it('krimpt mee met wat er nog zichtbaar is zodra het toetsenbord opengaat', async () => {
    // Het toetsenbord nabootsen: `visualViewport` is het enige dat op iOS wéét
    // hoeveel er nog te zien is. `100dvh` doet dat NIET — daar schuift het
    // toetsenbord gewoon overheen, en dan staat de opslaanknop erachter.
    const luisteraars: Record<string, (() => void)[]> = {}
    const nep = {
      height: 800,
      offsetTop: 0,
      addEventListener: (naam: string, fn: () => void) => {
        luisteraars[naam] = [...(luisteraars[naam] ?? []), fn]
      },
      removeEventListener: () => {},
    }
    Object.defineProperty(window, 'visualViewport', { value: nep, configurable: true })

    try {
      render(
        <Dialoog titel="Nieuwe boeking" open onSluiten={vi.fn()}>
          <input aria-label="Bedrag" />
        </Dialoog>,
      )
      const laag = document.querySelector('.dialoog-laag') as HTMLElement
      expect(laag.style.height).toBe('800px')

      // Toetsenbord op: nog 400 px zichtbaar.
      nep.height = 400
      await act(async () => {
        luisteraars.resize?.forEach((fn) => fn())
      })
      expect(laag.style.height).toBe('400px')

      // En op iOS schuift het zichtbare venster daarbij óók omhoog. Dat stuk moet
      // meegeteld worden, anders zit de onderkant van de popup naast de plek waar
      // ze hoort.
      nep.offsetTop = 60
      await act(async () => {
        luisteraars.scroll?.forEach((fn) => fn())
      })
      expect(laag.style.height).toBe('460px')
    } finally {
      Reflect.deleteProperty(window, 'visualViewport')
    }
  })

  it('vergeet de hoogte van de vorige keer bij het sluiten', async () => {
    const luisteraars: Record<string, (() => void)[]> = {}
    const nep = {
      height: 400,
      offsetTop: 0,
      addEventListener: (naam: string, fn: () => void) => {
        luisteraars[naam] = [...(luisteraars[naam] ?? []), fn]
      },
      removeEventListener: () => {},
    }
    Object.defineProperty(window, 'visualViewport', { value: nep, configurable: true })
    try {
      const { rerender } = render(
        <Dialoog titel="Nieuwe boeking" open onSluiten={vi.fn()}>
          <input aria-label="Bedrag" />
        </Dialoog>,
      )
      expect((document.querySelector('.dialoog-laag') as HTMLElement).style.height).toBe('400px')

      // Sluiten. Zonder het terugzetten op nul opent de popup de volgende keer
      // één beeldje lang op de hoogte van tóén — met het toetsenbord erin.
      rerender(
        <Dialoog titel="Nieuwe boeking" open={false} onSluiten={vi.fn()}>
          <input aria-label="Bedrag" />
        </Dialoog>,
      )
      nep.height = 900
      rerender(
        <Dialoog titel="Nieuwe boeking" open onSluiten={vi.fn()}>
          <input aria-label="Bedrag" />
        </Dialoog>,
      )
      expect((document.querySelector('.dialoog-laag') as HTMLElement).style.height).toBe('900px')
    } finally {
      Reflect.deleteProperty(window, 'visualViewport')
    }
  })

  it('laat de popup met rust wanneer de browser niet kan zeggen wat zichtbaar is', () => {
    // Oudere browsers en de testomgeving kennen `visualViewport` niet. Dan mag er
    // niets veranderen: geen inline hoogte, gewoon het gedrag van voorheen.
    render(
      <Dialoog titel="Nieuwe boeking" open onSluiten={vi.fn()}>
        <input aria-label="Bedrag" />
      </Dialoog>,
    )
    const laag = document.querySelector('.dialoog-laag') as HTMLElement
    expect(laag.style.height).toBe('')
  })
})

// Ronde 35: een popup kan in een andere popup zitten (een bon bekijken terwijl je
// een transactie intikt). Elke popup hing haar Escape-luisteraar aan `document`,
// dus één druk sloot ze allebei — en je halve boeking was weg.
describe('Dialoog — een popup in een popup', () => {
  function Genest({ onBuiten, onBinnen }: { onBuiten: () => void; onBinnen: () => void }) {
    return (
      <Dialoog titel="Nieuwe boeking" open onSluiten={onBuiten}>
        <input aria-label="Bedrag" />
        <Dialoog titel="Bon" open onSluiten={onBinnen}>
          <p>foto</p>
        </Dialoog>
      </Dialoog>
    )
  }

  it('laat Escape alleen de bovenste popup sluiten', async () => {
    const user = userEvent.setup()
    const onBuiten = vi.fn()
    const onBinnen = vi.fn()
    render(<Genest onBuiten={onBuiten} onBinnen={onBinnen} />)

    await user.keyboard('{Escape}')
    expect(onBinnen).toHaveBeenCalledTimes(1)
    expect(onBuiten).not.toHaveBeenCalled()
  })

  it('houdt het scrollslot vast zolang er nog een popup openstaat', () => {
    const { rerender } = render(<Genest onBuiten={vi.fn()} onBinnen={vi.fn()} />)
    expect(document.body.style.overflow).toBe('hidden')

    // De binnenste sluiten: de pagina eronder mag nog steeds niet scrollen.
    rerender(
      <Dialoog titel="Nieuwe boeking" open onSluiten={vi.fn()}>
        <input aria-label="Bedrag" />
      </Dialoog>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    // Pas wanneer de laatste dicht is, gaat het slot eraf.
    rerender(
      <Dialoog titel="Nieuwe boeking" open={false} onSluiten={vi.fn()}>
        <input aria-label="Bedrag" />
      </Dialoog>,
    )
    expect(document.body.style.overflow).toBe('')
  })
})
