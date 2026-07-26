import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Rekening, TerugkerendePost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'
import { CategorieSelect } from './CategorieSelect'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen. De gekozen rekening
// hoort hier bewust niet bij: die blijft staan als handige standaard.
const BEGIN = { omschrijving: '', bedrag: '', soort: 'uitgave' as const, categorieId: '', dag: '1' }

// Formulier om een vaste (terugkerende) post aan te maken of te bewerken.
export function TerugkerendePostFormulier({
  rekeningen,
  categorieen,
  onOpslaan,
  onAnnuleer,
  bewerken,
  onOpgeslagen,
}: {
  rekeningen: Rekening[]
  categorieen: Categorie[]
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: TerugkerendePost | null
  /**
   * Wordt aangeroepen ná een gelukte opslag. `blijfOpen` is waar wanneer je op
   * "Opslaan + volgende" duwde. Zodra deze prop meegegeven wordt, verschijnt die
   * tweede knop — zo hoeft de invoerpopup niets over dit formulier te weten.
   */
  onOpgeslagen?: (opties: { blijfOpen: boolean }) => void
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState(BEGIN.omschrijving)
  const [bedrag, setBedrag] = useState(BEGIN.bedrag)
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>(BEGIN.soort)
  const [rekeningId, setRekeningId] = useState(rekeningen[0]?.id ?? '')
  const [categorieId, setCategorieId] = useState(BEGIN.categorieId)
  const [dag, setDag] = useState(BEGIN.dag)
  // Welke van de twee opslaanknoppen ingedrukt werd. Een klik komt altijd vóór de
  // verzending van het formulier, dus dit staat juist op het moment dat we het lezen.
  const blijfOpen = useRef(false)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    setOmschrijving(BEGIN.omschrijving)
    setBedrag(BEGIN.bedrag)
    setSoort(BEGIN.soort)
    setCategorieId(BEGIN.categorieId)
    setDag(BEGIN.dag)
  }, [])

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      setSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setRekeningId(bewerken.rekeningId)
      setCategorieId(bewerken.categorieId ?? '')
      setDag(String(bewerken.dag))
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const dagGetal = Number.parseInt(dag, 10)
  const geldig =
    omschrijving.trim().length > 0 &&
    Number.isFinite(bedragCenten) &&
    bedragCenten > 0 &&
    rekeningId.length > 0 &&
    Number.isInteger(dagGetal) &&
    dagGetal >= 1 &&
    dagGetal <= 28

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      omschrijving: omschrijving.trim(),
      bedrag: soort === 'uitgave' ? -bedragCenten : bedragCenten,
      rekeningId,
      dag: dagGetal,
      ...(categorieId ? { categorieId } : {}),
    })
    // Bij een NIEUWE vaste post blijft 'bewerken' null, dus de useEffect hierboven
    // draait niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en
    // maakt een tweede klik dezelfde post nog eens aan.
    if (!bewerken) leegmaken()
    const nog = blijfOpen.current
    blijfOpen.current = false
    onOpgeslagen?.({ blijfOpen: nog })
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldgroep">
        <label className="label-caps" htmlFor="vaste-omschrijving">
          {t('Vaste omschrijving')}
        </label>
        <input id="vaste-omschrijving" value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="vast-bedrag">
            {t('Vast bedrag (€)')}
          </label>
          <input id="vast-bedrag" inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="vaste-dag">
            {t('Dag van de maand')}
          </label>
          <input id="vaste-dag" inputMode="numeric" value={dag} onChange={(e) => setDag(e.target.value)} />
        </div>
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="vaste-rekening">
            {t('Vaste rekening')}
          </label>
          <select id="vaste-rekening" value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
            {rekeningen.map((r) => (
              <option key={r.id} value={r.id}>
                {r.naam}
              </option>
            ))}
          </select>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="vaste-categorie">
            {t('Vaste categorie')}
          </label>
          {/* Dezelfde bron als het budgetformulier: de ingebouwde hoofdcategorieën
              én de eigen categorieën. Voorheen stonden hier alleen de eigen
              categorieën, dus wie er nog geen gemaakt had, kon een vaste last aan
              niets hangen — en die viel dan uit elke telling. */}
          <CategorieSelect
            id="vaste-categorie"
            waarde={categorieId}
            onKies={setCategorieId}
            categorieen={categorieen}
            metGeenKeuze
          />
        </div>
      </div>

      {/* Deze twee bolletjes stonden zonder enige uitleg onder het formulier. In de
          invoerpopup staat er nu bovenaan een knop "Vaste last", en dan lijkt een
          losse keuze "Uitgave / Inkomst" eronder een tegenspraak. Ze is het niet:
          een vaste post kán ook geld zijn dat elke maand binnenkomt (loon, huurgeld
          dat je ontvangt). Vandaar dit kopje. */}
      <span className="label-caps">{t('Komt dit geld binnen of gaat het eruit?')}</span>
      <div className="veldrij" style={{ gap: 18, marginTop: -6 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="radio" name="vastsoort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> {t('Uitgave')}
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="radio" name="vastsoort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> {t('Inkomst')}
        </label>
      </div>

      <div className="knoprij">
        {/* In de popup is dit de hoofdactie van het scherm; in de kaart op de
            budgetpagina is het één actie tussen andere. */}
        <button type="submit" disabled={!geldig} className={onOpgeslagen ? 'knop knop-primair' : 'knop knop-secundair'}>
          {bewerken ? t('Vaste post wijzigen') : t('Vaste post toevoegen')}
        </button>
        {onOpgeslagen && !bewerken && (
          <button
            type="submit"
            disabled={!geldig}
            className="knop knop-ghost"
            onClick={() => {
              blijfOpen.current = true
            }}
          >
            {t('Opslaan + volgende')}
          </button>
        )}
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-ghost" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {t('Geef een naam en een geldig bedrag om op te slaan.')}
        </p>
      )}
    </form>
  )
}
