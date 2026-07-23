import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Categorie, Rekening, TerugkerendePost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

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
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="vaste-omschrijving">{t('Vaste omschrijving')}</label>
        <input id="vaste-omschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="vast-bedrag">{t('Vast bedrag (€)')}</label>
        <input id="vast-bedrag" style={veld} inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="vaste-rekening">{t('Vaste rekening')}</label>
        <select id="vaste-rekening" style={veld} value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.naam}
            </option>
          ))}
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="vaste-categorie">{t('Vaste categorie')}</label>
        <select id="vaste-categorie" style={veld} value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
          <option value="">{t('Geen categorie')}</option>
          {categorieen.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naam}
            </option>
          ))}
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="vaste-dag">{t('Dag van de maand')}</label>
        <input id="vaste-dag" style={veld} inputMode="numeric" value={dag} onChange={(e) => setDag(e.target.value)} />
      </div>
      <div style={rij}>
        <label style={{ marginRight: '1rem' }}>
          <input type="radio" name="vastsoort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> {t('Uitgave')}
        </label>
        <label>
          <input type="radio" name="vastsoort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> {t('Inkomst')}
        </label>
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef7ee' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        {bewerken ? t('Vaste post wijzigen') : t('Vaste post toevoegen')}
      </button>
      {bewerken && onAnnuleer && (
        <button
          type="button"
          onClick={onAnnuleer}
          style={{ marginLeft: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          {t('Annuleer')}
        </button>
      )}
    </form>
  )
}
