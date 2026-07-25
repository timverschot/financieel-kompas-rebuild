import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Kind, Rekening, Spaardoel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { GezinslidKiezer } from './GezinslidKiezer'
import { heeftKiesbareLeden } from '../utils/persoon'
import { useT } from '../i18n'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
const BEGIN = {
  naam: '',
  doelbedrag: '',
  gekoppeldeRekeningId: '',
  huidig: '',
  doeldatum: '',
  maandbedrag: '',
  kleur: '#3F8A58',
  persoonId: '',
}

// Formulier om een spaardoel aan te maken of te bewerken.
export function SpaardoelFormulier({
  rekeningen,
  onOpslaan,
  onAnnuleer,
  bewerken,
  gezinsleden = [],
}: {
  rekeningen: Rekening[]
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Spaardoel | null
  // Optioneel: zolang deze lijst leeg is, verschijnt het veld "Voor wie is dit
  // doel?" gewoon niet. Zo blijven bestaande aanroepen ongewijzigd werken.
  gezinsleden?: Kind[]
}) {
  const { t } = useT()
  const [naam, setNaam] = useState(BEGIN.naam)
  const [doelbedrag, setDoelbedrag] = useState(BEGIN.doelbedrag)
  const [gekoppeldeRekeningId, setGekoppeld] = useState(BEGIN.gekoppeldeRekeningId)
  const [huidig, setHuidig] = useState(BEGIN.huidig)
  const [doeldatum, setDoeldatum] = useState(BEGIN.doeldatum)
  const [maandbedrag, setMaandbedrag] = useState(BEGIN.maandbedrag)
  const [kleur, setKleur] = useState(BEGIN.kleur)
  const [persoonId, setPersoonId] = useState(BEGIN.persoonId)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    setNaam(BEGIN.naam)
    setDoelbedrag(BEGIN.doelbedrag)
    setGekoppeld(BEGIN.gekoppeldeRekeningId)
    setHuidig(BEGIN.huidig)
    setDoeldatum(BEGIN.doeldatum)
    setMaandbedrag(BEGIN.maandbedrag)
    setKleur(BEGIN.kleur)
    setPersoonId(BEGIN.persoonId)
  }, [])

  useEffect(() => {
    if (bewerken) {
      setNaam(bewerken.naam)
      setDoelbedrag(centenNaarInvoer(bewerken.doelbedrag))
      setGekoppeld(bewerken.gekoppeldeRekeningId ?? '')
      setHuidig(centenNaarInvoer(bewerken.huidigBedrag))
      setDoeldatum(bewerken.doeldatum ?? '')
      setMaandbedrag(bewerken.maandbedrag ? centenNaarInvoer(bewerken.maandbedrag) : '')
      setKleur(bewerken.kleur ?? '#3F8A58')
      setPersoonId(bewerken.persoonId ?? '')
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

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
      // Ook bewaren als het veld niet zichtbaar is (bv. het gekoppelde lid werd
      // intussen gearchiveerd): een koppeling mag nooit stil verdwijnen.
      ...(persoonId ? { persoonId } : {}),
    })
    // Bij een NIEUW doel blijft 'bewerken' null, dus de useEffect hierboven draait
    // niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en maakt een
    // tweede klik hetzelfde doel nog eens aan.
    if (!bewerken) leegmaken()
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

      {heeftKiesbareLeden(gezinsleden, persoonId) && (
        <GezinslidKiezer
          label={t('Voor wie is dit doel?')}
          waarde={persoonId}
          onKies={setPersoonId}
          gezinsleden={gezinsleden}
        />
      )}

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
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {t('Geef een naam en een geldig bedrag om op te slaan.')}
        </p>
      )}
    </form>
  )
}
