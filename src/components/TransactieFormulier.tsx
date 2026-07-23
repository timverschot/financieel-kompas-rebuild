import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react'
import type { Categorie, Rekening, Transactie, TransactieRegel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { CategorieKiezer } from './CategorieKiezer'
import { HandelaarVeld } from './HandelaarVeld'
import { ItemZoeker } from './ItemZoeker'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

// Onthoud de laatst gebruikte rekening als standaard (ook na een herlaad).
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

// Eén kassaticketregel (lokale invoer).
type KassaRegel = { sleutel: string; categorieId: string; omschrijving: string; bedrag: string }
function nieuweKassaRegel(): KassaRegel {
  return { sleutel: nieuwId(), categorieId: '', omschrijving: '', bedrag: '' }
}

// Invoerformulier voor een transactie. 'Handelaar' is de winkel; het bedrag is het
// totaal. Met 'Kassaticket splitsen' verdeel je dat totaal over item-regels; het
// niet-verdeelde restbedrag telt als 'Zonder categorie'.
export function TransactieFormulier({
  onOpslaan,
  onAnnuleer,
  rekeningen,
  categorieen,
  handelaars,
  bewerken,
}: {
  onOpslaan: (t: Transactie) => Promise<void> | void
  onAnnuleer?: () => void
  rekeningen: Rekening[]
  categorieen: Categorie[]
  handelaars: string[]
  bewerken?: Transactie | null
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>('uitgave')
  const [rekeningId, setRekeningId] = useState(() => standaardRekening(rekeningen))
  const [categorieId, setCategorieId] = useState('')
  const [gesplitst, setGesplitst] = useState(false)
  const [kassaRegels, setKassaRegels] = useState<KassaRegel[]>(() => [nieuweKassaRegel()])
  const zoekRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setDatum(bewerken.datum)
      setRekeningId(bewerken.rekeningId)
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      if (bewerken.regels && bewerken.regels.length > 0) {
        setGesplitst(true)
        setCategorieId('')
        setKassaRegels(
          bewerken.regels.map((r) => ({
            sleutel: nieuwId(),
            categorieId: r.categorieId ?? '',
            omschrijving: r.omschrijving ?? (r.categorieId ? labelVanCategorie(r.categorieId, categorieen) ?? '' : ''),
            bedrag: centenNaarInvoer(Math.abs(r.bedrag)),
          })),
        )
      } else {
        setGesplitst(false)
        setCategorieId(bewerken.categorieId ?? '')
        setKassaRegels([nieuweKassaRegel()])
      }
    } else {
      setOmschrijving('')
      setBedrag('')
      setSoort('uitgave')
      setDatum(vandaag())
      setCategorieId('')
      setGesplitst(false)
      setKassaRegels([nieuweKassaRegel()])
    }
  }, [bewerken, categorieen])

  const teken = soort === 'uitgave' ? -1 : 1
  const bedragCenten = invoerNaarCenten(bedrag)
  const totaalCenten = Number.isFinite(bedragCenten) && bedragCenten > 0 ? bedragCenten : 0

  const verdeeld = kassaRegels.reduce((s, r) => {
    const c = invoerNaarCenten(r.bedrag)
    return Number.isFinite(c) && c > 0 ? s + c : s
  }, 0)
  const verschil = totaalCenten - verdeeld

  const geldig =
    omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0 && rekeningId.length > 0

  function wijzigRegel(sleutel: string, velden: Partial<KassaRegel>) {
    setKassaRegels((rs) => rs.map((r) => (r.sleutel === sleutel ? { ...r, ...velden } : r)))
  }
  function verwijderRegel(sleutel: string) {
    setKassaRegels((rs) => (rs.length > 1 ? rs.filter((r) => r.sleutel !== sleutel) : rs))
  }
  function voegRegelToe(): string {
    const r = nieuweKassaRegel()
    setKassaRegels((rs) => [...rs, r])
    return r.sleutel
  }

  function opBedragToets(e: KeyboardEvent<HTMLInputElement>, sleutel: string) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const idx = kassaRegels.findIndex((r) => r.sleutel === sleutel)
    if (idx < kassaRegels.length - 1) {
      // Niet de laatste regel: spring naar het zoekveld van de volgende regel.
      zoekRefs.current[kassaRegels[idx + 1].sleutel]?.focus()
    } else {
      // Laatste regel: alleen een nieuwe toevoegen als deze zinvol ingevuld is.
      const r = kassaRegels[idx]
      const c = invoerNaarCenten(r.bedrag)
      if ((r.omschrijving.trim() || r.categorieId) && Number.isFinite(c) && c > 0) {
        const nieuwSleutel = voegRegelToe()
        setTimeout(() => zoekRefs.current[nieuwSleutel]?.focus(), 0)
      }
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return

    let t: Transactie
    if (gesplitst) {
      const regels: TransactieRegel[] = kassaRegels
        .map((r) => ({ r, centen: invoerNaarCenten(r.bedrag) }))
        .filter(({ r, centen }) => Number.isFinite(centen) && centen > 0 && (r.omschrijving.trim() || r.categorieId))
        .map(({ r, centen }) => ({
          ...(r.categorieId ? { categorieId: r.categorieId } : {}),
          ...(r.omschrijving.trim() ? { omschrijving: r.omschrijving.trim() } : {}),
          bedrag: teken * centen,
        }))
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(regels.length > 0 ? { regels } : {}),
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
      setKassaRegels([nieuweKassaRegel()])
    }
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '1rem' }}>
      <div style={rij}>
        <label htmlFor="handelaar">{t('Handelaar / winkel')}</label>
        <HandelaarVeld id="handelaar" waarde={omschrijving} onWijzig={setOmschrijving} suggestiesBron={handelaars} />
      </div>

      <div style={rij}>
        <label htmlFor="bedrag">{t('Bedrag (€)')}{gesplitst ? t(' — totaal van het ticket') : ''}</label>
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
        <label>
          <input type="checkbox" checked={gesplitst} onChange={(e) => setGesplitst(e.target.checked)} /> {t('Kassaticket splitsen')}
        </label>
      </div>

      {!gesplitst ? (
        <div style={rij}>
          <CategorieKiezer
            waarde={categorieId || undefined}
            onKies={(id) => setCategorieId(id ?? '')}
            gebruikerCategorieen={categorieen}
          />
        </div>
      ) : (
        <div style={{ ...rij, background: '#faf9f7', border: '1px solid #eee', borderRadius: 8, padding: '0.6rem' }}>
          {kassaRegels.map((r, i) => (
            <div key={r.sleutel} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <ItemZoeker
                    waarde={r.omschrijving}
                    onTekst={(tekst) => wijzigRegel(r.sleutel, { omschrijving: tekst, categorieId: '' })}
                    onKiesItem={(item) => wijzigRegel(r.sleutel, { categorieId: item.id, omschrijving: item.naam })}
                    registerInput={(el) => {
                      zoekRefs.current[r.sleutel] = el
                    }}
                  />
                </div>
                <input
                  aria-label={t('Deelbedrag')}
                  style={{ ...veld, marginTop: 0, width: 90 }}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={r.bedrag}
                  onChange={(e) => wijzigRegel(r.sleutel, { bedrag: e.target.value })}
                  onKeyDown={(e) => opBedragToets(e, r.sleutel)}
                />
                {kassaRegels.length > 1 && (
                  <button
                    type="button"
                    aria-label={t('Verwijder regel {n}', { n: i + 1 })}
                    onClick={() => verwijderRegel(r.sleutel)}
                    style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => voegRegelToe()}
            style={{ padding: '0.3rem 0.7rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
          >
            {t('+ Regel toevoegen')}
          </button>

          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            {t('Verdeeld:')} <strong>{formatEuro(verdeeld)}</strong> {t('van')} <strong>{formatEuro(totaalCenten)}</strong>{' '}
            {Math.abs(verschil) < 1 ? (
              <span style={{ color: '#27ae60' }}>✓</span>
            ) : (
              <span style={{ color: verschil < 0 ? '#c0392b' : '#e67e22' }}>
                {t('(nog {bedrag})', { bedrag: formatEuro(verschil) })}
              </span>
            )}
          </p>
        </div>
      )}

      <div style={rij}>
        <label htmlFor="datum">{t('Datum')}</label>
        <input id="datum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="rekening">{t('Rekening')}</label>
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
          <input type="radio" name="soort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> {t('Uitgave')}
        </label>
        <label>
          <input type="radio" name="soort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> {t('Inkomst')}
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
        {bewerken ? t('Wijzigen') : t('Toevoegen')}
      </button>
      {bewerken && onAnnuleer && (
        <button
          type="button"
          onClick={onAnnuleer}
          style={{ marginLeft: '0.5rem', padding: '0.5rem 0.9rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          {t('Annuleer')}
        </button>
      )}
    </form>
  )
}
