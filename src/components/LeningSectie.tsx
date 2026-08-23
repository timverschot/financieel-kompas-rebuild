import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Aflossing, DossierDocument, Kind, Lening, LeningRichting, Transactie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { aflossingenVan, boekingVoorAflossing, openstaandKapitaal, totaalAfgelost, totaalOpenstaand, voortgang, isAfbetaald, maandenTotEinde } from '../utils/lening'
import { LeningFormulier } from './LeningFormulier'
import { Kaart, Leeg, Bedrag, Balk, Stat } from '../ui/basis'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { Documentkluis } from './DossierKluis'
import type { Vertaler } from '../i18n'
import { dagKort, vandaag } from '../utils/datum'
import { Bonknop } from '../ui/Bonknop'


// Klein formulier om een aflossing toe te voegen aan één lening.
//
// 'openstaand' dient enkel om te waarschuwen: een aflossing die groter is dan wat
// er nog openstaat wordt door de rekenlaag afgekapt (het saldo gaat nooit onder
// nul), dus zonder waarschuwing zou het teveel geruisloos verdwijnen. We blokkeren
// de knop bewust NIET — een echte terugbetaling kan meer bevatten dan het zuivere
// kapitaal (rente, kosten, afronding) — maar we zeggen het, en bieden één klik om
// het bedrag gelijk te zetten aan wat er nog openstaat.
function AflossingToevoegen({
  leningId,
  richting,
  openstaand,
  transacties,
  aflossingen,
  onOpslaan,
}: {
  leningId: string
  richting: LeningRichting
  openstaand: number
  transacties: Transactie[]
  aflossingen: Aflossing[]
  onOpslaan: (a: Aflossing) => Promise<void> | void
}) {
  const { t } = useT()
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const centen = invoerNaarCenten(bedrag)
  // De id van de regel die zegt wat er nog ontbreekt (ronde 61).
  const redenId = useId()
  const geldig = Number.isFinite(centen) && centen > 0
  const teVeel = geldig && centen > openstaand

  // Staat er al een boeking van hetzelfde bedrag op dezelfde dag? Dan is dit
  // waarschijnlijk diezelfde betaling, en hoort ze niet twee keer geteld te worden.
  // We blokkeren niet — een aflossing kan van een rekening komen die niet in de app
  // staat — maar we zeggen het, en koppelen op één klik.
  const vermoedelijk = geldig ? boekingVoorAflossing(datum, centen, transacties, richting, aflossingen) : undefined

  async function verzend(e: FormEvent, koppel = false) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({
      id: nieuwId(),
      leningId,
      datum,
      bedrag: centen,
      ...(koppel && vermoedelijk ? { transactieId: vermoedelijk.id } : {}),
    })
    setBedrag('')
    setDatum(vandaag())
  }

  return (
    <form onSubmit={verzend} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="knoprij">
        <input aria-label={t('Aflossing (€)')} style={{ width: 130 }} inputMode="decimal" placeholder={t('Aflossing (€)')} value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        <input aria-label={t('Datum aflossing')} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className="knop knop-secundair knop-klein"
        >
          {t('Aflossing toevoegen')}
        </button>
      </div>
      {/* ⚠ Deze regel ontbrak hier volledig (ronde 61): de knop stond uit en er stond
          nergens waarom. Met een toetsenbord kwam je hem bovendien niet eens tegen. */}
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Vul een bedrag groter dan nul in.')}
      </p>
      {vermoedelijk && (
        <div className="knoprij" role="status" style={{ alignItems: 'baseline' }}>
          <span className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
            {t('Er staat al een boeking van {bedrag} op {datum} ({naam}). Is dat dezelfde betaling?', {
              bedrag: formatEuro(Math.abs(vermoedelijk.bedrag)),
              datum: dagKort(vermoedelijk.datum),
              naam: vermoedelijk.omschrijving,
            })}
          </span>
          <button type="button" className="knop knop-ghost knop-klein" onClick={(e) => verzend(e, true)}>
            {t('Ja, koppelen')}
          </button>
        </div>
      )}
      {teVeel && (
        <div className="knoprij" style={{ alignItems: 'baseline' }}>
          <span className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
            {t('Dit is meer dan er nog openstaat ({open}).', { open: formatEuro(openstaand) })}
          </span>
          <button type="button" className="knop knop-ghost knop-klein" onClick={() => setBedrag(centenNaarInvoer(openstaand))}>
            {t('Zet op {open}', { open: formatEuro(openstaand) })}
          </button>
        </div>
      )}
    </form>
  )
}

// De regel voor de afgesproken termijn van een krediet.
function termijnTekst(t: Vertaler, einddatum: string): string {
  const m = maandenTotEinde(einddatum, vandaag())
  if (m < 0) return t('termijn verstreken sinds {datum}', { datum: einddatum })
  if (m === 0) return t('termijn loopt deze maand af')
  return t('nog {n} maand(en) tot {datum}', { n: m, datum: einddatum })
}

// De volledige leningen/kredieten-sectie: voeg leningen toe (beide richtingen),
// zie per lening het openstaand kapitaal met voortgangsbalk, log aflossingen en
// bekijk de volledige aflossingsgeschiedenis.
export function LeningSectie({
  gezinsleden = [],
  leningen,
  aflossingen,
  transacties = [],
  onOpslaan,
  onVerwijderen,
  onAflossingOpslaan,
  onAflossingVerwijderen,
  documenten = [],
  onDocumentOpslaan,
  onDocumentVerwijderen,
}: {
  // Optioneel: doorgegeven aan het formulier, om een lening aan een gezinslid te koppelen.
  gezinsleden?: Kind[]
  leningen: Lening[]
  aflossingen: Aflossing[]
  // Nodig om te merken dat een aflossing al als boeking in de app staat.
  transacties?: Transactie[]
  onOpslaan: (l: Lening) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onAflossingOpslaan: (a: Aflossing) => Promise<void> | void
  onAflossingVerwijderen: (id: string) => Promise<void> | void
  // Documentkluis per lening (overeenkomst, betalingsbewijzen). Optioneel: zonder
  // de twee handlers verschijnt de kluis gewoon niet.
  documenten?: DossierDocument[]
  onDocumentOpslaan?: (d: DossierDocument) => Promise<void> | void
  onDocumentVerwijderen?: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerk, setBewerk] = useState<Lening | null>(null)
  const [toonGeschiedenis, setToonGeschiedenis] = useState<Record<string, boolean>>({})
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()

  async function opslaan(l: Lening) {
    // ⚠ RONDE 68 — HIER MAG DE FOUT NIET OPGEVANGEN WORDEN. Het formulier hieronder
    // vangt zelf op en houdt dan je invoer vast; ving deze tussenstap hem al weg, dan
    // zag het formulier "gelukt", maakte het zichzelf leeg, en was je tekst tóch weg —
    // mét een melding erbij. Precies de fout die deze ronde moest uitroeien.
    await onOpslaan(l)
    setBewerk(null)
  }

  // Een lening afsluiten of weer heropenen. Dit gebruikt dezelfde opslagweg als
  // het bewerken van de lening: we bewaren dezelfde lening met 'afgesloten' aan
  // of uit. Afsluiten is nodig voor geld dat nooit helemaal terugkomt of een
  // krediet dat vervroegd afgelost is — anders blijft het eeuwig openstaan.
  async function zetAfgesloten(l: Lening, afgesloten: boolean) {
    const gewijzigd: Lening = { ...l, afgesloten: true }
    if (!afgesloten) delete gewijzigd.afgesloten // heropenen: het veld verdwijnt weer
    await opslag.probeer(() => onOpslaan(gewijzigd))
  }

  // Eén keer uitgerekend: het bedrag én de vraag of er een herkomstzin onder hoort.
  const teOntvangen = totaalOpenstaand(leningen, aflossingen, 'uitgeleend')
  const teBetalen = totaalOpenstaand(leningen, aflossingen, 'geleend')

  const gesorteerd = [...leningen].sort((a, b) => {
    const aKlaar = isAfbetaald(a, aflossingen)
    const bKlaar = isAfbetaald(b, aflossingen)
    if (aKlaar !== bKlaar) return aKlaar ? 1 : -1 // openstaande eerst
    return a.naam < b.naam ? -1 : a.naam > b.naam ? 1 : 0
  })

  return (
    <Kaart
      titel={t('Leningen & kredieten')}
      bijschrift={t('Geld dat jij uitleende of zelf leende. Log terugbetalingen; de app houdt het openstaand kapitaal en de geschiedenis bij.')}
    >
      {leningen.length === 0 && <Leeg>{t('Nog geen leningen. Voeg er hieronder een toe.')}</Leeg>}
      <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />

      {/* Wat er in totaal nog openstaat; afgesloten leningen tellen niet meer mee.
          Bij één enkele lening zou dit gewoon de rij eronder herhalen, dus tonen
          we het pas vanaf twee. */}
      {leningen.length > 1 && (
        <div className="stat-rij">
          {/* RONDE 69. `openstaandKapitaal` rekent hoofdsom − afgelost. De rentevoet
              staat in het schema uitdrukkelijk als informatief en zit dus in geen van
              beide bedragen. Ditzelfde cijfer voedt het netto vermogen, waar de
              vermogensregel het intussen ook zegt. */}
          {/* Zoals bij de tegels op "Je situatie": de zin hangt aan het bedrag. Heb je
              twee leningen die allebei uitgeleend zijn, dan staat er "Nog te betalen
              € 0,00" — daar hoort geen alinea over hoofdsom en interest onder. */}
          <Stat
            label={t('Nog te ontvangen')}
            bron={
              teOntvangen > 0
                ? t('Alleen het openstaande kapitaal: hoofdsom min wat er terugbetaald is. Interest zit er niet in, en een afgesloten lening telt niet meer mee.')
                : undefined
            }
          >
            {formatEuro(teOntvangen)}
          </Stat>
          <Stat
            label={t('Nog te betalen')}
            bron={
              teBetalen > 0
                ? t('Alleen het openstaande kapitaal: hoofdsom min wat je al afbetaalde. De interest die je nog betaalt zit er niet in, en een afgesloten lening telt niet meer mee.')
                : undefined
            }
          >
            {formatEuro(teBetalen)}
          </Stat>
        </div>
      )}

      {gesorteerd.length > 0 && (
        <ul className="lijst">
          {gesorteerd.map((l) => {
            const eigen = aflossingenVan(l.id, aflossingen)
            const open = openstaandKapitaal(l, aflossingen)
            const afgelost = totaalAfgelost(l.id, aflossingen)
            const pct = Math.round(voortgang(l, aflossingen) * 100)
            const klaar = isAfbetaald(l, aflossingen)
            const richtingLabel = l.richting === 'uitgeleend' ? t('uitgeleend') : t('geleend')
            const openLabel = l.richting === 'uitgeleend' ? t('nog te ontvangen') : t('nog te betalen')
            const balkKleur = l.richting === 'uitgeleend' ? 'var(--positive)' : 'var(--warn)'
            return (
              <li key={l.id} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, opacity: klaar ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="rij-midden">
                    <span className="rij-titel">{l.naam}</span>
                    {l.tegenpartij && <span className="rij-meta">{l.tegenpartij}</span>}
                  </div>
                  <span className="rij-acties">
                    <span className={l.richting === 'uitgeleend' ? 'badge badge-ok' : 'badge badge-open'}>{richtingLabel}</span>
                    {l.afgesloten && <span className="badge badge-neutraal">{t('afgesloten')}</span>}
                    <button className="knop knop-kaal" aria-label={t('Bewerk lening {naam}', { naam: l.naam })} onClick={() => setBewerk(l)}>
                      ✎
                    </button>
                    <button
                      type="button"
                      className="knop knop-ghost knop-klein"
                      aria-label={l.afgesloten ? t('Heropen lening {naam}', { naam: l.naam }) : t('Sluit lening {naam} af', { naam: l.naam })}
                      onClick={() => zetAfgesloten(l, !l.afgesloten)}
                    >
                      {l.afgesloten ? t('heropen') : t('sluit af')}
                    </button>
                    <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder lening {naam}', { naam: l.naam })} onClick={() => void opslag.probeer(() => onVerwijderen(l.id))}>
                      ×
                    </button>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                  <Bedrag centen={open} />
                  <span className="rij-meta">{openLabel}</span>
                  {open === 0 && <span className="rij-meta" style={{ color: 'var(--positive)' }}> · {t('afbetaald')}</span>}
                  {l.afgesloten && open > 0 && <span className="rij-meta"> · {t('afgesloten, telt niet meer mee')}</span>}
                </div>

                <Balk label={l.naam} fractie={pct / 100} kleur={balkKleur} nu={pct} max={100} />

                <span className="rij-meta">
                  {t('{afgelost} van {hoofdsom} afgelost ({pct}%)', { afgelost: formatEuro(afgelost), hoofdsom: formatEuro(l.hoofdsom), pct })}
                </span>

                {l.richting === 'geleend' && (l.rentevoet !== undefined || l.maandbedrag !== undefined || l.einddatum) && (
                  <span className="rij-meta">
                    {l.rentevoet !== undefined && <span>{t('rente {r}%', { r: l.rentevoet })} </span>}
                    {l.maandbedrag !== undefined && <span>· {t('{bedrag}/maand', { bedrag: formatEuro(l.maandbedrag) })} </span>}
                    {l.einddatum && <span>· {termijnTekst(t, l.einddatum)}</span>}
                  </span>
                )}

                {l.bonnetje && (
                  <div>
                    <Bonknop bestand={l.bonnetje} naam={l.tegenpartij} label={t('contract/bewijs')} />
                  </div>
                )}

                {eigen.length > 0 && (
                  <div>
                    <button type="button" className="knop knop-ghost knop-klein" onClick={() => setToonGeschiedenis((h) => ({ ...h, [l.id]: !h[l.id] }))}>
                      {toonGeschiedenis[l.id] ? t('Geschiedenis verbergen') : t('Geschiedenis tonen ({n})', { n: eigen.length })}
                    </button>
                  </div>
                )}
                {toonGeschiedenis[l.id] && (
                  <ul className="lijst">
                    {[...eigen].reverse().map((a) => (
                      <li key={a.id} className="rij">
                        <span className="rij-midden rij-meta">
                          {dagKort(a.datum)}
                          {a.omschrijving ? ` · ${a.omschrijving}` : ''}
                          {/* Zichtbaar maken dat deze aflossing aan een boeking hangt: anders
                              schrijf je de koppeling weg en zie je er nooit meer iets van. */}
                          {a.transactieId && (
                            <>
                              {' '}
                              <span className="badge badge-info badge-mini" title={t('Gekoppeld aan een boeking')}>
                                {t('gekoppeld')}
                              </span>
                            </>
                          )}
                        </span>
                        <span className="rij-acties">
                          <Bedrag centen={a.bedrag} />
                          <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder aflossing {datum}', { datum: a.datum })} onClick={() => void opslag.probeer(() => onAflossingVerwijderen(a.id))}>
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {!klaar && (
                  <AflossingToevoegen
                    leningId={l.id}
                    richting={l.richting}
                    openstaand={open}
                    transacties={transacties}
                    aflossingen={aflossingen}
                    onOpslaan={onAflossingOpslaan}
                  />
                )}

                {/* De papieren bij deze lening: de overeenkomst en de bewijzen van
                    betaling. Ingeklapt, zodat een lange lijst leesbaar blijft. */}
                {onDocumentOpslaan && onDocumentVerwijderen && (
                  <Documentkluis
                    inklapbaar
                    eigenaar={{ soort: 'lening', id: l.id }}
                    documenten={documenten}
                    onOpslaan={onDocumentOpslaan}
                    onVerwijderen={onDocumentVerwijderen}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="label-caps" style={{ margin: 0 }}>
        {bewerk ? t('Lening bewerken') : t('Nieuwe lening')}
      </h3>
      <LeningFormulier gezinsleden={gezinsleden} onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </Kaart>
  )
}
