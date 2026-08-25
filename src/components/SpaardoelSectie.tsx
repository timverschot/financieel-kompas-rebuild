import { useId, useRef, useState } from 'react'
import type { Kind, Overboeking, Rekening, Spaardoel, TerugkerendePost, Transactie, Waardering } from '../data/schema'
import { SpaardoelFormulier } from './SpaardoelFormulier'
import {
  doeldekking,
  spaarbareVasteLasten,
  spaardoelenVoorVasteLast,
  spaardoelPlan,
  spaardoelTempo,
  teLaatVoorVervaldag,
  TEMPO_VENSTER_MAANDEN,
} from '../utils/spaardoel'
import type { Doeldekking } from '../utils/spaardoel'
import { spaardoelVoortgang, type SpaardoelPlan } from '../utils/spaardoel'
import { dagJaar, maandJaarLabel, vandaag } from '../utils/datum'
import { intervalVan } from '../utils/vastelast'
import { naamVanPersoon } from '../utils/persoon'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { Balk, Kaart, Leeg, PaginaKop } from '../ui/basis'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { zachteAchtergrond } from './TransactieLijst'

// Eén regel per doel die zegt of je het haalt: wat er per maand bij moet, wat je
// effectief doet, en wanneer je aan dat tempo klaar bent. Zwijgt volledig zolang
// er niets zinnigs te zeggen is (geen doeldatum, geen streefbedrag, geen tempo) —
// een lege regel met streepjes is erger dan geen regel.
function PlanRegel({ doel, plan, teLaat }: { doel: Spaardoel; plan: SpaardoelPlan; teLaat: boolean }) {
  const { t } = useT()

  if (plan.alBereikt) {
    return (
      <div>
        <span className="badge badge-ok">{t('Doel gehaald')}</span>
      </div>
    )
  }

  if (plan.datumVerstreken) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-laat">{t('Datum voorbij')}</span>
        <span className="rij-meta">{t('De doeldatum is verstreken. Zet een nieuwe datum om weer een tempo te kunnen berekenen.')}</span>
      </div>
    )
  }

  const stukken: string[] = []
  if (plan.benodigdPerMaand !== null) {
    stukken.push(
      t('{bedrag} per maand nodig ({n} mnd te gaan)', {
        bedrag: formatEuro(plan.benodigdPerMaand),
        n: plan.maandenTotDoeldatum ?? 0,
      }),
    )
  }
  if (plan.tempoPerMaand !== null) {
    stukken.push(
      plan.tempoBron === 'streefbedrag'
        ? t('jouw streefbedrag: {bedrag}', { bedrag: formatEuro(plan.tempoPerMaand) })
        : t('je tempo: {bedrag} per maand (gemiddeld over {n} maanden)', {
            bedrag: formatEuro(plan.tempoPerMaand),
            n: TEMPO_VENSTER_MAANDEN,
          }),
    )
  }
  if (plan.verwachteDatum) {
    // Bewust maand + jaar: het is een schatting, geen afspraak op de dag.
    stukken.push(t('zo klaar rond {datum}', { datum: maandJaarLabel(plan.verwachteDatum) }))
  }

  if (stukken.length === 0) {
    // Niets te zeggen: geen doeldatum, geen streefbedrag, geen meetbaar tempo.
    // Dan is het nuttigste wat we kunnen doen, uitleggen wat eraan ontbreekt.
    return (
      <span className="rij-meta">
        {doel.gekoppeldeRekeningId
          ? t('Zet een doeldatum of een maandbedrag om te zien of je op schema zit.')
          : t('Koppel een rekening of zet een doeldatum om te zien of je op schema zit.')}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* ⚠ `teLaat` overstemt de doeldatum (ronde 74, doorlichting). Anders stond er een
          groene badge "Op schema" naast de zin "aan dit tempo ben je te laat" — over
          hetzelfde doel, in dezelfde regel. De badge is het opvallendste element, dus
          die won het gesprek. De echte deadline is de betaling, niet je eigen datum. */}
      {plan.opSchema === true && !teLaat && <span className="badge badge-ok">{t('Op schema')}</span>}
      {(plan.opSchema === false || teLaat) && <span className="badge badge-laat">{t('Achter op schema')}</span>}
      <span className="rij-meta">{stukken.join(' · ')}</span>
    </div>
  )
}

/**
 * Wat dit doel met een vaste last te maken heeft (ronde 74).
 *
 * ⚠ Deze regel MAG NOOIT NIETS ZEGGEN wanneer er een koppeling is. Een doel dat aan
 * een vaste last hangt, haalt die kost weg uit "Opzij voor later" op Budget; wie dat
 * bedrag daar ziet verdwijnen zonder dat hier iets staat, ziet een app die uit
 * zichzelf getallen verandert.
 */
function KoppelingRegel({
  dekking,
  teLaat,
  medeDoelen,
  doelnaam,
  bezig,
  onNeemBedrag,
  onNeemDatum,
}: {
  dekking: Doeldekking
  /** Aan je huidige tempo ben je pas ná de betaling klaar. */
  teLaat: boolean
  /** Hoeveel ANDERE doelen aan dezelfde vaste last hangen. */
  medeDoelen: number
  /** Alleen om de knoppen hieronder een eigen naam te geven; zie daar. */
  doelnaam: string
  /** Loopt er een vorige wijziging? Dan wachten de knoppen even; zie `neemOver`. */
  bezig: boolean
  /**
   * Het doelbedrag gelijkzetten met de kost (ronde 79).
   *
   * ⚠ EEN KNOP EN GEEN AUTOMATISME, en dat is Timothy's eigen keuze uit de drie die ik
   * hem voorlegde. De app vult die twee velden niet uit zichzelf in en houdt ze ook
   * niet bij: misschien spaar je bewust voor twee jaar vooruit, of zette je € 700 omdat
   * je een verhoging verwacht, of wil je klaar zijn vóór je op reis vertrekt. Zou de
   * app het overnemen, dan overschrijft ze stil wat jij bedoeld hebt — precies wat dit
   * project nergens doet. Ze zegt wat ze ziet, en zet er één tik naast.
   */
  onNeemBedrag?: () => void
  /** Idem voor de doeldatum: gelijkzetten met de eerstvolgende vervaldag. */
  onNeemDatum?: () => void
}) {
  const { t } = useT()
  if (dekking.soort === 'geen') return null

  if (dekking.soort === 'verdwenen') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-laat">{t('Kost bestaat niet meer')}</span>
        <span className="rij-meta">
          {t('De vaste last waarvoor je spaarde, staat niet meer in je vaste lasten. Het doel blijft gewoon lopen.')}
        </span>
      </div>
    )
  }

  if (dekking.soort === 'gestopt' || dekking.soort === 'uitbetaald') {
    return (
      <span className="rij-meta">
        {t('Je spaarde voor {naam}, maar daar komt geen betaling meer van.', {
          naam: dekking.post.omschrijving,
        })}
      </span>
    )
  }

  // De staartzinnen die geen knop dragen, blijven één regel.
  const staart: string[] = []
  if (dekking.datumNaVervaldag) {
    // Deze zin heeft wél een knop en staat dus apart, hieronder.
  } else if (teLaat) {
    // ⚠ `else`, want twee zinnen die allebei "je bent te laat" zeggen lezen als ruis.
    // Het zijn WEL twee verschillende redenen: de ene gaat over de datum die jij zette,
    // de andere over het tempo waarmee je spaart. De scherpste van de twee staat er, en
    // dat is de datum — die heb jij zelf gekozen. ⚠ Neem je die datum over, dan kan
    // deze zin dus alsnog verschijnen: je datum klopt dan, je tempo nog niet. Dat is
    // geen weggevallen belofte maar nieuwe informatie.
    //
    // ⚠ En hier hoort GEEN knop bij (ronde 79). Bij een GEMETEN tempo is er geen enkel
    // veld dat een knop zou kunnen zetten — het tempo komt uit je werkelijke stortingen.
    // Bij een streefbedrag zou de knop moeten kiezen tussen je maandbedrag verhogen en
    // je doelbedrag verlagen, en dat is niet af te leiden. Een knop die dat voor je
    // kiest, zou raden. (⚠ "of langer sparen" stond hier eerst als tweede uitweg, en
    // dat klopt niet: `teLaatVoorVervaldag` vergelijkt je VERWACHTE datum met de
    // vervaldag van de kost, en je eigen doeldatum komt in die som niet voor.)
    staart.push(t('Aan je huidige tempo heb je pas ná die betaling genoeg bij elkaar.'))
  }
  // Dezelfde soort waarschuwing als bij twee doelen op één rekening (ronde 69), maar
  // dan voor de kostkant: twee potten voor één rekening betekent dat je dubbel spaart
  // — en Budget reserveert dan ook allebei de bedragen.
  if (medeDoelen === 1) staart.push(t('Er hangt nog een doel aan diezelfde kost; je spaart er dus dubbel voor.'))
  if (medeDoelen > 1) staart.push(t('Er hangen nog {n} doelen aan diezelfde kost; je spaart er dus meervoudig voor.', { n: medeDoelen }))

  // ⚠ Geen geleende `.stapel` (doorlichting ronde 79). Die klasse beschrijft in
  // DESIGN.md een kolom van KAARTEN met 16 px ertussen; haar hier lenen en die ene
  // waarde meteen overschrijven, maakt de beschrijving in DESIGN.md onwaar — en een
  // klasse lenen is bovendien een gok op de volgorde van het bestand (ronde 70).
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="rij-meta">
        {t('Voor {naam}, de volgende keer op {datum}.', {
          naam: dekking.post.omschrijving,
          datum: dagJaar(dekking.vervaldag),
        })}
      </span>
      {/* ⚠ Elke vaststelling met haar eigen knop op DEZELFDE regel (ronde 79). Stonden
          de zinnen samengevoegd en de knoppen eronder, dan wees geen van beide knoppen
          nog naar iets — en een reden hoort te wijzen naar wat je kan zien (huisregel
          sinds ronde 71). */}
      {dekking.bedragWijktAf && (
        <Vaststelling
          zin={t('Die kost is {bedrag}; je doelbedrag staat op iets anders.', {
            bedrag: formatEuro(dekking.bedrag),
          })}
          knop={t('Neem dat bedrag over')}
          // ⚠ Mét de doelnaam erachter. Er staan meerdere doelen onder elkaar, en die
          // dragen elk dezelfde twee knoppen — huisregel sinds ronde 66. De zichtbare
          // tekst staat vooraan, zoals WCAG 2.5.3 vraagt (huisregel sinds ronde 73).
          knopnaam={t('Neem dat bedrag over voor {naam}', { naam: doelnaam })}
          bezig={bezig}
          onKies={onNeemBedrag}
        />
      )}
      {dekking.datumNaVervaldag && (
        <Vaststelling
          zin={t('Je doeldatum ligt ná die betaling, dus aan dit tempo ben je te laat.')}
          knop={t('Neem die datum over')}
          knopnaam={t('Neem die datum over voor {naam}', { naam: doelnaam })}
          bezig={bezig}
          onKies={onNeemDatum}
        />
      )}
      {staart.length > 0 && <span className="rij-meta">{staart.join(' ')}</span>}
    </span>
  )
}

/**
 * Eén vaststelling met de knop die haar oplost.
 *
 * Zonder handler staat er alleen de zin: een knop die niets kan doen, hoort er niet te
 * zijn (huisregel sinds ronde 60).
 */
function Vaststelling({
  zin,
  knop,
  knopnaam,
  bezig,
  onKies,
}: {
  zin: string
  knop: string
  knopnaam: string
  /** Loopt er een vorige wijziging? Dan wacht deze knop even; zie `neemOver`. */
  bezig: boolean
  onKies?: () => void
}) {
  const zinId = useId()
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="rij-meta" id={zinId}>
        {zin}
      </span>
      {onKies && (
        <button
          type="button"
          // ⚠ `doelknop` is er om de focusring te kunnen bijstellen (ronde 79). Deze
          // knop staat in een `.lijst`, en die knipt met `overflow: hidden` élke ring
          // weg die naar buiten wijst — de val van ronde 70 en 73. Zonder eigen klasse
          // erft ze `.rij button:focus-visible`, dat een `box-shadow` van 4 px naar
          // buiten zet, en dan verdwijnt de linkerhelft van die ring in de rand.
          className="knop knop-ghost knop-klein doelknop"
          // De zin ernaast is de REDEN dat deze knop er staat; wie de app laat
          // voorlezen, hoort anders alleen "Neem dat bedrag over" zonder waarvoor.
          aria-describedby={zinId}
          aria-label={knopnaam}
          aria-busy={bezig}
          onClick={onKies}
        >
          {knop}
        </button>
      )}
    </span>
  )
}

// De volledige Spaardoelen-sectie: overzicht met voortgangsbalken, snel het
// huidige bedrag bijwerken (bij manueel bijgehouden doelen), en een formulier om
// een doel toe te voegen of te bewerken.
export function SpaardoelSectie({
  spaardoelen,
  vasteLasten = [],
  rekeningen,
  transacties,
  overboekingen = [],
  waarderingen,
  gezinsleden = [],
  onOpslaan,
  onVerwijderen,
}: {
  spaardoelen: Spaardoel[]
  /**
   * De vaste lasten waarvoor je kan sparen (ronde 74). Optioneel en standaard leeg:
   * dan verschijnt het keuzeveld niet en gedraagt dit scherm zich zoals vroeger.
   */
  vasteLasten?: TerugkerendePost[]
  rekeningen: Rekening[]
  transacties: Transactie[]
  // Optioneel: enkel nodig om te tonen (en te kiezen) voor wie een doel is.
  gezinsleden?: Kind[]
  // Overboekingen tellen mee in het saldo van een gekoppelde rekening: geld dat je
  // naar je spaarrekening boekt, hoort in je spaardoel te verschijnen.
  overboekingen?: Overboeking[]
  // Een waardering zet het saldo van een gekoppelde rekening op een vaste stand;
  // zonder haar zou een belegging in je spaardoel op een verouderd bedrag blijven.
  waarderingen: Waardering[]
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // Eén keer per render dezelfde dag gebruiken, zodat alle doelen met exact
  // dezelfde 'vandaag' rekenen.
  const nu = vandaag()
  // Alleen de kosten waar sparen zin heeft; zie `spaarbareVasteLasten`.
  const spaarbaar = spaarbareVasteLasten(vasteLasten, nu.slice(0, 7))
  const [bewerk, setBewerk] = useState<Spaardoel | null>(null)
  // Welk doel er rechts (op een telefoon: eronder) opengeklapt staat. Zolang er
  // niets gekozen is, staat rechts gewoon het formulier voor een nieuw doel.
  const [gekozenId, setGekozenId] = useState<string | null>(null)
  const [bedragInvoer, setBedragInvoer] = useState<Record<string, string>>({})
  /** Wat er net gelukt is — voor wie de app laat voorlezen én voor wie kijkt. */
  const [melding, setMelding] = useState('')
  /**
   * De rijknop per doel, als landingsplek voor de focus.
   *
   * ⚠ Nodig omdat de overneem-knoppen zichzelf uit het scherm halen zodra ze gelukt
   * zijn; zonder anker valt de focus naar `<body>` (huisregel sinds ronde 73).
   */
  const rijRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  async function opslaan(d: Spaardoel) {
    // ⚠ RONDE 68 — HIER MAG DE FOUT NIET OPGEVANGEN WORDEN. Het formulier hieronder
    // vangt zelf op en houdt dan je invoer vast; ving deze tussenstap hem al weg, dan
    // zag het formulier "gelukt", maakte het zichzelf leeg, en was je tekst tóch weg —
    // mét een melding erbij. Precies de fout die deze ronde moest uitroeien.
    await onOpslaan(d)
    // Na het opslaan staat rechts weer het formulier voor een NIEUW doel, dus
    // mag er in de lijst ook niets meer oplichten — anders lijkt de markering te
    // wijzen naar iets wat rechts niet staat.
    setBewerk(null)
    setGekozenId(null)
  }

  async function verwijder(id: string) {
    // ⚠ RONDE 68 — het rechterpaneel klapte dicht en het doel bleef staan. Pas
    // opruimen ná een geslaagde verwijdering.
    if (!(await opslag.probeer(() => onVerwijderen(id)))) return
    if (gekozenId === id) setGekozenId(null)
    if (bewerk?.id === id) setBewerk(null)
  }

  /**
   * Eén veld van een doel gelijkzetten met de vaste last eraan (ronde 79).
   *
   * ⚠ Via `opslag.probeer`, net als elke andere schrijfactie op deze kaart: mislukt het
   * wegschrijven, dan zegt het scherm het in plaats van te doen alsof (huisregel sinds
   * ronde 68). En het doel gaat er VOLLEDIG in — alleen het ene veld verandert, de rest
   * blijft precies staan zoals ze stond.
   */
  async function neemOver(doel: Spaardoel, velden: Partial<Spaardoel>, bevestiging: string) {
    // ⚠ NIET TWEE TEGELIJK (doorlichting ronde 79). Staan allebei de knoppen er — het
    // geval waarvoor deze ronde bestaat — en tik je ze snel na elkaar, dan schrijft de
    // tweede het doel weg zoals het bij DEZE tekening was, en is je eerste overname
    // stil ongedaan gemaakt. Het wegschrijven gaat langs een volledige herlading, dus
    // dat venster is op een telefoon makkelijk een halve seconde. En het weigeren zegt
    // het ook: een grendel die zwijgt is een nieuwe stille mislukking (ronde 68).
    if (opslag.bezig) {
      setMelding(t('Even geduld — je vorige wijziging wordt nog bewaard.'))
      return
    }
    // ⚠ De focus eerst weg van deze knop (huisregel sinds ronde 73). Lukt het, dan
    // verdwijnt de vaststelling én haar knop, en valt de focus naar `<body>`. De rij
    // zelf is een knop en blijft altijd staan.
    rijRefs.current[doel.id]?.focus()
    if (!(await opslag.probeer(() => onOpslaan({ ...doel, ...velden })))) return
    // ⚠ Staat dit doel rechts open in het formulier, dan moet dát ook mee. Anders toont
    // het formulier nog het oude bedrag naast een lijst met het nieuwe — en schrijft de
    // eerstvolgende "Doel wijzigen" jouw overname stil terug.
    setBewerk((b) => (b && b.id === doel.id ? { ...b, ...velden } : b))
    // ⚠ En zeg dat het gelukt is. De tik verandert vijf getallen in dezelfde rij
    // (voortgangsbalk, "nog €", tempo, badge) en haalt de knop weg; zonder een woord is
    // het enige bewijs dat er iets veranderde, dat er iets verdween.
    setMelding(bevestiging)
  }

  async function werkBedragBij(doel: Spaardoel) {
    const tekst = bedragInvoer[doel.id]
    if (tekst === undefined) return
    const centen = invoerNaarCenten(tekst)
    if (!Number.isFinite(centen)) return
    // ⚠ RONDE 68 — mislukte dit, dan bleef de balk op het oude bedrag staan terwijl
    // je nieuwe getal in het veld stond. Niets zei welke van de twee klopte.
    if (!(await opslag.probeer(() => onOpslaan({ ...doel, huidigBedrag: centen })))) return
    setBedragInvoer((m) => {
      const n = { ...m }
      delete n[doel.id]
      return n
    })
  }

  return (
    <div className="stapel">
      <PaginaKop titel={t('Spaardoelen')} bijschrift={t('Langetermijndoelen — buffers, grote aankopen, schuldenvrij.')} />

      <div className="raster-lijst-formulier">
      <div className="kolom-lijst stapel">
      <Kaart>
        {/* Ronde 66: de zin zei niet WAAR je dat doet; het formulier staat op een breed
            scherm ernaast en op een telefoon eronder. */}
        {spaardoelen.length === 0 && (
          <Leeg>{t('Nog geen doelen. Met het formulier op deze pagina zet je je eerste doel — een buffer, een grote aankoop, of schuldenvrij zijn.')}</Leeg>
        )}

        <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />
        {/* ⚠ Eén meldvak per PLEK (huisregel sinds ronde 68), en het staat er alleen
            mét tekst: een `role="status"` die pas met zijn inhoud verschijnt, wordt
            betrouwbaarder voorgelezen dan een leeg vak dat later gevuld wordt (ronde
            56). Het zegt wat een geslaagde tik veranderde — anders is het enige bewijs
            dat er iets gebeurde, dat er iets verdween. */}
        {melding !== '' && (
          <p role="status" className="rij-meta" style={{ margin: 0 }}>
            {melding}
          </p>
        )}

        {spaardoelen.length > 0 && (
          <ul className="lijst">
            {spaardoelen.map((d) => {
              const v = spaardoelVoortgang(d, rekeningen, transacties, overboekingen, waarderingen)
              // RONDE 69 — WAT "AL GESPAARD" HIER ÉCHT IS. Hangt er een rekening aan
              // het doel, dan neemt `spaardoelVoortgang` het VOLLEDIGE saldo van die
              // rekening over. Dat is bruikbaar zolang die rekening één doel dient,
              // maar wie twee doelen aan dezelfde spaarrekening hangt, ziet hetzelfde
              // geld twee keer als voortgang staan — en dan lijken allebei de doelen
              // bijna gehaald terwijl er maar één keer geld is. Het cijfer zwijgt
              // erover, dus zegt het scherm het nu zelf.
              const medeDoelen = d.gekoppeldeRekeningId
                ? spaardoelen.filter((a) => a.id !== d.id && a.gekoppeldeRekeningId === d.gekoppeldeRekeningId).length
                : 0
              const rekeningNaam = d.gekoppeldeRekeningId
                ? rekeningen.find((r) => r.id === d.gekoppeldeRekeningId)?.naam
                : undefined
              const tempo = spaardoelTempo(d, rekeningen, transacties, overboekingen, waarderingen, nu)
              const plan = spaardoelPlan(d, v, tempo, nu)
              const dekking = doeldekking(d, vasteLasten, nu)
              // De koppeling in de vorm die de twee overneem-knoppen nodig hebben, of
              // `null`.
              //
              // ⚠ NIET ALLEEN "loopt" (doorlichting ronde 79). `doeldekking` kijkt niet
              // naar het teken en niet naar het ritme, en dit scherm krijgt ÁLLE
              // terugkerende posten mee. Zet je een gekoppelde kost later om naar een
              // INKOMST, of maak je haar MAANDELIJKS, dan blijft de koppeling bestaan
              // (dat is een bewuste keuze van ronde 74) — maar dan is er niets meer om
              // voor te sparen, en zonder deze twee voorwaarden bood de knop je aan om
              // je doelbedrag op een inkomstbedrag of op één maandhuur te zetten.
              // Precies dezelfde voorwaarden als `spaarbareVasteLasten`, dat het
              // KEUZEveld in het formulier al gebruikt.
              const spaarbaar =
                dekking.soort === 'loopt' && dekking.post.bedrag < 0 && intervalVan(dekking.post) > 1
              const loopt = spaarbaar && dekking.soort === 'loopt' ? dekking : null
              // ⚠ En de DATUM alleen wanneer de vervaldag nog moet komen. Valt ze
              // vandaag, dan zou de knop je doeldatum op vandaag zetten — en dan zegt
              // `maandbedragVoorDoel` "nul maanden" en springt de badge op "Datum
              // voorbij", pal onder de zin dat de betaling nog moet komen. Eén dag per
              // cyclus, maar wel de dag waarop je hiernaar kijkt.
              const datumOverneembaar = loopt !== null && loopt.vervaldag > nu
              // ⚠ Twee manieren om te laat te zijn, en de badge moet op allebei reageren:
              // je eigen doeldatum ligt ná de betaling, óf je huidige tempo brengt je er
              // pas ná. `PlanRegel` kent alleen de doeldatum, dus zonder deze combinatie
              // bleef er een groene badge staan boven een zin die zei dat je te laat bent.
              const teLaat =
                teLaatVoorVervaldag(dekking, plan) || (dekking.soort === 'loopt' && dekking.datumNaVervaldag)
              const kleur = d.kleur ?? 'var(--positive)'
              const manueel = !d.gekoppeldeRekeningId
              // De naam van het gezinslid komt uit de lijst; staat het lid er niet
              // (meer) in, dan tonen we gewoon niets extra.
              const persoonNaam = naamVanPersoon(d.persoonId, gezinsleden)
              const gekozen = d.id === gekozenId
              return (
                <li
                  key={d.id}
                  className="rij"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 8,
                    background: gekozen ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Hetzelfde gekleurde vlakje als in de transactielijst: het
                        gekozen icoon, of anders de beginletter van het doel. */}
                    <span className="rij-teken" aria-hidden="true" style={{ backgroundColor: zachteAchtergrond(d.kleur ?? null) }}>
                      {d.icoon ?? d.naam.trim().charAt(0).toUpperCase()}
                    </span>
                    {/* De hele regel is de knop: aanklikken opent dit doel in het
                        formulier rechts (op een telefoon: eronder). */}
                    <button
                      type="button"
                      className="rij-midden"
                      ref={(el) => {
                        rijRefs.current[d.id] = el
                      }}
                      aria-current={gekozen ? 'true' : undefined}
                      aria-label={t('Bewerk doel {naam}', { naam: d.naam })}
                      onClick={() => {
                        setGekozenId(d.id)
                        setBewerk(d)
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                    >
                      <span className="rij-titel">{d.naam}</span>
                      <span className="rij-meta">
                        {t('{a} van {b}', { a: formatEuro(v.huidig), b: formatEuro(v.doel) })}
                        {persoonNaam ? ` · ${t('voor {naam}', { naam: persoonNaam })}` : ''}
                      </span>
                    </button>
                    <span className="rij-acties">
                      <button
                        className="knop knop-kaal knop-gevaar"
                        aria-label={t('Verwijder doel {naam}', { naam: d.naam })}
                        onClick={() => verwijder(d.id)}
                      >
                        ×
                      </button>
                    </span>
                  </div>

                  <Balk label={d.naam} fractie={v.fractie} kleur={kleur} nu={v.fractie * 100} max={100} />

                  {rekeningNaam ? (
                    <span className="getal-bron">
                      {t('Het eerste bedrag hierboven is het volledige saldo van {rekening} zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.', {
                        rekening: rekeningNaam,
                      })}
                      {medeDoelen > 0
                        ? ' ' +
                          (medeDoelen === 1
                            ? t('Er hangt nog een doel aan diezelfde rekening: hetzelfde geld telt bij allebei mee.')
                            : t('Er hangen nog {n} doelen aan diezelfde rekening: hetzelfde geld telt bij allemaal mee.', {
                                n: medeDoelen,
                              }))
                        : ''}
                    </span>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span className="rij-meta">{t('nog {bedrag}', { bedrag: formatEuro(v.resterend) })}</span>
                    <span className="rij-meta">
                      {d.maandbedrag ? t('{bedrag}/mnd', { bedrag: formatEuro(d.maandbedrag) }) : ''}
                      {d.doeldatum ? t(' · tegen {datum}', { datum: d.doeldatum }) : ''}
                    </span>
                  </div>

                  {/* Haal je het? Dit stond vroeger enkel als losse rekenhulp waar je
                      alles zelf moest intikken; nu zegt het doel het zelf. */}
                  <PlanRegel doel={d} plan={plan} teLaat={teLaat} />
                  <KoppelingRegel
                    dekking={dekking}
                    teLaat={teLaat}
                    medeDoelen={d.vasteLastId ? spaardoelenVoorVasteLast(d.vasteLastId, spaardoelen).length - 1 : 0}
                    doelnaam={d.naam}
                    bezig={opslag.bezig}
                    onNeemBedrag={
                      loopt
                        ? () =>
                            void neemOver(d, { doelbedrag: loopt.bedrag }, t('Het doelbedrag van {naam} staat nu op {bedrag}.', { naam: d.naam, bedrag: formatEuro(loopt.bedrag) }))
                        : undefined
                    }
                    onNeemDatum={
                      datumOverneembaar && loopt
                        ? () =>
                            void neemOver(d, { doeldatum: loopt.vervaldag }, t('De doeldatum van {naam} staat nu op {datum}.', { naam: d.naam, datum: dagJaar(loopt.vervaldag) }))
                        : undefined
                    }
                  />

                  {manueel && (
                    <div className="knoprij" style={{ flexWrap: 'nowrap' }}>
                      <input
                        aria-label={t('Huidig bedrag {naam}', { naam: d.naam })}
                        style={{ flex: 1, minWidth: 0 }}
                        inputMode="decimal"
                        placeholder={t('Huidig bedrag')}
                        value={bedragInvoer[d.id] ?? centenNaarInvoer(d.huidigBedrag)}
                        onChange={(e) => setBedragInvoer((m) => ({ ...m, [d.id]: e.target.value }))}
                      />
                      <button type="button" className="knop knop-secundair knop-klein" onClick={() => werkBedragBij(d)}>
                        {t('Bedrag bijwerken')}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

      </Kaart>
      </div>

      <div className="kolom-formulier stapel">
        <Kaart
          titel={bewerk ? t('Doel bewerken') : t('Nieuw doel')}
          actie={
            bewerk ? (
              <button className="knop knop-ghost knop-klein" onClick={() => setBewerk(null)}>
                + {t('Nieuw doel')}
              </button>
            ) : undefined
          }
        >
          <SpaardoelFormulier
            rekeningen={rekeningen}
            gezinsleden={gezinsleden}
            vasteLasten={spaarbaar}
            vandaagISO={nu}
            onOpslaan={opslaan}
            onAnnuleer={() => setBewerk(null)}
            bewerken={bewerk}
          />
        </Kaart>
      </div>
      </div>
    </div>
  )
}
