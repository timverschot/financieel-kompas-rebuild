import { formatEuro } from '../utils/format'
import { gemiddeldeVolleMaanden, type MaandPaar } from '../utils/maandverloop'
import { maandKort, maandVoluit } from '../utils/datum'
import { Leeg } from '../ui/basis'
import { useT } from '../i18n'

// Inkomsten en uitgaven per maand, naast elkaar.
//
// Wat hier daarvóór stond: zes kale staafjes met alleen de uitgaven. Geen bedrag,
// geen schaal, geen referentiepunt — je zag enkel dat de ene maand hoger was dan
// de andere. En omdat de LOPENDE maand nog niet af is, stond die altijd te laag;
// de grafiek suggereerde dus elke maand opnieuw dat je zuiniger geworden was.
//
// Wat er nu staat, en waarom elk stuk er is:
//  - twee staven per maand (binnen en buiten), want de vraag is niet "hoeveel gaf
//    ik uit" maar "hield ik over";
//  - een stippellijn op je GEMIDDELDE uitgaven, zodat elke maand een referentie
//    heeft in plaats van alleen de hoogste maand van de reeks;
//  - de lopende maand gearceerd, met de melding dat ze nog loopt. Zo lees je een
//    lage laatste staaf niet als vooruitgang.
//
// Het gemiddelde telt de lopende maand NIET mee (zie gemiddeldeVolleMaanden):
// anders zou een halve maand de lat elke keer verlagen.

const HOOGTE = 132

export function MaandGrafiek({ data, lopendeMaand }: { data: MaandPaar[]; lopendeMaand: string }) {
  const { t } = useT()
  if (data.length === 0) return null

  const max = Math.max(...data.flatMap((d) => [d.inkomsten, d.uitgaven]), 1)
  const gem = gemiddeldeVolleMaanden(data, lopendeMaand)
  // Alles nul? Dan is een grafiek met platte staven en een lijn op nul misleidend
  // druk; één regel tekst zegt hetzelfde.
  if (max <= 1) return <Leeg>{t('Nog niets geboekt in deze maanden.')}</Leeg>

  const gemHoogte = gem ? Math.round((gem.uitgaven / max) * 100) : null

  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, height: HOOGTE }}>
        {/* De gemiddelde-lijn ligt ACHTER de staven en loopt over de volle breedte,
            zodat je per maand meteen ziet of je erboven of eronder zat. */}
        {gemHoogte !== null && gemHoogte > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${gemHoogte}%`,
              borderTop: '1px dashed var(--text-subtle)',
              opacity: 0.7,
            }}
          />
        )}

        {data.map((d, i) => {
          const loopt = d.maand === lopendeMaand
          const inHoog = Math.round((d.inkomsten / max) * 100)
          const uitHoog = Math.round((d.uitgaven / max) * 100)
          // Elke maand begint een tikje later dan de vorige, zodat de grafiek zich
          // van links naar rechts opbouwt in plaats van in één klap te staan. De
          // vertraging hoort hier en niet in de CSS: alleen deze component weet
          // hoeveel maanden er zijn.
          const vertraging = `${i * 60}ms`
          const label = `${maandKort(d.maand)}: ${t('in')} ${formatEuro(d.inkomsten)}, ${t('uit')} ${formatEuro(d.uitgaven)}${loopt ? ` (${t('loopt nog')})` : ''}`
          return (
            <div
              key={d.maand}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: '100%' }}
              title={label}
              role="img"
              aria-label={label}
            >
              <span
                className="staaf-in print-kleur"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: `${inHoog}%`,
                  minHeight: d.inkomsten > 0 ? 3 : 0,
                  borderRadius: '6px 6px 0 0',
                  background: 'var(--positive)',
                  opacity: loopt ? 0.55 : 1,
                  animationDelay: vertraging,
                }}
              />
              <span
                className="staaf-in print-kleur"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: `${uitHoog}%`,
                  minHeight: d.uitgaven > 0 ? 3 : 0,
                  borderRadius: '6px 6px 0 0',
                  background: 'var(--negative)',
                  opacity: loopt ? 0.55 : 1,
                  animationDelay: vertraging,
                }}
              />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
        {data.map((d) => (
          <div key={d.maand} className="rij-meta" style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            {/* Op een breed scherm de maand voluit ("juli"), op een telefoon de
                afkorting ("jul"). Er staat er altijd precies één in beeld; de
                andere is met CSS verborgen. */}
            <span className="alleen-smal">{maandKort(d.maand)}</span>
            <span className="alleen-breed">{maandVoluit(d.maand)}</span>
            {d.maand === lopendeMaand && <span aria-hidden> *</span>}
          </div>
        ))}
      </div>

      {/* De uitleg onder de grafiek: wat de kleuren zijn, wat de lijn is, en
          waarom de laatste staaf laag staat. Zonder deze drie regels blijft het
          een plaatje waar je zelf betekenis in moet zoeken. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', paddingTop: 10 }}>
        <span className="rij-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="print-kleur" aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--positive)' }} />
          {t('Inkomsten')}
        </span>
        <span className="rij-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="print-kleur" aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--negative)' }} />
          {t('Uitgaven')}
        </span>
        {/* Geen gemiddelde tonen zolang het nul is: dan heb je nog geen volle maand
            met cijfers, en "gemiddeld € 0,00 per maand" is enkel ruis. */}
        {gem && gem.uitgaven > 0 && (
          <span className="rij-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ width: 14, borderTop: '1px dashed var(--text-subtle)' }} />
            {t('Gemiddeld {bedrag} per maand', { bedrag: formatEuro(gem.uitgaven) })}
          </span>
        )}
      </div>
      {/* De voetnoot hoort bij het sterretje, en dat sterretje staat alleen bij de
          lopende maand. Ronde 40: hij werd altijd afgedrukt, dus bladerde je terug
          naar een venster zonder de huidige maand, dan verklaarde de app een
          sterretje dat nergens stond. */}
      {data.some((d) => d.maand === lopendeMaand) && (
        <p className="rij-meta" style={{ margin: '4px 0 0' }}>
          {t('* Deze maand loopt nog, dus die staaf is nog niet volledig.')}
        </p>
      )}
    </div>
  )
}
