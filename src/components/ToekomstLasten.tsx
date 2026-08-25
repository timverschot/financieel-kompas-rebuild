import { useEffect, useMemo, useState } from 'react'
import type { TerugkerendePost } from '../data/schema'
import {
  kanVooruit,
  onplaatsbareLasten,
  slotreden,
  toekomstlasten,
  VENSTER_MAANDEN,
  zwaarsteMaanden,
  type Toekomstmaand,
} from '../utils/toekomstlasten'
import { intervalVan, verschuifMaand } from '../utils/vastelast'
import { formatEuro } from '../utils/format'
import { namenlijst } from '../utils/namenlijst'
import { maandKort, maandJaarLabel, maandVoluit } from '../utils/datum'
import { EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { useT, type Vertaler } from '../i18n'

// "Wat komt eraan?" — je vaste lasten over de komende twaalf maanden (ronde 72).
//
// De app keek precies één maand vooruit. Sinds je zelf kiest of een kost per
// kwartaal, per semester of per jaar terugkomt, en vanaf welke maand, zitten er
// pieken in je jaar die de app wél kent en nergens liet zien.
//
// WAT ER IN DE STAVEN ZIT, en het staat ook letterlijk op het scherm: je vaste
// lasten, met hun VOLLE bedrag in de maand dat ze vervallen. Geen inkomsten (dan
// zou een hoge staaf ineens iets goeds kunnen betekenen), geen losse uitgaven (die
// kent de app niet vooruit), geen leningen en geen onderhoudsbijdrage (die tellen
// elk op hun eigen manier; ze hier bijmengen zou dubbeltellingen geven), en niets
// omgerekend naar een maandgemiddelde.

const HOOGTE = 132

/** De maanden waarin iets valt dat niet elke maand terugkomt — die maken het verschil. */
function bijzondereNamen(maand: Toekomstmaand, perId: Map<string, TerugkerendePost>): string[] {
  const namen: string[] = []
  for (const id of maand.postIds) {
    const p = perId.get(id)
    if (p && intervalVan(p) > 1) namen.push(p.omschrijving)
  }
  return namen
}

/**
 * De staven zelf.
 *
 * BEWUST GEEN KNOPPEN, in tegenstelling tot `MaandGrafiek`. Daar zijn het er zes en
 * haalt een maandkolom de 44 px die deze app zichzelf oplegt. Twaalf kolommen komen
 * op een telefoon op ongeveer 27 px uit — te klein om betrouwbaar te raken. Wie wil
 * weten wat er in maart valt, klapt de lijst eronder open; die rijen zijn wél
 * volwaardige raakvlakken.
 */
function Balken({
  reeks,
  gemiddelde,
  lopendeMaand,
  t,
}: {
  reeks: Toekomstmaand[]
  gemiddelde: number
  /**
   * Welke maand er nu loopt ('JJJJ-MM'). ⚠ Bewust van BUITEN en niet met een eigen
   * `huidigeMaand()` hier: deze component zou dan een klok in zich dragen, en dan
   * hangt elke test erover af van de dag waarop ze draait — precies wat
   * `claude/Kompal_tijdafhankelijke-tests.md` verbiedt.
   */
  lopendeMaand: string
  t: Vertaler
}) {
  const max = Math.max(...reeks.map((m) => m.bedrag), 1)
  const gemHoogte = gemiddelde > 0 ? Math.round((gemiddelde / max) * 100) : 0

  return (
    <div>
      <div className="toekomst-balken" style={{ height: HOOGTE }}>
        {/* De gemiddelde-lijn ligt ACHTER de staven (zie `.toekomst-kolom` in
            index.css, dat de kolommen er met een stapelvolgorde vóór zet) en loopt
            over de volle breedte, zodat je per maand meteen ziet of die maand
            zwaarder is dan gewoonlijk. */}
        {gemHoogte > 0 && (
          <span aria-hidden className="toekomst-gemiddelde" style={{ bottom: `${gemHoogte}%` }} />
        )}
        {reeks.map((m, i) => {
          const hoog = Math.round((m.bedrag / max) * 100)
          const naam = maandJaarLabel(`${m.maand}-01`)
          // ⚠ HET JAAR HOORT ERBIJ (doorlichting ronde 72). Zonder jaartal waren de
          // twaalf namen na het doorbladeren letterlijk dezelfde als daarvoor: wie
          // met voorleessoftware werkt, hoorde na een klik op "Volgende twaalf
          // maanden" niets veranderen.
          // ⚠ "loopt al" hoort alleen bij een maand die ook écht iets draagt (derde
          // doorlichting ronde 72). Staat de lopende maand op nul, dan is er niets
          // betaald en is er geen staaf; de kaart drukte toch af dat een deel van die
          // staaf misschien al betaald was.
          const loopt = m.maand === lopendeMaand && m.bedrag > 0
          const label =
            m.bedrag === 0
              ? t('{maand}: geen vaste lasten', { maand: naam })
              : loopt
                ? t('{maand}: {bedrag} aan vaste lasten — deze maand loopt al', { maand: naam, bedrag: formatEuro(m.bedrag) })
                : t('{maand}: {bedrag} aan vaste lasten', { maand: naam, bedrag: formatEuro(m.bedrag) })
          return (
            <div key={m.maand} className="toekomst-kolom" role="img" aria-label={label} title={label}>
              <span
                className="staaf-in print-kleur toekomst-staaf"
                style={{
                  height: `${hoog}%`,
                  // Zonder deze ondergrens verdwijnt een klein bedrag naast een
                  // jaarpremie volledig: € 12 naast € 1.200 is één procent van de
                  // hoogte, en dat is geen streepje meer.
                  minHeight: m.bedrag > 0 ? 3 : 0,
                  // De lopende maand lichter: een deel daarvan heb je meestal al
                  // betaald, dus ze is niet te vergelijken met de maanden erna.
                  opacity: loopt ? 0.55 : 1,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* ⚠ DE NAMENRIJ IS NAGEMETEN, EN TWAALF VOLLE MAANDNAMEN PASSEN NIET (derde
          doorlichting ronde 72). Op een telefoon van 360 px is er ongeveer 20 px per
          kolom; "sep" vraagt er 21 en het Franse "sept." zelfs 29. Ze werden geklemd
          door `overflow: hidden`, aan béíde kanten, zonder beletselteken: je las
          "eptembe". Twee dingen lossen dat op — de AFKORTING overal (ook op een breed
          scherm, waar "september" bij 56 px per kolom evengoed niet paste), en op een
          smal scherm alleen om de drie maanden een naam. De andere maanden lees je af
          aan hun plaats; elke staaf draagt zijn volledige naam in zijn eigen label, en
          de lijst eronder noemt ze allemaal. */}
      <div className="toekomst-namen">
        {reeks.map((m, i) => (
          <div key={m.maand} className="rij-meta toekomst-naam">
            <span className="alleen-smal">{i % 3 === 0 ? maandKort(m.maand) : ''}</span>
            <span className="alleen-breed">{maandKort(m.maand)}</span>
            {m.maand === lopendeMaand && m.bedrag > 0 && <span aria-hidden> *</span>}
          </div>
        ))}
      </div>

      {/* De streepjeslijn krijgt een naam. Zonder bijschrift is ze een lijn zonder
          betekenis — en er staan er twee andere in de app die er precies zo uitzien:
          die van de maandgrafiek (ÁLLE uitgaven, zes maanden terug) en die op de
          Plan-pagina (over het hele jaar, niet over dit venster). Vandaar dat er zowel
          "aan vaste lasten" als "over deze twaalf maanden" in staat: het bereik én de
          periode moeten allebei uit de zin zelf blijken. */}
      {gemiddelde > 0 && (
        <p className="rij-meta toekomst-legende" style={{ margin: '8px 0 0' }} data-gemiddelde>
          <span aria-hidden className="toekomst-legendelijn" />
          {t('Gemiddeld {bedrag} aan vaste lasten per maand over deze twaalf maanden', { bedrag: formatEuro(gemiddelde) })}
        </p>
      )}

      {/* ⚠ De MAAND staat erin (tweede doorlichting ronde 72). Op het Overzicht staat
          deze kaart onder "Inkomsten en uitgaven per maand", die een bijna gelijke
          voetnoot draagt: "* Deze maand loopt nog, dus die staaf is nog niet
          volledig." Twee sterretjes met dezelfde aanhef, in één blik. */}
      {reeks.some((m) => m.maand === lopendeMaand && m.bedrag > 0) && (
        <p className="rij-meta" style={{ margin: '4px 0 0' }}>
          {t('* {maand} loopt al; een deel van die staaf is wellicht al betaald.', {
            maand: maandVoluit(lopendeMaand),
          })}
        </p>
      )}
    </div>
  )
}

/**
 * Eén zin over de piek, of null wanneer er niets te melden valt.
 *
 * ⚠ DRIE TAKKEN, EN GEEN ENKELE MAG LIEGEN (doorlichting ronde 72). "Je zwaarste
 * maand is september" is alleen waar als er precies één zwaarste maand is, en bij
 * deze grafiek is dat juist niet de regel: een halfjaarlijkse premie geeft twee even
 * zware maanden, een kwartaalpost vier. Wie zijn geld klaarzette voor september liep
 * in maart tegen exact hetzelfde bedrag aan.
 */
function piekZin(t: Vertaler, reeks: Toekomstmaand[], ontbreektIets: boolean): string {
  const top = zwaarsteMaanden(reeks)
  // ⚠ De lege reeks hoort HIER en niet bij de aanroeper (derde doorlichting ronde 72).
  // Stond ze daar, dan droeg deze functie een `null` die nooit voorkwam — "een
  // waarborg die geen enkele test rood kan maken, is geen waarborg maar een
  // geruststelling", zoals het commentaar in de rekenkern het zegt.
  if (top.length === 0) {
    return ontbreektIets
      ? t('In deze twaalf maanden vervalt er geen enkele vaste last waarvan de app de maand kent.')
      : t('In deze twaalf maanden vervalt er geen enkele vaste last.')
  }
  const bedrag = formatEuro(top[0].bedrag)
  const maand = maandJaarLabel(`${top[0].maand}-01`)
  // ⚠ ELKE TAK DRAAGT HET VOORBEHOUD (vierde doorlichting ronde 72). "Elke maand kost
  // je evenveel: € 500" is aantoonbaar onwaar wanneer er een jaarpremie van € 1.200
  // bestaat waarvan de app de maand niet kent — en die zin wordt dan tegengesproken
  // door de regel die er pal onder staat. Precies de redenering waarmee de lege reeks
  // hierboven twee formuleringen kreeg; ze geldt woord voor woord ook hier.
  if (top.length === reeks.length) {
    return ontbreektIets
      ? t('Van wat de app kan plaatsen kost elke maand evenveel: {bedrag}.', { bedrag })
      : t('Elke maand kost je evenveel: {bedrag} aan vaste lasten.', { bedrag })
  }
  if (top.length === 1) {
    return ontbreektIets
      ? t('Van wat de app kan plaatsen is {maand} de zwaarste maand: {bedrag}.', { maand, bedrag })
      : t('Je zwaarste maand is {maand}: {bedrag} aan vaste lasten.', { maand, bedrag })
  }
  return ontbreektIets
    ? t('Van wat de app kan plaatsen zijn {n} maanden even zwaar, met {bedrag}. De eerste is {maand}.', {
        n: top.length,
        bedrag,
        maand,
      })
    : t('{n} maanden zijn even zwaar, met {bedrag} aan vaste lasten. De eerste is {maand}.', {
        n: top.length,
        bedrag,
        maand,
      })
}

function vensterLabel(vanaf: string): string {
  return `${maandJaarLabel(`${vanaf}-01`)} – ${maandJaarLabel(`${verschuifMaand(vanaf, VENSTER_MAANDEN - 1)}-01`)}`
}

/** De zin over de posten die de app niet in de tijd kan plaatsen, of null. */
function OntbrekendeLasten({ posten, t, kort }: { posten: TerugkerendePost[]; t: Vertaler; kort: boolean }) {
  if (posten.length === 0) return null
  return (
    <p className="rij-meta" data-ontbreken style={{ margin: 0 }}>
      {kort
        ? t('{n} vaste last(en) staan hier niet in en tellen niet mee in deze cijfers: de app weet niet in welke maand ze vervallen.', {
            n: posten.length,
          })
        : t(
            '{n} vaste last(en) staan hier niet in, omdat de app niet weet in welke maand ze vervallen: {namen}. Ze tellen nergens op deze kaart mee. Vul bij Budget › Vast hun eerste betaling in.',
            { n: posten.length, namen: namenlijst(t, posten.map((p) => p.omschrijving)) },
          )}
    </p>
  )
}

/**
 * De volledige kaart, voor Analyse › Vooruit: staven, doorbladeren per jaar, en een
 * uitklaplijst met wat er in elke maand valt.
 */
export function ToekomstlastenKaart({
  terugkerendePosten,
  beginMaand,
  onNaarVast,
}: {
  terugkerendePosten: TerugkerendePost[]
  /**
   * De eerste maand van het eerste venster ('JJJJ-MM'). Komt van buiten, zodat deze
   * kaart geen eigen klok heeft en een test hem kan vastzetten.
   */
  beginMaand: string
  /** De eerste stap. Zie de uitleg bij de lege toestand: hij verschijnt niet altijd. */
  onNaarVast?: () => void
}) {
  const { t } = useT()
  const [venster, setVenster] = useState(beginMaand)
  const [lijstOpen, setLijstOpen] = useState(false)

  // Rolt de maand om terwijl de app openstaat, dan schuift het eerste venster mee.
  // Zonder dit bleef de kaart in een maand hangen die voorbij was, en stond de knop
  // "Vorige" op slot omdat het venster gelijk leek aan het begin.
  useEffect(() => setVenster(beginMaand), [beginMaand])

  const reeks = useMemo(() => toekomstlasten(terugkerendePosten, venster), [terugkerendePosten, venster])
  const perId = useMemo(() => new Map(terugkerendePosten.map((p) => [p.id, p])), [terugkerendePosten])
  // ⚠ Het VENSTER dat je bekijkt, niet de beginmaand (doorlichting ronde 72). Een
  // post die vorig jaar gestopt is, kan in een venster van 2028 niets meer missen —
  // en toch meldde de app daar dat er iets ontbrak.
  const ontbreken = useMemo(() => onplaatsbareLasten(terugkerendePosten, venster), [terugkerendePosten, venster])

  const totaal = reeks.reduce((som, m) => som + m.bedrag, 0)
  const gemiddelde = Math.round(totaal / reeks.length)
  const vooruit = kanVooruit(terugkerendePosten, beginMaand, venster)
  const terug = venster > beginMaand
  const heeftIets = reeks.some((m) => m.bedrag > 0)
  const stopt = slotreden(terugkerendePosten, beginMaand) === 'stopt'
  // De laatste maand van dit venster waarin er nog iets valt. Alleen zinvol wanneer
  // je niet verder kan én alles een keer ophoudt: dan is dit werkelijk de laatste.
  const laatsteMetIets = [...reeks].reverse().find((m) => m.bedrag > 0)

  return (
    <Kaart
      titel={t('Wat komt eraan')}
      bijschrift={t('Je vaste lasten per maand, {venster}.', { venster: vensterLabel(venster) })}
      // Het aanknopingspunt waar de knop "Bekijk vooruit" op het Overzicht naartoe
      // schuift. Zonder dat landde je bovenaan een pagina waar deze kaart het vierde
      // blok is — precies de klacht die ronde 64 voor de Budget-pagina oploste.
      data-toekomstkaart
    >
      {terugkerendePosten.filter((p) => p.bedrag < 0).length === 0 ? (
        /* ⚠ DE EERSTE STAP VERSCHIJNT HIER ALLEEN WANNEER DE BUURKAART HEM NIET GEEFT.
           "Vooruitblik & spaarquote" staat op ditzelfde tabblad en draagt dezelfde knop
           "Vul je vaste lasten in" — maar alleen bij NUL terugkerende posten. Vulde je
           enkel je loon in, dan stond hier een uitnodiging zonder knop en op het hele
           tabblad geen enkele weg vooruit (derde doorlichting ronde 72). Andersom zou
           het tonen van beide knoppen twee identieke regels in de knoppenlijst van een
           schermlezer geven, die naar dezelfde plek gaan. */
        <Leeg
          actie={
            onNaarVast && terugkerendePosten.length > 0 ? (
              <EersteStapKnop onClick={onNaarVast}>{t('Vul je vaste lasten in')}</EersteStapKnop>
            ) : undefined
          }
        >
          {t('Zodra je vaste lasten hebt ingevuld, zie je hier in welke maand ze vervallen.')}
        </Leeg>
      ) : (
        <>
          <Balken reeks={reeks} gemiddelde={gemiddelde} lopendeMaand={beginMaand} t={t} />

          {/* RONDE 69 — waar deze staven vandaan komen. Zonder deze zin is een hoge
              staaf een schrik zonder uitleg: je weet niet of er een jaarpremie in
              zit, of je boodschappen, of je loon ervan afgetrokken is. */}
          <p className="rij-meta" data-toekomstbron style={{ margin: 0 }}>
            {t(
              'Elke staaf is wat er die maand aan vaste lasten vervalt, met het volle bedrag — een jaarpremie staat dus één keer voluit en elf maanden op nul. Je inkomsten en je losse uitgaven zoals boodschappen zitten er niet in, en ook niet wat je apart bijhoudt bij Leningen, bij een onderhoudsbijdrage, bij de kindrekening of bij een spaardoel.',
            )}
          </p>

          {/* `role="status"` zodat na het doorbladeren hoorbaar wordt wat er veranderd
              is: het bijschrift van de kaart is geen live gebied, en de maandnamen
              van het volgende venster klinken hetzelfde. */}
          {/* ⚠ Twee formuleringen voor de lege reeks (tweede doorlichting ronde 72).
              Kent de app posten die ze niet kan plaatsen, dan is "er vervalt geen
              enkele vaste last" aantoonbaar fout: een jaarpremie valt per definitie
              één keer in élke twaalf maanden. Ze wordt dan ook nog eens tegengesproken
              door de zin die er pal onder staat. */}
          <p className="rij-meta" style={{ margin: 0 }} role="status" data-zwaarste>
            {piekZin(t, reeks, ontbreken.length > 0)}
          </p>

          <OntbrekendeLasten posten={ontbreken} t={t} kort={false} />

          <div className="knoprij toekomst-bladeren" data-geen-print>
            {/* ⚠ `aria-disabled` en niet `disabled` (huisregel sinds ronde 41, zie
                `.knop[aria-disabled]` in index.css). `disabled` haalt de knop die je
                zonet indrukte uit de tab-volgorde, en dan valt je focus naar de
                pagina — precies bij de knop waarmee je aan het bladeren was. */}
            <button
              type="button"
              className="knop knop-ghost knop-klein"
              aria-disabled={!terug}
              onClick={() => terug && setVenster(verschuifMaand(venster, -VENSTER_MAANDEN))}
            >
              {t('‹ Vorige twaalf maanden')}
            </button>
            <button
              type="button"
              className="knop knop-ghost knop-klein"
              aria-disabled={!vooruit}
              // De reden hangt aan de knop zelf, zodat wie er met een toetsenbord op
              // staat hem ook hoort. Anders blijft het een knop die niets doet.
              aria-describedby={!vooruit ? 'toekomst-einde' : undefined}
              onClick={() => vooruit && setVenster(verschuifMaand(venster, VENSTER_MAANDEN))}
            >
              {t('Volgende twaalf maanden ›')}
            </button>
          </div>

          {/* Waarom de knop niets meer doet. VIER VERSCHILLENDE REDENEN, en ze spreken
              elkaar tegen als je ze op één hoop gooit:
               1. de app kent van een post de maand niet — dan kan ze over de verre
                  toekomst helemáál niets beweren, ook niet dat het zich herhaalt;
               2. alles houdt een keer op — dan komt er na die maand niets meer;
               3. er loopt iets door — dan herhaalt elk jaar zich;
               4. er valt hier niets en er verandert ook niets meer.
              Eén zin voor 2 en 3 was gewoon onwaar in het ene of het andere geval.

              ⚠ En de zin hangt niet meer aan `heeftIets` (tweede doorlichting ronde
              72). In een leeg venster stonden allebei de knoppen op slot ZONDER uitleg,
              en dan staat er een knop die niets doet en niets zegt — precies wat deze
              regel moest voorkomen. */}
          {!vooruit && (
            <p className="rij-meta" style={{ margin: 0 }} id="toekomst-einde" data-einde data-geen-print>
              {/* ⚠ HET EINDE VAN JE VASTE LASTEN IS BELANGRIJKER DAN HET VOORBEHOUD
                  (vijfde doorlichting ronde 72). De ontbreken-tak stond hier eerst
                  vóór de stopt-tak, en dan verving een vage zin de enige mededeling
                  die telde: "je huur houdt op". Nu komt die eerst, mét het voorbehoud
                  erachter wanneer dat nodig is. */}
              {stopt && laatsteMetIets ? (
                ontbreken.length > 0 ? (
                  t('Van wat de app kan plaatsen vervalt er na {maand} niets meer. Van de vaste last(en) waarvan ze de maand niet kent, kan ze niets zeggen.', {
                    maand: maandJaarLabel(`${laatsteMetIets.maand}-01`),
                  })
                ) : (
                  t('Na {maand} vervalt er geen enkele vaste last meer.', {
                    maand: maandJaarLabel(`${laatsteMetIets.maand}-01`),
                  })
                )
              ) : ontbreken.length > 0 ? (
                /* ⚠ NIET "de app kan niets zeggen zolang…" (vierde doorlichting ronde 72).
                   Dat las als "vul die maand in en ik kan verder", terwijl de horizon
                   die posten helemaal negeert: invullen verandert niets aan de knop. */
                t('Over wat de app kan plaatsen verandert er verder vooruit niets meer. Van de vaste last(en) waarvan ze de maand niet kent, kan ze niets zeggen.')
              ) : heeftIets ? (
                t('Verder vooruit verandert er niets meer: vanaf hier herhaalt elk jaar zich.')
              ) : (
                t('Verder vooruit verandert er niets meer.')
              )}
            </p>
          )}

          {/* Eigen tussenruimte: dit blok is één kind van de kaart, dus de `gap` van
              `.kaart` staat tussen het blok en zijn buren — niet tussen de knop en de
              lijst eronder. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="knop knop-ghost knop-klein"
              style={{ alignSelf: 'flex-start' }}
              aria-expanded={lijstOpen}
              // De tekst wisselt mee, zoals bij BesparenKaart: een knop die "Toon"
              // blijft heten terwijl er iets getoond wordt, spreekt zichzelf tegen.
              onClick={() => setLijstOpen(!lijstOpen)}
            >
              {lijstOpen ? t('Verberg per maand') : t('Toon per maand')}{' '}
              <span aria-hidden>{lijstOpen ? '▾' : '▸'}</span>
            </button>
            {lijstOpen && (
              <ul className="lijst">
                {reeks.map((m) => {
                  const namen = bijzondereNamen(m, perId)
                  return (
                    <li key={m.maand} className="rij">
                      <span className="rij-midden">
                        <span className="rij-titel">{maandJaarLabel(`${m.maand}-01`)}</span>
                        <span className="rij-meta">
                          {m.postIds.length === 0
                            ? t('geen vaste lasten')
                            : t('{n} vaste last(en)', { n: m.postIds.length })}
                          {/* ⚠ "waaronder" betekent "onder andere". Zijn ALLE posten van
                              die maand niet-maandelijks, dan is de opsomming volledig en
                              suggereert dat woord ten onrechte dat er nog meer is. */}
                          {namen.length > 0 && (
                            <>
                              {' · '}
                              {namen.length === m.postIds.length
                                ? namenlijst(t, namen)
                                : t('waaronder {namen}', { namen: namenlijst(t, namen) })}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="bedrag">{formatEuro(m.bedrag)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </Kaart>
  )
}

/**
 * De compacte versie voor het Overzicht: de staven, twee zinnen, en de weg naar het
 * volledige beeld. Bewust zonder bladeren en zonder lijst — dit is de startpagina,
 * en die moet je in één blik kunnen lezen.
 */
export function ToekomstlastenWidget({
  terugkerendePosten,
  beginMaand,
  onNaarVooruitblik,
}: {
  terugkerendePosten: TerugkerendePost[]
  beginMaand: string
  onNaarVooruitblik: () => void
}) {
  const { t } = useT()
  const reeks = useMemo(() => toekomstlasten(terugkerendePosten, beginMaand), [terugkerendePosten, beginMaand])
  const ontbreken = useMemo(
    () => onplaatsbareLasten(terugkerendePosten, beginMaand),
    [terugkerendePosten, beginMaand],
  )
  const totaal = reeks.reduce((som, m) => som + m.bedrag, 0)
  const gemiddelde = Math.round(totaal / reeks.length)

  // Op een lege app zwijgt deze kaart volledig. Ze staat op de startpagina tussen
  // andere kaarten; een lege grafiek met een uitnodiging erbij is daar ruis, en de
  // volledige kaart op Analyse doet die uitnodiging al.
  //
  // ⚠ MAAR NIET WANNEER ER POSTEN BUITEN DE GRAFIEK VALLEN (vierde doorlichting ronde
  // 72). Heeft de gebruiker enkel een jaarpremie waarvan de app de maand niet kent,
  // dan is het totaal nul en verdween deze kaart spoorloos — juist op het moment dat
  // ze iets te melden had. De waarschuwing stond dan alleen op Analyse, waar je zelf
  // naartoe moest.
  if (totaal === 0 && ontbreken.length === 0) return null

  return (
    <Kaart
      titel={t('Wat komt eraan')}
      bijschrift={t('Je vaste lasten per maand, {venster}.', { venster: vensterLabel(beginMaand) })}
      actie={
        <button type="button" className="knop knop-ghost knop-klein" onClick={onNaarVooruitblik}>
          {t('Bekijk vooruit')}
        </button>
      }
    >
      {/* Geen staven wanneer er niets te tekenen valt: twaalf kolommen op nul zijn op
          de startpagina een leeg kader van 132 px waar de zinnen eronder het werk doen. */}
      {totaal > 0 && <Balken reeks={reeks} gemiddelde={gemiddelde} lopendeMaand={beginMaand} t={t} />}
      {/* ⚠ OOK HIER DE HERKOMST (doorlichting ronde 72). Deze kaart stond onder
          "Inkomsten en uitgaven per maand", een grafiek die wél alles bevat, en zei
          er niet bij dat de hare veel smaller is. Twee staafgrafieken onder elkaar op
          verschillende schaal, waarvan de nieuwste zonder uitleg. */}
      <p className="rij-meta" data-widgetbron style={{ margin: 0 }}>
        {t('Alleen wat je bij je vaste lasten invulde, met het volle bedrag in de maand dat het vervalt — geen inkomsten, geen losse uitgaven, en niet wat je apart bijhoudt bij Leningen of bij een onderhoudsbijdrage.')}
      </p>
      <p className="rij-meta" style={{ margin: 0 }} data-widget-zwaarste>
        {piekZin(t, reeks, ontbreken.length > 0)}
      </p>
      <OntbrekendeLasten posten={ontbreken} t={t} kort />
    </Kaart>
  )
}
