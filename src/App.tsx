import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Aflossing,
  Budget,
  Categorie,
  Dossier,
  DossierDocument,
  Garantie,
  GedeeldeKost,
  Gezinsrol,
  Kind,
  Kindrekening,
  Kindrekeningpost,
  Lening,
  Ordening,
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
  bewaarDossierDocument,
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
  verwijderDossierMetAanhang,
  verwijderSpaardoel,
  verwijderSubcategorie,
  laadBudgetten,
  laadCategorieen,
  laadDossiers,
  laadGedeeldeKosten,
  laadAflossingen,
  laadDossierDocumenten,
  laadGaranties,
  laadKinderen,
  laadKindrekeningen,
  laadKindrekeningposten,
  laadLeningen,
  laadOverboekingen,
  laadRekeningen,
  laadSpaardoelen,
  laadStreepjescodes,
  laadOrdeningen,
  bewaarOrdening,
  laadSubcategorieen,
  laadTerugkerendePosten,
  laadTransacties,
  laadVerrekeningen,
  verwijderBudget,
  verwijderCategorie,
  verwijderGedeeldeKost,
  verwijderAflossing,
  verwijderDossierDocument,
  verwijderGarantie,
  verwijderKind,
  verwijderKindrekening,
  verwijderKindrekeningpost,
  verwijderLening,
  verwijderOverboeking,
  verwijderRekening,
  verwijderTerugkerendePost,
  verwijderTransactie,
  verwijderTransactieMetAanhang,
  verwijderTransactiesMetAanhang,
  verwijderVerrekening,
} from './data/repository'
import { exporteerBackup, importeerBackup } from './data/backup'
import { vraagBlijvendeOpslag } from './data/opslag'
import { openDatabase } from './data/db'
import { synchroniseer } from './data/sync/sync'
import { DriveBackend } from './data/sync/drive/driveBackend'
import { vraagToken, heeftOoitVerbonden, meldAf } from './data/sync/drive/auth'
import { TransactieFormulier } from './components/TransactieFormulier'
import { TransactieLijst } from './components/TransactieLijst'
import { RekeningFormulier, REKENING_TYPE_LABEL } from './components/RekeningFormulier'
import { RekeningDetail } from './components/RekeningDetail'
import { CategorieFormulier } from './components/CategorieFormulier'
import { BudgetFormulier } from './components/BudgetFormulier'
import { DossierSectie } from './components/DossierSectie'
import { NieuwDossierKiezer } from './components/NieuwDossierKiezer'
import { LeningSectie } from './components/LeningSectie'
import { GarantieSectie } from './components/GarantieSectie'
import { Subtabs } from './ui/Subtabs'
import { CategorieVolgordeProvider } from './categorievolgorde'
import { alleHoofdcategorieen, bewaardeVolgorde, verplaats } from './utils/categorieVolgorde'
import { ORDENING_HOOFDCATEGORIEEN } from './data/schema'
import type { DossierSoort } from './utils/dossiersoort'
import { InstellingenSectie } from './components/InstellingenSectie'
import { wisAlles } from './data/herstart'
import { EersteStap } from './components/EersteStap'
import { AnalyseSectie } from './components/AnalyseSectie'
import { SpaardoelSectie } from './components/SpaardoelSectie'
import { CategorieBoom } from './components/CategorieBoom'
import { OverzichtZijkolom } from './components/OverzichtZijkolom'
import { Donut } from './components/Donut'
import { MaandGrafiek } from './components/MaandGrafiek'
import { RecenteTransacties } from './components/RecenteTransacties'
import { TopDrie } from './components/TopDrie'
import { RekenhulpenSectie } from './components/RekenhulpenSectie'
import { TerugkerendeSectie } from './components/TerugkerendeSectie'
import { PlanRegels } from './components/PlanRegels'
import { OverboekingSectie } from './components/OverboekingSectie'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OnderNavigatie, PAGINAS, type Pagina } from './components/OnderNavigatie'
import { BoekingDialoog } from './components/BoekingDialoog'
import { Dialoog } from './ui/Dialoog'
import { Meldingenbel } from './components/Meldingenbel'
import { BalansRegel } from './components/BalansRegel'
import { BufferRegel } from './components/BufferRegel'
import { Zijbalk } from './components/Zijbalk'
import { Merkteken } from './components/Merkteken'
import { saldoVerrekeningDossier } from './utils/dossier'
import { kostenVoorAfrekening, type AfrekeningFilter } from './utils/afrekening'
import { nieuwId } from './data/sync/id'
import { inkomstenPerCategorie, maandInkomsten, maandUitgaven, uitgavenPerCategorie } from './utils/overzicht'
import { inkomstenUitgavenPerMaand } from './utils/maandverloop'
import { labelVanCategorie } from './data/categorieen/resolve'
import { stelCategorieboomIn } from './data/categorieen/zoek'
import { budgetKleur, uitgavenInMaand } from './utils/budget'
import { bouwHandelaarIndex } from './utils/categorieVoorstel'
import { bonVanTransactie } from './utils/kluis'
import { formatEuro } from './utils/format'
import { bouwMeldingen } from './utils/meldingen'
import { boekingDieDezePostAfdekt, maandVooruitblik, vasteLastTransactieId } from './utils/vooruitblik'
import { useInstellingen } from './instellingen'
import { huidigeMaand, maandJaarLabel, vandaag } from './utils/datum'
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
  const [dossierdocumenten, setDossierdocumenten] = useState<DossierDocument[]>([])
  const [streepjescodes, setStreepjescodes] = useState<Streepjescode[]>([])
  const [ordeningen, setOrdeningen] = useState<Ordening[]>([])
  const [ongeldig, setOngeldig] = useState(0)
  // Ging de database helemaal niet open? Dan is 'Laden…' geen eerlijk antwoord.
  const [startFout, setStartFout] = useState<string | null>(null)
  // Of de statusmelding een fout is. `role="status"` is beleefd — een schermlezer
  // mag hem overslaan — en dat is precies verkeerd voor een mislukking na iets wat
  // de gebruiker net zelf deed. Vandaar een expliciete soort in plaats van uit de
  // tekst raden (dat laatste deed de zijbalk, met een regex op Nederlandse woorden;
  // in het Engels en Frans klopte dat dus nooit).
  const [statusIsFout, setStatusIsFout] = useState(false)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /**
   * Toon een melding bovenaan (mobiel) en in de bovenbalk (desktop).
   *
   * Goed nieuws verdwijnt vanzelf na acht seconden. Zonder dat bleef
   * "Automatisch gesynchroniseerd: 0 verstuurd" op een telefoon de hele dag boven
   * élke pagina staan. Een FOUT blijft staan tot je hem wegklikt — die heb je
   * misschien net gemist omdat je aan het typen was.
   */
  function meld(tekst: string | null, soort: 'ok' | 'fout' = 'ok') {
    if (statusTimer.current) clearTimeout(statusTimer.current)
    setStatusTekst(tekst)
    setStatusIsFout(soort === 'fout')
    if (tekst !== null && soort === 'ok') {
      statusTimer.current = setTimeout(() => {
        setStatusTekst(null)
        // Ook de foutvlag terug op nul. Bleef die op `true` staan, dan kreeg de
        // eerstvolgende geslaagde melding het rode kader van de vorige fout.
        setStatusIsFout(false)
      }, 8000)
    }
  }

  // De lopende meldingstimer opruimen wanneer de app verdwijnt.
  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current)
    },
    [],
  )
  const [verbonden, setVerbonden] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [statusTekst, setStatusTekst] = useState<string | null>(null)
  const [bewerkTransactie, setBewerkTransactie] = useState<Transactie | null>(null)
  // Staat de invoerpopup open? Toevoegen gebeurt sinds kort altijd hier, op elke
  // pagina — niet meer door eerst naar Transacties (of Budget, of Rekeningen) te
  // navigeren en daar het juiste formulier te zoeken.
  const [boekingOpen, setBoekingOpen] = useState(false)
  const [bewerkCategorie, setBewerkCategorie] = useState<Categorie | null>(null)
  const [bewerkRekening, setBewerkRekening] = useState<Rekening | null>(null)
  // Welke rekening staat rechts open? null = het formulier voor een nieuwe rekening.
  const [gekozenRekeningId, setGekozenRekeningId] = useState<string | null>(null)
  const [bewerkOverboeking, setBewerkOverboeking] = useState<Overboeking | null>(null)
  const [maand, setMaand] = useState(huidigeMaand())
  const [pagina, setPagina] = useState<Pagina>('overzicht')
  // Welke lade van de Dossiers-pagina staat open. Leningen en garanties hadden tot
  // ronde 29 een eigen pagina die niets meer was dan twee secties onder elkaar;
  // ze zijn nu subtabs naast de gedeelde kosten.
  const [dossierTab, setDossierTab] = useState<DossierSoort>('coouderschap')
  // Met welke richting de Analyse-pagina opent. De knop onder een donut op het
  // Overzicht zet die mee: klik je bij "Inkomsten per categorie" op "Bekijk in
  // Analyse", dan hoor je daar niet op de uitgaven te landen.
  const [analyseRichting, setAnalyseRichting] = useState<'uitgave' | 'inkomst'>('uitgave')
  const isDesktop = useIsDesktop()
  const [backupTekst, setBackupTekst] = useState<string | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ boodschap: string; herstel: () => Promise<void> } | null>(null)
  const backendRef = useRef<DriveBackend | null>(null)
  const undoTimer = useRef<number | null>(null)
  const { t, taal, zetTaal } = useT()
  const { budgetDrempel } = useInstellingen()

  async function herlaad() {
    const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, sc, ord, docs] = await Promise.all([
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
      laadOrdeningen(),
      laadDossierDocumenten(),
    ])
    setTransacties(tx.geldig)
    // ALLE overgeslagen records tellen, niet alleen die van transacties. Bleven de
    // negentien andere tellers ongebruikt, dan verdwenen bijvoorbeeld drie gedeelde
    // kosten uit een afrekening zonder dat er ergens iets stond — en dan stuur je
    // een bedrag van € 610 door waar € 940 hoorde te staan.
    setOngeldig(
      [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, sc, ord, docs].reduce(
        (som, r) => som + r.ongeldig,
        0,
      ),
    )
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
    setOrdeningen(ord.geldig)
    setDossierdocumenten(docs.geldig)
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
      // Eerst de database zelf, mét wachttijd. Zonder deze regel blijft een
      // geblokkeerde opslag eeuwig op "Laden…" staan; zie openDatabase().
      await openDatabase()
      const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, sc, ord, docs] = await Promise.all([
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
        laadOrdeningen(),
        laadDossierDocumenten(),
      ])
      if (!actief) return
      setTransacties(tx.geldig)
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
      setOrdeningen(ord.geldig)
      setDossierdocumenten(docs.geldig)
      // Ook bij het OPSTARTEN alle tellers optellen, niet alleen die van
      // transacties. Deze regel stond alleen in `herlaad`, dus wie de app opende en
      // niets wijzigde, zag nooit dat er records overgeslagen waren.
      setOngeldig(
        [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, sc, ord, docs].reduce(
          (som, r) => som + r.ongeldig,
          0,
        ),
      )
    }
    // Gaat de database niet open (privémodus, quota, of een oudere versie van de
    // app die een nieuwere database niet mag openen), dan bleef `transacties` op
    // null staan en toonde de app voor eeuwig "Laden…" — zonder uitleg, zonder
    // uitweg. De gebruiker concludeert dan dat alles weg is, terwijl zijn gegevens
    // er gewoon staan. Nu zegt de app wat er aan de hand is.
    void laad().catch((e) => {
      if (!actief) return
      setStartFout(e instanceof Error ? e.message : String(e))
    })
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
        if (actief) meld(t('Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }))
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
  // De volledige boom klaarzetten: de ingebouwde basis, de eigen categorieën (die
  // sinds ronde 27 zelf een middenlaag kunnen zijn) en de eigen subcategorieën.
  useMemo(() => stelCategorieboomIn(subcategorieen, categorieen), [subcategorieen, categorieen])

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

  // Let op: deze functie sluit het bewerkvenster NIET.
  //
  // Ze deed dat vroeger wel, en dat was fout. Het formulier bewaart na de
  // transactie nog twee dingen die eraan hangen: de bon en de dossierkoppeling.
  // Sloot het venster al bij stap één, dan was het formulier weg vóór stap twee
  // en drie klaar waren. Mislukte daar iets, dan verscheen de melding "je invoer
  // staat er nog" in een venster dat er niet meer was: je bon was stil verdwenen
  // en je zag alleen een gesloten popup. Het formulier zegt nu zélf wanneer
  // alles gelukt is (`onOpgeslagen`), en pas dán gaat het venster dicht.
  async function slaTransactieOp(t: Transactie) {
    await bewaarTransactie(t)
    await herlaad()
  }

  // De gedeelde kost die aan een transactie hangt. Het formulier geeft ze mee na
  // het opslaan; `null` betekent "de koppeling is weggehaald". Welke kost dat dan
  // was, weten we hier: het is de kost die naar de bewerkte transactie wijst.
  async function transactieDossierKost(kost: GedeeldeKost | null) {
    if (kost) {
      await bewaarGedeeldeKost(kost)
    } else {
      const bestaand = bewerkTransactie
        ? gedeeldeKosten.find((k) => k.transactieId === bewerkTransactie.id)
        : undefined
      if (!bestaand) return
      await verwijderGedeeldeKost(bestaand.id)
    }
    await herlaad()
  }

  // Idem voor de bon of factuur bij een transactie. Die leeft als document in de
  // kluis en niet als veld op de transactie zelf, zodat het logboek niet bij elke
  // kleine wijziging opnieuw de hele foto moet wegschrijven.
  async function transactieBon(document: DossierDocument | null) {
    if (document) {
      await bewaarDossierDocument(document)
    } else {
      const bestaand = bewerkTransactie ? bonVanTransactie(dossierdocumenten, bewerkTransactie.id) : null
      if (!bestaand) return
      await verwijderDossierDocument(bestaand.id)
    }
    await herlaad()
  }

  // En idem voor het garantiebewijs bij een aankoop (ronde 36). Kruist de brug in
  // de andere richting: tot nu toe kon je alleen vanuit een garantiebewijs een
  // boeking aanduiden.
  async function transactieGarantie(garantie: Garantie | null) {
    if (garantie) {
      await bewaarGarantie(garantie)
      await herlaad()
      return
    }
    const bestaand = bewerkTransactie
      ? garanties.find((g) => g.transactieId === bewerkTransactie.id)
      : undefined
    if (!bestaand) return
    await verwijderGarantie(bestaand.id)
    await herlaad()
    // Mét ongedaan maken, net als op de Garanties-pagina zelf: een vinkje uitzetten
    // wist hier een volledig record, inclusief de winkel, de notitie en de foto.
    toonUndo(t('Garantie verwijderd'), () => bewaarGarantie(bestaand))
  }

  async function slaRekeningOp(r: Rekening) {
    setGekozenRekeningId(r.id)
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
      meld(
        t('Deze rekening heeft nog {n} boeking(en). Archiveer ze in plaats van ze te verwijderen.', { n: aantal }),
        'fout',
      )
      return
    }
    await verwijderRekening(id)
    setGekozenRekeningId(null)
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

  async function voegKindToe(naam: string, rol?: Gezinsrol) {
    await bewaarKind({ id: nieuwId(), naam, ...(rol ? { rol } : {}) })
    await herlaad()
  }

  // Krijgt het volledige gewijzigde gezinslid terug. Archiveren en heropenen
  // lopen via dezelfde weg (enkel het veld 'gearchiveerd' verschilt).
  async function wijzigKind(lid: Kind) {
    await bewaarKind(lid)
    await herlaad()
  }

  async function verwijderKindH(id: string) {
    const oud = kinderen.find((k) => k.id === id)
    await verwijderKind(id)
    await herlaad()
    if (oud) toonUndo(t('Kind verwijderd'), () => bewaarKind(oud))
  }

  // Een eigen MIDDENcategorie maken onder een hoofdcategorie (eigen óf ingebouwd).
  // Zo krijgt ook je eigen indeling de volledige boom hoofd → categorie → item.
  async function voegCategorieOnderToe(ouderId: string, naam: string) {
    await bewaarCategorie({ id: nieuwId(), naam, ouderId })
    await herlaad()
  }

  async function verwijderCat(id: string) {
    const oud = categorieen.find((c) => c.id === id)
    // Alles wat eronder hangt gaat mee: de eigen middencategorieën en de
    // subcategorieën daarin. Bleven die staan, dan zouden het weesrecords zijn die
    // nergens meer verschijnen maar wél mee gesynchroniseerd worden — dezelfde
    // regel als bij het verwijderen van een dossier of een transactie.
    const kinderen = categorieen.filter((c) => c.ouderId === id)
    const onderliggendeIds = new Set([id, ...kinderen.map((c) => c.id)])
    const oudeSubs = subcategorieen.filter((sub) => onderliggendeIds.has(sub.categorieId))

    await verwijderCategorie(id)
    for (const k of kinderen) await verwijderCategorie(k.id)
    for (const sub of oudeSubs) await verwijderSubcategorie(sub.id)
    await herlaad()

    if (oud) {
      toonUndo(t('Categorie verwijderd'), async () => {
        await bewaarCategorie(oud)
        for (const k of kinderen) await bewaarCategorie(k)
        for (const sub of oudeSubs) await bewaarSubcategorie(sub)
      })
    }
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
    // In één ondeelbare stap: ofwel verdwijnt alles, ofwel niets. Zie de uitleg
    // bij verwijderDossierMetAanhang — losse stappen lieten bij een onderbreking
    // onzichtbare weeskosten achter die wél meesynchroniseerden.
    await verwijderDossierMetAanhang(id, {
      gedeeldeKostIds: oudeKosten.map((k) => k.id),
      verrekeningIds: oudeVerrekeningen.map((v) => v.id),
      kindrekeningIds: oudeKindrekeningen.map((k) => k.id),
      kindrekeningpostIds: oudeKindrekeningposten.map((p) => p.id),
    })
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

  // Vanuit het meldingenpaneel komt alleen een id binnen; de post zelf zoeken we
  // hier op. Zo hoeft de bel niets van vaste lasten te weten.
  /** Inboeken vanuit het meldingenpaneel. Altijd in de HUIDIGE maand: de bel gaat
   *  over nu, niet over de maand die je toevallig aan het bekijken bent. */
  async function boekVasteLastPerId(postId: string) {
    const post = terugkerendePosten.find((p) => p.id === postId)
    if (post) await boekTerugkerend(post, huidigeMaand())
  }

  /**
   * Een vaste last inboeken in een BEPAALDE maand.
   *
   * De maand is sinds ronde 35 een expliciete parameter in plaats van de maand die
   * de pagina toevallig toont. Vanaf de Plan-pagina is dat de maand die je daar
   * gekozen hebt (dat klopt: daar blader je bewust). Vanaf het belletje is het
   * altijd de huidige maand — dat paneel meldt wat er NU nog moet gebeuren, en
   * bladerde je op het Overzicht naar maart, dan boekte het stilletjes in maart.
   */
  async function boekTerugkerend(post: TerugkerendePost, doelMaand: string) {
    // Vangnet tegen dubbel boeken. De app herkent een handmatig ingetikte vaste
    // last alleen wanneer de categorie aan beide kanten gelijk is (zie
    // utils/vooruitblik.ts). Staat je post zonder categorie en heb je de betaling
    // mét categorie ingetikt, dan zegt de app "nog niet geboekt" terwijl het geld
    // al vertrokken is — en dan zou één klik op "Boek in" hem een tweede keer
    // aanmaken. We kijken daarom nog eens zelf: bestaat er in die maand al een
    // boeking van exact hetzelfde bedrag op dezelfde rekening, dan boeken we niet
    // en zeggen we waarom.
    //
    // We gebruiken hiervoor dezelfde toewijzing als de rest van de app, en géén
    // eigen "zelfde bedrag op dezelfde rekening"-zoekactie. Die laatste blokkeerde
    // namelijk je tweede abonnement van € 9,99 zodra het eerste geboekt was.
    //
    // Belangrijk: ÁLLE posten van deze maand gaan mee, niet alleen deze ene. Juist
    // dat maakt het verschil — de toewijzing zorgt dat één boeking hoogstens één
    // post afdekt, en dus dat de boeking van Netflix niet als "Spotify staat er al"
    // gelezen wordt. Geef je alleen deze post mee, dan valt die bescherming weg.
    const gelijkaardig = boekingDieDezePostAfdekt(transacties ?? [], terugkerendePosten, post, doelMaand)
    if (gelijkaardig) {
      meld(
        t('{naam} lijkt al geboekt op {datum} ({bedrag}). Er is niets bijgemaakt — controleer je transacties.', {
          naam: post.omschrijving,
          datum: gelijkaardig.datum,
          bedrag: formatEuro(Math.abs(gelijkaardig.bedrag)),
        }),
        'fout',
      )
      return
    }

    const dag = String(post.dag).padStart(2, '0')
    // Bewust 'tx' en niet 't': 't' is in dit bestand de vertaalfunctie, en die
    // hebben we hieronder nodig voor de ongedaan-maken-melding.
    const tx: Transactie = {
      id: `tk-${post.id}-${doelMaand}`,
      datum: `${doelMaand}-${dag}`,
      omschrijving: post.omschrijving,
      bedrag: post.bedrag,
      rekeningId: post.rekeningId,
      ...(post.categorieId ? { categorieId: post.categorieId } : {}),
      // Ook een ingeboekte vaste last krijgt het moment van invoeren mee, zodat ze
      // in de lijst boven de boekingen van dezelfde dag staat die je eerder tikte.
      ingevoerdOp: new Date().toISOString(),
    }
    await bewaarTransactie(tx)
    await herlaad()
    // Inboeken maakt een ECHTE transactie: je saldo daalt ermee. Dan hoort er ook
    // een weg terug te zijn, net als bij elke andere actie in de app.
    toonUndo(t('{naam} ingeboekt', { naam: post.omschrijving }), async () => {
      await verwijderTransactie(tx.id)
    })
  }

  // Een ingeboekte vaste last weer losmaken. Wist precies de transactie die het
  // inboeken maakte (het id ligt vast), dus nooit een andere boeking van dezelfde
  // dag met hetzelfde bedrag.
  async function maakInboekenOngedaan(post: TerugkerendePost) {
    const id = vasteLastTransactieId(post.id, maand)
    const oud = (transacties ?? []).find((x) => x.id === id)
    if (!oud) return
    await verwijderTransactie(id)
    await herlaad()
    toonUndo(t('Inboeken ongedaan gemaakt'), () => bewaarTransactie(oud))
  }

  // Genereer een afrekening als momentopname over de gekozen periode + kinderen.
  // Dit blokkeert niets: de kosten blijven open tot je de afrekening als
  // 'overgemaakt' markeert.
  async function genereerAfrekening(dossier: Dossier, filter: AfrekeningFilter) {
    const gedekt = kostenVoorAfrekening(gedeeldeKosten, dossier.id, filter, verrekeningen)
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

  // --- Documentkluis per dossier ---
  async function dossierDocumentOpslaan(d: DossierDocument) {
    await bewaarDossierDocument(d)
    await herlaad()
  }

  async function dossierDocumentVerwijderen(id: string) {
    const oud = dossierdocumenten.find((d) => d.id === id)
    await verwijderDossierDocument(id)
    await herlaad()
    if (oud) toonUndo(t('Document verwijderd'), () => bewaarDossierDocument(oud))
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
    // Wat aan de transactie hing, gaat mee. Anders blijft een gedeelde kost als
    // onzichtbaar weesrecord in het dossier meetellen in de afrekening, en blijft
    // de bon als data-URL in de database én in elke back-up staan. Dezelfde regel
    // als bij het verwijderen van een dossier.
    const oudeKost = gedeeldeKosten.find((k) => k.transactieId === id)
    const oudeBon = bonVanTransactie(dossierdocumenten, id)
    const oudeGarantie = garanties.find((g) => g.transactieId === id)
    // In ÉÉN keer, niet in drie stappen: faalde stap twee, dan was de transactie
    // weg maar bleef de gedeelde kost in het dossier meetellen.
    await verwijderTransactieMetAanhang(id, {
      gedeeldeKostId: oudeKost?.id,
      documentId: oudeBon?.id,
      garantieId: oudeGarantie?.id,
    })
    await herlaad()
    if (oud) {
      toonUndo(t('Transactie verwijderd'), async () => {
        await bewaarTransactie(oud)
        if (oudeKost) await bewaarGedeeldeKost(oudeKost)
        if (oudeBon) await bewaarDossierDocument(oudeBon)
        if (oudeGarantie) await bewaarGarantie(oudeGarantie)
      })
    }
  }

  // Meerdere transacties tegelijk verwijderen, met ÉÉN keer ongedaan maken voor de
  // hele groep. Wat aan een transactie hangt (een gedeelde kost, een bon) gaat mee,
  // net als bij het verwijderen van één rij — anders blijven er weesrecords staan
  // die onzichtbaar in een dossier blijven meetellen.
  async function verwijderMeerdere(ids: string[]) {
    if (ids.length === 0) return
    const oude = (transacties ?? []).filter((t) => ids.includes(t.id))
    const oudeKosten = gedeeldeKosten.filter((k) => k.transactieId && ids.includes(k.transactieId))
    const oudeBonnen = ids.map((id) => bonVanTransactie(dossierdocumenten, id)).filter(Boolean) as DossierDocument[]
    const oudeGaranties = garanties.filter((g) => g.transactieId && ids.includes(g.transactieId))
    // In ÉÉN ondeelbare stap. Brak deze reeks halverwege af, dan waren de
    // transacties weg maar bleven er gedeelde kosten in een dossier meetellen.
    await verwijderTransactiesMetAanhang(ids, {
      gedeeldeKostIds: oudeKosten.map((k) => k.id),
      documentIds: oudeBonnen.map((d) => d.id),
      garantieIds: oudeGaranties.map((g) => g.id),
    })
    await herlaad()
    toonUndo(t('{n} transactie(s) verwijderd', { n: ids.length }), async () => {
      for (const o of oude) await bewaarTransactie(o)
      for (const k of oudeKosten) await bewaarGedeeldeKost(k)
      for (const d of oudeBonnen) await bewaarDossierDocument(d)
      for (const g of oudeGaranties) await bewaarGarantie(g)
    })
  }

  async function verbindEnSynchroniseer() {
    setBezig(true)
    meld(null)
    try {
      await vraagToken(true) // opent zo nodig het Google-aanmeldvenster
      setVerbonden(true)
      if (!backendRef.current) backendRef.current = new DriveBackend()
      const r = await synchroniseer(backendRef.current)
      await herlaad()
      meld(t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }))
    } catch (e) {
      meld(t('Verbinden mislukte: {fout}', { fout: e instanceof Error ? e.message : t('onbekende fout') }), 'fout')
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
      meld(t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }))
    } catch (e) {
      meld(t('Synchroniseren mislukte: {fout}', { fout: e instanceof Error ? e.message : t('onbekende fout') }), 'fout')
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
    meld(t('Verbinding met Google Drive verbroken. Je gegevens blijven op dit toestel staan.'))
  }

  // "Begin opnieuw": alles wissen, inclusief de logbestanden in de Drive-back-up
  // wanneer die verbonden is. Zonder dat laatste haalt de eerstvolgende sync
  // gewoon alles weer binnen. Daarna herladen we de (nu lege) gegevens.
  async function beginOpnieuw() {
    const resultaat = await wisAlles(verbonden ? backendRef.current : null)
    await herlaad()
    return resultaat
  }

  // Alles wat het belletje moet melden. De logica zit in utils/meldingen.ts, zodat
  // ze zuiver testbaar is EN op elk schermformaat identiek — het belletje stond
  // voorheen alleen in de desktopweergave, met de drempel hard op 85% in de code.
  // LET OP: `huidigeMaand()`, niet de maand die je bovenaan hebt aangeklikt.
  // Dat was een echte fout: bladerde je op het Overzicht naar maart, dan gingen
  // álle meldingen ineens over maart — en de knop "Boek in" in het meldingenpaneel
  // maakte dan ook een transactie mét een datum in maart, zonder dat er ergens
  // stond dat dat gebeurde. Meldingen gaan over NU; de maandschakelaar gaat over
  // wat je bekijkt. Dat zijn twee verschillende dingen.
  const meldingen = bouwMeldingen({
    budgetten,
    transacties: transacties ?? [],
    maand: huidigeMaand(),
    garanties,
    terugkerendePosten,
    vandaagISO: vandaag(),
    drempel: budgetDrempel,
    naamVanCategorie: (id) => labelVanCategorie(id, categorieen) ?? t('Geen categorie'),
  })

  // Eén vooruitblik voor de Plan-pagina: zowel de verwachte als de al geboekte
  // inkomsten komen hieruit, zodat beide cijfers gegarandeerd bij elkaar horen.
  const planBlik = maandVooruitblik(transacties ?? [], terugkerendePosten, maand)

  if (startFout !== null) {
    return (
      <main style={container}>
        <h1 className="paginakop">Kompal</h1>
        <Kaart titel={t('De gegevens konden niet geopend worden')}>
          <p style={{ margin: 0 }}>
            {t(
              'Je gegevens zijn niet weg — de app kan de opslag van deze browser alleen niet openen. Dat gebeurt in een privévenster, wanneer de opslag vol zit, of wanneer deze pagina nog een oudere versie van de app is.',
            )}
          </p>
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Technische melding: {fout}', { fout: startFout })}
          </p>
          <div className="knoprij">
            <button className="knop knop-primair" onClick={() => window.location.reload()}>
              {t('Opnieuw proberen')}
            </button>
          </div>
        </Kaart>
      </main>
    )
  }

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
  // Welke categorie elke handelaar de vorige keer kreeg. Zo hoeft het formulier
  // die niet elke keer opnieuw te vragen; het stelt ze voor.
  const handelaarIndex = bouwHandelaarIndex(transacties)
  // Gearchiveerde rekeningen blijven in het overzicht staan, maar verdwijnen uit
  // de keuzelijsten waar je nieuwe dingen aan koppelt.
  const actieveRekeningen = rekeningen.filter((r) => !r.gearchiveerd)
  const gekozenRekening = rekeningen.find((r) => r.id === gekozenRekeningId) ?? null
  const maandPaar = inkomstenUitgavenPerMaand(transacties, maand, 6)

  // Eén maand-schakelaar, hergebruikt op de pagina's die per maand tonen
  // (Overzicht en Budget). Zo hoeft de gebruiker niet terug naar Overzicht.
  const maandNav = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button className="knop knop-icoon" aria-label={t('Vorige maand')} onClick={() => setMaand(verschuifMaand(maand, -1))}>
        ‹
      </button>
      <span style={{ minWidth: 140, textAlign: 'center', fontWeight: 600 }}>{maandJaarLabel(maand)}</span>
      <button className="knop knop-icoon" aria-label={t('Volgende maand')} onClick={() => setMaand(verschuifMaand(maand, 1))}>
        ›
      </button>
    </div>
  )

  // Iets inboeken. Dit opende vroeger geen formulier maar *verplaatste je*: het
  // zette je op de Transacties-pagina en hoopte dat je het formulier daar zag. Je
  // verloor dus de pagina waar je mee bezig was, en voor een vaste last of een
  // overboeking werkte de knop niet eens. Nu opent de popup gewoon waar je staat.
  const nieuweTransactie = () => {
    setBewerkTransactie(null)
    setBoekingOpen(true)
  }

  // De twee popuplagen. Ze staan buiten `paginaInhoud` en worden in élke indeling
  // (breed én smal) getoond, zodat de ➕ overal hetzelfde doet.
  const boekingLagen = (
    <>
      <BoekingDialoog
        open={boekingOpen}
        onSluiten={() => setBoekingOpen(false)}
        rekeningen={actieveRekeningen}
        categorieen={categorieen}
        handelaars={handelaars}
        handelaarIndex={handelaarIndex}
        streepjescodes={streepjescodes}
        onOnthoudStreepjescode={onthoudStreepjescode}
        onNieuweSubcategorie={voegSubcategorieToe}
        gezinsleden={kinderen}
        overboekingen={overboekingen}
        transacties={transacties}
        dossiers={dossiers}
        onTransactie={slaTransactieOp}
        onVastePost={voegTerugkerendToe}
        onOverboeking={voegOverboekingToe}
        onDossierKost={transactieDossierKost}
        onBon={transactieBon}
        onGarantie={transactieGarantie}
      />

      {/* Bewerken krijgt dezelfde popup-vorm als toevoegen. Anders zou je een
          boeking in het ene scherm invullen en in het andere aanpassen. */}
      <Dialoog
        titel={t('Transactie bewerken')}
        open={bewerkTransactie !== null}
        onSluiten={() => setBewerkTransactie(null)}
      >
        {bewerkTransactie && (
          <TransactieFormulier
            onOpslaan={slaTransactieOp}
            onAnnuleer={() => setBewerkTransactie(null)}
            rekeningen={actieveRekeningen}
            categorieen={categorieen}
            handelaars={handelaars}
            handelaarIndex={handelaarIndex}
            bewerken={bewerkTransactie}
            streepjescodes={streepjescodes}
            onOnthoudStreepjescode={onthoudStreepjescode}
            onNieuweSubcategorie={voegSubcategorieToe}
            gezinsleden={kinderen}
            dossiers={dossiers}
            gekoppeldeKost={gedeeldeKosten.find((k) => k.transactieId === bewerkTransactie.id) ?? null}
            onDossierKost={transactieDossierKost}
            bon={bonVanTransactie(dossierdocumenten, bewerkTransactie.id)}
            onBon={transactieBon}
            gekoppeldeGarantie={garanties.find((g) => g.transactieId === bewerkTransactie.id) ?? null}
            onGarantie={transactieGarantie}
            // Pas sluiten wanneer de transactie én de bon én de dossierkoppeling
            // alle drie bewaard zijn. Mislukt er onderweg iets, dan blijft het
            // venster staan met de reden erbij.
            onOpgeslagen={() => setBewerkTransactie(null)}
          />
        )}
      </Dialoog>
    </>
  )

  // De door de gebruiker gekozen volgorde van de hoofdcategorieën. Leeg = de
  // standaardvolgorde; zie utils/categorieVolgorde.ts.
  const hoofdVolgorde = bewaardeVolgorde(ordeningen)

  // Eén hoofdcategorie een plaats omhoog of omlaag zetten (Categorieën-pagina).
  // We bewaren daarbij bewust de VOLLEDIGE volgorde, ook de categorieën die je
  // niet aanraakte: zo ligt vanaf de eerste verplaatsing alles vast en kan een
  // latere toevoeging de rest niet meer door elkaar schudden.
  async function verplaatsHoofdcategorie(id: string, richting: -1 | 1) {
    const alle = alleHoofdcategorieen(categorieen)
    const nieuw = verplaats(alle, hoofdVolgorde, id, richting)
    await bewaarOrdening({ id: ORDENING_HOOFDCATEGORIEEN, ids: nieuw })
    await herlaad()
  }

  const paginaTitel = t(PAGINAS.find((p) => p.id === pagina)?.label ?? 'Overzicht')

  // Een melding brengt je naar een pagina, en bij de Dossiers-pagina ook naar de
  // juiste lade: een aflopende garantie hoort je bij de garanties te zetten, niet
  // bij de gedeelde kosten.
  function gaNaarMelding(doel: Pagina, subtab?: DossierSoort) {
    setPagina(doel)
    if (subtab) setDossierTab(subtab)
  }

  function gaNaarAnalyse(richting: 'uitgave' | 'inkomst') {
    setAnalyseRichting(richting)
    setPagina('analyse')
  }

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

          {/* Een gloednieuwe (of net gewiste) app is helemaal leeg. Dan is één
              ding belangrijker dan alle cijfers: weten wat je eerst moet doen. */}
          {rekeningen.length === 0 && <EersteStap onNaarRekeningen={() => setPagina('rekeningen')} />}

          {/* Eén blok met alles over deze maand.
              Dit waren drie losse kaarten onder elkaar — de kengetallen, de
              balansregel en de bufferregel — die alle drie over hetzelfde
              maandcijfer gingen. Ze staan nu in één kaart, met een scheidingslijn
              ertussen: eerst de cijfers, dan wat ze betekenen.

              De vier cijfers verschijnen nu op ELK schermformaat. Op een telefoon
              stond er in de plaats een aparte kaart "Maandoverzicht" met exact
              dezelfde drie bedragen eronder; die is dus overbodig geworden. */}
          <Kaart className="stapel" data-maandblok>
            <div className="tegelrij" data-kengetallen>
              <div className="saldotegel glans glans-sterk" data-saldo>
                <span className="label-caps">{t('Saldo')}</span>
                <span className="bedrag-groot">{formatEuro(totaalSaldo)}</span>
              </div>
              <div className="kengetal">
                <span className="label-caps">{t('Inkomsten')}</span>
                <Bedrag centen={inkomsten} richting="in" groot />
              </div>
              <div className="kengetal">
                <span className="label-caps">{t('Uitgaven')}</span>
                <Bedrag centen={uitgaven} richting="uit" groot />
              </div>
              <div className="kengetal">
                <span className="label-caps">{t('Netto')}</span>
                <Bedrag centen={inkomsten - uitgaven} richting="auto" groot />
              </div>
            </div>

            {/* Benoemt wat het netto-cijfer betekent (overschot, tekort of balans)
                en hoelang je toekomt zonder inkomen. Allebei kaal: ze horen bij de
                cijfers hierboven en niet in een eigen kaartje. */}
            <BalansRegel inkomsten={inkomsten} uitgaven={uitgaven} kaal />
            <BufferRegel
              rekeningen={rekeningen}
              transacties={transacties}
              overboekingen={overboekingen}
              terugkerendePosten={terugkerendePosten}
              vandaagISO={vandaag()}
              kaal
            />
          </Kaart>

          <ErrorBoundary naam="Maandoverzicht">
            <div className="raster-hoofd">
              <div className="stapel">
                {/* Twee grote donuts. Geen lijst met alle categorieën eronder meer:
                    hang je met de muis over een schijf (of tik je erop), dan komt
                    haar naam, bedrag en aandeel in het GAT van de donut te staan.
                    Onder de grafiek staan enkel de drie grootste, met een knop naar
                    de Analyse-pagina voor het volledige verhaal. */}
                <div className="raster-twee">
                  {perCategorie.length > 0 && (
                    <Kaart titel={t('Uitgaven per categorie')} bijschrift={maandJaarLabel(maand)}>
                      <Donut items={perCategorie} interactief toonLegende={false} grootte={240} />
                      <TopDrie posten={perCategorie} onAlles={() => gaNaarAnalyse('uitgave')} />
                    </Kaart>
                  )}

                  {perInkomsten.length > 0 && (
                    <Kaart titel={t('Inkomsten per categorie')} bijschrift={maandJaarLabel(maand)}>
                      <Donut items={perInkomsten} middenLabel="inkomsten" interactief toonLegende={false} grootte={240} />
                      <TopDrie posten={perInkomsten} onAlles={() => gaNaarAnalyse('inkomst')} />
                    </Kaart>
                  )}
                </div>

              </div>

              {/* Enkel op desktop: de ruimte rechts vullen met dingen waarvoor je
                  anders naar een andere pagina moet. */}
              {isDesktop && (
                <OverzichtZijkolom
                  transacties={transacties}
                  budgetten={budgetten}
                  maand={maandJaarLabel(maand)}
                  categorieNaam={categorieNaam}
                  onGaNaarBudget={() => setPagina('budget')}
                />
              )}
            </div>

            {/* Ronde 32: deze twee blokken stonden IN de linkerkolom van het
                raster hierboven. Op een breed scherm waren ze daardoor maar twee
                derde van de pagina breed, met een leeg vak rechts ernaast — terwijl
                het allebei brede dingen zijn: een lijst met datum, categorie en
                bedrag, en een grafiek van zes maanden. Ze staan nu ONDER het
                raster en nemen dus de volle breedte. */}
            <div className="stapel" data-volle-breedte>
              {/* Je laatste boekingen. Stonden alleen in de zijkolom, dus op een
                  telefoon zag je ze op de startpagina helemaal niet. */}
              <RecenteTransacties
                transacties={transacties}
                categorieen={categorieen}
                onAlle={() => setPagina('transacties')}
              />

              <Kaart
                titel={t('Inkomsten en uitgaven per maand')}
                bijschrift={t('De laatste zes maanden, met je gemiddelde als lijn.')}
              >
                <MaandGrafiek data={maandPaar} lopendeMaand={huidigeMaand()} />
              </Kaart>
            </div>
          </ErrorBoundary>
        </>
      )}

      {pagina === 'transacties' && (
        <>
          <PaginaKop titel={paginaTitel} />

          {/* Deze pagina is nu puur overzicht. Het invoerformulier stond hier in een
              kolom naast de lijst en nam op een telefoon het hele eerste beeld in,
              zodat je je eigen transacties niet zag zonder te scrollen. Toevoegen
              gaat via de popup (de ➕), bewerken via het potloodje in de lijst — in
              dezelfde popup, zodat er één vorm is om een boeking in te vullen. */}
          <ErrorBoundary naam="Transactielijst">
            <TransactieLijst
              transacties={transacties}
              categorieen={categorieen}
              rekeningen={rekeningen}
              gedeeldeKosten={gedeeldeKosten}
              garanties={garanties}
              onBewerk={setBewerkTransactie}
              onVerwijder={verwijder}
              onVerwijderMeerdere={verwijderMeerdere}
            />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'analyse' && (
        <ErrorBoundary naam="Analyse">
          <AnalyseSectie
            beginRichting={analyseRichting}
            gezinsleden={kinderen} transacties={transacties} categorieen={categorieen} rekeningen={rekeningen} overboekingen={overboekingen} terugkerendePosten={terugkerendePosten} />
        </ErrorBoundary>
      )}

      {pagina === 'budget' && (
        <>
          <PaginaKop titel={paginaTitel} actie={maandNav} />

          <div className="raster-lijst-formulier">
          <div className="kolom-formulier">
            {/* Het formulier biedt zelf alle ingebouwde hoofdcategorieën aan, dus het
                hoort er ook te staan als je nog geen eigen categorie hebt gemaakt. */}
            <Kaart titel={t('Budget instellen')}>
              <BudgetFormulier categorieen={categorieen} onOpslaan={voegBudgetToe} />
            </Kaart>
          </div>

          <div className="kolom-lijst stapel">
          {/* Bovenaan het plan: wat er van je inkomen al vergeven is, en wat er
              overblijft. Budgetten en vaste lasten beantwoorden dezelfde vraag van
              twee kanten; ze stonden hier als twee losse lijstjes zonder dat er
              ooit één cijfer uit kwam. */}
          <ErrorBoundary naam="Plan">
            <PlanRegels
              posten={terugkerendePosten}
              budgetten={budgetten}
              maand={maand}
              verwachteInkomsten={planBlik.verwachteInkomsten}
              geboekteInkomsten={planBlik.geboekt.inkomsten}
            />
          </ErrorBoundary>

          {/* Eerst wat binnenkomt, dan wat eruit gaat — in die volgorde lees je je
              plan. De vaste inkomsten stonden tot ronde 25 verstopt in dezelfde
              lijst als de lasten, met de keuze onderaan het formulier. */}
          <ErrorBoundary naam="Vaste inkomsten">
            <TerugkerendeSectie
              soort="inkomst"
              posten={terugkerendePosten}
              rekeningen={actieveRekeningen}
              categorieen={categorieen}
              transacties={transacties}
              maand={maand}
              maandLabel={maandJaarLabel(maand)}
              onOpslaan={voegTerugkerendToe}
              onVerwijderen={verwijderTerugkerend}
              onBoek={(post) => boekTerugkerend(post, maand)}
              onOngedaan={maakInboekenOngedaan}
            />
          </ErrorBoundary>

          <ErrorBoundary naam="Budgetten">
            <Kaart titel={t('Budgetten')} bijschrift={t('voor {maand}', { maand: maandJaarLabel(maand) })}>
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
                    // De drempel die de gebruiker zelf koos, niet een vast getal:
                    // stond die op 95 %, dan kleurde de balk toch al oranje bij 80 %.
                    const kleur = budgetKleur(uitgegeven, b.bedrag, budgetDrempel)
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
            </Kaart>
          </ErrorBoundary>

          <ErrorBoundary naam="Vaste lasten">
            <TerugkerendeSectie
              soort="uitgave"
              posten={terugkerendePosten}
              rekeningen={actieveRekeningen}
              categorieen={categorieen}
              transacties={transacties}
              maand={maand}
              maandLabel={maandJaarLabel(maand)}
              onOpslaan={voegTerugkerendToe}
              onVerwijderen={verwijderTerugkerend}
              onBoek={(post) => boekTerugkerend(post, maand)}
              onOngedaan={maakInboekenOngedaan}
            />
          </ErrorBoundary>
          </div>
          </div>
        </>
      )}

      {pagina === 'dossiers' && (
        <>
          <PaginaKop titel={paginaTitel} />

          {/* De wegwijzer alleen zolang je nog helemaal niets hebt. Zodra er één
              dossier, lening of aankoop bestaat, doen de subtabs hieronder dat
              werk en zou de kaart bij elk bezoek ruimte innemen zonder iets te
              zeggen. Klik je hier een soort aan, dan opent die subtab — vroeger
              gebeurde er bij 'Gedeelde kosten' letterlijk niets. */}
          {dossiers.length === 0 && leningen.length === 0 && garanties.length === 0 && (
            <NieuwDossierKiezer onKies={setDossierTab} />
          )}

          <Subtabs
            naam="dossiers"
            label={t('Soort dossier')}
            actief={dossierTab}
            onKies={setDossierTab}
            tabs={[
              { id: 'coouderschap', teken: '👨‍👧', label: t('Gedeelde kosten'), telling: dossiers.length },
              { id: 'lening', teken: '📄', label: t('Leningen'), telling: leningen.length },
              { id: 'garantie', teken: '🧾', label: t('Facturen & garantiebewijzen'), telling: garanties.length },
            ]}
          >
            {dossierTab === 'coouderschap' && (
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
                  documenten={dossierdocumenten}
                  onDocumentOpslaan={dossierDocumentOpslaan}
                  onDocumentVerwijderen={dossierDocumentVerwijderen}
                  onNieuweSubcategorie={voegSubcategorieToe}
                />
              </ErrorBoundary>
            )}

            {dossierTab === 'lening' && (
              <ErrorBoundary naam="Leningen">
                <LeningSectie
                  gezinsleden={kinderen}
                  leningen={leningen}
                  aflossingen={aflossingen}
                  onOpslaan={leningOpslaan}
                  onVerwijderen={leningVerwijderen}
                  onAflossingOpslaan={aflossingOpslaan}
                  onAflossingVerwijderen={aflossingVerwijderen}
                  documenten={dossierdocumenten}
                  onDocumentOpslaan={dossierDocumentOpslaan}
                  onDocumentVerwijderen={dossierDocumentVerwijderen}
                />
              </ErrorBoundary>
            )}

            {dossierTab === 'garantie' && (
              <ErrorBoundary naam="Garanties">
                <GarantieSectie
                  gezinsleden={kinderen}
                  garanties={garanties}
                  transacties={transacties}
                  onOpslaan={garantieOpslaan}
                  onVerwijderen={garantieVerwijderen}
                  documenten={dossierdocumenten}
                  onDocumentOpslaan={dossierDocumentOpslaan}
                  onDocumentVerwijderen={dossierDocumentVerwijderen}
                />
              </ErrorBoundary>
            )}
          </Subtabs>
        </>
      )}

      {pagina === 'rekeningen' && (
        <>
          <PaginaKop titel={paginaTitel} />

          <div className="raster-lijst-formulier">
          {/* Rechts staat het detail van de rekening die je aanklikt: haar saldo,
              wat er deze maand op gebeurde, en haar laatste boekingen. Is er niets
              gekozen (of ben je aan het bewerken), dan staat daar het formulier. */}
          <div className="kolom-formulier">
            {bewerkRekening || !gekozenRekening ? (
              <Kaart titel={bewerkRekening ? t('Rekening bewerken') : t('Nieuwe rekening')}>
                <RekeningFormulier onOpslaan={slaRekeningOp} onAnnuleer={() => setBewerkRekening(null)} bewerken={bewerkRekening} />
              </Kaart>
            ) : (
              <RekeningDetail
                rekening={gekozenRekening}
                transacties={transacties}
                overboekingen={overboekingen}
                categorieen={categorieen}
                rekeningNaam={(id) => rekeningen.find((r) => r.id === id)?.naam}
                onBewerk={setBewerkRekening}
                onArchiveer={archiveerRekening}
                onVerwijder={verwijderRek}
              />
            )}
          </div>

          <div className="kolom-lijst stapel">
          <Kaart
            actie={
              gekozenRekening ? (
                <button
                  className="knop knop-ghost knop-klein"
                  onClick={() => {
                    setGekozenRekeningId(null)
                    setBewerkRekening(null)
                  }}
                >
                  + {t('Nieuwe rekening')}
                </button>
              ) : undefined
            }
          >
            {rekeningen.length > 0 && (
              <ul className="lijst">
                {rekeningen.map((r) => {
                  const meta = [t(REKENING_TYPE_LABEL[r.type ?? 'betaal']), r.rubriek, r.rekeningnummer].filter(Boolean).join(' · ')
                  // Het saldo van vandaag: beginsaldo + transacties + overboekingen.
                  const saldoNu = saldoVanRekening(r, transacties, overboekingen, vandaag())
                  const gekozen = r.id === gekozenRekeningId
                  return (
                    <li
                      key={r.id}
                      className="rij"
                      style={{
                        opacity: r.gearchiveerd ? 0.55 : 1,
                        background: gekozen ? 'var(--accent-soft)' : undefined,
                      }}
                    >
                      {/* De hele regel is de knop: aanklikken opent het detail rechts
                          (op een telefoon: eronder). */}
                      <button
                        type="button"
                        className="rij-midden"
                        aria-current={gekozen ? 'true' : undefined}
                        aria-label={t('Toon rekening {naam}', { naam: r.naam })}
                        onClick={() => {
                          setGekozenRekeningId(r.id)
                          setBewerkRekening(null)
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                      >
                        <span className="rij-titel">
                          {r.naam}
                          {r.gearchiveerd && <span className="rij-meta"> · {t('gearchiveerd')}</span>}
                        </span>
                        <span className="rij-meta">
                          {t('startsaldo {saldo}', { saldo: formatEuro(r.beginsaldo) })}
                          {meta ? ' · ' + meta : ''}
                        </span>
                      </button>
                      <Bedrag centen={saldoNu} />
                    </li>
                  )
                })}
              </ul>
            )}
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
          </div>
          </div>
        </>
      )}

      {pagina === 'spaardoelen' && (
          <ErrorBoundary naam="Spaardoelen">
            <SpaardoelSectie
              gezinsleden={kinderen}
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

          <div className="raster-lijst-formulier">
          <div className="kolom-formulier stapel">
            <Kaart titel={bewerkCategorie ? t('Categorie bewerken') : t('Nieuwe categorie')}>
              <CategorieFormulier onOpslaan={slaCategorieOp} onAnnuleer={() => setBewerkCategorie(null)} bewerken={bewerkCategorie} />
            </Kaart>
          </div>

          <div className="kolom-lijst stapel">
          <Kaart>
            {categorieen.length > 0 && (
              <ul className="lijst">
                {/* Enkel je eigen HOOFDcategorieën. De middencategorieën die je
                    eronder maakt, staan in de boom hieronder op hun plaats. */}
                {categorieen.filter((c) => !c.ouderId).map((c) => (
                  <li key={c.id} className="rij">
                    {/* Zelfde vierkantje als in de transactielijst, zodat je hier meteen
                        ziet wat je gekozen hebt. Zonder icoon: de beginletter. */}
                    <span
                      className="rij-teken"
                      style={c.kleur ? { backgroundColor: `color-mix(in srgb, ${c.kleur} 18%, transparent)`, color: c.kleur } : undefined}
                      aria-hidden
                    >
                      {c.icoon ?? c.naam.trim().slice(0, 1).toUpperCase()}
                    </span>
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
          </Kaart>

          <ErrorBoundary naam="Categorieën">
            <CategorieBoom
              aanpassingen={subcategorieen}
              eigenCategorieen={categorieen}
              onToevoegen={voegSubcategorieToe}
              onWijzigen={wijzigSubcategorie}
              onVerwijderen={verwijderSubcategorieH}
              onCategorieToevoegen={voegCategorieOnderToe}
              onCategorieVerwijderen={verwijderCat}
              onVerplaats={verplaatsHoofdcategorie}
            />
          </ErrorBoundary>
          </div>
          </div>
        </>
      )}

      {pagina === 'instellingen' && (
        <>
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
              onBeginOpnieuw={beginOpnieuw}
            />
          </ErrorBoundary>

        </>
      )}

      {pagina === 'rekenhulpen' && (
        <ErrorBoundary naam="Rekenhulpen">
          <RekenhulpenSectie />
        </ErrorBoundary>
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
        // Net boven de onderbalk (56 px) plus de veilige zone, zodat de melding
        // niet half achter de zwevende ➕ verdwijnt.
        bottom: 'calc(4.25rem + env(safe-area-inset-bottom))',
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
        fontSize: 'var(--tekst-sm)',
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
  //
  // De hele boom hangt in CategorieVolgordeProvider: de kiezer met de
  // hoofdcategorieën zit vier lagen diep en op vier plaatsen, dus de volgorde als
  // prop doorgeven zou bestanden raken die er niets mee te maken hebben.
  if (isDesktop) {
    return (
      <CategorieVolgordeProvider volgorde={hoofdVolgorde}>
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
            {statusTekst && (
              <>
                <span
                  role={statusIsFout ? 'alert' : 'status'}
                  style={{ fontSize: 'var(--tekst-s)', color: statusIsFout ? 'var(--negative-ink)' : 'var(--text-muted)' }}
                >
                  {statusTekst}
                </span>
                {/* Een fout blijft bewust staan tot je hem wegklikt. Hier ontbrak
                    dat kruisje nog — alleen de mobiele regel had er een — dus op
                    een pc bleef een foutmelding staan tot er toevallig een nieuwe
                    melding overheen kwam. */}
                {statusIsFout && (
                  <button
                    type="button"
                    className="knop knop-kaal"
                    aria-label={t('Melding sluiten')}
                    onClick={() => meld(null)}
                  >
                    ×
                  </button>
                )}
              </>
            )}
            <button className="knop knop-primair knop-klein" onClick={nieuweTransactie}>
              + {t('Nieuwe transactie')}
            </button>

            <Meldingenbel meldingen={meldingen} onGaNaar={gaNaarMelding} onBoekVasteLast={boekVasteLastPerId} />

            {verbonden && (
              <button className="knop knop-icoon" aria-label={t('Uitloggen')} onClick={verbreekVerbinding}>
                <span aria-hidden>⎋</span>
              </button>
            )}
          </header>
          <div style={{ padding: '1.5rem 1.5rem 3rem' }}>
            {/* De `key` is wat de overgang laat werken: bij elke tabwissel is dit
                voor React een NIEUW vlak, dus begint de animatie opnieuw. Zonder
                key zou React de inhoud hergebruiken en zou je de eerste keer een
                beweging zien en daarna nooit meer. */}
            <div className="inhoud-breed pagina-in" key={pagina}>
              {paginaInhoud}
            </div>
          </div>
        </div>
        {undoBalk}
        <ErrorBoundary naam="Boeking">{boekingLagen}</ErrorBoundary>
      </div>
      </CategorieVolgordeProvider>
    )
  }

  // Smalle schermen: één kolom met de onderbalk (tabbalk + centrale ➕).
  return (
    <CategorieVolgordeProvider volgorde={hoofdVolgorde}>
      {/* Ronde 34: van 5,5 naar 8 rem plus de veilige zone. De onderbalk is 56 px
          hoog, de zwevende ➕ steekt daar nog 22 px bovenuit, en op een iPhone komt
          de home-indicator er nog eens 34 px bij. Met 88 px lagen de onderste
          rijen van élke lijst achter die knop — precies waar knoppen als "Toon ze
          ook" staan. Balk 56 + uitstekende ➕ 22 + wat lucht = 6 rem, plus de
          veilige zone die per toestel verschilt. */}
      <main style={{ ...container, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          {/* Het merk brengt je terug naar Overzicht — dezelfde afspraak als het
              logo op zowat elke website. Een echte knop, geen aanklikbare div, zodat
              de tab-toets en schermlezers er ook bij kunnen. */}
          <button
            type="button"
            className="merkknop"
            aria-label={t('Naar Overzicht')}
            onClick={() => setPagina('overzicht')}
          >
            <Merkteken grootte={30} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--tekst-xl)', letterSpacing: '-0.03em' }}>Kompal</span>
          </button>
          {/* Hetzelfde belletje als op desktop. Het stond hier vroeger niet, dus op
              een telefoon zag je nooit dat een budget bijna op was. */}
          <div style={{ flex: 1 }} />
          <Meldingenbel meldingen={meldingen} onGaNaar={gaNaarMelding} onBoekVasteLast={boekVasteLastPerId} />
        </div>

        {/* Ronde 35: op een telefoon was dit nergens te zien. Probeerde je een
            rekening te verwijderen die nog boekingen had, dan gebeurde er letterlijk
            niets zichtbaars — de melding ging naar de desktopbovenbalk, die hier
            niet bestaat. `role="status"` zorgt dat een schermlezer ze ook hoort. */}
        {statusTekst && (
          <div
            className={statusIsFout ? 'kaart kaart-compact statusregel statusregel-fout' : 'kaart kaart-compact statusregel'}
            role={statusIsFout ? 'alert' : 'status'}
          >
            <span style={{ flex: 1, minWidth: 0 }}>{statusTekst}</span>
            {statusIsFout && (
              <button
                type="button"
                className="knop knop-kaal"
                aria-label={t('Melding sluiten')}
                onClick={() => meld(null)}
              >
                ×
              </button>
            )}
          </div>
        )}

        <div className="pagina-in" key={pagina}>
          {paginaInhoud}
        </div>
      </main>
      {undoBalk}
      {/* De popup stond buiten elke foutvang: één fout in het invoerformulier
          legde daardoor de HELE app plat in plaats van alleen de popup. */}
      <ErrorBoundary naam="Boeking">{boekingLagen}</ErrorBoundary>
      <OnderNavigatie actief={pagina} onKies={setPagina} onNieuweTransactie={nieuweTransactie} />
    </CategorieVolgordeProvider>
  )
}
