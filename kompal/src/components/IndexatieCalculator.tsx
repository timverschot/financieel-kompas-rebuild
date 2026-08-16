import { useState } from 'react'
import type { CSSProperties } from 'react'
import { indexatie, tekstNaarGetal, formatProcent, type IndexatieSoort } from '../utils/rekenhulp'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { basisjaarWaarschuwing, getalTekst } from '../utils/onderhoudsbijdrageTekst'
import { indexVan, maandVoor } from '../utils/onderhoudsbijdrage'
import { maandJaarLabel } from '../utils/datum'
import { nieuwId } from '../data/sync/id'
import type { Dossier, Onderhoudsbijdrage } from '../data/schema'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// De uitkomst krijgt een zacht amberen vlak: het is het antwoord van de rekenhulp,
// niet zomaar een regel tekst. De andere rekenhulpen gebruiken hetzelfde vlak,
// daarom staat het hier één keer en wordt het geëxporteerd.
export const uitkomstVlak: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--accent-soft)',
  color: 'var(--accent-ink)',
  fontWeight: 600,
}

// Kleine bijregel binnen dat amberen vlak (de toelichting onder het hoofdcijfer).
export const uitkomstBijregel: CSSProperties = { margin: '6px 0 0', fontSize: 'var(--tekst-s)', fontWeight: 500 }

/**
 * Rekenhulp voor de Belgische indexatie. Alimentatie en huur gebruiken exact
 * dezelfde formule (basisbedrag × nieuwe index / aanvangsindex); enkel de uitleg
 * en de gebruikte indexreeks verschillen.
 *
 * Sinds deze ronde is ze geen eiland meer: bij alimentatie kan je de berekening
 * **bewaren als onderhoudsbijdrage** in een dossier. Daar rekent de app ze vanaf
 * dan zélf bij, elk jaar op de verjaardag, met de gezondheidsindex die ze kent —
 * in plaats van dat je hier elk jaar opnieuw twee cijfers moet opzoeken.
 */
export function IndexatieCalculator({
  dossiers = [],
  bestaandeBijdragen = [],
  onBewaarBijdrage,
}: {
  /** De dossiers waarin een regeling bewaard kan worden. */
  dossiers?: Dossier[]
  /** Om te weten welk dossier er al een regeling heeft; daar past er maar één in. */
  bestaandeBijdragen?: Onderhoudsbijdrage[]
  /** Ontbreekt deze, dan gedraagt de rekenhulp zich zoals voorheen: ze bewaart niets. */
  onBewaarBijdrage?: (b: Onderhoudsbijdrage) => Promise<void> | void
} = {}) {
  const { t } = useT()
  const [soort, setSoort] = useState<IndexatieSoort>('alimentatie')
  const [basis, setBasis] = useState('')
  const [aanvang, setAanvang] = useState('')
  const [nieuw, setNieuw] = useState('')

  const uitkomst = indexatie(invoerNaarCenten(basis), tekstNaarGetal(aanvang), tekstNaarGetal(nieuw))
  // Zolang er nog niets ingevuld is, tonen we geen foutmelding — dat zou de
  // gebruiker beknorren voor een leeg formulier.
  const ingevuld = basis.trim() !== '' && aanvang.trim() !== '' && nieuw.trim() !== ''

  return (
    <Kaart
      // Ronde 32: één vaste titel. De titel wisselde mee met de gekozen tab
      // ("Huurindexatie" / "Alimentatie-indexatie"), terwijl de tabs er vlak onder
      // al staan — de kop herhaalde dus wat je zelf net had aangeklikt. "Indexatie-
      // tools" zegt wat de kaart IS; de tabs zeggen welke je gebruikt.
      titel={t('Indexatie-tools')}
      bijschrift={
        soort === 'huur'
          ? t('Geïndexeerde huur = basishuur × nieuwe index / aanvangsindex (Belgische formule).')
          : t('Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).')
      }
    >
      <div className="knoprij" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={soort === 'alimentatie' ? 'chip chip-actief' : 'chip'}
          aria-pressed={soort === 'alimentatie'}
          onClick={() => setSoort('alimentatie')}
        >
          {t('Alimentatie')}
        </button>
        <button
          type="button"
          className={soort === 'huur' ? 'chip chip-actief' : 'chip'}
          aria-pressed={soort === 'huur'}
          onClick={() => setSoort('huur')}
        >
          {t('Huur')}
        </button>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }}>
        {soort === 'huur'
          ? t('Voor huur gebruik je de gezondheidsindex: de aanvangsindex is die van de maand vóór de ondertekening van het huurcontract.')
          : t('Voor onderhoudsgeld is de aanvangsindex die van de maand vóór de maand waarin het bedrag werd vastgelegd — dezelfde regel als bij huur. Hou je een lopende regeling bij, gebruik dan de onderhoudsbijdrage in je dossier: die zoekt de indexcijfers zelf op.')}
      </p>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="basisbedrag">
            {t('Basisbedrag (€)')}
          </label>
          <input id="basisbedrag" inputMode="decimal" value={basis} onChange={(e) => setBasis(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="aanvangsindex">
            {t('Aanvangsindex')}
          </label>
          <input id="aanvangsindex" inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="nieuweindex">
            {t('Nieuwe index')}
          </label>
          <input id="nieuweindex" inputMode="decimal" value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        </div>
      </div>

      {uitkomst.ok && (
        <div style={{ ...uitkomstVlak, marginTop: 14 }}>
          <p style={{ margin: 0 }}>{t('Geïndexeerd bedrag: {bedrag}', { bedrag: formatEuro(uitkomst.waarde.nieuwBedragCenten) })}</p>
          <p style={uitkomstBijregel}>
            {uitkomst.waarde.verschilCenten === 0
              ? t('Het bedrag blijft gelijk.')
              : uitkomst.waarde.verschilCenten > 0
                ? t('Dat is {verschil} meer ({procent}).', {
                    verschil: formatEuro(uitkomst.waarde.verschilCenten),
                    procent: formatProcent(uitkomst.waarde.stijgingProcent, 2),
                  })
                : t('Dat is {verschil} minder ({procent}).', {
                    verschil: formatEuro(Math.abs(uitkomst.waarde.verschilCenten)),
                    procent: formatProcent(Math.abs(uitkomst.waarde.stijgingProcent), 2),
                  })}
          </p>
        </div>
      )}

      {!uitkomst.ok && ingevuld && (
        <p style={{ margin: '14px 0 0', fontSize: 'var(--tekst-s)', color: 'var(--negative-ink)' }}>
          {uitkomst.fout === 'index-ongeldig'
            ? t('Vul twee indexcijfers groter dan nul in.')
            : t('Vul een basisbedrag groter dan nul in.')}
        </p>
      )}

      {soort === 'alimentatie' && onBewaarBijdrage && uitkomst.ok && (
        <BewaarAlsBijdrage
          basisbedrag={invoerNaarCenten(basis)}
          aanvangsindex={tekstNaarGetal(aanvang)}
          dossiers={dossiers}
          bestaandeBijdragen={bestaandeBijdragen}
          onBewaar={onBewaarBijdrage}
        />
      )}
    </Kaart>
  )
}

/**
 * "Bewaar dit als een lopende regeling."
 *
 * Wat er van deze rekenhulp overgaat: het basisbedrag en de aanvangsindex zoals JIJ
 * ze intikte. De nieuwe index gaat NIET mee — die hoort bij één bepaalde maand, en
 * welke maand dat was weet dit scherm niet. In het dossier zoekt de app dat cijfer
 * voortaan zelf op, elk jaar op de verjaardag van de regeling.
 *
 * De aanvangsindex gaat mee als `aanvangsindexHandmatig`, want dat is precies wat
 * dat veld betekent: het cijfer zoals het in de akte staat. Daarbij hoort ook de
 * waarschuwing over basisjaren — twee cijfers uit verschillende basisjaren geven een
 * bedrag dat er juist uitziet en het niet is.
 */
function BewaarAlsBijdrage({
  basisbedrag,
  aanvangsindex,
  dossiers,
  bestaandeBijdragen,
  onBewaar,
}: {
  basisbedrag: number
  aanvangsindex: number
  dossiers: Dossier[]
  bestaandeBijdragen: Onderhoudsbijdrage[]
  onBewaar: (b: Onderhoudsbijdrage) => Promise<void> | void
}) {
  const { t } = useT()
  // Per dossier past er één regeling; een tweede zou nooit getoond worden.
  const vrij = dossiers.filter((d) => !bestaandeBijdragen.some((b) => b.dossierId === d.id))
  const [open, setOpen] = useState(false)
  const [dossierId, setDossierId] = useState('')
  const [datum, setDatum] = useState('')
  const [richting, setRichting] = useState<Onderhoudsbijdrage['richting']>('jij-betaalt')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [melding, setMelding] = useState('')

  // Bewust valideren dat de keuze nog in de lijst zit. Bewaarde je er net één, dan
  // valt dat dossier uit `vrij` en toont de browser de eerste optie — terwijl de
  // knop nog altijd naar het oude id verwees. Je maakte dan een tweede bijdrage in
  // een dossier dat er al één had, en het dossierscherm toonde alleen de eerste.
  const gekozen = vrij.some((d) => d.id === dossierId) ? dossierId : (vrij[0]?.id ?? '')
  const geldig = gekozen !== '' && /^\d{4}-\d{2}-\d{2}$/.test(datum)

  // Wat de app zélf voor die maand kent. Klopt jouw cijfer daarmee, dan hoeft het
  // niet als "uit de akte" bewaard te worden: dan bevriest het enkel een getal dat
  // de app uit de datum kan afleiden. Wijkt het af, dan is het wél belangrijk —
  // en dan hoort de gebruiker het verschil te zien vóór hij bewaart.
  const automatisch = /^\d{4}-\d{2}-\d{2}$/.test(datum) ? indexVan(maandVoor(datum)) : undefined
  const wijktAf = automatisch !== undefined && Math.abs(automatisch - aanvangsindex) >= 0.005

  async function bewaar() {
    if (bezig || !geldig) return
    setBezig(true)
    setFout('')
    setMelding('')
    try {
      await onBewaar({
        id: nieuwId(),
        dossierId: gekozen,
        richting,
        basisbedrag,
        datumRegeling: datum,
        // Alleen bewaren wanneer jouw cijfer afwijkt van wat de app zelf kent.
        //
        // Er wordt geen basisjaar bij gestempeld: in welke reeks een cijfer uit een
        // akte staat, weet de gebruiker meestal niet, en een stempel zou dat als
        // vaststaand vastleggen. De rekenkern leidt het zelf af — komt dit cijfer
        // niet overeen met de tabel, dan weigert ze te indexeren en zegt ze waarom
        // (ronde 47).
        ...(automatisch === undefined || wijktAf ? { aanvangsindexHandmatig: aanvangsindex } : {}),
      })
      // De naam uit ALLE dossiers halen: het net bewaarde dossier valt uit `vrij`.
      const naam = dossiers.find((d) => d.id === gekozen)?.naam ?? ''
      setMelding(t('Bewaard in {dossier}. De app indexeert dit voortaan zelf op de verjaardag van de regeling.', { dossier: naam }))
      // Het paneel blijft open met een lege datum: zo blijft de focus op de knop
      // staan en zie je meteen dat er iets bewaard is. De dossierkeuze schuift
      // vanzelf op, want dit dossier zit niet meer in de lijst.
      setDossierId('')
      setDatum('')
    } catch {
      setFout(t('Bewaren is niet gelukt. Probeer het opnieuw.'))
    } finally {
      setBezig(false)
    }
  }

  return (
    <div style={{ marginTop: 14 }} data-bewaar-bijdrage>
      {/* Altijd aanwezig, ook leeg: een gebied dat pas bij een melding verschijnt,
          wordt door een schermlezer niet voorgelezen. */}
      <p className="rij-meta" role="status" style={{ margin: melding ? '0 0 8px' : 0 }}>
        {melding}
      </p>
      {fout !== '' && (
        <p className="foutregel" role="alert">
          {fout}
        </p>
      )}

      {dossiers.length === 0 ? (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('Wil je dit als lopende regeling bijhouden, maak dan eerst een dossier aan bij Dossiers.')}
        </p>
      ) : vrij.length === 0 ? (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('Al je dossiers hebben al een onderhoudsbijdrage. Pas ze daar aan in plaats van hier een tweede te maken.')}
        </p>
      ) : (
        <>
          <button
            type="button"
            className="knop knop-secundair knop-klein"
            aria-expanded={open}
            onClick={() => setOpen((aan) => !aan)}
          >
            {open ? t('Sluit') : t('Bewaar als onderhoudsbijdrage')}
          </button>

          {open && (
            <>
              <p className="rij-meta" style={{ margin: '8px 0 0' }}>
                {t('Het basisbedrag en de aanvangsindex gaan mee. Het nieuwe indexcijfer niet: dat hoort bij één bepaalde maand, en in je dossier zoekt de app dat voortaan zelf op.')}
              </p>
              <p className="rij-meta" style={{ margin: '6px 0 0' }}>
                {basisjaarWaarschuwing(t)}
              </p>
              {wijktAf && automatisch !== undefined && (
                <p className="rij-meta" role="status" style={{ margin: '6px 0 0', color: 'var(--warn-tekst)' }}>
                  {t('Let op: voor {maand} kent de app zelf het cijfer {kent}, terwijl jij {getikt} intikte. Jouw cijfer wordt bewaard als "zoals ze in de akte staat". Komt het uit een ouder basisjaar, dan geven de volgende berekeningen een bedrag dat er juist uitziet en het niet is.', {
                    maand: maandJaarLabel(`${maandVoor(datum)}-01`),
                    kent: getalTekst(automatisch),
                    getikt: getalTekst(aanvangsindex),
                  })}
                </p>
              )}
              <div className="veldrij" style={{ marginTop: 8 }}>
                <div className="veldgroep">
                  <label className="label-caps" htmlFor="bewaar-dossier">
                    {t('In welk dossier')}
                  </label>
                  <select id="bewaar-dossier" value={gekozen} onChange={(e) => setDossierId(e.target.value)}>
                    {vrij.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.naam}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="veldgroep">
                  <label className="label-caps" htmlFor="bewaar-datum">
                    {t('Datum vonnis of overeenkomst')}
                  </label>
                  <input id="bewaar-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
                </div>
                <div className="veldgroep">
                  <label className="label-caps" htmlFor="bewaar-richting">
                    {t('Richting')}
                  </label>
                  <select
                    id="bewaar-richting"
                    value={richting}
                    onChange={(e) => setRichting(e.target.value as Onderhoudsbijdrage['richting'])}
                  >
                    <option value="jij-betaalt">{t('Jij betaalt aan de andere ouder')}</option>
                    <option value="jij-ontvangt">{t('De andere ouder betaalt aan jou')}</option>
                  </select>
                </div>
              </div>
              <div className="knoprij" style={{ marginTop: 8 }}>
                <button type="button" className="knop knop-klein" aria-disabled={bezig || !geldig} onClick={bewaar}>
                  {bezig ? t('Bezig…') : t('Bewaar in dossier')}
                </button>
              </div>
              {!geldig && (
                <p className="rij-meta" style={{ margin: '6px 0 0' }}>
                  {t('Vul de datum van het vonnis of de overeenkomst in: die bepaalt op welke dag er elk jaar geïndexeerd wordt.')}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
