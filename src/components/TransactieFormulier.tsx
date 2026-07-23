import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Categorie, Rekening, Transactie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'

const vandaag = () => new Date().toISOString().slice(0, 10)

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Invoerformulier voor een transactie. Werkt zowel voor toevoegen als bewerken:
// wanneer 'bewerken' een transactie bevat, worden de velden ermee gevuld en
// slaan we op met dezelfde id (het logboek laat die nieuwste versie winnen).
export function TransactieFormulier({
  onOpslaan,
  onAnnuleer,
  rekeningen,
  categorieen,
  bewerken,
}: {
  onOpslaan: (t: Transactie) => Promise<void> | void
  onAnnuleer?: () => void
  rekeningen: Rekening[]
  categorieen: Categorie[]
  bewerken?: Transactie | null
}) {
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>('uitgave')
  const [rekeningId, setRekeningId] = useState(rekeningen[0]?.id ?? '')
  const [categorieId, setCategorieId] = useState('')

  // Vul of leeg de velden wanneer we van modus wisselen (bewerken <-> toevoegen).
  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      setSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setDatum(bewerken.datum)
      setRekeningId(bewerken.rekeningId)
      setCategorieId(bewerken.categorieId ?? '')
    } else {
      setOmschrijving('')
      setBedrag('')
      setSoort('uitgave')
      setDatum(vandaag())
      setCategorieId('')
    }
  }, [bewerken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const geldig =
    omschrijving.trim().length > 0 &&
    Number.isFinite(bedragCenten) &&
    bedragCenten > 0 &&
    rekeningId.length > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const t: Transactie = {
      id: bewerken ? bewerken.id : nieuwId(),
      datum,
      omschrijving: omschrijving.trim(),
      bedrag: soort === 'uitgave' ? -bedragCenten : bedragCenten,
      rekeningId,
      ...(categorieId ? { categorieId } : {}),
    }
    await onOpslaan(t)
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '1rem' }}>
      <div style={rij}>
        <label htmlFor="omschrijving">Omschrijving</label>
        <input id="omschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="bedrag">Bedrag (€)</label>
        <input
          id="bedrag"
          style={veld}
          inputMode="decimal"
          placeholder="0,00"
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
        />
      </div>
      <div style={rij}>
        <label htmlFor="datum">Datum</label>
        <input id="datum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="rekening">Rekening</label>
        <select id="rekening" style={veld} value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.naam}
            </option>
          ))}
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="categorie">Categorie</label>
        <select id="categorie" style={veld} value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
          <option value="">Geen categorie</option>
          {categorieen.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naam}
            </option>
          ))}
        </select>
      </div>
      <div style={rij}>
        <label style={{ marginRight: '1rem' }}>
          <input type="radio" name="soort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> Uitgave
        </label>
        <label>
          <input type="radio" name="soort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> Inkomst
        </label>
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.5rem 0.9rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef7ee' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        {bewerken ? 'Wijzigen' : 'Toevoegen'}
      </button>
      {bewerken && onAnnuleer && (
        <button
          type="button"
          onClick={onAnnuleer}
          style={{ marginLeft: '0.5rem', padding: '0.5rem 0.9rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          Annuleer
        </button>
      )}
    </form>
  )
}
