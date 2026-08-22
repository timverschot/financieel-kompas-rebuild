import { useMemo, useState } from 'react'
import type { DossierDocument, Onderhoudsbetaling, Onderhoudsbijdrage, Transactie } from '../data/schema'
import { beschikbareJaren, fiscaalJaaroverzicht, type FiscaleRegel } from '../utils/fiscaal'
import { exportFoutmelding } from '../utils/appVersie'
import type { FiscalePost } from '../data/fiscalePosten'
import { fiscaalCsvBestand, fiscaalCsvBestandsnaam } from '../utils/fiscaalCsv'
import { exporteerFiscaalPDF } from '../utils/fiscaalPdf'
import { downloadTekst } from '../utils/download'
import { formatEuro } from '../utils/format'
import { dagKort, vandaag } from '../utils/datum'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { Bedrag, EersteStapKnop, Kaart, Leeg, PaginaKop, Stat } from '../ui/basis'
import { useT, type Vertaler } from '../i18n'

// Het fiscale jaaroverzicht (ronde 50).
//
// WAT DIT SCHERM BELOOFT, en dat is bewust beperkt: "dit gaf je dat jaar uit onder
// een post die in je aangifte staat, hier zijn de boekingen, en dit is het vak en de
// code". Het zegt NIET hoeveel je terugkrijgt. Dat hangt af van je hele aangifte, en
// een geschat voordeel zou er geloofwaardig uitzien en toch niet kloppen.
//
// DE BELANGRIJKSTE ZIN OP DIT SCHERM staat per post: bij de meeste posten is het
// bedrag op je rekening niet het bedrag dat in de aangifte hoort. Kinderopvang heeft
// een maximum per opvangdag, een gift telt alleen bij een erkende instelling, en een
// woonlening is kapitaal en interest in één domiciliëring. Zonder die zin zou dit
// scherm cijfers tonen die mensen overtypen — en dat is precies wat het niet mag
// worden.
//
// ALLE WAARSCHUWINGEN WEGEN EVEN ZWAAR (ronde 50, na review). Eerder kreeg alleen een
// attest-post een opvallende regel, en stond de zwaarste waarschuwing van allemaal —
// die over fiscaal co-ouderschap, waar je de aftrek helemaal kwijt kan zijn — in de
// lichtste opmaak van de kaart, omdat de opmaak keek naar `afleidbaarheid` in plaats
// van naar belang. Rood blijft nu voorbehouden aan een échte fout (een mislukte
// download); een waarschuwing krijgt de statusopmaak.
//
// DESIGN.md: hoogstens één gevulde knop per scherm. Dat is hier de PDF — het blad dat
// je doorgeeft. De CSV staat ernaast als tweede knop en niet als tweede gevulde knop.

export function FiscaalSectie({
  transacties,
  onderhoudsbijdragen = [],
  onderhoudsbetalingen = [],
  documenten = [],
  onBewerkTransactie,
  onNaarBoekingen,
  vandaagISO = vandaag(),
}: {
  transacties: Transactie[]
  onderhoudsbijdragen?: Onderhoudsbijdrage[]
  onderhoudsbetalingen?: Onderhoudsbetaling[]
  documenten?: DossierDocument[]
  /** Eén boeking openen om ze na te kijken of te corrigeren. */
  onBewerkTransactie?: (tx: Transactie) => void
  /**
   * De eerste stap wanneer er in de hele app nog niets geboekt is (ronde 66,
   * slotronde). Alleen dán: heb je wél boekingen maar staan ze onder een andere
   * categorie, dan is "voeg er een toe" het verkeerde antwoord — dan hoort de zin
   * hieronder je naar de categorieën te sturen, en dat doet ze.
   */
  onNaarBoekingen?: () => void
  /** Alleen om te kunnen testen. */
  vandaagISO?: string
}) {
  const { t } = useT()
  const jaren = useMemo(
    () => beschikbareJaren(transacties, vandaagISO, onderhoudsbetalingen),
    [transacties, vandaagISO, onderhoudsbetalingen],
  )
  const [jaar, setJaar] = useState(jaren[0])
  const [melding, setMelding] = useState('')
  const [fout, setFout] = useState('')
  // Loopt er een PDF? Die wordt in stukjes opgebouwd en kan een tel duren; zonder deze
  // toestand tik je drie keer omdat er niets lijkt te gebeuren, en krijg je drie
  // bestanden. Dezelfde oplossing als in `RapportKaart`.
  const [bezig, setBezig] = useState(false)

  const overzicht = useMemo(
    () =>
      fiscaalJaaroverzicht({
        inkomstenjaar: jaar,
        transacties,
        onderhoudsbijdragen,
        onderhoudsbetalingen,
        documenten,
      }),
    [jaar, transacties, onderhoudsbijdragen, onderhoudsbetalingen, documenten],
  )

  const metIets = overzicht.regels.filter((r) => r.bedrag > 0)
  const leeg = overzicht.regels.filter((r) => r.bedrag === 0)
  const loopendJaar = overzicht.inkomstenjaar === Number(vandaagISO.slice(0, 4))

  function exporteer() {
    setFout('')
    setMelding('')
    try {
      downloadTekst(fiscaalCsvBestandsnaam(overzicht), fiscaalCsvBestand(t, overzicht))
      setMelding(t('Het bestand is gedownload.'))
    } catch (e) {
      setFout(exportFoutmelding(t, e, t('Het bestand kon niet gemaakt worden. Probeer het opnieuw.')))
    }
  }

  async function exporteerPdf() {
    // De knop blijft met `aria-disabled` bereikbaar voor een toetsenbord, dus ze kan
    // echt nog aangeklikt worden. Deze regel houdt een tweede tik tegen.
    if (bezig) return
    setBezig(true)
    setFout('')
    setMelding('')
    try {
      await exporteerFiscaalPDF(t, overzicht)
      setMelding(t('Het document is gedownload.'))
    } catch (e) {
      setFout(exportFoutmelding(t, e, t('Het document kon niet gemaakt worden. Probeer het opnieuw.')))
    } finally {
      setBezig(false)
    }
  }

  return (
    <>
      <PaginaKop
        titel={t('Fiscaal jaaroverzicht')}
        bijschrift={t('Wat je dat jaar uitgaf onder een post die in je belastingaangifte staat, met het vak en de code erbij.')}
        actie={
          jaren.length > 1 ? (
            <label className="veldgroep" style={{ maxWidth: 160 }}>
              <span className="label-caps">{t('Inkomstenjaar')}</span>
              <select value={jaar} onChange={(e) => setJaar(Number(e.target.value))}>
                {jaren.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      />

      <Kaart data-fiscaalkop>
        <p className="statusregel" style={{ margin: 0 }}>
          {t('Wat je in {jaar} betaalde, geef je aan in de aangifte van aanslagjaar {aj}.', {
            jaar: overzicht.inkomstenjaar,
            aj: overzicht.aanslagjaar,
          })}
        </p>
        {/* Het scherm opent op het lopende jaar, want daar boek je vandaag in. Dan
            hoort het er wél bij te zeggen dat de cijfers nog niet af zijn: wie in
            augustus zijn aangifte invult, heeft het jaar ervóór nodig. */}
        {loopendJaar && (
          <p className="rij-meta" style={{ margin: 0 }} data-loopendjaar>
            {jaren.length > 1
              ? t('{jaar} loopt nog: deze bedragen groeien nog aan tot 31 december. Vul je nu je aangifte in, kies dan het jaar ervóór.', {
                  jaar: overzicht.inkomstenjaar,
                })
              : t('{jaar} loopt nog: deze bedragen groeien nog aan tot 31 december.', {
                  jaar: overzicht.inkomstenjaar,
                })}
          </p>
        )}
        {/* De grens van dit scherm, in het scherm zelf. Dezelfde lijn als bij de
            bewijsmap en de indexatiebrief: feiten en bedragen, geen advies. */}
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('De app verzamelt en telt op. Ze rekent niet uit wat je terugkrijgt: dat hangt af van je volledige aangifte. Dit is geen belastingadvies.')}
        </p>
        {/* Welk land en welk gewest, want dat staat nergens anders. De gewestelijke
            posten verschillen écht: dienstencheques bestaan in Brussel en Wallonië
            nog wel. */}
        <p className="rij-meta" style={{ margin: 0 }} data-bereik>
          {t('De lijst is die van België. Waar een post gewestelijk is, staat ze zoals ze in Vlaanderen geldt; in Brussel en Wallonië gelden andere regels.')}
        </p>
      </Kaart>

      {!overzicht.gekend ? (
        <Kaart>
          <p className="foutregel" role="alert" data-onbekendjaar>
            {t('Voor aanslagjaar {aj} heeft de app geen lijst. In aanslagjaar 2026 verdween een reeks belastingverminderingen in één keer, dus een lijst uit die tijd zou vandaag posten tonen die niet meer bestaan — en een te korte lijst leest als "er valt niets af te trekken".', {
              aj: overzicht.aanslagjaar,
            })}
          </p>
        </Kaart>
      ) : (
        <>
          {metIets.length === 0 ? (
            <Kaart>
              {transacties.length === 0 ? (
                <Leeg
                  actie={
                    onNaarBoekingen ? (
                      <EersteStapKnop onClick={onNaarBoekingen}>{t('Boeking toevoegen')}</EersteStapKnop>
                    ) : undefined
                  }
                >
                  {t('Er staat nog geen enkele boeking in de app, dus valt er voor {jaar} niets samen te tellen. Hieronder zie je alvast waar dit scherm straks naar kijkt.', {
                    jaar: overzicht.inkomstenjaar,
                  })}
                </Leeg>
              ) : (
                <Leeg>
                  {t('De app vond in {jaar} geen boekingen onder een fiscale post. Boek je die uitgaven onder een andere categorie, dan vindt ze hier niets — hieronder staat per post waar ze kijkt.', {
                    jaar: overzicht.inkomstenjaar,
                  })}
                </Leeg>
              )}
            </Kaart>
          ) : (
            metIets.map((regel) => (
              <PostKaart key={regel.post.id} t={t} regel={regel} onBewerkTransactie={onBewerkTransactie} />
            ))
          )}

          {overzicht.vervallen.length > 0 && (
            <Kaart titel={t('Dit bestaat niet meer')} data-vervallen>
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('Je hebt hier nog boekingen onder staan, maar voor aanslagjaar {aj} valt er niets meer in te vullen.', {
                  aj: overzicht.aanslagjaar,
                })}
              </p>
              <ul className="lijst">
                {overzicht.vervallen.map((regel) => (
                  <li key={regel.post.id} className="rij">
                    <span className="rij-midden">
                      <span className="rij-titel">{t(regel.post.naam)}</span>
                      <span className="rij-meta">{t(regel.post.waarschuwing ?? '')}</span>
                    </span>
                    <Bedrag centen={regel.bedrag} />
                  </li>
                ))}
              </ul>
            </Kaart>
          )}

          {leeg.length > 0 && (
            <Kaart titel={t('Waar de app nog gekeken heeft')} data-leegeposten>
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('Onder deze posten vond ze in {jaar} niets. Staat er iets dat je wél betaalde, dan is het waarschijnlijk onder een andere categorie geboekt.', {
                  jaar: overzicht.inkomstenjaar,
                })}
              </p>
              <ul className="lijst">
                {leeg.map((regel) => (
                  <li key={regel.post.id} className="rij">
                    <span className="rij-midden">
                      <span className="rij-titel">{t(regel.post.naam)}</span>
                      <span className="rij-meta">{codeTekst(t, regel)}</span>
                      {/* Zonder deze regel belooft de kop hierboven iets wat het
                          blok niet waarmaakt: je zag wél dát de app keek, maar niet
                          waar. En juist dat is wat je moet weten om je boeking te
                          verplaatsen. */}
                      <span className="rij-meta" data-kijktin>
                        {kijktInTekst(t, regel.post)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {/* Twee soorten geld die dit scherm per definitie niet ziet. Wie zijn
                  pensioensparen als overboeking naar zijn eigen beleggingsrekening
                  boekt, zoekt zich anders blind. */}
              <p className="rij-meta" style={{ margin: 0 }} data-onzichtbaar>
                {t('Twee dingen ziet dit scherm nooit: een overboeking tussen je eigen rekeningen (dat is geen uitgave) en een aflossing die je los van een categorie boekt. Staat je storting of je lening zo in de app, boek ze dan als uitgave met de juiste categorie.')}
              </p>
            </Kaart>
          )}

          {/* Twee bestanden, en ze zijn niet twee vormen van hetzelfde. De PDF is om te
              LEZEN — per post het bedrag mét de reden waarom het niet zomaar in de
              aangifte mag. De CSV is om mee te REKENEN: één rij per boeking,
              filterbaar en optelbaar. Vandaar dat de PDF de gevulde knop is: dat is
              het blad dat je doorgeeft.

              ⚠ RONDE 66, slotronde: alleen wanneer er ook íets in staat. Deze kaart
              stond er onvoorwaardelijk, dus op een lege app was de opvallendste knop
              van het scherm — de enige gevulde — "maak een leeg blad voor je
              boekhouder". */}
          {/* ⚠ Óók `vervallen`: dat zijn posten die niet meer bestaan maar waar in dit
              jaar wél nog op geboekt is. Het scherm toont ze onder "Dit bestaat niet
              meer", en de PDF én de CSV nemen ze mee — dus alleen op `metIets` kijken
              zou de enige weg naar die bestanden afsluiten terwijl er wel degelijk
              iets in staat. */}
          {(metIets.length > 0 || overzicht.vervallen.length > 0) && (
          <Kaart
            titel={t('Meegeven aan je boekhouder')}
            bijschrift={t('De PDF leest als een blad: elk bedrag met zijn voorbehoud erbij. De CSV is om zelf mee te rekenen — één rij per boeking.')}
          >
            <div className="knoprij">
              <button
                type="button"
                className="knop knop-primair"
                aria-disabled={bezig}
                aria-label={bezig ? t('PDF voor je boekhouder — bezig…') : t('PDF voor je boekhouder')}
                onClick={exporteerPdf}
              >
                {bezig ? t('Bezig…') : t('PDF voor je boekhouder')}
              </button>
              <button type="button" className="knop knop-secundair" onClick={exporteer}>
                {t('Exporteer als CSV')}
              </button>
            </div>
            <p className="rij-meta" role="status" style={{ margin: 0 }}>
              {melding}
            </p>
            {fout !== '' && (
              <p className="foutregel" role="alert">
                {fout}
              </p>
            )}
          </Kaart>
          )}
        </>
      )}
    </>
  )
}

/** "Vak X · code 1384" — het stukje dat je overtypt in Tax-on-web. */
function codeTekst(t: Vertaler, regel: FiscaleRegel): string {
  const vak = t(regel.post.vak)
  if (regel.post.codes.length === 0) {
    return t('{vak} — de code hangt af van je situatie en staat op je attest', { vak })
  }
  return t('{vak} · code {codes}', { vak, codes: regel.post.codes.join(' / ') })
}

/**
 * Waar de app voor deze post kijkt, met de namen van de categorieën.
 *
 * De id's zelf ('i-x-jeugdkamp') zeggen een gebruiker niets; de namen wel. Dit is
 * dezelfde regel als bij de filterchips: toon een NAAM, nooit een id.
 */
function kijktInTekst(t: Vertaler, post: FiscalePost): string {
  if (post.uitOnderhoudsbetalingen) {
    return t('Kijkt in: je betalingen op een onderhoudsbijdrage in Dossiers.')
  }
  const namen = post.categorieIds
    .map((id) => labelVanCategorie(id, []))
    .filter((naam): naam is string => naam !== undefined && naam !== 'Onbekend')
  if (namen.length === 0) return ''
  return t('Kijkt in: {categorieen}.', { categorieen: namen.join(', ') })
}

function PostKaart({
  t,
  regel,
  onBewerkTransactie,
}: {
  t: Vertaler
  regel: FiscaleRegel
  onBewerkTransactie?: (tx: Transactie) => void
}) {
  const [open, setOpen] = useState(false)
  const post = regel.post

  return (
    <Kaart titel={t(post.naam)} bijschrift={codeTekst(t, regel)} data-post={post.id}>
      {/* `Stat` en niet een eigen `<div className="stat">` met een los cijfer erin:
          dan valt de waarde buiten `.stat-waarde` en wijkt de regelafstand af van
          elk ander kengetal in de app. */}
      <Stat label={t('Betaald in dit jaar')}>
        <Bedrag centen={regel.bedrag} groot />
      </Stat>
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('{n} boeking(en)', { n: regel.boekingen.length })}
        {regel.metBon > 0 ? ` · ${t('{n} met bon', { n: regel.metBon })}` : ''}
      </p>

      {/* Het aftrekbare deel staat er ALLEEN waar de wet een vast percentage
          oplegt. Overal elders zou dat een schatting zijn van iets wat de app niet
          kan weten.
          Twee dingen die deze zin niet meer beweert (ronde 50, na review):
          1. dat je het ook effectief mág aftrekken — bij fiscaal co-ouderschap kan
             je de aftrek helemaal kwijt zijn, en dat staat in de waarschuwing
             hieronder;
          2. dat er nog verlagingen aankomen — de wet legt vandaag tot 50 % vast en
             niet verder, dus vanaf dat niveau is "wordt verder afgebouwd" onwaar. */}
      {regel.aftrekbaar !== undefined && (
        <p className="statusregel" style={{ margin: 0 }} data-aftrekbaar>
          {regel.bouwtVerderAf
            ? t('{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde en daalt de komende jaren nog. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.', {
                pct: regel.percentage ?? 0,
                bedrag: formatEuro(regel.aftrekbaar),
              })
            : t('{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.', {
                pct: regel.percentage ?? 0,
                bedrag: formatEuro(regel.aftrekbaar),
              })}
        </p>
      )}

      {/* De reden waarom dit bedrag niet zomaar in de aangifte mag. Dit is de
          belangrijkste regel van de kaart, dus ze staat vóór de boekingen — en ze
          krijgt hetzelfde gewicht ongeacht wélke reden het is. */}
      {post.waarschuwing && (
        <p
          className="statusregel"
          style={{ margin: 0 }}
          data-waarschuwing
          {...(post.afleidbaarheid === 'uit-attest' ? { 'data-attest': true } : {})}
        >
          {t(post.waarschuwing)}
        </p>
      )}

      <p className="rij-meta" style={{ margin: 0 }}>
        {t(post.voorwaarde)}
      </p>

      {kijktInTekst(t, post) !== '' && (
        <p className="rij-meta" style={{ margin: 0 }} data-kijktin>
          {kijktInTekst(t, post)}
        </p>
      )}

      {/* De bron. Dit scherm zegt over zichzelf dat het niet adviseert; dan hoort het
          ook te tonen wáár de regel vandaan komt, zodat je ze zelf kan nalezen in
          plaats van de app te moeten geloven. */}
      <p className="rij-meta" style={{ margin: 0 }}>
        <a className="bronlink" href={post.bron} target="_blank" rel="noreferrer">
          {t('Lees de voorwaarden bij de bron')}
        </a>
      </p>

      <div className="knoprij">
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-expanded={open}
          onClick={() => setOpen((aan) => !aan)}
        >
          {open ? t('Verberg de boekingen') : t('Toon de {n} boeking(en)', { n: regel.boekingen.length })}
        </button>
      </div>

      {open && (
        <ul className="lijst">
          {regel.boekingen.map((b) => {
            const inhoud = (
              <>
                <span className="rij-midden">
                  <span className="rij-titel">{b.omschrijving || t('Betaling')}</span>
                  <span className="rij-meta">
                    {dagKort(b.datum)}
                    {b.bon === true ? ` · ${t('bon')}` : ''}
                  </span>
                </span>
                <Bedrag centen={b.bedrag} />
              </>
            )
            return (
              <li key={b.id} className="rij">
                {b.transactie && onBewerkTransactie ? (
                  <button
                    type="button"
                    className="rij-knop"
                    aria-label={t('{oms} {bedrag} op {datum} — open deze boeking', {
                      oms: b.omschrijving,
                      bedrag: formatEuro(b.bedrag),
                      datum: b.datum,
                    })}
                    onClick={() => onBewerkTransactie(b.transactie as Transactie)}
                  >
                    {inhoud}
                  </button>
                ) : (
                  inhoud
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Kaart>
  )
}
