import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Transactie } from '../data/schema'
import { stijgersDalers, maandreeksPerHoofd } from '../utils/trends'
import { laatsteMaanden } from '../utils/vermogen'
import type { Periode, Richting } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { Kaart, Leeg, Bedrag } from '../ui/basis'
import { maandKort } from '../utils/datum'
import { useT } from '../i18n'

// Eén kaart: "Verloop per categorie".
//
// Hier stonden tot ronde 31 twee kaarten die dezelfde vraag beantwoordden — "wat
// beweegt er?" — maar met een andere tijdsbasis, en dat sprak elkaar tegen:
//
//  - "Stijgers en dalers" volgde de periode die je bovenaan koos;
//  - "Per categorie per maand" toonde ALTIJD de laatste zes maanden en negeerde
//    die keuze stil. Koos je "Dit jaar", dan bleef die kaart over zes maanden
//    praten zonder dat ergens te zeggen.
//
// Nu is het één rij per categorie met beide dingen naast elkaar: het lijntje toont
// het verloop over zes maanden, de ▲/▼-kolom het verschil met de vorige periode.
// De kaartkop zegt expliciet welke twee tijdvakken je ziet, zodat de twee cijfers
// op één regel niet opnieuw kunnen botsen.

const stip: CSSProperties = { width: 10, height: 10, borderRadius: 3, flexShrink: 0 }
const afkap: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

/** Hoeveel categorieën we tonen. Meer maakt van een overzicht weer een lijst. */
const AANTAL = 6
const MAANDEN = 6

// Piepkleine verloopgrafiek (sparkline) voor één categorie.
function Sparkline({ waarden, kleur, label }: { waarden: number[]; kleur: string; label: string }) {
  const w = 90
  const h = 26
  const max = Math.max(1, ...waarden)
  const n = waarden.length
  const x = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v: number) => h - 2 - (v / max) * (h - 4)
  const punten = waarden.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label} style={{ flexShrink: 0 }}>
      <polyline points={punten} fill="none" stroke={kleur} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function TrendsSectie({
  transacties,
  categorieen,
  richting,
  huidige,
  vorige,
  periodeLabel,
  ankerMaand,
  onKies,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  richting: Richting
  huidige: Periode
  vorige: Periode | null
  /** De naam van de gekozen periode, voor het bijschrift ("Deze maand"). */
  periodeLabel: string
  /**
   * De laatste maand van het lijntje ('JJJJ-MM'). Ronde 40: dit was `new Date()`,
   * waardoor het lijntje bleef praten over de laatste zes maanden vanaf vandaag,
   * ook wanneer je bovenaan naar maart bladerde. Standaard blijft het de huidige
   * maand, zodat een aanroeper die niets meegeeft zich gedraagt zoals vroeger.
   */
  ankerMaand?: string
  /** Doorklikken naar de boekingen van één hoofdcategorie (ronde 40). */
  onKies?: (sleutel: string, naam: string) => void
}) {
  const { t } = useT()

  const nu = new Date()
  const huidigeMaand = ankerMaand ?? nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0')
  const maanden = useMemo(() => laatsteMaanden(huidigeMaand, MAANDEN), [huidigeMaand])
  const reeksen = useMemo(
    () => maandreeksPerHoofd(transacties, categorieen, maanden, richting).slice(0, AANTAL),
    [transacties, categorieen, maanden, richting],
  )
  const movers = useMemo(
    () => (vorige ? stijgersDalers(transacties, categorieen, huidige, vorige, richting) : []),
    [transacties, categorieen, huidige, vorige, richting],
  )
  // Het verschil per categorie, opzoekbaar op sleutel: zo hangt elke rij aan haar
  // eigen cijfer in plaats van aan een tweede, los gesorteerde lijst.
  const deltaPer = useMemo(() => new Map(movers.map((m) => [m.sleutel, m])), [movers])

  // Kleur van een verschil: bij uitgaven is meer = rood, minder = groen; bij
  // inkomsten omgekeerd.
  function deltaKleur(delta: number): string {
    const omhoog = delta > 0
    const goedGevoel = richting === 'inkomst' ? omhoog : !omhoog
    return goedGevoel ? 'var(--positive)' : 'var(--negative)'
  }

  const venster = maanden.length > 0 ? `${maandKort(maanden[0])} – ${maandKort(maanden[maanden.length - 1])}` : ''

  return (
    <Kaart
      titel={t('Verloop per categorie')}
      bijschrift={
        vorige
          ? t('Het lijntje loopt over {venster}. Het verschil ernaast vergelijkt {periode} met de vorige even lange periode.', {
              venster,
              periode: periodeLabel.toLowerCase(),
            })
          : t('Het lijntje loopt over {venster}. Kies een periode (niet Alles) om er een verschil bij te zien.', { venster })
      }
    >
      {reeksen.length === 0 ? (
        <Leeg>{t('Nog niets geboekt in deze maanden.')}</Leeg>
      ) : (
        <ul className="lijst">
          {reeksen.map((r) => {
            const m = deltaPer.get(r.sleutel)
            const laatste = r.waarden[r.waarden.length - 1]
            const inhoud = (
              <>
                <span aria-hidden style={{ ...stip, background: r.kleur ?? 'var(--text-subtle)' }} />
                <span className="rij-midden">
                  <span className="rij-titel" style={afkap}>
                    {r.naam}
                  </span>
                </span>
                <Sparkline
                  waarden={r.waarden}
                  kleur={r.kleur ?? 'var(--accent-strong)'}
                  label={t('Verloop van {naam} over {venster}', { naam: r.naam, venster })}
                />
                {/* Het verschil met de vorige periode. Geen verschil om te tonen?
                    Dan blijft de kolom leeg in plaats van een nul te verzinnen. */}
                <span className="bedrag" style={{ minWidth: 92, textAlign: 'right', color: m ? deltaKleur(m.delta) : 'var(--text-subtle)', fontSize: 'var(--tekst-s)' }}>
                  {m && m.delta !== 0 ? `${m.delta > 0 ? '▲' : '▼'} ${formatEuro(Math.abs(m.delta))}` : vorige ? '=' : ''}
                </span>
                <Bedrag centen={laatste} />
              </>
            )
            return (
              <li key={r.sleutel} className="rij">
                {onKies ? (
                  <button
                    type="button"
                    className="rij-knop"
                    // Zowel het bedrag als de PERIODE in het label. Het bedrag
                    // omdat de inhoud van een knop niet apart voorgelezen wordt;
                    // de periode omdat het cijfer op de rij over de laatste maand
                    // van het lijntje gaat, terwijl de doorklik de gekozen periode
                    // toont. Zonder dat erbij te zeggen spreken de twee elkaar tegen.
                    aria-label={t('Bekijk de boekingen van {naam} — {bedrag}, {periode}', {
                      naam: r.naam,
                      bedrag: formatEuro(laatste),
                      periode: periodeLabel.toLowerCase(),
                    })}
                    onClick={() => onKies(r.sleutel, r.naam)}
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
      )}
    </Kaart>
  )
}
