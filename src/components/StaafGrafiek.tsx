import { formatEuro } from '../utils/format'
import type { MaandBedrag } from '../utils/maandverloop'

function maandKort(maand: string): string {
  const [jaar, m] = maand.split('-').map(Number)
  return new Intl.DateTimeFormat('nl-BE', { month: 'short' }).format(new Date(jaar, m - 1, 1))
}

// Eenvoudige staafgrafiek van de uitgaven per maand. De laatste (huidige) maand
// krijgt een accentkleur.
export function StaafGrafiek({ data }: { data: MaandBedrag[] }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.bedrag), 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: 110 }}>
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
                  minHeight: d.bedrag > 0 ? 2 : 0,
                  background: laatste ? '#C56A1F' : '#E6B980',
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: 2 }}>
        {data.map((d) => (
          <div key={d.maand} style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: '#888' }}>
            {maandKort(d.maand)}
          </div>
        ))}
      </div>
    </div>
  )
}
