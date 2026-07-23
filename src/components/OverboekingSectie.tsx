import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Overboeking, Rekening } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }
const vandaag = () => new Date().toISOString().slice(0, 10)

const kop: CSSProperties = { fontSize: '1rem', marginBottom: '0.25rem' }

// Overzicht + formulier voor interne overboekingen tussen je eigen rekeningen.
// Een overboeking is géén inkomst of uitgave; ze verschuift enkel geld en telt dus
// nergens mee in het maandoverzicht of de budgetten.
export function OverboekingSectie({
  overboekingen,
  rekeningen,
  bewerken,
  onOpslaan,
  onVerwijderen,
  onBewerk,
  onStopBewerken,
}: {
  overboekingen: Overboeking[]
  rekeningen: Rekening[]
  bewerken?: Overboeking | null
  onOpslaan: (o: Overboeking) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBewerk: (o: Overboeking) => void
  onStopBewerken: () => void
}) {
  const [vanId, setVanId] = useState('')
  const [naarId, setNaarId] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [omschrijving, setOmschrijving] = useState('')

  // Vul het formulier bij het starten/stoppen van bewerken.
  const bewerkId = bewerken?.id ?? null
  const [vorigeBewerkId, setVorigeBewerkId] = useState<string | null>(null)
  if (bewerkId !== vorigeBewerkId) {
    setVorigeBewerkId(bewerkId)
    if (bewerken) {
      setVanId(bewerken.vanRekeningId)
      setNaarId(bewerken.naarRekeningId)
      setBedrag(centenNaarInvoer(bewerken.bedrag))
      setDatum(bewerken.datum)
      setOmschrijving(bewerken.omschrijving ?? '')
    } else {
      setVanId('')
      setNaarId('')
      setBedrag('')
      setDatum(vandaag())
      setOmschrijving('')
    }
  }

  const centen = invoerNaarCenten(bedrag)
  const geldig =
    vanId.length > 0 && naarId.length > 0 && vanId !== naarId && Number.isFinite(centen) && centen > 0

  const naam = (id: string) => rekeningen.find((r) => r.id === id)?.naam ?? 'onbekende rekening'

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const o: Overboeking = {
      id: bewerken ? bewerken.id : nieuwId(),
      datum,
      vanRekeningId: vanId,
      naarRekeningId: naarId,
      bedrag: centen,
      ...(omschrijving.trim() ? { omschrijving: omschrijving.trim() } : {}),
    }
    await onOpslaan(o)
    if (!bewerken) {
      setBedrag('')
      setOmschrijving('')
    }
  }

  const gesorteerd = [...overboekingen].sort((a, b) => (a.datum < b.datum ? 1 : -1))

  return (
    <section>
      <h2 style={kop}>Overboekingen</h2>
      <p style={{ color: '#888', marginTop: 0 }}>Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).</p>

      {rekeningen.length < 2 ? (
        <p style={{ color: '#888' }}>Je hebt minstens twee rekeningen nodig om over te boeken.</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
            {gesorteerd.map((o) => (
              <li
                key={o.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <span>
                  {naam(o.vanRekeningId)} → {naam(o.naarRekeningId)}
                  {o.omschrijving && <span style={{ color: '#999', fontSize: '0.85rem' }}> · {o.omschrijving}</span>}
                  <span style={{ color: '#999', fontSize: '0.85rem' }}> · {o.datum}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>{formatEuro(o.bedrag)}</span>
                  <button aria-label={`Bewerk overboeking ${naam(o.vanRekeningId)} naar ${naam(o.naarRekeningId)}`} onClick={() => onBewerk(o)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                    ✎
                  </button>
                  <button aria-label={`Verwijder overboeking ${naam(o.vanRekeningId)} naar ${naam(o.naarRekeningId)}`} onClick={() => onVerwijderen(o.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <form onSubmit={verzend}>
            <div style={rij}>
              <label htmlFor="ob-van">Van rekening</label>
              <select id="ob-van" style={veld} value={vanId} onChange={(e) => setVanId(e.target.value)}>
                <option value="">— kies —</option>
                {rekeningen.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.naam}
                  </option>
                ))}
              </select>
            </div>
            <div style={rij}>
              <label htmlFor="ob-naar">Naar rekening</label>
              <select id="ob-naar" style={veld} value={naarId} onChange={(e) => setNaarId(e.target.value)}>
                <option value="">— kies —</option>
                {rekeningen.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.naam}
                  </option>
                ))}
              </select>
            </div>
            {vanId && naarId && vanId === naarId && (
              <p style={{ color: '#c0392b', margin: '0 0 0.6rem' }}>Kies twee verschillende rekeningen.</p>
            )}
            <div style={rij}>
              <label htmlFor="ob-bedrag">Over te boeken bedrag (€)</label>
              <input
                id="ob-bedrag"
                style={veld}
                inputMode="decimal"
                placeholder="0,00"
                value={bedrag}
                onChange={(e) => setBedrag(e.target.value)}
              />
            </div>
            <div style={rij}>
              <label htmlFor="ob-datum">Datum overboeking</label>
              <input id="ob-datum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
            </div>
            <div style={rij}>
              <label htmlFor="ob-oms">Omschrijving</label>
              <input
                id="ob-oms"
                style={veld}
                placeholder="optioneel"
                value={omschrijving}
                onChange={(e) => setOmschrijving(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={!geldig}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: 8,
                border: '1px solid #ccc',
                background: geldig ? '#eef2f7' : '#f2f2f2',
                cursor: geldig ? 'pointer' : 'not-allowed',
              }}
            >
              {bewerken ? 'Overboeking wijzigen' : 'Overboeking toevoegen'}
            </button>
            {bewerken && (
              <button
                type="button"
                onClick={onStopBewerken}
                style={{ marginLeft: '0.5rem', padding: '0.5rem 0.9rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
              >
                Annuleer
              </button>
            )}
          </form>
        </>
      )}
    </section>
  )
}
