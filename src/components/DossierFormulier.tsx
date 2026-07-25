import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Dossier } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { useT } from '../i18n'

// Formulier om een nieuw dossier aan te maken, met de verdeelsleutel (percentage
// dat jij draagt).
export function DossierFormulier({ onOpslaan }: { onOpslaan: (d: Dossier) => Promise<void> | void }) {
  const { t } = useT()
  const [naam, setNaam] = useState('')
  const [aandeel, setAandeel] = useState('')

  const aandeelGetal = Number.parseFloat(aandeel.replace(',', '.'))
  const geldig =
    naam.trim().length > 0 && Number.isFinite(aandeelGetal) && aandeelGetal >= 0 && aandeelGetal <= 100

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({ id: nieuwId(), naam: naam.trim(), aandeelJij: aandeelGetal })
    setNaam('')
    setAandeel('')
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
    </form>
  )
}
