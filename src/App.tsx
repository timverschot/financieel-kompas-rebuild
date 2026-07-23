import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Rekening, Transactie } from './data/schema'
import {
  bewaarRekening,
  bewaarTransactie,
  laadRekeningen,
  laadTransacties,
  verwijderTransactie,
} from './data/repository'
import { seedIndienLeeg } from './data/seed'
import { synchroniseer } from './data/sync/sync'
import { DriveBackend } from './data/sync/drive/driveBackend'
import { vraagToken } from './data/sync/drive/auth'
import { TransactieFormulier } from './components/TransactieFormulier'
import { RekeningFormulier } from './components/RekeningFormulier'
import { formatEuro } from './utils/format'

const container: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 480,
  margin: '2rem auto',
  padding: '0 1rem',
}

const knop: CSSProperties = {
  padding: '0.5rem 0.9rem',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#f7f7f7',
  cursor: 'pointer',
}

const kop: CSSProperties = { fontSize: '1rem', marginBottom: '0.25rem' }

export function App() {
  const [transacties, setTransacties] = useState<Transactie[] | null>(null)
  const [rekeningen, setRekeningen] = useState<Rekening[]>([])
  const [ongeldig, setOngeldig] = useState(0)
  const [verbonden, setVerbonden] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [statusTekst, setStatusTekst] = useState<string | null>(null)
  const backendRef = useRef<DriveBackend | null>(null)

  async function herlaad() {
    const [tx, rk] = await Promise.all([laadTransacties(), laadRekeningen()])
    setTransacties(tx.geldig)
    setOngeldig(tx.ongeldig)
    setRekeningen(rk.geldig)
  }

  useEffect(() => {
    let actief = true
    async function laad() {
      await seedIndienLeeg()
      const [tx, rk] = await Promise.all([laadTransacties(), laadRekeningen()])
      if (!actief) return
      setTransacties(tx.geldig)
      setOngeldig(tx.ongeldig)
      setRekeningen(rk.geldig)
    }
    void laad()
    return () => {
      actief = false
    }
  }, [])

  async function voegTransactieToe(t: Transactie) {
    await bewaarTransactie(t)
    await herlaad()
  }

  async function voegRekeningToe(r: Rekening) {
    await bewaarRekening(r)
    await herlaad()
  }

  async function verwijder(id: string) {
    await verwijderTransactie(id)
    await herlaad()
  }

  async function verbindEnSynchroniseer() {
    setBezig(true)
    setStatusTekst(null)
    try {
      await vraagToken(true) // opent zo nodig het Google-aanmeldvenster
      setVerbonden(true)
      if (!backendRef.current) backendRef.current = new DriveBackend()
      const r = await synchroniseer(backendRef.current)
      await herlaad()
      setStatusTekst(`Gesynchroniseerd: ${r.gepusht} verstuurd, ${r.opgehaald} opgehaald.`)
    } catch (e) {
      setStatusTekst('Verbinden mislukte: ' + (e instanceof Error ? e.message : 'onbekende fout'))
    } finally {
      setBezig(false)
    }
  }

  async function synchroniseerNu() {
    if (!backendRef.current) return
    setBezig(true)
    try {
      const r = await synchroniseer(backendRef.current)
      await herlaad()
      setStatusTekst(`Gesynchroniseerd: ${r.gepusht} verstuurd, ${r.opgehaald} opgehaald.`)
    } catch (e) {
      setStatusTekst('Synchroniseren mislukte: ' + (e instanceof Error ? e.message : 'onbekende fout'))
    } finally {
      setBezig(false)
    }
  }

  if (transacties === null) {
    return (
      <main style={container}>
        <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
        <p style={{ color: '#666' }}>Laden…</p>
      </main>
    )
  }

  const totaalSaldo =
    rekeningen.reduce((som, r) => som + r.beginsaldo, 0) +
    transacties.reduce((som, t) => som + t.bedrag, 0)

  return (
    <main style={container}>
      <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
      <p style={{ color: '#666', marginTop: 4 }}>
        Rekeningen en transacties beheren — met schemabewaking, backup en synchronisatie
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

      <section>
        <h2 style={kop}>Rekeningen</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rekeningen.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.3rem 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span>{r.naam}</span>
              <span style={{ color: '#888' }}>startsaldo {formatEuro(r.beginsaldo)}</span>
            </li>
          ))}
        </ul>
        <RekeningFormulier onToevoegen={voegRekeningToe} />
      </section>

      <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />

      <section>
        <h2 style={kop}>Transactie toevoegen</h2>
        <TransactieFormulier onToevoegen={voegTransactieToe} rekeningen={rekeningen} />
      </section>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.5rem' }}>
        {transacties.map((t) => (
          <li
            key={t.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span>{t.omschrijving}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: t.bedrag < 0 ? '#c0392b' : '#27ae60' }}>{formatEuro(t.bedrag)}</span>
              <button
                aria-label={`Verwijder ${t.omschrijving}`}
                onClick={() => verwijder(t.id)}
                style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ×
              </button>
            </span>
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
        <span>{formatEuro(totaalSaldo)}</span>
      </p>

      <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />

      <div>
        {!verbonden ? (
          <button style={knop} onClick={verbindEnSynchroniseer} disabled={bezig}>
            {bezig ? 'Bezig…' : 'Verbind met Google Drive'}
          </button>
        ) : (
          <button style={knop} onClick={synchroniseerNu} disabled={bezig}>
            {bezig ? 'Bezig…' : 'Synchroniseer nu'}
          </button>
        )}
        {statusTekst && <p style={{ color: '#666', marginTop: '0.75rem' }}>{statusTekst}</p>}
      </div>
    </main>
  )
}
