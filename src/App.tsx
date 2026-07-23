import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Budget,
  Categorie,
  Dossier,
  GedeeldeKost,
  Rekening,
  TerugkerendePost,
  Transactie,
  Verrekening,
} from './data/schema'
import {
  bewaarBudget,
  bewaarCategorie,
  bewaarDossier,
  bewaarGedeeldeKost,
  bewaarRekening,
  bewaarTerugkerendePost,
  bewaarTransactie,
  bewaarVerrekening,
  laadBudgetten,
  laadCategorieen,
  laadDossiers,
  laadGedeeldeKosten,
  laadRekeningen,
  laadTerugkerendePosten,
  laadTransacties,
  laadVerrekeningen,
  verwijderGedeeldeKost,
  verwijderTerugkerendePost,
  verwijderTransactie,
} from './data/repository'
import { seedIndienLeeg } from './data/seed'
import { synchroniseer } from './data/sync/sync'
import { DriveBackend } from './data/sync/drive/driveBackend'
import { vraagToken } from './data/sync/drive/auth'
import { TransactieFormulier } from './components/TransactieFormulier'
import { RekeningFormulier } from './components/RekeningFormulier'
import { CategorieFormulier } from './components/CategorieFormulier'
import { BudgetFormulier } from './components/BudgetFormulier'
import { DossierSectie } from './components/DossierSectie'
import { IndexatieCalculator } from './components/IndexatieCalculator'
import { TerugkerendeSectie } from './components/TerugkerendeSectie'
import { saldoVerrekening } from './utils/dossier'
import { nieuwId } from './data/sync/id'
import { uitgavenInMaand } from './utils/budget'
import { maandInkomsten, maandUitgaven, uitgavenPerCategorie } from './utils/overzicht'
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
const scheiding: CSSProperties = { margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }

const huidigeMaand = () => new Date().toISOString().slice(0, 7)

function verschuifMaand(maand: string, delta: number): string {
  const [jaar, m] = maand.split('-').map(Number)
  const d = new Date(jaar, m - 1 + delta, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

function maandLabel(maand: string): string {
  const [jaar, m] = maand.split('-').map(Number)
  return new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(new Date(jaar, m - 1, 1))
}

export function App() {
  const [transacties, setTransacties] = useState<Transactie[] | null>(null)
  const [rekeningen, setRekeningen] = useState<Rekening[]>([])
  const [categorieen, setCategorieen] = useState<Categorie[]>([])
  const [budgetten, setBudgetten] = useState<Budget[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [gedeeldeKosten, setGedeeldeKosten] = useState<GedeeldeKost[]>([])
  const [verrekeningen, setVerrekeningen] = useState<Verrekening[]>([])
  const [terugkerendePosten, setTerugkerendePosten] = useState<TerugkerendePost[]>([])
  const [ongeldig, setOngeldig] = useState(0)
  const [verbonden, setVerbonden] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [statusTekst, setStatusTekst] = useState<string | null>(null)
  const [bewerkTransactie, setBewerkTransactie] = useState<Transactie | null>(null)
  const [maand, setMaand] = useState(huidigeMaand())
  const backendRef = useRef<DriveBackend | null>(null)

  async function herlaad() {
    const [tx, rk, cat, bud, dos, kos, ver, tkp] = await Promise.all([
      laadTransacties(),
      laadRekeningen(),
      laadCategorieen(),
      laadBudgetten(),
      laadDossiers(),
      laadGedeeldeKosten(),
      laadVerrekeningen(),
      laadTerugkerendePosten(),
    ])
    setTransacties(tx.geldig)
    setOngeldig(tx.ongeldig)
    setRekeningen(rk.geldig)
    setCategorieen(cat.geldig)
    setBudgetten(bud.geldig)
    setDossiers(dos.geldig)
    setGedeeldeKosten(kos.geldig)
    setVerrekeningen(ver.geldig)
    setTerugkerendePosten(tkp.geldig)
  }

  useEffect(() => {
    let actief = true
    async function laad() {
      await seedIndienLeeg()
      const [tx, rk, cat, bud, dos, kos, ver, tkp] = await Promise.all([
        laadTransacties(),
        laadRekeningen(),
        laadCategorieen(),
        laadBudgetten(),
        laadDossiers(),
        laadGedeeldeKosten(),
        laadVerrekeningen(),
        laadTerugkerendePosten(),
      ])
      if (!actief) return
      setTransacties(tx.geldig)
      setOngeldig(tx.ongeldig)
      setRekeningen(rk.geldig)
      setCategorieen(cat.geldig)
      setBudgetten(bud.geldig)
      setDossiers(dos.geldig)
      setGedeeldeKosten(kos.geldig)
      setVerrekeningen(ver.geldig)
      setTerugkerendePosten(tkp.geldig)
    }
    void laad()
    return () => {
      actief = false
    }
  }, [])

  async function slaTransactieOp(t: Transactie) {
    await bewaarTransactie(t)
    await herlaad()
    setBewerkTransactie(null)
  }

  async function voegRekeningToe(r: Rekening) {
    await bewaarRekening(r)
    await herlaad()
  }

  async function voegCategorieToe(c: Categorie) {
    await bewaarCategorie(c)
    await herlaad()
  }

  async function voegBudgetToe(b: Budget) {
    await bewaarBudget(b)
    await herlaad()
  }

  async function voegDossierToe(d: Dossier) {
    await bewaarDossier(d)
    await herlaad()
  }

  async function voegGedeeldeKostToe(k: GedeeldeKost) {
    await bewaarGedeeldeKost(k)
    await herlaad()
  }

  async function verwijderKost(id: string) {
    await verwijderGedeeldeKost(id)
    await herlaad()
  }

  async function voegTerugkerendToe(p: TerugkerendePost) {
    await bewaarTerugkerendePost(p)
    await herlaad()
  }

  async function verwijderTerugkerend(id: string) {
    await verwijderTerugkerendePost(id)
    await herlaad()
  }

  async function boekTerugkerend(post: TerugkerendePost) {
    const dag = String(post.dag).padStart(2, '0')
    const t: Transactie = {
      id: `tk-${post.id}-${maand}`,
      datum: `${maand}-${dag}`,
      omschrijving: post.omschrijving,
      bedrag: post.bedrag,
      rekeningId: post.rekeningId,
      ...(post.categorieId ? { categorieId: post.categorieId } : {}),
    }
    await bewaarTransactie(t)
    await herlaad()
  }

  async function legAfrekeningVast(dossier: Dossier, openKosten: GedeeldeKost[]) {
    if (openKosten.length === 0) return
    const bedrag = saldoVerrekening(dossier.aandeelJij, openKosten)
    const verId = nieuwId()
    const datum = new Date().toISOString().slice(0, 10)
    await bewaarVerrekening({ id: verId, dossierId: dossier.id, datum, bedrag })
    for (const k of openKosten) {
      await bewaarGedeeldeKost({ ...k, verrekeningId: verId })
    }
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

  const categorieNaam = (id?: string) => (id ? categorieen.find((c) => c.id === id)?.naam : undefined)
  const totaalSaldo =
    rekeningen.reduce((som, r) => som + r.beginsaldo, 0) +
    transacties.reduce((som, t) => som + t.bedrag, 0)

  const inkomsten = maandInkomsten(transacties, maand)
  const uitgaven = maandUitgaven(transacties, maand)
  const perCategorie = uitgavenPerCategorie(transacties, categorieen, maand)

  return (
    <main style={container}>
      <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
      <p style={{ color: '#666', marginTop: 4 }}>
        Rekeningen, categorieën, budgetten en transacties — met backup en synchronisatie
      </p>

      {ongeldig > 0 && (
        <p style={{ background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
          Let op: {ongeldig} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.
        </p>
      )}

      <section>
        <h2 style={kop}>Maandoverzicht</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <button style={knop} aria-label="Vorige maand" onClick={() => setMaand(verschuifMaand(maand, -1))}>
            ‹
          </button>
          <span style={{ minWidth: 120, textAlign: 'center' }}>{maandLabel(maand)}</span>
          <button style={knop} aria-label="Volgende maand" onClick={() => setMaand(verschuifMaand(maand, 1))}>
            ›
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
          <span>Inkomsten</span>
          <span style={{ color: '#27ae60' }}>{formatEuro(inkomsten)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
          <span>Uitgaven</span>
          <span style={{ color: '#c0392b' }}>{formatEuro(uitgaven)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontWeight: 'bold' }}>
          <span>Netto</span>
          <span>{formatEuro(inkomsten - uitgaven)}</span>
        </div>
        {perCategorie.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
            {perCategorie.map((c) => (
              <li key={c.naam} style={{ display: 'flex', justifyContent: 'space-between', color: '#666', padding: '0.15rem 0' }}>
                <span>{c.naam}</span>
                <span>{formatEuro(c.bedrag)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>Rekeningen</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rekeningen.map((r) => (
            <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{r.naam}</span>
              <span style={{ color: '#888' }}>startsaldo {formatEuro(r.beginsaldo)}</span>
            </li>
          ))}
        </ul>
        <RekeningFormulier onToevoegen={voegRekeningToe} />
      </section>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>Categorieën</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {categorieen.map((c) => (
            <li key={c.id} style={{ padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}>
              {c.naam}
            </li>
          ))}
        </ul>
        <CategorieFormulier onToevoegen={voegCategorieToe} />
      </section>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>Budgetten</h2>
        <p style={{ color: '#888', marginTop: 0 }}>voor {maandLabel(maand)}</p>
        {budgetten.length === 0 && <p style={{ color: '#888' }}>Nog geen budgetten ingesteld.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {budgetten.map((b) => {
            const naam = categorieNaam(b.categorieId) ?? '—'
            const uitgegeven = uitgavenInMaand(transacties, b.categorieId, maand)
            const fractie = Math.min(uitgegeven / b.bedrag, 1)
            const kleur = uitgegeven > b.bedrag ? '#c0392b' : uitgegeven >= b.bedrag * 0.8 ? '#e67e22' : '#27ae60'
            return (
              <li key={b.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{naam}</span>
                  <span style={{ color: '#666' }}>
                    {formatEuro(uitgegeven)} / {formatEuro(b.bedrag)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={naam}
                  aria-valuenow={Math.round(uitgegeven)}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(b.bedrag)}
                  style={{ height: 8, background: '#eee', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}
                >
                  <div style={{ height: '100%', width: `${fractie * 100}%`, background: kleur }} />
                </div>
              </li>
            )
          })}
        </ul>
        {categorieen.length > 0 && <BudgetFormulier categorieen={categorieen} onOpslaan={voegBudgetToe} />}
      </section>

      <hr style={scheiding} />

      <TerugkerendeSectie
        posten={terugkerendePosten}
        rekeningen={rekeningen}
        categorieen={categorieen}
        transacties={transacties}
        maand={maand}
        maandLabel={maandLabel(maand)}
        onOpslaan={voegTerugkerendToe}
        onVerwijderen={verwijderTerugkerend}
        onBoek={boekTerugkerend}
      />

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>{bewerkTransactie ? 'Transactie bewerken' : 'Transactie toevoegen'}</h2>
        <TransactieFormulier
          onOpslaan={slaTransactieOp}
          onAnnuleer={() => setBewerkTransactie(null)}
          rekeningen={rekeningen}
          categorieen={categorieen}
          bewerken={bewerkTransactie}
        />
      </section>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.5rem' }}>
        {transacties.map((t) => {
          const cat = categorieNaam(t.categorieId)
          return (
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
              <span>
                {t.omschrijving}
                {cat && <span style={{ color: '#999', fontSize: '0.85rem' }}> · {cat}</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: t.bedrag < 0 ? '#c0392b' : '#27ae60' }}>{formatEuro(t.bedrag)}</span>
                <button
                  aria-label={`Bewerk ${t.omschrijving}`}
                  onClick={() => setBewerkTransactie(t)}
                  style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✎
                </button>
                <button
                  aria-label={`Verwijder ${t.omschrijving}`}
                  onClick={() => verwijder(t.id)}
                  style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  ×
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '1rem' }}>
        <span>Saldo</span>
        <span>{formatEuro(totaalSaldo)}</span>
      </p>

      <hr style={scheiding} />

      <DossierSectie
        dossiers={dossiers}
        kosten={gedeeldeKosten}
        verrekeningen={verrekeningen}
        onDossierOpslaan={voegDossierToe}
        onKostOpslaan={voegGedeeldeKostToe}
        onKostVerwijderen={verwijderKost}
        onAfrekenen={legAfrekeningVast}
      />

      <hr style={scheiding} />

      <IndexatieCalculator />

      <hr style={scheiding} />

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
