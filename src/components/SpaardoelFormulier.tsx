import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Rekening, Spaardoel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

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
  const { t } = useT()
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
    <form onSubmit={verzend} className="stapel">
      <div className="veldgroep">
        <label className="label-caps" htmlFor="doelnaam">
          {t('Doelnaam')}
        </label>
        <input id="doelnaam" placeholder={t('Bv. Communie Kind 1')} value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="doelbedrag">
            {t('Doelbedrag (€)')}
          </label>
          <input id="doelbedrag" inputMode="decimal" placeholder="0,00" value={doelbedrag} onChange={(e) => setDoelbedrag(e.target.value)} />
        </div>
        {!gekoppeldeRekeningId && (
          <div className="veldgroep">
            <label className="label-caps" htmlFor="huidigbedrag">
              {t('Huidig bedrag (€)')}
            </label>
            <input id="huidigbedrag" inputMode="decimal" placeholder="0,00" value={huidig} onChange={(e) => setHuidig(e.target.value)} />
          </div>
        )}
      </div>

      <div className="veldgroep">
        <label className="label-caps" htmlFor="doelrekening">
          {t('Gekoppelde rekening')}
        </label>
        <select id="doelrekening" value={gekoppeldeRekeningId} onChange={(e) => setGekoppeld(e.target.value)}>
          <option value="">{t('Geen — manueel bijhouden')}</option>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.naam}
            </option>
          ))}
        </select>
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="doeldatum">
            {t('Doeldatum (optioneel)')}
          </label>
          <input id="doeldatum" type="date" value={doeldatum} onChange={(e) => setDoeldatum(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="maandbedrag">
            {t('Maandelijks streefbedrag (€, optioneel)')}
          </label>
          <input id="maandbedrag" inputMode="decimal" placeholder="0,00" value={maandbedrag} onChange={(e) => setMaandbedrag(e.target.value)} />
        </div>
      </div>

      <div className="veldgroep">
        <label className="label-caps" htmlFor="doelkleur">
          {t('Kleur')}
        </label>
        <input
          id="doelkleur"
          type="color"
          value={kleur}
          onChange={(e) => setKleur(e.target.value)}
          style={{ width: 56, height: 40, padding: 4 }}
        />
      </div>

      <div className="knoprij">
        <button type="submit" disabled={!geldig} className="knop knop-primair">
          {bewerken ? t('Doel wijzigen') : t('Doel toevoegen')}
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
