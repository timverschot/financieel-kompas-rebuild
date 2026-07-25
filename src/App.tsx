import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Aflossing,
  Budget,
  Categorie,
  Dossier,
  Garantie,
  GedeeldeKost,
  Kind,
  Kindrekening,
  Kindrekeningpost,
  Lening,
  Overboeking,
  Rekening,
  Spaardoel,
  Streepjescode,
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
  bewaarAflossing,
  bewaarGarantie,
  bewaarKind,
  bewaarKindrekening,
  bewaarKindrekeningpost,
  bewaarLening,
  bewaarRekening,
  bewaarOverboeking,
  bewaarSpaardoel,
  bewaarStreepjescode,
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
  laadAflossingen,
  laadGaranties,
  laadKinderen,
  laadKindrekeningen,
  laadKindrekeningposten,
  laadLeningen,
  laadOverboekingen,
  laadRekeningen,
  laadSpaardoelen,
  laadStreepjescodes,
  laadSubcategorieen,
  laadTerugkerendePosten,
  laadTransacties,
  laadVerrekeningen,
  verwijderBudget,
  verwijderCategorie,
  verwijderGedeeldeKost,
  verwijderAflossing,
  verwijderGarantie,
  verwijderKind,
  verwijderKindrekening,
  verwijderKindrekeningpost,
  verwijderLening,
  verwijderOverboeking,
  verwijderRekening,
  verwijderTerugkerendePost,
  verwijderTransactie,
  verwijderVerrekening,
} from './data/repository'
import { seedIndienLeeg } from './data/seed'
import { exporteerBackup, importeerBackup } from './data/backup'
import { vraagBlijvendeOpslag } from './data/opslag'
import { synchroniseer } from './data/sync/sync'
import { DriveBackend } from './data/sync/drive/driveBackend'
import { vraagToken, heeftOoitVerbonden, meldAf } from './data/sync/drive/auth'
import { TransactieFormulier } from './components/TransactieFormulier'
import { TransactieLijst } from './components/TransactieLijst'
import { RekeningFormulier, REKENING_TYPE_LABEL } from './components/RekeningFormulier'
import { CategorieFormulier } from './components/CategorieFormulier'
import { BudgetFormulier } from './components/BudgetFormulier'
import { DossierSectie } from './components/DossierSectie'
import { LeningSectie } from './components/LeningSectie'
import { GarantieSectie } from './components/GarantieSectie'
import { InstellingenSectie } from './components/InstellingenSectie'
import { AnalyseSectie } from './components/AnalyseSectie'
import { SpaardoelSectie } from './components/SpaardoelSectie'
import { CategorieBoom } from './components/CategorieBoom'
import { SubcategorieSnelFormulier } from './components/SubcategorieSnelFormulier'
import { Donut } from './components/Donut'
import { StaafGrafiek } from './components/StaafGrafiek'
import { IndexatieCalculator } from './components/IndexatieCalculator'
import { TerugkerendeSectie } from './components/TerugkerendeSectie'
import { OverboekingSectie } from './components/OverboekingSectie'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OnderNavigatie, PAGINAS, type Pagina } from './components/OnderNavigatie'
import { Zijbalk } from './components/Zijbalk'
import { Merkteken } from './components/Merkteken'
import { saldoVerrekeningDossier } from './utils/dossier'
import { kostenVoorAfrekening, type AfrekeningFilter } from './utils/afrekening'
import { nieuwId } from './data/sync/id'
import { uitgavenInMaand } from './utils/budget'
import { inkomstenPerCategorie, maandInkomsten, maandUitgaven, uitgavenPerCategorie } from './utils/overzicht'
import { uitgavenPerMaand } from './utils/maandverloop'
import { labelVanCategorie } from './data/categorieen/resolve'
import { stelSubcategorieenIn } from './data/categorieen/zoek'
import { formatEuro } from './utils/format'
import { huidigeMaand, vandaag } from './utils/datum'
import { saldoVanRekening, totaalSaldoVan } from './utils/saldo'
import { Balk, Bedrag, Kaart, Leeg, PaginaKop } from './ui/basis'
import { useT } from './i18n'

const container: CSSProperties = {
  maxWidth: 480,
  margin: '1.5rem auto',
  padding: '0 1rem',
}


function verschuifMaand(maand: string, delta: number): string {
  const [jaar, m] = maand.split('-').map(Number)
  const d = new Date(jaar, m - 1 + delta, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

// Is het scherm breed genoeg voor de desktoplayout (zijpaneel)? Onder de grens
// tonen we de mobiele layout (onderbalk). We schakelen in JavaScript i.p.v. enkel
// met CSS, zodat er nooit twee navigaties tegelijk in de DOM staan.
const DESKTOP_GRENS = '(min-width: 1024px)'
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_GRENS).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DESKTOP_GRENS)
    const luister = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', luister)
    return () => mq.removeEventListener('change', luister)
  }, [])
  return isDesktop
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
  const [kindrekeningen, setKindrekeningen] = useState<Kindrekening[]>([])
  const [kindrekeningposten, setKindrekeningposten] = useState<Kindrekeningpost[]>([])
  const [leningen, setLeningen] = useState<Lening[]>([])
  const [aflossingen, setAflossingen] = useState<Aflossing[]>([])
  const [garanties, setGaranties] = useState<Garantie[]>([])
  const [streepjescodes, setStreepjescodes] = useState<Streepjescode[]>([])
  const [ongeldig, setOngeldig] = useState(0)
  const [verbonden, setVerbonden] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [statusTekst, setStatusTekst] = useState<string | null>(null)
  const [bewerkTransactie, setBewerkTransactie] = useState<Transactie | null>(null)
  const [bewerkCategorie, setBewerkCategorie] = useState<Categorie | null>(null)
  const [bewerkRekening, setBewerkRekening] = useState<Rekening | null>(null)
  const [bewerkOverboeking, setBewerkOverboeking] = useState<Overboeking | null>(null)
  const [maand, setMaand] = useState(huidigeMaand())
  const [pagina, setPagina] = useState<Pagina>('overzicht')
  const isDesktop = useIsDesktop()
  const [backupTekst, setBackupTekst] = useState<string | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ boodschap: string; herstel: () => Promise<void> } | null>(null)
  const backendRef = useRef<DriveBackend | null>(null)
  const undoTimer = useRef<number | null>(null)
  const { t, taal, zetTaal } = useT()

  async function herlaad() {
    const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, sc] = await Promise.all([
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
      laadKindrekeningen(),
      laadKindrekeningposten(),
      laadLeningen(),
      laadAflossingen(),
      laadGaranties(),
      laadStreepjescodes(),
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
    setKindrekeningen(kr.geldig)
    setKindrekeningposten(krp.geldig)
    setLeningen(ln.geldig)
    setAflossingen(afl.geldig)
    setGaranties(gar.geldig)
    setStreepjescodes(sc.geldig)
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
      const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, sc] = await Promise.all([
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
        laadKindrekeningen(),
        laadKindrekeningposten(),
        laadLeningen(),
        laadAflossingen(),
        laadGaranties(),
        laadStreepjescodes(),
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
      setKindrekeningen(kr.geldig)
      setKindrekeningposten(krp.geldig)
      setLeningen(ln.geldig)
      setAflossingen(afl.geldig)
      setGaranties(gar.geldig)
      setStreepjescodes(sc.geldig)
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
    a.download = `financieel-kompas-backup-${vandaag()}.json`
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
    // Een rekening verwijderen terwijl er nog transacties of overboekingen aan
    // hangen, laat die boekingen wijzen naar iets dat niet meer bestaat: het saldo
    // verspringt en de transacties tonen geen rekeningnaam meer. Daarom weigeren we
    // dat en stellen we archiveren voor — dan blijft alles kloppen en verdwijnt de
    // rekening enkel uit de keuzelijsten.
    const aantal =
      (transacties ?? []).filter((tx) => tx.rekeningId === id).length +
      overboekingen.filter((o) => o.vanRekeningId === id || o.naarRekeningId === id).length
    if (aantal > 0) {
      setStatusTekst(
        t('Deze rekening heeft nog {n} boeking(en). Archiveer ze in plaats van ze te verwijderen.', { n: aantal }),
      )
      return
    }
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
    // Alles wat aan het dossier hangt mee opruimen. Anders blijven de gedeelde
    // kosten en afrekeningen als onzichtbare weesrecords in de database staan (en
    // worden ze wél mee gesynchroniseerd). Leningen deden dit al zo; nu overal
    // dezelfde regel. 'Ongedaan maken' zet het volledige dossier terug.
    const oudeKosten = gedeeldeKosten.filter((k) => k.dossierId === id)
    const oudeVerrekeningen = verrekeningen.filter((v) => v.dossierId === id)
    const oudeKindrekeningen = kindrekeningen.filter((k) => k.dossierId === id)
    const oudeKindrekeningposten = kindrekeningposten.filter((p) =>
      oudeKindrekeningen.some((k) => k.id === p.kindrekeningId),
    )
    await verwijderDossier(id)
    for (const k of oudeKosten) await verwijderGedeeldeKost(k.id)
    for (const v of oudeVerrekeningen) await verwijderVerrekening(v.id)
    for (const p of oudeKindrekeningposten) await verwijderKindrekeningpost(p.id)
    for (const k of oudeKindrekeningen) await verwijderKindrekening(k.id)
    await herlaad()
    if (oud) {
      toonUndo(t('Dossier verwijderd'), async () => {
        await bewaarDossier(oud)
        for (const k of oudeKosten) await bewaarGedeeldeKost(k)
        for (const v of oudeVerrekeningen) await bewaarVerrekening(v)
        for (const k of oudeKindrekeningen) await bewaarKindrekening(k)
        for (const p of oudeKindrekeningposten) await bewaarKindrekeningpost(p)
      })
    }
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

  // Geeft het nieuwe id terug, zodat een formulier de zopas gemaakte subcategorie
  // meteen kan selecteren zonder ze opnieuw te moeten opzoeken.
  async function voegSubcategorieToe(categorieId: string, naam: string): Promise<string> {
    const id = nieuwId()
    await bewaarSubcategorie({ id, naam, categorieId })
    await herlaad()
    return id
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

  // Genereer een afrekening als momentopname over de gekozen periode + kinderen.
  // Dit blokkeert niets: de kosten blijven open tot je de afrekening als
  // 'overgemaakt' markeert.
  async function genereerAfrekening(dossier: Dossier, filter: AfrekeningFilter) {
    const gedekt = kostenVoorAfrekening(gedeeldeKosten, dossier.id, filter)
    const bedrag = saldoVerrekeningDossier(dossier, gedekt)
    const datum = vandaag()
    await bewaarVerrekening({
      id: nieuwId(),
      dossierId: dossier.id,
      datum,
      bedrag,
      ...(filter.periodeVan ? { periodeVan: filter.periodeVan } : {}),
      ...(filter.periodeTot ? { periodeTot: filter.periodeTot } : {}),
      ...(filter.kindIds && filter.kindIds.length > 0 ? { kindIds: filter.kindIds } : {}),
      kostIds: gedekt.map((k) => k.id),
      overgemaakt: false,
    })
    await herlaad()
  }

  // Markeer een afrekening als (niet) overgemaakt. De gedekte kosten worden mee
  // afgerekend (of terug opengezet), zodat het openstaande saldo klopt.
  async function markeerOvergemaakt(v: Verrekening, overgemaakt: boolean) {
    for (const id of v.kostIds ?? []) {
      const k = gedeeldeKosten.find((x) => x.id === id)
      if (k) await bewaarGedeeldeKost({ ...k, afgerekend: overgemaakt })
    }
    await bewaarVerrekening({ ...v, overgemaakt })
    await herlaad()
  }

  async function verwijderAfrekening(id: string) {
    await verwijderVerrekening(id)
    await herlaad()
  }

  // --- Kindrekening (gezamenlijke pot) ---
  async function kindrekeningOpslaan(kr: Kindrekening) {
    await bewaarKindrekening(kr)
    await herlaad()
  }

  // Een pot uitzetten verwijdert ook haar bewegingen; ongedaan maken zet beide terug.
  async function kindrekeningVerwijderen(id: string) {
    const oud = kindrekeningen.find((k) => k.id === id)
    const oudePosten = kindrekeningposten.filter((p) => p.kindrekeningId === id)
    await verwijderKindrekening(id)
    for (const p of oudePosten) await verwijderKindrekeningpost(p.id)
    await herlaad()
    if (oud) {
      toonUndo(t('Kindrekening uitgezet'), async () => {
        await bewaarKindrekening(oud)
        for (const p of oudePosten) await bewaarKindrekeningpost(p)
      })
    }
  }

  async function kindrekeningPostOpslaan(p: Kindrekeningpost) {
    await bewaarKindrekeningpost(p)
    await herlaad()
  }

  async function kindrekeningPostVerwijderen(id: string) {
    const oud = kindrekeningposten.find((p) => p.id === id)
    await verwijderKindrekeningpost(id)
    await herlaad()
    if (oud) toonUndo(t('Beweging verwijderd'), () => bewaarKindrekeningpost(oud))
  }

  // --- Leningen & kredieten ---
  async function leningOpslaan(l: Lening) {
    await bewaarLening(l)
    await herlaad()
  }

  // Een lening verwijderen verwijdert ook haar aflossingen; ongedaan maken zet
  // beide terug.
  async function leningVerwijderen(id: string) {
    const oud = leningen.find((l) => l.id === id)
    const oudeAflossingen = aflossingen.filter((a) => a.leningId === id)
    await verwijderLening(id)
    for (const a of oudeAflossingen) await verwijderAflossing(a.id)
    await herlaad()
    if (oud) {
      toonUndo(t('Lening verwijderd'), async () => {
        await bewaarLening(oud)
        for (const a of oudeAflossingen) await bewaarAflossing(a)
      })
    }
  }

  async function aflossingOpslaan(a: Aflossing) {
    await bewaarAflossing(a)
    await herlaad()
  }

  async function aflossingVerwijderen(id: string) {
    const oud = aflossingen.find((a) => a.id === id)
    await verwijderAflossing(id)
    await herlaad()
    if (oud) toonUndo(t('Aflossing verwijderd'), () => bewaarAflossing(oud))
  }

  // --- Garanties ---
  async function garantieOpslaan(g: Garantie) {
    await bewaarGarantie(g)
    await herlaad()
  }

  async function garantieVerwijderen(id: string) {
    const oud = garanties.find((g) => g.id === id)
    await verwijderGarantie(id)
    await herlaad()
    if (oud) toonUndo(t('Garantie verwijderd'), () => bewaarGarantie(oud))
  }

  // Onthoud een gescande streepjescode (barcode -> product). Stil bijwerken; geen
  // volledige herlaad nodig — de lijst wordt bij een volgende actie meegeladen.
  async function onthoudStreepjescode(s: Streepjescode) {
    await bewaarStreepjescode(s)
    setStreepjescodes((huidig) => {
      const rest = huidig.filter((x) => x.id !== s.id)
      return [...rest, s]
    })
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

  // De Drive-verbinding verbreken. `meldAf` wist het bewaarde token, waardoor de
  // app ook bij een volgende start niet meer automatisch synchroniseert. Je data
  // blijft gewoon lokaal staan — er wordt niets verwijderd.
  function verbreekVerbinding() {
    meldAf()
    backendRef.current = null
    setVerbonden(false)
    setStatusTekst(t('Verbinding met Google Drive verbroken. Je gegevens blijven op dit toestel staan.'))
  }

  // Budgetten die deze maand tegen hun grens aanlopen (vanaf 85% verbruikt), voor
  // het belletje in de bovenbalk — hetzelfde signaal als in V1.
  const budgetWaarschuwingen = budgetten.filter(
    (b) => b.bedrag > 0 && uitgavenInMaand(transacties ?? [], b.categorieId, maand) >= b.bedrag * 0.85,
  ).length

  if (transacties === null) {
    return (
      <main style={container}>
        <h1 className="paginakop">Kompal</h1>
        <p className="paginasub">{t('Laden…')}</p>
      </main>
    )
  }

  const categorieNaam = (id?: string) => labelVanCategorie(id, categorieen)
  // Het totale saldo t.e.m. vandaag. De datumgrens is belangrijk: een transactie
  // die je met een datum in de toekomst inboekt (bv. een vaste last die je alvast
  // voor volgende maand inboekt) hoort nog niet in je huidige saldo te zitten.
  const totaalSaldo = totaalSaldoVan(rekeningen, transacties, overboekingen, vandaag())

  const inkomsten = maandInkomsten(transacties, maand)
  const uitgaven = maandUitgaven(transacties, maand)
  const perCategorie = uitgavenPerCategorie(transacties, categorieen, maand)
  const perInkomsten = inkomstenPerCategorie(transacties, categorieen, maand)
  const handelaars = [...new Set(transacties.map((t) => t.omschrijving).filter((s) => s.trim().length > 0))]
  // Gearchiveerde rekeningen blijven in het overzicht staan, maar verdwijnen uit
  // de keuzelijsten waar je nieuwe dingen aan koppelt.
  const actieveRekeningen = rekeningen.filter((r) => !r.gearchiveerd)
  const maandVerloop = uitgavenPerMaand(transacties, maand, 6)

  // Eén maand-schakelaar, hergebruikt op de pagina's die per maand tonen
  // (Overzicht en Budget). Zo hoeft de gebruiker niet terug naar Overzicht.
  const maandNav = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button className="knop knop-icoon" aria-label={t('Vorige maand')} onClick={() => setMaand(verschuifMaand(maand, -1))}>
        ‹
      </button>
      <span style={{ minWidth: 140, textAlign: 'center', fontWeight: 600 }}>{maandLabel(maand)}</span>
      <button className="knop knop-icoon" aria-label={t('Volgende maand')} onClick={() => setMaand(verschuifMaand(maand, 1))}>
        ›
      </button>
    </div>
  )

  // Snel een nieuwe transactie: leeg het bewerk-veld en ga naar de transactiepagina
  // (waar het formulier bovenaan staat). Gekoppeld aan de centrale ➕ en de bovenbalk.
  const nieuweTransactie = () => {
    setBewerkTransactie(null)
    setPagina('transacties')
  }

  const paginaTitel = t(PAGINAS.find((p) => p.id === pagina)?.label ?? 'Overzicht')

  const paginaInhoud = (
    <div className="stapel">

      {pagina === 'overzicht' && (
        <>
          {ongeldig > 0 && (
            <p
              className="kaart kaart-compact"
              style={{ background: 'var(--negative-soft)', borderColor: 'var(--negative)', color: 'var(--text)' }}
            >
              {t('Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.', { n: ongeldig })}
            </p>
          )}

          <PaginaKop titel={paginaTitel} actie={maandNav} />

          <div className="saldotegel" data-saldo>
            <span className="label-caps">{t('Saldo')}</span>
            <span className="bedrag-groot">{formatEuro(totaalSaldo)}</span>
          </div>

          <ErrorBoundary naam="Maandoverzicht">
            <div className="stapel">
              <Kaart titel={t('Maandoverzicht')} bijschrift={maandLabel(maand)}>
                <div>
                  <div className="rij">
                    <span className="rij-midden rij-titel">{t('Inkomsten')}</span>
                    <Bedrag centen={inkomsten} richting="in" />
                  </div>
                  <div className="rij">
                    <span className="rij-midden rij-titel">{t('Uitgaven')}</span>
                    <Bedrag centen={uitgaven} richting="uit" />
                  </div>
                  <div className="rij">
                    <span className="rij-midden rij-titel">{t('Netto')}</span>
                    <Bedrag centen={inkomsten - uitgaven} richting="auto" />
                  </div>
                </div>
              </Kaart>

              {perCategorie.length > 0 && (
                <Kaart titel={t('Uitgaven per categorie')}>
                  <Donut items={perCategorie} />
                </Kaart>
              )}

              {perInkomsten.length > 0 && (
                <Kaart titel={t('Inkomsten per categorie')}>
                  <Donut items={perInkomsten} middenLabel="inkomsten" />
                </Kaart>
              )}

              <Kaart titel={t('Uitgaven per maand')}>
                <StaafGrafiek data={maandVerloop} />
              </Kaart>
            </div>
          </ErrorBoundary>
        </>
      )}

      {pagina === 'transacties' && (
        <>
          <PaginaKop titel={paginaTitel} />

          <Kaart titel={bewerkTransactie ? t('Transactie bewerken') : t('Transactie toevoegen')}>
            <TransactieFormulier
              onOpslaan={slaTransactieOp}
              onAnnuleer={() => setBewerkTransactie(null)}
              rekeningen={actieveRekeningen}
              categorieen={categorieen}
              handelaars={handelaars}
              bewerken={bewerkTransactie}
              streepjescodes={streepjescodes}
              onOnthoudStreepjescode={onthoudStreepjescode}
              onNieuweSubcategorie={voegSubcategorieToe}
            />
          </Kaart>

          <ErrorBoundary naam="Transactielijst">
            <TransactieLijst
              transacties={transacties}
              categorieen={categorieen}
              rekeningen={rekeningen}
              onBewerk={setBewerkTransactie}
              onVerwijder={verwijder}
            />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'analyse' && (
        <ErrorBoundary naam="Analyse">
          <AnalyseSectie transacties={transacties} categorieen={categorieen} rekeningen={rekeningen} overboekingen={overboekingen} terugkerendePosten={terugkerendePosten} />
        </ErrorBoundary>
      )}

      {pagina === 'budget' && (
        <>
          <PaginaKop titel={paginaTitel} actie={maandNav} />

          <ErrorBoundary naam="Budgetten">
            <Kaart titel={t('Budgetten')} bijschrift={t('voor {maand}', { maand: maandLabel(maand) })}>
              {budgetten.length === 0 && <Leeg>{t('Nog geen budgetten ingesteld.')}</Leeg>}
              {budgetten.length > 0 && (
                <p className="rij-meta" style={{ margin: 0 }}>
                  {t('Een terugbetaling in dezelfde categorie verlaagt het verbruik. Daardoor kan dit cijfer lager liggen dan de uitgaven in de Analyse.')}
                </p>
              )}
              {budgetten.length > 0 && (
                <ul className="lijst">
                  {budgetten.map((b) => {
                    const naam = categorieNaam(b.categorieId) ?? '—'
                    const uitgegeven = uitgavenInMaand(transacties, b.categorieId, maand)
                    const fractie = Math.min(uitgegeven / b.bedrag, 1)
                    const kleur = uitgegeven > b.bedrag ? 'var(--negative)' : uitgegeven >= b.bedrag * 0.8 ? 'var(--warn)' : 'var(--positive)'
                    return (
                      <li key={b.id} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span className="rij-titel">{naam}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="bedrag" style={{ color: 'var(--text-muted)' }}>
                              {formatEuro(uitgegeven)} / {formatEuro(b.bedrag)}
                            </span>
                            <button
                              className="knop knop-kaal knop-gevaar"
                              aria-label={t('Verwijder budget {naam}', { naam })}
                              onClick={() => verwijderBud(b.id)}
                            >
                              ×
                            </button>
                          </span>
                        </div>
                        <Balk label={naam} fractie={fractie} kleur={kleur} nu={uitgegeven} max={b.bedrag} />
                      </li>
                    )
                  })}
                </ul>
              )}
              {/* Het formulier biedt zelf alle ingebouwde hoofdcategorieën aan, dus het
                  hoort er ook te staan als je nog geen eigen categorie hebt gemaakt. */}
              <BudgetFormulier categorieen={categorieen} onOpslaan={voegBudgetToe} />
            </Kaart>
          </ErrorBoundary>

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
        </>
      )}

      {pagina === 'dossiers' && (
        <ErrorBoundary naam="Dossiers">
          <DossierSectie
            dossiers={dossiers}
            kosten={gedeeldeKosten}
            verrekeningen={verrekeningen}
            kinderen={kinderen}
            categorieen={categorieen}
            kindrekeningen={kindrekeningen}
            kindrekeningposten={kindrekeningposten}
            onDossierOpslaan={voegDossierToe}
            onDossierVerwijderen={verwijderDoss}
            onKostOpslaan={voegGedeeldeKostToe}
            onKostVerwijderen={verwijderKost}
            onGenereer={genereerAfrekening}
            onMarkeerOvergemaakt={markeerOvergemaakt}
            onVerwijderAfrekening={verwijderAfrekening}
            onKindrekeningOpslaan={kindrekeningOpslaan}
            onKindrekeningVerwijderen={kindrekeningVerwijderen}
            onKindrekeningPostOpslaan={kindrekeningPostOpslaan}
            onKindrekeningPostVerwijderen={kindrekeningPostVerwijderen}
          />
        </ErrorBoundary>
      )}

      {pagina === 'rekeningen' && (
        <>
          <PaginaKop titel={paginaTitel} />

          <Kaart>
            {rekeningen.length > 0 && (
              <ul className="lijst">
                {rekeningen.map((r) => {
                  const meta = [t(REKENING_TYPE_LABEL[r.type ?? 'betaal']), r.rubriek, r.rekeningnummer].filter(Boolean).join(' · ')
                  // Het saldo van vandaag: beginsaldo + transacties + overboekingen.
                  // Vroeger stond hier enkel het startbedrag dat je ooit invulde,
                  // waardoor je nooit zag wat er nu echt op de rekening staat.
                  const saldoNu = saldoVanRekening(r, transacties, overboekingen, vandaag())
                  return (
                    <li key={r.id} className="rij" style={{ opacity: r.gearchiveerd ? 0.55 : 1 }}>
                      <div className="rij-midden">
                        <span className="rij-titel">
                          {r.naam}
                          {r.gearchiveerd && <span className="rij-meta"> · {t('gearchiveerd')}</span>}
                        </span>
                        <span className="rij-meta">
                          {t('startsaldo {saldo}', { saldo: formatEuro(r.beginsaldo) })}
                          {meta ? ' · ' + meta : ''}
                        </span>
                      </div>
                      <Bedrag centen={saldoNu} />
                      <span className="rij-acties">
                        <button className="knop knop-kaal" aria-label={t('Bewerk rekening {naam}', { naam: r.naam })} onClick={() => setBewerkRekening(r)}>
                          ✎
                        </button>
                        <button
                          className="knop knop-ghost knop-klein"
                          aria-label={r.gearchiveerd ? t('Herstel rekening {naam}', { naam: r.naam }) : t('Archiveer rekening {naam}', { naam: r.naam })}
                          onClick={() => archiveerRekening(r, !r.gearchiveerd)}
                        >
                          {r.gearchiveerd ? t('herstel') : t('archiveer')}
                        </button>
                        <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder rekening {naam}', { naam: r.naam })} onClick={() => verwijderRek(r.id)}>
                          ×
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <RekeningFormulier onOpslaan={slaRekeningOp} onAnnuleer={() => setBewerkRekening(null)} bewerken={bewerkRekening} />
          </Kaart>

          <ErrorBoundary naam="Overboekingen">
            <OverboekingSectie
              overboekingen={overboekingen}
              rekeningen={actieveRekeningen}
              transacties={transacties}
              bewerken={bewerkOverboeking}
              onOpslaan={voegOverboekingToe}
              onVerwijderen={verwijderOverboekingH}
              onBewerk={setBewerkOverboeking}
              onStopBewerken={() => setBewerkOverboeking(null)}
            />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'spaardoelen' && (
          <ErrorBoundary naam="Spaardoelen">
            <SpaardoelSectie
              spaardoelen={spaardoelen}
              rekeningen={rekeningen}
              transacties={transacties}
              overboekingen={overboekingen}
              onOpslaan={voegSpaardoelToe}
              onVerwijderen={verwijderSpaardoelH}
            />
          </ErrorBoundary>
      )}

      {pagina === 'categorieen' && (
        <>
          <PaginaKop titel={paginaTitel} />

          <Kaart>
            {categorieen.length > 0 && (
              <ul className="lijst">
                {categorieen.map((c) => (
                  <li key={c.id} className="rij">
                    <span className="rij-midden rij-titel">{c.naam}</span>
                    <span className="rij-acties">
                      <button className="knop knop-kaal" aria-label={t('Bewerk categorie {naam}', { naam: c.naam })} onClick={() => setBewerkCategorie(c)}>
                        ✎
                      </button>
                      <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder categorie {naam}', { naam: c.naam })} onClick={() => verwijderCat(c.id)}>
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <CategorieFormulier onOpslaan={slaCategorieOp} onAnnuleer={() => setBewerkCategorie(null)} bewerken={bewerkCategorie} />
          </Kaart>

          <Kaart titel={t('Subcategorie toevoegen')} bijschrift={t('Zet een eigen item onder een bestaande categorie, zonder de boom te doorlopen.')}>
            <SubcategorieSnelFormulier onToevoegen={voegSubcategorieToe} />
          </Kaart>

          <ErrorBoundary naam="Categorieën">
            <CategorieBoom
              aanpassingen={subcategorieen}
              onToevoegen={voegSubcategorieToe}
              onWijzigen={wijzigSubcategorie}
              onVerwijderen={verwijderSubcategorieH}
            />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'leningen' && (
        <>
          <PaginaKop titel={paginaTitel} />

          <ErrorBoundary naam="Leningen">
            <LeningSectie
              leningen={leningen}
              aflossingen={aflossingen}
              onOpslaan={leningOpslaan}
              onVerwijderen={leningVerwijderen}
              onAflossingOpslaan={aflossingOpslaan}
              onAflossingVerwijderen={aflossingVerwijderen}
            />
          </ErrorBoundary>

          <ErrorBoundary naam="Garanties">
            <GarantieSectie
              garanties={garanties}
              transacties={transacties}
              onOpslaan={garantieOpslaan}
              onVerwijderen={garantieVerwijderen}
            />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'instellingen' && (
        <>
          {/* Instellingen eerst: die sectie draagt de paginatitel. De
              indexatie-rekenhulp is een hulpmiddel en komt daaronder. */}
          <ErrorBoundary naam="Instellingen">
            <InstellingenSectie
              taal={taal}
              zetTaal={zetTaal}
              verbonden={verbonden}
              bezig={bezig}
              statusTekst={statusTekst}
              onVerbind={verbindEnSynchroniseer}
              onSynchroniseer={synchroniseerNu}
              backupTekst={backupTekst}
              onExporteer={exporteerNu}
              onHerstel={herstelUitBestand}
              kinderen={kinderen}
              onKindToevoegen={voegKindToe}
              onKindWijzigen={wijzigKind}
              onKindVerwijderen={verwijderKindH}
            />
          </ErrorBoundary>

          <ErrorBoundary naam="Indexatie">
            <IndexatieCalculator />
          </ErrorBoundary>
        </>
      )}

    </div>
  )

  const undoBalk = undoInfo && (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(4.75rem + env(safe-area-inset-bottom))',
        background: '#17191e',
        color: '#fff8ed',
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        boxShadow: 'var(--shadow-sheet)',
        zIndex: 1000,
        maxWidth: '90%',
        fontSize: 14,
      }}
    >
      <span>{undoInfo.boodschap}</span>
      <button
        className="knop knop-ghost knop-klein"
        onClick={() => void undoNu()}
        style={{ color: 'var(--accent-dot)' }}
      >
        {t('Ongedaan maken')}
      </button>
    </div>
  )

  // Brede schermen: vast zijpaneel + bovenbalk + gecentreerde inhoud (V1-logica).
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Zijbalk actief={pagina} onKies={setPagina} verbonden={verbonden} bezig={bezig} statusTekst={statusTekst} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 24px',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              zIndex: 800,
            }}
          >
            <div style={{ flex: 1 }} />
            {statusTekst && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{statusTekst}</span>}
            <button className="knop knop-primair knop-klein" onClick={nieuweTransactie}>
              + {t('Nieuwe transactie')}
            </button>

            {/* Belletje met een amberen stip zodra een budget deze maand boven 85%
                zit. Klikken brengt je naar de budgetpagina. */}
            <button
              className="knop knop-icoon"
              style={{ position: 'relative' }}
              aria-label={
                budgetWaarschuwingen > 0
                  ? t('{n} budget(ten) bijna op', { n: budgetWaarschuwingen })
                  : t('Meldingen')
              }
              onClick={() => setPagina('budget')}
            >
              <span aria-hidden>🔔</span>
              {budgetWaarschuwingen > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--accent-dot)',
                  }}
                />
              )}
            </button>

            {verbonden && (
              <button className="knop knop-icoon" aria-label={t('Uitloggen')} onClick={verbreekVerbinding}>
                <span aria-hidden>⎋</span>
              </button>
            )}
          </header>
          <div style={{ padding: '1.5rem 1.5rem 3rem' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>{paginaInhoud}</div>
          </div>
        </div>
        {undoBalk}
      </div>
    )
  }

  // Smalle schermen: één kolom met de onderbalk (tabbalk + centrale ➕).
  return (
    <>
      <main style={{ ...container, paddingBottom: '5.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Merkteken grootte={30} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>Kompal</span>
        </div>
        {paginaInhoud}
      </main>
      {undoBalk}
      <OnderNavigatie actief={pagina} onKies={setPagina} onNieuweTransactie={nieuweTransactie} />
    </>
  )
}
