import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BackupKaart } from './BackupKaart'

describe('BackupKaart', () => {
  it('zegt dat je nog geen enkele back-up maakte', () => {
    render(<BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} />)
    expect(screen.getByText('Je maakte op dit toestel nog geen enkele back-up.')).toBeInTheDocument()
  })

  it('toont de dag van je laatste back-up', () => {
    render(
      <BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} laatsteBackupOp="2026-06-04" />,
    )
    // De dag wordt leesbaar gemaakt; het jaar hoort erbij, want een back-up van
    // vorig jaar is iets anders dan een van vorige maand.
    expect(screen.getByText(/Laatste back-up op dit toestel:/)).toHaveTextContent('2026')
  })

  // ⚠ Dit is de reden waarom de kaart bestaat: wie niet weet dat zijn browser de
  // database mag weggooien, ziet geen reden om op de knop te drukken.
  it('waarschuwt wanneer de opslag tijdelijk is', () => {
    render(<BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} opslag="tijdelijk" />)
    expect(
      screen.getByText(/Je browser mag deze gegevens wissen wanneer je toestel plaats nodig heeft/),
    ).toBeInTheDocument()
  })

  it('stelt gerust wanneer de opslag blijvend is', () => {
    render(<BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} opslag="blijvend" />)
    expect(screen.getByText('Je browser heeft toegezegd deze gegevens niet zomaar te wissen.')).toBeInTheDocument()
  })

  // ⚠ Een browser die de vraag niet kent, is geen bewijs dat het misgaat. Dan
  // zwijgen we liever dan een waarschuwing te tonen die we niet kunnen hardmaken.
  it('zwijgt over de opslag wanneer de browser het niet zegt', () => {
    render(<BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} opslag="onbekend" />)
    expect(screen.queryByText(/Je browser/)).not.toBeInTheDocument()
  })

  // ⚠ De belangrijkste knop van de kaart moet met een toetsenbord te bereiken zijn
  // (nakijkronde ronde 63). Hiervóór was dit een `<label>` met een verborgen
  // bestandsveld: onbereikbaar met Tab en onzichtbaar voor een schermlezer —
  // uitgerekend de knop die je nodig hebt wanneer je toestel stuk is.
  it('laat je herstellen met het toetsenbord', async () => {
    const user = userEvent.setup()
    render(<BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} />)
    const knop = screen.getByRole('button', { name: 'Herstel uit back-up' })
    await user.tab()
    await user.tab()
    expect(knop).toHaveFocus()
  })

  // ⚠ De knop moet ook iets DOEN, niet alleen focus krijgen: de eerste versie van
  // deze test bewees alleen het tweede, en de knop mocht dus losgekoppeld zijn.
  it('opent het bestandsvenster wanneer je op Herstel drukt', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={vi.fn()} />,
    )
    const veld = container.querySelector('input[type="file"]') as HTMLInputElement
    const klik = vi.spyOn(veld, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Herstel uit back-up' }))
    expect(klik).toHaveBeenCalledTimes(1)
  })

  it('geeft het gekozen bestand door', async () => {
    const user = userEvent.setup()
    const onHerstel = vi.fn()
    const { container } = render(
      <BackupKaart backupTekst={null} onExporteer={vi.fn()} onHerstel={onHerstel} />,
    )
    const veld = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(veld, new File(['{}'], 'backup.json', { type: 'application/json' }))
    expect(onHerstel).toHaveBeenCalledTimes(1)
    expect(onHerstel.mock.calls[0][0]).toBeInstanceOf(File)
  })

  it('leest een mislukking voor als alarm en een geslaagde melding als status', () => {
    const { rerender } = render(
      <BackupKaart backupTekst="Back-up gedownload." onExporteer={vi.fn()} onHerstel={vi.fn()} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Back-up gedownload.')
    rerender(
      <BackupKaart backupTekst="Herstellen mislukte: x" backupIsFout onExporteer={vi.fn()} onHerstel={vi.fn()} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Herstellen mislukte: x')
  })

  it('exporteert op de knop', async () => {
    const user = userEvent.setup()
    const onExporteer = vi.fn()
    render(<BackupKaart backupTekst={null} onExporteer={onExporteer} onHerstel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Exporteer back-up' }))
    expect(onExporteer).toHaveBeenCalledTimes(1)
  })
})
