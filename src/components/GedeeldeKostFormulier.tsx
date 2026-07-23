import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Categorie, GedeeldeKost, Kind } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'
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

// Formulier om een gedeelde kost toe te voegen of te bewerken. Een kost kan aan
// één of meer kinderen gekoppeld worden, een categorie en kostentype krijgen, en
// optioneel een eigen verdeel-percentage dat de dossier-/categorie-standaard
// overschrijft.
export function GedeeldeKostFormulier({
  dossierId,
  kinderen,
  categorieen,
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  dossierId: string
  kinderen: Kind[]
  categorieen: Categorie[]
  onOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: GedeeldeKost | null
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [betaaldDoor, setBetaaldDoor] = useState<'jij' | 'partner'>('jij')
  const [kindIds, setKindIds] = useState<string[]>([])
  const [categorieId, setCategorieId] = useState('')
  const [kostenType, setKostenType] = useState<'gewoon' | 'buitengewoon'>('gewoon')
  const [aandeelOverride, setAandeelOverride] = useState('')

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(bewerken.bedrag))
      setDatum(bewerken.datum)
      setBetaaldDoor(bewerken.betaaldDoor)
      setKindIds(bewerken.kindIds ?? [])
      setCategorieId(bewerken.categorieId ?? '')
      setKostenType(bewerken.kostenType ?? 'gewoon')
      setAandeelOverride(typeof bewerken.aandeelJijOverride === 'number' ? String(bewerken.aandeelJijOverride) : '')
    } else {
      setOmschrijving('')
      setBedrag('')
      setDatum(vandaag())
      setBetaaldDoor('jij')
      setKindIds([])
      setCategorieId('')
      setKostenType('gewoon')
      setAandeelOverride('')
    }
  }, [bewerken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const geldig = omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0

  function wisselKind(id: string) {
    setKindIds((huidig) => (huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id]))
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const override = Number.parseFloat(aandeelOverride.replace(',', '.'))
    const heeftOverride = Number.isFinite(override) && override >= 0 && override <= 100
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      dossierId: bewerken ? bewerken.dossierId : dossierId,
      omschrijving: omschrijving.trim(),
      bedrag: bedragCenten,
      betaaldDoor,
      datum,
      kostenType,
      ...(kindIds.length > 0 ? { kindIds } : {}),
      ...(categorieId ? { categorieId } : {}),
      ...(heeftOverride ? { aandeelJijOverride: override } : {}),
      // Behoud de koppeling aan een afrekening bij het bewerken.
      ...(bewerken?.verrekeningId ? { verrekeningId: bewerken.verrekeningId } : {}),
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="kostomschrijving">{t('Kostomschrijving')}</label>
        <input id="kostomschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="kostbedrag">{t('Kostbedrag (€)')}</label>
        <input id="kostbedrag" style={veld} inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="kosttype">{t('Soort kost')}</label>
        <select id="kosttype" style={veld} value={kostenType} onChange={(e) => setKostenType(e.target.value as 'gewoon' | 'buitengewoon')}>
          <option value="gewoon">{t('Gewone kost')}</option>
          <option value="buitengewoon">{t('Buitengewone kost')}</option>
        </select>
      </div>
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
        <label htmlFor="kostdatum">{t('Datum')}</label>
        <input id="kostdatum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div style={rij}>
        <span style={{ marginRight: '0.75rem' }}>{t('Betaald door:')}</span>
        <label style={{ marginRight: '1rem' }}>
          <input type="radio" name="betaalddoor" checked={betaaldDoor === 'jij'} onChange={() => setBetaaldDoor('jij')} /> {t('Jij')}
        </label>
        <label>
          <input type="radio" name="betaalddoor" checked={betaaldDoor === 'partner'} onChange={() => setBetaaldDoor('partner')} /> {t('Partner')}
        </label>
      </div>
      <div style={rij}>
        <label htmlFor="kost-override">{t('Eigen verdeling (% jij, optioneel)')}</label>
        <input id="kost-override" style={veld} inputMode="decimal" placeholder={t('leeg = standaard van het dossier')} value={aandeelOverride} onChange={(e) => setAandeelOverride(e.target.value)} />
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
        {bewerken ? t('Kost wijzigen') : t('Kost toevoegen')}
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
