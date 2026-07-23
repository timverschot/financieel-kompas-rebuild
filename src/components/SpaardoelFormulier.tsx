import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Rekening, Spaardoel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'

const veld: CSSProperties = { display: 'block', width: '100%', padding: '0.4rem', marginTop: 2, boxSizing: 'border-box' }
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Formulier om een spaardoel aan te maken of te bewerken.
export function SpaardoelFormulier({
  rekeningen,
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  rekeningen: Rekening[]
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Spaardoel | null
}) {
  const [naam, setNaam] = useState('')
  const [doelbedrag, setDoelbedrag] = useState('')
  const [gekoppeldeRekeningId, setGekoppeld] = useState('')
  const [huidig, setHuidig] = useState('')
  const [doeldatum, setDoeldatum] = useState('')
  const [maandbedrag, setMaandbedrag] = useState('')
  const [kleur, setKleur] = useState('#3F8A58')

  useEffect(() => {
    if (bewerken) {
      setNaam(bewerken.naam)
      setDoelbedrag(centenNaarInvoer(bewerken.doelbedrag))
      setGekoppeld(bewerken.gekoppeldeRekeningId ?? '')
      setHuidig(centenNaarInvoer(bewerken.huidigBedrag))
      setDoeldatum(bewerken.doeldatum ?? '')
      setMaandbedrag(bewerken.maandbedrag ? centenNaarInvoer(bewerken.maandbedrag) : '')
      setKleur(bewerken.kleur ?? '#3F8A58')
    } else {
      setNaam('')
      setDoelbedrag('')
      setGekoppeld('')
      setHuidig('')
      setDoeldatum('')
      setMaandbedrag('')
      setKleur('#3F8A58')
    }
  }, [bewerken])

  const doelCenten = invoerNaarCenten(doelbedrag)
  const geldig = naam.trim().length > 0 && Number.isFinite(doelCenten) && doelCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const huidigCenten = invoerNaarCenten(huidig)
    const maandCenten = invoerNaarCenten(maandbedrag)
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      naam: naam.trim(),
      doelbedrag: doelCenten,
      huidigBedrag: gekoppeldeRekeningId ? bewerken?.huidigBedrag ?? 0 : Number.isFinite(huidigCenten) ? huidigCenten : 0,
      ...(doeldatum ? { doeldatum } : {}),
      ...(gekoppeldeRekeningId ? { gekoppeldeRekeningId } : {}),
      ...(Number.isFinite(maandCenten) && maandCenten > 0 ? { maandbedrag: maandCenten } : {}),
      ...(kleur ? { kleur } : {}),
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="doelnaam">Doelnaam</label>
        <input id="doelnaam" style={veld} placeholder="Bv. Communie Kind 1" value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="doelbedrag">Doelbedrag (€)</label>
        <input id="doelbedrag" style={veld} inputMode="decimal" placeholder="0,00" value={doelbedrag} onChange={(e) => setDoelbedrag(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="doelrekening">Gekoppelde rekening</label>
        <select id="doelrekening" style={veld} value={gekoppeldeRekeningId} onChange={(e) => setGekoppeld(e.target.value)}>
          <option value="">Geen — manueel bijhouden</option>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.naam}
            </option>
          ))}
        </select>
      </div>
      {!gekoppeldeRekeningId && (
        <div style={rij}>
          <label htmlFor="huidigbedrag">Huidig bedrag (€)</label>
          <input id="huidigbedrag" style={veld} inputMode="decimal" placeholder="0,00" value={huidig} onChange={(e) => setHuidig(e.target.value)} />
        </div>
      )}
      <div style={rij}>
        <label htmlFor="doeldatum">Doeldatum (optioneel)</label>
        <input id="doeldatum" type="date" style={veld} value={doeldatum} onChange={(e) => setDoeldatum(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="maandbedrag">Maandelijks streefbedrag (€, optioneel)</label>
        <input id="maandbedrag" style={veld} inputMode="decimal" placeholder="0,00" value={maandbedrag} onChange={(e) => setMaandbedrag(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="doelkleur">Kleur</label>
        <input id="doelkleur" type="color" value={kleur} onChange={(e) => setKleur(e.target.value)} style={{ marginLeft: '0.5rem' }} />
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: geldig ? '#eef7ee' : '#f2f2f2', cursor: geldig ? 'pointer' : 'not-allowed' }}
      >
        {bewerken ? 'Doel wijzigen' : 'Doel toevoegen'}
      </button>
      {bewerken && onAnnuleer && (
        <button type="button" onClick={onAnnuleer} style={{ marginLeft: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}>
          Annuleer
        </button>
      )}
    </form>
  )
}
