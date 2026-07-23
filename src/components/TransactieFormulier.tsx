import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Categorie, Rekening, Transactie, TransactieRegel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'

const vandaag = () => new Date().toISOString().slice(0, 10)

// Onthoud de laatst gebruikte rekening als standaard voor de volgende transactie
// (ook na een herlaad). Zo hoef je niet telkens de juiste rekening te herkiezen.
const LAATSTE_REKENING_SLEUTEL = 'fk_laatste_rekening'

function standaardRekening(rekeningen: Rekening[]): string {
  try {
    const opgeslagen = localStorage.getItem(LAATSTE_REKENING_SLEUTEL)
    if (opgeslagen && rekeningen.some((r) => r.id === opgeslagen)) return opgeslagen
  } catch {
    // localStorage niet beschikbaar: stil terugvallen.
  }
  return rekeningen[0]?.id ?? ''
}

function onthoudRekening(id: string): void {
  try {
    localStorage.setItem(LAATSTE_REKENING_SLEUTEL, id)
  } catch {
    // stil negeren
  }
}

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Eén regel in de split-modus (lokale invoer): categorie + bedrag als tekst.
type SplitRegel = { sleutel: string; categorieId: string; bedrag: string }
function nieuweRegel(): SplitRegel {
  return { sleutel: nieuwId(), categorieId: '', bedrag: '' }
}

// Invoerformulier voor een transactie. Werkt zowel voor toevoegen als bewerken.
// Kan één categorie gebruiken, of - in split-modus - het bedrag over meerdere
// categorieën verdelen (kassaticket). Het totaal is dan de som van de deelregels.
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
  const [rekeningId, setRekeningId] = useState(() => standaardRekening(rekeningen))
  const [categorieId, setCategorieId] = useState('')
  const [gesplitst, setGesplitst] = useState(false)
  const [splitRegels, setSplitRegels] = useState<SplitRegel[]>(() => [nieuweRegel(), nieuweRegel()])

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setDatum(bewerken.datum)
      setRekeningId(bewerken.rekeningId)
      if (bewerken.regels && bewerken.regels.length > 0) {
        setGesplitst(true)
        setSplitRegels(
          bewerken.regels.map((r) => ({
            sleutel: nieuwId(),
            categorieId: r.categorieId ?? '',
            bedrag: centenNaarInvoer(Math.abs(r.bedrag)),
          })),
        )
        setBedrag('')
        setCategorieId('')
      } else {
        setGesplitst(false)
        setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
        setCategorieId(bewerken.categorieId ?? '')
        setSplitRegels([nieuweRegel(), nieuweRegel()])
      }
    } else {
      setOmschrijving('')
      setBedrag('')
      setSoort('uitgave')
      setDatum(vandaag())
      setCategorieId('')
      setGesplitst(false)
      setSplitRegels([nieuweRegel(), nieuweRegel()])
    }
  }, [bewerken])

  const teken = soort === 'uitgave' ? -1 : 1
  const bedragCenten = invoerNaarCenten(bedrag)

  // Split-berekeningen.
  const splitLijnCenten = splitRegels.map((r) => invoerNaarCenten(r.bedrag))
  const splitTotaal = splitLijnCenten.reduce((s, c) => (Number.isFinite(c) && c > 0 ? s + c : s), 0)
  const aantalGeldigeSplit = splitLijnCenten.filter((c) => Number.isFinite(c) && c > 0).length

  const geldig = gesplitst
    ? omschrijving.trim().length > 0 && rekeningId.length > 0 && aantalGeldigeSplit >= 1 && splitTotaal > 0
    : omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0 && rekeningId.length > 0

  function wijzigRegel(sleutel: string, veld: Partial<SplitRegel>) {
    setSplitRegels((regels) => regels.map((r) => (r.sleutel === sleutel ? { ...r, ...veld } : r)))
  }
  function verwijderRegel(sleutel: string) {
    setSplitRegels((regels) => (regels.length > 1 ? regels.filter((r) => r.sleutel !== sleutel) : regels))
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return

    let t: Transactie
    if (gesplitst) {
      const regels: TransactieRegel[] = splitRegels
        .map((r) => ({ categorieId: r.categorieId, centen: invoerNaarCenten(r.bedrag) }))
        .filter((r) => Number.isFinite(r.centen) && r.centen > 0)
        .map((r) => ({ ...(r.categorieId ? { categorieId: r.categorieId } : {}), bedrag: teken * r.centen }))
      const totaal = regels.reduce((s, r) => s + r.bedrag, 0)
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: totaal,
        rekeningId,
        regels,
      }
    } else {
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(categorieId ? { categorieId } : {}),
      }
    }

    await onOpslaan(t)
    onthoudRekening(rekeningId)
    if (!bewerken) {
      setOmschrijving('')
      setBedrag('')
      setCategorieId('')
      setGesplitst(false)
      setSplitRegels([nieuweRegel(), nieuweRegel()])
    }
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '1rem' }}>
      <div style={rij}>
        <label htmlFor="omschrijving">Omschrijving</label>
        <input id="omschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>

      <div style={rij}>
        <label>
          <input type="checkbox" checked={gesplitst} onChange={(e) => setGesplitst(e.target.checked)} /> Splitsen over
          meerdere categorieën
        </label>
      </div>

      {!gesplitst ? (
        <>
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
            <CategorieKiezer
              waarde={categorieId || undefined}
              onKies={(id) => setCategorieId(id ?? '')}
              gebruikerCategorieen={categorieen}
            />
          </div>
        </>
      ) : (
        <div style={rij}>
          {splitRegels.map((r, i) => (
            <div
              key={r.sleutel}
              style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.5rem', marginBottom: '0.5rem' }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input
                  aria-label="Deelbedrag"
                  style={{ ...veld, marginTop: 0, flex: 1 }}
                  inputMode="decimal"
                  placeholder={`Deelbedrag ${i + 1} (€)`}
                  value={r.bedrag}
                  onChange={(e) => wijzigRegel(r.sleutel, { bedrag: e.target.value })}
                />
                {splitRegels.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Verwijder deelregel ${i + 1}`}
                    onClick={() => verwijderRegel(r.sleutel)}
                    style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ×
                  </button>
                )}
              </div>
              <CategorieKiezer
                waarde={r.categorieId || undefined}
                onKies={(id) => wijzigRegel(r.sleutel, { categorieId: id ?? '' })}
                gebruikerCategorieen={categorieen}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSplitRegels((regels) => [...regels, nieuweRegel()])}
            style={{ padding: '0.3rem 0.7rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
          >
            + Regel toevoegen
          </button>
          <p style={{ margin: '0.5rem 0 0', fontWeight: 'bold' }}>
            Totaal te verdelen: {formatEuro(teken * splitTotaal)}
          </p>
        </div>
      )}

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
