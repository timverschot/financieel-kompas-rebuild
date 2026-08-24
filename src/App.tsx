import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Subcategorie,
  TerugkerendePost,
  Transactie,
  Verrekening,
  Waardering,
  Maandafsluiting,
  Onderhoudsbijdrage,
  Onderhoudsbetaling,
} from './data/schema'
import {
  bewaarBudget,
  bewaarCategorie,
  bewaarDossier,
  bewaarGedeeldeKost,
  bewaarGedeeldeKosten,
  bewaarAflossing,
  bewaarDossierDocument,
  bewaarGarantie,
  bewaarTransacties,
  bewaarKind,
  bewaarKindrekening,
  bewaarKindrekeningpost,
  bewaarLening,
  bewaarRekening,
  bewaarOverboeking,
  bewaarSpaardoel,
  bewaarSubcategorie,
  bewaarNieuweTak,
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
  laadOrdeningen,
  bewaarOrdening,
  laadWaarderingen,
  laadOnderhoudsbijdragen,
  laadMaandafsluitingen,
  laadOnderhoudsbetalingen,
  bewaarOnderhoudsbijdrage,
  verwijderMaandafsluiting,
  verwijderOnderhoudsbijdrage,
  bewaarMaandafsluiting,
  bewaarOnderhoudsbetaling,
  verwijderOnderhoudsbetaling,
  bewaarWaardering,
  verwijderWaardering,
  laadSubcategorieen,
  laadTerugkerendePosten,
  laadTransacties,
  laadVerrekeningen,
  verwijderVerrekeningMetHeropening,
  markeerVerrekeningOvergemaakt,
  herstelDossierMetAanhang,
  herstelVerrekeningMetKosten,
  verwijderCategorieMetAanhang,
  herstelCategorieMetAanhang,
  verwijderBudget,
  verwijderGedeeldeKost,
  verwijderAflossing,
  herstelDossierDocument,
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
} from './data/repository'
import { exporteerBackup, importeerBackup } from './data/backup'
import { vraagBlijvendeOpslag, type OpslagToestand } from './data/opslag'
import { leesBackupMoment, noteerBackup, zorgVoorEersteGebruik, type BackupMoment } from './data/backupmoment'
import { openDatabase } from './data/db'
import { synchroniseer } from './data/sync/sync'
import { DriveBackend } from './data/sync/drive/driveBackend'
import { vraagToken, heeftOoitVerbonden, meldAf } from './data/sync/drive/auth'
import { TransactieFormulier } from './components/TransactieFormulier'
import { TransactieLijst } from './components/TransactieLijst'
import { ImportSectie } from './components/ImportSectie'
import { RekeningFormulier, REKENING_TYPE_LABEL } from './components/RekeningFormulier'
import { RekeningDetail } from './components/RekeningDetail'
import { CategorieFormulier } from './components/CategorieFormulier'
import { BudgetFormulier } from './components/BudgetFormulier'
import { DossierSectie } from './components/DossierSectie'
import { NieuwDossierKiezer } from './components/NieuwDossierKiezer'
import { LeningSectie } from './components/LeningSectie'
import { GarantieSectie } from './components/GarantieSectie'
import { Subtabs } from './ui/Subtabs'
import { Opslagfout } from './ui/Opslagfout'
import { useOpslagpoging } from './ui/opslagpoging'
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
import { KindkostenSectie } from './components/KindkostenSectie'
import { FiscaalSectie } from './components/FiscaalSectie'
import { MaandGrafiek } from './components/MaandGrafiek'
import { ToekomstlastenWidget } from './components/ToekomstLasten'
import { RecenteTransacties } from './components/RecenteTransacties'
import { RapportKaart } from './components/RapportKaart'
import { downloadTekst } from './utils/download'
import { kaartbedragUitOpslag } from './utils/kredietkaart'
import { TopDrie } from './components/TopDrie'
import { RekenhulpenSectie } from './components/RekenhulpenSectie'
import { MaandafsluitingSectie } from './components/MaandafsluitingSectie'
import { TerugkerendeSectie } from './components/TerugkerendeSectie'
import { PlanRegels } from './components/PlanRegels'
import { OverboekingSectie } from './components/OverboekingSectie'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NieuweVersieBalk } from './components/NieuweVersieBalk'
import { OnderNavigatie } from './components/OnderNavigatie'
import { PAGINAS, type Pagina } from './components/navigatie'
import type { AnalyseTab } from './utils/analysetab'
import type { BudgetTab } from './utils/budgettab'
import { UitlegBlok } from './components/UitlegBlok'
import { VasteLastVraag, type VasteLastVraagInhoud } from './components/VasteLastVraag'
import { boekingVoorVasteLast, vasteLastVoorBoeking } from './utils/vastelastkoppeling'
import { huidigeRoute, volgRoute, zetRoute } from './utils/route'
import { maakUndoKlok, type UndoKlok } from './utils/undoKlok'
import { sluitBovenstePopup } from './ui/popupstapel'
import { BoekingDialoog } from './components/BoekingDialoog'
import { Dialoog } from './ui/Dialoog'
import { Meldingenbel } from './components/Meldingenbel'
import { BalansRegel } from './components/BalansRegel'
import { OpstellingSectie, type OpstellingBlok } from './components/OpstellingSectie'
import { VermogenRegel } from './components/VermogenRegel'
import { BufferRegel } from './components/BufferRegel'
import { Zijbalk } from './components/Zijbalk'
import { Merkteken } from './components/Merkteken'
import { saldoVerrekeningDossier } from './utils/dossier'
import { kostenVoorAfrekening, type AfrekeningFilter } from './utils/afrekening'
import { kostenOmTeHeropenen, kostenVanAfrekening } from './utils/afrekeningverwijdering'
import { telGezinslidGebruik } from './utils/gezinslidverwijdering'
import { categorieUndoTekst, telCategorieVerwijderen } from './utils/categorieverwijdering'
import { nieuwId } from './data/sync/id'
import { inkomstenPerCategorie, maandInkomsten, maandUitgaven, uitgavenPerCategorie, type CategorieUitgave } from './utils/overzicht'
import type { DonutInvoer } from './utils/donut'
import { filterVoorCategorie, type TxFilter } from './utils/transactieFilter'
import { inkomstenUitgavenPerMaand } from './utils/maandverloop'
import { labelVanCategorie } from './data/categorieen/resolve'
import { vulCategorieAan } from './utils/transactie'
import { ingebouwdeItemNaam, itemPerId, stelCategorieboomIn } from './data/categorieen/zoek'
import { bouwTak, type NieuweTak } from './utils/categorietak'
import { budgetKleur, geldendeBudgetten, maandenMetEigenBudget, uitgavenInMaand } from './utils/budget'
import { bouwHandelaarIndex } from './utils/categorieVoorstel'
import { bonVanTransactie } from './utils/kluis'
import { formatEuro } from './utils/format'
import { bouwMeldingen } from './utils/meldingen'
import { isGestopt } from './utils/vastelast'
import { boekingDieDezePostAfdekt, maandVooruitblik, vasteLastTransactieId } from './utils/vooruitblik'
import { useInstellingen } from './instellingen'
import { huidigeMaand, maandJaarLabel, vandaag } from './utils/datum'
import { saldoVanRekening, totaalSaldoVan } from './utils/saldo'
import { Balk, Bedrag, EersteStapKnop, Kaart, Kengetal, Leeg, PaginaKop } from './ui/basis'
import { useT } from './i18n'

const container: CSSProperties = {
  maxWidth: 480,
  margin: '1.5rem auto',
  padding: '0 1rem',
}


/**
 * De donut-invoer voor een categorielijst (ronde 40).
 *
 * 'Zonder categorie' heeft als groepeersleutel een LEGE string. Die kan je niet
 * filteren, dus geven we hem geen sleutel mee — anders zou de donut een knop
 * "Bekijk de boekingen van Zonder categorie" tekenen die bij het aanklikken
 * niets doet.
 */
function donutItems(posten: CategorieUitgave[]): DonutInvoer[] {
  return posten.map((p) => ({
    naam: p.naam,
    bedrag: p.bedrag,
    kleur: p.kleur,
    ...(p.sleutel ? { sleutel: p.sleutel } : {}),
  }))
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
  const [onderhoudsbijdragen, setOnderhoudsbijdragen] = useState<Onderhoudsbijdrage[]>([])
  const [maandafsluitingen, setMaandafsluitingen] = useState<Maandafsluiting[]>([])
  const [onderhoudsbetalingen, setOnderhoudsbetalingen] = useState<Onderhoudsbetaling[]>([])
  const [leningen, setLeningen] = useState<Lening[]>([])
  const [aflossingen, setAflossingen] = useState<Aflossing[]>([])
  const [garanties, setGaranties] = useState<Garantie[]>([])
  const [dossierdocumenten, setDossierdocumenten] = useState<DossierDocument[]>([])
  const [ordeningen, setOrdeningen] = useState<Ordening[]>([])
  const [waarderingen, setWaarderingen] = useState<Waardering[]>([])
  const [ongeldig, setOngeldig] = useState(0)
  // Regels uit de euro-tijd die geweigerd zijn. Apart van 'ongeldig', want de
  // oorzaak én wat je eraan doet zijn anders. Zie LOG_FORMAAT in sync/events.ts.
  const [verouderd, setVerouderd] = useState(0)
  // Regels uit een NIEUWERE versie dan deze app: dan draait DIT toestel achter.
  const [teNieuw, setTeNieuw] = useState(0)
  // De banner mag weggeklikt worden; anders staat hij de hele sessie op je scherm.
  const [formaatMeldingWeg, setFormaatMeldingWeg] = useState(false)

  // Onthoudt wat een synchronisatie of herstel niet kon lezen. Bewust op ÉÉN plek:
  // deze tellers werden op vier plaatsen aangeroepen en op één daarvan gelezen, en
  // dat was net de plek waar de fout gemeld werd — "opnieuw verbinden met Drive".
  // Dan zwijgt de app precies wanneer ze zou moeten spreken.
  function onthoudFormaat(r: { verouderd: number; teNieuw: number }) {
    if (r.verouderd > 0) {
      setVerouderd((n) => Math.max(n, r.verouderd))
      setFormaatMeldingWeg(false)
    }
    if (r.teNieuw > 0) {
      setTeNieuw((n) => Math.max(n, r.teNieuw))
      setFormaatMeldingWeg(false)
    }
  }
  // De terugknop (ronde 59).
  //
  // Eén luisteraar voor de hele app. Hij zet alleen de pagina: het filter en de
  // gekozen richting horen bij een klik van dat moment, niet bij een plek, en die
  // wil je na een druk op terug niet terugkrijgen alsof je ze net gekozen had.
  //
  // ⚠ Een popup vangt de terugknop zélf op (zie `ui/Dialoog.tsx`): die zet bij het
  // openen een stap op dezelfde plek, zodat terug haar sluit zonder van pagina te
  // wisselen. Deze luisteraar krijgt dan dezelfde route binnen als waar hij al
  // stond, en doet dus niets. Zo bijten de twee elkaar niet.
  useEffect(() => {
    return volgRoute((route) => {
      // ⚠ EERST DE POPUPS. Staat er een popup open, dan is een druk op terug bedoeld
      // om DIE weg te klikken en niet om van pagina te wisselen — anders wissel je de
      // pagina áchter een open venster. We zetten de route dan meteen terug, zodat de
      // terugdruk niets kost: je staat waar je stond, met één venster minder open.
      //
      // Blijft de popup staan (er stond invoer in, dus de vraag "weggooien?"
      // verschijnt — de bewaking uit ronde 55), dan geldt hetzelfde: route terug, en
      // een tweede terugdruk komt hier gewoon opnieuw langs.
      const popup = sluitBovenstePopup()
      if (popup !== 'geen') {
        setPagina((nu) => {
          if (nu) {
            zetRoute({
              pagina: nu,
              subtab: nu === 'dossiers' ? dossierTabRef.current : undefined,
              analyse: nu === 'analyse' ? analyseTabRef.current : undefined,
              budget: nu === 'budget' ? budgetTabRef.current : undefined,
            })
          }
          return nu
        })
        return
      }
      // Een adres dat we niet kennen (zelf ingetikt, of een oude bladwijzer naar een
      // pagina die niet meer bestaat): het scherm blijft staan, maar het ADRES
      // rechtzetten, anders val je bij de volgende herlaadbeurt alsnog terug op het
      // Overzicht zonder te weten waarom.
      if (route === null) {
        setPagina((nu) => {
          // Mét de lade van Dossiers en het tabblad van Analyse erbij (nakijkronde
          // ronde 60): zonder die twee stond het scherm nog op "Vooruit" terwijl het
          // adres alleen `#/analyse` zei, en landde je na een herlaadbeurt op
          // "Verdeling" zonder te begrijpen waarom.
          if (nu) {
            zetRoute(
              {
                pagina: nu,
                subtab: nu === 'dossiers' ? dossierTabRef.current : undefined,
                analyse: nu === 'analyse' ? analyseTabRef.current : undefined,
                budget: nu === 'budget' ? budgetTabRef.current : undefined,
              },
              true,
            )
          }
          return nu
        })
        return
      }
      setPagina((nu) => {
        // ⚠ Alleen opruimen wanneer je ECHT van pagina wisselt (nakijkronde ronde
        // 59). Een popup zet bij het openen een stap naar dezelfde plek, en bij het
        // sluiten komt die stap hier langs. Wiste deze luisteraar dan het
        // doorklik-filter, dan verdween je filter telkens wanneer je op de
        // transactiepagina een boeking opende en weer sloot — precies de handeling
        // waarvoor het doorklikken uit ronde 40 gemaakt is.
        if (nu !== route.pagina) setTxFilter(null)
        return route.pagina
      })
      if (route.subtab) setDossierTab(route.subtab)
      if (route.analyse) setAnalyseTab(route.analyse)
      if (route.budget) setBudgetTab(route.budget)
      // De snelkoppeling van het beginscherm werkt ook wanneer de app al open staat.
      // Zonder deze regel landde je dan op Transacties zónder formulier — terwijl de
      // belofte van die snelkoppeling juist "één tik en je staat in het formulier" is.
      if (route.actie === 'nieuw') {
        setBewerkTransactie(null)
        setBoekingOpen(true)
      }
    })
  }, [])

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
  // Ronde 63 — "je gegevens raken niet kwijt".
  //
  // `opslag` zegt of de browser deze database blijvend bewaart; `backupMoment`
  // zegt wanneer je gegevens voor het laatst ergens ANDERS stonden (een
  // back-upbestand of een geslaagde synchronisatie). Beide worden hier bewaard en
  // niet in een component, omdat drie plekken ze nodig hebben: Instellingen, het
  // blok "Veilig bewaren" in de opstelling, en het belletje.
  const [opslag, setOpslag] = useState<OpslagToestand>('onbekend')
  const [backupMoment, setBackupMoment] = useState<BackupMoment>({})
  // Loopt er een synchronisatie? Dan moet "Begin opnieuw" daarop wachten (tweede
  // nakijkronde ronde 63). Anders kan een ronde die al onderweg was ná het wissen
  // alsnog haar dag wegschrijven — en dan draagt een leeggemaakte app een
  // vangnetdatum — of zelfs regels terugzetten die net naar de prullenbak gingen.
  const syncLoopt = useRef<Promise<unknown> | null>(null)
  const wisLoopt = useRef(false)
  const [statusTekst, setStatusTekst] = useState<string | null>(null)
  const [bewerkTransactie, setBewerkTransactie] = useState<Transactie | null>(null)
  // Staat de invoerpopup open? Toevoegen gebeurt sinds kort altijd hier, op elke
  // pagina — niet meer door eerst naar Transacties (of Budget, of Rekeningen) te
  // navigeren en daar het juiste formulier te zoeken.
  const [boekingOpen, setBoekingOpen] = useState(false)
  const [bewerkCategorie, setBewerkCategorie] = useState<Categorie | null>(null)
  // Ronde 65: het venster dat toont wat er met een eigen categorie meegaat. Een ID
  // en geen kopie: zo loopt het venster mee wanneer de tak intussen verandert, en
  // sluit het vanzelf wanneer de categorie er niet meer is.
  const [catWegId, setCatWegId] = useState<string | null>(null)
  /**
   * ⚠ EEN EIGEN POGING PER PLEK, en niet één gedeelde (ronde 68, tweede doorlichting).
   * Met één gedeelde lekte een mislukking van de ene knop naar het volgende venster:
   * je verwijderde een budget, dat mislukte in stilte, en het eerstvolgende
   * bevestigingsvenster opende met "Verwijderen is niet gelukt" erin — nog vóór je
   * iets had aangeraakt.
   */
  const catWegOpslag = useOpslagpoging()
  const vraagOpslag = useOpslagpoging()
  const budgetOpslag = useOpslagpoging()
  const catWeg = categorieen.find((c) => c.id === catWegId) ?? null
  const [bewerkRekening, setBewerkRekening] = useState<Rekening | null>(null)
  // Welke rekening staat rechts open? null = het formulier voor een nieuwe rekening.
  const [gekozenRekeningId, setGekozenRekeningId] = useState<string | null>(null)
  const [bewerkOverboeking, setBewerkOverboeking] = useState<Overboeking | null>(null)
  const [maand, setMaand] = useState(huidigeMaand())
  // Nog onbeslist tot de gegevens geladen zijn. Een nieuwe gebruiker hoort in De
  // Opstelling te landen in plaats van op een leeg Overzicht, maar bij de eerste
  // render weet de app nog niet of er rekeningen zijn. We zetten hem daarom in
  // dezelfde batch als `setTransacties`, en de bestaande wachtpoort ("Laden…")
  // houdt alles tegen tot dat gebeurd is. Zo is er geen flikkering en geen tweede
  // laadtoestand nodig.
  //
  // LET OP: dit hoort NIET in `herlaad()`. Die draait na élke opslag en na elke
  // synchronisatie; zou de keuze daar staan, dan sprong je bij elke bewaaractie
  // terug naar De Opstelling.
  const [pagina, setPagina] = useState<Pagina | null>(null)
  // Welke lade van de Dossiers-pagina staat open. Leningen en garanties hadden tot
  // ronde 29 een eigen pagina die niets meer was dan twee secties onder elkaar;
  // ze zijn nu subtabs naast de gedeelde kosten.
  const [dossierTab, setDossierTab] = useState<DossierSoort>('coouderschap')
  // De lade als ref erbij: de luisteraar op de terugknop wordt één keer opgezet en
  // ziet anders voor altijd de lade van bij het opstarten.
  const dossierTabRef = useRef(dossierTab)
  dossierTabRef.current = dossierTab
  // Welk dossier de Dossiers-pagina opent (ronde 40). Klik je in de
  // transactielijst op de badge "gedeeld", dan hoor je in dát dossier te landen
  // en niet in het eerste uit de lijst.
  const [gekozenDossierId, setGekozenDossierId] = useState<string | null>(null)
  // Met welke richting de Analyse-pagina opent. De knop onder een donut op het
  // Overzicht zet die mee: klik je bij "Inkomsten per categorie" op "Bekijk in
  // Analyse", dan hoor je daar niet op de uitgaven te landen.
  const [analyseRichting, setAnalyseRichting] = useState<'uitgave' | 'inkomst'>('uitgave')
  // Welk onderdeel van de Analyse-pagina open staat (ronde 60). Staat in het adres,
  // zodat een herlaadbeurt je op hetzelfde tabblad terugzet — dezelfde afspraak als
  // bij de lade van de Dossiers-pagina.
  const [analyseTab, setAnalyseTab] = useState<AnalyseTab>('verdeling')
  const analyseTabRef = useRef(analyseTab)
  analyseTabRef.current = analyseTab
  // Het tabblad van de Budget-pagina (ronde 64), op dezelfde manier: in het adres,
  // en in een ref omdat de luisteraar op de terugknop buiten React om draait.
  // De vraag "is dit je vaste last?" (ronde 64). `maand` staat erbij zodat "nee"
  // bij het inboeken alsnog de juiste maand boekt.
  const [vasteLastVraag, setVasteLastVraag] = useState<(VasteLastVraagInhoud & { maand: string }) | null>(null)
  // Boekingen waarover we het deze sessie al gevraagd hebben.
  //
  // ⚠ Bewust NIET bewaard (ronde 64). Een "nee" opslaan zou een tweede veld op de
  // transactie vragen, en het is de vraag of dat het waard is: zeg je nee, dan is
  // het een gewone uitgave, en de vaste last blijft gewoon openstaan tot je hem
  // boekt. Het enige gevolg van deze keuze is dat de vraag na een herstart één keer
  // opnieuw kan komen wanneer je diezelfde boeking opnieuw bewerkt.
  const gevraagdOverBoeking = useRef(new Set<string>())
  const [budgetTab, setBudgetTab] = useState<BudgetTab>('plan')
  // Naar welk blok van "Je situatie" wijst de volgende doorklik? `nr` loopt op zodat
  // dezelfde bestemming twee keer na elkaar ook werkt (zie de `key` hieronder).
  const [opstellingDoel, setOpstellingDoel] = useState<{ blok: OpstellingBlok; nr: number }>({
    blok: 'rekeningen',
    nr: 0,
  })

  function gaNaarOpstelling(blok: OpstellingBlok = 'rekeningen') {
    setOpstellingDoel((vorig) => ({ blok, nr: vorig.nr + 1 }))
    kiesPagina('opstelling')
  }
  const budgetTabRef = useRef(budgetTab)
  budgetTabRef.current = budgetTab
  function kiesBudgetTab(tb: BudgetTab) {
    setBudgetTab(tb)
    // VERVANGEN: terug hoort je een pagina terug te brengen, niet door drie
    // tabbladen te laten lopen die je net even aanklikte. Zelfde afspraak als bij
    // de Analyse-tabbladen in ronde 60.
    zetRoute({ pagina: 'budget', budget: tb }, true)
  }
  /**
   * Met welk filter de Transacties-pagina opent (ronde 40).
   *
   * `nr` telt op bij elke doorklik en dient enkel als `key` op de lijst. Zonder
   * dat nummer neemt de lijst een nieuw beginfilter niet over: ze zet haar filter
   * één keer op bij het monteren, en klik je van Voeding meteen door naar Wonen,
   * dan blijf je naar Voeding kijken.
   */
  const [txFilter, setTxFilter] = useState<{ filter: TxFilter; nr: number } | null>(null)
  const isDesktop = useIsDesktop()
  const [backupTekst, setBackupTekst] = useState<string | null>(null)
  // Gaat die tekst over een MISLUKKING? Dan hoort ze als alarm voorgelezen te
  // worden en niet als een gewone statusregel (nakijkronde ronde 63). Zonder dit
  // onderscheid las een schermlezer "Herstellen mislukte: …" helemaal niet voor en
  // dacht de gebruiker dat zijn gegevens terug waren.
  const [backupIsFout, setBackupIsFout] = useState(false)
  function meldBackup(tekst: string, soort: 'ok' | 'fout' = 'ok') {
    setBackupTekst(tekst)
    setBackupIsFout(soort === 'fout')
  }
  const [undoInfo, setUndoInfo] = useState<{ boodschap: string; herstel: () => Promise<void> } | null>(null)
  // ⚠ Twee keer dezelfde melding na elkaar ("Kost verwijderd", "Kost verwijderd")
  // laat de DOM ongemoeid, en een live region kondigt alleen een VERANDERING aan —
  // de tweede verwijdering zou dus stil blijven. Deze teller vernieuwt het element.
  const [undoTeller, setUndoTeller] = useState(0)
  const backendRef = useRef<DriveBackend | null>(null)
  const undoKlok = useRef<UndoKlok>(
    maakUndoKlok(() => setUndoInfo(null), { zet: (fn, ms) => window.setTimeout(fn, ms), wis: (id) => window.clearTimeout(id) }),
  )

  // Toon een korte "ongedaan maken"-melding na een verwijdering. Herstellen is dankzij
  // het append-only logboek eenvoudig: we bewaren het verwijderde item gewoon opnieuw
  // (met dezelfde id), waardoor het weer verschijnt.
  function toonUndo(boodschap: string, herstel: () => Promise<void>) {
    setUndoInfo({ boodschap, herstel })
    setUndoTeller((n) => n + 1)
    undoKlok.current.start()
  }
  const { t, taal, zetTaal } = useT()
  const { budgetDrempel } = useInstellingen()

  async function herlaad() {
    const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, ord, docs, wrd, obd, obt, maf] = await Promise.all([
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
      laadOrdeningen(),
      laadDossierDocumenten(),
      laadWaarderingen(),
      laadOnderhoudsbijdragen(),
      laadOnderhoudsbetalingen(),
      laadMaandafsluitingen(),
    ])
    setTransacties(tx.geldig)
    // ALLE overgeslagen records tellen, niet alleen die van transacties. Bleven de
    // negentien andere tellers ongebruikt, dan verdwenen bijvoorbeeld drie gedeelde
    // kosten uit een afrekening zonder dat er ergens iets stond — en dan stuur je
    // een bedrag van € 610 door waar € 940 hoorde te staan.
    setOngeldig(
      [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, ord, docs, wrd, obd, obt, maf].reduce(
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
    setOrdeningen(ord.geldig)
    setDossierdocumenten(docs.geldig)
    setWaarderingen(wrd.geldig)
    setOnderhoudsbijdragen(obd.geldig)
    setOnderhoudsbetalingen(obt.geldig)
    setMaandafsluitingen(maf.geldig)
  }

  // Toon een korte "ongedaan maken"-melding na een verwijdering. Herstellen is
  // dankzij het append-only logboek eenvoudig: we bewaren het verwijderde item
  // gewoon opnieuw (met dezelfde id), waardoor het weer verschijnt.
  //
  // ⚠ De balk blijft TWINTIG seconden staan en pauzeert zolang je erop staat of erin
  // gefocust bent (ronde 61). Waarom, en waarom die twee vlaggen: zie
  // `utils/undoKlok.ts`. Daar staat ook de rekenregel, los te toetsen zonder browser.
  // Verder: een kruisje om hem meteen weg te doen, en Ctrl/Cmd+Z werkt overal.
  function sluitUndo() {
    undoKlok.current.stop()
    setUndoInfo(null)
  }

  async function undoNu() {
    if (!undoInfo) return
    const bezig = undoInfo
    // ⚠ De balk blijft staan tot het terugzetten GELUKT is (ronde 65). Wisten we
    // hem meteen, dan verdween bij een mislukking de knop waarop je net drukte —
    // je focus viel terug naar het begin van de pagina en je moest binnen twintig
    // seconden opnieuw tot achteraan tabben. En de klok zou weer lopen terwijl je
    // muis er nog op staat, want een nieuw element krijgt geen `onMouseEnter`
    // zonder dat je beweegt.
    undoKlok.current.pauzeerVoorPoging()
    try {
      await bezig.herstel()
      await herlaad()
      // ⚠ Alleen déze balk wegdoen. Het herstellen en het herladen kunnen even
      // duren; verwijder je in die tijd iets anders, dan staat er intussen een
      // NIEUWE balk, en die mag hier niet mee sneuvelen — dan was die tweede weg
      // terug verdwenen zonder dat je iets deed.
      let zelfdeBalk = false
      setUndoInfo((huidig) => {
        zelfdeBalk = huidig === bezig
        return zelfdeBalk ? null : huidig
      })
      if (zelfdeBalk) undoKlok.current.stop()
    } catch {
      // Mislukt het, dan mag dat niet geruisloos gebeuren: zonder deze vangst kwam
      // er niets terug en stond er nergens iets. `hervatNaPoging` en niet `start`,
      // zodat de klok stil blijft staan zolang je muis nog op de balk staat.
      meld(t('Het terugzetten is niet gelukt. Probeer het opnieuw.'), 'fout')
      // Ook hier: staat er intussen een nieuwe balk, dan loopt díe klok al en mag
      // deze mislukking er niet aan zitten.
      setUndoInfo((huidig) => {
        if (huidig === bezig) undoKlok.current.hervatNaPoging()
        return huidig
      })
    }
  }

  const klok = undoKlok.current
  useEffect(() => () => klok.stop(), [klok])

  // Ctrl+Z (⌘Z op een Mac) draait de laatste verwijdering terug, zolang de balk er
  // staat (ronde 61). Dat is de snelste weg voor iedereen, en voor wie met een
  // toetsenbord werkt vaak de enige haalbare: de knop in de balk staat helemaal
  // achteraan de pagina.
  //
  // ⚠ NIET terwijl je in een veld typt. Daar betekent Ctrl+Z "maak mijn laatste
  // typwerk ongedaan" — dat is de browser zijn taak, en die mogen we niet afpakken.
  useEffect(() => {
    if (!undoInfo) return
    function opToets(e: KeyboardEvent) {
      if (e.key !== 'z' && e.key !== 'Z') return
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const doel = e.target as HTMLElement | null
      const tag = doel?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || doel?.isContentEditable) return
      // ⚠ Ook niet terwijl er een popup openstaat (nakijkronde ronde 61). Die dekt de
      // balk af — voor voorleessoftware bestaat alles erbuiten dan niet eens — dus je
      // zou iets terugzetten dat je niet ziet gebeuren.
      if (document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      void undoNu()
    }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
    // `undoNu` wordt bij elke hertekening opnieuw gemaakt; zou hij hier in de lijst
    // staan, dan werd deze luisteraar tientallen keren per seconde af- en
    // aangekoppeld. Wat hij doet hangt alleen van `undoInfo` af, en dát staat er wel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoInfo])

  useEffect(() => {
    let actief = true
    async function laad() {
      // Eerst de database zelf, mét wachttijd. Zonder deze regel blijft een
      // geblokkeerde opslag eeuwig op "Laden…" staan; zie openDatabase().
      await openDatabase()
      // 'maf' (de maandafsluitingen) ontbrak hier, terwijl `herlaad()` ze wél
      // laadt. Gevolg: wie de app opende en niets wijzigde, kreeg een lege
      // maandafsluiting te zien — en een ongeldige maandafsluiting werd nergens
      // gemeld. Dezelfde soort fout als de vergeten `ordeningen` uit ronde 35;
      // twee handgeschreven lijsten die uit elkaar lopen.
      const [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, ord, docs, wrd, obd, obt, maf] = await Promise.all([
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
        laadOrdeningen(),
        laadDossierDocumenten(),
        laadWaarderingen(),
        laadOnderhoudsbijdragen(),
        laadOnderhoudsbetalingen(),
        laadMaandafsluitingen(),
      ])
      if (!actief) return
      setMaandafsluitingen(maf.geldig)
      setTransacties(tx.geldig)
      // Waar landen we? (ronde 59)
      //
      // Staat er een pagina in het adres — na een herlaadbeurt, via een bladwijzer
      // of via een snelkoppeling op het beginscherm — dan gaan we dáárheen. Anders
      // het gewone startgedrag: een nieuwe gebruiker hoort in De Opstelling en niet
      // op een leeg Overzicht.
      //
      // De route wordt daarna VERVANGEN en niet toegevoegd: de eerste stap in de
      // geschiedenis hoort de pagina te zijn waar je begint, niet een leeg adres.
      // Anders kost je eerste druk op terug niets zichtbaars.
      const start = huidigeRoute()
      const beginpagina = start?.pagina ?? (rk.geldig.length === 0 ? 'opstelling' : 'overzicht')
      setPagina(beginpagina)
      if (start?.subtab) setDossierTab(start.subtab)
      if (start?.analyse) setAnalyseTab(start.analyse)
      if (start?.budget) setBudgetTab(start.budget)
      if (start?.actie === 'nieuw') setBoekingOpen(true)
      // ⚠ Mét het budgettabblad (nakijkronde ronde 64). Zonder dat veld zette deze
      // regel het adres meteen terug op `#/budget`, terwijl het scherm wél op het
      // juiste tabblad stond: je bladwijzer naar `#/budget/vast` werkte één keer en
      // landde daarna voorgoed op "Te verdelen".
      zetRoute(
        { pagina: beginpagina, subtab: start?.subtab, analyse: start?.analyse, budget: start?.budget },
        true,
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
      setOrdeningen(ord.geldig)
      setDossierdocumenten(docs.geldig)
      setWaarderingen(wrd.geldig)
    setOnderhoudsbijdragen(obd.geldig)
    setOnderhoudsbetalingen(obt.geldig)
      // Ook bij het OPSTARTEN alle tellers optellen, niet alleen die van
      // transacties. Deze regel stond alleen in `herlaad`, dus wie de app opende en
      // niets wijzigde, zag nooit dat er records overgeslagen waren.
      setOngeldig(
        [tx, rk, cat, bud, dos, kos, ver, tkp, sp, subc, ob, ki, kr, krp, ln, afl, gar, ord, docs, wrd, obd, obt, maf].reduce(
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

  // Vraag de browser om je gegevens niet zomaar te wissen (belangrijk op iOS), en
  // ⚠ HOUD HET ANTWOORD BIJ (ronde 63). Tot deze ronde verdween het in een `void`:
  // de app deed de goede vraag en gooide de uitkomst weg, zodat niemand — de
  // gebruiker noch de app zelf — wist of de browser had toegezegd.
  useEffect(() => {
    let actief = true
    void vraagBlijvendeOpslag().then((toestand) => {
      if (actief) setOpslag(toestand)
    })
    return () => {
      actief = false
    }
  }, [])

  // Sinds wanneer telt dit toestel mee, en wanneer stond alles voor het laatst
  // ergens anders? Het vertrekpunt wordt alleen de allereerste keer geschreven.
  useEffect(() => {
    let actief = true
    void (async () => {
      await zorgVoorEersteGebruik(vandaag())
      const moment = await leesBackupMoment()
      if (actief) setBackupMoment(moment)
    })().catch(() => {
      // ⚠ Stil (nakijkronde ronde 63). Gaat de database niet open — een privévenster,
      // een ander tabblad met een oudere versie — dan toont het hoofdeffect daar al
      // een scherm voor. Deze vraag is niet noodzakelijk om te kunnen werken, dus ze
      // hoort er geen tweede fout bovenop te leggen. Zonder deze vangst viel er een
      // onafgevangen belofte naast, in een ronde die zichzelf oplegt nooit hard te
      // falen.
    })
    return () => {
      actief = false
    }
  }, [])

  /**
   * Synchroniseren én meteen onthouden wat dat voor je vangnet betekende.
   *
   * ⚠ Alle vier de plaatsen die synchroniseren lopen hierlangs (nakijkronde ronde
   * 63). Deed één ervan dat niet, dan bleef het belletje de rest van je sessie
   * "er ging al 60 dagen niets naar Drive" roepen terwijl je net op
   * "Synchroniseer nu" had gedrukt en het gelukt was — en dat is precies hoe je
   * iemand aanleert een waarschuwing weg te kijken.
   */
  const syncEnOnthoud = useCallback(async (backend: Parameters<typeof synchroniseer>[0]) => {
    const bezig = (async () => {
      const r = await synchroniseer(backend)
      setBackupMoment(await leesBackupMoment())
      return r
    })()
    syncLoopt.current = bezig
    try {
      return await bezig
    } finally {
      if (syncLoopt.current === bezig) syncLoopt.current = null
    }
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
        const r = await syncEnOnthoud(backendRef.current)
        await herlaad()
        onthoudFormaat(r)
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
      // Niet beginnen terwijl er gewist wordt: dan zou deze ronde regels terugzetten
      // die "Begin opnieuw" net weghaalde.
      if (wisLoopt.current) return
      bezigMetSync = true
      try {
        const r = await syncEnOnthoud(backend!)
        onthoudFormaat(r)
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
    // `syncEnOnthoud` is een `useCallback` met een lege dep-lijst en verandert dus
    // nooit; hij staat erbij zodat de lintregel klopt zonder de klok elke render
    // opnieuw op te zetten.
  }, [verbonden, syncEnOnthoud])

  // Houd het categorie-register in sync met je aanpassingen, zodat zoeken,
  // weergave en oprollen de toegevoegde/hernoemde subcategorieën meteen tonen.
  // De volledige boom klaarzetten: de ingebouwde basis, de eigen categorieën (die
  // sinds ronde 27 zelf een middenlaag kunnen zijn) en de eigen subcategorieën.
  useMemo(() => stelCategorieboomIn(subcategorieen, categorieen), [subcategorieen, categorieen])

  async function exporteerNu() {
    // Ronde 41: dit was een eigen kopie van het download-patroon, en ze gaf het
    // blob-adres METEEN na de klik vrij. Sommige browsers hebben dat adres nog even
    // nodig terwijl ze het bestand oppakken, en dan breekt de download halverwege af.
    // De gedeelde helper wacht tien seconden en gooit een fout dóór in plaats van ze
    // te slikken.
    try {
      const json = await exporteerBackup()
      const dag = vandaag()
      downloadTekst(`financieel-kompas-backup-${dag}.json`, json, 'application/json')
      meldBackup(t('Back-up gedownload.'))
      // ⚠ Het onthouden staat in een EIGEN try (nakijkronde ronde 63). Zat het in
      // dezelfde, dan kreeg je bij een volle schijf "de back-up kon niet gedownload
      // worden — probeer het opnieuw" te lezen terwijl het bestand gewoon in je
      // map stond, en maakte je er nog drie.
      //
      // ⚠ En eerlijk over wat deze dag betekent: `downloadTekst` weet alleen dat de
      // browser de download AANVAARDDE. Annuleer je het bewaarvenster, dan noteert
      // de app tóch een back-up. Beter kan de app het niet weten — een webpagina
      // krijgt geen bevestiging dat een bestand op je schijf staat — maar de zin op
      // het scherm zegt daarom "laatste back-up op dit toestel" en niet "je gegevens
      // staan veilig".
      try {
        await noteerBackup(dag)
        setBackupMoment(await leesBackupMoment())
      } catch {
        // Het bestand is er wel; alleen het geheugentje niet. Dan komt de
        // herinnering te vroeg terug — vervelend, maar niet fout.
      }
    } catch {
      meldBackup(t('De back-up kon niet gedownload worden. Probeer het opnieuw.'), 'fout')
    }
  }

  async function herstelUitBestand(bestand: File) {
    try {
      const tekst = await bestand.text()
      const r = await importeerBackup(tekst)
      await herlaad()
      onthoudFormaat(r)
      // ⚠ RONDE 68 — DE MELDING VERZWEEG ÉÉN VAN DE VIJF UITKOMSTEN. `importeerBackup`
      // telt ook regels uit een NIEUWERE versie van de app (`teNieuw`), en die kwamen
      // in geen enkele zin voor. Zet je op je oude telefoon een back-up terug die je
      // met een nieuwere versie maakte, dan werd élke regel geweigerd en las je
      // "Hersteld: 0 toegevoegd, 0 al aanwezig, 0 ongeldig." — een zin die klinkt
      // alsof het bestand leeg was, terwijl het voluit geweigerd is. De synchronisatie
      // zegt het wél; dit was de enige plek die het niet deed.
      meldBackup(
        // ⚠ Alleen wanneer er ook ÉCHT niets bijgekomen is. Een logboek bevat regels
        // van álle toestellen, dus een bestand kan tegelijk regels toevoegen én regels
        // weigeren — en dan zou "Niets hersteld" een tweede onwaarheid zijn.
        r.teNieuw > 0 && r.toegevoegd === 0
          ? t(
              'Niets hersteld: dit bestand komt van een nieuwere versie van de app ({n} regels). Werk deze app eerst bij en probeer het dan opnieuw.',
              { n: r.teNieuw },
            )
          : r.verouderd > 0
            ? t(
                'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig, {verouderd} uit een te oude versie (niet ingelezen).',
                {
                  toegevoegd: r.toegevoegd,
                  overgeslagen: r.overgeslagen,
                  ongeldig: r.ongeldig,
                  verouderd: r.verouderd,
                },
              )
            : t('Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig.', {
                toegevoegd: r.toegevoegd,
                overgeslagen: r.overgeslagen,
                ongeldig: r.ongeldig,
              }),
        r.teNieuw > 0 && r.toegevoegd === 0 ? 'fout' : 'ok',
      )
    } catch (e) {
      meldBackup(t('Herstellen mislukte: {fout}', { fout: e instanceof Error ? e.message : t('onbekende fout') }), 'fout')
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
  async function slaTransactieOp(tx: Transactie) {
    await bewaarTransactie(tx)
    await herlaad()
    // ⚠ Lijkt deze boeking op een vaste last die deze maand nog openstaat, dan
    // VRAAGT de app het (ronde 64). Zie `utils/vastelastkoppeling.ts` voor waarom
    // dit een vraag is en geen automatische koppeling.
    //
    // De lijst wordt hier zelf samengesteld en niet uit de state gehaald: `herlaad`
    // zet die pas bij de volgende hertekening, en dan zou deze boeking er nog niet
    // in staan.
    if (tx.vasteLastId !== undefined) return
    if (gevraagdOverBoeking.current.has(tx.id)) return
    const lijst = [...(transacties ?? []).filter((x) => x.id !== tx.id), tx]
    const post = vasteLastVoorBoeking(tx, terugkerendePosten, lijst, tx.datum.slice(0, 7))
    if (post) setVasteLastVraag({ soort: 'na-boeking', post, boeking: tx, maand: tx.datum.slice(0, 7) })
  }

  /**
   * "Ja, dit is die betaling": de boeking krijgt de vaste last erbij.
   *
   * ⚠ Het ANTWOORD komt op de transactie te staan (`vasteLastId`) en niet in een
   * lijstje ergens apart. Zo reist het mee naar je andere toestellen, overleeft het
   * een herstel uit een back-up, en kan geen enkel scherm er iets anders van maken.
   */
  async function koppelAanVasteLast(boeking: Transactie, post: TerugkerendePost) {
    const gekoppeld = { ...boeking, vasteLastId: post.id }
    await bewaarTransactie(gekoppeld)
    await herlaad()
    // Een weg terug, zoals bij elke andere handeling in de app: zei je per ongeluk
    // ja, dan hoef je niet te zoeken hoe je dat rechtzet.
    //
    // ⚠ De BOEKING gaat mee in de sluiting, we zoeken hem niet opnieuw op (tweede
    // nakijkronde ronde 64). De vorige versie zocht in `transacties`, en dat is de
    // state van de render waarin deze melding gemaakt werd — daarin staat de
    // koppeling nog niet. "Ongedaan maken" deed dus aantoonbaar niets, en zei daar
    // ook niets over. Bovendien zocht ze op de maand van de maandSCHAKELAAR, terwijl
    // de vraag over de maand van de BOEKING gaat; die twee kunnen verschillen.
    toonUndo(t('{naam} staat nu als betaald voor deze maand.', { naam: post.omschrijving }), async () => {
      await ontkoppelBoeking(gekoppeld)
    })
  }

  /** De koppeling weer weghalen: de boeking wordt weer een gewone boeking. */
  async function ontkoppelBoeking(boeking: Transactie) {
    // ⚠ Het veld echt WEGHALEN en niet op `undefined` zetten in een spread: een
    // `undefined` waarde in het logboek is iets anders dan een ontbrekend veld.
    const { vasteLastId: _weg, ...zonder } = boeking
    void _weg
    await bewaarTransactie(zonder)
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
    // ⚠ RONDE 68 — EERST BEWAREN, DAN PAS KIEZEN. Andersom stond je bij een mislukte
    // opslag naar het detailscherm te kijken van een rekening die niet in de database
    // bestaat, met het formulier er nog open. Dezelfde regel als bij een nieuw
    // dossier (`DossierSectie`), waar ze al met zoveel woorden in de code staat.
    await bewaarRekening(r)
    await herlaad()
    setGekozenRekeningId(r.id)
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
    // Waarderingen tellen sinds ronde 38 mee: laat je ze achter, dan blijven het
    // weesrecords die voor eeuwig meereizen in het append-only logboek.
    const aantal =
      (transacties ?? []).filter((tx) => tx.rekeningId === id).length +
      overboekingen.filter((o) => o.vanRekeningId === id || o.naarRekeningId === id).length +
      waarderingen.filter((w) => w.rekeningId === id).length
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

  // Archiveren verwijdert niets, maar het haalt de rekening wél uit élke keuzelijst
  // (boeken, bewerken, overboeken, vaste posten, spaardoelen) en uit de buffer — en
  // dat gebeurde zonder één woord (ronde 65). In het saldo-overzicht blijft ze wél
  // staan, met verminderde dekking.
  // De balk zegt nu wat er veranderde en biedt de weg terug, zoals bij elke andere
  // handeling die iets uit beeld haalt.
  async function archiveerRekening(r: Rekening, archiveer: boolean) {
    await bewaarRekening({ ...r, gearchiveerd: archiveer })
    await herlaad()
    toonUndo(
      archiveer
        ? t('{naam} gearchiveerd — ze staat niet meer in de keuzelijsten', { naam: r.naam })
        : t('{naam} heropend', { naam: r.naam }),
      () => bewaarRekening(r),
    )
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

  async function voegWaarderingToe(w: Waardering) {
    await bewaarWaardering(w)
    await herlaad()
  }

  async function verwijderWaarderingH(id: string) {
    const oud = waarderingen.find((w) => w.id === id)
    await verwijderWaardering(id)
    await herlaad()
    if (oud) toonUndo(t('Waardering verwijderd'), () => bewaarWaardering(oud))
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
    if (oud) toonUndo(t('{naam} verwijderd', { naam: oud.naam }), () => bewaarKind(oud))
  }

  // Waar hangt dit gezinslid nog aan? Het vraagvenster in KinderenSectie toont
  // deze regels, zodat je vóór het verwijderen ziet wat er een naamloze
  // verwijzing wordt (ronde 65).
  function gezinslidGebruik(id: string): string[] {
    return telGezinslidGebruik(t, id, {
      kosten: gedeeldeKosten,
      verrekeningen,
      kindrekeningposten,
      onderhoudsbijdragen,
      transacties: transacties ?? [],
      spaardoelen,
      leningen,
      garanties,
    })
  }

  // Een eigen MIDDENcategorie maken onder een hoofdcategorie (eigen óf ingebouwd).
  // Zo krijgt ook je eigen indeling de volledige boom hoofd → categorie → item.
  async function voegCategorieOnderToe(ouderId: string, naam: string) {
    await bewaarCategorie({ id: nieuwId(), naam, ouderId })
    await herlaad()
  }

  // Vraagt eerst (ronde 65). Er ging tot nu toe een hele tak in één tik weg —
  // middencategorieën, items, en de naam onder elke boeking die eraan hing —
  // met alleen "Categorie verwijderd" achteraf.
  function verwijderCat(id: string) {
    // De melding van een vórige poging hoort niet in dit verse venster.
    catWegOpslag.wis()
    setCatWegId(id)
  }

  async function verwijderCatEcht(id: string) {
    const oud = categorieen.find((c) => c.id === id)
    // Alles wat eronder hangt gaat mee: de eigen middencategorieën en de
    // subcategorieën daarin. Bleven die staan, dan zouden het weesrecords zijn die
    // nergens meer verschijnen maar wél mee gesynchroniseerd worden — dezelfde
    // regel als bij het verwijderen van een dossier of een transactie.
    const kinderen = categorieen.filter((c) => c.ouderId === id)
    const onderliggendeIds = new Set([id, ...kinderen.map((c) => c.id)])
    const oudeSubs = subcategorieen.filter((sub) => onderliggendeIds.has(sub.categorieId))

    // Eén ondeelbare stap. Brak dit halverwege af, dan bleven er weesrecords staan
    // die nergens meer verschijnen maar wél mee gesynchroniseerd worden — precies
    // wat het commentaar hierboven belooft te voorkomen (ronde 65).
    await verwijderCategorieMetAanhang(id, {
      categorieIds: kinderen.map((k) => k.id),
      subcategorieIds: oudeSubs.map((s) => s.id),
    })
    await herlaad()

    if (oud) {
      toonUndo(categorieUndoTekst(t, oud.naam, kinderen.length, oudeSubs.length), () =>
        herstelCategorieMetAanhang([oud, ...kinderen], oudeSubs),
      )
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

  // Een reeks kosten in ÉÉN blok (de uitwisseling met de andere ouder, ronde 44).
  // Alles of niets: een half ingelezen bestand zou je met een dossier opzadelen
  // waarvan je niet weet welke helft er staat.
  async function bewaarKostenBlok(kosten: GedeeldeKost[]) {
    await bewaarGedeeldeKosten(kosten)
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
    // Sinds ronde 42 hangt er ook een onderhoudsbijdrage aan een dossier. Bleef die
    // staan, dan verscheen er na het verwijderen een melding in het belletje over een
    // dossier dat niet meer bestaat — met een lege naam en een klik die nergens
    // naartoe leidt.
    const oudeBijdragen = onderhoudsbijdragen.filter((b) => b.dossierId === id)
    const oudeBetalingen = onderhoudsbetalingen.filter((b) =>
      oudeBijdragen.some((x) => x.id === b.bijdrageId),
    )
    // In één ondeelbare stap: ofwel verdwijnt alles, ofwel niets. Zie de uitleg
    // bij verwijderDossierMetAanhang — losse stappen lieten bij een onderbreking
    // onzichtbare weeskosten achter die wél meesynchroniseerden.
    // De documentkluis van dit dossier (ronde 55). Dit is het zwaarste wat de app
    // bewaart: elke bon en elke scan zit als data-URL in de database, en dus ook in
    // elke back-up. Bleven ze staan, dan waren ze onzichtbaar — het dossier waar ze
    // bij hoorden bestond niet meer — en kreeg je ze nooit meer weg.
    const oudeDocumenten = dossierdocumenten.filter((d) => d.dossierId === id)
    await verwijderDossierMetAanhang(id, {
      gedeeldeKostIds: oudeKosten.map((k) => k.id),
      verrekeningIds: oudeVerrekeningen.map((v) => v.id),
      kindrekeningIds: oudeKindrekeningen.map((k) => k.id),
      kindrekeningpostIds: oudeKindrekeningposten.map((p) => p.id),
      onderhoudsbijdrageIds: oudeBijdragen.map((b) => b.id),
      onderhoudsbetalingIds: oudeBetalingen.map((b) => b.id),
      documentIds: oudeDocumenten.map((d) => d.id),
    })
    await herlaad()
    if (oud) {
      // ⚠ In ÉÉN ondeelbare stap (ronde 65). Het verwijderen was dat al; dit was een
      // reeks losse schrijfacties, en brak die halverwege af, dan kreeg je een
      // dossier terug met de helft van zijn kosten, afrekeningen en documenten. Een
      // half bewijsstuk is erger dan geen.
      //
      // De documenten komen terug zoals ze waren, inclusief de aanduiding "waarop
      // steunt deze verdeling" op het dossier zelf.
      toonUndo(t('Dossier verwijderd'), () =>
        herstelDossierMetAanhang(oud, {
          gedeeldeKosten: oudeKosten,
          verrekeningen: oudeVerrekeningen,
          kindrekeningen: oudeKindrekeningen,
          kindrekeningposten: oudeKindrekeningposten,
          onderhoudsbijdragen: oudeBijdragen,
          onderhoudsbetalingen: oudeBetalingen,
          documenten: oudeDocumenten,
        }),
      )
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

  /**
   * Een nieuwe subcategorie, en desnoods de categorie en de hoofdcategorie eronder.
   *
   * Geeft het nieuwe id terug, zodat een formulier de zopas gemaakte subcategorie
   * meteen kan selecteren zonder ze opnieuw te moeten opzoeken.
   *
   * ⚠ RONDE 67. Tot nu toe kon je hier alleen iets bijzetten onder een categorie
   * die al bestond, en dan nog alleen onder een INGEBOUWDE. Wie een televisie
   * kocht en daar een eigen hoofdcategorie "Huisraad" voor wilde, moest zijn
   * boeking verlaten. Het plan zegt nu wat er allemaal nog gemaakt moet worden, en
   * dat gaat in ÉÉN ondeelbare stap naar de database: anders houd je bij een
   * mislukking een lege hoofdcategorie over waar je nooit om vroeg.
   */
  async function voegSubcategorieToe(plan: NieuweTak): Promise<string> {
    const { categorieen: nieuweCategorieen, subcategorie } = bouwTak(plan, nieuwId)
    await bewaarNieuweTak(nieuweCategorieen, subcategorie)
    // ⚠ Het opnieuw inlezen mag deze oproep niet doen mislukken. Het WEGSCHRIJVEN is
    // op dit punt al gelukt en ondeelbaar gebeurd; struikelt daarna het inlezen, dan
    // kreeg het scherm "Toevoegen is niet gelukt — probeer het opnieuw" te zien en
    // maakte een tweede poging een tweede hoofdcategorie, een tweede categorie en een
    // tweede subcategorie met dezelfde namen aan. De melding stuurde de gebruiker dus
    // recht naar de schade. Loopt het inlezen mis, dan is het scherm even niet bij —
    // de eerstvolgende herlaadbeurt zet dat recht.
    try {
      await herlaad()
    } catch {
      // stil: de tak staat in de database, alleen het beeld loopt achter.
    }
    return subcategorie.id
  }

  // Hernoemen had als enige categoriewijziging géén weg terug (ronde 65). En het
  // schreef een KAAL record terug: een eigen item met synoniemen verloor die stil,
  // want `{ id, naam, categorieId }` overschrijft het hele object. Nu bewaren we
  // wat er al stond en kan je de oude naam in één tik terughalen.
  async function wijzigSubcategorie(id: string, categorieId: string, naam: string) {
    const oud = subcategorieen.find((s) => s.id === id)
    // ⚠ Hernoem je een INGEBOUWD item voor het eerst, dan is er nog geen record om
    // naar terug te keren: de oude naam staat alleen in de ingebouwde boom. Terug
    // betekent dan de aanpassing wéghalen, niet een oude aanpassing terugzetten.
    const ingebouwd = itemPerId(id)
    const oudeNaam = oud?.naam ?? ingebouwdeItemNaam(id)
    // ⚠ En de SYNONIEMEN van een ingebouwd item gaan mee. Zonder deze regel verloor
    // elk ingebouwd item bij zijn eerste hernoeming zijn zoekwoorden: het
    // aanpassingsrecord vervangt het ingebouwde item volledig, en de synoniemen
    // stonden alleen in de ingebouwde boom. Je hernoemt "Eieren" naar "Bio-eieren"
    // en vindt het daarna niet meer terug via "ei".
    // ⚠ Ook wanneer er al een aanpassingsrecord bestaat: hernoemde je dit item vóór
    // ronde 65, dan zijn de synoniemen destijds stil verdwenen en staat er niets in
    // `oud`. Dan halen we ze alsnog uit de ingebouwde boom terug.
    const uitBoom = ingebouwd && ingebouwd.synoniemen.length > 0 ? ingebouwd.synoniemen : undefined
    const synoniemen = oud?.synoniemen && oud.synoniemen.length > 0 ? oud.synoniemen : uitBoom
    await bewaarSubcategorie({ ...(oud ?? {}), id, naam, categorieId, ...(synoniemen ? { synoniemen } : {}) })
    await herlaad()
    if (oudeNaam === undefined || oudeNaam === naam) return
    toonUndo(t('{oud} heet nu {nieuw}', { oud: oudeNaam, nieuw: naam }), async () => {
      if (oud) await bewaarSubcategorie(oud)
      else await verwijderSubcategorie(id)
    })
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
   * Inboeken vanaf de vooruitblik (ronde 40), in de maand die dat scherm toont.
   *
   * Bewust een tweede functie naast `boekVasteLastPerId`: die is van het belletje
   * en boekt altijd in de HUIDIGE maand, want het belletje gaat over nu. De
   * vooruitblik volgt sinds deze ronde de maandschakelaar, dus daar hoort de
   * bekeken maand — anders zou je op de vooruitblik van maart klikken en in juli
   * boeken.
   */
  async function boekVasteLastPerIdInMaand(postId: string, doelMaand: string) {
    const post = terugkerendePosten.find((p) => p.id === postId)
    if (post) await boekTerugkerend(post, doelMaand)
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
    // Een gestopte post mag niet meer geboekt worden (ronde 38). Deze controle
    // staat hier apart en niet alleen in `valtInMaand`: "Boek in" wordt ook vanuit
    // het meldingenpaneel aangeroepen, en een melding die nog van vóór de opzegging
    // in beeld stond, zou anders alsnog een boeking aanmaken.
    if (isGestopt(post, doelMaand)) {
      meld(
        t('{naam} loopt niet meer vanaf {maand}. Er is niets geboekt.', {
          naam: post.omschrijving,
          maand: maandJaarLabel(`${post.eindMaand ?? doelMaand}-01`),
        }),
        'fout',
      )
      return
    }
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
        t('{naam} lijkt al geboekt op {datum} ({bedrag}). Er is niets bijgemaakt — kijk het na in je boekingen.', {
          naam: post.omschrijving,
          datum: gelijkaardig.datum,
          bedrag: formatEuro(Math.abs(gelijkaardig.bedrag)),
        }),
        'fout',
      )
      return
    }

    // ⚠ Eerst VRAGEN wanneer er iets in de buurt staat (ronde 64). De controle
    // hierboven vangt alleen het exacte bedrag af. Timothy's geval — vaste last
    // Water € 30, boeking € 32 — glipte daar doorheen, en dan maakte deze functie er
    // vrolijk een tweede boeking van € 30 bij: € 62 op Water terwijl er € 32 van de
    // rekening ging. Nu legt de app de twee naast elkaar en laat ze jou beslissen.
    const lijkterop = boekingVoorVasteLast(post, transacties ?? [], terugkerendePosten, doelMaand)
    if (lijkterop) {
      setVasteLastVraag({ soort: 'voor-inboeken', post, boeking: lijkterop, maand: doelMaand })
      return
    }

    await boekTerugkerendEcht(post, doelMaand)
  }

  /** Het eigenlijke inboeken, zonder controles: de weg na een uitgesproken "nee". */
  async function boekTerugkerendEcht(post: TerugkerendePost, doelMaand: string) {
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
    // Eén ondeelbare stap (ronde 65). Brak dit halverwege af, dan stonden er kosten
    // op 'afgerekend' terwijl de afrekening niet als overgemaakt gemarkeerd stond —
    // en dan zet zelfs het verwijderen van die afrekening het niet meer recht, want
    // dat kijkt naar precies dat vinkje.
    const gedekt = kostenVanAfrekening(v, gedeeldeKosten)
    await markeerVerrekeningOvergemaakt(v, gedekt, overgemaakt)
    await herlaad()
    // Dit vinkje verschuift geld: gedekte kosten vallen erdoor uit (of terug in) je
    // openstaande saldo. Dan hoort er ook een weg terug te zijn, net als bij elke
    // andere handeling in de app (ronde 65).
    const idsGedekt = gedekt.map((k) => k.id)
    toonUndo(
      overgemaakt ? t('Afrekening gemarkeerd als overgemaakt') : t('Afrekening weer opengezet'),
      async () => {
        // ⚠ Dezelfde twee voorzorgen als bij het verwijderen van een afrekening.
        // (1) We schrijven de VERSE kostrecords terug, niet de momentopname van
        // twintig seconden geleden: een kost die intussen opengezet én gecorrigeerd
        // werd, mag haar correctie niet stil verliezen.
        // (2) Zetten we hem weer op 'overgemaakt', dan slaan we kosten over die
        // intussen in een ándere, nog open afrekening zitten — anders claimen twee
        // afrekeningen hetzelfde geld.
        const verseKosten = (await laadGedeeldeKosten()).geldig.filter((k) => idsGedekt.includes(k.id))
        const vastInAndere = new Set<string>()
        if (!overgemaakt) {
          for (const ander of (await laadVerrekeningen()).geldig) {
            if (ander.id === v.id || ander.overgemaakt) continue
            for (const kostId of ander.kostIds ?? []) vastInAndere.add(kostId)
          }
        }
        await markeerVerrekeningOvergemaakt(
          v,
          verseKosten.filter((k) => !vastInAndere.has(k.id)),
          !overgemaakt,
        )
      },
    )
  }

  // Een afrekening verwijderen laat de kosten zelf staan, maar zet ze wél terug op
  // "nog niet afgerekend" wanneer déze afrekening ze had dichtgezet (ronde 65).
  // Anders vallen die kosten uit het openstaande saldo terwijl er niets meer
  // bestaat dat uitlegt waarom — en dat is precies wat een dossier onbruikbaar
  // maakt als bewijs. Ongedaan maken zet allebei terug.
  async function verwijderAfrekening(id: string) {
    const oud = verrekeningen.find((v) => v.id === id)
    if (!oud) return
    const heropend = kostenOmTeHeropenen(oud, gedeeldeKosten)
    // Eén ondeelbare stap: de afrekening weg én de kosten open, of geen van beide.
    await verwijderVerrekeningMetHeropening(id, heropend)
    await herlaad()

    toonUndo(t('Afrekening verwijderd'), async () => {
      // ⚠ Terugzetten kijkt naar de VERSE toestand, niet naar wat er twintig
      // seconden geleden stond. Maakte je intussen een nieuwe afrekening over
      // dezelfde kosten, dan zou blind terugzetten diezelfde euro's in twee
      // afrekeningen tegelijk zetten. Zulke kosten laten we open staan; de oude
      // afrekening komt wel gewoon terug als document.
      const verseVerrekeningen = (await laadVerrekeningen()).geldig
      const vastInAndere = new Set<string>()
      for (const v of verseVerrekeningen) {
        if (v.id === id) continue
        for (const kostId of v.kostIds ?? []) vastInAndere.add(kostId)
      }
      // ⚠ En we schrijven het VERSE record terug met alleen de twee vlaggen
      // hersteld, niet de momentopname van twintig seconden geleden. Wie in die
      // twintig seconden het bedrag of de omschrijving van zo'n kost corrigeert,
      // zou anders zien hoe zijn correctie stil verdween.
      const verseKosten = new Map((await laadGedeeldeKosten()).geldig.map((k) => [k.id, k]))
      const terug = heropend
        .filter((k) => !vastInAndere.has(k.id))
        .map((k) => {
          const vers = verseKosten.get(k.id) ?? k
          return { ...vers, afgerekend: k.afgerekend, ...(k.verrekeningId ? { verrekeningId: k.verrekeningId } : {}) }
        })
      await herstelVerrekeningMetKosten(oud, terug)
    })
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
  // Ronde 42 — de onderhoudsbijdrage. Zelfde patroon als de rest: bewaren, opnieuw
  // laden, en bij verwijderen het oude record vasthouden zodat Ongedaan maken werkt.
  async function onderhoudsbijdrageOpslaan(b: Onderhoudsbijdrage) {
    await bewaarOnderhoudsbijdrage(b)
    await herlaad()
  }

  // Ronde 43 — de maandafsluiting. De MAAND is de sleutel, dus opnieuw afsluiten
  // overschrijft hetzelfde record in plaats van er een tweede te maken.
  async function maandAfsluiten(m: Maandafsluiting) {
    await bewaarMaandafsluiting(m)
    await herlaad()
  }

  async function maandHeropenen(maand: string) {
    await verwijderMaandafsluiting(maand)
    await herlaad()
  }

  // Eén boeking een categorie geven, vanuit de maandafsluiting. Bewust hier en niet
  // in het scherm: dat schrijft nergens zelf naar de opslag.
  async function geefCategorie(transactieId: string, categorieId: string) {
    const oud = (transacties ?? []).find((tx) => tx.id === transactieId)
    if (!oud) return
    // `vulCategorieAan` en niet `{ ...oud, categorieId }`: bij een gesplitst ticket
    // negeert de rekenkern het kopveld, en dan verandert er niets.
    await bewaarTransactie(vulCategorieAan(oud, categorieId))
    await herlaad()
  }

  async function onderhoudsbijdrageVerwijderen(id: string) {
    const oud = onderhoudsbijdragen.find((b) => b.id === id)
    // De betalingen horen bij de bijdrage: laat je ze staan, dan zweven ze rond
    // zonder eigenaar en duiken ze op wanneer je later een nieuwe bijdrage maakt.
    const oudeBetalingen = onderhoudsbetalingen.filter((b) => b.bijdrageId === id)
    for (const betaling of oudeBetalingen) await verwijderOnderhoudsbetaling(betaling.id)
    await verwijderOnderhoudsbijdrage(id)
    await herlaad()
    if (oud) {
      toonUndo(t('Onderhoudsbijdrage verwijderd'), async () => {
        await bewaarOnderhoudsbijdrage(oud)
        for (const betaling of oudeBetalingen) await bewaarOnderhoudsbetaling(betaling)
      })
    }
  }

  async function onderhoudsbetalingOpslaan(b: Onderhoudsbetaling) {
    await bewaarOnderhoudsbetaling(b)
    await herlaad()
  }

  async function onderhoudsbetalingVerwijderen(id: string) {
    const oud = onderhoudsbetalingen.find((b) => b.id === id)
    await verwijderOnderhoudsbetaling(id)
    await herlaad()
    if (oud) toonUndo(t('Betaling verwijderd'), () => bewaarOnderhoudsbetaling(oud))
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
    // Wijst een dossier dit document aan als de grondslag van zijn verdeling, dan
    // gaat die aanwijzing mee — anders bleef het dossier verwijzen naar iets dat
    // niet meer bestaat. Ongedaan maken zet allebei terug; dat is één undo, want
    // het was ook één handeling.
    const grondslagVan = dossiers.find((d) => d.grondslagDocumentId === id)
    await verwijderDossierDocument(id, grondslagVan?.id)
    await herlaad()
    if (oud) {
      toonUndo(
        grondslagVan
          ? t('Document verwijderd. Het stond in dit dossier als grondslag van de verdeling; die aanduiding is mee weg.')
          : t('Document verwijderd'),
        async () => {
          // NIET het hele oude dossier terugschrijven. Tussen het verwijderen en het
          // ongedaan maken zitten tot twintig seconden, en in die tijd kan je op ditzelfde
          // scherm een kaart aan- of uitzetten, of kan er een wijziging van je gsm
          // binnenkomen via de synchronisatie. Het logboek werkt met "de laatste
          // schrijver wint", dus een oude foto terugzetten zou zo'n wijziging stil
          // wissen — bijvoorbeeld een verdeelsleutel die van 65 naar 50 terugspringt,
          // en dat cijfer komt later in een afrekening terecht. Daarom halen we het
          // dossier op zoals het NU is en zetten we er alleen dat ene veld weer op.
          //
          // Eerst LEZEN, dan pas schrijven, en het lezen mag mislukken: gaat dat mis,
          // dan komt het document nog altijd terug. Andersom (eerst het document
          // terugzetten en dan pas lezen) zou een mislukte lezing je met een half
          // hersteld dossier achterlaten, zonder melding.
          let terug: Dossier | undefined
          if (grondslagVan) {
            try {
              const nu = (await laadDossiers()).geldig.find((d) => d.id === grondslagVan.id)
              if (nu) terug = { ...nu, grondslagDocumentId: grondslagVan.grondslagDocumentId }
            } catch {
              // Stil: het document terugzetten is belangrijker dan de verwijzing.
            }
          }
          await herstelDossierDocument(oud, terug)
        },
      )
    }
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
      toonUndo(t('Boeking verwijderd'), async () => {
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
    toonUndo(t('{n} boeking(en) verwijderd', { n: ids.length }), async () => {
      for (const o of oude) await bewaarTransactie(o)
      for (const k of oudeKosten) await bewaarGedeeldeKost(k)
      for (const d of oudeBonnen) await bewaarDossierDocument(d)
      for (const g of oudeGaranties) await bewaarGarantie(g)
    })
  }

  // Een ingelezen bankuittreksel wegschrijven. In ÉÉN ondeelbare stap, en met één
  // keer ongedaan maken voor de hele reeks: lees je per ongeluk de verkeerde maand
  // of de verkeerde rekening in, dan wil je dat met één tik terug kunnen draaien en
  // niet tweehonderd rijen één voor één moeten aanvinken en wissen.
  async function leesUittrekselIn(nieuwe: Transactie[]) {
    if (nieuwe.length === 0) return
    await bewaarTransacties(nieuwe)
    // Alles hierna is afwerking. Struikelt het herladen, dan is de import zélf wel
    // degelijk gelukt — het zou dus verkeerd zijn om de fout door te geven aan het
    // importscherm: dat zegt dan "niet gelukt", en de gebruiker leest opnieuw in.
    // Dan pas heeft hij echt dubbels.
    try {
      await herlaad()
    } catch {
      // stil: de gegevens staan er, alleen het scherm loopt achter.
    }
    toonUndo(t('{n} boeking(en) ingelezen', { n: nieuwe.length }), async () => {
      await verwijderTransactiesMetAanhang(nieuwe.map((n) => n.id))
      await herlaad()
    })
  }

  async function verbindEnSynchroniseer() {
    setBezig(true)
    meld(null)
    try {
      await vraagToken(true) // opent zo nodig het Google-aanmeldvenster
      setVerbonden(true)
      if (!backendRef.current) backendRef.current = new DriveBackend()
      const r = await syncEnOnthoud(backendRef.current)
      await herlaad()
      onthoudFormaat(r)
      // Het aantal geweigerde regels hoort IN de statusregel: "0 opgehaald" terwijl
      // er honderden regels geweigerd zijn, is misleidend.
      meld(
        r.verouderd > 0 || r.teNieuw > 0
          ? t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet leesbaar.', {
              gepusht: r.gepusht,
              opgehaald: r.opgehaald,
              geweigerd: r.verouderd + r.teNieuw,
            })
          : t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }),
      )
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
      const r = await syncEnOnthoud(backendRef.current)
      await herlaad()
      onthoudFormaat(r)
      // Het aantal geweigerde regels hoort IN de statusregel: "0 opgehaald" terwijl
      // er honderden regels geweigerd zijn, is misleidend.
      meld(
        r.verouderd > 0 || r.teNieuw > 0
          ? t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet leesbaar.', {
              gepusht: r.gepusht,
              opgehaald: r.opgehaald,
              geweigerd: r.verouderd + r.teNieuw,
            })
          : t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald }),
      )
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
    wisLoopt.current = true
    // Een lopende ronde eerst laten uitbollen; haar fout is hier niet van belang.
    await syncLoopt.current?.catch(() => undefined)
    try {
    const resultaat = await wisAlles(verbonden ? backendRef.current : null)
    await herlaad()
    // ⚠ `wisAlles` leegt élke tabel, dus ook het geheugentje met de dag van je
    // laatste back-up (ronde 63). Dat is precies de bedoeling — een lege app mag
    // geen vangnet beweren dat over gewiste gegevens ging — maar dan moet het
    // vertrekpunt hier ook meteen opnieuw gezet worden. Zonder deze twee regels
    // zou de app pas bij de volgende herstart weer beginnen te tellen.
    await zorgVoorEersteGebruik(vandaag())
    setBackupMoment(await leesBackupMoment())
    return resultaat
    } finally {
      wisLoopt.current = false
    }
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
  // Gememoiseerd (ronde 47): deze functie loopt over alle budgetten, transacties,
  // garanties, vaste lasten, onderhoudsbijdragen én maandafsluitingen, en ze draaide
  // bij ELKE render van App — dus ook wanneer je alleen een tabblad opende of een
  // letter in een zoekveld tikte. Er ging niets fout, maar het is werk voor niets op
  // precies het toestel waar dat het meest voelbaar is.
  //
  // De datum staat BUITEN de useMemo, en dat is geen stijlkwestie. `vandaag()` en
  // `huidigeMaand()` binnen de memo zouden één keer uitgerekend worden en daarna
  // bevroren blijven tot er toevallig data verandert. Precies de meldingen die van
  // de datum afhangen — een garantie die morgen vervalt, een vaste last die deze
  // maand nog niet geboekt is — bleven dan hangen op de dag van gisteren. En erger:
  // de knop 'boek deze vaste last in' rekent de maand bij de klik opnieuw uit, dus
  // de melding zou over juli gaan terwijl de knop in augustus boekt. Het zijn
  // gewone strings, dus de memo slaat het werk nog altijd over bij elke render
  // binnen dezelfde dag — hij ververst enkel wanneer de dag echt verandert.
  const meldingVandaagISO = vandaag()
  const meldingMaand = huidigeMaand()
  // Valt er iets te verliezen?
  //
  // ⚠ Niet alleen boekingen en rekeningen (nakijkronde ronde 63). Wie Kompal
  // uitsluitend voor een dossier gebruikt — gedeelde kosten, kinderen, foto's van
  // kastickets in de kluis — heeft geen enkele transactie en zou nooit een
  // herinnering krijgen, terwijl juist die foto's alleen in deze browser bestaan.
  const heeftIetsTeVerliezen =
    (transacties ?? []).length > 0 ||
    rekeningen.length > 0 ||
    dossiers.length > 0 ||
    gedeeldeKosten.length > 0 ||
    kinderen.length > 0 ||
    terugkerendePosten.length > 0 ||
    garanties.length > 0 ||
    leningen.length > 0 ||
    spaardoelen.length > 0 ||
    dossierdocumenten.length > 0 ||
    budgetten.length > 0 ||
    categorieen.length > 0 ||
    subcategorieen.length > 0
  const meldingen = useMemo(
    () =>
      bouwMeldingen({
        budgetten,
        transacties: transacties ?? [],
        maand: meldingMaand,
        garanties,
        terugkerendePosten,
        vandaagISO: meldingVandaagISO,
        drempel: budgetDrempel,
        naamVanCategorie: (id) => labelVanCategorie(id, categorieen) ?? t('Geen categorie'),
        onderhoudsbijdragen,
        dossiers,
        formatBedrag: formatEuro,
        maandafsluitingen,
        // ⚠ "Heeft dit toestel iets te verliezen?" is bewust een TELLING van wat
        // er staat en niet "is de app ooit gebruikt" (ronde 63). Een lege app die
        // je één keer opende, hoort geen herinnering te krijgen; één rekening of
        // één boeking is genoeg om er wel een te verdienen.
        backup: {
          ...backupMoment,
          heeftGegevens: heeftIetsTeVerliezen,
        },
      }),
    [
      budgetten,
      transacties,
      meldingMaand,
      meldingVandaagISO,
      garanties,
      terugkerendePosten,
      budgetDrempel,
      categorieen,
      // `labelVanCategorie` leest het register dat met `subcategorieen` gevuld wordt.
      // Zonder deze dep blijft een hernoemde eigen subcategorie in de melding onder
      // haar oude naam staan tot er toevallig iets anders verandert.
      subcategorieen,
      onderhoudsbijdragen,
      dossiers,
      maandafsluitingen,
      backupMoment,
      heeftIetsTeVerliezen,
      t,
    ],
  )

  // Alles wat het blok "Veilig bewaren" in de opstelling nodig heeft (ronde 63).
  // Dezelfde knoppen en dezelfde toestand als in Instellingen — het zijn letterlijk
  // dezelfde kaarten, dus er kan geen tweede waarheid ontstaan.
  const veiligInvoer = {
    verbonden,
    bezig,
    onVerbind: verbindEnSynchroniseer,
    onSynchroniseer: synchroniseerNu,
    backupTekst,
    backupIsFout,
    onExporteer: exporteerNu,
    onHerstel: herstelUitBestand,
    laatsteBackupOp: backupMoment.laatsteBackupOp,
    laatsteSyncOp: backupMoment.laatsteSyncOp,
    opslag,
    vandaagISO: meldingVandaagISO,
  }

  // Eén vooruitblik voor de Plan-pagina: zowel de verwachte als de al geboekte
  // inkomsten komen hieruit, zodat beide cijfers gegarandeerd bij elkaar horen.
  const planBlik = maandVooruitblik(transacties ?? [], terugkerendePosten, maand)

  // Welke budgetten gelden in de maand die je BEKIJKT (ronde 62). Hoogstens één per
  // categorie: een uitzondering voor deze maand gaat vóór op je standaard. Zie
  // `geldendeBudgetten` in utils/budget.ts voor waarom alles daarlangs moet.
  const geldendNu = geldendeBudgetten(budgetten, maand)
  // Het bedrag van je STANDAARDbudget voor een categorie, of niets wanneer je er
  // geen hebt. Dient om bij een uitzondering te kunnen zeggen wat er normaal staat.
  const standaardBedrag = (categorieId: string): number | undefined =>
    budgetten.find((b) => b.categorieId === categorieId && b.maand === undefined)?.bedrag
  // Voor welke ANDERE maanden staat er een apart budget klaar? Zonder deze regel zet
  // je in augustus iets voor december en zie je dat daarna nergens meer terug.
  const andereBudgetmaanden = maandenMetEigenBudget(budgetten, maand, huidigeMaand())

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

  if (transacties === null || pagina === null) {
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
  const totaalSaldo = totaalSaldoVan(rekeningen, transacties, overboekingen, waarderingen, vandaag())

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
        onNaarRekeningen={() => gaNaarOpstelling('rekeningen')}
        categorieen={categorieen}
        handelaars={handelaars}
        handelaarIndex={handelaarIndex}
        onNieuweSubcategorie={voegSubcategorieToe}
        gezinsleden={kinderen}
        overboekingen={overboekingen}
        waarderingen={waarderingen}
        transacties={transacties}
        terugkerendePosten={terugkerendePosten}
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
        titel={t('Boeking bewerken')}
        open={bewerkTransactie !== null}
        onSluiten={() => setBewerkTransactie(null)}
        // Ook hier: een klik naast het venster mag een half aangepaste boeking
        // niet wissen. Zie `bewaakInvoer` in ui/Dialoog.tsx.
        bewaakInvoer
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

      {/* De vraag vóór het verwijderen van een eigen categorie (ronde 65). Zelfde
          vorm als bij een dossier en een afrekening: ze telt wat er meegaat in
          plaats van "weet je het zeker?" te vragen. */}
      <Dialoog
        titel={catWeg ? t('{naam} verwijderen?', { naam: catWeg.naam }) : t('Categorie verwijderen?')}
        open={catWeg !== null}
        onSluiten={() => setCatWegId(null)}
        voet={
          <div className="knoprij">
            <button type="button" className="knop knop-secundair" onClick={() => setCatWegId(null)}>
              {t('Nee, behouden')}
            </button>
            <button
              type="button"
              className="knop knop-secundair knop-gevaar"
              aria-busy={catWegOpslag.bezig}
              // ⚠ RONDE 68 — HET VENSTER GING DICHT VÓÓR ER IETS GEBEURD WAS.
              // Je las hier net hoeveel boekingen, budgetten en dossiers hun
              // categorienaam zouden verliezen, drukte op "Ja, verwijder", zag het
              // venster wegvallen — en mocht daaruit afleiden dat het gebeurd was.
              // Mislukte het wegschrijven, dan stond de categorie er gewoon nog en
              // was er geen woord gezegd. Nu blijft het venster staan tot het écht
              // gelukt is.
              onClick={() => {
                const doel = catWegId
                if (!doel) return
                void catWegOpslag.probeer(() => verwijderCatEcht(doel)).then((gelukt) => {
                  if (gelukt) setCatWegId(null)
                })
              }}
            >
              {t('Ja, verwijder')}
            </button>
          </div>
        }
      >
        {catWeg && (
          <div className="stapel" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}>{t('Dit verandert er:')}</p>
            <ul className="lijst">
              {telCategorieVerwijderen(t, catWeg.id, {
                categorieen,
                subcategorieen,
                transacties: transacties ?? [],
                budgetten,
                terugkerendePosten,
                gedeeldeKosten,
                kindrekeningposten,
                dossiers,
              }).map((regel) => (
                <li key={regel} className="rij">
                  <span className="rij-midden">
                    <span className="rij-titel">{regel}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Je kan dit meteen daarna nog ongedaan maken met de balk onderaan, maar die blijft niet lang staan.')}
            </p>
            <Opslagfout fout={catWegOpslag.fout} zin={t('Verwijderen is niet gelukt. Er is niets weggehaald.')} />
          </div>
        )}
      </Dialoog>

      {/* "Is dit je vaste last Water?" (ronde 64). Staat bij de boekingslagen, want
          de vraag kan overal opduiken: na een boeking in de popup, en na een tik op
          "Boek in" — en dat laatste kan ook vanuit het meldingenpaneel. */}
      <VasteLastVraag
        inhoud={vasteLastVraag}
        bezig={vraagOpslag.bezig}
        fout={vraagOpslag.fout}
        // ⚠ RONDE 68 — DIT VENSTER LOOG. Het ging dicht en zette de boeking op
        // "hierover is al gevraagd" vóór de koppeling geschreven was. Mislukte dat,
        // dan bleef je vaste last als NIET betaald staan, kwam de vraag nooit meer
        // terug, en maakte één tik op "Boek in" een tweede boeking bovenop de eerste.
        onJa={() => {
          const vraag = vasteLastVraag
          if (!vraag) return
          void vraagOpslag.probeer(() => koppelAanVasteLast(vraag.boeking, vraag.post)).then((gelukt) => {
            if (!gelukt) return
            gevraagdOverBoeking.current.add(vraag.boeking.id)
            setVasteLastVraag(null)
          })
        }}
        onAnnuleer={() => {
          const vraag = vasteLastVraag
          setVasteLastVraag(null)
          // Wegklikken is geen antwoord: er wordt niets gekoppeld en niets geboekt.
          // Wel onthouden dat we het gevraagd hebben, anders komt dezelfde vraag bij
          // de volgende bewerking meteen terug.
          if (vraag) gevraagdOverBoeking.current.add(vraag.boeking.id)
        }}
        onNee={() => {
          const vraag = vasteLastVraag
          if (!vraag) return
          // ⚠ "Nee" betekent iets ANDERS per vraag. Na een boeking: laat maar, het
          // is een gewone uitgave. Vóór het inboeken: je wilde die vaste last
          // boeken, dus dan gebeurt dat alsnog — anders zou de knop "Boek in" na
          // een "nee" gewoon niets gedaan hebben.
          //
          // ⚠ En omdat er in dat tweede geval iets GESCHREVEN wordt, mag het venster
          // ook daar pas dicht als dat gelukt is. Anders verdween de vraag, kwam ze
          // nooit meer terug, en was er niets geboekt.
          if (vraag.soort !== 'voor-inboeken') {
            gevraagdOverBoeking.current.add(vraag.boeking.id)
            setVasteLastVraag(null)
            return
          }
          void vraagOpslag.probeer(() => boekTerugkerendEcht(vraag.post, vraag.maand)).then((gelukt) => {
            if (!gelukt) return
            gevraagdOverBoeking.current.add(vraag.boeking.id)
            setVasteLastVraag(null)
          })
        }}
      />
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
  function gaNaarMelding(doel: Pagina, subtab?: DossierSoort, dossierId?: string, budgettab?: BudgetTab) {
    setPagina(doel)
    // ⚠ Het belletje gaat over NU (zie de opmerking bij `meldingen` hierboven), dus de
    // Budget-pagina hoort ook op deze maand te openen (nakijkronde ronde 62). Stond de
    // schakelaar nog op december en klikte je op "Voeding is overschreden", dan landde
    // je op december — waar Voeding op 0 % kan staan. Sinds ronde 62 kan het bedrag uit
    // de melding daar zelfs helemaal niet bestaan.
    if (doel === 'budget') setMaand(huidigeMaand())
    // Zonder subtab de lade meenemen waar je nu staat: anders zegt het adres
    // `#/dossiers` en land je na een herlaadbeurt in "Gedeelde kosten" in plaats van
    // in de lade die je open had. Voor de Analyse-pagina geldt sinds ronde 60
    // hetzelfde met haar tabblad. Vandaag wijst nog geen enkele melding daarheen,
    // maar de dag dat er één bijkomt hoort ze niet stil het verkeerde te doen.
    zetRoute({
      pagina: doel,
      subtab: subtab ?? (doel === 'dossiers' ? dossierTab : undefined),
      analyse: doel === 'analyse' ? analyseTab : undefined,
      budget: doel === 'budget' ? (budgettab ?? budgetTab) : undefined,
    })
    if (subtab) setDossierTab(subtab)
    // ⚠ Naar het juiste TABBLAD (ronde 64). Sinds de Budget-pagina uit drie
    // tabbladen bestaat, is "naar Budget" niet meer genoeg: een melding over een
    // overschreden budget hoort bij de budgetten, een vaste last die nog niet
    // geboekt is bij "Vast". Zonder dit landde je op "Te verdelen" en moest je zelf
    // zoeken waar de melding over ging.
    if (budgettab) setBudgetTab(budgettab)
    // Zonder deze regel belandde je op de dossierpagina met een ánder dossier open
    // dan het dossier waarover de melding ging.
    if (dossierId) setGekozenDossierId(dossierId)
  }

  function gaNaarAnalyse(richting: 'uitgave' | 'inkomst') {
    setAnalyseRichting(richting)
    setPagina('analyse')
    // De donut op het Overzicht vraagt om een verdeling, dus daar landt hij ook.
    setAnalyseTab('verdeling')
    zetRoute({ pagina: 'analyse', analyse: 'verdeling' })
  }

  /**
   * Van een cijfer naar de boekingen eronder (ronde 40).
   *
   * Vóór deze ronde eindigde bijna elk cijfer blind: je zag € 340 bij Voeding
   * staan, en de enige weg naar de bijhorende boekingen was zelf naar Transacties
   * gaan en daar hetzelfde filter met de hand opnieuw instellen.
   */
  function gaNaarTransacties(filter: TxFilter) {
    setTxFilter((vorig) => ({ filter, nr: (vorig?.nr ?? 0) + 1 }))
    setPagina('transacties')
    // Het FILTER zelf staat bewust niet in het adres. Het is een keuze van dit
    // moment, geen plek; en een adres met een categorie-id erin is een gegeven dat
    // in een bladwijzer of een screenshot belandt.
    zetRoute({ pagina: 'transacties' })
  }

  // Gewoon navigeren (onderbalk, zijbalk) wist het doorklik-filter. Anders opent
  // Transacties de volgende keer opnieuw met het filter van een klik die je een
  // half uur geleden deed, zonder dat je weet waar het vandaan komt.
  function kiesPagina(doel: Pagina) {
    setTxFilter(null)
    setPagina(doel)
    zetRoute({
      pagina: doel,
      subtab: doel === 'dossiers' ? dossierTab : undefined,
      analyse: doel === 'analyse' ? analyseTab : undefined,
      budget: doel === 'budget' ? budgetTab : undefined,
    })
  }

  /**
   * De kaart "Wat komt eraan" in beeld schuiven na een sprong vanaf het Overzicht.
   *
   * ⚠ Zonder dit landde je bovenaan Analyse › Vooruit, waar die kaart het VIERDE blok
   * is — onder de periodekiezer, de vermogensevolutie en de vooruitblik. Dat is
   * letterlijk de klacht die ronde 64 voor de Budget-pagina oploste. Zelfde aanpak
   * als `brengBlokInBeeld` in OpstellingSectie: in een `setTimeout`, want de pagina
   * moet eerst getekend zijn, en met een bestaanscheck omdat `scrollIntoView` in de
   * testomgeving niet bestaat.
   *
   * ⚠ ÓÓK DE FOCUS VERZETTEN (tweede doorlichting ronde 72), net als de twee zusters.
   * Wie met de tab-toets op "Bekijk vooruit" stond en Enter duwde, verloor zijn focus
   * naar `<body>` zodra het Overzicht — en dus die knop — verdween; de volgende druk
   * op tab begon weer helemaal bovenaan.
   *
   * ⚠ EN DE FOCUS GAAT NAAR DE KOP, NIET NAAR DE KAART (vierde doorlichting ronde 72).
   * De zusters focussen een knop of een tab, die al focusbaar is én een korte naam
   * heeft. Zetten we de `tabindex` op de kaart zelf, dan leest voorleessoftware bij het
   * landen de hele kaart voor — twaalf staven, drie alinea's en vier knoppen. De kop
   * zegt in twee woorden waar je bent. `-1` houdt hem buiten de tab-volgorde en maakt
   * hem alleen voor deze sprong bereikbaar.
   */
  function brengToekomstInBeeld() {
    setTimeout(() => {
      const kaart = document.querySelector('[data-toekomstkaart]')
      if (!(kaart instanceof HTMLElement) || !kaart.isConnected) return
      if (typeof kaart.scrollIntoView === 'function') {
        const rustig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        kaart.scrollIntoView({ block: 'start', behavior: rustig ? 'auto' : 'smooth' })
      }
      // De terugval op de kaart zelf is een typenoodzaak (`querySelector` kan `null`
      // geven), geen gedrag: elke `Kaart` hier krijgt een titel mee.
      const doel = kaart.querySelector<HTMLElement>('.kaart-titel') ?? kaart
      doel.setAttribute('tabindex', '-1')
      doel.focus({ preventScroll: true })
    }, 0)
  }

  /**
   * Vanuit een ander scherm naar een bepaald tabblad van Analyse (ronde 72).
   *
   * ⚠ Niet `gaNaarAnalyse` hergebruiken: die zet het tabblad hard op "verdeling"
   * (ze hoort bij de donut op het Overzicht) en zou de widget "Wat komt eraan" dus
   * naar de verkeerde helft van de pagina sturen. Deze weg zet ook het ADRES, wat
   * `setPagina` alleen niet doet.
   */
  function gaNaarAnalyseTab(tb: AnalyseTab) {
    setTxFilter(null)
    setAnalyseTab(tb)
    setPagina('analyse')
    zetRoute({ pagina: 'analyse', analyse: tb })
  }

  /**
   * Vanuit een ander scherm naar een bepaald tabblad van Budget (ronde 64).
   *
   * ⚠ Bestaat omdat de knop "Naar Budget" in "Je situatie" je bovenaan de pagina
   * zette, terwijl het formulier dat je zocht — een vaste last toevoegen — het
   * vijfde blok naar beneden was. Timothy: "het tabblad Je situatie verwijst er een
   * paar keer naar, maar ik zie niet waar ik dan iets moet invullen." Nu land je
   * met het formulier in beeld. Deze weg zet ook het ADRES, wat `setPagina` alleen
   * niet deed.
   */
  function gaNaarBudget(tb: BudgetTab) {
    setTxFilter(null)
    setBudgetTab(tb)
    setPagina('budget')
    zetRoute({ pagina: 'budget', budget: tb })
  }

  // Doorklikken vanaf een cijfer dat over één categorie gaat, op welk niveau ook.
  // 'Zonder categorie' heeft geen id om op te filteren; daar gebeurt niets.
  function gaNaarCategorie(sleutel: string, extra: TxFilter = {}) {
    if (!sleutel) return
    gaNaarTransacties({ ...filterVoorCategorie(sleutel), ...extra })
  }

  const paginaInhoud = (
    <div className="stapel">

      {pagina === 'opstelling' && (
        <ErrorBoundary naam="Je situatie">
          <OpstellingSectie
            // ⚠ GEEN `key` hier. Dat was mijn eerste opzet — een oplopende sleutel om
            // het gevraagde blok ook de tweede keer te laten opengaan — maar dat
            // hermonteert het hele scherm, en dan is alles weg wat je net had
            // ingetikt: je rekeningnaam, je bedragen in de aanvinklijst. En dat kán
            // gebeuren, want de ➕ staat op élke pagina en zijn eerste stap wijst
            // hierheen. De component synchroniseert nu zelf op `naarBlokNr`.
            naarBlok={opstellingDoel.blok}
            naarBlokNr={opstellingDoel.nr}
            rekeningen={rekeningen}
            transacties={transacties ?? []}
            overboekingen={overboekingen}
            waarderingen={waarderingen}
            terugkerendePosten={terugkerendePosten}
            categorieen={categorieen}
            leningen={leningen}
            aflossingen={aflossingen}
            gezinsleden={kinderen}
            dossiers={dossiers}
            onRekening={slaRekeningOp}
            onLening={leningOpslaan}
            onVastePost={voegTerugkerendToe}
            onVastePostVerwijderen={verwijderTerugkerend}
            onKindToevoegen={voegKindToe}
            onKindWijzigen={wijzigKind}
            onKindVerwijderen={verwijderKindH}
            telGezinslidGebruik={gezinslidGebruik}
            onDossier={voegDossierToe}
            onNaarPagina={setPagina}
            onNaarBudget={gaNaarBudget}
            veilig={veiligInvoer}
          />
        </ErrorBoundary>
      )}

      {pagina === 'overzicht' && (
        <>
          {/* Geweigerde regels. Bewust een eigen, uitgeschreven melding: dit gaat
              over GELD dat anders honderd keer te klein op je scherm zou staan, en
              de gebruiker moet weten wat hij eraan kan doen.

              De tekst zegt niet dát die regels uit de euro-tijd komen — dat wéét de
              app niet, ze weet alleen dat het etiket ontbreekt. Ze zegt wat er aan
              de hand is en wat je eraan kan doen. */}
          {(verouderd > 0 || teNieuw > 0) && !formaatMeldingWeg && (
            <p
              className="kaart kaart-compact"
              style={{ background: 'var(--negative-soft)', borderColor: 'var(--negative)', color: 'var(--text)' }}
            >
              {teNieuw > 0
                ? t(
                    'Let op: {n} regel(s) komen van een toestel met een NIEUWERE versie van de app. Deze app kan ze nog niet lezen, dus ze zijn niet ingelezen. Werk deze app bij (sluit hem helemaal af en open hem opnieuw) en probeer het dan nog eens.',
                    { n: teNieuw },
                  )
                : t(
                    'Let op: van {n} regel(s) kan de app niet zien in welke eenheid de bedragen staan. Ze zijn daarom NIET ingelezen: als eenheid gelezen zou € 2.400 er als € 24 komen te staan. Er is niets van je huidige gegevens veranderd. Komen die regels van een ander toestel, werk de app daar dan ook bij.',
                    { n: verouderd },
                  )}
              <button
                type="button"
                className="knop knop-ghost knop-klein"
                style={{ marginLeft: 8 }}
                onClick={() => setFormaatMeldingWeg(true)}
              >
                {t('Verberg')}
              </button>
            </p>
          )}

          {ongeldig > 0 && (
            <p
              className="kaart kaart-compact"
              style={{ background: 'var(--negative-soft)', borderColor: 'var(--negative)', color: 'var(--text)' }}
            >
              {t('Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.', { n: ongeldig })}
            </p>
          )}

          {/* ⚠ RONDE 66. Acht van de vijftien pagina's droegen geen enkele zin die
              zei wát ze waren — en dit is het startscherm. `PaginaKop` kón die zin
              al dragen; ze werd alleen op zeven pagina's meegegeven. */}
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('Hoe je er deze maand voor staat: wat er binnenkwam, wat eraf ging, en wat er op je rekeningen staat.')}
            actie={maandNav}
          />

          {/* Een gloednieuwe (of net gewiste) app is helemaal leeg. Dan is één
              ding belangrijker dan alle cijfers: weten wat je eerst moet doen. */}
          {/* ⚠ `actieveRekeningen` en niet de kale lijst (ronde 66, slotronde). Wie al
              zijn rekeningen archiveert, heeft er geen enkele meer om op te boeken —
              maar kreeg dan géén welkomstkaart, terwijl de app verder wél overal zei
              dat er eerst een rekening moet zijn. */}
          {actieveRekeningen.length === 0 && <EersteStap onNaarRekeningen={() => gaNaarOpstelling('rekeningen')} />}

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
              {/* Doorklikken naar de boekingen erachter (ronde 48).

                  Waarom deze drie wél en het saldo hierboven NIET: `maandInkomsten`
                  en `maandUitgaven` tellen op regelniveau op, precies zoals de
                  kengetallen boven de transactielijst, dus je ziet daar exact het
                  getal terug waarop je klikte. Het totale saldo is de som over álle
                  rekeningen, en die som staat nergens op de Rekeningen-pagina — dan
                  klik je op een cijfer en kom je op een scherm waar het niet
                  voorkomt. */}
              <Kengetal
                label={t('Inkomsten')}
                doorklik={{
                  naar: () => gaNaarTransacties({ maand, richting: 'in' }),
                  naam: t('Inkomsten {bedrag} — bekijk de boekingen', { bedrag: formatEuro(inkomsten) }),
                }}
              >
                <Bedrag centen={inkomsten} richting="in" groot />
              </Kengetal>
              <Kengetal
                label={t('Uitgaven')}
                doorklik={{
                  naar: () => gaNaarTransacties({ maand, richting: 'uit' }),
                  naam: t('Uitgaven {bedrag} — bekijk de boekingen', { bedrag: formatEuro(uitgaven) }),
                }}
              >
                <Bedrag centen={uitgaven} richting="uit" groot />
              </Kengetal>
              <Kengetal
                label={t('Netto')}
                doorklik={{
                  naar: () => gaNaarTransacties({ maand }),
                  naam: t('Netto {bedrag} — bekijk alle boekingen van deze maand', {
                    bedrag: formatEuro(inkomsten - uitgaven),
                  }),
                }}
              >
                <Bedrag centen={inkomsten - uitgaven} richting="auto" groot />
              </Kengetal>
            </div>

            {/* Benoemen wat het netto-cijfer betekent, wat je na aftrek van je
                schulden waard bent,
                en hoelang je toekomt zonder inkomen. Allebei kaal: ze horen bij de
                cijfers hierboven en niet in een eigen kaartje. */}
            <BalansRegel inkomsten={inkomsten} uitgaven={uitgaven} kaal />
            <VermogenRegel bezit={totaalSaldo} leningen={leningen} aflossingen={aflossingen} kaal />
            <BufferRegel
              rekeningen={rekeningen}
              transacties={transacties}
              overboekingen={overboekingen}
              terugkerendePosten={terugkerendePosten}
              waarderingen={waarderingen}
              vandaagISO={vandaag()}
              kaal
            />

            {/* ⚠ RONDE 66. Hier stonden vier bedragen naast elkaar zonder dat ergens
                stond wat ze van elkaar onderscheidt — en twee ervan lijken sterk op
                elkaar. "Saldo" is een STAND (wat er nu op je rekeningen staat),
                "Netto" is een VERSCHIL over deze maand. De PDF van het
                periodeoverzicht legde dat verschil al uit; op het scherm nergens. */}
            <UitlegBlok titel={t('Wat betekenen deze vier cijfers?')}>
              <p>
                {t('Saldo is de stand van al je rekeningen samen, vandaag. Dat cijfer verandert niet mee met de maand die je bovenaan koos — het is wat er nú staat.')}
              </p>
              <p>
                {t('Inkomsten, Uitgaven en Netto gaan wél over de gekozen maand. Netto is inkomsten min uitgaven: wat je die maand overhield of tekortkwam. Tik op een van de drie om de boekingen erachter te zien.')}
              </p>
            </UitlegBlok>
          </Kaart>

          <ErrorBoundary naam="Overzicht">
            <div className="raster-hoofd">
              <div className="stapel">
                {/* Twee grote donuts. Geen lijst met alle categorieën eronder meer:
                    hang je met de muis over een schijf (of tik je erop), dan komt
                    haar naam, bedrag en aandeel in het GAT van de donut te staan.
                    Onder de grafiek staan enkel de drie grootste, met een knop naar
                    de Analyse-pagina voor het volledige verhaal. */}
                <div className="raster-twee">
                  {/* De kaart blijft staan, ook zonder cijfers. Verdween ze, dan zag
                      een nieuwe gebruiker niet eens DÁT er een uitgavengrafiek bestaat
                      — en dan lijkt de app op dag één simpeler dan ze is. */}
                  <Kaart titel={t('Uitgaven per categorie')} bijschrift={maandJaarLabel(maand)}>
                    {/* ⚠ RONDE 66. Deze zin NOEMDE twee handelingen maar bood er geen
                        enkele aan — je stond op je startscherm en moest zelf uitzoeken
                        waar die knoppen zaten. */}
                    {perCategorie.length === 0 ? (
                      <Leeg
                        /* ⚠ Eén knop, niet twee: de kaart "Recente boekingen" verderop
                           op ditzelfde scherm draagt al "Boeking toevoegen", en twee
                           knoppen met exact dezelfde naam op één pagina leest een
                           schermlezer twee keer voor zonder verschil. */
                        /* ⚠ En pas vanaf ÉÉN rekening (slotronde): de Inlezen-pagina
                           vraagt er zelf om, dus zonder rekening stuurde deze knop je
                           van het ene lege scherm naar het andere. De welkomstkaart
                           bovenaan ditzelfde scherm wijst dan al de juiste kant op. */
                        actie={
                          actieveRekeningen.length > 0 ? (
                            <EersteStapKnop onClick={() => kiesPagina('importeren')}>
                              {t('Uittreksel inlezen')}
                            </EersteStapKnop>
                          ) : undefined
                        }
                      >
                        {t('Nog niets geboekt deze maand.')}
                      </Leeg>
                    ) : (
                      <>
                        <Donut
                          items={donutItems(perCategorie)}
                          interactief
                          toonLegende={false}
                          grootte={240}
                          onKies={(seg) => gaNaarCategorie(seg.sleutel ?? '', { maand, richting: 'uit' })}
                        />
                        <TopDrie
                          posten={perCategorie}
                          onAlles={() => gaNaarAnalyse('uitgave')}
                          onKies={(sleutel) => gaNaarCategorie(sleutel, { maand, richting: 'uit' })}
                        />
                      </>
                    )}
                  </Kaart>

                  <Kaart titel={t('Inkomsten per categorie')} bijschrift={maandJaarLabel(maand)}>
                    {perInkomsten.length === 0 ? (
                      <Leeg>{t('Nog geen inkomsten deze maand.')}</Leeg>
                    ) : (
                      <>
                        <Donut
                          items={donutItems(perInkomsten)}
                          middenLabel="inkomsten"
                          interactief
                          toonLegende={false}
                          grootte={240}
                          onKies={(seg) => gaNaarCategorie(seg.sleutel ?? '', { maand, richting: 'in' })}
                        />
                        <TopDrie
                          posten={perInkomsten}
                          richting="inkomst"
                          onAlles={() => gaNaarAnalyse('inkomst')}
                          onKies={(sleutel) => gaNaarCategorie(sleutel, { maand, richting: 'in' })}
                        />
                      </>
                    )}
                  </Kaart>
                </div>

              </div>

              {/* Enkel op desktop: de ruimte rechts vullen met dingen waarvoor je
                  anders naar een andere pagina moet. */}
              {isDesktop && (
                <OverzichtZijkolom
                  transacties={transacties}
                  budgetten={budgetten}
                  maand={maand}
                  categorieNaam={categorieNaam}
                  // Naar de BUDGETTEN zelf (ronde 64), niet naar het eerste tabblad:
                  // de knop staat in de kaart "Budgetstatus" en belooft "alle
                  // budgetten", niet "de pagina waar budgetten ergens op staan".
                  onGaNaarBudget={() => gaNaarBudget('budgetten')}
                  onKies={(categorieId) => gaNaarCategorie(categorieId, { maand })}
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
                onAlle={() => kiesPagina('transacties')}
                onBewerk={setBewerkTransactie}
                onNieuw={nieuweTransactie}
              />

              <Kaart
                titel={t('Inkomsten en uitgaven per maand')}
                // Het tijdvak staat er letterlijk bij. "De laatste zes maanden"
                // klopte niet meer zodra je bovenaan terugbladerde: de grafiek
                // schoof wél mee, het bijschrift niet.
                bijschrift={t('{van} t.e.m. {tot}, met je gemiddelde als lijn.', {
                  van: maandJaarLabel(`${maandPaar[0]?.maand ?? maand}-01`),
                  tot: maandJaarLabel(`${maandPaar[maandPaar.length - 1]?.maand ?? maand}-01`),
                })}
              >
                <MaandGrafiek
                  data={maandPaar}
                  lopendeMaand={huidigeMaand()}
                  onKiesMaand={(m) => gaNaarTransacties({ maand: m })}
                />
              </Kaart>

              {/* Ronde 72. De grafiek hierboven kijkt zes maanden TERUG; deze twaalf
                  maanden VOORUIT. Ze horen naast elkaar: eerst wat er gebeurd is,
                  dan wat eraan komt. Op een lege app tekent de widget zichzelf niet. */}
              <ToekomstlastenWidget
                terugkerendePosten={terugkerendePosten}
                beginMaand={huidigeMaand()}
                onNaarVooruitblik={() => {
                  gaNaarAnalyseTab('vooruit')
                  brengToekomstInBeeld()
                }}
              />

              {/* Onderaan, bewust: je exporteert een maand nadat je ze bekeken hebt,
                  niet ervoor. De kaart volgt de maandschakelaar bovenaan. */}
              <RapportKaart
                maand={maand}
                transacties={transacties}
                categorieen={categorieen}
                rekeningen={rekeningen}
                overboekingen={overboekingen}
                waarderingen={waarderingen}
              />
            </div>
          </ErrorBoundary>
        </>
      )}

      {pagina === 'transacties' && (
        <>
          {/* De weg naar het importscherm hoort HIER te beginnen: dit is de pagina
              waar je staat wanneer je denkt "moet ik dit nu allemaal intikken?".
              In de 'Meer'-lade zoeken doet niemand. */}
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('Je uitgaven en inkomsten van de laatste maanden, nieuwste eerst. Zoek, filter, of tik er een aan om ze te wijzigen; oudere haal je onderaan erbij.')}
            // ⚠ Pas vanaf één rekening (ronde 66, slotronde): de Inlezen-pagina vraagt
            // er zelf om, dus zonder rekening stuurde deze knop je van het ene lege
            // scherm naar het andere. Dezelfde afscherming als op het Overzicht.
            actie={
              actieveRekeningen.length > 0 ? (
                <button type="button" className="knop knop-secundair knop-klein" onClick={() => kiesPagina('importeren')}>
                  {t('Uittreksel inlezen')}
                </button>
              ) : undefined
            }
          />

          {/* Deze pagina is nu puur overzicht. Het invoerformulier stond hier in een
              kolom naast de lijst en nam op een telefoon het hele eerste beeld in,
              zodat je je eigen transacties niet zag zonder te scrollen. Toevoegen
              gaat via de popup (de ➕), bewerken via het potloodje in de lijst — in
              dezelfde popup, zodat er één vorm is om een boeking in te vullen. */}
          <ErrorBoundary naam="Boekingen">
            <TransactieLijst
              // Elke doorklik krijgt een nieuwe sleutel, zodat de lijst het nieuwe
              // beginfilter écht overneemt in plaats van bij het eerste te blijven.
              key={`tx-${txFilter?.nr ?? 0}`}
              transacties={transacties}
              categorieen={categorieen}
              rekeningen={rekeningen}
              gedeeldeKosten={gedeeldeKosten}
              garanties={garanties}
              gezinsleden={kinderen}
              beginFilter={txFilter?.filter}
              onBewerk={setBewerkTransactie}
              onVerwijder={verwijder}
              onVerwijderMeerdere={verwijderMeerdere}
              onGaNaarDossier={(dossierId) => gaNaarMelding('dossiers', 'coouderschap', dossierId)}
              onGaNaarGarantie={() => gaNaarMelding('dossiers', 'garantie')}
              onNieuw={nieuweTransactie}
            />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'analyse' && (
        <>
          <ErrorBoundary naam="Analyse">
            <AnalyseSectie
              beginRichting={analyseRichting}
              beginTab={analyseTab}
              onTabWissel={(tb) => {
                setAnalyseTab(tb)
                // VERVANGEN: terug hoort je een pagina terug te brengen, niet door
                // drie tabbladen te laten lopen die je net even aanklikte.
                zetRoute({ pagina: 'analyse', analyse: tb }, true)
              }}
              ankerMaand={maand}
              // De maandschakelaar staat sinds ronde 40 ook op deze pagina. De
              // periodekaartjes ankeren erop; zonder de schakelaar zou de Analyse
              // de keuze wel volgen maar kon je ze hier niet wijzigen.
              maandNav={maandNav}
              onGaNaarTransacties={gaNaarTransacties}
              onNaarOpstelling={() => gaNaarOpstelling('rekeningen')}
              // ⚠ ZONDER REKENING GEEN KNOP. Het tabblad "Vast" is dan zelf op slot,
              // dus die kant op sturen is een doodloper. Maar de knop dán stilletjes
              // naar de rekeningen laten wijzen is óók fout: er staat "Vul je vaste
              // lasten in" op, en dat is niet waar je uitkomt. In diezelfde kolom staat
              // op dat moment al "Maak een rekening aan" (Vermogensevolutie), die het
              // wél eerlijk zegt.
              onNaarVasteLasten={actieveRekeningen.length === 0 ? undefined : () => gaNaarBudget('vast')}
              onNaarBoekingen={nieuweTransactie}
              onBewerkTransactie={setBewerkTransactie}
              onBoekVasteLast={boekVasteLastPerIdInMaand}
              gezinsleden={kinderen} transacties={transacties} categorieen={categorieen} rekeningen={rekeningen} overboekingen={overboekingen}
                waarderingen={waarderingen} terugkerendePosten={terugkerendePosten} />
          </ErrorBoundary>
        </>
      )}

      {pagina === 'budget' && (
        <>
          {/* ⚠ RONDE 64 — deze pagina droeg DRIE TAKEN in één scroll.
              Timothy, na echt gebruik: "ik begrijp niet goed hoe het tabblad Budget
              in elkaar zit; alles staat wat bij elkaar, weinig uitleg erbij hoe alles
              werkt en wat er verwacht wordt." Er stonden vijf kaarten onder elkaar —
              het plan, je vaste inkomsten, je budgetten, je vaste lasten, en helemaal
              onderaan het formulier om een budget in te stellen — zonder één regel die
              zei waarvoor de pagina dient. Nu stelt elk tabblad één vraag, staat elk
              formulier bij zijn eigen lijst, en legt een uitklapblok per tabblad uit
              hoe het samenhangt. Zie `utils/budgettab.ts`. */}
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('Je plan voor deze maand: wat er binnenkomt, wat vastligt, en waar je zelf een grens op zet.')}
            actie={maandNav}
          />

          <Subtabs
            naam="budget"
            label={t('Onderdeel van je budget')}
            actief={budgetTab}
            onKies={kiesBudgetTab}
            tabs={[
              { id: 'plan' as BudgetTab, teken: '💶', label: t('Te verdelen') },
              {
                id: 'vast' as BudgetTab,
                teken: '🏠',
                label: t('Vast'),
                // ⚠ Zonder de opgezegde posten (nakijkronde ronde 64): de teller
                // op "Budgetten" volgt de maandschakelaar, dus deze hoort dat ook te
                // doen. Anders staan er twee tellingen naast elkaar met twee regels.
                telling: terugkerendePosten.filter((p) => !isGestopt(p, maand)).length,
              },
              { id: 'budgetten' as BudgetTab, teken: '🎯', label: t('Budgetten'), telling: geldendNu.length },
            ]}
          >
            {budgetTab === 'plan' && (
              <div className="stapel">
                <UitlegBlok titel={t('Wat blijft er over? — zo werkt dit')}>
                  <p>
                    {t('Kompal telt op wat er deze maand al binnenkwam plus je vaste inkomsten die nog moeten komen, trekt daar je vaste lasten van af en ook wat je maandelijks opzijzet, en wat overblijft is wat je vrij te verdelen hebt.')}
                  </p>
                  <p>
                    {t('Klopt dit cijfer niet? Kijk dan bij "Vast" of je loon en al je vaste lasten erin staan. Deze tab rekent alleen; invullen doe je daar.')}
                  </p>
                </UitlegBlok>

                {/* ⚠ Zonder dit is dit tabblad op een verse app helemaal leeg
                    (nakijkronde ronde 64): `PlanRegels` toont niets zolang er geen
                    inkomsten en geen vaste lasten zijn, en dan is het standaardtabblad
                    van de pagina die begrijpelijker moest worden precies dát niet. */}
                {terugkerendePosten.length === 0 && (
                  <Kaart titel={t('Nog niets om te verdelen')}>
                    {/* ⚠ RONDE 66, slotronde — DE BESTEMMING HANGT AF VAN WAT JE HEBT.
                        De knop wees altijd naar "Vast", maar zonder rekening is dat
                        tabblad zelf op slot: het zegt daar "Maak eerst een rekening
                        aan" en stuurt je terug hierheen. Een rondje, en dan nog met de
                        opvallendste knop van het scherm. */}
                    <p className="rij-meta" style={{ margin: 0 }}>
                      {actieveRekeningen.length === 0
                        ? t('Deze tab rekent uit wat er overblijft van je inkomen. Daarvoor moet ze weten wat er binnenkomt en wat er elke maand vastligt — en dat moet ergens vanaf gaan. Begin dus bij een rekening.')
                        : t('Deze tab rekent uit wat er overblijft van je inkomen. Daarvoor moet ze weten wat er binnenkomt en wat er elke maand vastligt — dat vul je in bij "Vast".')}
                    </p>
                    <div className="knoprij">
                      {actieveRekeningen.length === 0 ? (
                        <button
                          type="button"
                          className="knop knop-primair"
                          onClick={() => gaNaarOpstelling('rekeningen')}
                        >
                          {t('Maak een rekening aan')}
                        </button>
                      ) : (
                        <button type="button" className="knop knop-primair" onClick={() => kiesBudgetTab('vast')}>
                          {t('Naar je vaste inkomsten en lasten')}
                        </button>
                      )}
                    </div>
                  </Kaart>
                )}

                <ErrorBoundary naam="Te verdelen">
                  <PlanRegels
                    posten={terugkerendePosten}
                    budgetten={budgetten}
                    maand={maand}
                    verwachteInkomsten={planBlik.verwachteInkomsten}
                    geboekteInkomsten={planBlik.geboekt.inkomsten}
                    onGaNaarTransacties={gaNaarTransacties}
                    onNaarVast={() => kiesBudgetTab('vast')}
                  />
                </ErrorBoundary>
              </div>
            )}

            {budgetTab === 'vast' && (
              <div className="stapel">
                <UitlegBlok titel={t('Wat ligt vast? — zo werkt dit')}>
                  <p>
                    {t('Hier zet je alles wat elke maand terugkomt: je loon, je huur, je abonnementen. Je geeft het één keer in, en Kompal weet er daarna elke maand van.')}
                  </p>
                  <p>
                    {t('Zo’n vaste last is nog geen boeking. Betaal je hem, dan tik je die betaling gewoon in zoals elke andere uitgave — herkent Kompal ze als deze vaste last, dan vraagt ze of die betaling erbij hoort. Of je drukt hier op "Boek in" en dan maakt ze de boeking voor je.')}
                  </p>
                  <p>
                    {t('Pas als er een boeking is, telt het bedrag mee in je budgetten en in de analyse.')}
                  </p>
                </UitlegBlok>

                {/* ⚠ RONDE 66, slotronde — ÉÉN eerste stap, niet twee. Zonder rekening
                    kunnen allebei de blokken hieronder niets: een vaste last of inkomst
                    moet ergens vanaf gaan of op binnenkomen. Liet je ze allebei staan,
                    dan kreeg je twee keer dezelfde lege toestand met twee knoppen die
                    exact hetzelfde heten — voor een schermlezer niet uit elkaar te
                    houden — en een potloodje bij een bestaande post dat een formulier
                    opende dat er niet was. */}
                {actieveRekeningen.length === 0 && (
                  <Kaart titel={t('Eerst een rekening')}>
                    <Leeg
                      actie={
                        <EersteStapKnop onClick={() => gaNaarOpstelling('rekeningen')}>
                          {t('Maak een rekening aan')}
                        </EersteStapKnop>
                      }
                    >
                      {t('Maak eerst een rekening aan — een vaste kost of inkomst moet ergens vanaf gaan of op binnenkomen.')}
                    </Leeg>
                  </Kaart>
                )}

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
                    onLosmaken={ontkoppelBoeking}
                  />
                </ErrorBoundary>
              </div>
            )}

            {budgetTab === 'budgetten' && (
              <div className="raster-lijst-formulier">
                <div className="kolom-lijst stapel">
                  <UitlegBlok titel={t('Wat wil je beperken? — zo werkt dit')}>
                    <p>
                      {t('Een budget is een grens die je zelf op een categorie zet: "aan Voeding wil ik deze maand niet meer dan € 400 uitgeven". Kompal telt er alle boekingen van die categorie in deze maand bij op en laat de balk meelopen.')}
                    </p>
                    <p>
                      {t('Zet je een budget op een hoofdcategorie, dan telt alles eronder mee. Zet je het op één subcategorie, dan telt alleen die.')}
                    </p>
                    <p>
                      {t('Een vaste last verbruikt je budget zodra ze geboekt is — precies zoals elke andere uitgave in die categorie.')}
                    </p>
                  </UitlegBlok>

                  <ErrorBoundary naam="Budgetten">
                    {/* ⚠ GEEN titel: het tabblad hierboven heet al "Budgetten", en dan
                        stond dat woord twee keer onder elkaar. Het bijschrift blijft wél —
                        die zegt over wélke maand deze lijst gaat. */}
                    <Kaart bijschrift={t('voor {maand}', { maand: maandJaarLabel(maand) })}>
                      {/* ⚠ Op de HELE lijst kijken en niet alleen op deze maand (nakijkronde
                          ronde 62). Had je enkel een budget voor januari en keek je naar
                          augustus, dan zei de kaart "Nog geen budgetten ingesteld" met daaronder
                          een knop naar januari — twee zinnen die elkaar tegenspreken. */}
                      {/* ⚠ Hier stond een knop "Zet je eerste budget" die naar DEZE tab wees —
                dus naar het scherm waar je al stond. Precies wat `Leeg` in dezelfde
                ronde verbiedt: een knop die nergens heen gaat is erger dan geen knop.
                Het formulier staat al op deze pagina; de zin wijst er nu naar. */}
            {budgetten.length === 0 && (
              <Leeg>{t('Nog geen budgetten ingesteld. Met het formulier op deze pagina zet je een grens op een categorie.')}</Leeg>
            )}
                      {budgetten.length > 0 && geldendNu.length === 0 && (
                        <Leeg>{t('Voor deze maand staat er geen budget. Je budgetten gelden voor een andere maand.')}</Leeg>
                      )}
                      {geldendNu.length > 0 && (
                        <p className="rij-meta" style={{ margin: 0 }}>
                          {t('Een terugbetaling in dezelfde categorie verlaagt het verbruik. Daardoor kan dit cijfer lager liggen dan de uitgaven in de Analyse.')}
                        </p>
                      )}
                      {/* ⚠ RONDE 68, tweede doorlichting — het kruisje bij een budget
                          ving zijn mislukking wél op maar toonde ze nergens. Dat was
                          slechter dan vóór deze ronde: toen belandde ze tenminste nog
                          als onafgevangen fout in de crashrapportage. */}
                      <Opslagfout
                        fout={budgetOpslag.fout}
                        zin={t('Verwijderen is niet gelukt. Er is niets weggehaald.')}
                      />
                      {geldendNu.length > 0 && (
                        <ul className="lijst">
                          {geldendNu.map((b) => {
                            const naam = categorieNaam(b.categorieId) ?? '—'
                            const uitgegeven = uitgavenInMaand(transacties, b.categorieId, maand)
                            const fractie = Math.min(uitgegeven / b.bedrag, 1)
                            // De drempel die de gebruiker zelf koos, niet een vast getal:
                            // stond die op 95 %, dan kleurde de balk toch al oranje bij 80 %.
                            const kleur = budgetKleur(uitgegeven, b.bedrag, budgetDrempel)
                            return (
                              <li key={b.id} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                  {/* De naam is sinds ronde 40 een knop: een budgetregel
                                      zegt "€ 212 van € 300 verbruikt" en daar bleef het
                                      bij — welke boekingen die € 212 vormen zag je nergens. */}
                                  <button
                                    type="button"
                                    className="rij-titel tekstknop"
                                    aria-label={t('Bekijk de boekingen van {naam} — {bedrag}', {
                                      naam,
                                      bedrag: formatEuro(uitgegeven),
                                    })}
                                    onClick={() => gaNaarCategorie(b.categorieId, { maand })}
                                  >
                                    {naam}
                                  </button>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="bedrag" style={{ color: 'var(--text-muted)' }}>
                                      {formatEuro(uitgegeven)} / {formatEuro(b.bedrag)}
                                    </span>
                                    <button
                                      className="knop knop-kaal knop-gevaar"
                                      aria-label={
                                        b.maand === undefined
                                          ? t('Verwijder budget {naam}', { naam })
                                          : t('Verwijder het budget van {naam} voor {maand}', { naam, maand: maandJaarLabel(maand) })
                                      }
                                      onClick={() => void budgetOpslag.probeer(() => verwijderBud(b.id))}
                                    >
                                      ×
                                    </button>
                                  </span>
                                </div>
                                {/* ⚠ Een uitzondering ziet er anders uit dan je standaard (ronde 62).
                                    Zonder deze regel zou je in december een ander bedrag zien staan
                                    dan in november, zonder één aanwijzing waarom — en zou je denken
                                    dat je standaardbudget veranderd is. Er staat ook bij wát je
                                    standaard is, zodat het kruisje ernaast geen sprong in het
                                    duister is. */}
                                {b.maand !== undefined && (
                                  <span className="rij-meta">
                                    {standaardBedrag(b.categorieId) === undefined
                                      ? t('Alleen voor {maand} — je hebt hier geen vast budget voor.', { maand: maandJaarLabel(maand) })
                                      : t('Alleen voor {maand} — normaal is dit {bedrag}.', {
                                          maand: maandJaarLabel(maand),
                                          bedrag: formatEuro(standaardBedrag(b.categorieId) as number),
                                        })}
                                  </span>
                                )}
                                <Balk label={naam} fractie={fractie} kleur={kleur} nu={uitgegeven} max={b.bedrag} />
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      {/* ⚠ Een budget voor september zie je in augustus nergens — en dat hoort
                          ook zo, want je augustuslijst gaat over augustus. Maar dan weet je ook
                          niet meer dát je het gezet hebt. Deze regel zegt het, met een knop om
                          erheen te bladeren (ronde 62). */}
                      {andereBudgetmaanden.length > 0 && (
                        <p className="rij-meta" style={{ margin: 0 }}>
                          {t('Je hebt ook een apart budget voor:')}{' '}
                          {andereBudgetmaanden.map((m) => (
                            <button
                              key={m}
                              type="button"
                              className="knop knop-ghost knop-klein"
                              onClick={() => setMaand(m)}
                            >
                              {maandJaarLabel(m)}
                            </button>
                          ))}
                        </p>
                      )}
                    </Kaart>
                  </ErrorBoundary>
                </div>

                <div className="kolom-formulier">
                  {/* Het formulier biedt zelf alle ingebouwde hoofdcategorieën aan, dus het
                      hoort er ook te staan als je nog geen eigen categorie hebt gemaakt. */}
                  <ErrorBoundary naam="Budget instellen">
                    <Kaart titel={t('Budget instellen')}>
                      <BudgetFormulier
                        categorieen={categorieen}
                        budgetten={budgetten}
                        maand={maand}
                        maandLabel={maandJaarLabel(maand)}
                        onOpslaan={voegBudgetToe}
                      />
                    </Kaart>
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </Subtabs>
        </>
      )}

      {pagina === 'dossiers' && (
        <>
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('Wat je met iemand anders moet afrekenen of over tijd moet opvolgen: gedeelde kosten, leningen, en facturen met hun garantiebewijs.')}
          />

          {/* ⚠ RONDE 66. De drie zinnen die uitleggen wát een dossier, een lening en
              een garantie zijn, stonden ALLEEN in de wegwijzerkaart hieronder — en
              die verdwijnt zodra je er één hebt. Dat was de enige plek in de hele
              module waar het uitgelegd werd, dus wie een dossier maakte, kon het
              daarna nergens meer nalezen. Nu staan ze in een blok dat blijft. */}
          <UitlegBlok titel={t('Wat kan je hier bijhouden?')}>
            <p>
              {t('Gedeelde kosten — kosten verdelen met een co-ouder of ex-partner. Je legt één keer vast wie welk deel betaalt, geeft de kosten in, en de app rekent uit wie wie wat verschuldigd is. Van een afrekening maakt ze een PDF met de opbouw erbij.')}
            </p>
            <p>
              {t('Lening of krediet — geld dat jij uitleende of zelf leende. De app houdt bij hoeveel er nog openstaat en wat er al terugbetaald is.')}
            </p>
            <p>
              {t('Facturen & garantiebewijzen — een aankoop met bon of factuur. De app bewaakt de garantieperiode en waarschuwt je vóór ze afloopt.')}
            </p>
          </UitlegBlok>

          {/* De wegwijzer alleen zolang je nog helemaal niets hebt. Zodra er één
              dossier, lening of aankoop bestaat, doen de subtabs hieronder dat
              werk en zou de kaart bij elk bezoek ruimte innemen zonder iets te
              zeggen. Klik je hier een soort aan, dan opent die subtab — vroeger
              gebeurde er bij 'Gedeelde kosten' letterlijk niets. */}
          {dossiers.length === 0 && leningen.length === 0 && garanties.length === 0 && (
            <NieuwDossierKiezer
              // ⚠ RONDE 66, slotronde: óók de tab in beeld brengen. `dossierTab` begint
              // op 'coouderschap', dus de knop "Gedeelde kosten" zette de stand op iets
              // wat al gold — er gebeurde zichtbaar niets, en het formulier staat op een
              // telefoon onder de vouw. Dezelfde oplossing als `naarBlok()` in
              // OpstellingSectie: schuiven en de focus verzetten.
              onKies={(soort) => {
                setGekozenDossierId(null)
                setDossierTab(soort)
                setTimeout(() => {
                  const tab = document.getElementById(`dossiers-tab-${soort}`)
                  if (!(tab instanceof HTMLElement) || !tab.isConnected) return
                  if (typeof tab.scrollIntoView === 'function') {
                    const rustig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
                    tab.scrollIntoView({ block: 'start', behavior: rustig ? 'auto' : 'smooth' })
                  }
                  tab.focus()
                }, 0)
              }}
            />
          )}

          <Subtabs
            naam="dossiers"
            label={t('Soort dossier')}
            actief={dossierTab}
            // Zelf van lade wisselen wist het dossier dat via de badge "gedeeld"
            // gekozen werd. Zonder dat sprong je na een omweg langs de leningen
            // stil terug naar dát dossier in plaats van naar je eigen keuze.
            onKies={(soort) => {
              setGekozenDossierId(null)
              setDossierTab(soort)
              // VERVANGEN en niet toevoegen: terug hoort je een pagina terug te
              // brengen, niet door drie lades te laten lopen die je net even
              // opengeklikt hebt.
              zetRoute({ pagina: 'dossiers', subtab: soort }, true)
            }}
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
                  onderhoudsbijdragen={onderhoudsbijdragen}
                  onderhoudsbetalingen={onderhoudsbetalingen}
                  onOnderhoudsbijdrageOpslaan={onderhoudsbijdrageOpslaan}
                  onOnderhoudsbijdrageVerwijderen={onderhoudsbijdrageVerwijderen}
                  onOnderhoudsbetalingOpslaan={onderhoudsbetalingOpslaan}
                  onOnderhoudsbetalingVerwijderen={onderhoudsbetalingVerwijderen}
                  onDossierOpslaan={voegDossierToe}
                  onDossierVerwijderen={verwijderDoss}
                  onKostOpslaan={voegGedeeldeKostToe}
                  onKostenBewaren={bewaarKostenBlok}
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
                  beginDossierId={gekozenDossierId}
                />
              </ErrorBoundary>
            )}

            {dossierTab === 'lening' && (
              <ErrorBoundary naam="Leningen">
                <LeningSectie
                  gezinsleden={kinderen}
                  leningen={leningen}
                  aflossingen={aflossingen}
                transacties={transacties ?? []}
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
              <ErrorBoundary naam="Facturen & garantiebewijzen">
                <GarantieSectie
                  gezinsleden={kinderen}
                  garanties={garanties}
                  transacties={transacties}
                  onOpslaan={garantieOpslaan}
                  onVerwijderen={garantieVerwijderen}
                  documenten={dossierdocumenten}
                  onDocumentOpslaan={dossierDocumentOpslaan}
                  onDocumentVerwijderen={dossierDocumentVerwijderen}
                  onBewerkTransactie={setBewerkTransactie}
                />
              </ErrorBoundary>
            )}
          </Subtabs>
        </>
      )}

      {pagina === 'rekeningen' && (
        <>
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('Waar je geld staat: je betaal- en spaarrekeningen, je cash, je kredietkaarten en je beleggingen. Tik een rekening aan om te zien wat erop gebeurde.')}
          />

          <div className="raster-lijst-formulier">
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
            {rekeningen.length === 0 && (
              <Leeg
                actie={
                  <EersteStapKnop onClick={() => gaNaarOpstelling('rekeningen')}>{t('Naar "Je situatie"')}</EersteStapKnop>
                }
              >
                {t('Nog geen rekeningen. Vul het formulier in, of begin bij je situatie.')}
              </Leeg>
            )}
            {rekeningen.length > 0 && (
              <ul className="lijst">
                {rekeningen.map((r) => {
                  const meta = [t(REKENING_TYPE_LABEL[r.type ?? 'betaal']), r.rubriek, r.rekeningnummer].filter(Boolean).join(' · ')
                  // Het saldo van vandaag: beginsaldo + transacties + overboekingen.
                  const saldoNu = saldoVanRekening(r, transacties, overboekingen, waarderingen, vandaag())
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
                          {/* Bij een kaart is het startbedrag een SCHULD; positief
                              tonen onder "openstaand" scheelt een tekenpuzzel. */}
                          {r.type === 'krediet'
                            ? r.beginsaldo > 0
                              ? t('bij de start {saldo} tegoed', { saldo: formatEuro(r.beginsaldo) })
                              : t('bij de start {saldo} open', {
                                  saldo: formatEuro(kaartbedragUitOpslag(r.beginsaldo)),
                                })
                            : t('startsaldo {saldo}', { saldo: formatEuro(r.beginsaldo) })}
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
              waarderingen={waarderingen}
              bewerken={bewerkOverboeking}
              onOpslaan={voegOverboekingToe}
              onVerwijderen={verwijderOverboekingH}
              onBewerk={setBewerkOverboeking}
              onStopBewerken={() => setBewerkOverboeking(null)}
              onNieuweRekening={() => {
                setGekozenRekeningId(null)
                setBewerkRekening(null)
              }}
            />
          </ErrorBoundary>
          </div>

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
                waarderingen={waarderingen}
                categorieen={categorieen}
                rekeningNaam={(id) => rekeningen.find((r) => r.id === id)?.naam}
                onBewerk={setBewerkRekening}
                onArchiveer={archiveerRekening}
                onVerwijder={verwijderRek}
                onWaardering={voegWaarderingToe}
                onWaarderingVerwijderen={verwijderWaarderingH}
                rekeningen={rekeningen}
                onOverboeking={voegOverboekingToe}
                onGaNaarTransacties={gaNaarTransacties}
                onBewerkTransactie={setBewerkTransactie}
              />
            )}
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
              waarderingen={waarderingen}
              onOpslaan={voegSpaardoelToe}
              onVerwijderen={verwijderSpaardoelH}
            />
          </ErrorBoundary>
      )}

      {pagina === 'categorieen' && (
        <>
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('De indeling waarmee de app je uitgaven groepeert. Ze is al ingevuld; je kan overal iets eigens bij zetten of hernoemen.')}
          />

          {/* ⚠ RONDE 66. De boom heeft drie lagen, en die droegen vier namen door
              elkaar: de bovenste laag heette op deze pagina "categorie" en elders
              "hoofdcategorie", de onderste "subcategorie" in de knop maar "items" in
              het cijfer erboven. De namen staan nu overal gelijk, en dit blok zegt
              één keer welke drie het zijn — met een voorbeeld, want een voorbeeld
              legt een boom sneller uit dan een definitie. */}
          <UitlegBlok titel={t('Hoe deze indeling in elkaar zit')}>
            <p>{t('Er zijn drie lagen, van breed naar smal:')}</p>
            <ul>
              <li>{t('Een hoofdcategorie is een groot gebied van je leven: Voeding, of Woning en vaste lasten.')}</li>
              <li>{t('Een categorie is een stuk daarvan: onder Voeding bijvoorbeeld Broodwaren.')}</li>
              <li>{t('Een subcategorie is één ding dat je koopt: onder Broodwaren bijvoorbeeld Stokbrood.')}</li>
            </ul>
            <p>
              {t('Je hoeft niets van dit alles zelf te maken — de app brengt de hele indeling al mee. Vind je iets niet terug, dan zet je het er op de juiste plek bij; hernoemen mag ook, en dat kan je altijd terugdraaien.')}
            </p>
          </UitlegBlok>

          <div className="raster-lijst-formulier">
          <div className="kolom-lijst stapel">
          <Kaart>
            {categorieen.length === 0 && (
              <Leeg>{t('Je hebt nog geen eigen hoofdcategorieën. De ingebouwde boom staat hieronder — daar kan je op elk niveau iets toevoegen.')}</Leeg>
            )}
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
                      {/* ⚠ RONDE 66. "categorie" — maar dit is de BOVENSTE laag, die
                          overal elders "hoofdcategorie" heet, en de knop met exact
                          dezelfde tekst in de boom hieronder werkt op de MIDDENlaag.
                          Twee knoppen, twee lagen, één naam. */}
                      <button className="knop knop-kaal" aria-label={t('Bewerk hoofdcategorie {naam}', { naam: c.naam })} onClick={() => setBewerkCategorie(c)}>
                        ✎
                      </button>
                      <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder hoofdcategorie {naam}', { naam: c.naam })} onClick={() => verwijderCat(c.id)}>
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
              // ⚠ De belofte DOORGEVEN en niet met `void` weggooien: de boom wacht
              // erop en houdt je ingetikte woord vast wanneer het wegschrijven
              // mislukt (ronde 68).
              onToevoegen={(categorieId, naam) =>
                voegSubcategorieToe({ subnaam: naam, categorie: { id: categorieId } }).then(() => undefined)
              }
              onWijzigen={wijzigSubcategorie}
              onVerwijderen={verwijderSubcategorieH}
              onCategorieToevoegen={voegCategorieOnderToe}
              onCategorieVerwijderen={verwijderCat}
              onVerplaats={verplaatsHoofdcategorie}
            />
          </ErrorBoundary>
          </div>

          <div className="kolom-formulier stapel">
            <Kaart titel={bewerkCategorie ? t('Hoofdcategorie bewerken') : t('Nieuwe hoofdcategorie')}>
              <CategorieFormulier onOpslaan={slaCategorieOp} onAnnuleer={() => setBewerkCategorie(null)} bewerken={bewerkCategorie} />
            </Kaart>
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
              onVerbind={verbindEnSynchroniseer}
              onSynchroniseer={synchroniseerNu}
              backupTekst={backupTekst}
              onExporteer={exporteerNu}
              onHerstel={herstelUitBestand}
              kinderen={kinderen}
              onKindToevoegen={voegKindToe}
              onKindWijzigen={wijzigKind}
              onKindVerwijderen={verwijderKindH}
              telGezinslidGebruik={gezinslidGebruik}
              onBeginOpnieuw={beginOpnieuw}
              backupIsFout={backupIsFout}
              laatsteBackupOp={backupMoment.laatsteBackupOp}
              laatsteSyncOp={backupMoment.laatsteSyncOp}
              opslag={opslag}
            />
          </ErrorBoundary>

        </>
      )}

      {pagina === 'rekenhulpen' && (
        <ErrorBoundary naam="Rekenhulpen">
          <RekenhulpenSectie
            dossiers={dossiers}
            onderhoudsbijdragen={onderhoudsbijdragen}
            onBewaarBijdrage={onderhoudsbijdrageOpslaan}
            onNaarDossiers={() => kiesPagina('dossiers')}
          />
        </ErrorBoundary>
      )}

      {pagina === 'maandafsluiting' && (
        <ErrorBoundary naam="Maandafsluiting">
          <MaandafsluitingSectie
            transacties={transacties ?? []}
            categorieen={categorieen}
            budgetten={budgetten}
            terugkerendePosten={terugkerendePosten}
            afsluitingen={maandafsluitingen}
            handelaarIndex={handelaarIndex}
            onCategoriseer={geefCategorie}
            onAfsluiten={maandAfsluiten}
            onHeropen={maandHeropenen}
            onGaNaarInlezen={() => kiesPagina('importeren')}
            heeftRekening={actieveRekeningen.length > 0}
            onNaarRekeningen={() => gaNaarOpstelling('rekeningen')}
            onToonBoekingen={(maand) => gaNaarTransacties({ maand })}
            onToonZonderCategorie={(maand) => gaNaarTransacties({ maand, zonderCategorie: true })}
          />
        </ErrorBoundary>
      )}

      {pagina === 'fiscaal' && (
        <ErrorBoundary naam="Fiscaal jaaroverzicht">
          <FiscaalSectie
            transacties={transacties ?? []}
            onderhoudsbijdragen={onderhoudsbijdragen}
            onderhoudsbetalingen={onderhoudsbetalingen}
            documenten={dossierdocumenten}
            onBewerkTransactie={setBewerkTransactie}
            onNaarBoekingen={nieuweTransactie}
          />
        </ErrorBoundary>
      )}

      {pagina === 'kindkosten' && (
        <ErrorBoundary naam="Wat kost elk gezinslid?">
          <KindkostenSectie
            transacties={transacties ?? []}
            gedeeldeKosten={gedeeldeKosten}
            dossiers={dossiers}
            gezinsleden={kinderen}
            onGaNaarTransacties={gaNaarTransacties}
            onNaarGezinsleden={() => gaNaarOpstelling('gezin')}
          />
        </ErrorBoundary>
      )}

      {pagina === 'importeren' && (
        <>
          <PaginaKop
            titel={paginaTitel}
            bijschrift={t('Zet in één keer een hele maand aan boekingen in de app, uit het CSV-bestand van je bank. Jij kiest daarna wat er echt in mag.')}
          />
          <ErrorBoundary naam="Inlezen">
            <ImportSectie
              rekeningen={actieveRekeningen}
              transacties={transacties}
              categorieen={categorieen}
              handelaarIndex={handelaarIndex}
              onImporteer={leesUittrekselIn}
              onNaarRekeningen={() => gaNaarOpstelling('rekeningen')}
            />
          </ErrorBoundary>
        </>
      )}

    </div>
  )

  // ⚠ RONDE 65. De aankondiging staat LOS van de balk, en is er altijd — leeg
  // wanneer er niets te melden is. Een `role="status"` die pas samen met zijn tekst
  // in de pagina verschijnt, wordt door sommige schermlezers overgeslagen; dan
  // verdwijnt er iets, hoor je niets, en weet je niet dat er een weg terug is. De
  // balk zelf draagt daarom géén rol meer.
  const undoAankondiging = (
    <p className="alleen-voorlezen" role="status">
      <span key={undoTeller}>{undoInfo ? undoInfo.boodschap : ''}</span>
    </p>
  )

  const undoBalk = undoInfo && (
    <div
      // De klasse bestaat om de focusring te kunnen richten: deze balk is ook in het
      // lichte thema donker, net als het zijpaneel. Zie index.css.
      className="undo-balk"
      // De klok staat stil zolang je erop staat of erin gefocust bent.
      onMouseEnter={() => undoKlok.current.pauzeer('muis')}
      onMouseLeave={() => undoKlok.current.hervat('muis')}
      onFocusCapture={() => undoKlok.current.pauzeer('focus')}
      onBlurCapture={() => undoKlok.current.hervat('focus')}
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
      {/* Een kruisje, zodat je de balk meteen weg kan doen in plaats van twintig
          seconden te wachten. Dat is ook wat de norm bedoelt met "de gebruiker kan
          de tijdslimiet uitzetten". */}
      <button
        type="button"
        className="knop knop-kaal"
        aria-label={t('Melding sluiten')}
        onClick={sluitUndo}
        style={{ color: '#fff8ed', minHeight: 44, minWidth: 44 }}
      >
        ×
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
        {/* ⚠ "Sla de navigatie over" (ronde 61). Tel eens mee wat je op een pc met het
            toetsenbord passeert vóór je bij de inhoud bent: het merkteken, vijftien
            paginaknoppen en drie weergaveknoppen. Negentien keer Tab, op élke pagina,
            elke keer opnieuw — dat is de klassieke reden waarom mensen het met een
            toetsenbord opgeven. Deze link staat buiten beeld tot je hem focust, en dan
            springt hij tevoorschijn. Hij hoort vóór de zijbalk te staan, want anders
            kom je hem pas tegen ná datgene wat hij moet overslaan. */}
        <a
          className="skiplink"
          href="#inhoud"
          // ⚠ Zelf de focus verzetten en het ADRES met rust laten (nakijkronde ronde
          // 61). De pagina staat sinds ronde 59 in het adres (`#/budget`); zou de
          // browser hier `#inhoud` van maken, dan zet de app dat meteen weer recht —
          // maar de browser heeft dan al een stap in zijn geschiedenis bijgezet, en dan
          // doet de terugknop één keer niets.
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('inhoud')?.focus()
          }}
        >
          {t('Ga naar de inhoud')}
        </a>
        <Zijbalk actief={pagina} onKies={kiesPagina} verbonden={verbonden} bezig={bezig} statusTekst={statusTekst} />
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
              + {t('Nieuwe boeking')}
            </button>

            <Meldingenbel
              meldingen={meldingen}
              onGaNaar={gaNaarMelding}
              onBoekVasteLast={boekVasteLastPerId}
            />

            {verbonden && (
              <button className="knop knop-icoon" aria-label={t('Uitloggen')} onClick={verbreekVerbinding}>
                <span aria-hidden>⎋</span>
              </button>
            )}
          </header>
          {/* ⚠ Een echte <main> (ronde 61). De smalle weergave had er al een; de brede
              werkte met een kale <div>, dus juist op het toestel waar de zijbalk
              negentien knoppen vóór de inhoud zet, ontbrak de landmark om erheen te
              springen. `tabIndex={-1}` is nodig omdat de skiplink hierheen springt:
              zonder dat verplaatst de browser de focus niet mee en tabt je volgende
              druk weer vanaf de zijbalk verder. */}
          <main id="inhoud" tabIndex={-1} style={{ padding: '1.5rem 1.5rem 3rem' }}>
            {/* Bovenaan de inhoud en NIET zwevend: zie ui-uitleg in
                components/NieuweVersieBalk.tsx. Buiten de `key` hieronder, zodat de
                melding niet bij elke tabwissel opnieuw invliegt. */}
            <div className="inhoud-breed">
              <NieuweVersieBalk />
            </div>
            {/* De `key` is wat de overgang laat werken: bij elke tabwissel is dit
                voor React een NIEUW vlak, dus begint de animatie opnieuw. Zonder
                key zou React de inhoud hergebruiken en zou je de eerste keer een
                beweging zien en daarna nooit meer. */}
            <div className="inhoud-breed pagina-in" key={pagina}>
              {paginaInhoud}
            </div>
          </main>
        </div>
        {undoAankondiging}
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
            onClick={() => kiesPagina('overzicht')}
          >
            <Merkteken grootte={30} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--tekst-xl)', letterSpacing: '-0.03em' }}>Kompal</span>
          </button>
          {/* Hetzelfde belletje als op desktop. Het stond hier vroeger niet, dus op
              een telefoon zag je nooit dat een budget bijna op was. */}
          <div style={{ flex: 1 }} />
          <Meldingenbel
              meldingen={meldingen}
              onGaNaar={gaNaarMelding}
              onBoekVasteLast={boekVasteLastPerId}
            />
        </div>

        {/* Bovenaan de inhoud en NIET zwevend: zie de uitleg in
            components/NieuweVersieBalk.tsx. */}
        <NieuweVersieBalk />

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
      {undoAankondiging}
      {undoBalk}
      {/* De popup stond buiten elke foutvang: één fout in het invoerformulier
          legde daardoor de HELE app plat in plaats van alleen de popup. */}
      <ErrorBoundary naam="Boeking">{boekingLagen}</ErrorBoundary>
      <OnderNavigatie actief={pagina} onKies={kiesPagina} onNieuweTransactie={nieuweTransactie} />
    </CategorieVolgordeProvider>
  )
}
