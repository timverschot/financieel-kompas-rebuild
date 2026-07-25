import type { Budget, Categorie, Transactie } from '../data/schema'
import { groepenVanTransactie, isGesplitstOverCategorieen } from '../utils/transactie'
import { uitgavenInMaand } from '../utils/budget'
import { Balk, Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'

// De zijkolom van het Overzicht op brede schermen. Ze toont dingen waarvoor je
// anders naar een andere pagina moet: je laatste transacties en hoe je budgetten
// ervoor staan. Op smalle schermen wordt deze kolom niet getoond — daar zou ze de
// pagina enkel langer maken, want je bereikt beide met één tik op de onderbalk.

const AANTAL_RECENT = 6
const AANTAL_BUDGETTEN = 4

function TekenVoor({ tx, categorieen }: { tx: Transactie; categorieen: Categorie[] }) {
  const groepen = groepenVanTransactie(tx, categorieen)
  const gesplitst = isGesplitstOverCategorieen(tx, categorieen)
  // Zelfde logica als in de transactielijst: winkelkar voor een ticket met
  // meerdere categorieën, anders het icoon van de categorie, anders de beginletter.
  const icoon = gesplitst ? '🛒' : groepen[0]?.icoon
  const kleur = gesplitst ? null : (groepen[0]?.kleur ?? null)
  return (
    <span
      className="rij-teken"
      style={kleur ? { backgroundColor: `color-mix(in srgb, ${kleur} 18%, transparent)` } : undefined}
      aria-hidden
    >
      {icoon ?? tx.omschrijving.trim().slice(0, 1).toUpperCase()}
    </span>
  )
}

export function OverzichtZijkolom({
  transacties,
  categorieen,
  budgetten,
  maand,
  categorieNaam,
  onGaNaarTransacties,
  onGaNaarBudget,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  budgetten: Budget[]
  maand: string
  categorieNaam: (id: string) => string | undefined
  onGaNaarTransacties: () => void
  onGaNaarBudget: () => void
}) {
  const { t } = useT()

  const recent = [...transacties].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, AANTAL_RECENT)

  // De budgetten die het dichtst bij hun grens zitten, want dat is wat je wil zien.
  const budgetStand = budgetten
    .map((b) => {
      const uitgegeven = uitgavenInMaand(transacties, b.categorieId, maand)
      return { budget: b, uitgegeven, fractie: b.bedrag > 0 ? uitgegeven / b.bedrag : 0 }
    })
    .sort((a, b) => b.fractie - a.fractie)
    .slice(0, AANTAL_BUDGETTEN)

  return (
    <div className="kolom-zij">
      <Kaart
        titel={t('Recente transacties')}
        actie={
          <button className="knop knop-ghost knop-klein" onClick={onGaNaarTransacties}>
            {t('Alle')}
          </button>
        }
      >
        {recent.length === 0 && <Leeg>{t('Nog geen transacties.')}</Leeg>}
        {recent.length > 0 && (
          <ul className="lijst">
            {recent.map((tx) => (
              <li key={tx.id} className="rij" style={{ gap: 10 }}>
                <TekenVoor tx={tx} categorieen={categorieen} />
                <span className="rij-midden">
                  <span className="rij-titel" style={{ fontSize: 14 }}>
                    {tx.omschrijving}
                  </span>
                  <span className="rij-meta">{tx.datum}</span>
                </span>
                <Bedrag centen={tx.bedrag} richting="auto" />
              </li>
            ))}
          </ul>
        )}
      </Kaart>

      <Kaart
        titel={t('Budgetstatus')}
        bijschrift={t('voor {maand}', { maand })}
        actie={
          <button className="knop knop-ghost knop-klein" onClick={onGaNaarBudget}>
            {t('Alle')}
          </button>
        }
      >
        {budgetStand.length === 0 && <Leeg>{t('Nog geen budgetten ingesteld.')}</Leeg>}
        {budgetStand.map(({ budget, uitgegeven, fractie }) => {
          const naam = categorieNaam(budget.categorieId) ?? '—'
          const kleur =
            uitgegeven > budget.bedrag ? 'var(--negative)' : fractie >= 0.8 ? 'var(--warn)' : 'var(--positive)'
          return (
            <div key={budget.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span className="rij-titel" style={{ fontSize: 14 }}>
                  {naam}
                </span>
                <span className="bedrag" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {Math.round(fractie * 100)}%
                </span>
              </span>
              <Balk label={naam} fractie={fractie} kleur={kleur} nu={uitgegeven} max={budget.bedrag} />
            </div>
          )
        })}
      </Kaart>
    </div>
  )
}
