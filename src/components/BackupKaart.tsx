import { useRef, type CSSProperties } from 'react'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'
import { dagJaar } from '../utils/datum'
import type { OpslagToestand } from '../data/opslag'

const statusRegel: CSSProperties = { margin: 0, fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }

/**
 * Het back-upbestand — en, sinds ronde 63, waaróm je er een nodig hebt.
 *
 * Bovenaan staat wat de browser met je database mag doen. Dat is geen technisch
 * detail: staat de opslag op "tijdelijk", dan mag ze weg zodra je toestel plaats
 * nodig heeft, en op iOS ook al na een tijd zonder de app te openen. Die zin
 * staat híér en niet in een aparte kaart, omdat ze precies de reden is om op de
 * knop eronder te drukken.
 *
 * ⚠ Bij `onbekend` zwijgt de app over de opslag. Een browser die de vraag niet
 * kent, is geen bewijs dat het misgaat, en een waarschuwing die je niet kan
 * onderbouwen is er een die je aanleert weg te lezen.
 */
export function BackupKaart({
  backupTekst,
  backupIsFout = false,
  onExporteer,
  onHerstel,
  laatsteBackupOp,
  opslag = 'onbekend',
}: {
  backupTekst: string | null
  /** Of die tekst over een MISLUKKING gaat. Bepaalt of ze voorgelezen wordt als alarm. */
  backupIsFout?: boolean
  onExporteer: () => void
  onHerstel: (bestand: File) => void
  /** De dag van je laatste back-up op dit toestel; ontbreekt wanneer je er nooit een maakte. */
  laatsteBackupOp?: string
  opslag?: OpslagToestand
}) {
  const { t } = useT()
  // ⚠ Een echte knop naast een verborgen bestandsveld (nakijkronde ronde 63).
  // Hiervóór was dit een `<label>` met een `display: none`-invoerveld erin: dat
  // haalt het veld uit de tabvolgorde én uit de toegankelijkheidsboom, en een label
  // is zelf niet focusbaar. Met een toetsenbord of een schermlezer was "Herstel uit
  // back-up" dus de enige knop in de app die je niet kón indrukken — uitgerekend de
  // knop die je nodig hebt wanneer je toestel stuk is.
  const bestandsveld = useRef<HTMLInputElement>(null)
  return (
    <Kaart
      titel={t('Back-up & herstel')}
      bijschrift={t(
        'Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.',
      )}
    >
      {opslag !== 'onbekend' && (
        <p style={statusRegel}>
          {opslag === 'blijvend'
            ? t('Je browser heeft toegezegd deze gegevens niet zomaar te wissen.')
            : t(
                'Je browser mag deze gegevens wissen wanneer je toestel plaats nodig heeft. Zet de app op je beginscherm en maak af en toe een back-up.',
              )}
        </p>
      )}
      <p style={statusRegel}>
        {laatsteBackupOp
          ? t('Laatste back-up op dit toestel: {datum}.', { datum: dagJaar(laatsteBackupOp) })
          : t('Je maakte op dit toestel nog geen enkele back-up.')}
      </p>
      <div className="knoprij">
        <button type="button" className="knop knop-secundair" onClick={onExporteer}>
          {t('Exporteer back-up')}
        </button>
        <button type="button" className="knop knop-secundair" onClick={() => bestandsveld.current?.click()}>
          {t('Herstel uit back-up')}
        </button>
        <input
          ref={bestandsveld}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onHerstel(f)
            e.target.value = ''
          }}
        />
      </div>
      {/* ⚠ Twee regels en geen wisselende rol (tweede nakijkronde ronde 63).
          De statusregel staat er ALTIJD, ook leeg — een live-regel die pas MÉT zijn
          tekst verschijnt, wordt door sommige schermlezers overgeslagen (huisregel
          ronde 56/61). Zou dezelfde <p> bij een fout van rol WISSELEN, dan is dat
          voor een schermlezer een nieuwe live-regio op precies het moment dat de
          tekst aankomt: hetzelfde probleem, in een ander jasje. Een mislukking na
          iets wat je zelf net deed, hoort een `alert` te zijn — die mag wél pas bij
          de fout verschijnen. Zie `RapportKaart` voor hetzelfde patroon. */}
      <p role="status" style={statusRegel}>
        {backupIsFout ? '' : (backupTekst ?? '')}
      </p>
      {backupIsFout && backupTekst && (
        <p role="alert" style={statusRegel}>
          {backupTekst}
        </p>
      )}
    </Kaart>
  )
}
