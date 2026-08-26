import { useEffect, useRef, useState } from 'react'
import type {
  Categorie,
  Aflossing,
  Dossier,
  Gezinsrol,
  Kind,
  Lening,
  Overboeking,
  Rekening,
  Spaardoel,
  TerugkerendePost,
  Transactie,
  Waardering,
} from '../data/schema'
import { KLASSIEKE_VASTE_KOSTEN, SLUIPEND_ANDERS, SLUIPENDE_KOSTEN, type Kostvoorstel } from '../data/opstelling'
import { isSluipendeLast, overigeSluipendeLasten } from '../utils/sluipend'
import { Dialoog } from '../ui/Dialoog'
import { VasteLastWeg } from './VasteLastWeg'
import { hangtErIetsAan, telVasteLastGebruik } from '../utils/vastelastverwijdering'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { TerugkerendePostFormulier } from './TerugkerendePostFormulier'
import { Balk, EersteStapKnop, Kaart, Leeg, PaginaKop, Stat } from '../ui/basis'
import { Subtabs, type Subtab } from '../ui/Subtabs'
import { RekeningFormulier } from './RekeningFormulier'
import { LeningFormulier } from './LeningFormulier'
import { KinderenSectie } from './KinderenSectie'
import { EersteStap } from './EersteStap'
import { DossierFormulier } from './DossierFormulier'
import { InstallerenKaart } from './InstallerenKaart'
import { DriveKaart } from './DriveKaart'
import { BackupKaart } from './BackupKaart'
import type { OpslagToestand } from '../data/opslag'
import { versVangnet } from '../utils/backupherinnering'
import type { BudgetTab } from '../utils/budgettab'
import { bedragMetPeriode, knopnaamVoorPost, postNaamMetKenmerk } from '../utils/postkenmerk'
import { bepaalBuffer } from '../utils/buffer'
import { nettoVermogen } from '../utils/vermogen'
import { openstaandKapitaal } from '../utils/lening'
import { saldoVanRekening, totaalSaldoVan } from '../utils/saldo'
import {
  isGestopt,
  isNogNietBegonnen,
  maandbedrag,
  opzijPerMaand,
  intervalVan,
  PERIODE_SLEUTELS,
  verschuifMaand,
} from '../utils/vastelast'
import { frequentieNaam } from './TerugkerendePostFormulier'
import { opzijVolgensSpaardoelen } from '../utils/spaardoel'
import { kaartbedragUitOpslag } from '../utils/kredietkaart'
import { formatEuro } from '../utils/format'
import { standaardRekening } from '../utils/rekening'
import { huidigeMaand, maandJaarLabel, vandaag } from '../utils/datum'
import { opmaakLocale } from '../utils/opmaaktaal'
import { TALEN, useT, vertaal } from '../i18n'
import type { Vertaler } from '../i18n'

// DE OPSTELLING (ronde 39) — één begeleid scherm dat je hele situatie opneemt.
//
// Het doel is NIET je installeren. Het doel is dat je binnen tien minuten één
// concreet, verrassend feit ziet — en dat feit mag géén transacties nodig hebben.
// Wie eerst drie maanden boekingen moet ingeven vóór er iets zinnigs op het scherm
// verschijnt, komt niet terug. Daarom staat de kaart "Dit is je situatie" BOVENAAN
// en groeit ze live mee terwijl je invult: je ziet je eigen beeld ontstaan.
//
// Drie regels waaraan dit scherm zich houdt:
//
//  1. GEEN EENMALIGE WIZARD. In maand drie ontdek je een vergeten abonnement; dan
//     moet dit scherm gewoon opnieuw opengaan, met alles wat je al hebt.
//  2. ELK BLOK IS OVERSLAANBAAR. De kaart bovenaan zegt wat je mist; ze houdt je
//     nergens tegen.
//  3. HET DIRIGEERT, HET DUPLICEERT NIET. Elk blok gebruikt hetzelfde formulier en
//     dezelfde rekenkern als het gewone scherm. Er komt geen tweede waarheid bij.

export type OpstellingBlok =
  | 'rekeningen'
  | 'openstaand'
  | 'later'
  | 'vast'
  | 'sluipend'
  | 'gezin'
  | 'delen'
  | 'veilig'

/**
 * Wat het blok "Veilig bewaren" nodig heeft (ronde 63). Eén object in plaats van
 * tien losse eigenschappen: het gaat om één onderwerp, en zo is het ook één ding
 * dat er wel of niet is.
 */
export type VeiligInvoer = {
  verbonden: boolean
  bezig: boolean
  onVerbind: () => void
  onSynchroniseer: () => void
  backupTekst: string | null
  /** Of `backupTekst` over een MISLUKKING gaat; dan hoort ze voorgelezen te worden. */
  backupIsFout?: boolean
  onExporteer: () => void
  onHerstel: (bestand: File) => void
  /** De dag van de laatste back-up op dit toestel. */
  laatsteBackupOp?: string
  /** De dag van de laatste geslaagde synchronisatie met Drive. */
  laatsteSyncOp?: string
  /** Of de browser deze database blijvend bewaart. */
  opslag?: OpslagToestand
  /** De dag van vandaag; alleen om te bepalen of een vangnet nog VERS is. */
  vandaagISO?: string
}

/** De rekeningtypes die bij elk blok horen. Eén plek, zodat de tellingen kloppen. */
const TYPES_GELD: Rekening['type'][] = ['betaal', 'spaar', 'cash']
const TYPES_LATER: Rekening['type'][] = ['effecten', 'termijn']


/**
 * Welke voorstelnaam hoort bij welke sleutel — in alle drie de talen.
 *
 * Eén keer opgebouwd, want de lijsten en de vertalingen veranderen niet tijdens het
 * draaien. De weergavenaam is wat er als `omschrijving` weggeschreven wordt, dus dit is
 * precies de tabel die een bestaande post terugvindt.
 */
const SLEUTEL_PER_NAAM = new Map<string, string>()
// ⚠ `SLUIPEND_ANDERS` staat hier BEWUST niet bij (ronde 84). Zou "Een andere sluipende
// last" in deze tabel staan, dan zou een post die je toevallig zo noemt onder die rij
// belanden op grond van zijn naam — en, erger, zou de rij zichzelf als voorstel
// herkennen. De rij vindt haar posten via `bronVoorstel` en via `overigeSluipendeLasten`.
for (const v of [...KLASSIEKE_VASTE_KOSTEN, ...SLUIPENDE_KOSTEN]) {
  for (const taal of TALEN) SLEUTEL_PER_NAAM.set(vertaal(taal.waarde, v.naam).trim().toLowerCase(), v.sleutel)
}

/**
 * Onder welk voorstel hoort deze post? (`undefined` = onder geen enkel)
 *
 * ⚠ TWEE MANIEREN, EN DE VOLGORDE IS BEWUST (ronde 73).
 *
 * 1. **Heet de post exact zoals een voorstel?** Dan telt die naam. Dit is de oude
 *    herkenning, en ze is nodig voor élke post van vóór deze ronde: die dragen geen
 *    `bronVoorstel`, en zonder deze weg zou iedereen die de app al gebruikte zijn eigen
 *    kosten hier niet meer terugvinden. Ze staat ook bewust EERST: klik je "Toevoegen"
 *    bij *Huur* maar tik je er in het venster *Netflix* van, dan hoort die post onder
 *    Netflix — niet voorgoed onder Huur omdat je op de verkeerde rij begon.
 * 2. **Anders telt `bronVoorstel`**, het veld dat sinds deze ronde meegeschreven wordt.
 *    Dat is wat een hernoemde post op zijn plaats houdt: "Autoverzekering bestelwagen"
 *    heet naar geen enkel voorstel, en blijft toch onder *Autoverzekering* staan.
 *
 * ⚠ GEEN CONTROLE of die sleutel nog bestaat, en dat is met opzet: een sleutel die
 * niemand kent, komt hoe dan ook met geen enkele rij overeen. Zo'n controle zou er
 * beschermend uitzien en niets doen — precies de dode tak die ronde 72 twee keer moest
 * opruimen. Wat een hernoemde sleutel WÉL opvangt, is stap 1: de naam.
 */
function sleutelVan(post: TerugkerendePost): string | undefined {
  return SLEUTEL_PER_NAAM.get(post.omschrijving.trim().toLowerCase()) ?? post.bronVoorstel
}

/** Wat er onder één voorstel al staat. */
function postenVan(voorstel: Kostvoorstel, posten: TerugkerendePost[]): TerugkerendePost[] {
  return posten.filter((p) => sleutelVan(p) === voorstel.sleutel)
}

/**
 * Hoe vaak een post terugkomt, in woorden (ronde 70).
 *
 * Zonder `startMaand` kan `valtInMaand` het ritme niet plaatsen en gedraagt de post
 * zich als maandelijks — dan zegt de zin dat ook, in plaats van een maand te verzinnen.
 *
 * ⚠ NIET geëxporteerd: dit is een componentbestand, en een losse export ernaast laat
 * de fast-refresh-regel van ESLint waarschuwen — dezelfde val als bij `naamMetBron`
 * in ronde 69.
 */
function ritmeVan(t: Vertaler, post: TerugkerendePost): string {
  const f = post.frequentie ?? 'maand'
  if (f === 'maand') return frequentieNaam(t, 'maand')
  // ⚠ WEL de frequentie noemen, ook zonder startmaand. Hier stond eerst "Elke maand",
  // omdat `valtInMaand` zonder startmaand terugvalt op elke maand. Maar `maandbedrag`
  // deelt dan wél door drie, en op Budget → Vast heet diezelfde post "Om de 3
  // maanden" — dan zeggen twee schermen iets anders over één record.
  if (!post.startMaand) return t('{hoevaak}, vanaf een maand die je nog moet kiezen', { hoevaak: frequentieNaam(t, f) })
  return t('{hoevaak}, vanaf {maand}', {
    hoevaak: frequentieNaam(t, f),
    maand: maandJaarLabel(`${post.startMaand}-01`),
  })
}

/**
 * Eén regel uit de lijst met voorstellen.
 *
 * ⚠ RONDE 73 — DEZE RIJ IS LEEGGEHAALD, EN DAT IS DE HELE RONDE. Ze droeg een
 * invoerveld, een periodewoord, een uitklappaneel met vier velden én een knop, en dat
 * zevenendertig keer onder elkaar. Timothy: *"Nu zie ik daar een slordige pagina. Ik
 * zie niet in waarom dat invulvak nodig is."* Hij had gelijk, en het was erger dan
 * slordig: dezelfde kost kon op twee plaatsen ingevoerd worden — hier en op
 * Budget → Vast — met twee verschillende sets regels. Dat leverde in ronde 71 al een
 * echt verschil op ("12abc" werd hier geweigerd en daar als 12 gelezen).
 *
 * Wat er nu staat: de naam, één zin die zegt wat je al hebt, en één knop. Klikken op de
 * rij klapt open wat er onder dit voorstel staat; de knop opent het VOLLEDIGE
 * invulformulier van Budget → Vast in een venster, al ingevuld.
 */
function KostRegel({
  voorstel,
  t,
  eigen,
  alle,
  open,
  onWissel,
  onToevoegen,
  onWijzig,
  onVerwijder,
}: {
  voorstel: Kostvoorstel
  t: Vertaler
  /** De posten die onder dit voorstel vallen; leeg wanneer je hier nog niets hebt. */
  eigen: TerugkerendePost[]
  /**
   * ÁLLE vaste lasten van dit scherm (ronde 82), om te weten of een naam ook elders
   * voorkomt.
   *
   * ⚠ Niet `eigen`, hoe verleidelijk ook. Twee posten die allebei "Autoverzekering"
   * heten hoeven niet onder hetzelfde voorstel te hangen — één kan je zelf toegevoegd
   * hebben en de andere uit "Verzekeringen" komen. De regel is "twee bedieningen op
   * één SCHERM mogen niet dezelfde naam dragen", en dit scherm toont ze allemaal.
   */
  alle: TerugkerendePost[]
  open: boolean
  onWissel: () => void
  onToevoegen: () => void
  onWijzig: (post: TerugkerendePost) => void
  /** Verwijderen. Ontbreekt de handler, dan staat die knop er niet. */
  onVerwijder?: (post: TerugkerendePost) => void
}) {
  const naam = t(voorstel.naam)
  // Waar de focus heen gaat wanneer de regel waarop je stond verdwijnt (zie hieronder).
  const toevoegRef = useRef<HTMLButtonElement>(null)
  // De samenvatting op de rij. Bij één post het bedrag zelf — dat is wat je wil zien
  // zonder open te klappen. Bij meer dan één alleen het aantal: twee bedragen met
  // verschillende periodes optellen zou een getal geven dat nergens op slaat.
  // ⚠ RONDE 84, doorlichting — DE VRIJE RIJ IS NOOIT "NOG NIETS TOEGEVOEGD". Bij een
  // voorstel is dat een stand van zaken ("je hebt nog geen Netflix"); bij een
  // uitnodiging leest het als een gebrek dat je zou moeten wegwerken, terwijl leeg daar
  // het normale geval is. Er staat nu wat de rij dóét.
  const samenvatting =
    eigen.length === 0
      ? voorstel.vrijeNaam
        ? t('Voeg er zelf een toe')
        : t('Nog niets toegevoegd')
      : eigen.length === 1
        ? bedragMetPeriode(t, eigen[0])
        : t('{n} kosten toegevoegd', { n: eigen.length })

  return (
    <li className="rij rij-kost rij-kost-uitklap">
      <span className="rij-teken" aria-hidden="true">
        {voorstel.icoon}
      </span>
      <div className="rij-midden">
        {/* ⚠ GEEN `aria-controls`. Dat attribuut mag alleen naar een element wijzen dat
            ECHT bestaat, en de uitklap bestaat alleen wanneer ze openstaat — exact de
            fout die ronde 67 op dit scherm vond (zeven dode verwijzingen).
            `aria-expanded` zegt al wat er gebeurt, en de inhoud staat er meteen onder. */}
        <button type="button" className="kost-kop" aria-expanded={open} onClick={onWissel}>
          <span className="rij-titel">{naam}</span>
          <span className="rij-meta">
            {samenvatting} <span aria-hidden>{open ? '▾' : '▸'}</span>
          </span>
        </button>
        {voorstel.toelichting && <span className="rij-meta">{t(voorstel.toelichting)}</span>}

        {open && (
          <ul className="lijst kost-eigen">
            {eigen.length === 0 && (
              <li className="rij-meta" style={{ padding: '6px 0' }}>
                {voorstel.vrijeNaam
                  ? t('Staat je abonnement niet in de lijst hierboven? Voeg het hier toe — het telt dan gewoon mee bij je sluipende lasten.')
                  : t('Hier heb je nog niets toegevoegd. Gebruik de knop hiernaast.')}
              </li>
            )}
            {eigen.map((post) => (
              <li key={post.id} className="rij">
                <span className="rij-midden">
                  <span className="rij-titel">{post.omschrijving}</span>
                  <span className="rij-meta">
                    {bedragMetPeriode(t, post)} · {ritmeVan(t, post)} · {t('dag {dag}', { dag: post.dag })}
                  </span>
                </span>
                <span className="rij-acties">
                  {/* ⚠ NIET alleen de naam in de toegankelijke naam (ronde 73,
                      doorlichting). Er kunnen tien uitklappen tegelijk openstaan, en de
                      knop heet bewust altijd "Toevoegen" — dus twee posten die allebei
                      "Netflix" heten zijn heel gewoon. Met alleen de naam droegen dan
                      twee knoppen exact dezelfde naam, en wist een schermlezergebruiker
                      niet welke van de twee hij wiste. Het bedrag en de dag erbij maken
                      ze uit elkaar te houden. De zichtbare tekst staat er vooraan in,
                      zoals WCAG 2.5.3 vraagt.

                      ⚠ RONDE 82 — via `knopnaamVoorPost`, en niet meer met de hand. Deze
                      regel stond hier twee keer uitgeschreven, en Budget → Vast — het
                      andere scherm met dezelfde lijst — had hem nooit gekregen. Nu lezen
                      allebei de schermen dezelfde functie. */}
                  <button
                    type="button"
                    className="knop knop-ghost knop-klein"
                    aria-label={knopnaamVoorPost(t, t('Bewerken'), post, alle)}
                    onClick={() => onWijzig(post)}
                  >
                    {t('Bewerken')}
                  </button>
                  {onVerwijder && (
                    <button
                      type="button"
                      className="knop knop-ghost knop-klein"
                      aria-label={knopnaamVoorPost(t, t('Verwijderen'), post, alle)}
                      // ⚠ De focus meteen verzetten, VOOR de regel verdwijnt (ronde 73,
                      // doorlichting). Zonder dit viel hij naar `<body>` en stond je met
                      // je toetsenbord weer bovenaan de pagina. De knop "Toevoegen" van
                      // dezelfde rij is de logische volgende stap.
                      onClick={() => {
                        toevoegRef.current?.focus()
                        onVerwijder(post)
                      }}
                    >
                      {t('Verwijderen')}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="rij-acties">
        {eigen.length > 0 && (
          <span className="badge badge-ok" aria-hidden>
            {eigen.length}
          </span>
        )}
        {/* ⚠ De knop blijft "Toevoegen" heten, ook wanneer er al iets staat. Timothy:
            *"Wil je een tweede toevoegen? Klik dan opnieuw op toevoegen."* Het aparte
            "Nog een" uit ronde 71 is daarmee overbodig geworden. */}
        <button
          ref={toevoegRef}
          type="button"
          className="knop knop-secundair knop-klein"
          // De zichtbare tekst staat vooraan in de toegankelijke naam (WCAG 2.5.3): zeg
          // je "klik Toevoegen" tegen je spraakbediening, dan moet die deze knop vinden.
          aria-label={t('Toevoegen — {naam}', { naam })}
          onClick={onToevoegen}
        >
          {t('Toevoegen')}
        </button>
      </span>
    </li>
  )
}

/** Een lijst met voorstellen, met een korte uitleg erboven. */
function KostenLijst({
  titel,
  uitleg,
  voorstellen,
  heeftRekening,
  onNaarRekeningen,
  posten,
  t,
  onToevoegen,
  onWijzig,
  onVerwijder,
  onNaarBudget,
}: {
  titel: string
  uitleg: string
  voorstellen: Kostvoorstel[]
  /**
   * De vaste lasten die je AL HEBT — dus ook een jaarpremie die pas volgend jaar begint.
   *
   * ⚠ Dit is NIET dezelfde verzameling als de tegels bovenaan (die laten een post die
   * nog niet begonnen is buiten beschouwing, want die kost je vandaag niets). Hier gaat
   * het om een andere vraag: "heb ik dit al ingegeven?" — en het antwoord daarop is ja
   * zodra de post in je database staat. Dat verschil kostte in ronde 71 een echte fout:
   * met de tegel-lijst verdween elke jaarpost meteen weer uit deze lijst, en wie hem
   * opnieuw intikte kreeg een tweede identieke post.
   *
   * Een opgezegde post telt hier bewust niet mee: die mag je opnieuw ingeven. En een
   * terugkerende ÍNKOMST met de omschrijving "Huur" (kotgeld, onderverhuur) evenmin.
   */
  posten: TerugkerendePost[]
  t: Vertaler
  onToevoegen: (voorstel: Kostvoorstel, lijst: Kostvoorstel[]) => void
  /**
   * Een bestaande post bewerken. Het VOORSTEL gaat mee (ronde 73, doorlichting): zonder
   * dat verloor een post van vóór deze ronde zijn plaats zodra je hem hernoemde. Hij
   * heette dan naar geen enkel voorstel meer én droeg geen `bronVoorstel`, dus hij
   * verdween uit deze lijst terwijl hij in je vaste lasten gewoon meetelde — en dan zet
   * je hem een tweede keer in. Met het voorstel erbij adopteert het venster hem.
   */
  onWijzig: (post: TerugkerendePost, voorstel: Kostvoorstel, lijst: Kostvoorstel[]) => void
  onVerwijder?: (post: TerugkerendePost) => void
  onNaarBudget: () => void
  /**
   * Is er al een rekening om deze kosten vanaf te laten gaan? (ronde 66, slotronde)
   *
   * ⚠ Zonder rekening liet dit blok je gewoon bedragen intikken, en pas bij het
   * bewaren kwam de melding "Maak eerst een rekening aan bij Je geld" — een zin die de
   * bestemming noemt maar je er niet heen brengt, terwijl dat blok op dit eigen scherm
   * staat. Beter is: het niet laten beginnen, en één tik naar het juiste blok aanbieden.
   */
  heeftRekening: boolean
  onNaarRekeningen: () => void
}) {
  const [openRijen, setOpenRijen] = useState<Set<string>>(new Set())
  // ⚠ RONDE 73 — "toon alleen wat ik al heb". Staan er twintig voorstellen waarvan je er
  // drie gebruikt, dan is alles openklappen vooral zeventien lege vakjes. Deze filter
  // geeft het totaalbeeld op één scherm.
  const [alleenEigen, setAlleenEigen] = useState(false)

  // ⚠ RONDE 84 — de rij "Een andere sluipende last" verzamelt ánders dan de rest. Een
  // gewoon voorstel toont wat er onder zijn eigen sleutel hangt; deze rij toont élke
  // sluipende last die onder geen enkel voorstel valt — ook die van vóór deze ronde,
  // die geen `bronVoorstel` dragen. Zonder die uitzondering blijft precies het gat open
  // dat deze ronde dicht: het cijfer telt hem, de lijst verzwijgt hem.
  const eigenVan = (v: Kostvoorstel) =>
    v.sleutel === SLUIPEND_ANDERS.sleutel ? overigeSluipendeLasten(posten, sleutelVan) : postenVan(v, posten)
  // ⚠ RONDE 84, doorlichting — DE VRIJE RIJ TELT HIER NIET MEE, en dat stond eerst
  // alleen in drie opmerkingen. De teller rekende gewoon met `voorstellen.length`, dus
  // "Je vulde er 3 van de 18 in" werd "3 van de 19" zodra de rij "Een andere sluipende
  // last" erbij kwam — een noemer die telt hoeveel VRAGEN er zijn, terwijl die rij geen
  // vraag is maar een uitnodiging. Je kan er nooit klaar mee zijn.
  const telbaar = voorstellen.filter((v) => !v.vrijeNaam)
  const gedaan = telbaar.filter((v) => eigenVan(v).length > 0).length
  // ⚠ Een OPENSTAANDE rij blijft staan, ook als de filter hem niet meer zou tonen
  // (ronde 73, doorlichting). Wis je de laatste kost onder een rij terwijl de filter
  // aanstaat, dan verdween anders de hele rij onder je vingers — met je focus erin, en
  // zonder weg terug. Klap je hem dicht, dan verdwijnt hij alsnog: dan ben je klaar.
  const zichtbaar = alleenEigen
    ? voorstellen.filter((v) => eigenVan(v).length > 0 || openRijen.has(v.sleutel))
    : voorstellen
  const allesOpen = zichtbaar.length > 0 && zichtbaar.every((v) => openRijen.has(v.sleutel))

  return (
    <Kaart
      titel={titel}
      // ⚠ Geen telling zolang de lijst zelf verborgen is: "0 van 20" boven een leeg blok
      // is een stand van iets wat er niet staat.
      bijschrift={
        heeftRekening
          ? `${uitleg} ${t('Je vulde er {gedaan} van de {totaal} in.', { gedaan, totaal: telbaar.length })}`
          : uitleg
      }
    >
      {/* ⚠ Een ándere knoptekst dan op de welkomstkaart ("Begin bij Je geld"): op een
          verse app staan die kaart en dit blok samen op één scherm, en twee knoppen met
          exact dezelfde naam zijn voor een schermlezer niet uit elkaar te houden. */}
      {!heeftRekening && (
        <Leeg actie={<EersteStapKnop onClick={onNaarRekeningen}>{t('Maak een rekening aan')}</EersteStapKnop>}>
          {t('Maak eerst een rekening aan — een vaste last moet ergens vanaf gaan.')}
        </Leeg>
      )}

      {heeftRekening && (
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-ghost knop-klein"
            // De titel van de lijst erin: dit scherm draagt twee van deze kaarten onder
            // elkaar, en twee knoppen met dezelfde naam zijn niet uit elkaar te houden.
            aria-label={
              allesOpen ? t('Klap alles dicht — {titel}', { titel }) : t('Klap alles open — {titel}', { titel })
            }
            onClick={() =>
              setOpenRijen(allesOpen ? new Set() : new Set(zichtbaar.map((v) => v.sleutel)))
            }
          >
            {allesOpen ? t('Klap alles dicht') : t('Klap alles open')}
          </button>
          <button
            type="button"
            className="knop knop-ghost knop-klein"
            aria-pressed={alleenEigen}
            aria-label={t('Toon alleen wat ik al heb — {titel}', { titel })}
            onClick={() => setAlleenEigen((a) => !a)}
          >
            {t('Toon alleen wat ik al heb')}
          </button>
        </div>
      )}

      {heeftRekening && (
        <ul className="lijst">
          {zichtbaar.map((v) => (
            <KostRegel
              key={v.sleutel}
              voorstel={v}
              t={t}
              eigen={eigenVan(v)}
              alle={posten}
              open={openRijen.has(v.sleutel)}
              onWissel={() =>
                setOpenRijen((vorig) => {
                  const volgend = new Set(vorig)
                  if (volgend.has(v.sleutel)) volgend.delete(v.sleutel)
                  else volgend.add(v.sleutel)
                  return volgend
                })
              }
              // ⚠ `zichtbaar` en niet `voorstellen`: "Opslaan + volgende" springt naar
              // het volgende voorstel waar nog niets onder staat, en met de filter aan
              // is dat per definitie een voorstel dat je net verborg. Dan sluit het
              // venster gewoon, en dat klopt: met die filter aan ben je aan het
              // nakijken, niet aan het invullen.
              onToevoegen={() => onToevoegen(v, zichtbaar)}
              onWijzig={(post) => onWijzig(post, v, zichtbaar)}
              onVerwijder={onVerwijder}
            />
          ))}
        </ul>
      )}

      {/* De filter kan de lijst helemaal leegmaken. Zonder deze regel staat er dan een
          kaart met twee knoppen en niets ertussen. */}
      {heeftRekening && zichtbaar.length === 0 && (
        <Leeg>{t('Je hebt hier nog niets ingevuld. Zet de filter uit om alle voorstellen te zien.')}</Leeg>
      )}

      {/* ⚠ Óók binnen `heeftRekening` (ronde 66, slotronde). Zonder rekening bracht deze
          knop je naar Budget → Vast, waar allebei de formulieren zeggen "Maak eerst een
          rekening aan" en je met een knop terugsturen naar dit scherm. Een rondje. */}
      {heeftRekening && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {/* ⚠ Deze zin wees naar een pagina en niet naar een plek (ronde 64).

              ⚠ RONDE 84, doorlichting — NIET TWEE ANTWOORDEN OP ÉÉN VRAAG. Draagt deze
              lijst een vrije rij, dan staat het antwoord op "staat het er niet bij?" al
              in de lijst zelf. Deze zin herhaalde de vraag en stuurde je naar het
              andere scherm — precies het scherm waarover Timothy schreef dat het je
              abonnement stil niet meetelt. Dan is de knop alleen nog een doorsteek. */}
          {voorstellen.some((v) => v.vrijeNaam)
            ? t('Al je vaste lasten staan samen op één plek.')
            : t('Staat het er niet bij? Voeg het zelf toe bij je vaste lasten.')}{' '}
          <button type="button" className="knop knop-ghost knop-klein" onClick={onNaarBudget}>
            {t('Naar je vaste lasten')}
          </button>
        </p>
      )}
    </Kaart>
  )
}

/**
 * Een blok van dit scherm in beeld brengen en de focus erop zetten.
 *
 * ⚠ Waarom dit apart staat: zowel de knoppen bínnen dit scherm als een doorklik van
 * buitenaf hebben het nodig, en zonder dit doet allebei niets zichtbaars wanneer het
 * gevraagde blok al openstond — het meest voorkomende geval, want "Je geld" is het
 * standaardblok. `scrollIntoView` bestaat niet in de testomgeving; vandaar de
 * bestaanscheck, dezelfde als in ui/Dialoog.tsx.
 */
function brengBlokInBeeld(id: OpstellingBlok) {
  setTimeout(() => {
    const knop = document.getElementById(`opstelling-tab-${id}`)
    if (!(knop instanceof HTMLElement) || !knop.isConnected) return
    if (typeof knop.scrollIntoView === 'function') {
      const rustig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      knop.scrollIntoView({ block: 'start', behavior: rustig ? 'auto' : 'smooth' })
    }
    knop.focus()
  }, 0)
}

export function OpstellingSectie({
  rekeningen,
  transacties,
  overboekingen,
  waarderingen,
  terugkerendePosten,
  categorieen,
  leningen,
  aflossingen,
  gezinsleden,
  dossiers,
  onRekening,
  onLening,
  onVastePost,
  onVastePostVerwijderen,
  onKindToevoegen,
  onKindWijzigen,
  onKindVerwijderen,
  telGezinslidGebruik,
  onDossier,
  onNaarPagina,
  onNaarBudget,
  veilig,
  naarBlok: gevraagdBlok = 'rekeningen',
  naarBlokNr = 0,
  spaardoelen = [],
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  waarderingen: Waardering[]
  terugkerendePosten: TerugkerendePost[]
  /** Voor de categoriekeuze in het invulvenster (ronde 73). */
  categorieen: Categorie[]
  leningen: Lening[]
  aflossingen: Aflossing[]
  gezinsleden: Kind[]
  dossiers: Dossier[]
  onRekening: (r: Rekening) => Promise<void> | void
  onLening: (l: Lening) => Promise<void> | void
  onVastePost: (p: TerugkerendePost) => Promise<void> | void
  /**
   * Een vaste last verwijderen vanuit de uitklap (ronde 73). Optioneel: een scherm dat
   * de knop niet kan aansturen, hoort hem niet te tonen — dezelfde afspraak als bij
   * "Veilig bewaren". `App.tsx` hangt er een ongedaan-balk aan.
   */
  onVastePostVerwijderen?: (id: string) => Promise<void> | void
  onKindToevoegen: (naam: string, rol?: Gezinsrol) => void
  onKindWijzigen: (lid: Kind) => void
  onKindVerwijderen: (id: string) => void
  telGezinslidGebruik?: (id: string) => string[]
  onDossier: (d: Dossier) => Promise<void> | void
  onNaarPagina: (p: 'budget' | 'dossiers' | 'overzicht' | 'rekeningen') => void
  /**
   * Naar een bepaald tabblad van de Budget-pagina (ronde 64).
   *
   * ⚠ Waarom náást `onNaarPagina`: die zette je bovenaan Budget, terwijl het
   * formulier dat de zin ernaast belooft — "je kan altijd zelf iets toevoegen" —
   * pas het vijfde blok naar beneden stond. Timothy zag daardoor niet waar hij iets
   * moest invullen. Ontbreekt deze prop, dan valt de knop terug op `onNaarPagina`.
   */
  onNaarBudget?: (tab: BudgetTab) => void
  /**
   * Alles voor het blok "Veilig bewaren" (ronde 63).
   *
   * ⚠ Ontbreekt dit, dan is er geen achtste blok. Dat is dezelfde afspraak als bij
   * "Begin opnieuw" in Instellingen: een scherm dat de knoppen niet kan aansturen,
   * hoort ze niet te tonen. Zo staat er nooit een verbindknop die niets doet.
   */
  veilig?: VeiligInvoer
  /**
   * Welk blok moet er opengaan? (ronde 66, slotronde)
   *
   * ⚠ Bestaat omdat een knop ELDERS in de app naar een bepaald blok van dit scherm
   * moet kunnen wijzen. "Stel je gezinsleden in" op de pagina "Wat kost elk
   * gezinslid?" zette je hier neer met het REKENINGformulier voor je neus, en het
   * blok "Je gezin" moest je zelf nog vinden — precies wat `gaNaarBudget(tab)` voor
   * de Budget-pagina al oploste.
   */
  naarBlok?: OpstellingBlok
  /**
   * Loopt op bij élke doorklik, óók naar hetzelfde blok.
   *
   * ⚠ Waarom een teller en geen `key` op deze component: een nieuwe sleutel
   * hermonteert het hele scherm, en dan is alles weg wat je net had ingetikt. De
   * teller laat de component zijn eigen stand bijstellen zonder iets te verliezen.
   */
  naarBlokNr?: number
  /**
   * De spaardoelen, alleen om te weten met welk bedrag Budget rekent (ronde 74).
   * Optioneel en standaard leeg: dan geldt de kale deling, precies zoals vroeger.
   */
  spaardoelen?: Spaardoel[]
}) {
  const { t } = useT()
  const [blok, setBlok] = useState<OpstellingBlok>(gevraagdBlok)

  // Stand bijstellen tijdens het tekenen wanneer de oproeper naar een ander blok
  // wijst. Dit is het patroon dat React zelf aanraadt boven een effect: het gebeurt
  // vóór het tekenen, dus je ziet nooit even het verkeerde blok staan.
  const [gezienNr, setGezienNr] = useState(naarBlokNr)
  if (naarBlokNr !== gezienNr) {
    setGezienNr(naarBlokNr)
    setBlok(gevraagdBlok)
  }

  // ⚠ EN HET SCHERM MOET ER OOK HEEN. `setBlok` alleen doet niets zichtbaars wanneer
  // het gevraagde blok al openstond — en dat is precies het meest voorkomende geval:
  // de ➕ staat op élke pagina, en zonder rekening wijst haar eerste stap hierheen,
  // naar het blok dat standaard al open is. Dan sloot de popup en veranderde er
  // niets. Ditzelfde deed `naarBlok()` al voor de knoppen binnen dit scherm.
  //
  // ⚠ ALLEEN BIJ EEN VERANDERING, niet bij het aankomen. De teller staat in App-state
  // en loopt nooit terug, terwijl dit scherm bij élke paginawissel opnieuw opgebouwd
  // wordt. Zonder deze vergelijking zou "Je situatie" na één doorklik voor de rest van
  // de sessie bij ÉLK bezoek naar de tabstrook springen en de focus verzetten — de
  // paginakop uit beeld, de cursor ergens waar je hem niet zette.
  const vorigNr = useRef(naarBlokNr)
  useEffect(() => {
    if (vorigNr.current === naarBlokNr) return
    vorigNr.current = naarBlokNr
    brengBlokInBeeld(gevraagdBlok)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naarBlokNr])

  /**
   * Naar een blok springen ÉN het in beeld brengen (ronde 66, slotronde).
   *
   * ⚠ Waarom dit niet gewoon `setBlok` mag zijn. Op een gloednieuwe app staat "Je
   * geld" al open — het is het standaardblok. De welkomstknop `Begin bij "Je geld"`
   * riep dus `setBlok('rekeningen')` terwijl dat al de stand was: er gebeurde
   * zichtbaar niets. En de tabstrook staat onder de vouw, dus je zag ook niet
   * wáár je heen had moeten kijken. Nu schuift het scherm naar de strook en krijgt
   * de tab de focus, zodat de knop altijd iets doet — ook wanneer het blok al open
   * stond.
   *
   * `scrollIntoView` bestaat niet in de testomgeving; vandaar de bestaanscheck,
   * dezelfde als in ui/Dialoog.tsx.
   */
  function naarBlok(id: OpstellingBlok) {
    setBlok(id)
    brengBlokInBeeld(id)
  }
  const [melding, setMelding] = useState<string | null>(null)
  // ⚠ RONDE 73, doorlichting. De verwijderknop in de uitklap riep de handler kaal aan
  // (`void onVastePostVerwijderen(...)`). Mislukte het wegschrijven, dan gebeurde er
  // niets: de rij bleef staan, er verscheen geen letter, en in de browser stond er
  // hoogstens een "Uncaught (in promise)" in een console die niemand openheeft. Budget →
  // Vast doet dezelfde actie al sinds ronde 68 mét vangnet, en de regel is hard: een
  // mislukte opslag mag nooit stil blijven.
  const opslag = useOpslagpoging()

  // Gearchiveerde rekeningen horen niet in de keuzes en niet in de tellingen; ze
  // tellen wél gewoon mee in het vermogen, want dat geld bestaat nog.
  const actieveRekeningen = rekeningen.filter((r) => !r.gearchiveerd)
  const geldRekeningen = actieveRekeningen.filter((r) => TYPES_GELD.includes(r.type ?? 'betaal'))
  const kredietRekeningen = actieveRekeningen.filter((r) => r.type === 'krediet')
  const laterRekeningen = actieveRekeningen.filter((r) => r.type !== undefined && TYPES_LATER.includes(r.type))
  // Een afbetaalde en afgesloten lening staat niet meer "open". `leningstand()` slaat
  // ze over, dus telde het blok Openstaand ze wél mee, dan noemde de tegel Netto
  // vermogen er niets van terwijl het blok "1" toonde — twee definities op één kaart.
  const openLeningen = leningen.filter((l) => !l.afgesloten)

  // De regels in de lijstjes tonen wat er NU staat, niet wat er ooit begon. Toonden
  // we `beginsaldo` en `hoofdsom`, dan sprak een rij van € 20.000 openstaande lening
  // de tegel Netto vermogen tegen bij iemand die er al € 15.000 van afbetaald heeft.
  const saldoNu = (r: Rekening) => saldoVanRekening(r, transacties, overboekingen, waarderingen, vandaag())
  // Gestopte posten tellen nergens meer mee — `bepaalBuffer` doet dat ook, en twee
  // tegels op dezelfde kaart met een verschillende definitie is erger dan geen
  // tegel: "waarvan sluipend" zou dan een bedrag noemen dat niet in het totaal
  // erboven zit.
  const dezeMaand = huidigeMaand()
  // ⚠ RONDE 71 — TWEE LIJSTEN, WANT ER WORDEN TWEE VERSCHILLENDE VRAGEN GESTELD.
  //
  // `ingevuld` is "wat heb ik al?", en dat is wat de aanvinklijst nodig heeft om een
  // rij op "toegevoegd" te zetten. Een post die pas volgend jaar begint, HÉB je —
  // hij staat in je database. (Een GESTOPTE post telt hier bewust niet mee: die mag
  // je opnieuw ingeven.)
  //
  // `lasten` is "wat kost mij dit vandaag?", en daar hoort een kost die nog niet
  // begonnen is niet in. Dat is de keuze van deze ronde.
  //
  // ⚠ EERST STOND HIER ÉÉN LIJST, met de begincontrole erin — en die lijst voedde
  // allebei. Gevolg: elke jaarpost die je toevoegde (standaard "eerste betaling
  // volgende maand") verdween meteen weer uit de aanvinklijst. Het bedragveld bleef
  // leeg en open, de badge "toegevoegd" kwam nooit, en wie het opnieuw intikte kreeg
  // een tweede identieke post — zonder één waarschuwing.
  const ingevuld = terugkerendePosten.filter((p) => p.bedrag < 0 && !isGestopt(p, dezeMaand))
  const lasten = ingevuld.filter((p) => !isNogNietBegonnen(p, dezeMaand))
  const sluipend = lasten.filter(isSluipendeLast)
  // ⚠ De TELLING op het tabblad en het vinkje "blok ingevuld" stellen dezelfde vraag als
  // de lijst eronder — "heb ik dit al ingegeven?" — en horen dus op `ingevuld` te staan
  // (ronde 73, doorlichting). Met `lasten` zei het blok "Je vulde er 1 van de 19 in"
  // terwijl het tabblad geen cijfer toonde en de voortgangsbalk het blok niet aftikte,
  // enkel omdat die ene jaarpost pas volgend jaar begint. De TEGELS bovenaan blijven wél
  // op `lasten` staan: die zeggen wat je vandaag kost, en dat is een andere vraag.
  const ingevuldSluipend = ingevuld.filter(isSluipendeLast)
  const ingevuldKlassiek = ingevuld.filter((p) => !isSluipendeLast(p))

  // De cijfers van het slotscherm. Alle vier komen uit bestaande rekenkernen, en
  // geen enkele heeft een transactie nodig — dat is het hele punt.
  const buffer = bepaalBuffer(rekeningen, transacties, overboekingen, terugkerendePosten, waarderingen, vandaag())
  const bezit = totaalSaldoVan(rekeningen, transacties, overboekingen, waarderingen, vandaag())
  const vermogen = nettoVermogen(bezit, leningen, aflossingen)
  const sluipendPerMaand = sluipend.reduce((som, p) => som + -maandbedrag(p), 0)
  // RONDE 71 — wat er nog NIET in de tegel zit. Zonder deze zin lijkt de tegel te laag
  // (of beweegt ze niet wanneer je iets toevoegt) zonder dat iets zegt waarom. Alleen
  // wanneer er ook echt zo'n post is; anders noemt de zin een beperking zonder gevolg.
  const nogNietBegonnen = ingevuld.filter((p) => isNogNietBegonnen(p, dezeMaand))
  const nogNietBegonnenPerMaand = nogNietBegonnen.reduce((som, p) => som + -maandbedrag(p), 0)
  // ⚠ Dezelfde regel als op Budget (ronde 74, doorlichting). Sinds een spaardoel aan
  // een vaste last kan hangen, komt het bedrag onder "Opzij voor later" uit dát doel.
  // Rekende deze zin nog met de kale `opzijPerMaand`, dan noemde ze een bedrag dat op
  // Budget niet staat — en de zin zegt er letterlijk bij "dat staat op Budget".
  const opzijViaDoel = opzijVolgensSpaardoelen(spaardoelen, terugkerendePosten)
  const nogNietBegonnenOpzij = nogNietBegonnen.reduce(
    (som, p) => som + (opzijViaDoel.get(p.id) ?? opzijPerMaand(p)),
    0,
  )
  // Dezelfde types als `BUFFERTYPES` in utils/buffer.ts, en om dezelfde reden: alleen
  // geld dat je vrij kan gebruiken telt als buffer.
  const heeftSpaarOfCash = rekeningen.some((r) => !r.gearchiveerd && (r.type === 'spaar' || r.type === 'cash'))
  // Het jaarbedrag uit de ORIGINELE bedragen, niet uit het afgeronde maandbedrag.
  // Een jaarabonnement van € 100 werd anders € 8,33 × 12 = € 99,96 — vier cent te
  // weinig, en dat is precies het soort cijfer dat nageteld wordt.
  const sluipendPerJaar = sluipend.reduce((som, p) => som + (-p.bedrag * 12) / intervalVan(p), 0)

  // Hoeveel vangnetten zijn er, en werken ze nog?
  //
  // ⚠ Geteld op wat er GEBEURD is, niet op wat er aanstaat (nakijkronde ronde 63).
  // De eerste versie telde `verbonden` mee, en dat is een schakelaar: een verbinding
  // die stilviel bleef het blok afvinken terwijl er al maanden niets vertrok. En een
  // vangnet dat ouder is dan de herinneringstermijn telt niet meer mee — anders zegt
  // dit blok "je hebt alles ingevuld" terwijl het belletje ernaast roept dat je
  // laatste back-up zevenhonderd dagen oud is.
  const veiligVandaag = veilig?.vandaagISO ?? vandaag()
  const veiligeNetten = veilig
    ? [veilig.laatsteSyncOp, veilig.laatsteBackupOp].filter((d) => versVangnet(d, veiligVandaag)).length
    : 0

  const blokken: { id: OpstellingBlok; teken: string; label: string; klaar: boolean; telling: number }[] = [
    { id: 'rekeningen', teken: '🏦', label: t('Je geld'), klaar: geldRekeningen.length > 0, telling: geldRekeningen.length },
    {
      id: 'openstaand',
      teken: '💳',
      label: t('Openstaand'),
      klaar: kredietRekeningen.length + openLeningen.length > 0,
      telling: kredietRekeningen.length + openLeningen.length,
    },
    { id: 'later', teken: '📈', label: t('Voor later'), klaar: laterRekeningen.length > 0, telling: laterRekeningen.length },
    {
      id: 'vast',
      teken: '🏠',
      label: t('Vaste lasten'),
      klaar: ingevuldKlassiek.length > 0,
      telling: ingevuldKlassiek.length,
    },
    {
      id: 'sluipend',
      teken: '📺',
      label: t('Sluipende lasten'),
      klaar: ingevuldSluipend.length > 0,
      telling: ingevuldSluipend.length,
    },
    { id: 'gezin', teken: '👨‍👧', label: t('Je gezin'), klaar: gezinsleden.length > 0, telling: gezinsleden.length },
    { id: 'delen', teken: '🧾', label: t('Delen'), klaar: dossiers.length > 0, telling: dossiers.length },
    // ⚠ Het achtste blok telt VANGNETTEN, geen ingevulde regels: Drive en een
    // back-upbestand. Blijvende opslag telt bewust NIET mee — die houdt je gegevens
    // vast in déze browser, en het hele punt van dit blok is dat er ook ergens
    // ánders een kopie staat. Eén vangnet volstaat om het blok af te vinken; de
    // teller laat zien dat er twee mogelijk zijn.
    ...(veilig
      ? [
          {
            id: 'veilig' as const,
            teken: '🛟',
            label: t('Veilig bewaren'),
            klaar: veiligeNetten > 0,
            telling: veiligeNetten,
          },
        ]
      : []),
  ]
  const klaar = blokken.filter((b) => b.klaar).length
  const tabs: Subtab<OpstellingBlok>[] = blokken.map((b) => ({
    id: b.id,
    teken: b.teken,
    label: b.label,
    telling: b.telling,
  }))


  /**
   * Welk voorstel staat er open in het invulvenster? (ronde 73)
   *
   * `lijst` reist mee omdat "Opslaan + volgende" naar het VOLGENDE voorstel springt dat
   * je nog niet ingevuld hebt — dat is wat de aanvinklijst snel maakt. `bewerken` is
   * gezet wanneer je een bestaande kost opent in plaats van er een toe te voegen.
   */
  const [formulier, setFormulier] = useState<{
    /** Null wanneer je een bestaande kost bewerkt: dan komt alles uit het record zelf. */
    voorstel: Kostvoorstel | null
    lijst: Kostvoorstel[]
    bewerken: TerugkerendePost | null
  } | null>(null)
  // Verhoogt na elke geslaagde opslag, zodat de popup het formulier weer als leeg telt
  // en je na "Opslaan + volgende" niet hoeft te bevestigen om iets leegs te sluiten.
  const [schoonNa, setSchoonNa] = useState(0)
  /** De bevestiging die BINNEN het invulvenster hoort te staan. Zie `bewaarUitFormulier`. */
  const [vensterMelding, setVensterMelding] = useState<string | null>(null)
  /**
   * De post waarover de verwijdervraag gaat (ronde 76), of null.
   *
   * ⚠ EEN ID EN GEEN KOPIE (doorlichting ronde 76), net als `lidWegId` in
   * KinderenSectie. De app haalt elke 45 seconden stil nieuwe gegevens op; met een
   * bevroren kopie kon het venster over een record hangen dat intussen elders
   * gewijzigd of gewist was — en gaf "Liever opzeggen" die verouderde momentopname
   * aan het invulvenster, dat ze dan over de nieuwere versie heen schrijft.
   */
  const [wegPostId, setWegPostId] = useState<string | null>(null)
  const wegPost = terugkerendePosten.find((p) => p.id === wegPostId) ?? null

  /**
   * Het kruisje van deze twee lijsten: eerst kijken of er iets aan hangt.
   *
   * ⚠ Één functie voor allebei de lijsten (vaste lasten én sluipende lasten), en
   * dezelfde regel als op Budget → Vast: hangt er niets aan, dan wist ze meteen —
   * precies zoals voorheen, met de ongedaan-balk als vangnet. Hangt er wél iets aan,
   * dan komt het venster ertussen. Zie `utils/vastelastverwijdering.ts`.
   */
  function vraagOfVerwijder(post: TerugkerendePost) {
    if (!onVastePostVerwijderen) return
    if (hangtErIetsAan(post.id, { transacties, spaardoelen })) {
      // Een oude foutmelding hoort niet achter het venster te blijven staan (regel uit
      // de tweede doorlichting van ronde 68, hier overgenomen).
      opslag.wis()
      setWegPostId(post.id)
      return
    }
    void opslag.probeer(() => onVastePostVerwijderen(post.id))
  }

  /**
   * Het invulvenster openen. Eén plek, zodat de bevestiging van de vorige kost niet
   * blijft staan boven een leeg formulier voor een volgende.
   */
  function openVenster(volgend: { voorstel: Kostvoorstel | null; lijst: Kostvoorstel[]; bewerken: TerugkerendePost | null }) {
    setVensterMelding(null)
    setFormulier(volgend)
  }

  /**
   * De rekening waar een nieuwe vaste last aan hangt.
   *
   * Alleen ACTIEVE rekeningen: een vaste last aan een afgesloten rekening hangen
   * betekent dat ze nooit als betaald herkend wordt en elke maand achterstallig blijft
   * staan. En bij voorkeur een BETAALrekening — `standaardRekening` geeft de rekening
   * terug waarop je het laatst boekte, en deed je dat toevallig op je spaarrekening,
   * dan hingen hier je twintig vaste lasten aan je spaarboekje.
   */
  const betaalRekeningen = actieveRekeningen.filter((r) => (r.type ?? 'betaal') === 'betaal' || r.type === 'cash')
  const voorkeurRekening = standaardRekening(betaalRekeningen.length > 0 ? betaalRekeningen : actieveRekeningen)

  /**
   * Het volgende voorstel uit dezelfde lijst waar nog niets onder staat.
   *
   * ⚠ "Een andere sluipende last" telt hier NIET mee (ronde 84). "Opslaan + volgende"
   * loopt de aanvinklijst af — dat is een lijst met dingen die je al dan niet hebt. Die
   * rij is geen vraag ("heb je Netflix?") maar een uitnodiging ("is er nog iets?"), en
   * daar hoor je zelf naartoe te gaan, niet in te rollen na je laatste abonnement.
   *
   * ⚠ STA JE ER ZELF OP, DAN BLIJF JE EROP (ronde 84, doorlichting). Anders was er geen
   * volgende, sloot het venster, en deed "Opslaan + volgende" op die ene rij exact
   * hetzelfde als "Toevoegen" — twee knoppen naast elkaar met dezelfde uitwerking. Het
   * formulier maakt zichzelf na elke opslag leeg, dus je kan meteen aan het tweede
   * onbekende abonnement beginnen. Precies waar die knop voor dient.
   */
  function volgendVoorstel(lijst: Kostvoorstel[], na: Kostvoorstel): Kostvoorstel | null {
    if (na.vrijeNaam) return na
    const i = lijst.findIndex((v) => v.sleutel === na.sleutel)
    if (i < 0) return null
    return (
      lijst
        .slice(i + 1)
        .find((v) => v.sleutel !== SLUIPEND_ANDERS.sleutel && postenVan(v, ingevuld).length === 0) ?? null
    )
  }

  async function bewaarUitFormulier(post: TerugkerendePost) {
    await onVastePost(post)
    const zin = t('{naam} bewaard: {bedrag} {periode}.', {
      naam: post.omschrijving,
      bedrag: formatEuro(Math.abs(post.bedrag)),
      periode: t(PERIODE_SLEUTELS[post.frequentie ?? 'maand']),
    })
    setMelding(zin)
    // ⚠ TWEE KEER DEZELFDE ZIN, en dat is nodig (ronde 73, doorlichting). De melding
    // hierboven staat op de PAGINA. Blijft het venster openstaan na "Opslaan + volgende",
    // dan ligt die zin eronder: onzichtbaar achter de laag, en voor een schermlezer
    // helemaal weg — een popup met `aria-modal` verbergt alles erbuiten. Je zag dan
    // alleen een leeg bedragveld, wat er precies uitziet als "er is niets gebeurd".
    setVensterMelding(zin)
  }


  return (
    <section className="stapel">
      <PaginaKop
        titel={t('Je situatie')}
        bijschrift={t('Breng in kaart wat er vastligt. Loop de blokken door die op jou van toepassing zijn — je mag er elk overslaan en later terugkomen.')}
      />

      {/* ⚠ RONDE 66. Een gloednieuwe app landt HIER (zie `beginpagina` in App.tsx),
          maar het welkom stond op Overzicht — een pagina die zo iemand op dat moment
          niet ziet. En de enige zin die zei waar je moest beginnen, stond helemaal
          ONDERAAN deze pagina, voorbij alle acht blokken. Allebei staan ze nu waar je
          landt, boven de vouw. */}
      {/* ⚠ `actieveRekeningen` en niet de kale lijst (ronde 66, slotronde): wie al zijn
          rekeningen archiveert heeft er geen enkele meer om op te boeken, en de rest van
          dit scherm rekent ook met de actieve lijst. Drie maatstaven voor hetzelfde
          begrip is precies hoe schermen elkaar gaan tegenspreken. */}
      {actieveRekeningen.length === 0 && <EersteStap hier onNaarRekeningen={() => naarBlok('rekeningen')} />}

      {/* Het slotscherm staat BOVENAAN en groeit live mee. Zo zie je je eigen beeld
          ontstaan terwijl je invult, in plaats van pas aan het eind — en geen van
          deze vier cijfers heeft één transactie nodig. */}
      <Kaart titel={t('Dit is je situatie')} data-situatie>
        {/* Doorklikken alleen waar de bestemming het cijfer ook echt toont (ronde 48).
            "Netto vermogen" staat voluit op het Overzicht (VermogenRegel): rekeningen
            plus bezit min leningen, precies dezelfde som. "Vaste lasten per maand" en
            "Waarvan sluipend" krijgen GEEN knop: de blokken hieronder zijn
            aanvinklijsten met voorstellen, geen uitsplitsing met bedragen, en op de
            Budget-pagina staat een gelijkaardig label met een ánder getal ("deze
            maand" in plaats van "gemiddeld per maand"). Een knop die belooft te tonen
            waaruit een bedrag bestaat en dat niet doet, is erger dan geen knop. */}
        <div className="tegelrij">
          {/* RONDE 69 — de herkomstzinnen. De opmerking hierboven legde al uit waarom
              deze twee tegels geen knop krijgen, maar dat stond alleen in de broncode:
              op het scherm zag je "Vaste lasten per maand € 840" hier en "Vaste lasten
              deze maand € 610" op Budget, en niets zei dat het twee verschillende
              vragen zijn. Nu staat het verschil onder het cijfer. */}
          {/* ⚠ De zin hangt aan DEZELFDE voorwaarde als het cijfer. Dit is het eerste
              scherm van een verse app: vier streepjes met samen ruim vijfhonderd
              tekens uitleg over hoe cijfers berekend worden die er nog niet zijn, is
              precies het "te veel op één scherm" waar deze reeks vanaf wil. Zodra er
              een bedrag staat, staat de zin erbij. */}
          <Stat
            label={t('Vaste lasten per maand')}
            bron={
              buffer.vasteLastenPerMaand > 0 || nogNietBegonnenPerMaand > 0
                ? [
                    buffer.vasteLastenPerMaand > 0
                      ? t(
                          'Omgerekend naar één maand: een jaarpremie van € 1.200 telt hier als € 100. Op Budget staat daarnaast wat er in déze maand effectief vervalt — bij een post per kwartaal of per jaar is dat een ander bedrag.',
                        )
                      : '',
                    nogNietBegonnenPerMaand > 0
                      ? (nogNietBegonnen.length === 1
                          ? t('{bedrag} telt hier nog niet mee: die kost begint pas later.', {
                              bedrag: formatEuro(nogNietBegonnenPerMaand),
                            })
                          : t('{bedrag} telt hier nog niet mee: die kosten beginnen pas later.', {
                              bedrag: formatEuro(nogNietBegonnenPerMaand),
                            })) +
                        // ⚠ Zet je er wél al voor opzij, dan gáát dat geld elke maand
                        // weg — en dan staat er op Budget een bedrag dat deze tegel
                        // niet kent. Zwijgen zou twee schermen laten tegenspreken.
                        (nogNietBegonnenOpzij > 0
                          ? ' ' +
                            t('Je zet er wel al {bedrag} per maand voor opzij; dat staat op Budget.', {
                              bedrag: formatEuro(nogNietBegonnenOpzij),
                            })
                          : '')
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : undefined
            }
          >
            {buffer.vasteLastenPerMaand > 0 ? formatEuro(buffer.vasteLastenPerMaand) : '—'}
          </Stat>
          {/* ⚠ RONDE 84, doorlichting — DRIE DINGEN IN ÉÉN ZIN, en alle drie waren ze
              stuk. (1) Het woord "sluipend" werd nergens uitgelegd op de plek waar je
              het voor het eerst leest. (2) "in een van die categorieën" verwees naar
              categorieën die nergens op dit scherm genoemd worden. (3) De zin klopte
              niet: sinds deze ronde telt óók het voorstel waarop je klikte mee, ook
              zonder categorie. En stond er een streepje omdat je enige abonnement pas
              volgend jaar begint, dan zei niets waarom. */}
          <Stat
            label={t('Waarvan sluipend')}
            bron={
              sluipendPerMaand > 0
                ? t('Sluipende lasten zijn de kleine abonnementen waar je niet meer naar omkijkt. Meegeteld: alles wat je hieronder bij “Je sluipende lasten” toevoegde, plus elke andere vaste last die op een abonnementscategorie staat — streaming, fitness, krant, cloudopslag en dergelijke.')
                : ingevuldSluipend.length > 0
                  ? t('Je sluipende lasten beginnen pas later. Zodra de eerste betaling er is, staat hier een bedrag.')
                  : undefined
            }
          >
            {sluipendPerMaand > 0 ? formatEuro(sluipendPerMaand) : '—'}
          </Stat>
          {/* ⚠ RONDE 69 — TELFOUT. Hier stond `t('{n} maanden', …)` zonder
              enkelvoudsgeval, dus tussen 1,0 en 1,09 maand las je "1 maanden".
              `BufferRegel` vangt exact dat geval al op, met exact dezelfde cijfers:
              hetzelfde getal, twee schermen, twee uitkomsten. En `.replace('.', ',')`
              zette er ook in het Engels een decimale komma neer ("5,2 months");
              `toLocaleString(opmaakLocale())` doet dat in elke taal juist. */}
          <Stat
            label={t('Zo lang kom je toe')}
            bron={
              buffer.bruikbaar && buffer.maanden !== null
                ? t('Je spaar- en cashrekeningen gedeeld door je vaste lasten per maand. Eten, tanken en andere losse uitgaven komen daar nog bij.')
                : undefined
            }
          >
            {buffer.bruikbaar && buffer.maanden !== null
              ? (() => {
                  const m = Math.floor(buffer.maanden * 10) / 10
                  return m === 1 ? t('1 maand') : t('{n} maanden', { n: m.toLocaleString(opmaakLocale()) })
                })()
              : '—'}
          </Stat>
          <Stat
            label={t('Netto vermogen')}
            bron={
              rekeningen.length > 0 || leningen.length > 0
                ? t('Je rekeningen, plus wat men jou nog schuldig is, min wat jij nog schuldig bent. Alleen het openstaande kapitaal van een lening; de interest komt daar nog bij.')
                : undefined
            }
            doorklik={
              rekeningen.length > 0 || leningen.length > 0
                ? {
                    naam: t('Netto vermogen {bedrag} — bekijk het op je overzicht', {
                      bedrag: formatEuro(vermogen),
                    }),
                    naar: () => onNaarPagina('overzicht'),
                  }
                : undefined
            }
          >
            {rekeningen.length > 0 || leningen.length > 0 ? formatEuro(vermogen) : '—'}
          </Stat>
        </div>

        {/* Een streepje bij "Zo lang kom je toe" is geen fout, maar zonder uitleg
            lijkt het er wel op: het cijfer heeft een spaarrekening of cash nodig (zie
            BUFFERTYPES in utils/buffer.ts). Wie alleen een zichtrekening heeft, zag
            daar anders voor altijd een streepje zonder te weten waarom. */}
        {/* ⚠ RONDE 66. Hier stond `buffer.vasteLastenPerMaand > 0` bij, waardoor deze
            uitleg alleen verscheen als je AL vaste lasten had — dus niet bij de
            gebruiker die net begint en zich afvraagt waarom daar een streepje staat.
            Precies omgekeerd aan waar ze voor dient. */}
        {/* ⚠ RONDE 71: twee redenen, twee zinnen. `bruikbaar` is onwaar zodra er géén
            spaar-/cashrekening is OF er geen lopende vaste lasten zijn. Sinds deze
            ronde valt een kost die pas later begint in die tweede groep — en dan
            vroeg dit scherm je een spaarrekening toe te voegen die je al had. */}
        {!buffer.bruikbaar && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {buffer.beschikbaar === 0 && !heeftSpaarOfCash
              ? t('Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig. Voeg er een toe bij "Je geld".')
              : nogNietBegonnenPerMaand > 0
                ? t('Je vaste lasten beginnen pas later. Zodra de eerste betaling er is, staat hier hoelang je toekomt.')
                : t('Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig, én vaste lasten om ze tegen af te zetten.')}
          </p>
        )}

        {sluipendPerMaand > 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Je sluipende lasten zijn {maand} per maand, oftewel {jaar} per jaar.', {
              maand: formatEuro(sluipendPerMaand),
              jaar: formatEuro(Math.round(sluipendPerJaar)),
            })}
          </p>
        )}

        <Balk label={t('Ingevulde blokken')} fractie={klaar / blokken.length} nu={klaar} max={blokken.length} />
        <p className="rij-meta" style={{ margin: 0 }} role="status">
          {klaar === blokken.length
            ? t('Je hebt alle blokken ingevuld. Je kan hier altijd terugkomen om iets bij te werken.')
            : t('{klaar} van {totaal} blokken ingevuld. Wat je overslaat, kan je later nog aanvullen.', {
                klaar,
                totaal: blokken.length,
              })}
        </p>
        {rekeningen.length > 0 && (
          <div className="knoprij">
            <button type="button" className="knop knop-secundair" onClick={() => onNaarPagina('overzicht')}>
              {t('Naar je overzicht')}
            </button>
          </div>
        )}
      </Kaart>

      <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />

      {melding && (
        <p className="rij-meta" role="status" style={{ margin: 0 }}>
          {melding}
        </p>
      )}

      <Subtabs naam="opstelling" tabs={tabs} actief={blok} onKies={setBlok} label={t('Onderdeel')}>
        {blok === 'rekeningen' && (
          <Kaart
            titel={t('Waar staat je geld?')}
            bijschrift={t('Je betaalrekening, je spaarrekening, je portemonnee. Voeg ze één voor één toe; het formulier blijft staan.')}
          >
            {geldRekeningen.length === 0 ? (
              <Leeg>{t('Nog geen rekeningen. Begin met de rekening waar je loon op komt.')}</Leeg>
            ) : (
              <ul className="lijst">
                {geldRekeningen.map((r) => (
                  <li key={r.id} className="rij">
                    <span className="rij-midden rij-titel">{r.naam}</span>
                    <span className="rij-acties">{formatEuro(saldoNu(r))}</span>
                  </li>
                ))}
              </ul>
            )}
            <hr className="scheiding" />
            <RekeningFormulier onOpslaan={onRekening} />
          </Kaart>
        )}

        {blok === 'openstaand' && (
          <div className="stapel">
            <Kaart
              titel={t('Een kredietkaart of kredietopening?')}
              bijschrift={t('Kies bij Type "Kredietkaart". Vul bij het bedrag in wat er nog openstaat, als een gewoon positief getal, en bij de limiet hoeveel je maximaal mag opnemen.')}
            >
              {kredietRekeningen.length === 0 ? (
                <Leeg>{t('Nog geen kredietkaart ingegeven.')}</Leeg>
              ) : (
                <ul className="lijst">
                  {kredietRekeningen.map((r) => (
                    <li key={r.id} className="rij">
                      <span className="rij-midden rij-titel">{r.naam}</span>
                      {/* Een kaart toont wat er OPENSTAAT, niet een negatief saldo. */}
                      <span className="rij-acties">{formatEuro(kaartbedragUitOpslag(saldoNu(r)))}</span>
                    </li>
                  ))}
                </ul>
              )}
              <hr className="scheiding" />
              {/* Het formulier begint hier op "Kredietkaart": wie het keuzemenu
                  overslaat, zag zijn kaart anders stil bij "Je geld" opduiken. */}
              <RekeningFormulier onOpslaan={onRekening} beginType="krediet" />
            </Kaart>

            <Kaart
              titel={t('Een lening, hypotheek of autofinanciering?')}
              bijschrift={t('Wat je nog moet terugbetalen, gaat af van je vermogen. Wat je hebt uitgeleend, komt erbij.')}
            >
              {openLeningen.length === 0 ? (
                <Leeg>{t('Nog geen leningen ingegeven.')}</Leeg>
              ) : (
                <ul className="lijst">
                  {openLeningen.map((l) => (
                    <li key={l.id} className="rij">
                      <span className="rij-midden rij-titel">{l.naam}</span>
                      <span className="rij-acties">{formatEuro(openstaandKapitaal(l, aflossingen))}</span>
                    </li>
                  ))}
                </ul>
              )}
              <hr className="scheiding" />
              {/* Twee formulieren op één scherm, dus maar één gevulde knop: de
                  rekening hierboven houdt de gevulde, de lening krijgt de omlijnde.
                  Zie DESIGN.md, regel 2. */}
              <LeningFormulier onOpslaan={onLening} gezinsleden={gezinsleden} secundaireKnop />
            </Kaart>
          </div>
        )}

        {blok === 'later' && (
          <Kaart
            titel={t('Wat staat er voor later?')}
            bijschrift={t('Beleggingen, een termijnrekening, pensioensparen. Kies bij Type "Effectenrekening" of "Termijnrekening"; je kan de waarde later bijwerken bij de rekening zelf.')}
          >
            {laterRekeningen.length === 0 ? (
              <Leeg>{t('Nog niets voor later ingegeven.')}</Leeg>
            ) : (
              <ul className="lijst">
                {laterRekeningen.map((r) => (
                  <li key={r.id} className="rij">
                    <span className="rij-midden rij-titel">{r.naam}</span>
                    <span className="rij-acties">{formatEuro(saldoNu(r))}</span>
                  </li>
                ))}
              </ul>
            )}
            <hr className="scheiding" />
            {/* Begint op "Effectenrekening"; wie een termijnrekening heeft, zet het
                keuzemenu één stap verder. */}
            <RekeningFormulier onOpslaan={onRekening} beginType="effecten" />
          </Kaart>
        )}

        {blok === 'vast' && (
          <KostenLijst
            titel={t('Je vaste lasten')}
            uitleg={t('Klik op een kost om te zien wat je al hebt, of voeg er een toe. Het invulvenster vraagt alles in één keer.')}
            voorstellen={KLASSIEKE_VASTE_KOSTEN}
            posten={ingevuld}
            t={t}
            onToevoegen={(voorstel, lijst) => openVenster({ voorstel, lijst, bewerken: null })}
            onWijzig={(post, voorstel, lijst) => openVenster({ voorstel, lijst, bewerken: post })}
            onVerwijder={onVastePostVerwijderen ? vraagOfVerwijder : undefined}
            onNaarBudget={() => (onNaarBudget ? onNaarBudget('vast') : onNaarPagina('budget'))}
            heeftRekening={actieveRekeningen.length > 0}
            onNaarRekeningen={() => naarBlok('rekeningen')}
          />
        )}

        {blok === 'sluipend' && (
          <KostenLijst
            titel={t('Je sluipende lasten')}
            uitleg={t('De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt.')}
            // ⚠ RONDE 84 — de rij "Een andere sluipende last" hangt er onderaan bij, en
            // staat bewust NIET in `SLUIPENDE_KOSTEN` zelf: ze is geen voorstel maar een
            // uitnodiging, en ze hoort niet mee te tellen in "je vulde er 3 van de 18 in".
            voorstellen={[...SLUIPENDE_KOSTEN, SLUIPEND_ANDERS]}
            posten={ingevuld}
            t={t}
            onToevoegen={(voorstel, lijst) => openVenster({ voorstel, lijst, bewerken: null })}
            onWijzig={(post, voorstel, lijst) => openVenster({ voorstel, lijst, bewerken: post })}
            onVerwijder={onVastePostVerwijderen ? vraagOfVerwijder : undefined}
            onNaarBudget={() => (onNaarBudget ? onNaarBudget('vast') : onNaarPagina('budget'))}
            heeftRekening={actieveRekeningen.length > 0}
            onNaarRekeningen={() => naarBlok('rekeningen')}
          />
        )}

        {blok === 'gezin' && (
          <KinderenSectie
            kinderen={gezinsleden}
            onToevoegen={onKindToevoegen}
            onWijzigen={onKindWijzigen}
            onVerwijderen={onKindVerwijderen}
            telGebruik={telGezinslidGebruik}
          />
        )}

        {blok === 'delen' && (
          <Kaart
            titel={t('Deel je kosten met iemand?')}
            bijschrift={t('Bijvoorbeeld met de andere ouder van je kinderen. Kompal houdt dan bij wie wat betaalde en rekent het voor je af.')}
          >
            {dossiers.length === 0 ? (
              <Leeg>{t('Nog geen dossiers. Maak er hieronder een aan, of sla dit blok over.')}</Leeg>
            ) : (
              <ul className="lijst">
                {dossiers.map((d) => (
                  <li key={d.id} className="rij">
                    <span className="rij-midden rij-titel">{d.naam}</span>
                    <span className="rij-acties">{t('{n}% voor jou', { n: d.aandeelJij })}</span>
                  </li>
                ))}
              </ul>
            )}
            <hr className="scheiding" />
            <DossierFormulier onOpslaan={onDossier} />
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Uitgeleend geld en aankopen met garantie horen ook bij Dossiers.')}{' '}
              <button type="button" className="knop knop-ghost knop-klein" onClick={() => onNaarPagina('dossiers')}>
                {t('Naar Dossiers')}
              </button>
            </p>
          </Kaart>
        )}
        {blok === 'veilig' && veilig && (
          <div className="stapel">
            <Kaart
              titel={t('Waar staan je gegevens?')}
              bijschrift={t('Kompal bewaart alles in deze browser, op dit toestel. Dat is de reden dat je geen account nodig hebt — en meteen ook de reden dat je er zelf een kopie van moet hebben.')}
            >
              <p className="rij-meta" style={{ margin: 0 }}>
                {t(
                  'Een browser die opgeruimd wordt, een toestel dat stukgaat of verloren raakt: dan is alles weg. Er zijn twee vangnetten, en één ervan volstaat. Google Drive doet het vanzelf; een back-upbestand doe je zelf, en dat werkt ook zonder Google.',
                )}
              </p>
            </Kaart>

            {/* Op het beginscherm zetten staat hier bewust bij: een app die op je
                beginscherm staat, wordt door de browser veel minder snel opgeruimd. */}
            <InstallerenKaart />

            <DriveKaart
              verbonden={veilig.verbonden}
              bezig={veilig.bezig}
              laatsteSyncOp={veilig.laatsteSyncOp}
              onVerbind={veilig.onVerbind}
              onSynchroniseer={veilig.onSynchroniseer}
            />

            <BackupKaart
              backupTekst={veilig.backupTekst}
              backupIsFout={veilig.backupIsFout}
              onExporteer={veilig.onExporteer}
              onHerstel={veilig.onHerstel}
              laatsteBackupOp={veilig.laatsteBackupOp}
              opslag={veilig.opslag}
            />
          </div>
        )}
      </Subtabs>

      {/* De tip die hier stond, is naar BOVEN verhuisd (ronde 66): ze zei waar je
          moest beginnen, en stond zelf voorbij alles wat je moest doorlopen. Ze zit
          nu in de welkomstkaart bovenaan deze pagina. */}

      {/* ⚠ RONDE 73 — HET INVULVENSTER. Eén formulier voor de hele app: exact hetzelfde
          dat op Budget → Vast staat, hier alleen vooraf ingevuld met de naam, de
          categorie, het ritme en de rekening van het voorstel waarop je klikte. Daarmee
          verdwijnt de tweede invoerweg die naast Budget → Vast was ontstaan, met haar
          eigen — en soms andere — regels.

          `key` op het voorstel: springt "Opslaan + volgende" naar de volgende kost, dan
          bouwt React het formulier opnieuw op met de nieuwe beginwaarden. Zonder die
          sleutel blijft de oude naam staan, want beginwaarden zijn bewust een
          vertrekpunt en geen koppeling. */}
      {formulier && (
        <Dialoog
          titel={
            formulier.bewerken
              ? // ⚠ RONDE 82 — mét het kenmerk bij een naamgenoot. Klikte je "Bewerken"
                // op één van twee identieke rijen, dan opende er een venster dat alleen
                // "Autoverzekering wijzigen" zei. Het risico is hier groter dan bij
                // verwijderen: dat heeft een ongedaan-balk, een bewerkscherm overschrijft.
                t('{naam} bewerken', { naam: postNaamMetKenmerk(t, formulier.bewerken, terugkerendePosten) })
              : // ⚠ RONDE 84, doorlichting — DE VRIJE RIJ KRIJGT EEN EIGEN KOP. Met de
                // gewone vorm las de kop "Een andere sluipende last toevoegen", en in het
                // Engels en het Frans werd dat "Add Another small subscription" /
                // "Ajouter Un autre petit abonnement": een hoofdletter middenin en een
                // rijnaam die als voorwerp gebruikt wordt terwijl hij als uitnodiging
                // geschreven is. Twee van de drie talen stonden er verkeerd.
                formulier.voorstel?.vrijeNaam
                ? t('Een abonnement toevoegen')
                : t('{naam} toevoegen', { naam: t(formulier.voorstel?.naam ?? '') })
          }
          open
          bewaakInvoer
          schoonNa={schoonNa}
          onSluiten={() => setFormulier(null)}
        >
          {/* ⚠ BINNEN het venster, want een popup met `aria-modal` verbergt alles
              erbuiten — zie `bewaarUitFormulier`. Staat er niets, dan staat er ook geen
              lege alinea: een `role="status"` die pas mét zijn tekst verschijnt, wordt
              betrouwbaarder voorgelezen dan een leeg vak dat later gevuld wordt. */}
          {vensterMelding && (
            <p className="leeg" role="status" style={{ padding: '0 0 12px', textAlign: 'left' }}>
              {vensterMelding}
            </p>
          )}
          {/* ⚠ RONDE 84, doorlichting — HET VENSTER ZWEEG OVER ZIJN EIGEN AFSPRAAK. Bij
              elk gewoon voorstel staat de naam al ingevuld en zie je meteen wat er van je
              verwacht wordt; hier stond alles leeg, inclusief de categorie, zonder één
              woord waarom. En wat de app achter de schermen onthoudt — dat je dit als
              sluipende last opgaf, ook als je later een andere categorie kiest — was
              nergens te zien. Nu staat het er, vóór je begint. */}
          {formulier.voorstel?.vrijeNaam && !formulier.bewerken && (
            <p className="rij-meta" style={{ margin: '0 0 12px' }}>
              {t('Geef je abonnement een naam en een bedrag. Een categorie kiezen mag, maar hoeft niet: wat je hier toevoegt telt sowieso mee bij je sluipende lasten.')}
            </p>
          )}
          <TerugkerendePostFormulier
            key={formulier.bewerken ? formulier.bewerken.id : (formulier.voorstel?.sleutel ?? 'nieuw')}
            rekeningen={actieveRekeningen}
            categorieen={categorieen}
            soort="uitgave"
            bewerken={formulier.bewerken}
            bestaande={ingevuld}
            // Bij de EERSTE opening zet de popup de cursor zelf in het eerste veld; deze
            // vlag telt pas wanneer "Opslaan + volgende" het formulier hermonteert.
            focusBijStart
            beginwaarden={
              formulier.voorstel
                ? {
                    // ⚠ RONDE 84 — bij "Een andere sluipende last" is de naam een KOP en
                    // geen antwoord: die moet je juist zelf invullen. En dan blijft ook de
                    // categorie leeg, want de app raadt niet welk abonnement je bedoelt —
                    // `bronVoorstel` hieronder draagt al dat het een sluipende last is.
                    omschrijving: formulier.voorstel.vrijeNaam ? '' : t(formulier.voorstel.naam),
                    categorieId: formulier.voorstel.categorieId,
                    frequentie: formulier.voorstel.frequentie ?? 'maand',
                    // De dag van VANDAAG en niet de 1e: met dag 1 stond élke post die je
                    // hier invult meteen als ACHTERSTALLIG in je vooruitblik en in het
                    // belletje — je doet deze opstelling zelden op de eerste van de
                    // maand. Hoogstens 28, want 29 tot 31 bestaan niet in februari.
                    dag: Math.min(Number(vandaag().slice(8, 10)), 28),
                    // ⚠ De VOLGENDE maand, niet deze (ronde 73, doorlichting). Tien van
                    // de klassieke voorstellen zijn jaarposten. Stond de eerste betaling
                    // op de lopende maand, dan viel de volle jaarpremie meteen vandaag:
                    // ze verscheen op slag in je vooruitblik, in "Vaste lasten deze
                    // maand" en in het belletje als nog niet geboekt — voor een premie
                    // die je in maart betaalt. Dit was ook de standaard vóór deze ronde.
                    // Voor een maandelijkse post doet dit veld niets; het wordt dan niet
                    // eens weggeschreven.
                    startMaand: verschuifMaand(huidigeMaand(), 1),
                    ...(voorkeurRekening ? { rekeningId: voorkeurRekening } : {}),
                    bronVoorstel: formulier.voorstel.sleutel,
                  }
                : undefined
            }
            onOpslaan={bewaarUitFormulier}
            onOpgeslagen={({ blijfOpen }) => {
              setSchoonNa((n) => n + 1)
              if (!blijfOpen) {
                setFormulier(null)
                return
              }
              // "Opslaan + volgende" loopt de lijst af: naar het eerstvolgende voorstel
              // waar nog niets onder staat.
              //
              // ⚠ Is er geen volgende, dan SLUIT het venster (ronde 73, doorlichting).
              // Het bleef eerst openstaan op hetzelfde voorstel, met dezelfde titel en
              // een leeg bedragveld — en dat is niet te onderscheiden van "er is niets
              // gebeurd". De bevestiging staat dan op de pagina, waar je ze ook ziet.
              const huidig = formulier.voorstel
              const volgende = huidig ? volgendVoorstel(formulier.lijst, huidig) : null
              if (!volgende) {
                setFormulier(null)
                return
              }
              setFormulier({ ...formulier, voorstel: volgende, bewerken: null })
            }}
          />
        </Dialoog>
      )}

      {/* De vraag vóór het verwijderen (ronde 76). Eén venster voor allebei de
          lijsten op deze pagina, en hetzelfde venster als op Budget → Vast.

          "Liever opzeggen" opent het gewone invulvenster op deze bestaande kost;
          daar staat "Loopt tot en met". Bewust zonder voorstel en zonder lijst: je
          bewerkt een bestaand record, dus alle waarden komen uit het record zelf en
          er is geen "volgende kost" om naartoe te springen. */}
      {onVastePostVerwijderen && (
        <VasteLastWeg
          post={wegPost}
          onSluiten={() => setWegPostId(null)}
          onVerwijderen={onVastePostVerwijderen}
          // ⚠ Alleen wanneer er een rekening is (doorlichting ronde 76): zonder
          // rekening staat het invulvenster er met een lege rekeningkeuze, en dan
          // stuurt de knop je naar een formulier dat je niet kan opslaan. Dezelfde
          // grendel als op Budget → Vast, zodat de twee schermen niet uit elkaar lopen.
          onOpzeggen={
            actieveRekeningen.length > 0
              ? (post) => {
                  setWegPostId(null)
                  openVenster({ voorstel: null, lijst: [], bewerken: post })
                }
              : undefined
          }
          telGebruik={(id) => telVasteLastGebruik(t, id, { transacties, spaardoelen })}
        />
      )}
    </section>
  )
}
