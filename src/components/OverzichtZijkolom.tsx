import type { Budget, Transactie } from '../data/schema'
import { budgetKleur, uitgavenInMaand } from '../utils/budget'
import { Balk, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { useInstellingen } from '../instellingen'
import { formatEuro } from '../utils/format'

// De zijkolom van het Overzicht op brede schermen: hoe je budgetten ervoor staan.
//
// De lijst met je laatste boekingen stond hier ook, maar die is in ronde 31 naar
// de hoofdkolom verhuisd (components/RecenteTransacties.tsx). Reden: deze kolom
// bestaat alleen vanaf 1024 px, dus op een telefoon zag je je eigen laatste
// boekingen nergens op de startpagina.

const AANTAL_BUDGETTEN = 4

export function OverzichtZijkolom({
  transacties,
  budgetten,
  maand,
  categorieNaam,
  onGaNaarBudget,
  onKies,
}: {
  transacties: Transactie[]
  budgetten: Budget[]
  maand: string
  categorieNaam: (id: string) => string | undefined
  onGaNaarBudget: () => void
  /**
   * Doorklikken naar de boekingen achter één budget (ronde 40).
   *
   * Op een breed scherm is dit de EERSTE plek waar je een budgetcijfer ziet; de
   * knop "Alle" bracht je naar de Budget-pagina waar je dezelfde rij dan opnieuw
   * moest zoeken.
   */
  onKies?: (categorieId: string) => void
}) {
  const { t } = useT()
  // Dezelfde drempel als het belletje gebruikt; die staat in Instellingen.
  const { budgetDrempel } = useInstellingen()

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
          // Dezelfde kern als op de Budget-pagina, en dezelfde drempel als de
          // meldingen: die staat in Instellingen en hoorde hier ook te gelden.
          const kleur = budgetKleur(uitgegeven, budget.bedrag, budgetDrempel)
          return (
            <div key={budget.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                {onKies ? (
                  <button
                    type="button"
                    className="rij-titel tekstknop"
                    style={{ fontSize: 'var(--tekst-sm)' }}
                    aria-label={t('Bekijk de boekingen van {naam} — {bedrag}', { naam, bedrag: formatEuro(uitgegeven) })}
                    onClick={() => onKies(budget.categorieId)}
                  >
                    {naam}
                  </button>
                ) : (
                  <span className="rij-titel" style={{ fontSize: 'var(--tekst-sm)' }}>
                    {naam}
                  </span>
                )}
                <span className="bedrag" style={{ fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }}>
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
