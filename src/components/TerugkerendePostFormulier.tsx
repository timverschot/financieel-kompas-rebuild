import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Rekening, TerugkerendePost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

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
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>('uitgave')
  const [rekeningId, setRekeningId] = useState(rekeningen[0]?.id ?? '')
  const [categorieId, setCategorieId] = useState('')
  const [dag, setDag] = useState('1')

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      setSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setRekeningId(bewerken.rekeningId)
      setCategorieId(bewerken.categorieId ?? '')
      setDag(String(bewerken.dag))
    } else {
      setOmschrijving('')
      setBedrag('')
      setSoort('uitgave')
      setCategorieId('')
      setDag('1')
    }
  }, [bewerken])

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
          <select id="vaste-categorie" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">{t('Geen categorie')}</option>
            {categorieen.map((c) => (
              <option key={c.id} value={c.id}>
                {c.naam}
              </option>
            ))}
          </select>
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
    </form>
  )
}
