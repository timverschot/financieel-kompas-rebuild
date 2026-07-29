import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { donutSegmenten, afgerondePercentages, splitsLabel, type DonutInvoer, type DonutSegment } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { Bedrag } from '../ui/basis'
import { useT } from '../i18n'

// Geometrie van de donut. Puur vormgeving: een iets ruimer gat en een dunnere
// ring, zodat het middenlabel rustig ademt zoals in het designsysteem.
const GROOTTE = 190
const MIDDEN = GROOTTE / 2
const BUITEN = 84
const BINNEN = 58

/**
 * De marge rondom de donut, in tekeneenheden.
 *
 * Waarom dit er moet zijn: een SVG snijdt alles af wat buiten haar `viewBox`
 * valt, en die viewBox liep tot nu toe exact tot aan de buitenrand van de ring.
 * Zolang er niets bewoog was dat geen probleem. Maar sinds de gekozen schijf
 * naar buiten schuift (9 eenheden) én groter wordt (6 %), komt haar buitenrand
 * op 95 + 84 × 1,06 + 9 ≈ 193 te liggen — drie eenheden voorbij de rand van een
 * vlak van 190. Precies daar werd ze afgesneden, aan een grens die je niet ziet.
 *
 * Het tekenvlak is nu aan alle kanten zes eenheden groter. Het getekende BEELD
 * blijft even groot als voorheen: de svg wordt in dezelfde verhouding breder
 * getekend (zie `vlakOpScherm`), dus de ring krimpt niet.
 */
const MARGE = 6
const VLAK = GROOTTE + 2 * MARGE

// Hoever een gekozen schijf naar buiten schuift, in tekeneenheden. Ronde 32:
// van 5 naar 9. Met 5 was de beweging er wel, maar zag je ze nauwelijks — de
// melding was letterlijk "de bewegende donutdelen zijn niet expressief genoeg".
const UITSCHUIF = 9

// Hoeveel de gekozen schijf groeit. Ze schuift niet alleen weg van het midden,
// ze wordt ook een tikje groter, zodat ze duidelijk vóór de rest komt te liggen.
const VERGROTING = 1.06

// Hoe zichtbaar de NIET-gekozen schijven blijven. Niet wegblenden tot bijna niets:
// je moet nog kunnen zien hoe groot het gekozen stuk is ten opzichte van de rest.
const GEDIMD = 0.42

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
 * Hoe een schijf beweegt wanneer je haar kiest: naar buiten, weg van het midden,
 * langs de lijn die door het hart van de schijf loopt — én een beetje groter.
 *
 * De volgorde van de drie stappen is niet vrij. SVG rekent transformaties van
 * links naar rechts af, en `scale` vergroot altijd vanaf het NULPUNT van de
 * tekening (linksboven), niet vanaf het midden. Daarom eerst naar het midden
 * schuiven, dan schalen, dan terug — anders vliegt de schijf naar rechtsonder
 * in plaats van te groeien waar ze ligt.
 */
function uitschuif(start: number, eind: number): string {
  const hoek = ((start + eind) / 2) * 2 * Math.PI
  const dx = Math.sin(hoek) * UITSCHUIF
  const dy = -Math.cos(hoek) * UITSCHUIF
  return [
    `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`,
    `translate(${MIDDEN} ${MIDDEN})`,
    `scale(${VERGROTING})`,
    `translate(${-MIDDEN} ${-MIDDEN})`,
  ].join(' ')
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
  onKies,
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
  /**
   * Doorklikken vanaf een schijf (ronde 40).
   *
   * Zonder deze prop is een donut een doodlopend beeld: je ziet dat Voeding
   * € 340 was en er is geen enkele weg naar de boekingen erachter.
   *
   * Twee handelingen, elk met één betekenis: een schijf AANTIKKEN kiest ze (naam,
   * bedrag en aandeel komen in het gat te staan), en de knop die daaronder
   * verschijnt gaat naar de boekingen. Nog eens op dezelfde schijf tikken laat de
   * keuze weer los.
   *
   * Waarom de knop en niet de tweede tik: een `<path>` in een SVG is niet met het
   * toetsenbord te bereiken en wordt door hulpsoftware niet als knop aangeboden.
   * Zonder die knop zou het doorklikken alleen voor muis- en aanraakgebruikers
   * bestaan — en zou er met `onKies` géén weg terug naar het totaal zijn.
   */
  onKies?: (segment: DonutSegment) => void
}) {
  const { t } = useT()
  const [gekozen, setGekozen] = useState<number | null>(null)
  /**
   * Welke schijf je het laatst AANGETIKT hebt (niet: waar je overheen hing).
   *
   * Waarom dit apart bijgehouden wordt: op een aanraakscherm stuurt de browser bij
   * één tik eerst een 'mouseenter' en dán pas de 'click'. Zou de klik simpelweg
   * omschakelen op basis van wat er gekozen is, dan zette de mouseenter de schijf
   * aan en zette de klik ze meteen weer uit — één tik en er gebeurde zichtbaar
   * niets. Door de tik met de VORIGE tik te vergelijken werkt aantikken en weer
   * loslaten op beide toestellen hetzelfde.
   *
   * Ronde 40: dit was een `useRef`. Dat kon niet meer, want de knop "Bekijk de
   * boekingen van …" hangt ervan af. Kwam de tik op een schijf waar je al met de
   * muis overheen hing, dan was `setGekozen` een no-op, sloeg React de hertekening
   * over, en bleef de mutatie van de ref onzichtbaar: de knop verscheen nooit.
   */
  const [getiktOp, setGetiktOp] = useState<number | null>(null)

  /**
   * Een keuze is een INDEX, en die betekent niets meer zodra de lijst iets anders
   * bevat. Wordt ze alleen korter, dan vangen de guards hieronder dat op — maar
   * blijft ze even lang met ándere categorieën erin, dan zou de keuze stil
   * meeverhuizen: je tikt "Wonen" aan bij de uitgaven, klikt op Inkomsten, en de
   * donut opent met een willekeurige inkomstenschijf uitgeschoven plus een knop
   * "Bekijk de boekingen van …" voor een keuze die je nooit maakte.
   *
   * Daarom wist een gewijzigde SAMENSTELLING de keuze. De vingerafdruk is een
   * string, zodat het effect niet bij elke render opnieuw loopt (`items` is bij
   * elke render een nieuwe array met dezelfde inhoud — de klassieke valkuil uit
   * "hang niet aan de vóórwerpen, hang aan de ID's").
   */
  const vingerafdruk = items.map((it) => it.sleutel ?? it.naam).join('|')
  useEffect(() => {
    setGekozen(null)
    setGetiktOp(null)
  }, [vingerafdruk])
  const segmenten = donutSegmenten(items)
  if (segmenten.length === 0) return null
  const totaal = segmenten.reduce((s, seg) => s + seg.bedrag, 0)
  const enkel = segmenten.length === 1
  // Percentages in één keer berekend, zodat de legende netjes op 100% uitkomt.
  const percentages = afgerondePercentages(segmenten.map((seg) => seg.bedrag))

  // Buiten bereik raken kan wanneer de lijst korter wordt terwijl er iets gekozen
  // was (bv. na een maandwissel); dan valt de keuze gewoon terug op het totaal.
  //
  // BELANGRIJK: overal dezelfde, afgeschermde index gebruiken. Stond de dimming
  // hieronder nog op de rauwe `gekozen`, dan kon je met een keuze op de zesde
  // schijf naar een maand met drie schijven bladeren en stonden ALLE schijven
  // verbleekt zonder gekozen schijf — een donut zonder uitweg.
  const gekozenGeldig = interactief && gekozen !== null && gekozen < segmenten.length ? gekozen : null
  const getiktGeldig = getiktOp !== null && getiktOp < segmenten.length ? getiktOp : null
  const actief = gekozenGeldig !== null ? segmenten[gekozenGeldig] : null
  const actiefPct = gekozenGeldig !== null ? percentages[gekozenGeldig] : null
  // Aangetikt (blijvend) of enkel aangewezen (vluchtig)? Alleen bij een tik hoort
  // de knop eronder te verschijnen; anders springt de pagina op en neer zodra je
  // met de muis over de grafiek beweegt.
  const getikt = gekozenGeldig !== null && getiktGeldig === gekozenGeldig
  // Doorklikken kan alleen wanneer de schijf een sleutel heeft. De uitsplitsing
  // per winkel groepeert op naam en heeft er geen — daar zou een knop staan die
  // nergens naartoe gaat.
  const kanDoor = Boolean(onKies && actief && actief.sleutel !== undefined)

  // Voor hulpsoftware: één zin met alles erin. Hangen en tikken bestaan daar niet,
  // dus de volledige inhoud hoort in het toegankelijke label te staan.
  const beschrijving = segmenten.map((seg, i) => `${t(seg.naam)} ${percentages[i]}% ${formatEuro(seg.bedrag)}`).join('; ')

  // Wat er boven het bedrag staat: de naam van de gekozen schijf (afgebroken zodat
  // ze in het gat past) of het woord 'uitgaven'/'inkomsten' als er niets gekozen is.
  const naamRegels = actief ? splitsLabel(t(actief.naam)) : [t(middenLabel)]

  // De maat waarop het tekenvlak (ring + marge) op het scherm komt. `grootte`
  // blijft betekenen "zo groot moet de ring zijn"; de marge komt daar bovenop,
  // zodat een uitgeschoven schijf ruimte heeft zonder dat de ring kleiner wordt.
  const vlakOpScherm = Math.round((grootte * VLAK) / GROOTTE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <svg
        viewBox={`${-MARGE} ${-MARGE} ${VLAK} ${VLAK}`}
        width={vlakOpScherm}
        height={vlakOpScherm}
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
                // Een keuze die je door AANWIJZEN maakte, laat je los zodra je
                // weggaat. Een keuze die je AANKLIKTE, blijft staan.
                //
                // Dat verschil is er niet voor de sier (ronde 40): de knop
                // "Bekijk de boekingen van …" staat onder de grafiek, dus je
                // verlaat de svg om ze te bereiken. Wiste elke muisbeweging de
                // keuze, dan verdween die knop precies op het moment dat je hem
                // wou aanklikken.
                if (getiktGeldig !== null) return
                setGekozen(null)
              }
            : undefined
        }
        className={interactief ? 'donut donut-interactief' : 'donut'}
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
      >
        {enkel ? (
          // Eén categorie wordt als volle ring getekend in plaats van als schijf.
          // Die ring krijgt dezelfde handlers: zonder dat was er bij precies één
          // categorie geen enkele weg naar de boekingen erachter.
          <circle
            cx={MIDDEN}
            cy={MIDDEN}
            r={(BUITEN + BINNEN) / 2}
            fill="none"
            stroke={segmenten[0].kleur}
            strokeWidth={BUITEN - BINNEN}
            className="donut-schijf"
            onMouseEnter={
              interactief
                ? () => {
                    if (getiktGeldig !== null) return
                    setGekozen(0)
                  }
                : undefined
            }
            onClick={
              interactief
                ? () => {
                    const opnieuw = getiktGeldig === 0
                    setGetiktOp(opnieuw ? null : 0)
                    setGekozen(opnieuw ? null : 0)
                  }
                : undefined
            }
            style={interactief ? { cursor: 'pointer' } : undefined}
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
              transform={gekozenGeldig === i ? uitschuif(seg.start, seg.eind) : undefined}
              // De rest dimt weg zodra je er één kiest. Dat is wat het aanwijzen
              // expressief maakt: niet alleen de gekozen schijf komt naar voren,
              // de anderen stappen ook een beetje terug.
              opacity={gekozenGeldig !== null && gekozenGeldig !== i ? GEDIMD : 1}
              // Aanwijzen verandert de keuze NIET wanneer je er al een aangetikt
              // hebt. Anders ging je met de muis van Voeding naar de knop eronder,
              // passeerde je Wonen, en heette de knop ineens "Bekijk de boekingen
              // van Wonen".
              onMouseEnter={
                interactief
                  ? () => {
                      if (getiktGeldig !== null) return
                      setGekozen(i)
                    }
                  : undefined
              }
              // Op een telefoon bestaat 'hangen' niet: daar is één tik de manier om
              // te kiezen. Nog eens tikken zet de donut terug op het totaal.
              onClick={
                interactief
                  ? () => {
                      // Nog eens op dezelfde schijf tikken laat de keuze los; de
                      // donut staat dan weer op het totaal. Doorklikken gebeurt via
                      // de knop eronder — één handeling, één betekenis. Zou de
                      // tweede tik doorklikken, dan was er met `onKies` geen weg
                      // meer terug naar het totaal.
                      const opnieuw = getiktGeldig === i
                      setGetiktOp(opnieuw ? null : i)
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

      {/* De toegankelijke weg naar dezelfde boekingen. Verschijnt pas zodra er
          een schijf gekozen is, zodat er in rust geen knop staat die nergens
          heen wijst. */}
      {kanDoor && getikt && actief && onKies && (
        <div className="knoprij" style={{ justifyContent: 'center' }}>
          <button type="button" className="knop knop-ghost knop-klein" onClick={() => onKies(actief)}>
            {t('Bekijk de boekingen van {naam} ›', { naam: t(actief.naam) })}
          </button>
        </div>
      )}

      {toonLegende && (
        <ul className="lijst">
          {segmenten.map((seg, i) => (
            <li key={`${i}-${seg.naam}`} className="rij">
              <span style={{ ...stip, background: seg.kleur }} />
              <span className="rij-midden">
                <span className="rij-titel" style={afkap}>
                  {t(seg.naam)}
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
