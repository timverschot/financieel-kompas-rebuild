import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { Categorie, Kind, Overboeking, Rekening, TerugkerendePost, Transactie, Waardering } from '../data/schema'
import { Vermogensevolutie } from './Vermogensevolutie'
import { TrendsSectie } from './TrendsSectie'
import { VooruitblikSectie } from './VooruitblikSectie'
import { BesparenKaart } from './BesparenKaart'
import { PrijsstijgingenKaart } from './PrijsstijgingenKaart'
import {
  perHoofdcategorie,
  perItem,
  perWinkel,
  drillTransacties,
  drillPerItem,
  totaalVan,
  inPeriode,
  type Periode,
  type Richting,
  type AnalysePost,
} from '../utils/analyse'
import { categorieBedragen } from '../utils/transactie'
import { uitgavenPerPersoon } from '../utils/persoon'
import { Donut } from './Donut'
import { afgerondePercentages, type DonutInvoer } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { Balk, Bedrag, EersteStapKnop, Kaart, Leeg, PaginaKop, Stat } from '../ui/basis'
import { Subtabs } from '../ui/Subtabs'
import { type AnalyseTab } from '../utils/analysetab'
import { useT } from '../i18n'
import { naarDatumTekst, huidigeMaand, maandJaarLabel } from '../utils/datum'
import { verschuifMaand } from '../utils/maandverloop'
import { isOmgekeerdBereik, filterVoorCategorie, type TxFilter } from '../utils/transactieFilter'
import { GEZIN_KLEUR, kleurVoor, OVERIGE_KLEUR } from '../ui/palet'
import { itemPerId } from '../data/categorieen/zoek'
import { dagKort } from '../utils/datum'

// De kleuren komen uit het gedeelde palet (src/ui/palet.ts) — dezelfde twaalf die
// de hoofdcategorieën en de eigen categorieën gebruiken. Deze pagina had er een
// eigen lijst van twaalf, waarvan zeven afweken; hetzelfde soort schijfje kreeg dus
// in het ene diagram een andere kleur dan in het andere.
type Gekleurd = AnalysePost & { kleur: string }
function kleuren(posten: AnalysePost[]): Gekleurd[] {
  return posten.map((p, i) => ({ ...p, kleur: kleurVoor(i) }))
}

// Kleurstipje links in een rij: enkel de vorm ligt vast, de kleur komt uit de
// data zelf.
const stip: CSSProperties = { width: 10, height: 10, borderRadius: 3, flexShrink: 0 }
const afkap: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
// Een hele lijstrij die klikbaar is: knop zonder eigen knop-look, met de
// rij-opmaak eromheen.
const rijKnop: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
  padding: '12px 0',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--rij-lijn)',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'var(--text)',
  font: 'inherit',
}

// Hoe groot de donut op deze pagina getekend wordt. Stond op 190 px in een kolom
// van 210, terwijl de namen en bedragen ernaast alle overige ruimte kregen: de
// grafiek was het kleinste deel van een kaart die je juist voor die grafiek
// openslaat. De kolombreedte ernaast staat in `.donut-naast` (index.css).
const DONUT_GROOTTE = 300

// Hoeveel schijven de ring toont vóór de rest op één 'Overige'-schijf samengeveegd
// wordt. Meer dan dit levert haarfijne schijfjes op die je niet meer aan hun legende
// kan koppelen. Eén uitzondering: een vastgepinde rij komt er altijd bij, ook als ze
// buiten dit aantal valt — dan zijn het er elf.
const MAX_SCHIJVEN = 10

// Uitklapbare donutkaart: het diagram toont de grootste schijven plus een
// 'Overige'-schijf, en dat blijft zo. Alleen de LEGENDE klapt uit naar alle rijen.
function DonutKaart({
  titel,
  subtitel,
  posten,
  richting,
  onKiesPost,
  vastgepind,
}: {
  titel: string
  subtitel?: string
  posten: Gekleurd[]
  richting: Richting
  /**
   * Van één legenderij naar haar boekingen (ronde 48).
   *
   * BEWUST een callback met de hele post en geen kale `sleutel`-string. Deze kaart
   * wordt door drie verschillende verdelingen gebruikt (per winkel, per
   * product/dienst, per gezinslid) en die hebben elk een ANDER filter nodig.
   * Een string die "de sleutel" heet, betekent dan bij elke aanroeper iets
   * anders — en precies zo sluipt er een doorklik binnen die een ander bedrag
   * toont dan waarop je klikte. De aanroeper bouwt zijn eigen filter.
   *
   * Geeft de aanroeper `undefined` terug voor een post, dan blijft die rij gewone
   * tekst. Liever geen doorklik dan een verkeerde.
   */
  onKiesPost?: (post: Gekleurd, index: number) => (() => void) | undefined
  /**
   * De plaats van een rij die ALTIJD zichtbaar moet blijven, ook als ze buiten de
   * tien grootste valt (ronde 51).
   *
   * Waarvoor dit bestaat: de kaart "per gezinslid" zet de groep "Het gezin" — alles
   * wat aan niemand hangt — altijd achteraan. Bij tien of meer gezinsleden viel die
   * groep daardoor in de restschijf, die toevallig ook nog dezelfde kleur had. Je
   * zag dus niet dát ze verdwenen was.
   *
   * Een plaats en geen naam, want namen zijn niet uniek en kunnen vertaald zijn.
   */
  vastgepind?: number
}) {
  const { t } = useT()
  const [toonAlles, setToonAlles] = useState(false)
  const totaal = totaalVan(posten)

  // Welke PLAATSEN uit `posten` de ring toont — plaatsen en geen kopieën van de rijen
  // zelf, want twee dingen hangen aan die plaats: het percentage (over de volledige
  // lijst berekend) en `onKiesPost`, waarmee de kaart "per gezinslid" bij het id van
  // de persoon komt. Sneed je de lijst gewoon door, dan liepen die twee uiteen zodra
  // er een rij van achteraan bijgetrokken wordt.
  const inDeRing: number[] = [
    ...new Set([
      ...posten.slice(0, MAX_SCHIJVEN).map((_, i) => i),
      ...(vastgepind !== undefined && vastgepind >= 0 && vastgepind < posten.length ? [vastgepind] : []),
    ]),
  ].sort((a, b) => a - b)

  const getoond = new Set(inDeRing)
  const rest = posten.filter((_, i) => !getoond.has(i))
  const restTotaal = totaalVan(rest)
  // De sleutel bevat de PLAATS in de volledige lijst plus de naam. Daarmee komt een
  // tik op een schijf bij dezelfde post — en dus bij dezelfde doorklik — als de
  // legenderij ernaast (ronde 65).
  //
  // ⚠ De naam moet erin. Donut gebruikt de sleutels als vingerafdruk om een keuze
  // te vergeten zodra de lijst iets ánders bevat; met kale plaatsen ("0|1|2") ziet
  // elke lijst van dezelfde lengte er identiek uit en blijft er een schijf
  // uitgeschoven staan wanneer je van periode wisselt.
  //
  // ⚠ En alleen posten die ECHT ergens heen gaan krijgen een sleutel. Donut zet zijn
  // doorklikknop op het bestaan van een sleutel; `onKiesPost` mag bewust niets
  // teruggeven ("liever geen doorklik dan een verkeerde"), en dan zou er een knop
  // staan die zichtbaar niets doet. De restschijf krijgt er om dezelfde reden geen:
  // die staat voor meerdere posten tegelijk.
  const ring: DonutInvoer[] = inDeRing.map((i) => ({
    naam: posten[i].naam,
    bedrag: posten[i].bedrag,
    kleur: posten[i].kleur,
    ...(onKiesPost?.(posten[i], i) ? { sleutel: `${i}|${posten[i].naam}` } : {}),
  }))
  if (restTotaal > 0) ring.push({ naam: t('Overige ({n})', { n: rest.length }), bedrag: restTotaal, kleur: OVERIGE_KLEUR })

  // Alleen de LIJST klapt uit, de ring niet. Zou de ring meegroeien, dan krijg je bij
  // vijftien posten vijftien haarfijne schijfjes die je niet meer aan hun legende kan
  // koppelen — precies wat `MAX_SCHIJVEN` moet tegenhouden. En de schijf "Overige"
  // zou verdwijnen terwijl je net méér wilde zien.
  const zichtbaar: number[] = toonAlles ? posten.map((_, i) => i) : inDeRing
  // Percentages over de VOLLEDIGE lijst berekenen (niet enkel de zichtbare rijen),
  // zodat een rij hetzelfde percentage houdt als je de lijst uitklapt.
  const percentages = afgerondePercentages(posten.map((p) => p.bedrag))

  return (
    <Kaart titel={titel} bijschrift={subtitel}>
      {/* Donut links, legende rechts vanaf 1024 px (zie .donut-naast in
          index.css). Voorheen stond de legende altijd onder de donut, ook op een
          breed scherm — dan sleep je je ogen van boven naar onder om een schijf
          bij haar bedrag te zoeken. */}
      <div className="donut-naast">
        {/* ⚠ RONDE 65. Deze ring was dood: alleen de donut van "Verdeling
            uitgaven" hierboven kreeg `interactief` en `onKies`. De legenderijen
            ernaast klikten wél door, dus in dezelfde kaart deed de helft iets en de
            andere helft niets — en niets op het scherm zei welke helft. */}
        <Donut
          items={ring}
          toonLegende={false}
          grootte={DONUT_GROOTTE}
          interactief
          middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'}
          onKies={(seg) => {
            if (seg.sleutel === undefined) return
            const i = Number(seg.sleutel.split('|')[0])
            if (!Number.isInteger(i) || i < 0 || i >= posten.length) return
            onKiesPost?.(posten[i], i)?.()
          }}
        />
        {/* Bewust GEEN maxHeight op deze lijst.
            Ze had er een van 260 px zodra je uitklapte, met een eigen schuifbalk.
            Gevolg: ingeklapt zag je tien rijen volledig, en na "Toon alle 19" werden
            negentien rijen in een venster geperst dat kleiner was dan wat je
            daarvoor zag — de knop "toon meer" toonde dus mínder. De kaart mag
            gewoon langer worden. */}
        <ul className="lijst">
          {zichtbaar.map((i) => {
            const p = posten[i]
            // De plaats in de VOLLEDIGE lijst telt mee, niet de plaats in wat je ziet.
            // De kaart "per gezinslid" heeft die nodig om bij het id van de persoon te
            // komen; dat staat niet in de gekleurde post, en voor de groep "Het gezin"
            // bestaat er sowieso geen id.
            const kies = onKiesPost?.(p, i)
            // `p.naam` wordt NIET zomaar vertaald: deze kaart toont ook winkelnamen,
            // en die blijven overal in de app onvertaald. Alleen de rij "Zonder
            // categorie" is een woord van de app zelf — en die stond in het Engels en
            // het Frans nog in het Nederlands, terwijl de zusterlijst eronder ze wél
            // vertaalde. Dan heet hetzelfde begrip twee dingen op één scherm.
            const naam = p.zonderCategorie ? t('Zonder categorie') : p.naam
            const inhoud = (
              <>
                <span style={{ ...stip, background: p.kleur }} aria-hidden />
                <span className="rij-midden">
                  <span className="rij-titel" style={afkap}>
                    {naam}
                  </span>
                </span>
                <span className="rij-pct">{percentages[i]}%</span>
                <Bedrag centen={p.bedrag} />
                {/* Het pijltje staat er ALTIJD, maar alleen zichtbaar wanneer de rij
                    ergens heen gaat. In deze drie kaarten klikt de ene rij wel en de
                    andere niet — een rij zonder eenduidige categorie, of een kost die
                    over meerdere gezinsleden verdeeld is. Zonder teken is dat verschil
                    onzichtbaar en lijkt de app willekeurig te reageren. Met
                    `visibility` in plaats van weglaten blijft de bedragkolom van alle
                    rijen op dezelfde plek staan. Hetzelfde pijltje als in de kaart
                    'Verdeling uitgaven' hierboven, waar je het al leert kennen. */}
                <span className="rij-chevron" aria-hidden style={kies ? undefined : { visibility: 'hidden' }}>
                  ›
                </span>
              </>
            )
            return (
              <li key={`${i}-${p.naam}`} className="rij">
                {kies ? (
                  <button
                    type="button"
                    className="rij-knop"
                    aria-label={t('{naam} {pct}% {bedrag} — bekijk de boekingen', {
                      naam,
                      pct: percentages[i],
                      bedrag: formatEuro(p.bedrag),
                    })}
                    onClick={kies}
                  >
                    {inhoud}
                  </button>
                ) : (
                  inhoud
                )}
              </li>
            )
          })}
        </ul>
      </div>
      {rest.length > 0 && (
        <div className="knoprij">
          <button className="knop knop-ghost knop-klein" onClick={() => setToonAlles((s) => !s)}>
            {toonAlles ? t('Toon minder') : t('Toon alle {n} — incl. {m} overige', { n: posten.length, m: rest.length })}
          </button>
        </div>
      )}
      <div className="stat-rij" style={{ paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
        <Stat label={t('Totaal')}>{formatEuro(totaal)}</Stat>
      </div>
    </Kaart>
  )
}

export function AnalyseSectie({
  transacties,
  categorieen,
  rekeningen,
  overboekingen,
  waarderingen,
  terugkerendePosten,
  gezinsleden = [],
  beginRichting = 'uitgave',
  beginTab,
  onTabWissel,
  ankerMaand,
  maandNav,
  onGaNaarTransacties,
  onNaarOpstelling,
  onNaarVasteLasten,
  onBewerkTransactie,
  onBoekVasteLast,
  onNaarBoekingen,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  overboekingen: Overboeking[]
  waarderingen: Waardering[]
  terugkerendePosten: TerugkerendePost[]
  // Optioneel: zonder ingestelde gezinsleden blijft het blok 'per gezinslid'
  // gewoon weg — het zou dan alleen maar verwarren.
  gezinsleden?: Kind[]
  /**
   * Met welke richting de pagina opent. Kom je hier via de knop onder de donut
   * "Inkomsten per categorie" op het Overzicht, dan hoor je niet op de uitgaven te
   * landen. Verander je daarna zelf van richting, dan blijft die keuze staan: dit
   * is enkel de BEGINstand.
   */
  beginRichting?: Richting
  /**
   * Welk onderdeel opengaat. Komt uit het adres (`#/analyse/verandering`), zodat een
   * herlaadbeurt je op hetzelfde tabblad terugzet. Verandert het adres later — met de
   * terugknop of een snelkoppeling — dan volgt het scherm mee.
   */
  beginTab?: AnalyseTab
  /** Meldt een tabwissel, zodat het adres mee kan (ronde 60). */
  onTabWissel?: (tab: AnalyseTab) => void
  /**
   * De maand waar deze pagina op ankert ('JJJJ-MM'), uit de maandschakelaar.
   *
   * Ronde 40: "Deze maand" rekende hier vanuit `new Date()` en kende de
   * maandschakelaar niet. Bladerde je bovenaan naar maart, dan bleef de Analyse
   * over juli praten — zonder dat ergens te zeggen. Standaard blijft het de
   * echte huidige maand, zodat een aanroeper zonder deze prop zich exact
   * gedraagt zoals vroeger.
   */
  ankerMaand?: string
  /**
   * De maandschakelaar van de app, om rechts in de paginakop te zetten. Hij komt
   * van buiten omdat hij daar ook woont (App houdt de maand bij); deze pagina
   * hoort er geen tweede te maken.
   */
  maandNav?: ReactNode
  /** Doorklikken naar de Transacties-pagina met een filter (ronde 40). */
  onGaNaarTransacties?: (filter: TxFilter) => void
  /** De eerste stappen in de lege toestanden op deze pagina (ronde 66). Optioneel. */
  onNaarOpstelling?: () => void
  onNaarVasteLasten?: () => void
  /** Een boeking openen vanaf de drilldown (ronde 40). */
  onBewerkTransactie?: (tx: Transactie) => void
  /** Een vaste last inboeken vanaf de vooruitblik (ronde 40). */
  onBoekVasteLast?: (postId: string, maand: string) => void
  /** De eerste stap wanneer er in de hele app nog niets geboekt is (ronde 66). */
  onNaarBoekingen?: () => void
}) {
  const { t } = useT()
  const [richting, setRichting] = useState<Richting>(beginRichting)
  const [keuze, setKeuze] = useState<'maand' | 'vorige' | 'jaar' | 'alles' | 'aangepast'>('maand')
  const [van, setVan] = useState('')
  const [tot, setTot] = useState('')
  const [drill, setDrill] = useState<{ sleutel: string; naam: string } | null>(null)
  const [tab, setTab] = useState<AnalyseTab>(beginTab ?? 'verdeling')
  // De tab uit het webadres blijft gelden zolang de pagina openstaat (ronde 60).
  // Een beginwaarde wordt maar één keer gelezen; kwam je daarna via de terugknop of
  // een snelkoppeling op `#/analyse/vooruit`, dan veranderde het adres wél en het
  // scherm niet.
  useEffect(() => {
    if (beginTab) setTab(beginTab)
  }, [beginTab])

  // Een aangepast bereik waarvan de einddatum vóór de begindatum ligt, levert
  // nergens resultaten op. Vroeger bleef het scherm dan zwijgend leeg (en werd het
  // aantal dagen voor de vergelijking zelfs negatief). We merken dat geval nu op,
  // zeggen het in één regel, en rekenen verder niets uit.
  const bereikOmgekeerd = keuze === 'aangepast' && isOmgekeerdBereik(van, tot)

  // Periode omzetten naar een van/tot-bereik. Los gehouden van de rekenkern zodat
  // die zuiver testbaar blijft.
  const anker = ankerMaand ?? huidigeMaand()

  const periode: Periode = useMemo(() => {
    if (keuze === 'maand') return { van: `${anker}-01`, tot: `${anker}-31` }
    if (keuze === 'vorige') {
      const m = verschuifMaand(anker, -1)
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'jaar') {
      const j = anker.slice(0, 4)
      return { van: `${j}-01-01`, tot: `${j}-12-31` }
    }
    if (keuze === 'aangepast') return { van: van || undefined, tot: tot || undefined }
    return {}
  }, [keuze, van, tot, anker])

  // De vorige, vergelijkbare periode (voor stijgers/dalers). 'Alles' en een
  // onvolledig aangepast bereik hebben geen zinvolle vorige periode.
  const vorige: Periode | null = useMemo(() => {
    const iso = naarDatumTekst
    if (keuze === 'maand') {
      const m = verschuifMaand(anker, -1)
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'vorige') {
      const m = verschuifMaand(anker, -2)
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'jaar') {
      const j = Number(anker.slice(0, 4)) - 1
      return { van: `${j}-01-01`, tot: `${j}-12-31` }
    }
    if (keuze === 'aangepast') {
      if (!van || !tot || isOmgekeerdBereik(van, tot)) return null
      const vd = new Date(van)
      const td = new Date(tot)
      const dagen = Math.round((td.getTime() - vd.getTime()) / 86400000)
      const prevTot = new Date(vd.getTime() - 86400000)
      const prevVan = new Date(prevTot.getTime() - dagen * 86400000)
      return { van: iso(prevVan), tot: iso(prevTot) }
    }
    return null // alles
  }, [keuze, van, tot, anker])

  // Bij een omgekeerd bereik rekenen we bewust niets uit: lege kaarten met nullen
  // zouden suggereren dat er écht niets is.
  const byOv = useMemo(
    () => (bereikOmgekeerd ? [] : perHoofdcategorie(transacties, categorieen, periode, richting)),
    [bereikOmgekeerd, transacties, categorieen, periode, richting],
  )
  const byItem = useMemo(
    () => (bereikOmgekeerd ? [] : kleuren(perItem(transacties, categorieen, periode, richting))),
    [bereikOmgekeerd, transacties, categorieen, periode, richting],
  )
  const byWinkel = useMemo(
    () => (bereikOmgekeerd ? [] : kleuren(perWinkel(transacties, periode, richting))),
    [bereikOmgekeerd, transacties, periode, richting],
  )
  const totaal = totaalVan(byOv)

  // Verdeling per gezinslid. Het bedrag per transactie wordt opgebouwd uit de
  // deelregels (categorieBedragen), zodat een gesplitst kassaticket exact even
  // zwaar meetelt als een gewone transactie — en daarna gelijk verdeeld over de
  // personen die eraan hangen.
  const perPersoon = useMemo(() => {
    if (bereikOmgekeerd || gezinsleden.length === 0) return []
    const posten = transacties
      .filter((tx) => inPeriode(tx.datum, periode))
      .map((tx) => ({
        bedrag: categorieBedragen(tx)
          .filter((r) => (richting === 'uitgave' ? r.bedrag < 0 : r.bedrag > 0))
          .reduce((s, r) => s + Math.abs(r.bedrag), 0),
        persoonIds: tx.persoonIds,
      }))
      .filter((p) => p.bedrag > 0)
    return uitgavenPerPersoon(posten, gezinsleden, {
      gezin: t('Het gezin'),
      onbekend: t('Onbekend gezinslid'),
    })
  }, [bereikOmgekeerd, gezinsleden, transacties, periode, richting, t])

  // Kleuren zoals elders op deze pagina; de gezinsgroep krijgt bewust een neutrale
  // tint, zodat ze niet als een persoon leest. Sinds ronde 51 een EIGEN neutrale tint
  // en niet meer die van de restschijf: die twee kunnen nu naast elkaar in de ring
  // staan, en dan zijn ze niet meer aan hun legende te koppelen.
  const perPersoonGekleurd = useMemo(
    () =>
      kleuren(perPersoon.map((p) => ({ naam: p.naam, bedrag: p.bedrag }))).map((p, i) =>
        perPersoon[i].id === null ? { ...p, kleur: GEZIN_KLEUR } : p,
      ),
    [perPersoon],
  )

  const drillTxs = useMemo(
    () => (drill && !bereikOmgekeerd ? drillTransacties(transacties, categorieen, periode, richting, drill.sleutel) : []),
    [bereikOmgekeerd, drill, transacties, categorieen, periode, richting],
  )
  const drillSub = useMemo(() => kleuren(drillPerItem(drillTxs, categorieen)), [drillTxs, categorieen])
  const drillTotaal = totaalVan(drillTxs.map((d) => ({ bedrag: d.bedrag })))

  // Percentages per rij: in één keer berekend zodat elke kolom op exact 100% sluit.
  const ovPercentages = afgerondePercentages(byOv.map((g) => g.bedrag))
  const drillSubPercentages = afgerondePercentages(drillSub.map((p) => p.bedrag))

  // De namen van de periodekaartjes. Sta je op de huidige maand, dan blijven het
  // de vertrouwde woorden; blader je terug, dan noemen ze de maand of het jaar
  // waar je écht naar kijkt. Een kaartje "Deze maand" dat maart toont, is precies
  // het soort stille onwaarheid dat deze ronde wegwerkt.
  const opNu = anker === huidigeMaand()
  const perioden: [typeof keuze, string][] = [
    ['maand', opNu ? t('Deze maand') : maandJaarLabel(`${anker}-01`)],
    ['vorige', opNu ? t('Vorige maand') : maandJaarLabel(`${verschuifMaand(anker, -1)}-01`)],
    ['jaar', opNu ? t('Dit jaar') : anker.slice(0, 4)],
    ['alles', t('Alles')],
    ['aangepast', t('Aangepast')],
  ]
  const leegTekst = richting === 'uitgave' ? t('Geen uitgaven in deze periode') : t('Geen inkomsten in deze periode')
  /**
   * De lege toestand van deze pagina, in twee smaken (ronde 66, slotronde).
   *
   * ⚠ "Geen uitgaven in deze periode" is het JUISTE antwoord zodra er boekingen
   * bestaan: de periodekiezer staat erboven, dus je weet wat je eraan doet. Maar op
   * een app waarin nog niets geboekt is, helpt geen enkele periode — en dan stond er
   * op twee van de drie tabbladen een doodlopende zin, terwijl het derde tabblad van
   * diezelfde pagina wél een eerste stap toont.
   */
  const nogNietsGeboekt = transacties.length === 0
  const leegVlak = (
    <Leeg
      actie={
        nogNietsGeboekt && onNaarBoekingen ? (
          <EersteStapKnop onClick={onNaarBoekingen}>{t('Boeking toevoegen')}</EersteStapKnop>
        ) : undefined
      }
    >
      {nogNietsGeboekt
        ? t('Er staat nog geen enkele boeking in de app. Zodra je er een ingeeft — zelf of via een uittreksel — zie je hier waar je geld naartoe gaat.')
        : leegTekst}
    </Leeg>
  )
  const donutInvoer = byOv.map((g) => ({ naam: g.naam, bedrag: g.bedrag, kleur: g.kleur, sleutel: g.sleutel }))
  const periodeLabel = perioden.find(([k]) => k === keuze)?.[1] ?? ''

  /**
   * Elk doorklik-filter erft de gekozen periode: klik je op € 340 bij Voeding,
   * dan hoort de lijst exact die € 340 te tonen en niet je hele historiek.
   *
   * Bij een MAANDperiode geven we `maand` mee en geen van/tot-paar. Twee redenen:
   * de maandschakelaar bovenaan de transactielijst werkt dan gewoon, en `tot`
   * zou anders `2026-02-31` worden — een datum die niet bestaat en die een echt
   * datumveld leeg laat terwijl het filter wél actief is.
   */
  const filterPeriode: TxFilter =
    keuze === 'maand'
      ? { maand: anker }
      : keuze === 'vorige'
        ? { maand: verschuifMaand(anker, -1) }
        : { ...(periode.van ? { van: periode.van } : {}), ...(periode.tot ? { tot: periode.tot } : {}) }

  const metPeriode = (filter: TxFilter): TxFilter => ({ ...filter, ...filterPeriode })
  const metRichting = (filter: TxFilter): TxFilter =>
    metPeriode({ ...filter, richting: richting === 'uitgave' ? 'uit' : 'in' })

  const naarCategorie = (sleutel: string) => {
    if (!onGaNaarTransacties) return
    // 'Zonder categorie' heeft geen categorie-id, maar sinds ronde 51 wél een weg:
    // het filter `zonderCategorie` bestond al en toont precies dezelfde boekingen.
    // Voordien liep deze schijf dood — en op de donut kon je er wél op tikken,
    // waarna er zichtbaar niets gebeurde. Juist die boekingen wil je openen: dat
    // zijn de uitgaven die je nog moet indelen.
    onGaNaarTransacties(metRichting(sleutel === '' ? { zonderCategorie: true } : filterVoorCategorie(sleutel)))
  }

  /**
   * Doorklikken vanaf een rij in de drilldown "Per subcategorie".
   *
   * Die rijen worden per EXACT opgeslagen id geteld (zie `drillPerItem`): een
   * boeking die rechtstreeks op "Voeding" staat krijgt haar eigen rij naast de
   * items eronder. `filterVoorCategorie` doet het omgekeerde — een hoofd- of
   * middencategorie vangt daar juist alles eronder. Klikte je op de rij "Voeding
   * € 3,00", dan toonde de lijst dus ook alle broodboekingen en stond er ineens
   * € 8,00 boven.
   *
   * Daarom bieden we hier alleen een doorklik aan wanneer de rij een ITEM is: dan
   * is het filter exact hetzelfde als de telling. Dezelfde afweging als bij twee
   * id's met dezelfde naam: liever geen doorklik dan een die een ander bedrag
   * toont.
   */
  const naarItem = (sleutel: string) => {
    if (!onGaNaarTransacties) return
    onGaNaarTransacties(metRichting({ catId: sleutel }))
  }

  return (
    <section className="stapel">
      {/* Ronde 32: de knop "‹ Terug" stond hier, náást de paginatitel, dus hoog
          boven de rest — je moest telkens helemaal naar boven om terug te gaan.
          Ze staat nu rechts op de rij met de periodekaartjes, op ooghoogte met de
          knoppen die je op deze pagina toch al gebruikt. */}
      {/* Ronde 66: een zin die zegt wat deze pagina is — maar niet in de drilldown,
          want die vervangt de pagina en heeft haar eigen titel. */}
      <PaginaKop
        titel={drill ? drill.naam : t('Analyse')}
        bijschrift={drill ? undefined : t('Waar je geld naartoe ging, wat er duurder werd, en wat er nog aankomt. Kies bovenaan wat je bekijkt en over welke periode, en daaronder je vraag.')}
        actie={maandNav}
      />

      {/* Richting: uitgaven of inkomsten.
          ⚠ NIET op de tab "Vooruit" (ronde 60). Wat daar staat — je vermogen en de
          vaste lasten die eraan komen — kijkt niet naar de richting. De knoppen
          verschoven wel van kleur, maar er gebeurde niets: een knop die niets doet
          laat je twijfelen of je scherm nog werkt. */}
      {!(tab === 'vooruit' && !drill) && (
      <div className="knoprij" style={{ gap: 8 }}>
        <button
          type="button"
          aria-pressed={richting === 'uitgave'}
          className={richting === 'uitgave' ? 'chip chip-actief' : 'chip'}
          onClick={() => {
            setRichting('uitgave')
            setDrill(null)
          }}
        >
          {t('Uitgaven')}
        </button>
        <button
          type="button"
          aria-pressed={richting === 'inkomst'}
          className={richting === 'inkomst' ? 'chip chip-actief' : 'chip'}
          onClick={() => {
            setRichting('inkomst')
            setDrill(null)
          }}
        >
          {t('Inkomsten')}
        </button>
      </div>
      )}

      {/* Periode */}
      <div className="knoprij" style={{ gap: 8, alignItems: 'center' }}>
        {perioden.map(([k, label]) => (
          <button
            key={k}
            type="button"
            // Hulpsoftware hoort te horen WELKE periode gekozen is; de blauwe kleur
            // alleen zegt haar niets (ronde 60).
            aria-pressed={keuze === k}
            className={keuze === k ? 'chip chip-actief' : 'chip'}
            onClick={() => setKeuze(k)}
          >
            {label}
          </button>
        ))}
        {/* `marginLeft: auto` duwt de knop naar de rechterkant van dezelfde rij.
            Op een smal scherm breekt de rij af en komt ze gewoon op de volgende
            regel te staan — nog steeds vlak bij de knoppen, nooit buiten beeld. */}
        {drill && (
          <button
            className="knop knop-secundair knop-klein"
            style={{ marginLeft: 'auto' }}
            onClick={() => setDrill(null)}
          >
            ‹ {t('Terug')}
          </button>
        )}
        {keuze === 'aangepast' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Ronde 34: hier stond `fontSize: var(--tekst-s)` (13 px). Onder de
                16 px zoomt Safari op iOS vanzelf in zodra je het veld aanraakt,
                en die zoom blijft staan — zie de opmerking bij `input` in
                index.css. Alleen de padding blijft compact. */}
            <input type="date" aria-label={t('Periode van')} value={van} onChange={(e) => setVan(e.target.value)} style={{ padding: '8px 10px' }} />
            <span className="rij-meta">{t('t/m')}</span>
            <input type="date" aria-label={t('Periode tot')} value={tot} onChange={(e) => setTot(e.target.value)} style={{ padding: '8px 10px' }} />
          </span>
        )}
      </div>

      {/* ⚠ RONDE 65. Op de tab "Vooruit" veranderde er van de periodekaartjes bijna
          niets: je vermogensgrafiek staat vast op twaalf maanden en de vooruitblik
          volgt de maandschakelaar. Alleen de spaarquote luistert. De knoppen bleven
          gewoon reageren, dus je dacht dat je iets veranderd had — en de cijfers
          bleven staan. De rij hoort niet weg (ze doet wél iets); ze hoort te zeggen
          wát ze doet. Dezelfde gedachte als bij de richtingknoppen hierboven, die
          op deze tab helemaal verborgen zijn omdat ze daar níets doen. */}
      {tab === 'vooruit' && !drill && (
        <p className="rij-meta" style={{ margin: '-4px 0 0' }}>
          {t('De periode hierboven geldt op deze tab alleen voor je spaarquote. De rest volgt de maand die je bovenaan koos.')}
        </p>
      )}

      {bereikOmgekeerd && (
        <Kaart>
          <Leeg>{t('De einddatum ligt vóór de begindatum.')}</Leeg>
        </Kaart>
      )}

      {/* De drie vragen als tabbladen (ronde 60). Buiten de drilldown: die vervangt
          de hele pagina, en een tabstrook boven een detailweergave zou beloven dat
          je erin kan blijven navigeren. */}
      {!drill && !bereikOmgekeerd && (
        <Subtabs
          naam="analyse"
          label={t('Onderdeel van de analyse')}
          actief={tab}
          onKies={(id) => {
            setTab(id)
            onTabWissel?.(id)
          }}
          tabs={[
            { id: 'verdeling' as AnalyseTab, teken: '🍩', label: t('Verdeling') },
            { id: 'verandering' as AnalyseTab, teken: '📈', label: t('Wat verandert') },
            { id: 'vooruit' as AnalyseTab, teken: '🔭', label: t('Vooruit') },
          ]}
        >
          {/* Waar loopt het op? Bovenaan maar INGEKLAPT: het is een signaal, geen
              hoofdgerecht. Enkel bij uitgaven — bij inkomsten is de vraag zinloos.
              Ze stond eerder middenin de pagina en brak daar de leesvolgorde. */}
          {tab === 'verandering' && richting === 'uitgave' && (
            <BesparenKaart
              transacties={transacties}
              periode={periode}
              vorigePeriode={vorige}
              perMaand={keuze === 'maand' || keuze === 'vorige'}
              onKies={
                onGaNaarTransacties
                  ? (sleutel) => onGaNaarTransacties(metPeriode({ domein: sleutel, richting: 'uit' }))
                  : undefined
              }
            />
          )}

          {/* Wat werd er duurder? Onder de besparingskaart, want ze beantwoordt de
              volgende vraag: niet "waar loopt het op" maar "wat kost me nu meer dan
              vroeger zonder dat ik iets anders deed". Ook ingeklapt, en ook alleen
              bij uitgaven. Ze kijkt bewust NIET naar de gekozen periode: een
              prijsverhoging van maart zie je niet door één maand te bekijken. */}
          {tab === 'verandering' && richting === 'uitgave' && (
            <PrijsstijgingenKaart
              transacties={transacties}
              terugkerendePosten={terugkerendePosten}
              onToonHandelaar={
                onGaNaarTransacties ? (naam) => onGaNaarTransacties({ handelaar: naam, richting: 'uit' }) : undefined
              }
            />
          )}

          {/* Verdeling én ranglijst in ÉÉN kaart, met de donut links en de lijst
              rechts — precies dezelfde vorm als de andere donutkaarten op deze
              pagina (product/dienst, winkel, gezinslid).

              Ronde 26 had hier twee losse kaarten naast elkaar gemaakt. Dat was
              inconsistent: het is één grafiek met haar eigen cijfers, en overal
              elders op deze pagina horen die in dezelfde kaart. De rijen blijven
              aanklikbaar voor de details erachter. */}
          {tab === 'verdeling' && (byOv.length === 0 ? (
            <Kaart
              titel={richting === 'uitgave' ? t('Verdeling uitgaven') : t('Verdeling inkomsten')}
              bijschrift={t('Per hoofdcategorie')}
            >
              {leegVlak}
            </Kaart>
          ) : (
            <Kaart
              titel={richting === 'uitgave' ? t('Verdeling uitgaven') : t('Verdeling inkomsten')}
              bijschrift={t('Per hoofdcategorie — klik een rij open voor de details erachter.')}
            >
              <div className="donut-naast">
                <Donut
                  items={donutInvoer}
                  toonLegende={false}
                  grootte={DONUT_GROOTTE}
                  interactief
                  middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'}
                  // Een schijf aanklikken doet hetzelfde als de rij ernaast
                  // aanklikken: inzoomen. Twee wegen naar dezelfde plek, geen
                  // tweede betekenis.
                  onKies={(seg) => {
                    if (seg.sleutel !== undefined) setDrill({ sleutel: seg.sleutel, naam: seg.naam })
                  }}
                />
                <ul className="lijst">
                  {byOv.map((g, i) => {
                    const fractie = totaal > 0 ? g.bedrag / totaal : 0
                    return (
                      <li key={g.sleutel}>
                        <button
                          type="button"
                          className="analyse-rij"
                          aria-label={t('Toon details van {naam}', { naam: g.naam })}
                          onClick={() => setDrill({ sleutel: g.sleutel, naam: g.naam })}
                          style={{ ...rijKnop, borderBottom: i === byOv.length - 1 ? 'none' : rijKnop.borderBottom }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ ...stip, background: g.kleur ?? OVERIGE_KLEUR }} />
                            <span className="rij-midden">
                              <span className="rij-titel" style={afkap}>
                                {t(g.naam)}
                              </span>
                            </span>
                            {/* Aandeel en bedrag als twee kolommen, niet als één
                                grijze regel onder de naam. */}
                            <span className="rij-pct">{ovPercentages[i]}%</span>
                            <Bedrag centen={g.bedrag} />
                            <span className="rij-chevron" aria-hidden>›</span>
                          </span>
                          {/* Balkje in de knop: bewust de kale balk-klassen, zodat we geen
                              tweede rol/naam binnen de knop introduceren. */}
                          <span className="balk">
                            <span className="balk-vulling" style={{ display: 'block', width: `${fractie * 100}%`, background: g.kleur ?? OVERIGE_KLEUR }} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="stat-rij" style={{ paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
                <Stat label={t('Totaal')}>{formatEuro(totaal)}</Stat>
              </div>
            </Kaart>
          ))}

          {tab === 'verdeling' && byItem.length > 0 && (
            <DonutKaart
              titel={t('Verdeling per subcategorie')}
              subtitel={t('Subcategorieën — brood, koffiekoeken, elektriciteit… Klik je door, dan zie je de volledige boeking, dus een gesplitst kassaticket komt in zijn geheel in beeld.')}
              posten={byItem}
              richting={richting}
              // `perItem` geeft alleen een sleutel mee wanneer die rij aantoonbaar
              // op één item uitkomt; zonder sleutel geen knop. Zie de uitleg bij
              // `perItem` in utils/analyse.ts.
              //
              // Sinds ronde 51 klikt "Zonder categorie" wél door: daar bestaat een
              // eigen filter voor, net als bij "Het gezin" hieronder. Het was de enige
              // rij die doodliep terwijl de app precies wist welke boekingen ze bedoelde
              // — en juist die rij wil je openen, want dat zijn de boekingen die je nog
              // moet indelen.
              onKiesPost={
                onGaNaarTransacties
                  ? (p) => {
                      if (p.zonderCategorie) {
                        return () => onGaNaarTransacties(metRichting({ zonderCategorie: true }))
                      }
                      if (!p.sleutel) return undefined
                      return () => onGaNaarTransacties(metRichting(filterVoorCategorie(p.sleutel as string)))
                    }
                  : undefined
              }
            />
          )}
          {tab === 'verdeling' && byWinkel.length > 0 && (
            <DonutKaart
              titel={richting === 'uitgave' ? t('Uitgaven per winkel') : t('Inkomsten per bron')}
              subtitel={t('Gebaseerd op de omschrijving bij elke boeking')}
              posten={byWinkel}
              richting={richting}
              // `perWinkel` groepeert op de letterlijke omschrijving, dus de naam
              // ÍS de sleutel en het filter vergelijkt er exact op. Niet via
              // `handelaar`: dat schoont de omschrijving op en zou meer boekingen
              // teruggeven dan het bedrag op deze rij.
              onKiesPost={
                onGaNaarTransacties
                  ? (p) => () => onGaNaarTransacties(metRichting({ omschrijving: p.naam }))
                  : undefined
              }
            />
          )}

          {tab === 'verdeling' && perPersoonGekleurd.length > 0 && (
            <DonutKaart
              titel={richting === 'uitgave' ? t('Uitgaven per gezinslid') : t('Inkomsten per gezinslid')}
              subtitel={t('Wat aan niemand persoonlijk hangt, staat bij "Het gezin". Een kost voor meerdere gezinsleden wordt gelijk verdeeld; zo\u2019n aandeel bestaat niet als aparte boeking, dus die rij klikt niet door.')}
              posten={perPersoonGekleurd}
              richting={richting}
              // "Het gezin" staat altijd achteraan (zie `uitgavenPerPersoon`), dus bij
              // tien of meer gezinsleden viel ze buiten de ring en verdween ze in de
              // restschijf — zonder dat iets dat verried. Ze blijft nu vastgepind
              // staan (ronde 51). Praktisch zeldzaam, maar het was een echte fout in
              // de aanname dat "de tien grootste" altijd volstaat.
              vastgepind={perPersoon.findIndex((r) => r.id === null)}
              // Alleen een ZUIVERE regel krijgt een knop. Bij een kost die aan
              // meerdere gezinsleden hing, staat hier een berekend aandeel — een
              // derde van € 90 — en dat bedrag bestaat nergens als boeking. De
              // groep "Het gezin" is altijd zuiver: daar wordt nooit iets verdeeld.
              onKiesPost={
                onGaNaarTransacties
                  ? (_p, i) => {
                      const rij = perPersoon[i]
                      if (!rij || rij.gedeeld) return undefined
                      // Een lid dat intussen verwijderd is, heeft geen naam meer. Twee
                      // van die rijen heten allebei "Onbekend gezinslid", en de chip
                      // boven de lijst — en de naam van je CSV-bestand — zou dan niet
                      // zeggen naar wie je kijkt.
                      if (rij.id !== null && !gezinsleden.some((g) => g.id === rij.id)) return undefined
                      const filter: TxFilter =
                        rij.id === null ? { zonderPersoon: true } : { persoonId: rij.id }
                      return () => onGaNaarTransacties(metRichting(filter))
                    }
                  : undefined
              }
            />
          )}

          {tab === 'verandering' && (
          <TrendsSectie
            transacties={transacties}
            categorieen={categorieen}
            richting={richting}
            huidige={periode}
            vorige={vorige}
            periodeLabel={periodeLabel}
            ankerMaand={anker}
            onKies={onGaNaarTransacties ? (sleutel) => naarCategorie(sleutel) : undefined}
            onNaarBoekingen={onNaarBoekingen}
          />
          )}

          {tab === 'vooruit' && (
          <Vermogensevolutie
            rekeningen={rekeningen}
            transacties={transacties}
            overboekingen={overboekingen}
            waarderingen={waarderingen}
            ankerMaand={anker}
            onNaarRekeningen={onNaarOpstelling}
          />
          )}

          {tab === 'vooruit' && (
          <VooruitblikSectie
            transacties={transacties}
            terugkerendePosten={terugkerendePosten}
            periode={periode}
            periodeLabel={periodeLabel}
            maand={anker}
            onBoekVasteLast={onBoekVasteLast}
            onNaarVast={onNaarVasteLasten}
          />
          )}
        </Subtabs>
      )}

      {drill && !bereikOmgekeerd && (
        <>
          <Kaart>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="rij-midden">
                <span className="rij-titel" style={{ fontSize: 'var(--tekst-l)' }}>
                  {drill.naam}
                </span>
                <span className="rij-meta">{t('{n} boekingen in de periode', { n: drillTxs.length })}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <Bedrag centen={drillTotaal} groot />
                {totaal > 0 && (
                  <span className="rij-meta">
                    {Math.round((drillTotaal / totaal) * 100)}% {t('van het totaal')}
                  </span>
                )}
              </span>
            </div>
            {/* De weg van dit cijfer naar de lijst waar je het kan bewerken.
                Zonder deze knop eindigde de drilldown blind: je zag de boekingen
                wel staan, maar kon er niets mee. */}
            {onGaNaarTransacties && (
              <div className="knoprij">
                <button type="button" className="knop knop-ghost knop-klein" onClick={() => naarCategorie(drill.sleutel)}>
                  {t('Bekijk bij Boekingen ›')}
                </button>
              </div>
            )}
          </Kaart>

          {drillSub.length > 0 && (
            <Kaart titel={t('Per subcategorie')}>
              {/* Zelfde vorm als de kaarten op de hoofdpagina: donut links, lijst
                  rechts op een breed scherm, aandeel als eigen kolom. */}
              <div className="donut-naast">
                {/* Ook hier gaf de ring haar sleutels al mee, maar zonder
                    `interactief`/`onKies` gebeurde er niets (ronde 65). De schijf
                    doet nu precies wat haar rij in de lijst ernaast doet — inclusief
                    de rij "Zonder categorie", die geen categorie-id draagt maar wel
                    haar eigen filter heeft, en exclusief de rijen die nergens heen
                    gaan (die krijgen geen sleutel en dus geen knop). */}
                <Donut
                  items={drillSub.map((p, i) => ({
                    naam: p.naam,
                    bedrag: p.bedrag,
                    kleur: p.kleur,
                    ...(onGaNaarTransacties && (p.zonderCategorie || (p.sleutel && itemPerId(p.sleutel)))
                      ? { sleutel: `${i}|${p.sleutel ?? ''}` }
                      : {}),
                  }))}
                  toonLegende={false}
                  interactief
                  middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'}
                  onKies={(seg) => {
                    if (seg.sleutel === undefined || !onGaNaarTransacties) return
                    const post = drillSub[Number(seg.sleutel.split('|')[0])]
                    if (!post) return
                    if (post.zonderCategorie) onGaNaarTransacties(metRichting({ zonderCategorie: true }))
                    else if (post.sleutel) naarItem(post.sleutel)
                  }}
                />
                <ul className="lijst">
                  {drillSub.map((p, i) => {
                    const fractie = drillTotaal > 0 ? p.bedrag / drillTotaal : 0
                    return (
                      <li key={`${i}-${p.naam}`} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                        {(() => {
                          // Alleen een ITEM: zie de uitleg bij `naarItem`. Voor een
                          // rij die een hoofd- of middencategorie is, zou het filter
                          // een groter bedrag tonen dan de rij zelf. "Zonder categorie"
                          // mag sinds ronde 51 wél door, via haar eigen filter.
                          const kanDoor = Boolean(
                            onGaNaarTransacties && (p.zonderCategorie || (p.sleutel && itemPerId(p.sleutel))),
                          )
                          const inhoud = (
                            <>
                              <span style={{ ...stip, background: p.kleur }} />
                              <span className="rij-midden">
                                <span className="rij-titel" style={afkap}>
                                  {t(p.naam)}
                                </span>
                              </span>
                              <span className="rij-pct">{drillSubPercentages[i]}%</span>
                              <Bedrag centen={p.bedrag} />
                            </>
                          )
                          return kanDoor ? (
                            <button
                              type="button"
                              className="rij-knop"
                              aria-label={t('Bekijk de boekingen van {naam} — {bedrag}', {
                                naam: t(p.naam),
                                bedrag: formatEuro(p.bedrag),
                              })}
                              onClick={() =>
                                p.zonderCategorie
                                  ? onGaNaarTransacties?.(metRichting({ zonderCategorie: true }))
                                  : naarItem(p.sleutel as string)
                              }
                            >
                              {inhoud}
                              <span className="rij-chevron" aria-hidden="true">
                                ›
                              </span>
                            </button>
                          ) : (
                            // Het pijltje staat er ook hier, maar onzichtbaar: klikt in
                            // één lijst de ene rij wel en de andere niet, dan hoort dat
                            // verschil zichtbaar te zijn — en met `visibility` blijft de
                            // bedragkolom van alle rijen op dezelfde plek staan.
                            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {inhoud}
                              <span className="rij-chevron" aria-hidden="true" style={{ visibility: 'hidden' }}>
                                ›
                              </span>
                            </span>
                          )
                        })()}
                        <Balk label={p.naam} fractie={fractie} kleur={p.kleur} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Kaart>
          )}

          <Kaart titel={t('Alle boekingen')}>
            {drillTxs.length === 0 ? (
              leegVlak
            ) : (
              <ul className="lijst">
                {drillTxs.map((d, i) => {
                  const inhoud = (
                    <>
                      <span className="rij-meta" style={{ width: 52, flexShrink: 0 }}>
                        {dagKort(d.transactie.datum)}
                      </span>
                      <span className="rij-midden">
                        <span className="rij-titel" style={afkap}>
                          {d.transactie.omschrijving || t('Zonder omschrijving')}
                          {d.transactie.regels && d.transactie.regels.length > 0 && (
                            <span className="rij-meta"> · {t('Kassaticket gesplitst')}</span>
                          )}
                        </span>
                      </span>
                      <span className={richting === 'uitgave' ? 'bedrag bedrag-negatief' : 'bedrag bedrag-positief'}>
                        {richting === 'uitgave' ? '−' : '+'}
                        {formatEuro(d.bedrag)}
                      </span>
                    </>
                  )
                  return (
                    <li key={d.transactie.id || i} className="rij">
                      {/* Hier eindigde het spoor: je zag de boeking die het bedrag
                          verklaart, maar kon ze niet openen om bijvoorbeeld de
                          ontbrekende categorie recht te zetten. */}
                      {onBewerkTransactie ? (
                        <button
                          type="button"
                          className="rij-knop"
                          aria-label={t('Bewerk {oms} — {datum}, {bedrag}', {
                            oms: d.transactie.omschrijving || t('Zonder omschrijving'),
                            datum: dagKort(d.transactie.datum),
                            bedrag: formatEuro(d.bedrag),
                          })}
                          onClick={() => onBewerkTransactie(d.transactie)}
                        >
                          {inhoud}
                        </button>
                      ) : (
                        inhoud
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Kaart>
        </>
      )}
    </section>
  )
}
