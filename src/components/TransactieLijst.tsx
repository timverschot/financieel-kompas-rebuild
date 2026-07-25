import { useMemo, useState } from 'react'
import type { Categorie, Rekening, Transactie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { filterTransacties, heeftActiefFilter, grensDatumMaandenTerug, type TxFilter } from '../utils/transactieFilter'
import { groepenVanTransactie, isGesplitstOverCategorieen, type TransactieGroep } from '../utils/transactie'
import { formatEuro } from '../utils/format'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT, type Vertaler } from '../i18n'
import { vandaag } from '../utils/datum'

const STANDAARD_MAANDEN = 6

// Het vaste teken voor een kassaticket dat over méér dan één hoofdcategorie
// verdeeld is. Bewust altijd hetzelfde, zodat je zo'n ticket in één oogopslag
// herkent. (De hoofdcategorie 'Voeding' gebruikt zelf 🍽️, dus botsen doet het niet.)
const TEKEN_GESPLITST = '🛒'

// Hoeveel categoriegroepen de meta-regel voluit toont vóór ze afkapt met '+n'.
// Twee past nog comfortabel op een telefoonscherm; wat daarna komt is bijna
// altijd een klein restbedrag.
const MAX_GROEPEN_IN_META = 2

// Hoeveel van de INKLAPBARE filters staan er aan? Het zoekveld telt bewust niet
// mee: dat blijft altijd zichtbaar, dus de gebruiker ziet dat zelf al staan.
// Zuivere functie, zodat ze los testbaar is.
export function aantalActieveFilters(filter: TxFilter): number {
  return [filter.richting, filter.rekeningId, filter.hoofdId, filter.catId, filter.van, filter.tot].filter(Boolean).length
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
function zachteAchtergrond(kleur: string | null): string | undefined {
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
  onBewerk,
  onVerwijder,
  beginFilter,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  onBewerk: (tx: Transactie) => void
  onVerwijder: (id: string) => void
  // Optioneel: filters die al aanstaan bij het laden. Het filterpaneel klapt dan
  // meteen open, zodat de chips niet uit het niets lijken te komen.
  beginFilter?: TxFilter
}) {
  const { t } = useT()
  const [filter, setFilter] = useState<TxFilter>(beginFilter ?? {})
  const [filtersOpen, setFiltersOpen] = useState(() => aantalActieveFilters(beginFilter ?? {}) > 0)
  const [toonAlles, setToonAlles] = useState(false)

  // De mid-categorieën van de gekozen hoofdcategorie (voor de tweede keuzelijst).
  const subOpties = useMemo(() => {
    const hoofd = INGEBOUWDE_CATEGORIEEN.find((h) => h.id === filter.hoofdId)
    return hoofd ? hoofd.categorieen : []
  }, [filter.hoofdId])

  const gefilterd = useMemo(() => filterTransacties(transacties, filter), [transacties, filter])
  const gesorteerd = useMemo(() => [...gefilterd].sort((a, b) => (a.datum < b.datum ? 1 : -1)), [gefilterd])

  const actief = heeftActiefFilter(filter)
  const aantalFilters = aantalActieveFilters(filter)
  const grens = grensDatumMaandenTerug(vandaag(), STANDAARD_MAANDEN)
  const venster = !actief && !toonAlles
  const zichtbaar = venster ? gesorteerd.filter((tx) => tx.datum >= grens) : gesorteerd
  const verborgen = gesorteerd.length - zichtbaar.length

  function zet(deel: Partial<TxFilter>) {
    setFilter((f) => ({ ...f, ...deel }))
  }

  function wis() {
    setFilter({})
    setToonAlles(false)
  }

  const categorieNaam = (id?: string) => labelVanCategorie(id, categorieen)
  const rekeningNaam = (id: string) => rekeningen.find((r) => r.id === id)?.naam

  // De actieve filters als chips, elk met zijn eigen wisser.
  const chips: FilterChip[] = []
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

  return (
    <section className="stapel">
      <Kaart>
        <div className="veldgroep">
          <input
            aria-label={t('Zoek in transacties')}
            placeholder={t('Zoek op omschrijving…')}
            value={filter.zoek ?? ''}
            onChange={(e) => zet({ zoek: e.target.value })}
          />
        </div>

        {/* Altijd zichtbaar: de knop die het filterpaneel open- en dichtklapt,
            de chips van wat er nu aanstaat, en de wisknop. */}
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-secundair knop-klein"
            aria-expanded={filtersOpen}
            aria-controls="transactie-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {aantalFilters > 0 ? t('Filters · {n}', { n: aantalFilters }) : t('Filters')}
          </button>

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

        {filtersOpen && (
          <div id="transactie-filters" className="stapel">
            <div className="veldrij">
              <label className="veldgroep">
                <span className="label-caps">{t('Richting')}</span>
                <select value={filter.richting ?? ''} onChange={(e) => zet({ richting: (e.target.value || undefined) as TxFilter['richting'] })}>
                  <option value="">{t('Alles')}</option>
                  <option value="in">{t('Inkomsten')}</option>
                  <option value="uit">{t('Uitgaven')}</option>
                </select>
              </label>
              <label className="veldgroep">
                <span className="label-caps">{t('Rekening')}</span>
                <select value={filter.rekeningId ?? ''} onChange={(e) => zet({ rekeningId: e.target.value || undefined })}>
                  <option value="">{t('Alle rekeningen')}</option>
                  {rekeningen.map((r) => (
                    <option key={r.id} value={r.id}>{r.naam}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="veldrij">
              <label className="veldgroep">
                <span className="label-caps">{t('Hoofdcategorie')}</span>
                <select
                  value={filter.hoofdId ?? ''}
                  onChange={(e) => zet({ hoofdId: e.target.value || undefined, catId: undefined })}
                >
                  <option value="">{t('Alle categorieën')}</option>
                  {INGEBOUWDE_CATEGORIEEN.map((h) => (
                    <option key={h.id} value={h.id}>{h.naam}</option>
                  ))}
                  {categorieen.length > 0 && (
                    <optgroup label={t('Eigen categorieën')}>
                      {categorieen.map((c) => (
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
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {actief
            ? t('{n} transactie(s) gevonden', { n: gesorteerd.length })
            : t('{n} transactie(s) getoond', { n: zichtbaar.length })}
        </p>

        {zichtbaar.length > 0 && (
          <ul className="lijst">
            {zichtbaar.map((tx) => (
              <TransactieRij
                key={tx.id}
                tx={tx}
                categorieen={categorieen}
                rekeningNaam={rekeningNaam}
                categorieNaam={categorieNaam}
                t={t}
                onBewerk={onBewerk}
                onVerwijder={onVerwijder}
              />
            ))}
          </ul>
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

// Eén regel in de lijst. Links het categorie-icoon (of het winkelkar-teken bij
// een gesplitst ticket, of de beginletter als terugval), daaronder de meta-regel:
// bij een gewone boeking datum · categorie · rekening, bij een gesplitst ticket
// de uitsplitsing met bedragen.
function TransactieRij({
  tx,
  categorieen,
  rekeningNaam,
  categorieNaam,
  t,
  onBewerk,
  onVerwijder,
}: {
  tx: Transactie
  categorieen: Categorie[]
  rekeningNaam: (id: string) => string | undefined
  categorieNaam: (id?: string) => string | undefined
  t: Vertaler
  onBewerk: (tx: Transactie) => void
  onVerwijder: (id: string) => void
}) {
  const groepen = groepenVanTransactie(tx, categorieen)
  const gesplitst = isGesplitstOverCategorieen(tx, categorieen)
  const { teken, kleur } = tekenVanTransactie(tx, groepen, gesplitst)
  const cat = gesplitst ? uitsplitsingTekst(groepen) : categorieNaam(tx.categorieId)
  const meta = [tx.datum, cat, rekeningNaam(tx.rekeningId)].filter(Boolean).join(' · ')

  return (
    <li className="rij">
      {/* Decoratief: wat het icoon zegt, staat ook in de meta-regel eronder. */}
      <span className="rij-teken" aria-hidden="true" style={{ backgroundColor: zachteAchtergrond(kleur) }}>
        {teken}
      </span>
      <span className="rij-midden">
        <span className="rij-titel">{tx.omschrijving}</span>
        <span className="rij-meta">{meta}</span>
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
