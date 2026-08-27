import { useState } from 'react'
import type { DossierDocument, Garantie, Kind, Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { garantieStatus, dagenTussen } from '../utils/garantie'
import { GarantieFormulier } from './GarantieFormulier'
import { Kaart, Leeg, Balk } from '../ui/basis'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { Documentkluis } from './DossierKluis'
import type { Vertaler } from '../i18n'
import { vandaag, dagKort } from '../utils/datum'
import { Bonknop } from '../ui/Bonknop'
import { bonVanTransactie } from '../utils/kluis'


// De statusbadge (klasse + tekst) voor een garantie: vervallen, bijna vervallen
// of nog geldig.
function badge(t: Vertaler, s: ReturnType<typeof garantieStatus>): { klasse: string; tekst: string } {
  // Een onleesbare aankoopdatum (ronde 55). Vroeger rekende de app hier stil door
  // met NaN en zette ze de badge op "nog NaN maand(en)". Nu zegt ze wat er aan de
  // hand is, want dit is iets wat je zelf kan rechtzetten.
  if (s.onbekend) return { klasse: 'badge badge-laat', tekst: t('aankoopdatum onleesbaar') }
  if (s.verlopen) return { klasse: 'badge badge-laat', tekst: t('verlopen') }
  if (s.bijnaVerlopen) return { klasse: 'badge badge-open', tekst: t('nog {n} dag(en)', { n: s.dagenResterend }) }
  return { klasse: 'badge badge-ok', tekst: t('nog {n} maand(en)', { n: s.maandenResterend }) }
}

// De garantie- & factuursectie: voeg aankopen met garantie toe, zie de vervaldatum
// en "nog X maanden / verlopen" — gesorteerd op wat het eerst vervalt, met een
// waarschuwing voor wat bijna verloopt.
export function GarantieSectie({
  gezinsleden = [],
  garanties,
  transacties,
  onOpslaan,
  onVerwijderen,
  documenten = [],
  onDocumentOpslaan,
  onDocumentVerwijderen,
  onBewerkTransactie,
}: {
  // Optioneel: doorgegeven aan het formulier, om iets aan een gezinslid te koppelen.
  gezinsleden?: Kind[]
  garanties: Garantie[]
  transacties: Transactie[]
  onOpslaan: (g: Garantie) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  // Documentkluis per aankoop (factuur, garantiebewijs, handleiding). Optioneel:
  // zonder de twee handlers verschijnt de kluis gewoon niet.
  documenten?: DossierDocument[]
  onDocumentOpslaan?: (d: DossierDocument) => Promise<void> | void
  onDocumentVerwijderen?: (id: string) => Promise<void> | void
  /**
   * De boeking openen waaruit de aankoop komt (ronde 48).
   *
   * Zonder dit was de garantielade een doodlopende weg: je zag wél staan uit welke
   * betaling het toestel kwam, maar je kon er niet naartoe. Ontbreekt de prop, dan
   * blijft de regel gewone tekst — een knop die niets doet is erger dan geen knop.
   */
  onBewerkTransactie?: (tx: Transactie) => void
}) {
  const { t } = useT()
  const [bewerk, setBewerk] = useState<Garantie | null>(null)
  const nu = vandaag()
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()

  async function opslaan(g: Garantie) {
    // ⚠ RONDE 68 — HIER MAG DE FOUT NIET OPGEVANGEN WORDEN. Het formulier hieronder
    // vangt zelf op en houdt dan je invoer vast; ving deze tussenstap hem al weg, dan
    // zag het formulier "gelukt", maakte het zichzelf leeg, en was je tekst tóch weg —
    // mét een melding erbij. Precies de fout die deze ronde moest uitroeien.
    await onOpslaan(g)
    setBewerk(null)
  }

  // Sorteer op vervaldatum: wat het eerst vervalt bovenaan; verlopen onderaan.
  const metStatus = garanties.map((g) => ({ g, s: garantieStatus(g.aankoopdatum, g.garantieMaanden, nu) }))
  metStatus.sort((a, b) => {
    // Een aankoop met een onleesbare datum onderaan (nakijkronde ronde 55). Haar
    // vervaldatum is een lege tekst, en die is kleiner dan élke datum: zonder deze
    // regel sprong ze bovenaan de lijst, bóven wat écht bijna vervalt.
    if (a.s.onbekend !== b.s.onbekend) return a.s.onbekend ? 1 : -1
    if (a.s.verlopen !== b.s.verlopen) return a.s.verlopen ? 1 : -1
    return a.s.vervaldatum < b.s.vervaldatum ? -1 : a.s.vervaldatum > b.s.vervaldatum ? 1 : 0
  })

  return (
    // ⚠ RONDE 66. Deze kaart heette "Garanties & facturen" terwijl het tabblad er
    // vlak boven "Facturen & garantiebewijzen" zei en de keuzeknop op een lege pagina
    // "Aankoop met garantie" — drie namen voor één lade. De lade draagt de naam nu
    // één keer, op het tabblad; de kaart eronder zegt alleen nog wat ze doet.
    <Kaart bijschrift={t('Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.')}>
      {garanties.length === 0 && <Leeg>{t('Nog geen aankopen. Voeg er hieronder een toe.')}</Leeg>}

      <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />

      {metStatus.length > 0 && (
        <ul className="lijst">
          {metStatus.map(({ g, s }) => {
            const b = badge(t, s)
            // Hoeveel van de garantieperiode er nog rest, als fractie 0..1.
            const totaalDagen = s.onbekend ? 0 : dagenTussen(g.aankoopdatum, s.vervaldatum)
            const restFractie = totaalDagen > 0 ? s.dagenResterend / totaalDagen : 0
            const balkKleur = s.verlopen ? 'var(--text-subtle)' : s.bijnaVerlopen ? 'var(--warn)' : 'var(--positive)'
            return (
              <li
                key={g.id}
                className="rij rij-kolom"
                style={{
                  gap: 8,
                  opacity: s.verlopen ? 0.7 : 1,
                  ...(s.bijnaVerlopen ? { borderLeft: '3px solid var(--warn)', paddingLeft: 10 } : {}),
                }}
              >
                <div className="rij-kop">
                  <div className="rij-midden">
                    <span className="rij-titel">{g.product}</span>
                  </div>
                  <span className="rij-acties">
                    <span className={b.klasse}>{b.tekst}</span>
                    <button className="knop knop-kaal" aria-label={t('Bewerk garantie {naam}', { naam: g.product })} onClick={() => setBewerk(g)}>
                      ✎
                    </button>
                    <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder garantie {naam}', { naam: g.product })} onClick={() => void opslag.probeer(() => onVerwijderen(g.id))}>
                      ×
                    </button>
                  </span>
                </div>

                <Balk label={g.product} fractie={restFractie} kleur={balkKleur} />

                <span className="rij-meta">
                  {g.winkel && <span>{g.winkel} · </span>}
                  {t('gekocht {datum}', { datum: g.aankoopdatum })}
                  {typeof g.prijs === 'number' && (
                    <span>
                      {' · '}
                      <span className="bedrag" style={{ fontSize: 'inherit' }}>
                        {formatEuro(g.prijs)}
                      </span>
                    </span>
                  )}
                  {' · '}
                  {/* Geen halve zin "· vervalt " wanneer de app de aankoopdatum niet
                      kan lezen: dan is er niets te zeggen, en zegt ze dat ook. */}
                  {s.onbekend
                    ? t('vervaldatum onbekend')
                    : t('vervalt {datum}', { datum: s.vervaldatum })}
                </span>

                {/* De boeking waaruit deze aankoop komt (ronde 36).
                    Het veld `transactieId` bestond al en werd netjes bewaard, maar
                    stond nergens op het scherm — je kon dus niet zien of een
                    garantiebewijs aan een betaling hing, laat staan aan welke. En
                    de bon van die boeking tonen we hier gewoon mee: dat is precies
                    het bewijsstuk dat je nodig hebt als het toestel stukgaat.
                    Bewust een verwijzing en geen kopie: één foto, altijd actueel. */}
                {(() => {
                  const tx = g.transactieId ? transacties.find((x) => x.id === g.transactieId) : undefined
                  if (!tx) return null
                  const txBon = bonVanTransactie(documenten, tx.id)
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {onBewerkTransactie ? (
                        <button
                          type="button"
                          className="rij-meta tekstknop tekstknop-meta"
                          aria-label={t('Uit je boeking van {datum}: {oms} — {bedrag}. Open die boeking.', {
                            datum: dagKort(tx.datum),
                            oms: tx.omschrijving,
                            bedrag: formatEuro(Math.abs(tx.bedrag)),
                          })}
                          onClick={() => onBewerkTransactie(tx)}
                        >
                          {t('Uit je boeking van {datum}: {oms}', { datum: dagKort(tx.datum), oms: tx.omschrijving })}
                          {' · '}
                          <span className="bedrag" style={{ fontSize: 'inherit' }}>
                            {formatEuro(Math.abs(tx.bedrag))}
                          </span>
                        </button>
                      ) : (
                        <span className="rij-meta">
                          {t('Uit je boeking van {datum}: {oms}', { datum: dagKort(tx.datum), oms: tx.omschrijving })}
                          {' · '}
                          <span className="bedrag" style={{ fontSize: 'inherit' }}>
                            {formatEuro(Math.abs(tx.bedrag))}
                          </span>
                        </span>
                      )}
                      {txBon && <Bonknop bestand={txBon.bestand} naam={tx.omschrijving} label={t('bon van de boeking')} />}
                    </div>
                  )
                })()}

                {g.notitie && <span className="rij-meta">{g.notitie}</span>}

                {g.bonnetje && (
                  <div>
                    <Bonknop bestand={g.bonnetje} naam={g.product} label={t('bon/factuur')} />
                  </div>
                )}

                {/* De papieren bij deze aankoop: factuur, garantiebewijs,
                    handleiding. Ingeklapt, zodat de lijst leesbaar blijft. */}
                {onDocumentOpslaan && onDocumentVerwijderen && (
                  <Documentkluis
                    inklapbaar
                    eigenaar={{ soort: 'garantie', id: g.id }}
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
        {bewerk ? t('Aankoop bewerken') : t('Nieuwe aankoop')}
      </h3>
      <GarantieFormulier gezinsleden={gezinsleden} transacties={transacties} onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </Kaart>
  )
}
