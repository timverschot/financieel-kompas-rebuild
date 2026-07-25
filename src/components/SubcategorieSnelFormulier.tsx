import { useState } from 'react'
import type { FormEvent } from 'react'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { useT } from '../i18n'

// Snel een subcategorie toevoegen zonder eerst door de hele boom te klikken.
//
// Waarom dit bestaat: het knopje "+ subcategorie" zit onderaan de itemlijst van
// een categorie, en die lijst kan honderden items lang zijn (bij Voeding meer dan
// vijfhonderd). Wie weet waar zijn nieuwe item hoort, kiest hier gewoon de
// categorie uit de lijst en typt de naam. Het knopje in de boom blijft bestaan
// als snelle weg-in-context.
export function SubcategorieSnelFormulier({
  onToevoegen,
}: {
  onToevoegen: (categorieId: string, naam: string) => void | Promise<unknown>
}) {
  const { t } = useT()
  const [categorieId, setCategorieId] = useState('')
  const [naam, setNaam] = useState('')

  const geldig = categorieId !== '' && naam.trim().length > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onToevoegen(categorieId, naam.trim())
    setNaam('')
    // De gekozen categorie blijft staan: wie er één toevoegt, voegt er vaak
    // meteen nog een toe onder dezelfde categorie.
  }

  return (
    <form onSubmit={verzend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="sub-onder">
            {t('Onder welke categorie')}
          </label>
          <select id="sub-onder" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">{t('— kies —')}</option>
            {INGEBOUWDE_CATEGORIEEN.map((h) => (
              <optgroup key={h.id} label={`${h.icoon} ${t(h.naam)}`}>
                {h.categorieen.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.naam)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="sub-naam">
            {t('Naam subcategorie')}
          </label>
          <input id="sub-naam" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t('bv. Kefir')} />
        </div>
      </div>
      <div className="knoprij">
        <button type="submit" className="knop knop-secundair" disabled={!geldig}>
          {t('Subcategorie toevoegen')}
        </button>
      </div>
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {t('Kies een categorie en geef een naam.')}
        </p>
      )}
    </form>
  )
}
