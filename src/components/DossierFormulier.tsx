import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Dossier } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { verborgenBijNieuwDossier } from '../utils/dossieronderdelen'

// De beginwaarden van het formulier staan op één plek. Zo krijgt het formulier na
// het opslaan exact dezelfde begintoestand als bij het openen en kunnen begin en
// reset niet uit elkaar lopen. Het aandeel start op '50' (de gebruikelijke 50/50-
// verdeling); vroeger stond die 50 enkel als grijze placeholder, waardoor het veld
// in werkelijkheid leeg was en de knop altijd uitgeschakeld bleef.
const BEGIN = { naam: '', aandeel: '50' }

// Formulier om een nieuw dossier aan te maken, met de verdeelsleutel (percentage
// dat jij draagt).
export function DossierFormulier({ onOpslaan }: { onOpslaan: (d: Dossier) => Promise<void> | void }) {
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
  const [aandeel, setAandeel] = useState(BEGIN.aandeel)

  // Zet alle velden terug op hun beginwaarde.
  function leegmaken() {
    // Klaar voor het volgende record: een vers id, zodat de volgende invoer niet
    // hetzelfde record overschrijft (ronde 68).
    nieuwIdRef.current = nieuwId()
    setNaam(BEGIN.naam)
    setAandeel(BEGIN.aandeel)
  }

  const aandeelGetal = Number.parseFloat(aandeel.replace(',', '.'))
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig =
    naam.trim().length > 0 && Number.isFinite(aandeelGetal) && aandeelGetal >= 0 && aandeelGetal <= 100

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    // ⚠ Een NIEUW dossier begint bewust met minder (ronde 60). Vóór die ronde
    // opende het met acht kaarten onder elkaar — verdelingen, een kindrekening, een
    // documentkluis, een uitwisseling — allemaal leeg, terwijl je net kwam om kosten
    // bij te houden. Nu staat de kern open en zet je erbij wat je nodig hebt; de
    // chips daarvoor staan meteen boven het formulier. Zie `DOSSIER_ONDERDELEN`.
    // ⚠ RONDE 68 — EEN MISLUKTE OPSLAG MAG NOOIT STIL BLIJVEN. Dit formulier riep
    // `onOpslaan` aan zonder de mislukking op te vangen: de belofte werd weggegooid,
    // er verscheen geen letter, en de knop leek gewoon niet te reageren. Je drukte
    // opnieuw, of je sloot het venster en was je invoer kwijt. Alles wat "het is
    // gelukt" uitstraalt, gebeurt nu pas ná een geslaagde opslag.
    const gelukt = await opslag.probeer(() =>
      onOpslaan({
        id: nieuwIdRef.current,
        naam: naam.trim(),
        aandeelJij: aandeelGetal,
        verborgenOnderdelen: verborgenBijNieuwDossier(),
      }),
    )
    if (!gelukt) return
    // Pas ná een geslaagde opslag leegmaken: zo staat het formulier klaar voor een
    // volgend dossier en levert een tweede klik niet nog eens hetzelfde dossier op.
    leegmaken()
  }

  return (
    // ⚠ RONDE 95 — een naam op het `<form>` maakt er een landmark van: een schermlezer
    // kondigt hem aan zodra de focus erin komt. Op de dossierpagina staan er meerdere
    // onder elkaar — hoeveel hangt af van welke onderdelen aanstaan — en zonder naam
    // heten ze allemaal "formulier".
    <form onSubmit={verzend} aria-label={t('Nieuw dossier')} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="dossiernaam">{t('Dossiernaam')}</label>
          <input id="dossiernaam" value={naam} onChange={(e) => setNaam(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="aandeel">{t('Aandeel jij (%)')}</label>
          <input
            id="aandeel"
            inputMode="decimal"
            placeholder="50"
            value={aandeel}
            onChange={(e) => setAandeel(e.target.value)}
          />
        </div>
      </div>
      <div className="knoprij">
        <button
          type="submit" className="knop knop-secundair"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
        >
          {t('Dossier toevoegen')}
        </button>
      </div>
      {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
          `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
          sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
          knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
          hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
      <Opslagfout fout={opslag.fout} />
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Geef een naam en een percentage tussen 0 en 100.')}
      </p>
    </form>
  )
}
