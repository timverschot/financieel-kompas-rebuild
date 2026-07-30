import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Dossier, Kind, Onderhoudsbetaling, Onderhoudsbijdrage } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { INDEX_BASISJAAR, kentIndexmaand, laatsteIndexmaand } from '../data/gezondheidsindex'
import { useT, type Vertaler } from '../i18n'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { centenNaarInvoer, formatEuro, invoerNaarCenten } from '../utils/format'
import { maandJaarLabel, vandaag } from '../utils/datum'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import {
  berekenAchterstand,
  bouwOpbouw,
  laatsteAanpassing,
  verschuldigdPerMaand,
  volgendeVerjaardag,
  type BijdrageInvoer,
} from '../utils/onderhoudsbijdrage'
import {
  aanvangsindexTekst,
  basisjaarWaarschuwing,
  getalTekst,
  openTekst,
  richtingTekst,
  stapUitleg,
  telwijzeTekst,
} from '../utils/onderhoudsbijdrageTekst'
import { exporteerIndexatiebriefPDF } from '../utils/indexatiebriefPdf'
import { GezinsledenKiezer } from './GezinslidKiezer'

// De onderhoudsbijdrage (ronde 42).
//
// Wat dit scherm doet en waarom het zo opgebouwd is:
//
//  1. Bovenaan staat het CIJFER waar het om gaat — wat de bijdrage vandaag hoort te
//     zijn. Dat is de vraag waarvoor mensen deze module openen.
//  2. Daaronder pas de opbouw, en die staat dichtgeklapt. Wie het bedrag komt
//     halen, hoeft niet eerst door vijf verjaardagen te scrollen; wie het wil
//     narekenen, klapt één keer open.
//  3. De achterstand is optioneel en staat ook dichtgeklapt. Ze is niet voor
//     iedereen relevant, en het is een gevoelig getal — het hoort niet ongevraagd
//     in beeld te staan.
//
// De toon is een functionele eis: de app rekent en registreert, ze oordeelt niet en
// kiest geen partij. Zie `onderhoudsbijdrageTekst.ts` voor de bewoordingen.

/** Leest een indexcijfer uit een invoerveld. Komma of punt mag allebei. */
function getal(waarde: string): number {
  return Number.parseFloat(waarde.replace(',', '.'))
}

export function OnderhoudsbijdrageSectie({
  dossier,
  bijdrage,
  betalingen,
  kinderen,
  onOpslaan,
  onVerwijderen,
  onBetalingOpslaan,
  onBetalingVerwijderen,
  vandaagISO = vandaag(),
}: {
  dossier: Dossier
  bijdrage: Onderhoudsbijdrage | null
  betalingen: Onderhoudsbetaling[]
  kinderen: Kind[]
  onOpslaan: (b: Onderhoudsbijdrage) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBetalingOpslaan: (b: Onderhoudsbetaling) => Promise<void> | void
  onBetalingVerwijderen: (id: string) => Promise<void> | void
  /** Alleen om te kunnen testen. */
  vandaagISO?: string
}) {
  const { t } = useT()
  const [toonAfspraak, setToonAfspraak] = useState(false)
  const [toonOpbouw, setToonOpbouw] = useState(false)
  const [toonAchterstand, setToonAchterstand] = useState(false)
  const [briefBezig, setBriefBezig] = useState(false)
  const [melding, setMelding] = useState('')
  const [fout, setFout] = useState('')

  const opbouw = useMemo(() => {
    if (!bijdrage) return null
    return bouwOpbouw(alsInvoer(bijdrage), vandaagISO)
  }, [bijdrage, vandaagISO])

  if (!bijdrage) {
    return (
      <Kaart
        titel={t('Onderhoudsbijdrage')}
        bijschrift={t('Het vaste maandbedrag uit je vonnis of overeenkomst. De app houdt de jaarlijkse indexatie bij en rekent uit wat er betaald is.')}
      >
        <Leeg>{t('Nog geen onderhoudsbijdrage ingesteld voor dit dossier. Je hebt het bedrag en de datum uit je vonnis of overeenkomst nodig.')}</Leeg>
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-secundair"
            // Het formulier gaat meteen open. Zonder dat stond er na één tik een
            // grote kop "Bijdrage vandaag € 250,00 — gelijk aan de regeling van
            // vandaag": twee verzonnen getallen, in precies het vak waar elders een
            // verdedigbaar cijfer staat.
            onClick={async () => {
              await onOpslaan({
                id: nieuwId(),
                dossierId: dossier.id,
                richting: 'jij-ontvangt',
                basisbedrag: 25000,
                datumRegeling: vandaagISO,
              })
              setToonAfspraak(true)
            }}
          >
            {t('Onderhoudsbijdrage instellen')}
          </button>
        </div>
      </Kaart>
    )
  }

  const o = opbouw as NonNullable<typeof opbouw>
  const aanpassing = laatsteAanpassing(o, bijdrage.basisbedrag)
  const maandRegels = verschuldigdPerMaand(alsInvoer(bijdrage), o, vandaagISO)
  const stand = berekenAchterstand(maandRegels, betalingen)
  const kentAlles = o.ontbrekendeMaanden.length === 0
  // Is de regeling afgelopen, dan is "vandaag" het verkeerde woord: er is sindsdien
  // niets meer verschuldigd en er wordt niets meer geïndexeerd.
  const gestopt = Boolean(bijdrage.eindDatum && bijdrage.eindDatum < vandaagISO)
  const kindNamen = (bijdrage.kindIds ?? [])
    .map((id) => kinderen.find((k) => k.id === id)?.naam)
    .filter(Boolean)
    .join(', ')

  async function maakBrief() {
    if (briefBezig || !bijdrage) return
    setBriefBezig(true)
    setFout('')
    setMelding('')
    try {
      await exporteerIndexatiebriefPDF(t, dossier, bijdrage, o, kinderen, vandaagISO)
      setMelding(t('De brief is gedownload.'))
    } catch {
      setFout(t('De brief kon niet gemaakt worden. Probeer het opnieuw.'))
    } finally {
      setBriefBezig(false)
    }
  }

  return (
    <Kaart
      titel={t('Onderhoudsbijdrage')}
      bijschrift={richtingTekst(t, bijdrage.richting)}
      actie={
        <button
          className="knop knop-kaal knop-gevaar"
          aria-label={t('Onderhoudsbijdrage verwijderen')}
          onClick={() => onVerwijderen(bijdrage.id)}
        >
          ×
        </button>
      }
    >
      {/* Het cijfer waar mensen voor komen, meteen bovenaan. */}
      <div className="stat">
        <span className="label-caps">{gestopt ? t('Bijdrage bij het einde van de regeling') : t('Bijdrage vandaag')}</span>
        <Bedrag centen={o.huidigBedrag} groot />
        <span className="rij-meta">
          {o.huidigBedrag === bijdrage.basisbedrag
            ? t('gelijk aan het bedrag uit de regeling van {datum}', { datum: bijdrage.datumRegeling })
            : t('geïndexeerd; in de regeling van {datum} stond {basis}', {
                datum: bijdrage.datumRegeling,
                basis: formatEuro(bijdrage.basisbedrag),
              })}
          {kindNamen ? ` · ${kindNamen}` : ''}
        </span>
        {gestopt && (
          <span className="rij-meta" data-gestopt>
            {t('Deze regeling liep tot {datum}; daarna is er niets meer bijgekomen.', {
              datum: bijdrage.eindDatum ?? '',
            })}
          </span>
        )}
      </div>

      {/* De aanpassing die al gebeurd is maar die je overschrijving misschien nog
          niet volgt. Dit is de reden dat mensen geld mislopen: de indexatie geldt
          van rechtswege, maar niemand past er automatisch iets voor aan. */}
      {aanpassing && (
        <p className="statusregel" data-aanpassing>
          {t('Sinds {datum} staat de bijdrage op {bedrag}. Loopt de betaling nog op het oude bedrag, dan is dat sindsdien elke maand een verschil.', {
            datum: aanpassing.datum,
            bedrag: formatEuro(aanpassing.bedrag),
          })}
        </p>
      )}

      {/* Altijd aanwezig, leeg wanneer er niets te melden is: een `role="status"`
          die pas mét de melding in het document verschijnt, wordt door sommige
          schermlezers niet voorgelezen (zie RapportKaart.tsx). */}
      <p className={kentAlles ? 'rij-meta' : 'foutregel'} role="status" style={{ margin: 0 }}>
        {kentAlles
          ? ''
          : t('De app kent nog geen indexcijfer voor {maanden}. Ze kent cijfers tot {laatste}. Vul het ontbrekende cijfer hieronder zelf in, dan is de berekening volledig.', {
              maanden: o.ontbrekendeMaanden.map((m) => maandJaarLabel(`${m}-01`)).join(', '),
              laatste: maandJaarLabel(`${laatsteIndexmaand()}-01`),
            })}
      </p>

      <div className="knoprij">
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-expanded={toonOpbouw}
          onClick={() => setToonOpbouw((aan) => !aan)}
        >
          {toonOpbouw ? t('Verberg de opbouw') : t('Toon de opbouw')}
        </button>
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-expanded={toonAchterstand}
          onClick={() => setToonAchterstand((aan) => !aan)}
        >
          {toonAchterstand ? t('Verberg wat er betaald is') : t('Toon wat er betaald is')}
        </button>
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-disabled={briefBezig}
          onClick={maakBrief}
        >
          {briefBezig ? t('Bezig…') : t('Brief met de berekening')}
        </button>
        <button
          type="button"
          className="knop knop-ghost knop-klein"
          aria-expanded={toonAfspraak}
          onClick={() => setToonAfspraak((aan) => !aan)}
        >
          {toonAfspraak ? t('Sluit de regeling') : t('Wijzig de regeling')}
        </button>
      </div>

      {fout !== '' && (
        <p className="foutregel" role="alert">
          {fout}
        </p>
      )}
      <p className="rij-meta" role="status" style={{ margin: 0 }}>
        {melding}
      </p>

      {toonOpbouw && <Opbouw t={t} bijdrage={bijdrage} opbouw={o} vandaagISO={vandaagISO} />}

      {toonAchterstand && (
        <Achterstand
          t={t}
          bijdrage={bijdrage}
          betalingen={betalingen}
          stand={stand}
          onBetalingOpslaan={onBetalingOpslaan}
          onBetalingVerwijderen={onBetalingVerwijderen}
          vandaagISO={vandaagISO}
        />
      )}

      {toonAfspraak && (
        <Regeling t={t} bijdrage={bijdrage} kinderen={kinderen} onOpslaan={onOpslaan} onKlaar={() => setToonAfspraak(false)} />
      )}
    </Kaart>
  )
}

/** Het record omzetten naar wat de rekenkern vraagt. */
function alsInvoer(b: Onderhoudsbijdrage): BijdrageInvoer {
  return {
    basisbedrag: b.basisbedrag,
    datumRegeling: b.datumRegeling,
    geindexeerd: b.geindexeerd,
    aanvangsindexHandmatig: b.aanvangsindexHandmatig,
    eigenIndexcijfers: b.eigenIndexcijfers,
    eindDatum: b.eindDatum,
  }
}

// ---------------------------------------------------------------------------

function Opbouw({
  t,
  bijdrage,
  opbouw,
  vandaagISO,
}: {
  t: Vertaler
  bijdrage: Onderhoudsbijdrage
  opbouw: ReturnType<typeof bouwOpbouw>
  vandaagISO: string
}) {
  return (
    <Kaart compact style={{ backgroundColor: 'var(--surface-2)', gap: 12 }} data-opbouw>
      <span className="label-caps">{t('Hoe dit bedrag tot stand komt')}</span>
      <p className="rij-meta" style={{ margin: 0 }}>
        {aanvangsindexTekst(t, opbouw)}
      </p>
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('Elke verjaardag rekent opnieuw vanaf het bedrag uit de regeling, niet vanaf dat van vorig jaar — zo stapelen afrondingen zich niet op.')}
      </p>

      {opbouw.stappen.length === 0 ? (
        <Leeg>
          {bijdrage.geindexeerd === false
            ? t('De regeling sluit indexatie uit, dus het bedrag blijft ongewijzigd.')
            : t('De eerste verjaardag van de regeling moet nog komen: op {datum}.', {
                datum: volgendeVerjaardag(bijdrage.datumRegeling, vandaagISO),
              })}
        </Leeg>
      ) : (
        <ul className="lijst">
          {opbouw.stappen.map((stap) => (
            <li key={stap.datum} className="rij rij-kost">
              <span className="rij-midden">
                <span className="rij-titel">{stap.datum}</span>
                <span className="rij-meta">
                  {stapUitleg(t, stap, bijdrage.basisbedrag, opbouw.aanvangsindex)}
                </span>
              </span>
              <span className="rij-acties">
                <Bedrag centen={stap.bedrag} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('De app kent indexcijfers tot {laatste}, in basis {jaar} = 100.', {
          laatste: maandJaarLabel(`${opbouw.laatsteBekendeMaand}-01`),
          jaar: INDEX_BASISJAAR,
        })}
      </p>
    </Kaart>
  )
}

// ---------------------------------------------------------------------------

function Achterstand({
  t,
  bijdrage,
  betalingen,
  stand,
  onBetalingOpslaan,
  onBetalingVerwijderen,
  vandaagISO,
}: {
  t: Vertaler
  bijdrage: Onderhoudsbijdrage
  betalingen: Onderhoudsbetaling[]
  stand: ReturnType<typeof berekenAchterstand>
  onBetalingOpslaan: (b: Onderhoudsbetaling) => Promise<void> | void
  onBetalingVerwijderen: (id: string) => Promise<void> | void
  vandaagISO: string
}) {
  const [datum, setDatum] = useState(vandaagISO)
  const [bedrag, setBedrag] = useState('')
  const [voorMaand, setVoorMaand] = useState('')
  const [fout, setFout] = useState('')

  async function voegToe(e: FormEvent) {
    e.preventDefault()
    const centen = invoerNaarCenten(bedrag)
    if (!Number.isFinite(centen) || centen <= 0) {
      setFout(t('Vul een bedrag groter dan nul in.'))
      return
    }
    setFout('')
    await onBetalingOpslaan({
      id: nieuwId(),
      bijdrageId: bijdrage.id,
      datum,
      bedrag: centen,
      ...(voorMaand ? { voorMaand } : {}),
    })
    setBedrag('')
    setVoorMaand('')
  }

  return (
    <Kaart compact style={{ backgroundColor: 'var(--surface-2)', gap: 12 }} data-achterstand>
      <span className="label-caps">{t('Wat er verschuldigd was en wat er betaald is')}</span>
      <ul className="lijst">
        <li className="rij">
          <span className="rij-midden">
            <span className="rij-titel">{t('Verschuldigd')}</span>
            <span className="rij-meta">{t('over {n} maand(en)', { n: stand.maanden })}</span>
          </span>
          <Bedrag centen={stand.verschuldigd} />
        </li>
        <li className="rij">
          <span className="rij-midden">
            <span className="rij-titel">{t('Betaald')}</span>
            <span className="rij-meta">{t('{n} betaling(en) geregistreerd', { n: betalingen.length })}</span>
          </span>
          <Bedrag centen={stand.betaald} />
        </li>
      </ul>
      <p className="rij-titel" style={{ margin: 0 }} data-open>
        {openTekst(t, stand.open, bijdrage.richting)}
      </p>
      <p className="rij-meta" style={{ margin: 0 }}>
        {telwijzeTekst(t)}
      </p>

      <form className="stapel" onSubmit={voegToe} style={{ gap: 8 }}>
        <span className="label-caps">{t('Betaling toevoegen')}</span>
        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Datum')}</span>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Bedrag')}</span>
            <input inputMode="decimal" value={bedrag} onChange={(e) => setBedrag(e.target.value)} placeholder="250,00" />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Voor de maand')}</span>
            <input type="month" value={voorMaand} onChange={(e) => setVoorMaand(e.target.value)} />
          </label>
        </div>
        {fout !== '' && (
          <p className="foutregel" role="alert">
            {fout}
          </p>
        )}
        <div className="knoprij">
          <button type="submit" className="knop knop-secundair knop-klein">
            {t('Betaling toevoegen')}
          </button>
        </div>
      </form>

      {betalingen.length === 0 ? (
        <Leeg>{t('Nog geen betalingen geregistreerd.')}</Leeg>
      ) : (
        <ul className="lijst">
          {gesorteerdNieuwsteEerst(betalingen).map((b) => (
            <li key={b.id} className="rij rij-kost">
              <span className="rij-midden">
                <span className="rij-titel">{b.datum}</span>
                {b.voorMaand && (
                  <span className="rij-meta">
                    {t('voor {maand}', { maand: maandJaarLabel(`${b.voorMaand}-01`) })}
                  </span>
                )}
              </span>
              <span className="rij-acties">
                <Bedrag centen={b.bedrag} />
                <button
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder betaling van {datum}', { datum: b.datum })}
                  onClick={() => onBetalingVerwijderen(b.id)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Kaart>
  )
}

// ---------------------------------------------------------------------------

function Regeling({
  t,
  bijdrage,
  kinderen,
  onOpslaan,
  onKlaar,
}: {
  t: Vertaler
  bijdrage: Onderhoudsbijdrage
  kinderen: Kind[]
  onOpslaan: (b: Onderhoudsbijdrage) => Promise<void> | void
  onKlaar: () => void
}) {
  const [basis, setBasis] = useState(centenNaarInvoer(bijdrage.basisbedrag))
  const [datum, setDatum] = useState(bijdrage.datumRegeling)
  const [richting, setRichting] = useState(bijdrage.richting)
  const [indexeren, setIndexeren] = useState(bijdrage.geindexeerd !== false)
  const [eind, setEind] = useState(bijdrage.eindDatum ?? '')
  const [aanvang, setAanvang] = useState(
    bijdrage.aanvangsindexHandmatig ? getalTekst(bijdrage.aanvangsindexHandmatig) : '',
  )
  const [eigenMaand, setEigenMaand] = useState('')
  const [eigenCijfer, setEigenCijfer] = useState('')
  const [gekozenKinderen, setGekozenKinderen] = useState<string[]>(bijdrage.kindIds ?? [])
  const [fout, setFout] = useState('')

  const eigen = bijdrage.eigenIndexcijfers ?? {}

  async function bewaar(e: FormEvent) {
    e.preventDefault()
    const centen = invoerNaarCenten(basis)
    if (!Number.isFinite(centen) || centen <= 0) {
      setFout(t('Vul een bedrag groter dan nul in.'))
      return
    }
    // Een onleesbare aanvangsindex werd stil weggegooid, en dan viel de berekening
    // terug op de tabel — precies de vermenging van basisjaren waar de waarschuwing
    // hieronder voor bestaat.
    const handmatig = getal(aanvang)
    if (aanvang.trim() !== '' && (!Number.isFinite(handmatig) || handmatig <= 0)) {
      setFout(t('De aanvangsindex is geen geldig getal. Laat het veld leeg om de app het cijfer zelf te laten opzoeken.'))
      return
    }
    setFout('')
    await onOpslaan({
      ...bijdrage,
      basisbedrag: centen,
      datumRegeling: datum,
      richting,
      geindexeerd: indexeren,
      // `undefined` wist het veld — zo raak je een handmatige aanvangsindex weer kwijt.
      ...(Number.isFinite(handmatig) && handmatig > 0
        ? { aanvangsindexHandmatig: handmatig }
        : { aanvangsindexHandmatig: undefined }),
      ...(eind ? { eindDatum: eind } : { eindDatum: undefined }),
      ...(gekozenKinderen.length > 0 ? { kindIds: gekozenKinderen } : { kindIds: undefined }),
    })
    onKlaar()
  }

  async function voegIndexToe() {
    const cijfer = getal(eigenCijfer)
    if (!eigenMaand || !Number.isFinite(cijfer) || cijfer <= 0) {
      setFout(t('Kies een maand en vul een indexcijfer groter dan nul in.'))
      return
    }
    setFout('')
    await onOpslaan({ ...bijdrage, eigenIndexcijfers: { ...eigen, [eigenMaand]: cijfer } })
    setEigenMaand('')
    setEigenCijfer('')
  }

  async function wisIndex(maand: string) {
    const rest = { ...eigen }
    delete rest[maand]
    await onOpslaan({
      ...bijdrage,
      ...(Object.keys(rest).length > 0 ? { eigenIndexcijfers: rest } : { eigenIndexcijfers: undefined }),
    })
  }

  return (
    <Kaart compact style={{ backgroundColor: 'var(--surface-2)', gap: 12 }} data-regeling>
      <form className="stapel" onSubmit={bewaar} style={{ gap: 10 }}>
        <span className="label-caps">{t('De regeling')}</span>
        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Bedrag uit de regeling')}</span>
            <input inputMode="decimal" value={basis} onChange={(e) => setBasis(e.target.value)} />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Datum vonnis of overeenkomst')}</span>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Loopt tot (optioneel)')}</span>
            <input type="date" value={eind} onChange={(e) => setEind(e.target.value)} />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Richting')}</span>
            <select value={richting} onChange={(e) => setRichting(e.target.value as typeof richting)}>
              <option value="jij-ontvangt">{t('De andere ouder betaalt aan jou')}</option>
              <option value="jij-betaalt">{t('Jij betaalt aan de andere ouder')}</option>
            </select>
          </label>
        </div>
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('De datum bepaalt twee dingen: de aanvangsindex (de maand ervóór) en de dag waarop er elk jaar geïndexeerd wordt.')}
        </p>

        <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            className="tx-vinkje"
            checked={indexeren}
            onChange={(e) => setIndexeren(e.target.checked)}
          />
          <span className="rij-meta">{t('Jaarlijks indexeren (de wettelijke regel, tenzij de akte iets anders zegt)')}</span>
        </label>

        {kinderen.length > 0 && (
          <div className="veldgroep">
            <GezinsledenKiezer
              label={t('Voor welke kinderen (optioneel)')}
              gezinsleden={kinderen}
              waarden={gekozenKinderen}
              onWijzig={setGekozenKinderen}
            />
          </div>
        )}

        <label className="veldgroep">
          <span className="label-caps">{t('Aanvangsindex uit de akte (optioneel)')}</span>
          <input inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} placeholder={t('leeg = de app zoekt ze zelf op')} />
        </label>
        <p className="rij-meta" style={{ margin: 0 }}>
          {basisjaarWaarschuwing(t)}
        </p>

        {fout !== '' && (
          <p className="foutregel" role="alert">
            {fout}
          </p>
        )}
        <div className="knoprij">
          <button type="submit" className="knop knop-secundair knop-klein">
            {t('Bewaar de regeling')}
          </button>
          <button type="button" className="knop knop-ghost knop-klein" onClick={onKlaar}>
            {t('Annuleer')}
          </button>
        </div>
      </form>

      {/* Zelf een indexcijfer bijzetten. Nodig omdat de meegeleverde tabel per
          definitie achterloopt: het cijfer van deze maand verschijnt pas op het
          einde van deze maand. */}
      <div className="stapel" style={{ gap: 8 }}>
        <span className="label-caps">{t('Zelf een indexcijfer toevoegen')}</span>
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('De app kent cijfers tot {laatste}. Loopt je verjaardag daarop vooruit, vul het cijfer dan hier in — je vindt het bij Statbel.', {
            laatste: maandJaarLabel(`${laatsteIndexmaand()}-01`),
          })}
        </p>
        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Maand')}</span>
            <input type="month" value={eigenMaand} onChange={(e) => setEigenMaand(e.target.value)} />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Gezondheidsindex')}</span>
            <input inputMode="decimal" value={eigenCijfer} onChange={(e) => setEigenCijfer(e.target.value)} placeholder="139,08" />
          </label>
        </div>
        {eigenMaand && kentIndexmaand(eigenMaand) && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('De app kent deze maand al. Vul je hier iets in, dan gaat jouw cijfer voor.')}
          </p>
        )}
        <div className="knoprij">
          <button type="button" className="knop knop-secundair knop-klein" onClick={voegIndexToe}>
            {t('Indexcijfer toevoegen')}
          </button>
        </div>
        {Object.keys(eigen).length > 0 && (
          <ul className="lijst">
            {Object.entries(eigen)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([maand, cijfer]) => (
                <li key={maand} className="rij">
                  <span className="rij-midden">
                    <span className="rij-titel">{maandJaarLabel(`${maand}-01`)}</span>
                    <span className="rij-meta">{getalTekst(cijfer)}</span>
                  </span>
                  <button
                    className="knop knop-kaal knop-gevaar"
                    aria-label={t('Verwijder je eigen indexcijfer voor {maand}', { maand: maandJaarLabel(`${maand}-01`) })}
                    onClick={() => wisIndex(maand)}
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>


    </Kaart>
  )
}
