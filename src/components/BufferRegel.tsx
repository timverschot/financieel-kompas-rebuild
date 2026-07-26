import type { Overboeking, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { bepaalBuffer } from '../utils/buffer'
import { formatEuro } from '../utils/format'
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
  vandaagISO,
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  terugkerendePosten: TerugkerendePost[]
  vandaagISO: string
}) {
  const { t } = useT()
  const b = bepaalBuffer(rekeningen, transacties, overboekingen, terugkerendePosten, vandaagISO)
  if (!b.bruikbaar || b.maanden === null) return null

  // Eén decimaal, naar beneden: liever een halve maand te voorzichtig dan te
  // optimistisch over hoelang je toekomt.
  const maanden = Math.floor(b.maanden * 10) / 10
  const krap = maanden < 3

  return (
    <div
      className="kaart kaart-compact"
      data-buffer
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
    >
      <span className={krap ? 'badge badge-laat' : 'badge badge-info'}>
        {/* Exact één maand krijgt het enkelvoud; "1 maanden buffer" zou fout staan. */}
        {maanden === 1 ? t('1 maand buffer') : t('{n} maanden buffer', { n: maanden.toLocaleString('nl-BE') })}
      </span>
      <span className="rij-meta" style={{ flex: 1, minWidth: 220 }}>
        {t(
          'Je vaste lasten zijn {last} per maand. Met {geld} op je spaar- en cashrekeningen kom je zo lang toe zonder inkomen — eten en tanken komen daar nog bij.',
          { last: formatEuro(b.vasteLastenPerMaand), geld: formatEuro(b.beschikbaar) },
        )}
      </span>
    </div>
  )
}
