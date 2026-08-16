import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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
import { afgerondePercentages } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { Kaart, PaginaKop, Leeg, Bedrag, Stat, Balk } from '../ui/basis'
import { useT } from '../i18n'
import { naarDatumTekst, huidigeMaand, maandJaarLabel } from '../utils/datum'
import { verschuifMaand } from '../utils/maandverloop'
import { isOmgekeerdBereik, filterVoorCategorie, type TxFilter } from '../utils/transactieFilter'
import { kleurVoor, OVERIGE_KLEUR } from '../ui/palet'
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


// Uitklapbare donutkaart: het diagram toont top 10 + een 'Overige'-schijf; de
// legende toont standaard de top 10 en kan naar alles uitklappen.
function DonutKaart({
  titel,
  subtitel,
  posten,
  richting,
  onKiesPost,
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
  onKiesPost?: (post: Gekleurd) => (() => void) | undefined
}) {
  const { t } = useT()
  const [toonAlles, setToonAlles] = useState(false)
  const totaal = totaalVan(posten)
  const top10 = posten.slice(0, 10)
  const rest = posten.slice(10)
  const restTotaal = totaalVan(rest)
  const ring = top10.map((p) => ({ naam: p.naam, bedrag: p.bedrag, kleur: p.kleur }))
  if (restTotaal > 0) ring.push({ naam: t('Overige ({n})', { n: rest.length }), bedrag: restTotaal, kleur: OVERIGE_KLEUR })
  const legende = toonAlles ? posten : top10
  // Percentages over de VOLLEDIGE lijst berekenen (niet enkel de zichtbare top 10),
  // zodat een rij hetzelfde percentage houdt als je de lijst uitklapt. 'legende' is
  // altijd het begin van 'posten', dus de plaatsen lopen gelijk.
  const percentages = afgerondePercentages(posten.map((p) => p.bedrag))

  return (
    <Kaart titel={titel} bijschrift={subtitel}>
      {/* Donut links, legende rechts vanaf 1024 px (zie .donut-naast in
          index.css). Voorheen stond de legende altijd onder de donut, ook op een
          breed scherm — dan sleep je je ogen van boven naar onder om een schijf
          bij haar bedrag te zoeken. */}
      <div className="donut-naast">
        <Donut items={ring} toonLegende={false} grootte={DONUT_GROOTTE} middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'} />
        {/* Bewust GEEN maxHeight op deze lijst.
            Ze had er een van 260 px zodra je uitklapte, met een eigen schuifbalk.
            Gevolg: ingeklapt zag je tien rijen volledig, en na "Toon alle 19" werden
            negentien rijen in een venster geperst dat kleiner was dan wat je
            daarvoor zag — de knop "toon meer" toonde dus mínder. De kaart mag
            gewoon langer worden. */}
        <ul className="lijst">
          {legende.map((p, i) => {
            const kies = onKiesPost?.(p)
            const inhoud = (
              <>
                <span style={{ ...stip, background: p.kleur }} />
                <span className="rij-midden">
                  <span className="rij-titel" style={afkap}>
                    {p.naam}
                  </span>
                </span>
                <span className="rij-pct">{percentages[i]}%</span>
                <Bedrag centen={p.bedrag} />
              </>
            )
            return (
              <li key={`${i}-${p.naam}`} className="rij">
                {kies ? (
                  <button
                    type="button"
                    className="rij-knop"
                    aria-label={t('{naam} {pct}% {bedrag} — bekijk de boekingen', {
                      naam: p.naam,
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
  ankerMaand,
  maandNav,
  onGaNaarTransacties,
  onBewerkTransactie,
  onBoekVasteLast,
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
  /** Een boeking openen vanaf de drilldown (ronde 40). */
  onBewerkTransactie?: (tx: Transactie) => void
  /** Een vaste last inboeken vanaf de vooruitblik (ronde 40). */
  onBoekVasteLast?: (postId: string, maand: string) => void
}) {
  const { t } = useT()
  const [richting, setRichting] = useState<Richting>(beginRichting)
  const [keuze, setKeuze] = useState<'maand' | 'vorige' | 'jaar' | 'alles' | 'aangepast'>('maand')
  const [van, setVan] = useState('')
  const [tot, setTot] = useState('')
  const [drill, setDrill] = useState<{ sleutel: string; naam: string } | null>(null)

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

  // Kleuren zoals elders op deze pagina; de gezinsgroep krijgt bewust de neutrale
  // 'overige'-tint, zodat ze niet als een persoon leest.
  const perPersoonGekleurd = useMemo(
    () =>
      kleuren(perPersoon.map((p) => ({ naam: p.naam, bedrag: p.bedrag }))).map((p, i) =>
        perPersoon[i].id === null ? { ...p, kleur: OVERIGE_KLEUR } : p,
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
    // 'Zonder categorie' heeft geen id om op te filteren; dan is er niets om
    // heen te gaan en tonen we de knop ook niet.
    if (!onGaNaarTransacties || !sleutel) return
    onGaNaarTransacties(metRichting(filterVoorCategorie(sleutel)))
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
      <PaginaKop titel={drill ? drill.naam : t('Analyse')} actie={maandNav} />

      {/* Richting: uitgaven of inkomsten */}
      <div className="knoprij" style={{ gap: 8 }}>
        <button
          className={richting === 'uitgave' ? 'chip chip-actief' : 'chip'}
          onClick={() => {
            setRichting('uitgave')
            setDrill(null)
          }}
        >
          {t('Uitgaven')}
        </button>
        <button
          className={richting === 'inkomst' ? 'chip chip-actief' : 'chip'}
          onClick={() => {
            setRichting('inkomst')
            setDrill(null)
          }}
        >
          {t('Inkomsten')}
        </button>
      </div>

      {/* Periode */}
      <div className="knoprij" style={{ gap: 8, alignItems: 'center' }}>
        {perioden.map(([k, label]) => (
          <button key={k} className={keuze === k ? 'chip chip-actief' : 'chip'} onClick={() => setKeuze(k)}>
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

      {bereikOmgekeerd && (
        <Kaart>
          <Leeg>{t('De einddatum ligt vóór de begindatum.')}</Leeg>
        </Kaart>
      )}

      {!drill && !bereikOmgekeerd && (
        <>
          {/* Waar loopt het op? Bovenaan maar INGEKLAPT: het is een signaal, geen
              hoofdgerecht. Enkel bij uitgaven — bij inkomsten is de vraag zinloos.
              Ze stond eerder middenin de pagina en brak daar de leesvolgorde. */}
          {richting === 'uitgave' && (
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
          {richting === 'uitgave' && (
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
          {byOv.length === 0 ? (
            <Kaart
              titel={richting === 'uitgave' ? t('Verdeling uitgaven') : t('Verdeling inkomsten')}
              bijschrift={t('Per hoofdcategorie')}
            >
              <Leeg>{leegTekst}</Leeg>
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
          )}

          {byItem.length > 0 && (
            <DonutKaart
              titel={t('Verdeling per product/dienst')}
              subtitel={t('Subcategorieën — brood, koffiekoeken, elektriciteit…')}
              posten={byItem}
              richting={richting}
            />
          )}
          {byWinkel.length > 0 && (
            <DonutKaart
              titel={richting === 'uitgave' ? t('Uitgaven per winkel') : t('Inkomsten per bron')}
              subtitel={t('Gebaseerd op de omschrijving bij elke transactie')}
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

          {perPersoonGekleurd.length > 0 && (
            <DonutKaart
              titel={richting === 'uitgave' ? t('Uitgaven per gezinslid') : t('Inkomsten per gezinslid')}
              subtitel={t('Hangt een transactie aan meerdere gezinsleden, dan wordt het bedrag gelijk over hen verdeeld.')}
              posten={perPersoonGekleurd}
              richting={richting}
            />
          )}

          <TrendsSectie
            transacties={transacties}
            categorieen={categorieen}
            richting={richting}
            huidige={periode}
            vorige={vorige}
            periodeLabel={periodeLabel}
            ankerMaand={anker}
            onKies={onGaNaarTransacties ? (sleutel) => naarCategorie(sleutel) : undefined}
          />

          <Vermogensevolutie
            rekeningen={rekeningen}
            transacties={transacties}
            overboekingen={overboekingen}
            waarderingen={waarderingen}
            ankerMaand={anker}
          />

          <VooruitblikSectie
            transacties={transacties}
            terugkerendePosten={terugkerendePosten}
            periode={periode}
            periodeLabel={periodeLabel}
            maand={anker}
            onBoekVasteLast={onBoekVasteLast}
          />
        </>
      )}

      {drill && !bereikOmgekeerd && (
        <>
          <Kaart>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="rij-midden">
                <span className="rij-titel" style={{ fontSize: 'var(--tekst-l)' }}>
                  {drill.naam}
                </span>
                <span className="rij-meta">{t('{n} transacties in de periode', { n: drillTxs.length })}</span>
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
            {onGaNaarTransacties && drill.sleutel !== '' && (
              <div className="knoprij">
                <button type="button" className="knop knop-ghost knop-klein" onClick={() => naarCategorie(drill.sleutel)}>
                  {t('Bekijk in Transacties ›')}
                </button>
              </div>
            )}
          </Kaart>

          {drillSub.length > 0 && (
            <Kaart titel={t('Per subcategorie')}>
              {/* Zelfde vorm als de kaarten op de hoofdpagina: donut links, lijst
                  rechts op een breed scherm, aandeel als eigen kolom. */}
              <div className="donut-naast">
                <Donut
                  items={drillSub.map((p) => ({ naam: p.naam, bedrag: p.bedrag, kleur: p.kleur, sleutel: p.sleutel }))}
                  toonLegende={false}
                  middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'}
                />
                <ul className="lijst">
                  {drillSub.map((p, i) => {
                    const fractie = drillTotaal > 0 ? p.bedrag / drillTotaal : 0
                    return (
                      <li key={`${i}-${p.naam}`} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                        {(() => {
                          // Alleen een ITEM: zie de uitleg bij `naarItem`. Voor een
                          // rij die een hoofd- of middencategorie is, zou het filter
                          // een groter bedrag tonen dan de rij zelf.
                          const kanDoor = Boolean(onGaNaarTransacties && p.sleutel && itemPerId(p.sleutel))
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
                              onClick={() => naarItem(p.sleutel as string)}
                            >
                              {inhoud}
                            </button>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{inhoud}</span>
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

          <Kaart titel={t('Alle transacties')}>
            {drillTxs.length === 0 ? (
              <Leeg>{leegTekst}</Leeg>
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
