import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Kind, Lening, LeningRichting } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { GezinslidKiezer } from './GezinslidKiezer'
import { heeftKiesbareLeden } from '../utils/persoon'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { vandaag } from '../utils/datum'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { Bonknop } from '../ui/Bonknop'

function getal(waarde: string): number {
  return Number.parseFloat(waarde.replace(',', '.'))
}

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
function beginwaarden() {
  return {
    richting: 'uitgeleend' as LeningRichting,
    naam: '',
    hoofdsom: '',
    startdatum: vandaag(),
    tegenpartij: '',
    omschrijving: '',
    rentevoet: '',
    maandbedrag: '',
    einddatum: '',
    bonnetje: '',
    persoonId: '',
  }
}

// Formulier om een lening of krediet toe te voegen of te bewerken. De richting-
// schakelaar bepaalt de betekenis: 'uitgeleend' (iemand is jou verschuldigd) of
// 'geleend' (jij betaalt af). Bij 'geleend' verschijnen optionele krediet-velden.
export function LeningFormulier({
  onOpslaan,
  onAnnuleer,
  bewerken,
  gezinsleden = [],
  secundaireKnop = false,
}: {
  onOpslaan: (l: Lening) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Lening | null
  // Optioneel: zolang deze lijst leeg is, verschijnt het gezinslid-veld niet. Zo
  // blijven bestaande aanroepen ongewijzigd werken.
  gezinsleden?: Kind[]
  // Staat dit formulier samen met een ánder formulier op één scherm (zoals in het
  // blok "Openstaand" van Je situatie), dan mag maar één van de twee knoppen
  // gevuld zijn — designregel 2. Standaard blijft de knop gevuld, zodat alle
  // bestaande aanroepen er hetzelfde uitzien als voorheen.
  secundaireKnop?: boolean
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
  const [richting, setRichting] = useState<LeningRichting>(() => beginwaarden().richting)
  const [naam, setNaam] = useState(() => beginwaarden().naam)
  const [hoofdsom, setHoofdsom] = useState(() => beginwaarden().hoofdsom)
  const [startdatum, setStartdatum] = useState(() => beginwaarden().startdatum)
  const [tegenpartij, setTegenpartij] = useState(() => beginwaarden().tegenpartij)
  const [omschrijving, setOmschrijving] = useState(() => beginwaarden().omschrijving)
  const [rentevoet, setRentevoet] = useState(() => beginwaarden().rentevoet)
  const [maandbedrag, setMaandbedrag] = useState(() => beginwaarden().maandbedrag)
  const [einddatum, setEinddatum] = useState(() => beginwaarden().einddatum)
  const [bonnetje, setBonnetje] = useState(() => beginwaarden().bonnetje)
  const [persoonId, setPersoonId] = useState(() => beginwaarden().persoonId)
  const [bezigBon, setBezigBon] = useState(false)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    // Klaar voor het volgende record: een vers id, zodat de volgende invoer niet
    // hetzelfde record overschrijft (ronde 68).
    nieuwIdRef.current = nieuwId()
    const b = beginwaarden()
    setRichting(b.richting)
    setNaam(b.naam)
    setHoofdsom(b.hoofdsom)
    setStartdatum(b.startdatum)
    setTegenpartij(b.tegenpartij)
    setOmschrijving(b.omschrijving)
    setRentevoet(b.rentevoet)
    setMaandbedrag(b.maandbedrag)
    setEinddatum(b.einddatum)
    setBonnetje(b.bonnetje)
    setPersoonId(b.persoonId)
  }, [])

  useEffect(() => {
    if (bewerken) {
      setRichting(bewerken.richting)
      setNaam(bewerken.naam)
      setHoofdsom(centenNaarInvoer(bewerken.hoofdsom))
      setStartdatum(bewerken.startdatum)
      setTegenpartij(bewerken.tegenpartij ?? '')
      setOmschrijving(bewerken.omschrijving ?? '')
      setRentevoet(typeof bewerken.rentevoet === 'number' ? String(bewerken.rentevoet) : '')
      setMaandbedrag(typeof bewerken.maandbedrag === 'number' ? centenNaarInvoer(bewerken.maandbedrag) : '')
      setEinddatum(bewerken.einddatum ?? '')
      setBonnetje(bewerken.bonnetje ?? '')
      setPersoonId(bewerken.persoonId ?? '')
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const hoofdsomCenten = invoerNaarCenten(hoofdsom)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig = naam.trim().length > 0 && Number.isFinite(hoofdsomCenten) && hoofdsomCenten > 0

  async function kiesBon(bestand: File) {
    setBezigBon(true)
    try {
      setBonnetje(await verkleinAfbeelding(bestand))
    } catch {
      // stil negeren; een mislukt bestand mag het toevoegen niet blokkeren.
    } finally {
      setBezigBon(false)
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const r = getal(rentevoet)
    const m = invoerNaarCenten(maandbedrag)
    // ⚠ RONDE 68 — EEN MISLUKTE OPSLAG MAG NOOIT STIL BLIJVEN. Dit formulier riep
    // `onOpslaan` aan zonder de mislukking op te vangen: de belofte werd weggegooid,
    // er verscheen geen letter, en de knop leek gewoon niet te reageren. Je drukte
    // opnieuw, of je sloot het venster en was je invoer kwijt. Alles wat "het is
    // gelukt" uitstraalt, gebeurt nu pas ná een geslaagde opslag.
    const gelukt = await opslag.probeer(() =>
      onOpslaan({
        id: bewerken ? bewerken.id : nieuwIdRef.current,
        naam: naam.trim(),
        richting,
        hoofdsom: hoofdsomCenten,
        startdatum,
        ...(tegenpartij.trim() ? { tegenpartij: tegenpartij.trim() } : {}),
        ...(omschrijving.trim() ? { omschrijving: omschrijving.trim() } : {}),
        ...(richting === 'geleend' && Number.isFinite(r) && r >= 0 ? { rentevoet: r } : {}),
        ...(richting === 'geleend' && Number.isFinite(m) && m > 0 ? { maandbedrag: m } : {}),
        ...(richting === 'geleend' && einddatum ? { einddatum } : {}),
        ...(bonnetje ? { bonnetje } : {}),
        // Ook bewaren als het veld niet zichtbaar is (bv. het gekoppelde lid werd
        // intussen gearchiveerd): een koppeling mag nooit stil verdwijnen.
        ...(persoonId ? { persoonId } : {}),
        ...(bewerken?.afgesloten ? { afgesloten: true } : {}),
      }),
    )
    if (!gelukt) return
    // Bij een NIEUWE lening blijft 'bewerken' null, dus de useEffect hierboven draait
    // niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en maakt een
    // tweede klik dezelfde lening nog eens aan.
    if (!bewerken) leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-richting">
          {t('Soort')}
        </label>
        <select id="lening-richting" value={richting} onChange={(e) => setRichting(e.target.value as LeningRichting)}>
          <option value="uitgeleend">{t('Ik leende uit (iemand is mij verschuldigd)')}</option>
          <option value="geleend">{t('Ik leende / een krediet (ik betaal af)')}</option>
        </select>
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-naam">
          {t('Naam')}
        </label>
        <input id="lening-naam" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t('bv. Lening aan broer of Autolening')} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-hoofdsom">
          {t('Startbedrag / openstaand kapitaal (€)')}
        </label>
        <input id="lening-hoofdsom" inputMode="decimal" placeholder="0,00" value={hoofdsom} onChange={(e) => setHoofdsom(e.target.value)} />
      </div>
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-tegenpartij">
            {richting === 'geleend' ? t('Kredietgever (optioneel)') : t('Wie (optioneel)')}
          </label>
          <input id="lening-tegenpartij" value={tegenpartij} onChange={(e) => setTegenpartij(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-start">
            {t('Startdatum')}
          </label>
          <input id="lening-start" type="date" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} />
        </div>
      </div>
      {/* Naast het vrije veld hierboven: een bank of kredietgever tik je gewoon
          in, familie kies je uit je gezinsleden. */}
      {heeftKiesbareLeden(gezinsleden, persoonId) && (
        <GezinslidKiezer
          label={t('Gezinslid (optioneel)')}
          waarde={persoonId}
          onKies={setPersoonId}
          gezinsleden={gezinsleden}
          hint={t('Een bank of winkel vul je hierboven in als vrije tekst; gaat het om iemand van het gezin, kies hem hier.')}
        />
      )}
      {richting === 'geleend' && (
        <>
          <div className="veldrij">
            <label className="veldgroep">
              <span className="label-caps">{t('Rentevoet % (optioneel)')}</span>
              <input inputMode="decimal" value={rentevoet} onChange={(e) => setRentevoet(e.target.value)} />
            </label>
            <label className="veldgroep">
              <span className="label-caps">{t('Maandbedrag € (optioneel)')}</span>
              <input inputMode="decimal" placeholder="0,00" value={maandbedrag} onChange={(e) => setMaandbedrag(e.target.value)} />
            </label>
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor="lening-eind">
              {t('Einddatum / termijn (optioneel)')}
            </label>
            <input id="lening-eind" type="date" value={einddatum} onChange={(e) => setEinddatum(e.target.value)} />
          </div>
        </>
      )}
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-omschrijving">
          {t('Notitie (optioneel)')}
        </label>
        <input id="lening-omschrijving" value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-bon">
          {t('Contract/bewijs (optioneel)')}
        </label>
        {bonnetje ? (
          <div className="knoprij">
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Contract/bewijs')} style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            )}
            <Bonknop bestand={bonnetje} naam={t('Contract of bewijs')} />
            <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => setBonnetje('')}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="lening-bon"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void kiesBon(f)
              e.target.value = ''
            }}
          />
        )}
        {bezigBon && <span className="rij-meta"> {t('bezig…')}</span>}
      </div>
      <div className="knoprij">
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className={secundaireKnop ? 'knop knop-secundair' : 'knop knop-primair'}
        >
          {bewerken ? t('Lening wijzigen') : t('Lening toevoegen')}
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
