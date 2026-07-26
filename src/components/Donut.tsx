import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { donutSegmenten, afgerondePercentages, splitsLabel, type DonutInvoer } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { Bedrag } from '../ui/basis'
import { useT } from '../i18n'

// Geometrie van de donut. Puur vormgeving: een iets ruimer gat en een dunnere
// ring, zodat het middenlabel rustig ademt zoals in het designsysteem.
const GROOTTE = 190
const MIDDEN = GROOTTE / 2
const BUITEN = 84
const BINNEN = 58

// Hoever een gekozen schijf naar buiten schuift, in tekeneenheden.
const UITSCHUIF = 5

// Een punt op een cirkel; hoek 0 = bovenaan, met de klok mee.
function punt(straal: number, fractie: number): [number, number] {
  const hoek = fractie * 2 * Math.PI
  return [MIDDEN + straal * Math.sin(hoek), MIDDEN - straal * Math.cos(hoek)]
}

function segmentPad(start: number, eind: number): string {
  const groot = eind - start > 0.5 ? 1 : 0
  const [xb0, yb0] = punt(BUITEN, start)
  const [xb1, yb1] = punt(BUITEN, eind)
  const [xi1, yi1] = punt(BINNEN, eind)
  const [xi0, yi0] = punt(BINNEN, start)
  return `M ${xb0} ${yb0} A ${BUITEN} ${BUITEN} 0 ${groot} 1 ${xb1} ${yb1} L ${xi1} ${yi1} A ${BINNEN} ${BINNEN} 0 ${groot} 0 ${xi0} ${yi0} Z`
}

/**
 * Hoeveel een schijf verschuift wanneer je haar kiest: naar buiten, weg van het
 * midden, langs de lijn die door het hart van de schijf loopt.
 */
function uitschuif(start: number, eind: number): string {
  const hoek = ((start + eind) / 2) * 2 * Math.PI
  const dx = Math.sin(hoek) * UITSCHUIF
  const dy = -Math.cos(hoek) * UITSCHUIF
  return `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`
}

// Kleurstipje in de legende. De kleur zelf komt altijd uit het segment (zelfde
// data-object als het bedrag), dus enkel de vorm staat hier vast.
const stip: CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: 3, flexShrink: 0 }
const afkap: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// Donutgrafiek van bedragen per (hoofd)categorie, met legende. De kleuren komen
// uit hetzelfde data-object als de cijfers. Deze component zet bewust géén eigen
// kaart om zichzelf: ze staat altijd ín een <Kaart> van de pagina.
export function Donut({
  items,
  middenLabel = 'uitgaven',
  toonLegende = true,
  grootte = GROOTTE,
  interactief = false,
}: {
  items: DonutInvoer[]
  middenLabel?: string
  toonLegende?: boolean
  /**
   * Hoe groot de donut op het scherm getekend wordt, in pixels.
   *
   * De rekenkunde erbinnen verandert niet mee: het tekenvlak blijft `GROOTTE`
   * eenheden breed en de SVG schaalt dat naar deze maat. Ook de tekst in het gat
   * schaalt dus mee, want die staat in hetzelfde coördinatenstelsel.
   */
  grootte?: number
  /**
   * Laat de schijven reageren op de muis en op een tik.
   *
   * Wat er dan gebeurt: de gekozen schijf schuift een beetje naar buiten, en in
   * het GAT van de donut komt haar naam, haar bedrag en haar aandeel te staan, in
   * plaats van het totaal.
   *
   * Waarom in het gat en niet als zwevende tooltip: een tooltip verschijnt bij de
   * muisaanwijzer, en op een telefoon bestaat die niet. Het gat staat er altijd,
   * op elk toestel, en is precies de plek waar je al kijkt. Eén oplossing die op
   * beide werkt is beter dan twee die elk maar de helft dekken.
   */
  interactief?: boolean
}) {
  const { t } = useT()
  const [gekozen, setGekozen] = useState<number | null>(null)
  // Welke schijf je het laatst AANGETIKT hebt (niet: waar je overheen hing).
  //
  // Waarom dit een ref moet zijn en geen tweede stukje state: op een aanraakscherm
  // stuurt de browser bij één tik eerst een 'mouseenter' en dán pas de 'click'. Zou
  // de klik simpelweg omschakelen op basis van wat er gekozen is, dan zette de
  // mouseenter de schijf aan en zette de klik ze meteen weer uit — één tik en er
  // gebeurde zichtbaar niets. Door de tik met de VORIGE tik te vergelijken werkt
  // aantikken en weer loslaten op beide toestellen hetzelfde.
  const laatsteTik = useRef<number | null>(null)
  const segmenten = donutSegmenten(items)
  if (segmenten.length === 0) return null
  const totaal = segmenten.reduce((s, seg) => s + seg.bedrag, 0)
  const enkel = segmenten.length === 1
  // Percentages in één keer berekend, zodat de legende netjes op 100% uitkomt.
  const percentages = afgerondePercentages(segmenten.map((seg) => seg.bedrag))

  // Buiten bereik raken kan wanneer de lijst korter wordt terwijl er iets gekozen
  // was (bv. na een maandwissel); dan valt de keuze gewoon terug op het totaal.
  const actief = interactief && gekozen !== null && gekozen < segmenten.length ? segmenten[gekozen] : null
  const actiefPct = actief && gekozen !== null ? percentages[gekozen] : null

  // Voor hulpsoftware: één zin met alles erin. Hangen en tikken bestaan daar niet,
  // dus de volledige inhoud hoort in het toegankelijke label te staan.
  const beschrijving = segmenten.map((seg, i) => `${seg.naam} ${percentages[i]}% ${formatEuro(seg.bedrag)}`).join('; ')

  // Wat er boven het bedrag staat: de naam van de gekozen schijf (afgebroken zodat
  // ze in het gat past) of het woord 'uitgaven'/'inkomsten' als er niets gekozen is.
  const naamRegels = actief ? splitsLabel(actief.naam) : [t(middenLabel)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <svg
        viewBox={`0 0 ${GROOTTE} ${GROOTTE}`}
        width={grootte}
        height={grootte}
        role="img"
        aria-label={
          interactief
            ? t('{label} per categorie: {inhoud}', { label: t(middenLabel), inhoud: beschrijving })
            : t('{label} per categorie', { label: t(middenLabel) })
        }
        // De hele tekening loslaten telt als "niets gekozen": anders blijft de
        // laatste schijf hangen wanneer je met de muis weggaat tussen twee
        // schijven door.
        onMouseLeave={
          interactief
            ? () => {
                laatsteTik.current = null
                setGekozen(null)
              }
            : undefined
        }
        className={interactief ? 'donut donut-interactief' : 'donut'}
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
      >
        {enkel ? (
          <circle
            cx={MIDDEN}
            cy={MIDDEN}
            r={(BUITEN + BINNEN) / 2}
            fill="none"
            stroke={segmenten[0].kleur}
            strokeWidth={BUITEN - BINNEN}
          />
        ) : (
          segmenten.map((seg, i) => (
            // Een haarlijntje in de kaartkleur scheidt de schijven zacht van elkaar.
            // De sleutel bevat de plaats in de lijst: twee schijven mogen dezelfde
            // naam dragen (bv. tweemaal 'Onbekend') zonder elkaar te verdringen.
            <path
              key={`${i}-${seg.naam}`}
              d={segmentPad(seg.start, seg.eind)}
              fill={seg.kleur}
              stroke="var(--surface)"
              strokeWidth={1.5}
              className="donut-schijf"
              transform={gekozen === i ? uitschuif(seg.start, seg.eind) : undefined}
              onMouseEnter={interactief ? () => setGekozen(i) : undefined}
              // Op een telefoon bestaat 'hangen' niet: daar is één tik de manier om
              // te kiezen. Nog eens tikken zet de donut terug op het totaal.
              onClick={
                interactief
                  ? () => {
                      const opnieuw = laatsteTik.current === i
                      laatsteTik.current = opnieuw ? null : i
                      setGekozen(opnieuw ? null : i)
                    }
                  : undefined
              }
              style={interactief ? { cursor: 'pointer' } : undefined}
            />
          ))
        )}
        {/* De naam van de gekozen schijf, over hoogstens twee regels. De hele blok
            tekst schuift een beetje omhoog wanneer er twee regels staan, zodat het
            geheel in het gat gecentreerd blijft. */}
        <text
          x={MIDDEN}
          y={MIDDEN - (actief ? 6 + (naamRegels.length - 1) * 11 : 5)}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--tekst-xs)', fill: 'var(--text-subtle)' }}
        >
          {naamRegels.map((regel, i) => (
            <tspan key={i} x={MIDDEN} dy={i === 0 ? 0 : 11}>
              {regel}
            </tspan>
          ))}
        </text>
        <text
          x={MIDDEN}
          y={actief ? MIDDEN + 12 : MIDDEN + 14}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--tekst-m)', fontWeight: 600, fill: 'var(--text)' }}
        >
          {formatEuro(actief ? actief.bedrag : totaal)}
        </text>
        {actief && (
          <text
            x={MIDDEN}
            y={MIDDEN + 28}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--tekst-xs)', fill: 'var(--text-muted)' }}
          >
            {actiefPct}%
          </text>
        )}
      </svg>

      {toonLegende && (
        <ul className="lijst">
          {segmenten.map((seg, i) => (
            <li key={`${i}-${seg.naam}`} className="rij">
              <span style={{ ...stip, background: seg.kleur }} />
              <span className="rij-midden">
                <span className="rij-titel" style={afkap}>
                  {seg.naam}
                </span>
                <span className="rij-meta">{percentages[i]}%</span>
              </span>
              <Bedrag centen={seg.bedrag} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
