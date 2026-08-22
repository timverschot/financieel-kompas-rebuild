import { useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Dossier, Kind, Onderhoudsbetaling, Onderhoudsbijdrage } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import {
  INDEXREEKS_INFO,
  basisjaarVan,
  indexcijfer,
  kentIndexmaand,
  laatsteIndexmaand,
  reeksVan,
  reeksinfo,
  type Indexreeks,
} from '../data/indexreeksen'
import { useT, type Vertaler } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { Bedrag, EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { centenNaarInvoer, formatEuro, invoerNaarCenten } from '../utils/format'
import { exportFoutmelding } from '../utils/appVersie'
import { maandJaarLabel, vandaag } from '../utils/datum'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import {
  alsBijdrageInvoer,
  berekenAchterstand,
  bouwOpbouw,
  laatsteAanpassing,
  verschuldigdPerMaand,
  volgendeVerjaardag,
} from '../utils/onderhoudsbijdrage'
import {
  aanvangsindexTekst,
  basisjaarWaarschuwing,
  getalTekst,
  openTekst,
  reeksConflictUitleg,
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
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ Eén vast id voor het aanmaken van de bijdrage; zie de knop hieronder.
  const nieuwIdRef = useRef(nieuwId())
  const [toonAfspraak, setToonAfspraak] = useState(false)
  const [toonOpbouw, setToonOpbouw] = useState(false)
  const [toonAchterstand, setToonAchterstand] = useState(false)
  const [briefBezig, setBriefBezig] = useState(false)
  const [melding, setMelding] = useState('')
  const [fout, setFout] = useState('')
  const briefRedenId = useId()

  const opbouw = useMemo(() => {
    if (!bijdrage) return null
    return bouwOpbouw(alsBijdrageInvoer(bijdrage), vandaagISO)
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
            onClick={() => {
              // ⚠ Eén vast id (ronde 68): mislukt dit en probeer je het opnieuw, dan
              // hoort er geen tweede bijdrage in hetzelfde dossier te ontstaan — het
              // dossierscherm toont er dan maar één en de andere blijft onzichtbaar.
              void opslag
                .probeer(() =>
                  onOpslaan({
                    id: nieuwIdRef.current,
                    dossierId: dossier.id,
                    richting: 'jij-ontvangt',
                    basisbedrag: 25000,
                    datumRegeling: vandaagISO,
                  }),
                )
                .then((gelukt: boolean) => {
                  if (!gelukt) return
                  // ⚠ Het id moet ververst worden: deze sectie blijft gemount wanneer je
                  // van dossier wisselt, en zonder dit kreeg de bijdrage van het tweede
                  // dossier hetzelfde id als die van het eerste — dan verhuist de eerste
                  // mét haar betalingen naar het andere dossier.
                  nieuwIdRef.current = nieuwId()
                  setToonAfspraak(true)
                })
            }}
          >
            {t('Onderhoudsbijdrage instellen')}
          </button>
        </div>
        <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />
      </Kaart>
    )
  }

  const o = opbouw as NonNullable<typeof opbouw>
  const aanpassing = laatsteAanpassing(o, bijdrage.basisbedrag)
  const maandRegels = verschuldigdPerMaand(alsBijdrageInvoer(bijdrage), o, vandaagISO)
  const stand = berekenAchterstand(maandRegels, betalingen)
  const kentAlles = o.ontbrekendeMaanden.length === 0
  // Is de regeling afgelopen, dan is "vandaag" het verkeerde woord: er is sindsdien
  // niets meer verschuldigd en er wordt niets meer geïndexeerd.
  const gestopt = Boolean(bijdrage.eindDatum && bijdrage.eindDatum < vandaagISO)
  const briefGeblokkeerd = o.indexConflict !== null
  const kindNamen = (bijdrage.kindIds ?? [])
    .map((id) => kinderen.find((k) => k.id === id)?.naam)
    .filter(Boolean)
    .join(', ')

  async function maakBrief() {
    if (briefBezig || briefGeblokkeerd || !bijdrage) return
    setBriefBezig(true)
    setFout('')
    setMelding('')
    try {
      await exporteerIndexatiebriefPDF(t, dossier, bijdrage, o, kinderen, vandaagISO)
      setMelding(t('De brief is gedownload.'))
    } catch (e) {
      setFout(exportFoutmelding(t, e, t('De brief kon niet gemaakt worden. Probeer het opnieuw.')))
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
          onClick={() => void opslag.probeer(() => onVerwijderen(bijdrage.id))}
        >
          ×
        </button>
      }
    >
      {/* Het basisjaar van de index klopt niet meer met dat van je eigen cijfers.
          Dit staat BOVEN het bedrag, want zolang dit niet opgelost is, is er geen
          bedrag om te tonen — en een geïndexeerd bedrag uit twee verschillende
          maatstaven ziet er geloofwaardig uit terwijl het er tientallen procenten
          naast zit. Dat is het gevaarlijkste wat deze app kan doen. */}
      {o.indexConflict !== null && (
        <p className="foutregel" role="alert" data-basisjaar>
          {reeksConflictUitleg(t, o)}
        </p>
      )}

      {/* Het cijfer waar mensen voor komen, meteen bovenaan. */}
      <div className="stat">
        <span className="label-caps">{gestopt ? t('Bijdrage bij het einde van de regeling') : t('Bijdrage vandaag')}</span>
        <Bedrag centen={o.huidigBedrag} groot />
        <span className="rij-meta">
          {o.indexConflict !== null
            ? t('het bedrag uit de regeling van {datum}; de indexatie is niet berekend', {
                datum: bijdrage.datumRegeling,
              })
            : o.huidigBedrag === bijdrage.basisbedrag
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
        {/* ⚠ MET WELKE REEKS, hier en niet alleen achter "Toon de opbouw"
            (nakijkronde ronde 58). Dit is het bedrag dat mensen overschrijven en in
            een brief zetten; een kaal getal zonder de reeks erbij is niet na te
            rekenen. En bij een regeling van vóór ronde 58 stáát er iets veranderd:
            de app rekende toen met de gezondheidsindex, wat fout was. Dat mag ze niet
            stil bijstellen — dan verandert een bedrag zonder dat iemand weet waarom. */}
        {bijdrage.geindexeerd !== false && o.indexConflict === null && (
          <span className="rij-meta" data-reeks>
            {bijdrage.indexreeks === undefined
              ? t('Gerekend met de {reeks}, de wettelijke reeks. Tot augustus 2026 gebruikte Kompal hier de gezondheidsindex; daardoor kan dit bedrag iets verschillen van vroeger. Noemt je akte uitdrukkelijk de gezondheidsindex, zet ze dan om bij "Wijzig de regeling".', {
                  reeks: t(reeksinfo(o.reeks).naamInZin),
                })
              : t('Gerekend met de {reeks}.', { reeks: t(reeksinfo(o.reeks).naamInZin) })}
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
      {/* ⚠ RONDE 66, slotronde: de zin zei "hieronder" terwijl het invulveld ín het
          dichtgeklapte blok "Wijzig de regeling" zit. De app zei dus precies wat je
          moest doen en verzweeg de enige plek waar het kan. Nu noemt ze die plek, en
          staat er een knop die hem in één tik opent. */}
      <p className={kentAlles ? 'rij-meta' : 'foutregel'} role="status" style={{ margin: 0 }}>
        {kentAlles
          ? ''
          : t('De app kent nog geen indexcijfer voor {maanden}. Ze kent cijfers tot {laatste}. Vul het ontbrekende cijfer zelf in via "Wijzig de regeling", dan is de berekening volledig.', {
              maanden: o.ontbrekendeMaanden.map((m) => maandJaarLabel(`${m}-01`)).join(', '),
              laatste: maandJaarLabel(`${laatsteIndexmaand(bijdrage.indexreeks)}-01`),
            })}
      </p>
      {!kentAlles && !toonAfspraak && (
        <div className="knoprij">
          <EersteStapKnop onClick={() => setToonAfspraak(true)}>{t('Vul het indexcijfer in')}</EersteStapKnop>
        </div>
      )}

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
        {/* Bij een reeksconflict staat de brief uit. Ze bevat een bedrag en een
            berekening, en ze is bedoeld om aan de andere ouder of aan een advocaat te
            geven. Een brief versturen met een bedrag waarvan de app zelf zegt dat ze
            het niet kan berekenen, is het ergste wat hier kan gebeuren. */}
        <button
          type="button"
          className={`knop knop-secundair knop-klein${briefGeblokkeerd ? ' knop-uit' : ''}`}
          aria-disabled={briefBezig || briefGeblokkeerd}
          aria-describedby={briefGeblokkeerd ? briefRedenId : undefined}
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

      {/* Waarom de brief uitstaat, in het document zelf: een knop die niet reageert
          zonder te zeggen waarom, is een raadsel — en `aria-disabled` alleen laat een
          schermlezer "niet-beschikbaar" zeggen zonder één woord uitleg. */}
      <p id={briefRedenId} className="rij-meta" role="status" style={{ margin: 0 }}>
        {briefGeblokkeerd
          ? t('De brief staat uit zolang de indexcijfers niet uit dezelfde reeks komen: ze zou een bedrag bevatten dat de app niet kan verantwoorden.')
          : ''}
      </p>

      {fout !== '' && (
        <p className="foutregel" role="alert">
          {fout}
        </p>
      )}
      <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />
      <p className="rij-meta" role="status" style={{ margin: 0 }}>
        {melding}
      </p>

      {toonOpbouw && <Opbouw t={t} bijdrage={bijdrage} opbouw={o} vandaagISO={vandaagISO} />}

      {toonAchterstand && (
        <Achterstand
          conflict={o.indexConflict !== null}
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
            : /* Bij een reeksconflict is de lijst óók leeg, maar niet omdat de eerste
                 verjaardag nog moet komen. Zonder deze tak beweert dit paneel dat er
                 nog geen verjaardag geweest is bij een regeling die er zestien had. */
              opbouw.indexConflict !== null
              ? t('De opbouw is niet berekend, want de indexcijfers komen niet uit dezelfde reeks. Bovenaan de kaart staat wat er moet gebeuren.')
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
        {t('De app rekent met de {reeks} en kent cijfers tot {laatste}, in basis {jaar} = 100.', {
          reeks: t(reeksinfo(opbouw.reeks).naamInZin),
          laatste: maandJaarLabel(`${opbouw.laatsteBekendeMaand}-01`),
          jaar: opbouw.basisjaarTabel,
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
  conflict,
  onBetalingOpslaan,
  onBetalingVerwijderen,
  vandaagISO,
}: {
  t: Vertaler
  bijdrage: Onderhoudsbijdrage
  betalingen: Onderhoudsbetaling[]
  stand: ReturnType<typeof berekenAchterstand>
  /** Loopt de indexatie vast op twee reeksen? Dan is dit geen bruikbaar cijfer. */
  conflict: boolean
  onBetalingOpslaan: (b: Onderhoudsbetaling) => Promise<void> | void
  onBetalingVerwijderen: (id: string) => Promise<void> | void
  vandaagISO: string
}) {
  const [datum, setDatum] = useState(vandaagISO)
  const [bedrag, setBedrag] = useState('')
  const [voorMaand, setVoorMaand] = useState('')
  const [fout, setFout] = useState('')
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ Eén vast id per betaling: een tweede poging hoort dezelfde te overschrijven.
  const nieuwIdRef = useRef(nieuwId())

  async function voegToe(e: FormEvent) {
    e.preventDefault()
    const centen = invoerNaarCenten(bedrag)
    if (!Number.isFinite(centen) || centen <= 0) {
      setFout(t('Vul een bedrag groter dan nul in.'))
      return
    }
    setFout('')
    // ⚠ RONDE 68 — dit is geld. Mislukte het wegschrijven, dan bleef je bedrag in het
    // veld staan, verscheen er geen letter, en klopte de achterstandsberekening niet
    // met wat je dacht ingevoerd te hebben. Eén vast id, zodat een tweede poging
    // dezelfde betaling overschrijft in plaats van er twee te maken.
    const gelukt = await opslag.probeer(() =>
      onBetalingOpslaan({
        id: nieuwIdRef.current,
        bijdrageId: bijdrage.id,
        datum,
        bedrag: centen,
        ...(voorMaand ? { voorMaand } : {}),
      }),
    )
    if (!gelukt) return
    nieuwIdRef.current = nieuwId()
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
      {/* Bij een reeksconflict telt elke maand aan het NIET-geïndexeerde bedrag. Het
          openstaande bedrag is dan structureel te laag, en dit is net het getal dat
          mensen overnemen. Het cijfer noemen zonder dat erbij te zeggen is erger dan
          het niet noemen. */}
      <p className={conflict ? 'foutregel' : 'rij-titel'} style={{ margin: 0 }} data-open>
        {conflict
          ? t('Wat er openstaat is niet te berekenen: elke maand zou hier aan het bedrag uit de regeling geteld worden, zonder de indexatie. Het echte bedrag ligt hoger. Los eerst de indexcijfers bovenaan op.')
          : openTekst(t, stand.open, bijdrage.richting, stand.maanden)}
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
        <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />
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
                  onClick={() => void opslag.probeer(() => onBetalingVerwijderen(b.id))}
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
  const [reeks, setReeks] = useState<Indexreeks>(reeksVan(bijdrage.indexreeks))
  const [eind, setEind] = useState(bijdrage.eindDatum ?? '')
  const [aanvang, setAanvang] = useState(
    bijdrage.aanvangsindexHandmatig ? getalTekst(bijdrage.aanvangsindexHandmatig) : '',
  )
  const [eigenMaand, setEigenMaand] = useState('')
  const [eigenCijfer, setEigenCijfer] = useState('')
  const [gekozenKinderen, setGekozenKinderen] = useState<string[]>(bijdrage.kindIds ?? [])
  const [fout, setFout] = useState('')
  const [regelingMelding, setRegelingMelding] = useState('')
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()

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
    // Wissel je van reeks terwijl er eigen cijfers bewaard staan, dan zijn die in de
    // oude reeks ingetikt. Ze meenemen zou een breuk maken met een teller uit de ene
    // korf en een noemer uit de andere (nakijkronde ronde 58). Ze gaan dus weg, en
    // het scherm zegt dat — dezelfde behandeling als bij een basisjaarwissel.
    const reeksGewisseld = reeks !== reeksVan(bijdrage.indexreeks)
    const eigenWeg = reeksGewisseld && Object.keys(eigen).length > 0
    const gelukt = await opslag.probeer(() =>
      onOpslaan({
      ...bijdrage,
      basisbedrag: centen,
      datumRegeling: datum,
      richting,
      geindexeerd: indexeren,
      indexreeks: reeks,
      ...(eigenWeg
        ? { eigenIndexcijfers: undefined, eigenIndexreeks: undefined }
        : { eigenIndexreeks: Object.keys(eigen).length > 0 ? reeks : undefined }),
      // `undefined` wist het veld — zo raak je een handmatige aanvangsindex weer kwijt.
      //
      // Er wordt hier BEWUST geen basisjaar bij gestempeld. Het cijfer komt uit een
      // akte van jaren geleden; in welke reeks het staat, weet de gebruiker niet en
      // wij dus ook niet. Een stempel zou een bewering vastleggen die niemand
      // gecontroleerd heeft — precies de fout van de euro's die als centen gelezen
      // werden. De rekenkern leidt het zelf af (zie `indexConflict`).
      ...(Number.isFinite(handmatig) && handmatig > 0
        ? { aanvangsindexHandmatig: handmatig }
        : { aanvangsindexHandmatig: undefined }),
      ...(eind ? { eindDatum: eind } : { eindDatum: undefined }),
      ...(gekozenKinderen.length > 0 ? { kindIds: gekozenKinderen } : { kindIds: undefined }),
      }),
    )
    if (!gelukt) return
    if (eigenWeg) {
      setRegelingMelding(
        t('Je eigen indexcijfers stonden in de vorige reeks en zijn verwijderd. Zet ze opnieuw met cijfers uit de {nieuw}.', {
          nieuw: t(reeksinfo(reeks).naamInZin),
        }),
      )
      return
    }
    onKlaar()
  }

  async function voegIndexToe() {
    const cijfer = getal(eigenCijfer)
    if (!eigenMaand || !Number.isFinite(cijfer) || cijfer <= 0) {
      setFout(t('Kies een maand en vul een indexcijfer groter dan nul in.'))
      return
    }

    // ⚠ STAAT DIT CIJFER WEL IN DEZELFDE MAATSTAF? (nakijkronde ronde 58)
    //
    // Statbel publiceert de consumptieprijsindex sinds januari 2026 standaard in
    // basis 2025 = 100, en dit scherm stuurt je letterlijk naar Statbel. Wie daar
    // juli 2026 opzoekt, ziet 103,60 staan in plaats van 140,17 — een kwart lager.
    // Zonder deze controle slikt de app dat, stempelt ze er haar eigen basisjaar op,
    // en rekent ze een bijdrage van € 383 om naar € 283. Met een geloofwaardig
    // ogende brief eronder.
    //
    // Tien procent is ruim: de index beweegt in een jaar zelden meer dan vijf
    // procent, en een herbasering scheelt er meteen vijfentwintig.
    const laatsteBekend = indexcijfer(reeks, laatsteIndexmaand(reeks))
    if (laatsteBekend !== undefined && Math.abs(cijfer - laatsteBekend) > laatsteBekend * 0.1) {
      setFout(
        t('Dat cijfer ligt te ver van {laatste} — het laatste dat de app voor de {reeks} kent. Staat het in een ander basisjaar? Statbel publiceert sinds 2026 standaard in basis 2025 = 100; de app rekent in basis {jaar} = 100. Neem het cijfer uit de kolom met basis {jaar}.', {
          laatste: getalTekst(laatsteBekend),
          reeks: t(reeksinfo(reeks).naamInZin),
          jaar: basisjaarVan(reeks),
        }),
      )
      return
    }

    setFout('')
    // Het basisjaar én de REEKS mee vastleggen: zonder die twee weet niemand later
    // nog in welke maatstaf dit cijfer staat, en dan komt de bijdrage er naast — na
    // een herbasering tientallen procenten, na een reekswissel een half procent met
    // een getal dat niet na te rekenen is (ronde 47 en 58).
    //
    // Staan de bestaande cijfers nog in een OUDERE basis of in een ANDERE reeks, dan
    // mag dit nieuwe cijfer er niet bijgezet worden. Anders draagt het record één
    // stempel over cijfers uit twee reeksen, verdwijnt de waarschuwing na het eerste
    // cijfer, en rekent de app verder met een mengsel. De reparatie zou zichzelf
    // ontmantelen langs de weg die ze zelf aanraadt. Dus: de oude cijfers gaan weg,
    // en het scherm zegt dat.
    const basisNu = basisjaarVan(reeks)
    const oudeBasis = (bijdrage.indexBasisjaar ?? basisNu) !== basisNu
    const oudeReeks = (bijdrage.eigenIndexreeks ?? reeks) !== reeks
    const opnieuw = oudeBasis || oudeReeks
    // ⚠ Mislukte dit in stilte, dan bleef precies het mengsel van reeksen staan
    // waarvoor de uitleg hierboven waarschuwt — én de zin die dat uitlegt bleef weg.
    if (
      !(await opslag.probeer(() =>
        onOpslaan({
          ...bijdrage,
          eigenIndexcijfers: opnieuw ? { [eigenMaand]: cijfer } : { ...eigen, [eigenMaand]: cijfer },
          indexBasisjaar: basisNu,
          eigenIndexreeks: reeks,
        }),
      ))
    ) {
      return
    }
    if (oudeBasis) {
      setRegelingMelding(
        t('Je eerdere indexcijfers stonden in basis {oud} = 100 en zijn verwijderd. Zet ze opnieuw met de cijfers uit de huidige reeks.', {
          oud: bijdrage.indexBasisjaar ?? basisNu,
        }),
      )
    } else if (oudeReeks) {
      setRegelingMelding(
        t('Je eerdere indexcijfers kwamen uit de {oud} en zijn verwijderd. Zet ze opnieuw met cijfers uit de {nieuw}.', {
          oud: t(reeksinfo(bijdrage.eigenIndexreeks).naamInZin),
          nieuw: t(reeksinfo(reeks).naamInZin),
        }),
      )
    }
    setEigenMaand('')
    setEigenCijfer('')
  }

  async function wisIndex(maand: string) {
    const rest = { ...eigen }
    delete rest[maand]
    await opslag.probeer(() =>
      onOpslaan({
        ...bijdrage,
        ...(Object.keys(rest).length > 0 ? { eigenIndexcijfers: rest } : { eigenIndexcijfers: undefined }),
      }),
    )
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

        {/* ⚠ WELKE INDEXREEKS (ronde 58). Tot die ronde rekende de app altijd met de
            gezondheidsindex, en de brief zei dat ook. Dat is de reeks voor huur en
            lonen; artikel 203quater oud BW bindt een onderhoudsbijdrage aan de
            CONSUMPTIEPRIJZEN. Het verschil is echt geld, en het stapelt jaar na jaar op.

            Waarom er dan tóch een keuze staat en niet gewoon de wet: de wet zelf zegt
            "tenzij anders overeengekomen". Een akte die de gezondheidsindex noemt, is
            bindend. De app kiest dus niet vóór jou — ze stelt de wettelijke reeks voor
            en toont welke ze gebruikt. */}
        {indexeren && (
          <div className="veldgroep">
            <label className="label-caps" htmlFor="bijdrage-indexreeks">
              {t('Welke index staat er in je akte?')}
            </label>
            <select
              id="bijdrage-indexreeks"
              value={reeks}
              onChange={(e) => setReeks(e.target.value as Indexreeks)}
              aria-describedby="bijdrage-indexreeks-uitleg"
            >
              {INDEXREEKS_INFO.map((info) => (
                <option key={info.reeks} value={info.reeks}>
                  {t(info.naam)}
                </option>
              ))}
            </select>
            <span className="rij-meta" id="bijdrage-indexreeks-uitleg">
              {t(reeksinfo(reeks).uitleg)}
            </span>
            {reeks !== reeksVan(bijdrage.indexreeks) && (
              <span className="rij-meta">
                {Object.keys(eigen).length > 0
                  ? t('Zodra je bewaart, rekent de app alle bedragen opnieuw met deze reeks. Je eigen indexcijfers stonden in de vorige reeks en worden dan verwijderd.')
                  : t('Zodra je bewaart, rekent de app alle bedragen opnieuw met deze reeks. Het bedrag kan daardoor veranderen.')}
              </span>
            )}
            {bijdrage.indexreeks === undefined && (
              <span className="rij-meta">
                {t('Tot augustus 2026 rekende Kompal hier altijd met de gezondheidsindex. Dat was fout: de wet noemt de consumptieprijzen. Staat er in jouw akte uitdrukkelijk "gezondheidsindex", zet ze dan hierboven om.')}
              </span>
            )}
          </div>
        )}

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
          {basisjaarWaarschuwing(t, reeks)}
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
            laatste: maandJaarLabel(`${laatsteIndexmaand(reeks)}-01`),
          })}
        </p>
        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Maand')}</span>
            <input type="month" value={eigenMaand} onChange={(e) => setEigenMaand(e.target.value)} />
          </label>
          <label className="veldgroep">
            {/* De naam van de gekozen reeks, niet "Gezondheidsindex": je tikt hier
                een cijfer over uit een publicatie, en dan moet je weten wélke. */}
            <span className="label-caps">{t(reeksinfo(reeks).naam)}</span>
            <input inputMode="decimal" value={eigenCijfer} onChange={(e) => setEigenCijfer(e.target.value)} placeholder="140,17" />
          </label>
        </div>
        {eigenMaand && kentIndexmaand(reeks, eigenMaand) && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('De app kent deze maand al. Vul je hier iets in, dan gaat jouw cijfer voor.')}
          </p>
        )}
        <div className="knoprij">
          <button type="button" className="knop knop-secundair knop-klein" onClick={voegIndexToe}>
            {t('Indexcijfer toevoegen')}
          </button>
        </div>
        <p className="rij-meta" role="status" style={{ margin: 0 }}>
          {regelingMelding}
        </p>
        <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />
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
