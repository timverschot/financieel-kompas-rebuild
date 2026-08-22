import type { Budget, Transactie } from '../data/schema'
import { budgetKleur, geldendeBudgetten, uitgavenInMaand } from '../utils/budget'
import { Balk, EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { useInstellingen } from '../instellingen'
import { formatEuro } from '../utils/format'
import { maandJaarLabel } from '../utils/datum'

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
  /**
   * De maand die je bekijkt, als 'JJJJ-MM'.
   *
   * ⚠ NIET als leesbaar label (ronde 62). Tot deze ronde gaf `App.tsx` hier
   * `maandJaarLabel(maand)` mee — dus "augustus 2026" — en die tekst ging
   * rechtstreeks naar `uitgavenInMaand`, dat vergelijkt met `datum.startsWith(maand)`.
   * Een datum als "2026-08-14" begint nooit met "augustus 2026", dus stond ELKE balk
   * in deze kolom op € 0,00 en 0 %, hoeveel je die maand ook uitgaf. Alles groen, en
   * niets dat het verried: de twee tests klikten alleen op een rij en keken nooit naar
   * een bedrag. Het label maken we hieronder zelf.
   */
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
  // ⚠ `geldendeBudgetten` en niet de kale lijst (ronde 62): sinds een budget een
  // eigen maand kan hebben, zouden dezelfde categorie en haar uitzondering hier
  // allebei een rij krijgen — en met vier plaatsen duwen ze de rest eruit.
  const budgetStand = geldendeBudgetten(budgetten, maand)
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
        bijschrift={t('voor {maand}', { maand: maandJaarLabel(maand) })}
        // ⚠ "Alle budgetten" en niet "Alle": op een breed scherm staat deze kaart naast
        // "Recente boekingen", die ook zo'n knop draagt. Twee knoppen die allebei
        // "Alle" heten zijn voor een schermlezer niet uit elkaar te houden.
        actie={
          <button className="knop knop-ghost knop-klein" onClick={onGaNaarBudget}>
            {t('Alle budgetten')}
          </button>
        }
      >
        {/* ⚠ RONDE 66, slotronde, twee dingen tegelijk.
            (1) De zin noemde de Budget-pagina maar liet je er zelf naartoe zoeken —
                terwijl deze kaart de knop ernaartoe al binnenkreeg voor "Alle".
            (2) Ze zei "Nog geen budgetten ingesteld" zodra er voor DEZE maand niets
                gold. Had je enkel een budget voor januari en keek je naar augustus,
                dan stond hier "zet je eerste budget" terwijl de Budget-pagina in
                diezelfde maand het tegenovergestelde zei. Dezelfde tegenspraak die
                ronde 62 daar al rechtgezet heeft; deze kolom was toen vergeten. */}
        {budgetStand.length === 0 &&
          (budgetten.length === 0 ? (
            <Leeg actie={<EersteStapKnop onClick={onGaNaarBudget}>{t('Zet je eerste budget')}</EersteStapKnop>}>
              {t('Nog geen budgetten ingesteld. Op de Budget-pagina zet je een grens op een categorie.')}
            </Leeg>
          ) : (
            <Leeg actie={<EersteStapKnop onClick={onGaNaarBudget}>{t('Bekijk je budgetten')}</EersteStapKnop>}>
              {t('Voor deze maand staat er geen budget. Je budgetten gelden voor een andere maand.')}
            </Leeg>
          ))}
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
                    // ⚠ "in je budget" erbij: de donut op ditzelfde scherm heeft voor
                    // dezelfde categorie een rij met exact dezelfde naam en hetzelfde
                    // bedrag (zie TopDrie). Zonder dit verschil klinken ze identiek.
                    aria-label={t('Bekijk de boekingen van {naam} in je budget — {bedrag}', {
                      naam,
                      bedrag: formatEuro(uitgegeven),
                    })}
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
