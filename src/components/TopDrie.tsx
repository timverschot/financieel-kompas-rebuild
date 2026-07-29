import type { CategorieUitgave } from '../utils/overzicht'
import { afgerondePercentages } from '../utils/donut'
import { Bedrag } from '../ui/basis'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

// De drie grootste posten onder een donut, met een knop naar de Analyse-pagina.
//
// Onder de donuts op het Overzicht stond eerst de VOLLEDIGE lijst met categorieën
// — soms vijftien regels onder een grafiek van tien centimeter. Dat is de plek
// niet: het Overzicht beantwoordt "waar gaat het grofweg heen", de Analyse-pagina
// beantwoordt "en wat zit daar precies achter".
//
// Drie regels dus, plus één knop. De rest van de informatie is niet verdwenen: de
// donut zelf geeft elke schijf prijs zodra je erover hangt of erop tikt.
//
// De percentages worden over de VOLLEDIGE lijst berekend, niet over de drie die je
// ziet. Anders zouden ze samen 100% geven terwijl ze maar een deel van je uitgaven
// dekken — het klassieke geval waarin een grafiek en zijn cijfers elkaar
// tegenspreken.

const AANTAL = 3
const stip = { width: 10, height: 10, borderRadius: 3, flexShrink: 0 } as const

export function TopDrie({
  posten,
  onAlles,
  onKies,
}: {
  posten: CategorieUitgave[]
  onAlles: () => void
  /**
   * Doorklikken naar de boekingen van één categorie (ronde 40).
   *
   * Deze drie regels zijn ook de TOETSENBORDweg naar diezelfde boekingen. Een
   * `<path>` in de donut hierboven is niet met de tab-toets te bereiken en wordt
   * door hulpsoftware niet als knop aangeboden; zonder deze rijen zou het
   * doorklikken alleen voor muis- en aanraakgebruikers bestaan.
   */
  onKies?: (sleutel: string) => void
}) {
  const { t } = useT()
  const percentages = afgerondePercentages(posten.map((p) => p.bedrag))
  const top = posten.slice(0, AANTAL)
  const rest = posten.length - top.length

  return (
    <>
      <ul className="lijst">
        {top.map((p, i) => {
          const inhoud = (
            <>
              <span aria-hidden style={{ ...stip, background: p.kleur ?? 'var(--text-subtle)' }} />
              <span className="rij-midden">
                <span className="rij-titel" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.naam}
                </span>
              </span>
              <span className="rij-pct">{percentages[i]}%</span>
              <Bedrag centen={p.bedrag} />
            </>
          )
          // 'Zonder categorie' heeft geen id om op te filteren; die rij blijft dus
          // een gewone regel in plaats van een knop die niets doet.
          return (
            <li key={`${i}-${p.naam}`} className="rij">
              {onKies && p.sleutel ? (
                <button
                  type="button"
                  className="rij-knop"
                  aria-label={t('Bekijk de boekingen van {naam} — {bedrag}', { naam: p.naam, bedrag: formatEuro(p.bedrag) })}
                  onClick={() => onKies(p.sleutel)}
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
      <div className="knoprij">
        <button type="button" className="knop knop-ghost knop-klein" onClick={onAlles}>
          {rest > 0 ? t('Bekijk alle {n} in Analyse ›', { n: posten.length }) : t('Bekijk in Analyse ›')}
        </button>
      </div>
    </>
  )
}
