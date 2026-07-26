import { useState } from 'react'
import type { Categorie, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { TerugkerendePostFormulier, frequentieNaam } from './TerugkerendePostFormulier'
import { formatEuro } from '../utils/format'
import { vandaag } from '../utils/datum'
import { frequentieVan, maandbedrag, opzijPerMaand, valtInMaand, volgendeVervaldag } from '../utils/vastelast'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// Sectie voor vaste (terugkerende) lasten: overzicht, inboeken voor de gekozen
// maand, en een formulier om een vaste post toe te voegen of te bewerken.
//
// Sinds ronde 23 hoeft een vaste last niet meer maandelijks te zijn. Dat verandert
// twee dingen in deze lijst: "Boek in" verschijnt alleen in de maanden waarin de
// post écht vervalt (anders zou je een jaarpremie twaalf keer kunnen boeken), en
// bij een niet-maandelijkse post staat erbij wanneer ze de volgende keer komt en
// wat ze omgerekend per maand kost.
export function TerugkerendeSectie({
  posten,
  rekeningen,
  categorieen,
  transacties,
  maand,
  maandLabel,
  onOpslaan,
  onVerwijderen,
  onBoek,
}: {
  posten: TerugkerendePost[]
  rekeningen: Rekening[]
  categorieen: Categorie[]
  transacties: Transactie[]
  maand: string
  maandLabel: string
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBoek: (p: TerugkerendePost) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerken, setBewerken] = useState<TerugkerendePost | null>(null)

  async function opslaan(p: TerugkerendePost) {
    await onOpslaan(p)
    setBewerken(null)
  }

  return (
    <Kaart titel={t('Vaste lasten')} bijschrift={t('Inboeken voor {maand}', { maand: maandLabel })}>
      {posten.length > 0 && (
        <ul className="lijst">
          {posten.map((p) => {
            const geboekt = transacties.some((tx) => tx.id === `tk-${p.id}-${maand}`)
            const dezeMaand = valtInMaand(p, maand)
            const periodiek = frequentieVan(p) !== 'maand'
            const volgende = periodiek ? volgendeVervaldag(p, vandaag()) : null
            const opzij = opzijPerMaand(p)
            return (
              // Bovenaan uitlijnen: bij een niet-maandelijkse post staat er een
              // tweede regel tekst, en met verticaal centreren zweefde de badge
              // dan tussen die twee regels in.
              <li key={p.id} className="rij" style={{ alignItems: 'flex-start' }}>
                <div className="rij-midden">
                  <span className="rij-titel">{p.omschrijving}</span>
                  <span className="rij-meta">
                    {t('{bedrag} · dag {dag}', { bedrag: formatEuro(p.bedrag), dag: p.dag })}
                    {periodiek && <> · {frequentieNaam(t, frequentieVan(p))}</>}
                  </span>
                  {periodiek && (
                    <span className="rij-meta">
                      {volgende && t('volgende keer {datum}', { datum: volgende })}
                      {opzij > 0
                        ? t(' · {bedrag} per maand opzij', { bedrag: formatEuro(opzij) })
                        : t(' · {bedrag} per maand omgerekend', { bedrag: formatEuro(-maandbedrag(p)) })}
                    </span>
                  )}
                </div>
                <span className="rij-acties">
                  {!dezeMaand ? (
                    // Niet deze maand aan de beurt: niets te boeken. Zonder dit zou
                    // je een jaarpremie elke maand opnieuw kunnen inboeken.
                    <span className="badge badge-neutraal">{t('Niet deze maand')}</span>
                  ) : geboekt ? (
                    <span className="badge badge-ok">{t('Geboekt ✓')}</span>
                  ) : (
                    <button className="knop knop-secundair knop-klein" onClick={() => onBoek(p)}>
                      {t('Boek in')}
                    </button>
                  )}
                  <button
                    className="knop knop-kaal"
                    aria-label={t('Bewerk vaste post {naam}', { naam: p.omschrijving })}
                    onClick={() => setBewerken(p)}
                  >
                    ✎
                  </button>
                  <button
                    className="knop knop-kaal knop-gevaar"
                    aria-label={t('Verwijder vaste post {naam}', { naam: p.omschrijving })}
                    onClick={() => onVerwijderen(p.id)}
                  >
                    ×
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <TerugkerendePostFormulier
        rekeningen={rekeningen}
        categorieen={categorieen}
        onOpslaan={opslaan}
        onAnnuleer={() => setBewerken(null)}
        bewerken={bewerken}
      />
    </Kaart>
  )
}
