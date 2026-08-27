import { useEffect, useState, type CSSProperties } from 'react'
import type { Gezinsrol, Kind } from '../data/schema'
import { KinderenSectie } from './KinderenSectie'
import { Kaart, PaginaKop } from '../ui/basis'
import { useT, TALEN, type Taal } from '../i18n'
import { useThema, THEMAKEUZES } from '../thema'
import { useInstellingen } from '../instellingen'
import { BUDGETDREMPELS } from '../utils/meldingen'
import { InstallerenKaart } from './InstallerenKaart'
import { OnderdelenKaart } from './OnderdelenKaart'
import { wisselPagina } from '../utils/appOnderdelen'
import type { Pagina } from './navigatie'
import { DriveKaart } from './DriveKaart'
import { BackupKaart } from './BackupKaart'
import type { OpslagToestand } from '../data/opslag'
import { bouwdatumTekst, haalBouwdatum } from '../utils/appVersie'
import { opmaakLocale } from '../utils/opmaaktaal'

// Keuzelijsten blijven smal: ze staan alleen, zonder zichtbaar label ernaast.
const keuzelijst: CSSProperties = { maxWidth: 260, alignSelf: 'flex-start' }
// Klein grijs regeltje binnen een kaart: een status (laatste synchronisatie,
// back-upmelding) of een stukje uitleg. De kaart zorgt zelf voor de tussenruimte.
const statusRegel: CSSProperties = { margin: 0, fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }

/** Wat `onBeginOpnieuw` teruggeeft: of de Drive-back-up mee opgeruimd raakte. */
export type BeginOpnieuwResultaat = { backupGewist: boolean; backupFout?: string }

// Het instellingen-scherm: taal, Google Drive-beheer, lokale back-up en het beheer
// van je kinderen — alles op één plek. Elk onderdeel staat in een eigen kaart.
export function InstellingenSectie({
  taal,
  zetTaal,
  verbonden,
  bezig,
  onVerbind,
  onSynchroniseer,
  backupTekst,
  backupIsFout,
  onExporteer,
  onHerstel,
  kinderen,
  onKindToevoegen,
  onKindWijzigen,
  onKindVerwijderen,
  telGezinslidGebruik,
  onBeginOpnieuw,
  laatsteBackupOp,
  laatsteSyncOp,
  opslag,
  onderdeelInhoud,
}: {
  taal: Taal
  zetTaal: (t: Taal) => void
  verbonden: boolean
  bezig: boolean
  onVerbind: () => void
  onSynchroniseer: () => void
  backupTekst: string | null
  /** Of `backupTekst` over een MISLUKKING gaat (ronde 63). */
  backupIsFout?: boolean
  onExporteer: () => void
  onHerstel: (bestand: File) => void
  kinderen: Kind[]
  onKindToevoegen: (naam: string, rol?: Gezinsrol) => void
  onKindWijzigen: (lid: Kind) => void
  onKindVerwijderen: (id: string) => void
  telGezinslidGebruik?: (id: string) => string[]
  /**
   * Wist alles. Geeft terug of de back-up mee opgeruimd raakte.
   * Optioneel: zolang het scherm de datalaag nog niet doorgeeft, blijft de
   * kaart "Begin opnieuw" verborgen in plaats van een knop te tonen die niets doet.
   */
  onBeginOpnieuw?: () => Promise<BeginOpnieuwResultaat> | BeginOpnieuwResultaat
  /** De dag van de laatste back-up op dit toestel (ronde 63). */
  laatsteBackupOp?: string
  /** De dag van de laatste geslaagde synchronisatie met Drive (ronde 63). */
  laatsteSyncOp?: string
  /** Of de browser deze database blijvend bewaart (ronde 63). */
  opslag?: OpslagToestand
  /**
   * Hoeveel er in elk uitzetbaar onderdeel zit (ronde 75). Alleen om te kunnen zeggen
   * dat een uitgezet onderdeel nog gegevens draagt; zie `OnderdelenKaart`.
   */
  onderdeelInhoud?: Partial<Record<Pagina, number>>
}) {
  const { t } = useT()
  // ⚠ RONDE 99 — de bouwdatum komt uit `versie.json` en niet uit de code zelf; zie
  // `haalBouwdatum`. `null` zolang ze niet binnen is, en `null` blijft ze wanneer het
  // bestand er niet is (de ontwikkelserver, de testomgeving) — dan blijft de kaart weg.
  const [bouwdatum, setBouwdatum] = useState<string | null>(null)
  useEffect(() => {
    let levend = true
    void haalBouwdatum().then((d) => {
      if (levend) setBouwdatum(d)
    })
    return () => {
      levend = false
    }
  }, [])
  const { keuze, zetKeuze } = useThema()
  const { budgetDrempel, zetBudgetDrempel, verborgenPaginas, zetVerborgenPaginas } = useInstellingen()

  // "Begin opnieuw": de knop opent eerst een bevestiging waarin je een woord moet
  // typen. Zo kan je nooit met één misklik al je gegevens kwijtraken.
  const BEVESTIGWOORD = t('WISSEN')
  const [bevestigOpen, setBevestigOpen] = useState(false)
  const [getypt, setGetypt] = useState('')
  const [wisBezig, setWisBezig] = useState(false)
  const [wisMelding, setWisMelding] = useState<string | null>(null)
  const woordKlopt = getypt.trim().toUpperCase() === BEVESTIGWOORD.trim().toUpperCase()

  function openBevestiging() {
    setWisMelding(null)
    setGetypt('')
    setBevestigOpen(true)
  }

  function sluitBevestiging() {
    setBevestigOpen(false)
    setGetypt('')
  }

  async function wisAlles() {
    if (!onBeginOpnieuw || !woordKlopt || wisBezig) return
    setWisBezig(true)
    setWisMelding(null)
    try {
      const resultaat = await onBeginOpnieuw()
      if (resultaat.backupGewist) {
        setWisMelding(t('Alles is gewist. Je begint met een schone lei.'))
      } else if (verbonden) {
        setWisMelding(
          t(
            'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.',
          ),
        )
      } else {
        setWisMelding(t('Alles is gewist op dit toestel.'))
      }
    } catch {
      setWisMelding(t('Wissen is mislukt. Er is niets gewist.'))
    } finally {
      setWisBezig(false)
      setBevestigOpen(false)
      setGetypt('')
    }
  }

  return (
    <div className="stapel">
      <PaginaKop
        titel={t('Instellingen')}
        // ⚠ RONDE 66, slotronde: deze zin beschreef de pagina verkeerd. Ze begon bij
        // "taal", maar de eerste kaart is "Op je beginscherm zetten" en daarna komen
        // kleuren en pas dán taal. Een wegwijzer die zelf de weg kwijt is, is erger
        // dan geen wegwijzer.
        //
        // ⚠ RONDE 75: en toen klopte ze weer niet, want er kwam een kaart bij ("Wat wil
        // je zien?") die bewust vooraan gezet is — precies de kaart die de rest van de
        // app rustiger maakt, en ze stond niet in de wegwijzer. Dezelfde fout, negen
        // rondes later. Wie hier een kaart bijzet, hoort deze zin mee te lezen.
        bijschrift={t('Bovenaan kies je wat je in de app wil zien, en zet je de app op je beginscherm. Daarna kleuren, taal en meldingen; dan alles rond het bewaren van je gegevens, je gezinsleden, welke versie je draait, en helemaal onderaan de knop die alles wist.')}
      />

      {/* Op het beginscherm zetten. Staat vooraan, want zolang de app in een
          browsertab leeft, voelt ze niet als een app. */}
      <InstallerenKaart />

      {/* ⚠ BOVENAAN, en dat is een keuze (ronde 75). De doorlichting van augustus
          noemde Instellingen "negen kaarten in omgekeerde volgorde van belang". Dit is
          de kaart die de rest van de app rustiger maakt; ze hoort niet onder een
          keuzelijst voor licht/donker te liggen. */}
      <OnderdelenKaart
        verborgen={verborgenPaginas}
        onWissel={(pg) => zetVerborgenPaginas(wisselPagina(new Set(verborgenPaginas), pg))}
        onZetAlles={zetVerborgenPaginas}
        gegevens={onderdeelInhoud}
      />

      {/* Weergave (licht/donker) */}
      <Kaart
        titel={t('Weergave')}
        bijschrift={t('Kies licht of donker, of laat de app de voorkeur van je toestel volgen.')}
      >
        <select
          aria-label={t('Weergave')}
          value={keuze}
          onChange={(e) => zetKeuze(e.target.value as typeof keuze)}
          style={keuzelijst}
        >
          {THEMAKEUZES.map((k) => (
            <option key={k.waarde} value={k.waarde}>
              {t(k.label)}
            </option>
          ))}
        </select>
      </Kaart>

      {/* Taal */}
      <Kaart titel={t('Taal')}>
        <select aria-label={t('Taal')} value={taal} onChange={(e) => zetTaal(e.target.value as Taal)} style={keuzelijst}>
          {TALEN.map((tl) => (
            <option key={tl.waarde} value={tl.waarde}>
              {tl.label}
            </option>
          ))}
        </select>
      </Kaart>

      {/* Meldingen — vanaf welk percentage een budget een waarschuwing geeft. */}
      <Kaart
        titel={t('Meldingen')}
        bijschrift={t('Het belletje bovenaan waarschuwt je zodra een budget van deze maand tegen zijn grens loopt.')}
      >
        <div className="veldgroep">
          <label className="label-caps" htmlFor="budget-drempel">
            {t('Waarschuw vanaf')}
          </label>
          <select
            id="budget-drempel"
            value={budgetDrempel}
            onChange={(e) => zetBudgetDrempel(Number(e.target.value))}
            style={keuzelijst}
          >
            {BUDGETDREMPELS.map((d) => (
              <option key={d} value={d}>
                {t('{n}% verbruikt', { n: d })}
              </option>
            ))}
          </select>
        </div>
        <p style={statusRegel}>
          {t(
            'Een overschreden budget, een garantie die bijna verloopt en een vaste last die nog niet geboekt is, meldt de app altijd — die staan los van deze keuze.',
          )}
        </p>
      </Kaart>

      {/* Google Drive en het back-upbestand. Sinds ronde 63 zijn dat gedeelde
          kaarten: ze staan ook in de opstelling, bij het blok "Veilig bewaren". */}
      <DriveKaart
        verbonden={verbonden}
        bezig={bezig}
        laatsteSyncOp={laatsteSyncOp}
        onVerbind={onVerbind}
        onSynchroniseer={onSynchroniseer}
      />

      <BackupKaart
        backupTekst={backupTekst}
        backupIsFout={backupIsFout}
        onExporteer={onExporteer}
        onHerstel={onHerstel}
        laatsteBackupOp={laatsteBackupOp}
        opslag={opslag}
      />

      {/* Privacy — wat er met je gegevens gebeurt, in klare taal.
          Dit is de sterkste eigenschap van de app (alles blijft bij jou), maar tot
          nu toe stond dat nergens. Alleen feiten, geen beloftes: elk punt komt
          overeen met wat de code effectief doet. */}
      <Kaart
        titel={t('Je gegevens en je privacy')}
        bijschrift={t('Waar je cijfers staan, en wat de app wel en niet verstuurt.')}
      >
        <ul className="lijst">
          <li className="rij">
            <span className="rij-midden">
              <span className="rij-titel">{t('Alles staat op dit toestel')}</span>
              <span className="rij-meta">
                {t(
                  'Je rekeningen, boekingen en documenten zitten in de database van deze browser, op dit toestel. Er is geen account nodig en er staat geen kopie op een server van ons — die server bestaat niet.',
                )}
              </span>
            </span>
          </li>
          <li className="rij">
            <span className="rij-midden">
              <span className="rij-titel">{t('De back-up staat in jouw Google Drive')}</span>
              <span className="rij-meta">
                {t(
                  'Verbind je Drive, dan schrijft de app een logboek in één eigen map in jouw Drive. De app krijgt alleen toegang tot de bestanden die ze zelf maakt, niet tot de rest van je Drive. Die back-up is niet extra versleuteld: wie bij je Google-account kan, kan ze lezen — beveilig dat account dus goed.',
                )}
              </span>
            </span>
          </li>
          <li className="rij">
            <span className="rij-midden">
              <span className="rij-titel">{t('Wat er wél het toestel verlaat')}</span>
              <span className="rij-meta">
                {t(
                  'Loopt de app vast, dan wordt een technisch foutrapport verstuurd (welke fout, welke browser) — nooit een bedrag of een naam. Verder gaat er niets weg.',
                )}
              </span>
            </span>
          </li>
          <li className="rij" style={{ borderBottom: 'none' }}>
            <span className="rij-midden">
              <span className="rij-titel">{t('Geen advertenties, geen doorverkoop')}</span>
              <span className="rij-meta">
                {t('Er zit geen advertentie- of volgcode in de app, en je gegevens gaan naar niemand anders.')}
              </span>
            </span>
          </li>
        </ul>
      </Kaart>

      {/* Kinderen — KinderenSectie is zélf al een kaart, dus geen extra omhulsel. */}
      <KinderenSectie
        kinderen={kinderen}
        onToevoegen={onKindToevoegen}
        onWijzigen={onKindWijzigen}
        onVerwijderen={onKindVerwijderen}
        telGebruik={telGezinslidGebruik}
      />

      {/* ⚠ RONDE 99 — WELKE VERSIE DRAAI JE?
          Timothy zag na een publicatie nog de oude app en had geen enkele manier om na te
          kijken waar hij stond. Een balk die zegt "er is een nieuwe versie" is pas te
          vertrouwen wanneer je ook kan zien wélke je nu hebt.

          ⚠ Bewust NIET helemaal onderaan: de zin boven deze pagina belooft dat de knop die
          alles wist daar staat (ronde 66, en ronde 75 liep tegen precies die belofte aan).
          Diezelfde zin noemt deze kaart nu ook — een wegwijzer die een kaart overslaat is
          dezelfde fout, één stap verder.

          ⚠ De kaart blijft wég zonder datum. In de ontwikkelserver en in de testomgeving
          draait de bouwstap niet, dus is er geen `versie.json` — en dan is niets tonen
          eerlijker dan een lege of verzonnen datum. */}
      {bouwdatum !== null && (
        <Kaart titel={t('Deze versie')}>
          <p style={statusRegel}>{t('Deze versie is van {datum}.', { datum: bouwdatumTekst(bouwdatum, opmaakLocale()) })}</p>
          <p style={statusRegel}>
            {t('Staat er een nieuwe versie klaar, dan verschijnt bovenaan deze pagina een balk. Herlaad om ze te gebruiken — je gegevens blijven staan.')}
          </p>
        </Kaart>
      )}

      {/* Begin opnieuw — helemaal onderaan, want het is de zwaarste actie. */}
      {onBeginOpnieuw && (
        <Kaart
          titel={t('Begin opnieuw')}
          bijschrift={t('Wist al je gegevens op dit toestel en begint met een schone lei.')}
        >
          {verbonden ? (
            <>
              <p style={statusRegel}>
                {t(
                  'Ook de logbestanden in je Google Drive-back-up worden opgeruimd, anders komt alles bij de volgende synchronisatie gewoon terug. Ze gaan naar de prullenbak van Drive, dus je kan ze daar nog terughalen.',
                )}
              </p>
              {/* ⚠ RONDE 109 — ÓÓK DIE VAN JE ANDERE TOESTELLEN. De opruiming leegt de hele map,
                  en elk toestel schrijft daar zijn eigen bestand in. De zin hierboven zegt "op dit
                  toestel", en dat las als "alleen dit toestel". Ze komen pas terug wanneer dat
                  andere toestel zelf opnieuw synchroniseert — en gebeurt dat niet binnen dertig
                  dagen, dan leegt Google de prullenbak. */}
              <p style={statusRegel}>
                {t(
                  'Let op: dat geldt voor het logbestand van élk toestel, ook die van je andere toestellen. Open daarna elk van die toestellen en laat ze synchroniseren, dan staat hun back-up er weer.',
                )}
              </p>
            </>
          ) : (
            <p style={statusRegel}>
              {t(
                'Er is nu geen Google Drive-back-up verbonden. Gebruik je de app op meerdere toestellen, doe dit dan ook daar — anders komt hun data bij een volgende synchronisatie terug.',
              )}
            </p>
          )}

          {!bevestigOpen ? (
            <div className="knoprij">
              <button type="button" className="knop knop-secundair knop-gevaar" onClick={openBevestiging}>
                {t('Begin opnieuw…')}
              </button>
            </div>
          ) : (
            <>
              <p style={statusRegel}>
                {t('Dit kan niet ongedaan gemaakt worden. Maak eerst een back-up als je je gegevens wil bewaren.')}
              </p>
              <div className="veldgroep">
                {/* ⚠ RONDE 65. Het woord stond hardgecodeerd IN deze zin, terwijl
                    de vergelijking een aparte sleutel las. Twee sleutels die
                    hetzelfde woord moeten dragen, kunnen uit elkaar lopen — en dan
                    vraagt het label een woord dat de app niet aanvaardt. Nu komt het
                    woord uit dezelfde bron als de vergelijking. */}
                <label className="label-caps" id="begin-opnieuw-reden" htmlFor="begin-opnieuw-bevestig">
                  {t('Typ {woord} om te bevestigen', { woord: BEVESTIGWOORD })}
                </label>
                <input
                  id="begin-opnieuw-bevestig"
                  type="text"
                  autoComplete="off"
                  value={getypt}
                  onChange={(e) => setGetypt(e.target.value)}
                />
              </div>
              <div className="knoprij">
                {/* ⚠ `aria-disabled` en niet `disabled` (ronde 61). Met een echt
                    uitgeschakelde knop kwam je met een toetsenbord nooit langs deze
                    knop en hoorde je dus ook nooit dát er een bevestiging nodig is —
                    je stond in een veld te typen zonder te weten waarheen. De handler
                    houdt het wissen tegen zolang het woord niet klopt. */}
                <button
                  type="button"
                  className="knop knop-secundair knop-gevaar"
                  onClick={wisAlles}
                  aria-disabled={!woordKlopt || wisBezig}
                  aria-describedby={woordKlopt ? undefined : 'begin-opnieuw-reden'}
                >
                  {wisBezig ? t('Bezig…') : t('Alles wissen')}
                </button>
                <button type="button" className="knop knop-ghost" onClick={sluitBevestiging} disabled={wisBezig}>
                  {t('Annuleer')}
                </button>
              </div>
            </>
          )}

          {wisMelding && (
            <p role="status" style={statusRegel}>
              {wisMelding}
            </p>
          )}
        </Kaart>
      )}
    </div>
  )
}
