import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DossierKluis } from './DossierKluis'
import type { DossierDocument } from '../data/schema'

function doc(over: Partial<DossierDocument> = {}): DossierDocument {
  return {
    id: 'd1',
    dossierId: 'dos-1',
    naam: 'Ouderschapsovereenkomst',
    soort: 'overeenkomst',
    bestand: 'data:application/pdf;base64,AAAA',
    toegevoegdOp: '2026-01-15',
    ...over,
  }
}

function toon(documenten: DossierDocument[] = [], dossierId = 'dos-1') {
  const onOpslaan = vi.fn()
  const onVerwijderen = vi.fn()
  render(
    <DossierKluis dossierId={dossierId} documenten={documenten} onOpslaan={onOpslaan} onVerwijderen={onVerwijderen} />,
  )
  return { onOpslaan, onVerwijderen }
}

// Een klein PDF-bestand: verkleinAfbeelding geeft niet-afbeeldingen ongewijzigd
// terug, dus dit werkt in jsdom zonder canvas.
function pdf(naam = 'vonnis.pdf') {
  return new File(['%PDF-1.4 test'], naam, { type: 'application/pdf' })
}

describe('DossierKluis', () => {
  it('toont een lege staat wanneer er nog geen documenten zijn', () => {
    toon()
    expect(screen.getByText('Nog geen documenten. Voeg er hieronder een toe.')).toBeInTheDocument()
  })

  it('toont alleen documenten van het meegegeven dossier', () => {
    toon([
      doc({ id: 'a', naam: 'Van dit dossier' }),
      doc({ id: 'b', dossierId: 'dos-2', naam: 'Van een ander dossier' }),
    ])
    expect(screen.getByText('Van dit dossier')).toBeInTheDocument()
    expect(screen.queryByText('Van een ander dossier')).not.toBeInTheDocument()
  })

  it('sorteert de documenten met de nieuwste eerst', () => {
    toon([
      doc({ id: 'oud', naam: 'Oud attest', toegevoegdOp: '2025-03-01' }),
      doc({ id: 'nieuw', naam: 'Nieuw attest', toegevoegdOp: '2026-06-01' }),
    ])
    const titels = [screen.getByText('Nieuw attest'), screen.getByText('Oud attest')]
    // Het nieuwste document staat vóór het oudste in de DOM-volgorde.
    expect(titels[0].compareDocumentPosition(titels[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('houdt de knop uit tot er een naam én een bestand is', async () => {
    const user = userEvent.setup()
    toon()
    const knop = screen.getByRole('button', { name: 'Document toevoegen' })
    expect(knop).toBeDisabled()

    // Alleen een naam volstaat niet.
    await user.type(screen.getByLabelText('Naam'), 'Vonnis 2026')
    expect(knop).toBeDisabled()

    // Pas met een bestand erbij mag het.
    await user.upload(screen.getByLabelText('Bestand (foto of PDF)'), pdf())
    expect(await screen.findByRole('button', { name: 'Document toevoegen' })).toBeEnabled()
  })

  it('voegt een document toe met de juiste velden en maakt het formulier leeg', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()

    await user.type(screen.getByLabelText('Naam'), 'Vonnis rechtbank')
    await user.selectOptions(screen.getByLabelText('Soort'), 'vonnis')
    await user.type(screen.getByLabelText('Notitie (optioneel)'), 'origineel ligt thuis')
    await user.upload(screen.getByLabelText('Bestand (foto of PDF)'), pdf('vonnis.pdf'))

    const knop = await screen.findByRole('button', { name: 'Document toevoegen' })
    await user.click(knop)

    expect(onOpslaan).toHaveBeenCalledTimes(1)
    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierId: 'dos-1',
        naam: 'Vonnis rechtbank',
        soort: 'vonnis',
        bestandsnaam: 'vonnis.pdf',
        notitie: 'origineel ligt thuis',
        toegevoegdOp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    const opgeslagen = onOpslaan.mock.calls[0][0] as DossierDocument
    expect(opgeslagen.id.length).toBeGreaterThan(0)
    expect(opgeslagen.bestand.startsWith('data:')).toBe(true)

    // Na een geslaagde opslag staat het formulier weer leeg.
    expect(screen.getByLabelText('Naam')).toHaveValue('')
  })

  it('behoudt de invoer wanneer het opslaan mislukt', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn().mockRejectedValue(new Error('schijf vol'))
    render(<DossierKluis dossierId="dos-1" documenten={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />)

    await user.type(screen.getByLabelText('Naam'), 'Schoolattest'
    )
    await user.upload(screen.getByLabelText('Bestand (foto of PDF)'), pdf('attest.pdf'))
    await user.click(await screen.findByRole('button', { name: 'Document toevoegen' }))

    expect(onOpslaan).toHaveBeenCalled()
    expect(screen.getByLabelText('Naam')).toHaveValue('Schoolattest')
    expect(screen.getByText('Opslaan is mislukt. Probeer het opnieuw; je invoer blijft staan.')).toBeInTheDocument()
  })

  it('weigert een te groot bestand en bewaart het niet', async () => {
    const user = userEvent.setup()
    toon()
    // ~4,5 MB aan tekst: de data-URL komt daarmee ruim boven de grens van 4 MB.
    const groot = new File(['x'.repeat(4_500_000)], 'groot.pdf', { type: 'application/pdf' })

    await user.type(screen.getByLabelText('Naam'), 'Grote scan')
    await user.upload(screen.getByLabelText('Bestand (foto of PDF)'), groot)

    expect(
      await screen.findByText('Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Document toevoegen' })).toBeDisabled()
  })

  it('vraagt eerst bevestiging voor het verwijderen', async () => {
    const user = userEvent.setup()
    const { onVerwijderen } = toon([doc({ id: 'w1', naam: 'Attest school' })])

    await user.click(screen.getByRole('button', { name: 'Verwijder document Attest school' }))
    expect(onVerwijderen).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Ja, verwijder' }))
    expect(onVerwijderen).toHaveBeenCalledWith('w1')
  })

  it('toont een openen- en een bewaarlink per document', () => {
    toon([doc({ id: 'l1', naam: 'Overeenkomst', bestandsnaam: 'overeenkomst.pdf' })])
    expect(screen.getByRole('link', { name: 'Openen' })).toHaveAttribute('href', 'data:application/pdf;base64,AAAA')
    expect(screen.getByRole('link', { name: 'Bewaren' })).toHaveAttribute('download', 'overeenkomst.pdf')
  })
})
