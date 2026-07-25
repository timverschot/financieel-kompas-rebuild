import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, GedeeldeKost, Kind } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

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
  const [bonnetje, setBonnetje] = useState('')
  const [bezigBon, setBezigBon] = useState(false)

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
      setBonnetje(bewerken.bonnetje ?? '')
    } else {
      setOmschrijving('')
      setBedrag('')
      setDatum(vandaag())
      setBetaaldDoor('jij')
      setKindIds([])
      setCategorieId('')
      setKostenType('gewoon')
      setAandeelOverride('')
      setBonnetje('')
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
      ...(bonnetje ? { bonnetje } : {}),
      // Behoud de koppeling aan een afrekening en de afgerekend-status bij bewerken.
      ...(bewerken?.verrekeningId ? { verrekeningId: bewerken.verrekeningId } : {}),
      ...(bewerken?.afgerekend ? { afgerekend: true } : {}),
    })
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

  return (
    <form onSubmit={verzend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kostomschrijving">{t('Kostomschrijving')}</label>
        <input id="kostomschrijving" value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kostbedrag">{t('Kostbedrag (€)')}</label>
        <input id="kostbedrag" inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kosttype">{t('Soort kost')}</label>
        <select id="kosttype" value={kostenType} onChange={(e) => setKostenType(e.target.value as 'gewoon' | 'buitengewoon')}>
          <option value="gewoon">{t('Gewone kost')}</option>
          <option value="buitengewoon">{t('Buitengewone kost')}</option>
        </select>
      </div>
      <div className="veldgroep">
        <CategorieKiezer waarde={categorieId || undefined} onKies={(id) => setCategorieId(id ?? '')} gebruikerCategorieen={categorieen} />
      </div>
      {kinderen.length > 0 && (
        <div className="veldgroep">
          <span className="label-caps">{t('Voor wie? (optioneel)')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {kinderen.map((k) => (
              <label key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={kindIds.includes(k.id)} onChange={() => wisselKind(k.id)} /> {k.naam}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kostdatum">{t('Datum')}</label>
        <input id="kostdatum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div className="veldgroep">
        <span className="label-caps">{t('Betaald door:')}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="radio" name="betaalddoor" checked={betaaldDoor === 'jij'} onChange={() => setBetaaldDoor('jij')} /> {t('Jij')}
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="radio" name="betaalddoor" checked={betaaldDoor === 'partner'} onChange={() => setBetaaldDoor('partner')} /> {t('Partner')}
          </label>
        </div>
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kost-override">{t('Eigen verdeling (% jij, optioneel)')}</label>
        <input id="kost-override" inputMode="decimal" placeholder={t('leeg = standaard van het dossier')} value={aandeelOverride} onChange={(e) => setAandeelOverride(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kost-bon">{t('Bon/factuur (optioneel)')}</label>
        {bonnetje ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Bon/factuur')} style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            )}
            <a href={bonnetje} target="_blank" rel="noreferrer">{t('bekijken')}</a>
            <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => setBonnetje('')}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="kost-bon"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void kiesBonnetje(f)
              e.target.value = ''
            }}
          />
        )}
        {bezigBon && <span className="rij-meta"> {t('bezig…')}</span>}
      </div>
      <div className="knoprij">
        <button type="submit" className="knop knop-primair" disabled={!geldig}>
          {bewerken ? t('Kost wijzigen') : t('Kost toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-secundair" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
    </form>
  )
}
