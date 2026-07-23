import { useState } from 'react'

// Een klein, getypeerd datamodel. TypeScript bewaakt dat elk 'bedrag' echt een
// getal is en elke transactie de juiste velden heeft - fouten worden gevangen
// vóór de app draait, in plaats van als crash bij de gebruiker.
export type Transactie = {
  id: string
  omschrijving: string
  bedrag: number // positief = inkomst, negatief = uitgave
}

const beginTransacties: Transactie[] = [
  { id: '1', omschrijving: 'Loon', bedrag: 2400 },
  { id: '2', omschrijving: 'Huur', bedrag: -950 },
  { id: '3', omschrijving: 'Boodschappen', bedrag: -320 },
]

export function App() {
  const [transacties] = useState<Transactie[]>(beginTransacties)
  const saldo = transacties.reduce((som, t) => som + t.bedrag, 0)

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
      <p style={{ color: '#666', marginTop: 4 }}>
        Fase 0 — nieuwe fundering (React + TypeScript + buildstap)
      </p>

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

export function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(bedrag)
}
