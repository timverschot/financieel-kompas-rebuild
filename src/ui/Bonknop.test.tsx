import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Bonknop, bestandsnaamMet } from './Bonknop'

// Ronde 35. De bon-knop is de enige manier om een bewaarde factuur of
// garantiebewijs terug te zien. Op een iPhone werkte dat vroeger helemaal niet,
// en de gebruiker kreeg daar geen enkel signaal van. Dit bestand bewaakt dat het
// nu wél werkt én dat elke mislukking zichtbaar is.

const JPG = 'data:image/jpeg;base64,AAAA'
const PDF = 'data:application/pdf;base64,AAAA'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('bestandsnaamMet', () => {
  it('plakt de juiste extensie achter een omschrijving', () => {
    expect(bestandsnaamMet('Colruyt 12 juli', 'image/jpeg')).toBe('Colruyt 12 juli.jpg')
    expect(bestandsnaamMet('Contract', 'application/pdf')).toBe('Contract.pdf')
    expect(bestandsnaamMet('Logo', 'image/png')).toBe('Logo.png')
  })

  it('verdubbelt een extensie niet die er al staat', () => {
    // In de Dossierkluis is de naam een échte bestandsnaam. Vroeger bewaarde je
    // daar "overeenkomst.pdf.pdf" — en Windows toont zo'n bestand als kapot.
    expect(bestandsnaamMet('overeenkomst.pdf', 'application/pdf')).toBe('overeenkomst.pdf')
    expect(bestandsnaamMet('BON.JPG', 'image/jpeg')).toBe('BON.JPG')
  })

  it('valt terug op een bruikbare naam bij een lege of onbekende invoer', () => {
    expect(bestandsnaamMet('   ', 'image/jpeg')).toBe('bon.jpg')
    expect(bestandsnaamMet('iets', 'application/octet-stream')).toBe('iets.bin')
  })
})

describe('Bonknop', () => {
  it('toont het document in de app in plaats van ernaartoe te navigeren', async () => {
    const user = userEvent.setup()
    render(<Bonknop bestand={JPG} naam="Colruyt 12 juli" />)

    // Bewust géén <a href="data:…">: WebKit weigert die navigatie zonder melding.
    expect(screen.queryByRole('link')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'bekijken' }))

    const beeld = await screen.findByRole('img')
    expect(beeld).toHaveAttribute('src', JPG)
  })

  it('beschrijft in de alt-tekst wát je ziet, niet alleen de naam', async () => {
    const user = userEvent.setup()
    render(<Bonknop bestand={JPG} naam="Colruyt 12 juli" />)
    await user.click(screen.getByRole('button', { name: 'bekijken' }))

    // "Colruyt 12 juli" alleen zegt een schermlezer niets over de inhoud.
    expect(screen.getByAltText('Foto van bon of factuur: Colruyt 12 juli')).toBeInTheDocument()
  })

  it('zegt het wanneer een bewaarde afbeelding niet te tonen is', async () => {
    const user = userEvent.setup()
    render(<Bonknop bestand="data:image/jpeg;base64,kapot" naam="Bon" />)
    await user.click(screen.getByRole('button', { name: 'bekijken' }))

    const beeld = await screen.findByRole('img')
    // De browser meldt beschadigde beeldgegevens via `error`. Zonder deze melding
    // zag je een leeg venster en wist je niet of je iets fout deed.
    act(() => {
      beeld.dispatchEvent(new Event('error'))
    })
    expect(
      await screen.findByText('Deze afbeelding kan niet getoond worden. Ze is mogelijk beschadigd bij het bewaren.'),
    ).toBeInTheDocument()
  })

  it('toont een pdf in een kader en legt uit wat te doen als het leeg blijft', async () => {
    const user = userEvent.setup()
    render(<Bonknop bestand={PDF} naam="overeenkomst.pdf" label="Bekijken" />)
    await user.click(screen.getByRole('button', { name: 'Bekijken' }))

    expect(await screen.findByTitle('Pdf-bestand: overeenkomst.pdf')).toHaveAttribute('src', PDF)
    expect(
      screen.getByText('Blijft het vak leeg? Bewaar het bestand hieronder en open het met je eigen pdf-lezer.'),
    ).toBeInTheDocument()
  })

  it('bewaart via een blob-URL met de juiste bestandsnaam', async () => {
    const user = userEvent.setup()
    const maak = vi.fn(() => 'blob:test')
    vi.stubGlobal('URL', { ...URL, createObjectURL: maak, revokeObjectURL: vi.fn() })
    const klikken: string[] = []
    const echteKlik = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      klikken.push(this.download)
    }

    try {
      render(<Bonknop bestand={JPG} naam="Colruyt 12 juli" />)
      await user.click(screen.getByRole('button', { name: 'bekijken' }))
      await user.click(await screen.findByRole('button', { name: 'Bewaren op dit toestel' }))

      // Een `download` op een data-URL negeert Safari; op een blob-URL werkt hij.
      expect(maak).toHaveBeenCalled()
      expect(klikken).toEqual(['Colruyt 12 juli.jpg'])
    } finally {
      HTMLAnchorElement.prototype.click = echteKlik
    }
  })

  it('zegt het wanneer bewaren mislukt, en laat je het document staan', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => {
        throw new Error('geweigerd')
      },
      revokeObjectURL: vi.fn(),
    })

    render(<Bonknop bestand={JPG} naam="Bon" />)
    await user.click(screen.getByRole('button', { name: 'bekijken' }))
    await user.click(await screen.findByRole('button', { name: 'Bewaren op dit toestel' }))

    // Vroeger slikte een lege catch dit stil door: je tikte, en er gebeurde niets.
    expect(
      await screen.findByText('Bewaren lukte niet. Je kan het bestand hierboven wel gewoon bekijken.'),
    ).toBeInTheDocument()
    // Bekijken blijft hoe dan ook werken.
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
