import { useCallback, useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Kind, Kindrekeningpost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { vandaag } from '../utils/datum'
import { useT } from '../i18n'
import { Bonknop } from '../ui/Bonknop'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
function beginwaarden() {
  return {
    soort: 'storting' as const,
    bedrag: '',
    datum: vandaag(),
    omschrijving: '',
    door: 'jij' as const,
    kindIds: [] as string[],
    categorieId: '',
    bonnetje: '',
  }
}

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
  onNieuweSubcategorie,
}: {
  kindrekeningId: string
  kinderen: Kind[]
  categorieen: Categorie[]
  onOpslaan: (p: Kindrekeningpost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Kindrekeningpost | null
  /** Maakt ter plekke een nieuwe subcategorie aan en geeft het nieuwe id terug. */
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
}) {
  const { t } = useT()
  const [soort, setSoort] = useState<'storting' | 'uitgave'>(() => beginwaarden().soort)
  const [bedrag, setBedrag] = useState(() => beginwaarden().bedrag)
  const [datum, setDatum] = useState(() => beginwaarden().datum)
  const [omschrijving, setOmschrijving] = useState(() => beginwaarden().omschrijving)
  const [door, setDoor] = useState<'jij' | 'partner'>(() => beginwaarden().door)
  const [kindIds, setKindIds] = useState<string[]>(() => beginwaarden().kindIds)
  const [categorieId, setCategorieId] = useState(() => beginwaarden().categorieId)
  const [bonnetje, setBonnetje] = useState(() => beginwaarden().bonnetje)
  const [bezigBon, setBezigBon] = useState(false)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    const b = beginwaarden()
    setSoort(b.soort)
    setBedrag(b.bedrag)
    setDatum(b.datum)
    setOmschrijving(b.omschrijving)
    setDoor(b.door)
    setKindIds(b.kindIds)
    setCategorieId(b.categorieId)
    setBonnetje(b.bonnetje)
  }, [])

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
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const bedragCenten = invoerNaarCenten(bedrag)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig = Number.isFinite(bedragCenten) && bedragCenten > 0

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
    // Bij een NIEUWE beweging blijft 'bewerken' null, dus de useEffect hierboven
    // draait niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en boek
    // je met een tweede klik dezelfde beweging nog eens.
    if (!bewerken) leegmaken()
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
            <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="krp-door" checked={door === 'jij'} onChange={() => setDoor('jij')} /> {t('Jij')}
            </label>
            <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="krp-door" checked={door === 'partner'} onChange={() => setDoor('partner')} /> {t('Partner')}
            </label>
          </div>
        </div>
      )}
      {soort === 'uitgave' && (
        <>
          <div className="veldgroep">
            <CategorieKiezer
          waarde={categorieId || undefined}
          onKies={(id) => setCategorieId(id ?? '')}
          gebruikerCategorieen={categorieen}
          onNieuweSubcategorie={onNieuweSubcategorie}
        />
          </div>
          {/* Dezelfde gedeelde kiezer als in het transactieformulier en bij de gedeelde
              kosten. Hij verbergt zichzelf als er geen gezinsleden zijn, dus er blijft
              geen leeg label of lege veldgroep achter. De waarde blijft 'kindIds'. */}
          <GezinsledenKiezer
            label={t('Voor wie? (optioneel)')}
            waarden={kindIds}
            onWijzig={setKindIds}
            gezinsleden={kinderen}
          />
          <div className="veldgroep">
            <label className="label-caps" htmlFor="krp-bon">{t('Bon/factuur (optioneel)')}</label>
            {bonnetje ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {bonnetje.startsWith('data:image') && (
                  <img src={bonnetje} alt={t('Bon/factuur')} style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                )}
                <Bonknop bestand={bonnetje} naam={omschrijving || t('Bon')} />
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
        <button
          type="submit" className="knop knop-secundair"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
        >
          {bewerken ? t('Beweging wijzigen') : t('Beweging toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-ghost" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
      {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
          `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
          sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
          knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
          hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Vul een bedrag groter dan nul in.')}
      </p>
    </form>
  )
}
