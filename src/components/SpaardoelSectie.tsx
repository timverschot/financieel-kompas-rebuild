import { useState } from 'react'
import type { Kind, Overboeking, Rekening, Spaardoel, Transactie, Waardering } from '../data/schema'
import { SpaardoelFormulier } from './SpaardoelFormulier'
import { spaardoelPlan, spaardoelTempo, TEMPO_VENSTER_MAANDEN } from '../utils/spaardoel'
import { spaardoelVoortgang, type SpaardoelPlan } from '../utils/spaardoel'
import { maandJaarLabel, vandaag } from '../utils/datum'
import { naamVanPersoon } from '../utils/persoon'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { Balk, Kaart, Leeg, PaginaKop } from '../ui/basis'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { zachteAchtergrond } from './TransactieLijst'

// Eén regel per doel die zegt of je het haalt: wat er per maand bij moet, wat je
// effectief doet, en wanneer je aan dat tempo klaar bent. Zwijgt volledig zolang
// er niets zinnigs te zeggen is (geen doeldatum, geen streefbedrag, geen tempo) —
// een lege regel met streepjes is erger dan geen regel.
function PlanRegel({ doel, plan }: { doel: Spaardoel; plan: SpaardoelPlan }) {
  const { t } = useT()

  if (plan.alBereikt) {
    return (
      <div>
        <span className="badge badge-ok">{t('Doel gehaald')}</span>
      </div>
    )
  }

  if (plan.datumVerstreken) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-laat">{t('Datum voorbij')}</span>
        <span className="rij-meta">{t('De doeldatum is verstreken. Zet een nieuwe datum om weer een tempo te kunnen berekenen.')}</span>
      </div>
    )
  }

  const stukken: string[] = []
  if (plan.benodigdPerMaand !== null) {
    stukken.push(
      t('{bedrag} per maand nodig ({n} mnd te gaan)', {
        bedrag: formatEuro(plan.benodigdPerMaand),
        n: plan.maandenTotDoeldatum ?? 0,
      }),
    )
  }
  if (plan.tempoPerMaand !== null) {
    stukken.push(
      plan.tempoBron === 'streefbedrag'
        ? t('jouw streefbedrag: {bedrag}', { bedrag: formatEuro(plan.tempoPerMaand) })
        : t('je tempo: {bedrag} per maand (gemiddeld over {n} maanden)', {
            bedrag: formatEuro(plan.tempoPerMaand),
            n: TEMPO_VENSTER_MAANDEN,
          }),
    )
  }
  if (plan.verwachteDatum) {
    // Bewust maand + jaar: het is een schatting, geen afspraak op de dag.
    stukken.push(t('zo klaar rond {datum}', { datum: maandJaarLabel(plan.verwachteDatum) }))
  }

  if (stukken.length === 0) {
    // Niets te zeggen: geen doeldatum, geen streefbedrag, geen meetbaar tempo.
    // Dan is het nuttigste wat we kunnen doen, uitleggen wat eraan ontbreekt.
    return (
      <span className="rij-meta">
        {doel.gekoppeldeRekeningId
          ? t('Zet een doeldatum of een maandbedrag om te zien of je op schema zit.')
          : t('Koppel een rekening of zet een doeldatum om te zien of je op schema zit.')}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {plan.opSchema === true && <span className="badge badge-ok">{t('Op schema')}</span>}
      {plan.opSchema === false && <span className="badge badge-laat">{t('Achter op schema')}</span>}
      <span className="rij-meta">{stukken.join(' · ')}</span>
    </div>
  )
}

// De volledige Spaardoelen-sectie: overzicht met voortgangsbalken, snel het
// huidige bedrag bijwerken (bij manueel bijgehouden doelen), en een formulier om
// een doel toe te voegen of te bewerken.
export function SpaardoelSectie({
  spaardoelen,
  rekeningen,
  transacties,
  overboekingen = [],
  waarderingen,
  gezinsleden = [],
  onOpslaan,
  onVerwijderen,
}: {
  spaardoelen: Spaardoel[]
  rekeningen: Rekening[]
  transacties: Transactie[]
  // Optioneel: enkel nodig om te tonen (en te kiezen) voor wie een doel is.
  gezinsleden?: Kind[]
  // Overboekingen tellen mee in het saldo van een gekoppelde rekening: geld dat je
  // naar je spaarrekening boekt, hoort in je spaardoel te verschijnen.
  overboekingen?: Overboeking[]
  // Een waardering zet het saldo van een gekoppelde rekening op een vaste stand;
  // zonder haar zou een belegging in je spaardoel op een verouderd bedrag blijven.
  waarderingen: Waardering[]
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // Eén keer per render dezelfde dag gebruiken, zodat alle doelen met exact
  // dezelfde 'vandaag' rekenen.
  const nu = vandaag()
  const [bewerk, setBewerk] = useState<Spaardoel | null>(null)
  // Welk doel er rechts (op een telefoon: eronder) opengeklapt staat. Zolang er
  // niets gekozen is, staat rechts gewoon het formulier voor een nieuw doel.
  const [gekozenId, setGekozenId] = useState<string | null>(null)
  const [bedragInvoer, setBedragInvoer] = useState<Record<string, string>>({})

  async function opslaan(d: Spaardoel) {
    // ⚠ RONDE 68 — HIER MAG DE FOUT NIET OPGEVANGEN WORDEN. Het formulier hieronder
    // vangt zelf op en houdt dan je invoer vast; ving deze tussenstap hem al weg, dan
    // zag het formulier "gelukt", maakte het zichzelf leeg, en was je tekst tóch weg —
    // mét een melding erbij. Precies de fout die deze ronde moest uitroeien.
    await onOpslaan(d)
    // Na het opslaan staat rechts weer het formulier voor een NIEUW doel, dus
    // mag er in de lijst ook niets meer oplichten — anders lijkt de markering te
    // wijzen naar iets wat rechts niet staat.
    setBewerk(null)
    setGekozenId(null)
  }

  async function verwijder(id: string) {
    // ⚠ RONDE 68 — het rechterpaneel klapte dicht en het doel bleef staan. Pas
    // opruimen ná een geslaagde verwijdering.
    if (!(await opslag.probeer(() => onVerwijderen(id)))) return
    if (gekozenId === id) setGekozenId(null)
    if (bewerk?.id === id) setBewerk(null)
  }

  async function werkBedragBij(doel: Spaardoel) {
    const tekst = bedragInvoer[doel.id]
    if (tekst === undefined) return
    const centen = invoerNaarCenten(tekst)
    if (!Number.isFinite(centen)) return
    // ⚠ RONDE 68 — mislukte dit, dan bleef de balk op het oude bedrag staan terwijl
    // je nieuwe getal in het veld stond. Niets zei welke van de twee klopte.
    if (!(await opslag.probeer(() => onOpslaan({ ...doel, huidigBedrag: centen })))) return
    setBedragInvoer((m) => {
      const n = { ...m }
      delete n[doel.id]
      return n
    })
  }

  return (
    <div className="stapel">
      <PaginaKop titel={t('Spaardoelen')} bijschrift={t('Langetermijndoelen — buffers, grote aankopen, schuldenvrij.')} />

      <div className="raster-lijst-formulier">
      <div className="kolom-lijst stapel">
      <Kaart>
        {/* Ronde 66: de zin zei niet WAAR je dat doet; het formulier staat op een breed
            scherm ernaast en op een telefoon eronder. */}
        {spaardoelen.length === 0 && (
          <Leeg>{t('Nog geen doelen. Met het formulier op deze pagina zet je je eerste doel — een buffer, een grote aankoop, of schuldenvrij zijn.')}</Leeg>
        )}

        <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />

        {spaardoelen.length > 0 && (
          <ul className="lijst">
            {spaardoelen.map((d) => {
              const v = spaardoelVoortgang(d, rekeningen, transacties, overboekingen, waarderingen)
              // RONDE 69 — WAT "AL GESPAARD" HIER ÉCHT IS. Hangt er een rekening aan
              // het doel, dan neemt `spaardoelVoortgang` het VOLLEDIGE saldo van die
              // rekening over. Dat is bruikbaar zolang die rekening één doel dient,
              // maar wie twee doelen aan dezelfde spaarrekening hangt, ziet hetzelfde
              // geld twee keer als voortgang staan — en dan lijken allebei de doelen
              // bijna gehaald terwijl er maar één keer geld is. Het cijfer zwijgt
              // erover, dus zegt het scherm het nu zelf.
              const medeDoelen = d.gekoppeldeRekeningId
                ? spaardoelen.filter((a) => a.id !== d.id && a.gekoppeldeRekeningId === d.gekoppeldeRekeningId).length
                : 0
              const rekeningNaam = d.gekoppeldeRekeningId
                ? rekeningen.find((r) => r.id === d.gekoppeldeRekeningId)?.naam
                : undefined
              const tempo = spaardoelTempo(d, rekeningen, transacties, overboekingen, waarderingen, nu)
              const plan = spaardoelPlan(d, v, tempo, nu)
              const kleur = d.kleur ?? 'var(--positive)'
              const manueel = !d.gekoppeldeRekeningId
              // De naam van het gezinslid komt uit de lijst; staat het lid er niet
              // (meer) in, dan tonen we gewoon niets extra.
              const persoonNaam = naamVanPersoon(d.persoonId, gezinsleden)
              const gekozen = d.id === gekozenId
              return (
                <li
                  key={d.id}
                  className="rij"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 8,
                    background: gekozen ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Hetzelfde gekleurde vlakje als in de transactielijst: het
                        gekozen icoon, of anders de beginletter van het doel. */}
                    <span className="rij-teken" aria-hidden="true" style={{ backgroundColor: zachteAchtergrond(d.kleur ?? null) }}>
                      {d.icoon ?? d.naam.trim().charAt(0).toUpperCase()}
                    </span>
                    {/* De hele regel is de knop: aanklikken opent dit doel in het
                        formulier rechts (op een telefoon: eronder). */}
                    <button
                      type="button"
                      className="rij-midden"
                      aria-current={gekozen ? 'true' : undefined}
                      aria-label={t('Bewerk doel {naam}', { naam: d.naam })}
                      onClick={() => {
                        setGekozenId(d.id)
                        setBewerk(d)
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                    >
                      <span className="rij-titel">{d.naam}</span>
                      <span className="rij-meta">
                        {t('{a} van {b}', { a: formatEuro(v.huidig), b: formatEuro(v.doel) })}
                        {persoonNaam ? ` · ${t('voor {naam}', { naam: persoonNaam })}` : ''}
                      </span>
                    </button>
                    <span className="rij-acties">
                      <button
                        className="knop knop-kaal knop-gevaar"
                        aria-label={t('Verwijder doel {naam}', { naam: d.naam })}
                        onClick={() => verwijder(d.id)}
                      >
                        ×
                      </button>
                    </span>
                  </div>

                  <Balk label={d.naam} fractie={v.fractie} kleur={kleur} nu={v.fractie * 100} max={100} />

                  {rekeningNaam ? (
                    <span className="getal-bron">
                      {t('Het eerste bedrag hierboven is het volledige saldo van {rekening} zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.', {
                        rekening: rekeningNaam,
                      })}
                      {medeDoelen > 0
                        ? ' ' +
                          (medeDoelen === 1
                            ? t('Er hangt nog een doel aan diezelfde rekening: hetzelfde geld telt bij allebei mee.')
                            : t('Er hangen nog {n} doelen aan diezelfde rekening: hetzelfde geld telt bij allemaal mee.', {
                                n: medeDoelen,
                              }))
                        : ''}
                    </span>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span className="rij-meta">{t('nog {bedrag}', { bedrag: formatEuro(v.resterend) })}</span>
                    <span className="rij-meta">
                      {d.maandbedrag ? t('{bedrag}/mnd', { bedrag: formatEuro(d.maandbedrag) }) : ''}
                      {d.doeldatum ? t(' · tegen {datum}', { datum: d.doeldatum }) : ''}
                    </span>
                  </div>

                  {/* Haal je het? Dit stond vroeger enkel als losse rekenhulp waar je
                      alles zelf moest intikken; nu zegt het doel het zelf. */}
                  <PlanRegel doel={d} plan={plan} />

                  {manueel && (
                    <div className="knoprij" style={{ flexWrap: 'nowrap' }}>
                      <input
                        aria-label={t('Huidig bedrag {naam}', { naam: d.naam })}
                        style={{ flex: 1, minWidth: 0 }}
                        inputMode="decimal"
                        placeholder={t('Huidig bedrag')}
                        value={bedragInvoer[d.id] ?? centenNaarInvoer(d.huidigBedrag)}
                        onChange={(e) => setBedragInvoer((m) => ({ ...m, [d.id]: e.target.value }))}
                      />
                      <button type="button" className="knop knop-secundair knop-klein" onClick={() => werkBedragBij(d)}>
                        {t('Bedrag bijwerken')}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

      </Kaart>
      </div>

      <div className="kolom-formulier stapel">
        <Kaart
          titel={bewerk ? t('Doel bewerken') : t('Nieuw doel')}
          actie={
            bewerk ? (
              <button className="knop knop-ghost knop-klein" onClick={() => setBewerk(null)}>
                + {t('Nieuw doel')}
              </button>
            ) : undefined
          }
        >
          <SpaardoelFormulier
            rekeningen={rekeningen}
            gezinsleden={gezinsleden}
            onOpslaan={opslaan}
            onAnnuleer={() => setBewerk(null)}
            bewerken={bewerk}
          />
        </Kaart>
      </div>
      </div>
    </div>
  )
}
