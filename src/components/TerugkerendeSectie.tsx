import { useState } from 'react'
import type { Categorie, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { TerugkerendePostFormulier } from './TerugkerendePostFormulier'
import { formatEuro } from '../utils/format'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// Sectie voor vaste (terugkerende) lasten: overzicht, inboeken voor de gekozen
// maand, en een formulier om een vaste post toe te voegen of te bewerken.
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
            return (
              <li key={p.id} className="rij">
                <div className="rij-midden">
                  <span className="rij-titel">{p.omschrijving}</span>
                  <span className="rij-meta">{t('{bedrag} · dag {dag}', { bedrag: formatEuro(p.bedrag), dag: p.dag })}</span>
                </div>
                <span className="rij-acties">
                  {geboekt ? (
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
