import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Kind, Kindrekeningpost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

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
    <form onSubmit={verzend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="krp-soort">{t('Soort beweging')}</label>
        <select id="krp-soort" value={soort} onChange={(e) => setSoort(e.target.value as 'storting' | 'uitgave')}>
          <option value="storting">{t('Storting (geld erin)')}</option>
          <option value="uitgave">{t('Uitgave (geld eruit)')}</option>
        </select>
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="krp-bedrag">{t('Bedrag pot (€)')}</label>
        <input id="krp-bedrag" inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="krp-omschrijving">{t('Omschrijving (optioneel)')}</label>
        <input id="krp-omschrijving" value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      {soort === 'storting' && (
        <div className="veldgroep">
          <span className="label-caps">{t('Gestort door:')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="krp-door" checked={door === 'jij'} onChange={() => setDoor('jij')} /> {t('Jij')}
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="krp-door" checked={door === 'partner'} onChange={() => setDoor('partner')} /> {t('Partner')}
            </label>
          </div>
        </div>
      )}
      {soort === 'uitgave' && (
        <>
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
            <label className="label-caps" htmlFor="krp-bon">{t('Bon/factuur (optioneel)')}</label>
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
                id="krp-bon"
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
        </>
      )}
      <div className="veldgroep">
        <label className="label-caps" htmlFor="krp-datum">{t('Datum')}</label>
        <input id="krp-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div className="knoprij">
        <button type="submit" className="knop knop-secundair" disabled={!geldig}>
          {bewerken ? t('Beweging wijzigen') : t('Beweging toevoegen')}
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
