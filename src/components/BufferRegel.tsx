import type { Overboeking, Rekening, TerugkerendePost, Transactie, Waardering } from '../data/schema'
import { BUFFER_PLAFOND, bepaalBuffer } from '../utils/buffer'
import { opmaakLocale } from '../utils/opmaaktaal'
import { formatEuro } from '../utils/format'
import { Herkomstregel } from '../ui/Herkomstregel'
import { useT } from '../i18n'

// Hoeveel maanden je vaste lasten je spaargeld nog kan dragen. Eén rustige regel,
// naast de balansregel, in dezelfde vorm.
//
// Ze verschijnt alleen wanneer het cijfer iets betekent: er moet minstens één
// rekening als spaar of cash gemarkeerd zijn én er moeten vaste lasten ingevoerd
// zijn. Anders zou het "oneindig veel maanden" of "nul" zijn, en dat zegt niets.
export function BufferRegel({
  rekeningen,
  transacties,
  overboekingen,
  terugkerendePosten,
  waarderingen,
  vandaagISO,
  kaal = false,
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  terugkerendePosten: TerugkerendePost[]
  waarderingen: Waardering[]
  vandaagISO: string
  /** Zonder eigen kaartvlak, voor gebruik binnen een groter blok. */
  kaal?: boolean
}) {
  const { t } = useT()
  const b = bepaalBuffer(rekeningen, transacties, overboekingen, terugkerendePosten, waarderingen, vandaagISO)
  if (!b.bruikbaar || b.maanden === null) return null

  // Eén decimaal, naar beneden: liever een halve maand te voorzichtig dan te
  // optimistisch over hoelang je toekomt.
  const maanden = Math.floor(b.maanden * 10) / 10
  const krap = maanden < 3
  // ⚠ RONDE 104 — EEN PLAFOND, WANT ÉÉN RECORD KANTELDE DIT OORDEEL.
  // De badge verschijnt zodra er één vaste last staat. Wie zijn app net opzet, als eerste
  // ding Netflix invult en € 5.000 op zijn spaarrekening heeft, kreeg te lezen:
  // **"5.050,5 maanden buffer"** — ruim vierhonderd jaar. Het cijfer is niet fout gerekend,
  // maar het is geen oordeel meer: het zegt alleen dat de opstelling nog niet af is.
  // Boven de grens noemt de app geen getal meer maar zegt ze "meer dan 24 maanden". Dat is
  // ook eerlijker over wat dit cijfer kán: eten en tanken zitten er niet in, en dat staat
  // in de zin ernaast met zoveel woorden.
  const boven = maanden > BUFFER_PLAFOND

  return (
    <Herkomstregel
      badge={
        // Exact één maand krijgt het enkelvoud; "1 maanden buffer" zou fout staan.
        boven
          ? t('meer dan {n} maanden buffer', { n: BUFFER_PLAFOND })
          : maanden === 1
            ? t('1 maand buffer')
            : t('{n} maanden buffer', { n: maanden.toLocaleString(opmaakLocale()) })
      }
      toon={krap ? 'let-op' : 'info'}
      kaal={kaal}
      data-buffer="1"
    >
      {t(
        'Je vaste lasten zijn {last} per maand. Met {geld} op je spaar- en cashrekeningen kom je zo lang toe zonder inkomen — eten en tanken komen daar nog bij.',
        { last: formatEuro(b.vasteLastenPerMaand), geld: formatEuro(b.beschikbaar) },
      )}
    </Herkomstregel>
  )
}
