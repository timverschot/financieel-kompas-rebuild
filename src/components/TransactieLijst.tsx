import { useEffect, useMemo, useRef, useState } from 'react'
import type { Categorie, GedeeldeKost, Rekening, Transactie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { labelVanCategorie, padVanCategorie } from '../data/categorieen/resolve'
import { filterTransacties, heeftActiefFilter, grensDatumMaandenTerug, type TxFilter } from '../utils/transactieFilter'
import { groepenVanTransactie, isGesplitstOverCategorieen, type TransactieGroep } from '../utils/transactie'
import { formatEuro } from '../utils/format'
import { kengetallenVan } from '../utils/overzicht'
import { rekeningLabel } from '../utils/rekening'
import {
  SORTEERVELDEN,
  STANDAARD_SORTERING,
  sorteerTransacties,
  volgendeSortering,
  type Sorteerveld,
  type Sortering,
} from '../utils/transactieSorteer'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT, type Vertaler } from '../i18n'
import { huidigeMaand, maandJaarLabel, vandaag } from '../utils/datum'

const STANDAARD_MAANDEN = 6

// Het vaste teken voor een kassaticket dat over méér dan één hoofdcategorie
// verdeeld is. Bewust altijd hetzelfde, zodat je zo'n ticket in één oogopslag
// herkent. (De hoofdcategorie 'Voeding' gebruikt zelf 🍽️, dus botsen doet het niet.)
const TEKEN_GESPLITST = '🛒'

// Hoeveel categoriegroepen de meta-regel voluit toont vóór ze afkapt met '+n'.
// Twee past nog comfortabel op een telefoonscherm; wat daarna komt is bijna
// altijd een klein restbedrag.
const MAX_GROEPEN_IN_META = 2

// Hoeveel van de INKLAPBARE filters staan er aan?
//
// Ronde 32: de zoekbalk en de drie keuzelijsten ernaast namen permanent twee
// regels in, ook wanneer je niets zocht — precies de melding die binnenkwam. Ze
// zitten nu mee achter de knop "Zoeken en filteren", en dus telt hun toestand
// ook mee in dit getal: de knop moet kunnen zeggen hoeveel er verborgen aanstaat.
//
// De MAAND telt nog altijd niet mee: die schakelaar blijft altijd zichtbaar, dus
// je ziet zelf al welke maand je bekijkt. Zuivere functie, los testbaar.
export function aantalActieveFilters(filter: TxFilter): number {
  return [filter.zoek, filter.richting, filter.rekeningId, filter.hoofdId, filter.catId, filter.van, filter.tot].filter(
    Boolean,
  ).length
}

// De weergavenaam van een sorteerkolom. De opgeslagen sleutel blijft
// taal-onafhankelijk; alleen wat je ziet wordt vertaald.
export function sorteerNaam(t: Vertaler, veld: Sorteerveld): string {
  switch (veld) {
    case 'bedrag':
      return t('Bedrag')
    case 'omschrijving':
      return t('Handelaar / winkel')
    default:
      return t('Datum')
  }
}

// Het teken links in een rij: het icoon van de hoofdcategorie, het vaste
// winkelkar-teken bij een gesplitst ticket, of — als er geen icoon bestaat (eigen
// categorie, geen categorie) — de beginletter van de handelaar. 'kleur' is de
// categoriekleur die als zachte achtergrond mag dienen, of null.
export function tekenVanTransactie(
  tx: Transactie,
  groepen: TransactieGroep[],
  gesplitst: boolean,
): { teken: string; kleur: string | null } {
  if (gesplitst) return { teken: TEKEN_GESPLITST, kleur: null }
  const groep = groepen[0]
  if (groep && groep.icoon) return { teken: groep.icoon, kleur: groep.kleur }
  return { teken: tx.omschrijving.trim().slice(0, 1).toUpperCase(), kleur: null }
}

// De uitsplitsing van een gesplitst ticket als één regel tekst, bv.
// "🍽️ Voeding € 41,20 · 🧹 Huishouden € 12,60 · +1". De bedragen worden zonder
// teken getoond: de richting staat al rechts in de rij bij het totaal.
export function uitsplitsingTekst(groepen: TransactieGroep[], max = MAX_GROEPEN_IN_META): string {
  const getoond = groepen.slice(0, max)
  const delen = getoond.map((g) => `${g.icoon ? `${g.icoon} ` : ''}${g.naam} ${formatEuro(Math.abs(g.bedrag))}`)
  const rest = groepen.length - getoond.length
  if (rest > 0) delen.push(`+${rest}`)
  return delen.join(' · ')
}

// Een zachte tint van de categoriekleur als achtergrond van het tekenvlakje:
// 18% kleur, de rest doorzichtig. Zo kleurt het vlakje mee met de kaart eronder
// en blijft het in donkere modus rustig en leesbaar — geen vlakke volle kleur.
// Kent een browser color-mix niet, dan valt deze stijl gewoon weg en blijft de
// standaard var(--accent-soft) uit .rij-teken staan.
export function zachteAchtergrond(kleur: string | null): string | undefined {
  if (!kleur) return undefined
  return `color-mix(in srgb, ${kleur} 18%, transparent)`
}

// Eén actief filter, als chip onder het zoekveld.
type FilterChip = { sleutel: string; label: string; wis: () => void }

// De transactielijst met zoek-/filterbalk en een historiek-venster. Standaard
// toont ze enkel de recente maanden (ouder op aanvraag); zodra je zoekt of filtert,
// wordt de volledige historiek doorzocht. Analyses/budgetten/doelen elders blijven
// altijd op de volledige data rekenen — dit venster is enkel voor deze lijst.
export function TransactieLijst({
  transacties,
  categorieen,
  rekeningen,
  gedeeldeKosten = [],
  onBewerk,
  onVerwijder,
  onVerwijderMeerdere,
  beginFilter,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  /** Om te tonen dat een boeking in een dossier gedeeld wordt (ronde 22). */
  gedeeldeKosten?: GedeeldeKost[]
  onBewerk: (tx: Transactie) => void
  onVerwijder: (id: string) => void
  /**
   * Meerdere rijen tegelijk verwijderen, met één keer ongedaan maken.
   *
   * Ronde 32: dit is het ENIGE wat je met een selectie doet. Er zat ook een
   * keuzelijst "Categorie voor de selectie" bij, maar een categorie wijzig je al
   * met het potloodje naast elke rij — twee wegen naar hetzelfde, waarvan die
   * hierboven de lijst permanent een balk breder maakte. De vinkjes blijven dus,
   * alleen om te verwijderen.
   */
  onVerwijderMeerdere?: (ids: string[]) => void
  // Optioneel: filters die al aanstaan bij het laden. Het filterpaneel klapt dan
  // meteen open, zodat de chips niet uit het niets lijken te komen.
  beginFilter?: TxFilter
}) {
  const { t } = useT()
  const [filter, setFilter] = useState<TxFilter>(beginFilter ?? {})
  const [filtersOpen, setFiltersOpen] = useState(() => aantalActieveFilters(beginFilter ?? {}) > 0)
  const [toonAlles, setToonAlles] = useState(false)
  const [sortering, setSortering] = useState<Sortering>(STANDAARD_SORTERING)
  // De aangevinkte rijen. Bewust op id en niet op index: de lijst verspringt bij
  // elke filter- of sorteerwijziging, en dan zou je andere rijen bewerken dan je
  // aangeduid hebt.
  const [selectie, setSelectie] = useState<Set<string>>(new Set())
  const [bevestigWissen, setBevestigWissen] = useState(false)

  // De mid-categorieën van de gekozen hoofdcategorie (voor de tweede keuzelijst).
  const subOpties = useMemo(() => {
    const hoofd = INGEBOUWDE_CATEGORIEEN.find((h) => h.id === filter.hoofdId)
    return hoofd ? hoofd.categorieen : []
  }, [filter.hoofdId])

  const gefilterd = useMemo(() => filterTransacties(transacties, filter), [transacties, filter])
  const gesorteerd = useMemo(() => sorteerTransacties(gefilterd, sortering), [gefilterd, sortering])

  const actief = heeftActiefFilter(filter)
  const aantalFilters = aantalActieveFilters(filter)
  const grens = grensDatumMaandenTerug(vandaag(), STANDAARD_MAANDEN)
  const venster = !actief && !toonAlles
  const zichtbaar = venster ? gesorteerd.filter((tx) => tx.datum >= grens) : gesorteerd
  const verborgen = gesorteerd.length - zichtbaar.length

  // Boek je iets met een datum ouder dan het venster, dan stond het er wél maar zag
  // je het niet: het venster van zes maanden filterde het weg en de knop om het uit
  // te klappen staat onderaan de lijst. Dat leest als "mijn invoer is niet bewaard".
  // Daarom: zodra er een boeking BIJKOMT die buiten het venster valt, klapt het
  // venster zelf open. Bij de eerste weergave gebeurt dat niet — dan is alles nieuw.
  const geziene = useRef<Set<string> | null>(null)
  useEffect(() => {
    const nu = new Set(transacties.map((tx) => tx.id))
    const vorige = geziene.current
    geziene.current = nu
    if (vorige === null) return // eerste weergave
    const nieuweBuitenVenster = transacties.some((tx) => !vorige.has(tx.id) && tx.datum < grens)
    if (nieuweBuitenVenster) setToonAlles(true)
  }, [transacties, grens])

  function zet(deel: Partial<TxFilter>) {
    setFilter((f) => ({ ...f, ...deel }))
  }

  function wis() {
    setFilter({})
    setToonAlles(false)
  }

  // De maandschakelaar. Zonder gekozen maand start hij bij de huidige maand, zodat
  // één klik op ‹ je naar vorige maand brengt in plaats van naar het niets.
  function verschuifMaand(delta: number) {
    const basis = filter.maand ?? huidigeMaand()
    const [j, m] = basis.split('-').map(Number)
    const totaal = j * 12 + (m - 1) + delta
    const nieuw = `${String(Math.floor(totaal / 12)).padStart(4, '0')}-${String((totaal % 12) + 1).padStart(2, '0')}`
    zet({ maand: nieuw })
  }

  function schakelRij(id: string) {
    setSelectie((huidig) => {
      const nieuw = new Set(huidig)
      if (nieuw.has(id)) nieuw.delete(id)
      else nieuw.add(id)
      return nieuw
    })
    setBevestigWissen(false)
  }

  function maakSelectieLeeg() {
    setSelectie(new Set())
    setBevestigWissen(false)
  }

  const categorieNaam = (id?: string) => labelVanCategorie(id, categorieen)
  // Het volledige pad ("Voeding › Brood (wit)"): in een lijst die je overloopt is
  // "Brood (wit)" zonder zijn hoofdcategorie moeilijk te plaatsen.
  const categoriePad = (id?: string) => padVanCategorie(id, categorieen)
  const rekeningNaam = (id: string) => rekeningen.find((r) => r.id === id)?.naam

  // Selectievakjes en bulkacties verschijnen alleen wanneer de app er iets mee
  // kan; zonder deze props gedraagt de lijst zich exact zoals voorheen.
  const kanBulkWissen = Boolean(onVerwijderMeerdere)
  const kanSelecteren = kanBulkWissen

  function sorteer(veld: Sorteerveld) {
    setSortering((huidig) => volgendeSortering(huidig, veld))
  }

  // De actieve filters als chips, elk met zijn eigen wisser.
  const chips: FilterChip[] = []
  // De zoekterm staat sinds ronde 32 óók als chip: het zoekveld zit nu achter een
  // knop, dus zonder deze chip zou je een lijst zien die stilletjes op iets
  // gefilterd is zonder dat er ergens staat waarop.
  if (filter.zoek) {
    chips.push({
      sleutel: 'zoek',
      label: t('Zoek: {term}', { term: filter.zoek }),
      wis: () => zet({ zoek: undefined }),
    })
  }
  if (filter.richting) {
    chips.push({
      sleutel: 'richting',
      label: filter.richting === 'in' ? t('Inkomsten') : t('Uitgaven'),
      wis: () => zet({ richting: undefined }),
    })
  }
  if (filter.rekeningId) {
    chips.push({
      sleutel: 'rekening',
      label: rekeningNaam(filter.rekeningId) ?? t('onbekende rekening'),
      wis: () => zet({ rekeningId: undefined }),
    })
  }
  if (filter.hoofdId) {
    chips.push({
      sleutel: 'hoofd',
      label: categorieNaam(filter.hoofdId) ?? filter.hoofdId,
      // Een subcategorie hoort bij haar hoofdcategorie: die valt mee weg.
      wis: () => zet({ hoofdId: undefined, catId: undefined }),
    })
  }
  if (filter.catId) {
    chips.push({
      sleutel: 'sub',
      label: subOpties.find((c) => c.id === filter.catId)?.naam ?? filter.catId,
      wis: () => zet({ catId: undefined }),
    })
  }
  if (filter.van) {
    chips.push({ sleutel: 'van', label: t('Van {datum}', { datum: filter.van }), wis: () => zet({ van: undefined }) })
  }
  if (filter.tot) {
    chips.push({ sleutel: 'tot', label: t('Tot {datum}', { datum: filter.tot }), wis: () => zet({ tot: undefined }) })
  }
  if (filter.maand) {
    chips.push({
      sleutel: 'maand',
      label: maandJaarLabel(filter.maand),
      wis: () => zet({ maand: undefined }),
    })
  }

  // De kengetallen gaan over precies de rijen die je ziet — zie kengetallenVan().
  const cijfers = kengetallenVan(zichtbaar)

  // Welke van de aangevinkte rijen staan nog in beeld? Filter je iets weg terwijl
  // er een selectie openstaat, dan mag een actie nooit rijen raken die je niet meer
  // ziet. Daarom is dit de lijst waarop de knoppen werken.
  const geselecteerd = zichtbaar.filter((tx) => selectie.has(tx.id))
  const allesAan = zichtbaar.length > 0 && geselecteerd.length === zichtbaar.length

  function schakelAlles() {
    if (allesAan) maakSelectieLeeg()
    else setSelectie(new Set(zichtbaar.map((tx) => tx.id)))
  }

  // Welke transacties in een dossier gedeeld worden. Eén set, zodat de lijst niet
  // voor elke rij opnieuw door alle gedeelde kosten moet lopen.
  const gedeeldeTxIds = useMemo(
    () => new Set(gedeeldeKosten.map((k) => k.transactieId).filter(Boolean) as string[]),
    [gedeeldeKosten],
  )

  return (
    <section className="stapel">
      {/* Drie kengetallen over precies de rijen hieronder. Ze stonden alleen op
          Overzicht, dus wie op deze pagina naar één maand of één categorie keek,
          moest zelf optellen.

          Ronde 32: dit waren drie kale labels met een cijfer eronder, zonder enige
          opmaak — de melding was "daar is helemaal geen opmaak voorzien". Het zijn
          nu exact dezelfde tegels als op Overzicht, uit dezelfde CSS-klassen. Eén
          soort kengetal in de hele app in plaats van twee. */}
      <div className="tegelrij tegelrij-drie" data-kengetallen>
        <div className="kengetal">
          <span className="label-caps">{t('Inkomsten')}</span>
          <span className="bedrag-groot" style={{ color: 'var(--positive-ink)' }}>{formatEuro(cijfers.inkomsten)}</span>
        </div>
        <div className="kengetal">
          <span className="label-caps">{t('Uitgaven')}</span>
          <span className="bedrag-groot" style={{ color: 'var(--negative-ink)' }}>{formatEuro(cijfers.uitgaven)}</span>
        </div>
        <div className="kengetal">
          <span className="label-caps">{t('Saldo')}</span>
          <span className="bedrag-groot">{formatEuro(cijfers.saldo)}</span>
        </div>
      </div>

      <Kaart>
        {/* De maandschakelaar én de filterknop op ÉÉN regel (ronde 32). Ze stonden
            onder elkaar, en nu de zoekbalk weg is zou deze kaart anders uit twee
            bijna lege regels bestaan. Wat er nog aanstaat volgt als chips: die
            breken vanzelf af naar een volgende regel wanneer het er veel zijn.

            Kies je een maand, dan wordt dat gewoon een filter: zo blijven de
            kengetallen, de lijst en de chips altijd hetzelfde zeggen. */}
        <div className="knoprij" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className="knop knop-icoon"
            aria-label={t('Vorige maand')}
            onClick={() => verschuifMaand(-1)}
          >
            ‹
          </button>
          <span style={{ minWidth: 140, textAlign: 'center', fontWeight: 600 }}>
            {filter.maand ? maandJaarLabel(filter.maand) : t('Alle maanden')}
          </span>
          <button
            type="button"
            className="knop knop-icoon"
            aria-label={t('Volgende maand')}
            onClick={() => verschuifMaand(1)}
          >
            ›
          </button>
          {filter.maand && (
            <button type="button" className="knop knop-ghost knop-klein" onClick={() => zet({ maand: undefined })}>
              {t('Alle maanden')}
            </button>
          )}

          {/* Alles wat je kan zoeken en filteren zit achter ÉÉN knop (ronde 32).
              Voorheen stond de zoekbalk met drie keuzelijsten permanent open en zat
              er dáárnaast nog een knop "Meer filters" — twee regels formulier die je
              in verreweg de meeste gevallen niet gebruikte, boven de lijst die je
              wél wou zien.

              Wat altijd zichtbaar blijft: de maand, en de chips van wat er aanstaat.
              Zo weet je zonder de lade te openen nog steeds precies waar je naar
              kijkt, en kan je elk filter met één tik weer weghalen. */}
          <button
            type="button"
            className="knop knop-secundair knop-klein"
            style={{ marginLeft: 'auto' }}
            aria-expanded={filtersOpen}
            aria-controls="transactie-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <span aria-hidden>🔍</span>{' '}
            {aantalFilters > 0 ? t('Zoeken en filteren · {n}', { n: aantalFilters }) : t('Zoeken en filteren')}
          </button>
        </div>

        {/* Wat er nu aanstaat. Elke chip haalt met één tik haar eigen filter weg. */}
        {(chips.length > 0 || actief) && (
        <div className="knoprij">
          {chips.map((c) => (
            <button
              key={c.sleutel}
              type="button"
              className="chip chip-actief"
              aria-label={t('Wis filter {naam}', { naam: c.label })}
              onClick={c.wis}
            >
              {c.label} <span aria-hidden="true">×</span>
            </button>
          ))}

          {actief && (
            <button type="button" className="chip" onClick={wis}>
              {t('Wis filters')}
            </button>
          )}
        </div>
        )}

        {filtersOpen && (
          <div id="transactie-filters" className="stapel">
            <div className="veldrij">
              <div className="veldgroep" style={{ flex: '2 1 200px' }}>
                <span className="label-caps">{t('Zoeken')}</span>
                <input
                  aria-label={t('Zoek in transacties')}
                  placeholder={t('Zoek op omschrijving…')}
                  value={filter.zoek ?? ''}
                  onChange={(e) => zet({ zoek: e.target.value })}
                />
              </div>
              <div className="veldgroep">
                <span className="label-caps">{t('Richting')}</span>
                <select
                  aria-label={t('Richting')}
                  value={filter.richting ?? ''}
                  onChange={(e) => zet({ richting: (e.target.value || undefined) as TxFilter['richting'] })}
                >
                  <option value="">{t('Alles')}</option>
                  <option value="in">{t('Inkomsten')}</option>
                  <option value="uit">{t('Uitgaven')}</option>
                </select>
              </div>
              <div className="veldgroep">
                <span className="label-caps">{t('Rekening')}</span>
                <select
                  aria-label={t('Rekening')}
                  value={filter.rekeningId ?? ''}
                  onChange={(e) => zet({ rekeningId: e.target.value || undefined })}
                >
                  <option value="">{t('Alle rekeningen')}</option>
                  {rekeningen.map((r) => (
                    <option key={r.id} value={r.id}>{rekeningLabel(r)}</option>
                  ))}
                </select>
              </div>
              <div className="veldgroep">
                <span className="label-caps">{t('Sorteer op')}</span>
                <select
                  aria-label={t('Sorteer op')}
                  value={`${sortering.veld}-${sortering.oplopend ? 'op' : 'af'}`}
                  onChange={(e) => {
                    const [veld, richting] = e.target.value.split('-')
                    setSortering({ veld: veld as Sorteerveld, oplopend: richting === 'op' })
                  }}
                >
                  {SORTEERVELDEN.map((veld) => (
                    <optgroup key={veld} label={sorteerNaam(t, veld)}>
                      <option value={`${veld}-af`}>{sorteerNaam(t, veld)} ↓</option>
                      <option value={`${veld}-op`}>{sorteerNaam(t, veld)} ↑</option>
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="veldrij">
              <label className="veldgroep">
                <span className="label-caps">{t('Hoofdcategorie')}</span>
                <select
                  value={filter.hoofdId ?? ''}
                  onChange={(e) => zet({ hoofdId: e.target.value || undefined, catId: undefined })}
                >
                  <option value="">{t('Alle categorieën')}</option>
                  {/* Ook hier door t(): dezelfde hoofdcategorie mag niet in het
                      ene formulier vertaald zijn en in het andere niet. */}
                  {INGEBOUWDE_CATEGORIEEN.map((h) => (
                    <option key={h.id} value={h.id}>{h.icoon} {t(h.naam)}</option>
                  ))}
                  {categorieen.length > 0 && (
                    <optgroup label={t('Eigen categorieën')}>
                      {categorieen.filter((c) => !c.ouderId).map((c) => (
                        <option key={c.id} value={c.id}>{c.naam}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              {subOpties.length > 0 && (
                <label className="veldgroep">
                  <span className="label-caps">{t('Subcategorie')}</span>
                  <select value={filter.catId ?? ''} onChange={(e) => zet({ catId: e.target.value || undefined })}>
                    <option value="">{t('Alle subcategorieën')}</option>
                    {subOpties.map((c) => (
                      <option key={c.id} value={c.id}>{c.naam}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="veldrij">
              <label className="veldgroep">
                <span className="label-caps">{t('Van')}</span>
                <input type="date" value={filter.van ?? ''} onChange={(e) => zet({ van: e.target.value || undefined })} />
              </label>
              <label className="veldgroep">
                <span className="label-caps">{t('Tot')}</span>
                <input type="date" value={filter.tot ?? ''} onChange={(e) => zet({ tot: e.target.value || undefined })} />
              </label>
            </div>
          </div>
        )}
      </Kaart>

      <Kaart>
        <div className="rij" style={{ borderBottom: 'none', padding: 0, gap: 12 }}>
          <p className="kaart-bijschrift rij-midden" style={{ margin: 0 }}>
            {actief
              ? t('{n} transactie(s) gevonden', { n: gesorteerd.length })
              : t('{n} transactie(s) getoond', { n: zichtbaar.length })}
          </p>
          {/* Bewust hier en niet in de kolomkop: die kop bestaat pas vanaf 1024 px,
              dus op een telefoon zou "alles selecteren" onbereikbaar zijn. */}
          {kanSelecteren && zichtbaar.length > 0 && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                className="tx-vinkje"
                aria-label={t('Alles selecteren')}
                checked={allesAan}
                onChange={schakelAlles}
              />
              <span className="rij-meta">{t('Alles selecteren')}</span>
            </label>
          )}
        </div>

        {/* Zeg het bovenaan, waar je het ziet: onderaan een lange lijst valt een
            knop niet op, en dan lijkt het alsof er boekingen weg zijn. */}
        {venster && verborgen > 0 && (
          <p className="rij-meta" data-venstermelding style={{ margin: 0 }}>
            {t('{n} oudere boeking(en) vallen buiten dit venster van {maanden} maanden.', {
              n: verborgen,
              maanden: STANDAARD_MAANDEN,
            })}{' '}
            <button
              type="button"
              className="knop knop-ghost knop-klein"
              style={{ padding: 0, minHeight: 0 }}
              onClick={() => setToonAlles(true)}
            >
              {t('Toon ze ook')}
            </button>
          </p>
        )}

        {/* Wat je met de aangevinkte rijen kan doen. Verschijnt pas zodra er iets
            aangevinkt is, zodat de balk niet permanent ruimte inneemt. */}
        {geselecteerd.length > 0 && kanBulkWissen && (
          <div className="knoprij" data-bulkbalk style={{ alignItems: 'center' }}>
            <strong>{t('{n} geselecteerd', { n: geselecteerd.length })}</strong>

            {kanBulkWissen &&
              (bevestigWissen ? (
                <>
                  <button
                    type="button"
                    className="knop knop-secundair knop-klein knop-gevaar"
                    onClick={() => {
                      onVerwijderMeerdere?.(geselecteerd.map((tx) => tx.id))
                      maakSelectieLeeg()
                    }}
                  >
                    {t('Ja, verwijder {n}', { n: geselecteerd.length })}
                  </button>
                  <button type="button" className="knop knop-ghost knop-klein" onClick={() => setBevestigWissen(false)}>
                    {t('Annuleer')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="knop knop-ghost knop-klein knop-gevaar"
                  onClick={() => setBevestigWissen(true)}
                >
                  {t('Verwijderen')}
                </button>
              ))}

            <button type="button" className="knop knop-ghost knop-klein" onClick={maakSelectieLeeg}>
              {t('Selectie wissen')}
            </button>
          </div>
        )}

        {zichtbaar.length > 0 && (
          <>
            {/* Kolomkop: verschijnt enkel vanaf 1024 px, wanneer de lijst een tabel
                wordt. De drie sorteerbare koppen zijn echte knoppen; op een telefoon
                is er geen kop en gebruik je de keuzelijst "Sorteer op" bovenaan. */}
            <div className="tx-kop label-caps" >
              <span />
              <KolomKop veld="omschrijving" sortering={sortering} onSorteer={sorteer} t={t} />
              <KolomKop veld="datum" sortering={sortering} onSorteer={sorteer} t={t} />
              <span>{t('Categorie')}</span>
              <span>{t('Rekening')}</span>
              <span className="tx-bedrag">
                <KolomKop veld="bedrag" sortering={sortering} onSorteer={sorteer} t={t} />
              </span>
              <span />
            </div>
          <ul className="lijst tx-lijst">
            {zichtbaar.map((tx) => (
              <TransactieRij
                key={tx.id}
                tx={tx}
                categorieen={categorieen}
                rekeningNaam={rekeningNaam}
                categoriePad={categoriePad}
                gedeeld={gedeeldeTxIds.has(tx.id)}
                selecteerbaar={kanSelecteren}
                aangevinkt={selectie.has(tx.id)}
                onSchakel={schakelRij}
                t={t}
                onBewerk={onBewerk}
                onVerwijder={onVerwijder}
              />
            ))}
          </ul>
          </>
        )}

        {zichtbaar.length === 0 && <Leeg>{t('Geen transacties gevonden.')}</Leeg>}

        {venster && verborgen > 0 && (
          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={() => setToonAlles(true)}>
              {t('Toon oudere transacties ({n} ouder dan {maanden} maanden)', { n: verborgen, maanden: STANDAARD_MAANDEN })}
            </button>
          </div>
        )}
        {!venster && !actief && toonAlles && (
          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={() => setToonAlles(false)}>
              {t('Toon enkel recente maanden')}
            </button>
          </div>
        )}
      </Kaart>
    </section>
  )
}

// Eén sorteerbare kolomkop. De pijl zegt welke kant het op gaat; `aria-sort` zegt
// hetzelfde tegen hulpsoftware.
function KolomKop({
  veld,
  sortering,
  onSorteer,
  t,
}: {
  veld: Sorteerveld
  sortering: Sortering
  onSorteer: (veld: Sorteerveld) => void
  t: Vertaler
}) {
  const actief = sortering.veld === veld
  return (
    <button
      type="button"
      className="knop knop-kaal tx-kolomkop"
      aria-label={t('Sorteer op {kolom}', { kolom: sorteerNaam(t, veld) })}
      aria-pressed={actief}
      onClick={() => onSorteer(veld)}
    >
      {sorteerNaam(t, veld)}
      <span aria-hidden>{actief ? (sortering.oplopend ? ' ↑' : ' ↓') : ''}</span>
    </button>
  )
}

// Eén regel in de lijst. Links het categorie-icoon (of het winkelkar-teken bij
// een gesplitst ticket, of de beginletter als terugval), daaronder de meta-regel:
// bij een gewone boeking datum · categoriepad · rekening, bij een gesplitst ticket
// de uitsplitsing met bedragen.
function TransactieRij({
  tx,
  categorieen,
  rekeningNaam,
  categoriePad,
  gedeeld,
  selecteerbaar,
  aangevinkt,
  onSchakel,
  t,
  onBewerk,
  onVerwijder,
}: {
  tx: Transactie
  categorieen: Categorie[]
  rekeningNaam: (id: string) => string | undefined
  categoriePad: (id?: string) => string | undefined
  /** Hangt er een gedeelde kost aan deze transactie? (ronde 22) */
  gedeeld: boolean
  selecteerbaar: boolean
  aangevinkt: boolean
  onSchakel: (id: string) => void
  t: Vertaler
  onBewerk: (tx: Transactie) => void
  onVerwijder: (id: string) => void
}) {
  const groepen = groepenVanTransactie(tx, categorieen)
  const gesplitst = isGesplitstOverCategorieen(tx, categorieen)
  const { teken, kleur } = tekenVanTransactie(tx, groepen, gesplitst)
  const cat = gesplitst ? uitsplitsingTekst(groepen) : categoriePad(tx.categorieId)
  const rek = rekeningNaam(tx.rekeningId)

  // Datum, categorie en rekening staan elk in een eigen element. Op een telefoon
  // vloeien ze samen tot één grijze meta-regel (de scheidingspuntjes komen uit
  // index.css); vanaf 1024 px worden het drie kolommen van de tabel. Zo staat er
  // maar één versie van de rij in de code.
  return (
    <li className={aangevinkt ? 'rij rij-aangevinkt' : 'rij'}>
      {selecteerbaar ? (
        <input
          type="checkbox"
          className="tx-vinkje"
          aria-label={t('Selecteer {oms}', { oms: tx.omschrijving })}
          checked={aangevinkt}
          onChange={() => onSchakel(tx.id)}
        />
      ) : (
        /* Decoratief: wat het icoon zegt, staat ook in de meta-regel eronder. */
        <span className="rij-teken" aria-hidden="true" style={{ backgroundColor: zachteAchtergrond(kleur) }}>
          {teken}
        </span>
      )}
      <span className="rij-midden">
        <span className="rij-titel">
          {selecteerbaar && (
            <span className="rij-teken rij-teken-klein" aria-hidden="true" style={{ backgroundColor: zachteAchtergrond(kleur) }}>
              {teken}
            </span>
          )}
          {tx.omschrijving}
          {/* De koppeling met een dossier bestaat sinds ronde 22, maar was in de
              lijst nergens te zien: je moest de boeking openen om te weten of ze
              gedeeld werd. */}
          {gedeeld && (
            <span className="badge badge-info badge-mini" title={t('Gedeeld in een dossier')}>
              {t('gedeeld')}
            </span>
          )}
        </span>
        {/* Deze drie elementen worden vanaf 1024 px de kolommen datum, categorie
            en rekening (via `display: contents`). Ze moeten dus ALTIJD alle drie
            bestaan: liet je de categorie weg bij een boeking zonder categorie, dan
            schoof de rekening een kolom naar links en stond ze onder "Categorie".
            Leeg blijven ze; op een telefoon verbergt index.css ze dan. */}
        <span className="rij-meta tx-meta">
          <span>{tx.datum}</span>
          <span>{cat ?? ''}</span>
          <span className={rek ? 'badge badge-neutraal badge-mini tx-rekening' : undefined}>{rek ?? ''}</span>
        </span>
      </span>
      <Bedrag centen={tx.bedrag} richting="auto" />
      <span className="rij-acties">
        <button
          type="button"
          className="knop knop-kaal"
          aria-label={t('Bewerk {oms}', { oms: tx.omschrijving })}
          onClick={() => onBewerk(tx)}
        >
          ✎
        </button>
        <button
          type="button"
          className="knop knop-kaal knop-gevaar"
          aria-label={t('Verwijder {oms}', { oms: tx.omschrijving })}
          onClick={() => onVerwijder(tx.id)}
        >
          ×
        </button>
      </span>
    </li>
  )
}
