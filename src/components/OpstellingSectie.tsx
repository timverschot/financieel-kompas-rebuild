import { useEffect, useRef, useState } from 'react'
import type {
  Aflossing,
  Dossier,
  Frequentie,
  Gezinsrol,
  Kind,
  Lening,
  Overboeking,
  Rekening,
  TerugkerendePost,
  Transactie,
  Waardering,
} from '../data/schema'
import { KLASSIEKE_VASTE_KOSTEN, SLUIPENDE_KOSTEN, type Kostvoorstel } from '../data/opstelling'
import { nieuwId } from '../data/sync/id'
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
import { bepaalBuffer } from '../utils/buffer'
import { nettoVermogen } from '../utils/vermogen'
import { openstaandKapitaal } from '../utils/lening'
import { saldoVanRekening, totaalSaldoVan } from '../utils/saldo'
import {
  isGestopt,
  maandbedrag,
  verschuifMaand,
  intervalVan,
  FREQUENTIES,
  INTERVAL_MAANDEN,
  PERIODE_SLEUTELS,
} from '../utils/vastelast'
import { frequentieNaam } from './TerugkerendePostFormulier'
import { kaartbedragUitOpslag } from '../utils/kredietkaart'
import { formatEuro, invoerNaarCenten } from '../utils/format'
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

/** De categorieën van de sluipende kosten, om ze in je vaste lasten terug te vinden. */
const SLUIPENDE_CATEGORIEEN = new Set(SLUIPENDE_KOSTEN.map((k) => k.categorieId))

function isSluipend(post: TerugkerendePost): boolean {
  return post.categorieId !== undefined && SLUIPENDE_CATEGORIEEN.has(post.categorieId)
}

/**
 * Eén regel uit een aanvinklijst: naam, bedrag, en klaar.
 *
 * Bewust zo weinig mogelijk velden. De dag, de rekening en de categorie vult de app
 * in; wie ze wil bijstellen doet dat later op de Budget-pagina. Vraag je hier alles,
 * dan is het geen aanvinklijst meer maar twintig keer hetzelfde formulier.
 */
/**
 * Hoe vaak een BESTAANDE post terugkomt, in woorden (ronde 70).
 *
 * Los van de keuze op de rij: die gaat over wat je nog gaat toevoegen, deze over wat
 * er al staat. Zonder `startMaand` kan `valtInMaand` het ritme niet plaatsen en
 * gedraagt de post zich als maandelijks — dan zegt de zin dat ook, in plaats van een
 * maand te verzinnen.
 *
 * ⚠ NIET geëxporteerd: dit is een componentbestand, en een losse export ernaast laat
 * de fast-refresh-regel van ESLint waarschuwen — dezelfde val als bij `naamMetBron`
 * in ronde 69. Ze wordt alleen hier gebruikt.
 */
function ritmeVan(t: Vertaler, post: TerugkerendePost): string {
  const f = post.frequentie ?? 'maand'
  if (f === 'maand') return frequentieNaam(t, 'maand')
  // ⚠ WEL de frequentie noemen, ook zonder startmaand. Hier stond eerst "Elke maand",
  // omdat `valtInMaand` zonder startmaand terugvalt op elke maand. Maar `maandbedrag`
  // deelt dan wél door drie, en op Budget → Vast heet diezelfde post "Om de 3
  // maanden" — dan zeggen twee schermen iets anders over één record. De app weet dat
  // het een kwartaalpost is; ze weet alleen niet wélke maanden.
  if (!post.startMaand) return t('{hoevaak}, vanaf een maand die je nog moet kiezen', { hoevaak: frequentieNaam(t, f) })
  return t('{hoevaak}, vanaf {maand}', {
    hoevaak: frequentieNaam(t, f),
    maand: maandJaarLabel(`${post.startMaand}-01`),
  })
}

function KostRegel({
  voorstel,
  t,
  bestaand,
  bezig,
  fout,
  velden,
  volgende,
  onToevoegen,
}: {
  voorstel: Kostvoorstel
  t: Vertaler
  /**
   * De post die er al staat, of `undefined`. Sinds ronde 70 een record en niet meer
   * een boolean.
   *
   * ⚠ WAAROM. De rij toont nu wat er geldt ("Eén keer per jaar, vanaf april 2026"),
   * en die zin kwam uit de LOKALE keuze van deze rij — dus ook op een rij waar je
   * niets gekozen had. Stond je autoverzekering al in de app met een andere
   * frequentie of een andere startmaand, dan beweerde het scherm iets over jouw post
   * dat het nooit gelezen had. De oude zin ("meestal één keer per jaar") beweerde
   * niets over jou; deze wel, en dan moet ze kloppen.
   */
  bestaand: TerugkerendePost | undefined
  bezig: boolean
  onToevoegen: (voorstel: Kostvoorstel, centen: number, frequentie: Frequentie, startMaand: string) => Promise<boolean>
  fout: string | null
  velden: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  volgende: string | null
}) {
  const alToegevoegd = bestaand !== undefined
  const [bedrag, setBedrag] = useState('')
  // RONDE 70 — JE KIEST ZELF HOE VAAK HET TERUGKOMT.
  //
  // De lijst dacht dit vóór je: de frequentie kwam uit het voorstel en de eerste
  // vervalmaand werd stil op VOLGENDE maand gezet. Voor de meeste posten klopte dat
  // toevallig, maar wie een driemaandelijkse factuur heeft die in februari valt, of
  // een halfjaarlijkse premie in maart, kreeg een ritme dat nergens op sloeg — en
  // zag dat pas maanden later, wanneer de vooruitblik het bedrag in de verkeerde
  // maand zette. De rekenkern kon het al (`valtInMaand` telt vanaf `startMaand`, dus
  // níét op kalenderkwartalen), en het Budget-formulier vraagt het ook al. Alleen
  // dit scherm besliste het.
  //
  // Het voorstel blijft het VERTREKPUNT — dat is de hele waarde van een
  // aanvinklijst — maar het is nu een voorstel en geen vaststelling.
  const [frequentie, setFrequentie] = useState<Frequentie>(voorstel.frequentie ?? 'maand')
  const [startMaand, setStartMaand] = useState(() => verschuifMaand(huidigeMaand(), 1))
  const [ritmeOpen, setRitmeOpen] = useState(false)
  const centen = invoerNaarCenten(bedrag)
  const periodiek = frequentie !== 'maand'
  const startGeldig = !periodiek || /^\d{4}-\d{2}$/.test(startMaand)
  const geldig = bedrag.trim().length > 0 && Number.isFinite(centen) && centen > 0 && startGeldig
  const veldId = `opstelling-${voorstel.sleutel}`
  // Niet 'jaar of maand': het type kent vier frequenties, en kwartaal/semester
  // kregen anders stil het woord "per maand" te zien (ronde 65).
  //
  // ⚠ Sinds ronde 70 volgt dit woord de KEUZE — en op een rij die er al staat, de
  // ECHTE post. Zonder dat laatste las één rij tegelijk "Elke maand" (uit het record)
  // en "per jaar" (uit het voorstel): het paneeltje is daar verborgen, dus de lokale
  // keuze werd nooit meer gecorrigeerd. Twee woorden over hetzelfde record, naast
  // elkaar op één regel.
  const effectieveFrequentie: Frequentie = bestaand ? (bestaand.frequentie ?? 'maand') : frequentie
  const periode = t(PERIODE_SLEUTELS[effectieveFrequentie])
  // De samenvatting op de rij. Bij een periodieke post hoort de eerste vervalmaand
  // erbij: zonder die maand zegt "om de 3 maanden" niet wélke drie.
  //
  // ⚠ `startGeldig` staat er niet voor de sier. Maak je het maandveld leeg, dan zou
  // `maandJaarLabel('-01')` er "januari 1900" van maken: `Number('')` is 0, en nul is
  // een geldig getal, dus de vangregel in `datum.ts` slaat niet aan. Een verzonnen
  // jaartal op het scherm is erger dan een open vraag.
  const ritme = !periodiek
    ? frequentieNaam(t, frequentie)
    : startGeldig
      ? t('{hoevaak}, vanaf {maand}', {
          hoevaak: frequentieNaam(t, frequentie),
          maand: maandJaarLabel(`${startMaand}-01`),
        })
      : t('{hoevaak}, vanaf een maand die je nog moet kiezen', { hoevaak: frequentieNaam(t, frequentie) })

  // Waarom de knop "Toevoegen" niet kan (huisregel sinds ronde 41, uitgerold in
  // ronde 61): een uitgeschakelde knop zonder reden laat je raden. De regel staat er
  // ALTIJD — leeg wanneer alles klopt — want een `role="status"` die pas mét zijn
  // tekst verschijnt, wordt door sommige schermlezers overgeslagen.
  const redenId = `${veldId}-reden`
  const reden = !startGeldig
    ? t('Kies eerst in welke maand de eerste betaling valt.')
    : bedrag.trim().length > 0 && !geldig
      ? t('Geef een bedrag groter dan nul.')
      : ''

  async function verzend() {
    if (!geldig || bezig) return
    const gelukt = await onToevoegen(voorstel, centen, frequentie, startMaand)
    // Alleen leegmaken wanneer het écht gelukt is. Wiste je het veld ook bij een
    // mislukking, dan tikt iemand zonder rekening twintig bedragen in en ziet ze
    // allemaal verdampen zonder te weten waarom.
    if (!gelukt) return
    setBedrag('')
    // De rij verdwijnt niet uit beeld, maar het veld wordt uitgeschakeld — dus de
    // focus zou naar <body> vallen en je zou na élke regel opnieuw van bovenaf naar
    // beneden moeten tabben. Ga daarom door naar het volgende bedragveld.
    if (volgende) velden.current[volgende]?.focus()
  }

  return (
    // `rij-kost` breekt op een telefoon af: naam op de eerste regel, bedrag en knop
    // op de tweede. Naast elkaar houdt de naamkolom op 393 px maar zo'n 55 px over,
    // en dan loopt "Hospitalisatieverzekering" dwars over het invoerveld. De
    // gebruikelijke controle op zijwaarts scrollen ziet dat NIET, want `.lijst`
    // heeft `overflow: hidden` — de tekst wordt afgekapt in plaats van de pagina te
    // verbreden.
    <li className="rij rij-kost rij-kost-invoer">
      <span className="rij-teken" aria-hidden="true">
        {voorstel.icoon}
      </span>
      <div className="rij-midden">
        <label className="rij-titel" htmlFor={veldId}>
          {t(voorstel.naam)}
        </label>
        {voorstel.toelichting && <span className="rij-meta">{t(voorstel.toelichting)}</span>}

        {/* RONDE 70. Eén rustige regel die zegt wat er nu geldt, en die je kan
            openklappen. De rij zelf blijft wat ze was — dit scherm is al het drukste
            van de app, en 37 rijen met elk een keuzelijst en een maandveld ernaast
            zou precies het "te veel tegelijk" opleveren waar deze reeks vanaf wil.

            ⚠ GEEN `aria-controls`. Dat attribuut mag alleen naar een element wijzen
            dat ECHT bestaat, en dit paneeltje bestaat alleen wanneer het openstaat —
            exact de fout die ronde 67 op dit scherm vond (zeven dode verwijzingen).
            `aria-expanded` zegt al wat er gebeurt, en het paneel staat er meteen
            onder. */}
        {bestaand ? (
          <span className="rij-meta">{ritmeVan(t, bestaand)}</span>
        ) : (
          <button
            type="button"
            // ⚠ ALLEEN `kost-ritme`, GEEN `knop knop-kaal knop-klein`. Die stonden er
            // eerst bij, en `.knop-kaal` staat later in index.css: die won met haar
            // vaste 44 × 44 px. "Elke maand · wijzig" is zo'n 120 px breed en liep
            // dus links en rechts uit haar vak, over het icoon en over het bedragveld
            // heen — afgekapt door de `overflow: hidden` van `.lijst`, precies het
            // faalpatroon waar het commentaar bij `.rij-kost` voor waarschuwt. En de
            // negatieve marge voor het raakvlak bleef staan terwijl de padding
            // weggevaagd werd, dus de knop overlapte haar buren met 24 px.
            className="kost-ritme"
            aria-expanded={ritmeOpen}
            // De naam van het voorstel maakt de knop uniek: zonder haar dragen
            // zevenendertig knoppen op één scherm dezelfde toegankelijke naam
            // (ronde 66). De zichtbare tekst staat er vooraan in, zoals WCAG 2.5.3
            // vraagt.
            aria-label={t('{ritme} · wijzig — {naam}', { ritme, naam: t(voorstel.naam) })}
            onClick={() => setRitmeOpen((o) => !o)}
          >
            {ritme} · {t('wijzig')}
          </button>
        )}

        {ritmeOpen && !alToegevoegd && (
          <div className="veldrij kost-ritme-paneel">
            <div className="veldgroep">
              <label className="label-caps" htmlFor={`${veldId}-hoevaak`}>
                {t('Hoe vaak?')}
              </label>
              <select
                id={`${veldId}-hoevaak`}
                // ⚠ De naam van het voorstel erbij. Elke rij houdt haar eigen
                // open/dicht bij, dus je kan tien paneeltjes tegelijk openzetten — en
                // dan dragen tien keuzelijsten dezelfde toegankelijke naam (regel van
                // ronde 66). De zichtbare tekst staat er vooraan in.
                aria-label={t('Hoe vaak? — {naam}', { naam: t(voorstel.naam) })}
                value={frequentie}
                onChange={(e) => setFrequentie(e.target.value as Frequentie)}
              >
                {FREQUENTIES.map((f) => (
                  <option key={f} value={f}>
                    {frequentieNaam(t, f)}
                  </option>
                ))}
              </select>
            </div>
            {periodiek && (
              <div className="veldgroep">
                <label className="label-caps" htmlFor={`${veldId}-start`}>
                  {t('Eerste betaling in')}
                </label>
                {/* Het ritme telt vanaf hier en niet vanaf het kalenderjaar: kies je
                    februari, dan volgt bij een kwartaalpost mei, augustus en november.
                    Precies dezelfde regel en hetzelfde veld als op Budget → Vast, zodat
                    er niet twee begrippen naast elkaar ontstaan. */}
                <input
                  id={`${veldId}-start`}
                  aria-label={t('Eerste betaling in — {naam}', { naam: t(voorstel.naam) })}
                  type="month"
                  value={startMaand}
                  onChange={(e) => setStartMaand(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* De regel staat er ALTIJD, ook leeg — zie de uitleg bij `reden` hierboven. */}
        <span className="rij-meta" id={redenId} role="status">
          {reden}
        </span>
        {fout && (
          <span className="rij-meta" role="alert" style={{ color: 'var(--negative)' }}>
            {fout}
          </span>
        )}
      </div>
      <span className="rij-acties">
        {/* Het veld blijft bestaan wanneer de post er al is — uitgeschakeld. Haalden
            we het weg, dan wees het label naar niets meer en verloor je de focus. */}
        <input
          id={veldId}
          ref={(el) => {
            velden.current[voorstel.sleutel] = el
          }}
          inputMode="decimal"
          // ⚠ RONDE 65. Hier stond alleen "bedrag". Tien van de voorstellen op dit
          // scherm zijn JAARposten (brandverzekering, onroerende voorheffing, ...);
          // wie daar zijn maandbedrag intikte, kreeg een post die twaalf keer te
          // klein was — in de tegels, in de buffer, in de vooruitblik. En nergens
          // stond een woord dat je dat kon vertellen. Nu staat de periode in het
          // veld zelf, in de naam die een schermlezer voorleest, én ernaast.
          placeholder={t('bedrag {periode}', { periode })}
          aria-label={t('{naam} — bedrag {periode}', { naam: t(voorstel.naam), periode })}
          className="kost-bedrag"
          disabled={alToegevoegd}
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
          onKeyDown={(e) => {
            // Enter is hier het natuurlijke gebaar: je tikt twintig bedragen na
            // elkaar in en wil daar niet twintig keer voor naar een knop.
            if (e.key === 'Enter') {
              e.preventDefault()
              void verzend()
            }
          }}
        />
        <span className="rij-meta kost-periode">{periode}</span>
        {alToegevoegd ? (
          <span className="badge badge-ok">{t('toegevoegd')}</span>
        ) : (
          <button
            type="button"
            className="knop knop-secundair knop-klein"
            aria-disabled={!geldig || bezig}
            // Alleen wanneer er iets te zeggen valt: een verwijzing naar een leeg
            // element is geen beschrijving. Zelfde vorm als de elf formulieren.
            aria-describedby={reden ? redenId : undefined}
            aria-label={t('Voeg {naam} toe', { naam: t(voorstel.naam) })}
            onClick={() => void verzend()}
          >
            {t('Toevoegen')}
          </button>
        )}
      </span>
    </li>
  )
}

/** Een aanvinklijst met een korte uitleg erboven. */
function KostenLijst({
  titel,
  uitleg,
  voorstellen,
  heeftRekening,
  onNaarRekeningen,
  posten,
  t,
  bezig,
  fout,
  onToevoegen,
  onNaarBudget,
}: {
  titel: string
  uitleg: string
  voorstellen: Kostvoorstel[]
  /**
   * De LOPENDE vaste lasten — dezelfde verzameling als de tegels bovenaan gebruiken.
   * Bewust niet álle terugkerende posten: een opgezegd Netflix-abonnement en een
   * terugkerende ínkomst met de omschrijving "Huur" (kotgeld, onderverhuur) zetten
   * anders een regel op "toegevoegd" terwijl de tegel er niets van meetelt — en je
   * kan je huur of je nieuwe abonnement dan niet meer via dit scherm ingeven.
   */
  posten: TerugkerendePost[]
  t: Vertaler
  bezig: boolean
  fout: { sleutel: string; tekst: string } | null
  onToevoegen: (voorstel: Kostvoorstel, centen: number, frequentie: Frequentie, startMaand: string) => Promise<boolean>
  onNaarBudget: () => void
  /**
   * Is er al een rekening om deze kosten vanaf te laten gaan? (ronde 66, slotronde)
   *
   * ⚠ Zonder rekening liet dit blok je gewoon bedragen intikken, en pas bij het
   * aanvinken kwam de melding "Maak eerst een rekening aan bij Je geld" — een zin
   * die de bestemming noemt maar je er niet heen brengt, terwijl dat blok op dit
   * eigen scherm staat. Je invoer was dan ook nog weg. Beter is: het niet laten
   * beginnen, en één tik naar het juiste blok aanbieden.
   */
  heeftRekening: boolean
  onNaarRekeningen: () => void
}) {
  const velden = useRef<Record<string, HTMLInputElement | null>>({})
  // Wat is er al? We vergelijken op de OMSCHRIJVING, niet op de categorie: vier
  // streamingdiensten delen dezelfde categorie, dus die zou ze niet uit elkaar
  // houden.
  //
  // En we vergelijken met de naam in ÉLKE taal. De omschrijving die weggeschreven
  // wordt is de vertaalde naam, dus wie de app op Frans zet zag "Huur" niet meer
  // terug onder "Loyer" — en voegde zijn huur een tweede keer toe. Dan staat je
  // huur dubbel in je vaste lasten, zonder één waarschuwing.
  //
  // ⚠ RONDE 70: een MAP naar de post zelf en niet meer een verzameling namen. De rij
  // toont sinds deze ronde wat er geldt (frequentie + eerste vervalmaand), en dat
  // moet uit het echte record komen — niet uit de lokale keuze van een rij waarop je
  // niets gekozen hebt. Bij een dubbel wint de EERSTE, net als overal elders.
  // Geen `useMemo`: `posten` is bij elke render een verse `.filter()`-array, dus de
  // afhankelijkheid verandert altijd en de cache sloeg nooit aan. Bij 37 voorstellen
  // kost het niets; een memo die niets doet mét een commentaar dat zegt van wel, kost
  // de volgende lezer wel iets.
  const bestaandePerNaam = new Map<string, TerugkerendePost>()
  for (const p of posten) {
    const sleutel = p.omschrijving.trim().toLowerCase()
    if (!bestaandePerNaam.has(sleutel)) bestaandePerNaam.set(sleutel, p)
  }
  const bestaandeVan = (v: Kostvoorstel): TerugkerendePost | undefined => {
    for (const taal of TALEN) {
      const gevonden = bestaandePerNaam.get(vertaal(taal.waarde, v.naam).trim().toLowerCase())
      if (gevonden) return gevonden
    }
    return undefined
  }
  const alToegevoegd = (v: Kostvoorstel) => bestaandeVan(v) !== undefined

  const gedaan = voorstellen.filter(alToegevoegd).length

  return (
    <Kaart
      titel={titel}
      // ⚠ Geen telling zolang de lijst zelf verborgen is: "0 van 20 aangevinkt" boven
      // een leeg blok is een stand van iets wat er niet staat.
      bijschrift={
        heeftRekening
          ? `${uitleg} ${t('{gedaan} van {totaal} aangevinkt.', { gedaan, totaal: voorstellen.length })}`
          : uitleg
      }
    >
      {/* ⚠ Een ándere knoptekst dan op de welkomstkaart ("Begin bij Je geld"): op een
          verse app staan die kaart en dit blok samen op één scherm, en twee knoppen met
          exact dezelfde naam zijn voor een schermlezer niet uit elkaar te houden. */}
      {!heeftRekening && (
        <Leeg actie={<EersteStapKnop onClick={onNaarRekeningen}>{t('Maak een rekening aan')}</EersteStapKnop>}>
          {t('Maak eerst een rekening aan — een vaste kost moet ergens vanaf gaan.')}
        </Leeg>
      )}
      {heeftRekening && (
      <ul className="lijst">
        {voorstellen.map((v, i) => {
          // Na een geslaagde toevoeging springt de focus naar het eerstvolgende veld
          // ONDER deze rij dat nog leeg is. Let op de `slice(i + 1)`: zocht je in de
          // hele lijst, dan kwam je altijd bovenaan uit. Wie geen huur betaalt en bij
          // Hypotheek begint, sprong dan terug naar Huur en tikte zijn volgende
          // bedrag dus in het huurveld — een vaste last die hij niet heeft.
          //
          // Staat er niets meer onder, dan blijft de focus waar hij is; van onderaf
          // terugspringen naar boven is even verwarrend.
          const volgende = voorstellen.slice(i + 1).find((o) => !alToegevoegd(o))?.sleutel ?? null
          return (
            <KostRegel
              key={v.sleutel}
              voorstel={v}
              t={t}
              bestaand={bestaandeVan(v)}
              bezig={bezig}
              fout={fout?.sleutel === v.sleutel ? fout.tekst : null}
              velden={velden}
              volgende={volgende}
              onToevoegen={onToevoegen}
            />
          )
        })}
      </ul>
      )}
      {/* ⚠ Óók binnen `heeftRekening` (ronde 66, slotronde). Zonder rekening bracht
          deze knop je naar Budget → Vast, waar allebei de formulieren zeggen "Maak
          eerst een rekening aan" en je met een knop terugsturen naar dit scherm. Een
          rondje, en precies het soort doodloper dat deze ronde wegwerkt. */}
      {heeftRekening && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {/* ⚠ Deze zin wees naar een pagina en niet naar een plek (ronde 64). De knop
              brengt je nu naar het tabblad "Vast" van Budget, met het formulier in beeld
              waarin je die kost toevoegt. */}
          {t('Staat het er niet bij? Voeg het zelf toe bij je vaste lasten.')}{' '}
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
  leningen,
  aflossingen,
  gezinsleden,
  dossiers,
  onRekening,
  onLening,
  onVastePost,
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
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  waarderingen: Waardering[]
  terugkerendePosten: TerugkerendePost[]
  leningen: Lening[]
  aflossingen: Aflossing[]
  gezinsleden: Kind[]
  dossiers: Dossier[]
  onRekening: (r: Rekening) => Promise<void> | void
  onLening: (l: Lening) => Promise<void> | void
  onVastePost: (p: TerugkerendePost) => Promise<void> | void
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
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)
  const [fout, setFout] = useState<{ sleutel: string; tekst: string } | null>(null)

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
  const lasten = terugkerendePosten.filter((p) => p.bedrag < 0 && !isGestopt(p, dezeMaand))
  const sluipend = lasten.filter(isSluipend)
  const klassiek = lasten.filter((p) => !isSluipend(p))

  // De cijfers van het slotscherm. Alle vier komen uit bestaande rekenkernen, en
  // geen enkele heeft een transactie nodig — dat is het hele punt.
  const buffer = bepaalBuffer(rekeningen, transacties, overboekingen, terugkerendePosten, waarderingen, vandaag())
  const bezit = totaalSaldoVan(rekeningen, transacties, overboekingen, waarderingen, vandaag())
  const vermogen = nettoVermogen(bezit, leningen, aflossingen)
  const sluipendPerMaand = sluipend.reduce((som, p) => som + -maandbedrag(p), 0)
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
    { id: 'vast', teken: '🏠', label: t('Vaste kosten'), klaar: klassiek.length > 0, telling: klassiek.length },
    { id: 'sluipend', teken: '📺', label: t('Sluipende kosten'), klaar: sluipend.length > 0, telling: sluipend.length },
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

  async function voegKostToe(
    voorstel: Kostvoorstel,
    centen: number,
    frequentie: Frequentie,
    startMaand: string,
  ): Promise<boolean> {
    setBezig(true)
    setFout(null)
    setMelding(null)
    try {
      // Alleen ACTIEVE rekeningen: een vaste last aan een afgesloten rekening hangen
      // betekent dat ze nooit als betaald herkend wordt en elke maand achterstallig
      // blijft staan.
      //
      // En bij voorkeur een BETAALrekening. `standaardRekening` geeft de rekening
      // terug waarop je het laatst boekte; deed je dat toevallig op je spaarrekening,
      // dan hingen hier je twintig vaste lasten aan je spaarboekje. Vaste lasten gaan
      // van een betaalrekening (of contant), niet van je spaargeld of je effecten.
      const betaalRekeningen = actieveRekeningen.filter(
        (r) => (r.type ?? 'betaal') === 'betaal' || r.type === 'cash',
      )
      const rekeningId = standaardRekening(betaalRekeningen.length > 0 ? betaalRekeningen : actieveRekeningen)
      if (!rekeningId) {
        setFout({
          sleutel: voorstel.sleutel,
          tekst: t('Maak eerst een rekening aan bij "Je geld" — een vaste kost moet ergens vanaf gaan.'),
        })
        return false
      }
      await onVastePost({
        id: nieuwId(),
        omschrijving: t(voorstel.naam),
        bedrag: -centen,
        rekeningId,
        // De dag van vandaag, niet de 1e. Met dag 1 stond élke post die je hier
        // invult meteen als ACHTERSTALLIG in je vooruitblik en in het belletje —
        // je doet deze opstelling immers zelden op de eerste van de maand.
        //
        // Eerlijk over de grens: het schema laat hoogstens dag 28 toe (anders bestaat
        // de datum niet in februari). Vul je de opstelling in op de 29e, 30e of 31e,
        // dan ligt dag 28 een paar dagen achter je en telt de vooruitblik de post wél
        // als achterstallig. Dat is dan ook waar: er staat voor deze maand nog geen
        // boeking tegenover.
        dag: Math.min(Number(vandaag().slice(8, 10)), 28),
        categorieId: voorstel.categorieId,
        // ⚠ RONDE 70. Hier stond `startMaand: verschuifMaand(huidigeMaand(), 1)` —
        // de app koos zelf "volgende maand". Dat was een verdedigbare gok (op DEZE
        // maand zetten zou het volle jaarbedrag meteen in je lopende maand laten
        // vallen), maar het bleef een gok: een driemaandelijkse factuur die in
        // februari valt, kreeg zo een ritme dat er drie maanden naast zat, en je zag
        // dat pas wanneer de vooruitblik het bedrag in de verkeerde maand zette.
        // De rij vraagt het nu, met dezelfde gok als vertrekpunt.
        ...(frequentie !== 'maand' ? { frequentie, startMaand } : {}),
      })
      // De rekening staat erbij: dit scherm vraagt ze bewust niet, dus zonder deze
      // regel wist je niet waar de app je vaste last aan gehangen heeft.
      const rekeningNaam = actieveRekeningen.find((r) => r.id === rekeningId)?.naam ?? ''
      // ⚠ De periode staat er ook hier bij, met bij een jaarpost het maandbedrag
      // erachter: dat is het getal dat straks in je tegels en je buffer opduikt.
      // Klopt het niet, dan zie je het hier meteen in plaats van pas over een maand.
      setMelding(
        frequentie === 'maand'
          ? t('{naam} toegevoegd: {bedrag} per maand, van {rekening}.', {
              naam: t(voorstel.naam),
              bedrag: formatEuro(centen),
              rekening: rekeningNaam,
            })
          : t('{naam} toegevoegd: {bedrag} {periode} — dat is {permaand} per maand, van {rekening}.', {
              naam: t(voorstel.naam),
              bedrag: formatEuro(centen),
              periode: t(PERIODE_SLEUTELS[frequentie]),
              // Delen door het EIGEN interval, niet altijd door twaalf. En op het
              // NEGATIEVE bedrag, want zo staat het straks in de database: `Math.round`
              // rondt naar +∞, dus op een halve cent zou de melding er anders één cent
              // naast zitten ten opzichte van `maandbedrag()` in de tegels en de buffer.
              permaand: formatEuro(-Math.round(-centen / INTERVAL_MAANDEN[frequentie])),
              rekening: rekeningNaam,
            }),
      )
      return true
    } catch {
      setFout({ sleutel: voorstel.sleutel, tekst: t('Toevoegen is niet gelukt. Probeer het opnieuw.') })
      return false
    } finally {
      setBezig(false)
    }
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
              buffer.vasteLastenPerMaand > 0
                ? t(
                    'Omgerekend naar één maand: een jaarpremie van € 1.200 telt hier als € 100. Op Budget staat daarnaast wat er in déze maand effectief vervalt — bij een post per kwartaal of per jaar is dat een ander bedrag.',
                  )
                : undefined
            }
          >
            {buffer.vasteLastenPerMaand > 0 ? formatEuro(buffer.vasteLastenPerMaand) : '—'}
          </Stat>
          <Stat
            label={t('Waarvan sluipend')}
            bron={
              sluipendPerMaand > 0
                ? t('Alleen de posten in de categorieën uit de lijst “Sluipende kosten” hieronder. Een eigen categorie telt hier niet mee.')
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
        {!buffer.bruikbaar && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig. Voeg er een toe bij "Je geld".')}
          </p>
        )}

        {sluipendPerMaand > 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Je sluipende kosten zijn {maand} per maand, oftewel {jaar} per jaar.', {
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
            titel={t('Je vaste kosten')}
            uitleg={t('Vink aan wat je betaalt en tik het bedrag in. Achter elk veld staat of het om een bedrag per maand of per jaar gaat — tik het bedrag van die periode.')}
            voorstellen={KLASSIEKE_VASTE_KOSTEN}
            posten={lasten}
            t={t}
            bezig={bezig}
            fout={fout}
            onToevoegen={voegKostToe}
            onNaarBudget={() => (onNaarBudget ? onNaarBudget('vast') : onNaarPagina('budget'))}
            heeftRekening={actieveRekeningen.length > 0}
            onNaarRekeningen={() => naarBlok('rekeningen')}
          />
        )}

        {blok === 'sluipend' && (
          <KostenLijst
            titel={t('Je sluipende kosten')}
            uitleg={t('De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt. Achter elk veld staat of het per maand of per jaar is.')}
            voorstellen={SLUIPENDE_KOSTEN}
            posten={lasten}
            t={t}
            bezig={bezig}
            fout={fout}
            onToevoegen={voegKostToe}
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
    </section>
  )
}
