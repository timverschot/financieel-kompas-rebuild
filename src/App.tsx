import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Budget,
  Categorie,
  Dossier,
  GedeeldeKost,
  Kind,
  Overboeking,
  Rekening,
  Spaardoel,
  Subcategorie,
  TerugkerendePost,
  Transactie,
  Verrekening,
} from './data/schema'
import {
  bewaarBudget,
  bewaarCategorie,
  bewaarDossier,
  bewaarGedeeldeKost,
  bewaarKind,
  bewaarRekening,
  bewaarOverboeking,
  bewaarSpaardoel,
  bewaarSubcategorie,
  bewaarTerugkerendePost,
  bewaarTransactie,
  bewaarVerrekening,
  verwijderDossier,
  verwijderSpaardoel,
  verwijderSubcategorie,
  laadBudgetten,
  laadCategorieen,
  laadDossiers,
  laadGedeeldeKosten,
  laadKinderen,
  laadOverboekingen,
  laadRekeningen,
  laadSpaardoelen,
  laadSubcategorieen,
  laadTerugkerendePosten,
  laadTransacties,
  laadVerrekeningen,
  verwijderBudget,
  verwijderCategorie,
  verwijderGedeeldeKost,
  verwijderKind,
  verwijderOverboeking,
  verwijderRekening,
  verwijderTerugkerendePost,
  verwijderTransactie,
} from './data/repository'
import { seedIndienLeeg } from './data/seed'
import { exporteerBackup, importeerBackup } from './data/backup'
import { vraagBlijvendeOpslag } from './data/opslag'
import { synchroniseer } from './data/sync/sync'
import { DriveBackend } from './data/sync/drive/driveBackend'
import { vraagToken, heeftOoitVerbonden } from './data/sync/drive/auth'
import { TransactieFormulier } from './components/TransactieFormulier'
import { RekeningFormulier, REKENING_TYPE_LABEL } from './components/RekeningFormulier'
import { CategorieFormulier } from './components/CategorieFormulier'
import { BudgetFormulier } from './components/BudgetFormulier'
import { DossierSectie } from './components/DossierSectie'
import { KinderenSectie } from './components/KinderenSectie'
import { SpaardoelSectie } from './components/SpaardoelSectie'
import { CategorieBoom } from './components/CategorieBoom'
import { Donut } from './components/Donut'
import { StaafGrafiek } from './components/StaafGrafiek'
import { IndexatieCalculator } from './components/IndexatieCalculator'
import { TerugkerendeSectie } from './components/TerugkerendeSectie'
import { OverboekingSectie } from './components/OverboekingSectie'
import { ErrorBoundary } from './components/ErrorBoundary'
import { saldoVerrekeningDossier } from './utils/dossier'
import { nieuwId } from './data/sync/id'
import { uitgavenInMaand } from './utils/budget'
import { inkomstenPerCategorie, maandInkomsten, maandUitgaven, uitgavenPerCategorie } from './utils/overzicht'
import { uitgavenPerMaand } from './utils/maandverloop'
import { labelVanCategorie } from './data/categorieen/resolve'
import { stelSubcategorieenIn } from './data/categorieen/zoek'
import { formatEuro } from './utils/format'
import { useT, TALEN } from './i18n'

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
  const [spaardoelen, setSpaardoelen] = useState<Spaardoel[]>([])
  const [subcategorieen, setSubcategorieen] = useState<Subcategorie[]>([])
  const [overboekingen, setOverboekingen] = useState<Overboeking[]>([])
  const [kinderen, setKinderen] = useState<Kind[]>([])
  const [ongeldig, setOngeldig] = useState(0)
  const [verbonden, setVerbonden] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [statusTekst, setStatusTekst] = useState<string | null>(null)
  const [bewerkTransactie, setBewerkTransactie] = useState<Transactie | null>(null)
  const [bewerkCategorie, setBewerkCategorie] = useState<Categorie | null>(null)
  const [bewerkRekening, setBewerkRekening] = useState<Rekening | null>(null)
  const [bewerkOverboeking, setBewerkOverboeking] = useState<Overboeking | null>(null)
  const [maand, setMaand] = useState(huidigeMaand())
  const [backupTekst, setBackupTekst] = useState<string | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ boodschap: string; herstel: () => Promise<void> } | null>(null)
  const backendRef = useRef<DriveBackend | null>(null)
  const undoTimer = useRef<number | null>(null)
  const { t, taal, zetTaal } = useT()

  async function herlaad() {
    const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki] = await Promise.all([
      laadTransacties(),
      laadRekeningen(),
      laadCategorieen(),
      laadBudgetten(),
      laadDossiers(),
      laadGedeeldeKosten(),
      laadVerrekeningen(),
      laadTerugkerendePosten(),
      laadSpaardoelen(),
      laadSubcategorieen(),
      laadOverboekingen(),
      laadKinderen(),
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
    setSpaardoelen(sp.geldig)
    setSubcategorieen(subc.geldig)
    setOverboekingen(ob.geldig)
    setKinderen(ki.geldig)
  }

  // Toon een korte "ongedaan maken"-melding na een verwijdering. Herstellen is
  // dankzij het append-only logboek eenvoudig: we bewaren het verwijderde item
  // gewoon opnieuw (met dezelfde id), waardoor het weer verschijnt.
  function toonUndo(boodschap: string, herstel: () => Promise<void>) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setUndoInfo({ boodschap, herstel })
    undoTimer.current = window.setTimeout(() => setUndoInfo(null), 8000)
  }

  async function undoNu() {
    if (!undoInfo) return
    const herstel = undoInfo.herstel
    setUndoInfo(null)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    await herstel()
    await herlaad()
  }

  useEffect(() => () => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
  }, [])

  useEffect(() => {
    let actief = true
    async function laad() {
      await seedIndienLeeg()
      const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki] = await Promise.all([
        laadTransacties(),
        laadRekeningen(),
        laadCategorieen(),
        laadBudgetten(),
        laadDossiers(),
        laadGedeeldeKosten(),
        laadVerrekeningen(),
        laadTerugkerendePosten(),
        laadSpaardoelen(),
        laadSubcategorieen(),
        laadOverboekingen(),
        laadKinderen(),
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
      setSpaardoelen(sp.geldig)
      setSubcategorieen(subc.geldig)
      setOverboekingen(ob.geldig)
      setKinderen(ki.geldig)
    }
    void laad()
    return () => {
      actief = false
    }
  }, [])

  // Vraag de browser om je gegevens niet zomaar te wissen (belangrijk op iOS).
  useEffect(() => {
    void vraagBlijvendeOpslag()
  }, [])

  // Bij het opstarten: als je ooit verbond, stil (zonder venster) opnieuw
  // verbinden en meteen synchroniseren. Mislukt dit, dan blijf je gewoon lokaal
  // werken en kan je later handmatig verbinden.
  useEffect(() => {
    if (!heeftOoitVerbonden()) return
    let actief = true
    void (async () => {
      try {
        await vraagToken(false)
        if (!actief) return
        if (!backendRef.current) backendRef.current = new DriveBackend()
        setVerbonden(true)
        const r = await synchroniseer(backendRef.current)
        await herlaad()
        if (actief) setStatusTekst(t('Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }))
      } catch {
        // Stil laten mislukken: geen storende melding bij het opstarten.
      }
    })()
    return () => {
      actief = false
    }
  }, [])

  // Zodra je verbonden bent: automatisch synchroniseren. Periodiek, én meteen
  // wanneer je de app wegklikt of naar de achtergrond stuurt - zo staat je laatste
  // wijziging veilig in de back-up nog vóór je het tabblad sluit.
  useEffect(() => {
    if (!verbonden) return
    const backend = backendRef.current
    if (!backend) return

    let bezigMetSync = false
    async function stilleSync() {
      if (bezigMetSync) return
      bezigMetSync = true
      try {
        const r = await synchroniseer(backend!)
        if (r.gepusht > 0 || r.opgehaald > 0) await herlaad()
      } catch {
        // Stil: een mislukte auto-sync mag de gebruiker niet storen.
      } finally {
        bezigMetSync = false
      }
    }

    const interval = window.setInterval(() => void stilleSync(), 45_000)
    const bijVerlaten = () => {
      if (document.visibilityState === 'hidden') void stilleSync()
    }
    document.addEventListener('visibilitychange', bijVerlaten)
    window.addEventListener('pagehide', bijVerlaten)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', bijVerlaten)
      window.removeEventListener('pagehide', bijVerlaten)
    }
  }, [verbonden])

  // Houd het categorie-register in sync met je aanpassingen, zodat zoeken,
  // weergave en oprollen de toegevoegde/hernoemde subcategorieën meteen tonen.
  useMemo(() => stelSubcategorieenIn(subcategorieen), [subcategorieen])

  async function exporteerNu() {
    const json = await exporteerBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financieel-kompas-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setBackupTekst(t('Back-up gedownload.'))
  }

  async function herstelUitBestand(bestand: File) {
    try {
      const tekst = await bestand.text()
      const r = await importeerBackup(tekst)
      await herlaad()
      setBackupTekst(
        t('Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig.', {
          toegevoegd: r.toegevoegd,
          overgeslagen: r.overgeslagen,
          ongeldig: r.ongeldig,
        }),
      )
    } catch (e) {
      setBackupTekst(t('Herstellen mislukte: {fout}', { fout: e instanceof Error ? e.message : t('onbekende fout') }))
    }
  }

  async function slaTransactieOp(t: Transactie) {
    await bewaarTransactie(t)
    await herlaad()
    setBewerkTransactie(null)
  }

  async function slaRekeningOp(r: Rekening) {
    await bewaarRekening(r)
    await herlaad()
    setBewerkRekening(null)
  }

  async function slaCategorieOp(c: Categorie) {
    await bewaarCategorie(c)
    await herlaad()
    setBewerkCategorie(null)
  }

  async function verwijderRek(id: string) {
    const oud = rekeningen.find((r) => r.id === id)
    await verwijderRekening(id)
    await herlaad()
    if (oud) toonUndo(t('Rekening verwijderd'), () => bewaarRekening(oud))
  }

  async function archiveerRekening(r: Rekening, archiveer: boolean) {
    await bewaarRekening({ ...r, gearchiveerd: archiveer })
    await herlaad()
  }

  async function voegOverboekingToe(o: Overboeking) {
    await bewaarOverboeking(o)
    await herlaad()
    setBewerkOverboeking(null)
  }

  async function verwijderOverboekingH(id: string) {
    const oud = overboekingen.find((o) => o.id === id)
    await verwijderOverboeking(id)
    await herlaad()
    if (oud) toonUndo(t('Overboeking verwijderd'), () => bewaarOverboeking(oud))
  }

  async function voegKindToe(naam: string) {
    await bewaarKind({ id: nieuwId(), naam })
    await herlaad()
  }

  async function wijzigKind(id: string, naam: string) {
    await bewaarKind({ id, naam })
    await herlaad()
  }

  async function verwijderKindH(id: string) {
    const oud = kinderen.find((k) => k.id === id)
    await verwijderKind(id)
    await herlaad()
    if (oud) toonUndo(t('Kind verwijderd'), () => bewaarKind(oud))
  }

  async function verwijderCat(id: string) {
    const oud = categorieen.find((c) => c.id === id)
    await verwijderCategorie(id)
    await herlaad()
    if (oud) toonUndo(t('Categorie verwijderd'), () => bewaarCategorie(oud))
  }

  async function verwijderBud(id: string) {
    const oud = budgetten.find((b) => b.id === id)
    await verwijderBudget(id)
    await herlaad()
    if (oud) toonUndo(t('Budget verwijderd'), () => bewaarBudget(oud))
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

  async function verwijderDoss(id: string) {
    const oud = dossiers.find((d) => d.id === id)
    await verwijderDossier(id)
    await herlaad()
    if (oud) toonUndo(t('Dossier verwijderd'), () => bewaarDossier(oud))
  }

  async function verwijderKost(id: string) {
    const oud = gedeeldeKosten.find((k) => k.id === id)
    await verwijderGedeeldeKost(id)
    await herlaad()
    if (oud) toonUndo(t('Kost verwijderd'), () => bewaarGedeeldeKost(oud))
  }

  async function voegSpaardoelToe(d: Spaardoel) {
    await bewaarSpaardoel(d)
    await herlaad()
  }

  async function verwijderSpaardoelH(id: string) {
    const oud = spaardoelen.find((s) => s.id === id)
    await verwijderSpaardoel(id)
    await herlaad()
    if (oud) toonUndo(t('Spaardoel verwijderd'), () => bewaarSpaardoel(oud))
  }

  async function voegSubcategorieToe(categorieId: string, naam: string) {
    await bewaarSubcategorie({ id: nieuwId(), naam, categorieId })
    await herlaad()
  }

  async function wijzigSubcategorie(id: string, categorieId: string, naam: string) {
    await bewaarSubcategorie({ id, naam, categorieId })
    await herlaad()
  }

  async function verwijderSubcategorieH(id: string) {
    const oud = subcategorieen.find((s) => s.id === id)
    await verwijderSubcategorie(id)
    await herlaad()
    if (oud) toonUndo(t('Subcategorie verwijderd'), () => bewaarSubcategorie(oud))
  }

  async function voegTerugkerendToe(p: TerugkerendePost) {
    await bewaarTerugkerendePost(p)
    await herlaad()
  }

  async function verwijderTerugkerend(id: string) {
    const oud = terugkerendePosten.find((p) => p.id === id)
    await verwijderTerugkerendePost(id)
    await herlaad()
    if (oud) toonUndo(t('Vaste post verwijderd'), () => bewaarTerugkerendePost(oud))
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
    const bedrag = saldoVerrekeningDossier(dossier, openKosten)
    const verId = nieuwId()
    const datum = new Date().toISOString().slice(0, 10)
    await bewaarVerrekening({ id: verId, dossierId: dossier.id, datum, bedrag })
    for (const k of openKosten) {
      await bewaarGedeeldeKost({ ...k, verrekeningId: verId })
    }
    await herlaad()
  }

  async function verwijder(id: string) {
    const oud = transacties?.find((t) => t.id === id)
    await verwijderTransactie(id)
    await herlaad()
    if (oud) toonUndo(t('Transactie verwijderd'), () => bewaarTransactie(oud))
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
      setStatusTekst(t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }))
    } catch (e) {
      setStatusTekst(t('Verbinden mislukte: {fout}', { fout: e instanceof Error ? e.message : t('onbekende fout') }))
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
      setStatusTekst(t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }))
    } catch (e) {
      setStatusTekst(t('Synchroniseren mislukte: {fout}', { fout: e instanceof Error ? e.message : t('onbekende fout') }))
    } finally {
      setBezig(false)
    }
  }

  if (transacties === null) {
    return (
      <main style={container}>
        <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
        <p style={{ color: '#666' }}>{t('Laden…')}</p>
      </main>
    )
  }

  const categorieNaam = (id?: string) => labelVanCategorie(id, categorieen)
  const totaalSaldo =
    rekeningen.reduce((som, r) => som + r.beginsaldo, 0) +
    transacties.reduce((som, t) => som + t.bedrag, 0)

  const inkomsten = maandInkomsten(transacties, maand)
  const uitgaven = maandUitgaven(transacties, maand)
  const perCategorie = uitgavenPerCategorie(transacties, categorieen, maand)
  const perInkomsten = inkomstenPerCategorie(transacties, categorieen, maand)
  const handelaars = [...new Set(transacties.map((t) => t.omschrijving).filter((s) => s.trim().length > 0))]
  // Gearchiveerde rekeningen blijven in het overzicht staan, maar verdwijnen uit
  // de keuzelijsten waar je nieuwe dingen aan koppelt.
  const actieveRekeningen = rekeningen.filter((r) => !r.gearchiveerd)
  const maandVerloop = uitgavenPerMaand(transacties, maand, 6)

  return (
    <main style={container}>
      <h1 style={{ marginBottom: 0 }}>Financieel Kompas</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <p style={{ color: '#666', marginTop: 4 }}>
          {t('Rekeningen, categorieën, budgetten en transacties — met backup en synchronisatie')}
        </p>
        <select
          aria-label={t('Taal')}
          value={taal}
          onChange={(e) => zetTaal(e.target.value as typeof taal)}
          style={{ padding: '0.25rem', borderRadius: 6, border: '1px solid #ccc' }}
        >
          {TALEN.map((tl) => (
            <option key={tl.waarde} value={tl.waarde}>
              {tl.label}
            </option>
          ))}
        </select>
      </div>

      {ongeldig > 0 && (
        <p style={{ background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
          {t('Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.', { n: ongeldig })}
        </p>
      )}

      <ErrorBoundary naam="Maandoverzicht">
      <section>
        <h2 style={kop}>{t('Maandoverzicht')}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <button style={knop} aria-label={t('Vorige maand')} onClick={() => setMaand(verschuifMaand(maand, -1))}>
            ‹
          </button>
          <span style={{ minWidth: 120, textAlign: 'center' }}>{maandLabel(maand)}</span>
          <button style={knop} aria-label={t('Volgende maand')} onClick={() => setMaand(verschuifMaand(maand, 1))}>
            ›
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
          <span>{t('Inkomsten')}</span>
          <span style={{ color: '#27ae60' }}>{formatEuro(inkomsten)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
          <span>{t('Uitgaven')}</span>
          <span style={{ color: '#c0392b' }}>{formatEuro(uitgaven)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontWeight: 'bold' }}>
          <span>{t('Netto')}</span>
          <span>{formatEuro(inkomsten - uitgaven)}</span>
        </div>
        {perCategorie.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <Donut items={perCategorie} />
          </div>
        )}

        {perInkomsten.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ color: '#888', margin: '0 0 0.25rem' }}>{t('Inkomsten per categorie')}</p>
            <Donut items={perInkomsten} middenLabel="inkomsten" />
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: '#888', margin: '0 0 0.25rem' }}>{t('Uitgaven per maand')}</p>
          <StaafGrafiek data={maandVerloop} />
        </div>
      </section>
      </ErrorBoundary>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>{t('Rekeningen')}</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rekeningen.map((r) => {
            const meta = [t(REKENING_TYPE_LABEL[r.type ?? 'betaal']), r.rubriek, r.rekeningnummer].filter(Boolean).join(' · ')
            return (
              <li key={r.id} style={{ padding: '0.35rem 0', borderBottom: '1px solid #f0f0f0', opacity: r.gearchiveerd ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {r.naam}
                    {r.gearchiveerd && <span style={{ color: '#888', fontSize: '0.8rem' }}> · {t('gearchiveerd')}</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ color: '#888' }}>{t('startsaldo {saldo}', { saldo: formatEuro(r.beginsaldo) })}</span>
                    <button aria-label={t('Bewerk rekening {naam}', { naam: r.naam })} onClick={() => setBewerkRekening(r)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                      ✎
                    </button>
                    <button
                      aria-label={r.gearchiveerd ? t('Herstel rekening {naam}', { naam: r.naam }) : t('Archiveer rekening {naam}', { naam: r.naam })}
                      onClick={() => archiveerRekening(r, !r.gearchiveerd)}
                      style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      {r.gearchiveerd ? t('herstel') : t('archiveer')}
                    </button>
                    <button aria-label={t('Verwijder rekening {naam}', { naam: r.naam })} onClick={() => verwijderRek(r.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                      ×
                    </button>
                  </span>
                </div>
                {meta && <div style={{ color: '#999', fontSize: '0.8rem' }}>{meta}</div>}
              </li>
            )
          })}
        </ul>
        <RekeningFormulier onOpslaan={slaRekeningOp} onAnnuleer={() => setBewerkRekening(null)} bewerken={bewerkRekening} />
      </section>

      <hr style={scheiding} />

      <ErrorBoundary naam="Overboekingen">
        <OverboekingSectie
          overboekingen={overboekingen}
          rekeningen={actieveRekeningen}
          bewerken={bewerkOverboeking}
          onOpslaan={voegOverboekingToe}
          onVerwijderen={verwijderOverboekingH}
          onBewerk={setBewerkOverboeking}
          onStopBewerken={() => setBewerkOverboeking(null)}
        />
      </ErrorBoundary>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>{t('Categorieën')}</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {categorieen.map((c) => (
            <li
              key={c.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}
            >
              <span>{c.naam}</span>
              <span style={{ display: 'flex', gap: '0.6rem' }}>
                <button aria-label={t('Bewerk categorie {naam}', { naam: c.naam })} onClick={() => setBewerkCategorie(c)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                  ✎
                </button>
                <button aria-label={t('Verwijder categorie {naam}', { naam: c.naam })} onClick={() => verwijderCat(c.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
        <CategorieFormulier onOpslaan={slaCategorieOp} onAnnuleer={() => setBewerkCategorie(null)} bewerken={bewerkCategorie} />
      </section>

      <hr style={scheiding} />

      <ErrorBoundary naam="Categorieën">
        <CategorieBoom
          aanpassingen={subcategorieen}
          onToevoegen={voegSubcategorieToe}
          onWijzigen={wijzigSubcategorie}
          onVerwijderen={verwijderSubcategorieH}
        />
      </ErrorBoundary>

      <hr style={scheiding} />

      <ErrorBoundary naam="Budgetten">
      <section>
        <h2 style={kop}>{t('Budgetten')}</h2>
        <p style={{ color: '#888', marginTop: 0 }}>{t('voor {maand}', { maand: maandLabel(maand) })}</p>
        {budgetten.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen budgetten ingesteld.')}</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {budgetten.map((b) => {
            const naam = categorieNaam(b.categorieId) ?? '—'
            const uitgegeven = uitgavenInMaand(transacties, b.categorieId, maand)
            const fractie = Math.min(uitgegeven / b.bedrag, 1)
            const kleur = uitgegeven > b.bedrag ? '#c0392b' : uitgegeven >= b.bedrag * 0.8 ? '#e67e22' : '#27ae60'
            return (
              <li key={b.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{naam}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ color: '#666' }}>
                      {formatEuro(uitgegeven)} / {formatEuro(b.bedrag)}
                    </span>
                    <button aria-label={t('Verwijder budget {naam}', { naam })} onClick={() => verwijderBud(b.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                      ×
                    </button>
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
      </ErrorBoundary>

      <hr style={scheiding} />

      <ErrorBoundary naam="Vaste lasten">
        <TerugkerendeSectie
          posten={terugkerendePosten}
          rekeningen={actieveRekeningen}
          categorieen={categorieen}
          transacties={transacties}
          maand={maand}
          maandLabel={maandLabel(maand)}
          onOpslaan={voegTerugkerendToe}
          onVerwijderen={verwijderTerugkerend}
          onBoek={boekTerugkerend}
        />
      </ErrorBoundary>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>{bewerkTransactie ? t('Transactie bewerken') : t('Transactie toevoegen')}</h2>
        <TransactieFormulier
          onOpslaan={slaTransactieOp}
          onAnnuleer={() => setBewerkTransactie(null)}
          rekeningen={actieveRekeningen}
          categorieen={categorieen}
          handelaars={handelaars}
          bewerken={bewerkTransactie}
        />
      </section>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.5rem' }}>
        {transacties.map((tx) => {
          const cat =
            tx.regels && tx.regels.length > 0
              ? t('gesplitst · {n} categorieën', { n: tx.regels.length })
              : categorieNaam(tx.categorieId)
          return (
            <li
              key={tx.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <span>
                {tx.omschrijving}
                {cat && <span style={{ color: '#999', fontSize: '0.85rem' }}> · {cat}</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: tx.bedrag < 0 ? '#c0392b' : '#27ae60' }}>{formatEuro(tx.bedrag)}</span>
                <button
                  aria-label={t('Bewerk {oms}', { oms: tx.omschrijving })}
                  onClick={() => setBewerkTransactie(tx)}
                  style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✎
                </button>
                <button
                  aria-label={t('Verwijder {oms}', { oms: tx.omschrijving })}
                  onClick={() => verwijder(tx.id)}
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
        <span>{t('Saldo')}</span>
        <span>{formatEuro(totaalSaldo)}</span>
      </p>

      <hr style={scheiding} />

      <ErrorBoundary naam="Kinderen">
        <KinderenSectie
          kinderen={kinderen}
          onToevoegen={voegKindToe}
          onWijzigen={wijzigKind}
          onVerwijderen={verwijderKindH}
        />
      </ErrorBoundary>

      <hr style={scheiding} />

      <ErrorBoundary naam="Dossiers">
        <DossierSectie
          dossiers={dossiers}
          kosten={gedeeldeKosten}
          verrekeningen={verrekeningen}
          kinderen={kinderen}
          onDossierOpslaan={voegDossierToe}
          onDossierVerwijderen={verwijderDoss}
          onKostOpslaan={voegGedeeldeKostToe}
          onKostVerwijderen={verwijderKost}
          onAfrekenen={legAfrekeningVast}
        />
      </ErrorBoundary>

      <hr style={scheiding} />

      <ErrorBoundary naam="Spaardoelen">
        <SpaardoelSectie
          spaardoelen={spaardoelen}
          rekeningen={actieveRekeningen}
          transacties={transacties}
          onOpslaan={voegSpaardoelToe}
          onVerwijderen={verwijderSpaardoelH}
        />
      </ErrorBoundary>

      <hr style={scheiding} />

      <ErrorBoundary naam="Indexatie">
        <IndexatieCalculator />
      </ErrorBoundary>

      <hr style={scheiding} />

      <section>
        <h2 style={kop}>{t('Back-up & herstel')}</h2>
        <p style={{ color: '#888', marginTop: 0 }}>
          {t('Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.')}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={knop} onClick={exporteerNu}>
            {t('Exporteer back-up')}
          </button>
          <label style={{ ...knop, display: 'inline-block' }}>
            {t('Herstel uit back-up')}
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void herstelUitBestand(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {backupTekst && <p style={{ color: '#666', marginTop: '0.75rem' }}>{backupTekst}</p>}
      </section>

      <hr style={scheiding} />

      <div>
        {!verbonden ? (
          <button style={knop} onClick={verbindEnSynchroniseer} disabled={bezig}>
            {bezig ? t('Bezig…') : t('Verbind met Google Drive')}
          </button>
        ) : (
          <button style={knop} onClick={synchroniseerNu} disabled={bezig}>
            {bezig ? t('Bezig…') : t('Synchroniseer nu')}
          </button>
        )}
        {statusTekst && <p style={{ color: '#666', marginTop: '0.75rem' }}>{statusTekst}</p>}
      </div>

      {undoInfo && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 20,
            background: '#333',
            color: '#fff',
            padding: '0.6rem 1rem',
            borderRadius: 8,
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxWidth: '90%',
          }}
        >
          <span>{undoInfo.boodschap}</span>
          <button
            onClick={() => void undoNu()}
            style={{ background: 'none', border: 'none', color: '#8ec5ff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {t('Ongedaan maken')}
          </button>
        </div>
      )}
    </main>
  )
}
