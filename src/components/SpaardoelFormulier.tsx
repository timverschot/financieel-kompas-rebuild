import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Kind, Rekening, Spaardoel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel } from '../utils/rekening'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { GezinslidKiezer } from './GezinslidKiezer'
import { heeftKiesbareLeden } from '../utils/persoon'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { IcoonKleurKiezer } from './IcoonKleurKiezer'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
const BEGIN = {
  naam: '',
  doelbedrag: '',
  gekoppeldeRekeningId: '',
  huidig: '',
  doeldatum: '',
  maandbedrag: '',
  kleur: '#3F8A58' as string | undefined,
  icoon: undefined as string | undefined,
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
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ RONDE 68 — ÉÉN VAST ID PER INVULBEURT, niet één per poging.
  //
  // Nu een mislukte opslag zichtbaar is en de app zegt "probeer het opnieuw", telt dit
  // ineens: werd het record wél weggeschreven maar liep het opnieuw inlezen daarna mis,
  // dan maakte een tweede poging met een VERS id een tweede record in plaats van
  // hetzelfde te overschrijven. Het boekingsformulier doet dit al sinds ronde 36 zo, om
  // precies dezelfde reden.
  //
  // Het id wordt ververst zodra het formulier na een geslaagde opslag leeggemaakt wordt.
  const nieuwIdRef = useRef(nieuwId())
  const [naam, setNaam] = useState(BEGIN.naam)
  const [doelbedrag, setDoelbedrag] = useState(BEGIN.doelbedrag)
  const [gekoppeldeRekeningId, setGekoppeld] = useState(BEGIN.gekoppeldeRekeningId)
  const [huidig, setHuidig] = useState(BEGIN.huidig)
  const [doeldatum, setDoeldatum] = useState(BEGIN.doeldatum)
  const [maandbedrag, setMaandbedrag] = useState(BEGIN.maandbedrag)
  const [kleur, setKleur] = useState(BEGIN.kleur)
  const [icoon, setIcoon] = useState(BEGIN.icoon)
  const [persoonId, setPersoonId] = useState(BEGIN.persoonId)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    // Klaar voor het volgende record: een vers id, zodat de volgende invoer niet
    // hetzelfde record overschrijft (ronde 68).
    nieuwIdRef.current = nieuwId()
    setNaam(BEGIN.naam)
    setDoelbedrag(BEGIN.doelbedrag)
    setGekoppeld(BEGIN.gekoppeldeRekeningId)
    setHuidig(BEGIN.huidig)
    setDoeldatum(BEGIN.doeldatum)
    setMaandbedrag(BEGIN.maandbedrag)
    setKleur(BEGIN.kleur)
    setIcoon(BEGIN.icoon)
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
      setIcoon(bewerken.icoon)
      setPersoonId(bewerken.persoonId ?? '')
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const doelCenten = invoerNaarCenten(doelbedrag)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig = naam.trim().length > 0 && Number.isFinite(doelCenten) && doelCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const huidigCenten = invoerNaarCenten(huidig)
    const maandCenten = invoerNaarCenten(maandbedrag)
    // ⚠ RONDE 68 — EEN MISLUKTE OPSLAG MAG NOOIT STIL BLIJVEN. Dit formulier riep
    // `onOpslaan` aan zonder de mislukking op te vangen: de belofte werd weggegooid,
    // er verscheen geen letter, en de knop leek gewoon niet te reageren. Je drukte
    // opnieuw, of je sloot het venster en was je invoer kwijt. Alles wat "het is
    // gelukt" uitstraalt, gebeurt nu pas ná een geslaagde opslag.
    const gelukt = await opslag.probeer(() =>
      onOpslaan({
        id: bewerken ? bewerken.id : nieuwIdRef.current,
        naam: naam.trim(),
        doelbedrag: doelCenten,
        huidigBedrag: gekoppeldeRekeningId ? bewerken?.huidigBedrag ?? 0 : Number.isFinite(huidigCenten) ? huidigCenten : 0,
        ...(doeldatum ? { doeldatum } : {}),
        ...(gekoppeldeRekeningId ? { gekoppeldeRekeningId } : {}),
        ...(Number.isFinite(maandCenten) && maandCenten > 0 ? { maandbedrag: maandCenten } : {}),
        ...(kleur ? { kleur } : {}),
        ...(icoon && icoon.trim() ? { icoon: icoon.trim() } : {}),
        // Ook bewaren als het veld niet zichtbaar is (bv. het gekoppelde lid werd
        // intussen gearchiveerd): een koppeling mag nooit stil verdwijnen.
        ...(persoonId ? { persoonId } : {}),
      }),
    )
    if (!gelukt) return
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
              {rekeningLabel(r)}
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

      {/* Dezelfde icoon- en kleurkiezer als bij categorieën: één plek waar je
          kiest hoe iets eruitziet, met de kleuren van de app zelf. */}
      <IcoonKleurKiezer
        icoon={icoon}
        kleur={kleur}
        onIcoon={setIcoon}
        onKleur={setKleur}
        naam={naam}
        idVoorvoegsel="spaardoel"
        voorbeeldTekst={t('Zo verschijnt dit doel straks in de lijst.')}
      />

      <div className="knoprij">
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className="knop knop-primair"
        >
          {bewerken ? t('Doel wijzigen') : t('Doel toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-secundair" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
      {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
          `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
          sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
          knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
          hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
      <Opslagfout fout={opslag.fout} />
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Geef een naam en een geldig bedrag om op te slaan.')}
      </p>
    </form>
  )
}
