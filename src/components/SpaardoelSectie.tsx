import { useState } from 'react'
import type { Kind, Overboeking, Rekening, Spaardoel, Transactie } from '../data/schema'
import { SpaardoelFormulier } from './SpaardoelFormulier'
import { spaardoelVoortgang } from '../utils/spaardoel'
import { naamVanPersoon } from '../utils/persoon'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { Balk, Kaart, Leeg, PaginaKop } from '../ui/basis'
import { useT } from '../i18n'
import { zachteAchtergrond } from './TransactieLijst'

// De volledige Spaardoelen-sectie: overzicht met voortgangsbalken, snel het
// huidige bedrag bijwerken (bij manueel bijgehouden doelen), en een formulier om
// een doel toe te voegen of te bewerken.
export function SpaardoelSectie({
  spaardoelen,
  rekeningen,
  transacties,
  overboekingen = [],
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
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerk, setBewerk] = useState<Spaardoel | null>(null)
  // Welk doel er rechts (op een telefoon: eronder) opengeklapt staat. Zolang er
  // niets gekozen is, staat rechts gewoon het formulier voor een nieuw doel.
  const [gekozenId, setGekozenId] = useState<string | null>(null)
  const [bedragInvoer, setBedragInvoer] = useState<Record<string, string>>({})

  async function opslaan(d: Spaardoel) {
    await onOpslaan(d)
    // Na het opslaan staat rechts weer het formulier voor een NIEUW doel, dus
    // mag er in de lijst ook niets meer oplichten — anders lijkt de markering te
    // wijzen naar iets wat rechts niet staat.
    setBewerk(null)
    setGekozenId(null)
  }

  async function verwijder(id: string) {
    if (gekozenId === id) setGekozenId(null)
    if (bewerk?.id === id) setBewerk(null)
    await onVerwijderen(id)
  }

  async function werkBedragBij(doel: Spaardoel) {
    const tekst = bedragInvoer[doel.id]
    if (tekst === undefined) return
    const centen = invoerNaarCenten(tekst)
    if (!Number.isFinite(centen)) return
    await onOpslaan({ ...doel, huidigBedrag: centen })
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

      <div className="kolom-lijst stapel">
      <Kaart>
        {spaardoelen.length === 0 && <Leeg>{t('Nog geen doelen. Voeg je eerste doel toe!')}</Leeg>}

        {spaardoelen.length > 0 && (
          <ul className="lijst">
            {spaardoelen.map((d) => {
              const v = spaardoelVoortgang(d, rekeningen, transacties, overboekingen)
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span className="rij-meta">{t('nog {bedrag}', { bedrag: formatEuro(v.resterend) })}</span>
                    <span className="rij-meta">
                      {d.maandbedrag ? t('{bedrag}/mnd', { bedrag: formatEuro(d.maandbedrag) }) : ''}
                      {d.doeldatum ? t(' · tegen {datum}', { datum: d.doeldatum }) : ''}
                    </span>
                  </div>

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
      </div>
    </div>
  )
}
