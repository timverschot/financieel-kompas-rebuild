import { bepaalBalans } from '../utils/balans'
import { formatEuro } from '../utils/format'
import { Herkomstregel } from '../ui/Herkomstregel'
import { useT } from '../i18n'

// Eén regel onder de maandcijfers die zegt wát het netto-bedrag betekent:
// overschot, tekort of exact in balans. Dat zijn de drie uitkomsten die elke
// uitleg over budgetteren gebruikt, en de app benoemde ze tot nu toe niet.
//
// Bewust géén kaart met kop: het is een korte, rustige regel bij de cijfers die
// er al staan, niet een nieuw blok dat om aandacht vraagt.
//
// Sinds ronde 31 kan ze ook KAAL: dan tekent ze haar eigen kaartvlak niet, omdat
// ze binnen het kengetallenblok van het Overzicht staat. Drie losse kaartjes onder
// elkaar die alle drie over hetzelfde maandcijfer gaan, was precies de rommeligheid
// die daar weg moest.
export function BalansRegel({ inkomsten, uitgaven, kaal = false }: { inkomsten: number; uitgaven: number; kaal?: boolean }) {
  const { t } = useT()
  const { stand, verschil, leeg } = bepaalBalans(inkomsten, uitgaven)

  // Niets geboekt deze maand: dan is "in balans" misleidend, dus zwijgen we.
  if (leeg) return null

  const toon = stand === 'overschot' ? 'ok' : stand === 'tekort' ? 'let-op' : 'neutraal'
  const label = stand === 'overschot' ? t('Overschot') : stand === 'tekort' ? t('Tekort') : t('In balans')
  const uitleg =
    stand === 'overschot'
      ? t('Je houdt deze maand {bedrag} over. Dat is het deel dat naar sparen of een doel kan.', {
          bedrag: formatEuro(verschil),
        })
      : stand === 'tekort'
        ? t('Je geeft deze maand {bedrag} meer uit dan er binnenkomt. Dat komt uit je spaargeld of van je rekening.', {
            bedrag: formatEuro(verschil),
          })
        : t('Inkomsten en uitgaven zijn deze maand exact gelijk: je houdt niets over, maar komt ook niets tekort.')

  return (
    <Herkomstregel badge={label} toon={toon} kaal={kaal} data-balans="1">
      {uitleg}
    </Herkomstregel>
  )
}
