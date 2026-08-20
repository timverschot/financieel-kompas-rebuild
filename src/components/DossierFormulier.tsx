import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Dossier } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { useT } from '../i18n'
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
  const [naam, setNaam] = useState(BEGIN.naam)
  const [aandeel, setAandeel] = useState(BEGIN.aandeel)

  // Zet alle velden terug op hun beginwaarde.
  function leegmaken() {
    setNaam(BEGIN.naam)
    setAandeel(BEGIN.aandeel)
  }

  const aandeelGetal = Number.parseFloat(aandeel.replace(',', '.'))
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
    await onOpslaan({
      id: nieuwId(),
      naam: naam.trim(),
      aandeelJij: aandeelGetal,
      verborgenOnderdelen: verborgenBijNieuwDossier(),
    })
    // Pas ná een geslaagde opslag leegmaken: zo staat het formulier klaar voor een
    // volgend dossier en levert een tweede klik niet nog eens hetzelfde dossier op.
    leegmaken()
  }

  return (
    <form onSubmit={verzend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <button type="submit" className="knop knop-secundair" disabled={!geldig}>
          {t('Dossier toevoegen')}
        </button>
      </div>
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {t('Geef een naam en een percentage tussen 0 en 100.')}
        </p>
      )}
    </form>
  )
}
