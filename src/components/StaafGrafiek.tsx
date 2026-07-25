import { formatEuro } from '../utils/format'
import type { MaandBedrag } from '../utils/maandverloop'

function maandKort(maand: string): string {
  const [jaar, m] = maand.split('-').map(Number)
  return new Intl.DateTimeFormat('nl-BE', { month: 'short' }).format(new Date(jaar, m - 1, 1))
}

// Eenvoudige staafgrafiek van de uitgaven per maand. De laatste (huidige) maand
// krijgt de amberkleur, de rest een zachtere tint. Deze component zet bewust geen
// eigen kaart om zichzelf: ze staat altijd ín een <Kaart> van de pagina.
export function StaafGrafiek({ data }: { data: MaandBedrag[] }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.bedrag), 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
        {data.map((d, i) => {
          const hoogte = Math.round((d.bedrag / max) * 100)
          const laatste = i === data.length - 1
          return (
            <div
              key={d.maand}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
              title={`${maandKort(d.maand)}: ${formatEuro(d.bedrag)}`}
            >
              <div
                role="img"
                aria-label={`${maandKort(d.maand)}: ${formatEuro(d.bedrag)}`}
                style={{
                  width: '100%',
                  height: `${hoogte}%`,
                  minHeight: d.bedrag > 0 ? 3 : 0,
                  background: laatste ? 'var(--accent)' : 'var(--accent-dot)',
                  opacity: laatste ? 1 : 0.55,
                  borderRadius: '8px 8px 0 0',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 0, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
        {data.map((d) => (
          <div key={d.maand} className="rij-meta" style={{ flex: 1, textAlign: 'center' }}>
            {maandKort(d.maand)}
          </div>
        ))}
      </div>
    </div>
  )
}
