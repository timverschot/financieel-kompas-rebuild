import { useCallback, useEffect, useState } from 'react'
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
}: {
  rekeningen: Rekening[]
  categorieen: Categorie[]
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: TerugkerendePost | null
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState(BEGIN.omschrijving)
  const [bedrag, setBedrag] = useState(BEGIN.bedrag)
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>(BEGIN.soort)
  const [rekeningId, setRekeningId] = useState(rekeningen[0]?.id ?? '')
  const [categorieId, setCategorieId] = useState(BEGIN.categorieId)
  const [dag, setDag] = useState(BEGIN.dag)

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

      <div className="veldrij" style={{ gap: 18 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="radio" name="vastsoort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> {t('Uitgave')}
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="radio" name="vastsoort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> {t('Inkomst')}
        </label>
      </div>

      <div className="knoprij">
        <button type="submit" disabled={!geldig} className="knop knop-secundair">
          {bewerken ? t('Vaste post wijzigen') : t('Vaste post toevoegen')}
        </button>
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
