import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Categorie, Kind, Kindrekeningpost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Formulier om een beweging op de kindrekening toe te voegen of te bewerken: ofwel
// een storting (door een ouder), ofwel een uitgave (een kost betaald uit de pot).
// Bij een uitgave kan je een categorie, kinderen en een bon/factuur meegeven.
export function KindrekeningpostFormulier({
  kindrekeningId,
  kinderen,
  categorieen,
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  kindrekeningId: string
  kinderen: Kind[]
  categorieen: Categorie[]
  onOpslaan: (p: Kindrekeningpost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Kindrekeningpost | null
}) {
  const { t } = useT()
  const [soort, setSoort] = useState<'storting' | 'uitgave'>('storting')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [omschrijving, setOmschrijving] = useState('')
  const [door, setDoor] = useState<'jij' | 'partner'>('jij')
  const [kindIds, setKindIds] = useState<string[]>([])
  const [categorieId, setCategorieId] = useState('')
  const [bonnetje, setBonnetje] = useState('')
  const [bezigBon, setBezigBon] = useState(false)

  useEffect(() => {
    if (bewerken) {
      setSoort(bewerken.soort)
      setBedrag(centenNaarInvoer(bewerken.bedrag))
      setDatum(bewerken.datum)
      setOmschrijving(bewerken.omschrijving ?? '')
      setDoor(bewerken.door ?? 'jij')
      setKindIds(bewerken.kindIds ?? [])
      setCategorieId(bewerken.categorieId ?? '')
      setBonnetje(bewerken.bonnetje ?? '')
    } else {
      setSoort('storting')
      setBedrag('')
      setDatum(vandaag())
      setOmschrijving('')
      setDoor('jij')
      setKindIds([])
      setCategorieId('')
      setBonnetje('')
    }
  }, [bewerken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const geldig = Number.isFinite(bedragCenten) && bedragCenten > 0

  function wisselKind(id: string) {
    setKindIds((huidig) => (huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id]))
  }

  async function kiesBonnetje(bestand: File) {
    setBezigBon(true)
    try {
      setBonnetje(await verkleinAfbeelding(bestand))
    } catch {
      // stil: een mislukte bon mag het toevoegen niet blokkeren.
    } finally {
      setBezigBon(false)
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const isUitgave = soort === 'uitgave'
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      kindrekeningId: bewerken ? bewerken.kindrekeningId : kindrekeningId,
      datum,
      soort,
      bedrag: bedragCenten,
      ...(omschrijving.trim() ? { omschrijving: omschrijving.trim() } : {}),
      ...(soort === 'storting' ? { door } : {}),
      ...(isUitgave && kindIds.length > 0 ? { kindIds } : {}),
      ...(isUitgave && categorieId ? { categorieId } : {}),
      ...(isUitgave && bonnetje ? { bonnetje } : {}),
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="krp-soort">{t('Soort beweging')}</label>
        <select id="krp-soort" style={veld} value={soort} onChange={(e) => setSoort(e.target.value as 'storting' | 'uitgave')}>
          <option value="storting">{t('Storting (geld erin)')}</option>
          <option value="uitgave">{t('Uitgave (geld eruit)')}</option>
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="krp-bedrag">{t('Bedrag pot (€)')}</label>
        <input id="krp-bedrag" style={veld} inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="krp-omschrijving">{t('Omschrijving (optioneel)')}</label>
        <input id="krp-omschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      {soort === 'storting' && (
        <div style={rij}>
          <span style={{ marginRight: '0.75rem' }}>{t('Gestort door:')}</span>
          <label style={{ marginRight: '1rem' }}>
            <input type="radio" name="krp-door" checked={door === 'jij'} onChange={() => setDoor('jij')} /> {t('Jij')}
          </label>
          <label>
            <input type="radio" name="krp-door" checked={door === 'partner'} onChange={() => setDoor('partner')} /> {t('Partner')}
          </label>
        </div>
      )}
      {soort === 'uitgave' && (
        <>
          <div style={rij}>
            <CategorieKiezer waarde={categorieId || undefined} onKies={(id) => setCategorieId(id ?? '')} gebruikerCategorieen={categorieen} />
          </div>
          {kinderen.length > 0 && (
            <div style={rij}>
              <span style={{ display: 'block', marginBottom: 2 }}>{t('Voor wie? (optioneel)')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {kinderen.map((k) => (
                  <label key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input type="checkbox" checked={kindIds.includes(k.id)} onChange={() => wisselKind(k.id)} /> {k.naam}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={rij}>
            <label htmlFor="krp-bon">{t('Bon/factuur (optioneel)')}</label>
            {bonnetje ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 2 }}>
                {bonnetje.startsWith('data:image') && (
                  <img src={bonnetje} alt={t('Bon/factuur')} style={{ maxHeight: 60, borderRadius: 6, border: '1px solid var(--border)' }} />
                )}
                <a href={bonnetje} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>{t('bekijken')}</a>
                <button type="button" onClick={() => setBonnetje('')} style={{ border: 'none', background: 'none', color: 'var(--negative)', cursor: 'pointer' }}>
                  {t('verwijderen')}
                </button>
              </div>
            ) : (
              <input
                id="krp-bon"
                type="file"
                accept="image/*,application/pdf"
                style={{ marginTop: 2 }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void kiesBonnetje(f)
                  e.target.value = ''
                }}
              />
            )}
            {bezigBon && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}> {t('bezig…')}</span>}
          </div>
        </>
      )}
      <div style={rij}>
        <label htmlFor="krp-datum">{t('Datum')}</label>
        <input id="krp-datum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid var(--border-strong)',
          background: geldig ? 'var(--positive-soft)' : 'var(--surface-2)',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        {bewerken ? t('Beweging wijzigen') : t('Beweging toevoegen')}
      </button>
      {bewerken && onAnnuleer && (
        <button
          type="button"
          onClick={onAnnuleer}
          style={{ marginLeft: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', cursor: 'pointer' }}
        >
          {t('Annuleer')}
        </button>
      )}
    </form>
  )
}
