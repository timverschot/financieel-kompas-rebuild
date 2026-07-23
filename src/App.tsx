import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Transactie } from './data/schema'
import { laadTransacties } from './data/repository'
import { seedIndienLeeg } from './data/seed'
import { formatEuro } from './utils/format'

const container: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 480,
  margin: '2rem auto',
  padding: '0 1rem',
}

export function App() {
  const [transacties, setTransacties] = useState<Transactie[] | null>(null)
  const [ongeldig, setOngeldig] = useState(0)

  useEffect(() => {
    let actief = true
    async function laad() {
      await seedIndienLeeg()
      const res = await laadTransacties()
      if (!actief) return
      setTransacties(res.geldig)
      setOngeldig(res.ongeldig)
    }
    void laad()
    return () => {
      actief = false
    }
  }, [])

  if (transacties === null) {
    return (
      <main style={container}>
        <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
        <p style={{ color: '#666' }}>Laden…</p>
      </main>
    )
  }

  const saldo = transacties.reduce((som, t) => som + t.bedrag, 0)

  return (
    <main style={container}>
      <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
      <p style={{ color: '#666', marginTop: 4 }}>
        Fase 2 — elke wijziging wordt als logboek bewaard (klaar voor Drive-sync)
      </p>

      {ongeldig > 0 && (
        <p
          style={{
            background: '#fff5f5',
            border: '1px solid #f5c6cb',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
          }}
        >
          Let op: {ongeldig} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {transacties.map((t) => (
          <li
            key={t.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span>{t.omschrijving}</span>
            <span style={{ color: t.bedrag < 0 ? '#c0392b' : '#27ae60' }}>{formatEuro(t.bedrag)}</span>
          </li>
        ))}
      </ul>

      <p
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          marginTop: '1rem',
        }}
      >
        <span>Saldo</span>
        <span>{formatEuro(saldo)}</span>
      </p>
    </main>
  )
}
