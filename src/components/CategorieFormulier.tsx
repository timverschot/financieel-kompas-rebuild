import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { useT } from '../i18n'

// Formulier om een categorie aan te maken of te hernoemen. Staat in App.tsx al
// binnen een <Kaart>, dus hier geen eigen kaart: enkel veldgroepen + knoppenrij.
export function CategorieFormulier({
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  onOpslaan: (c: Categorie) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Categorie | null
}) {
  const { t } = useT()
  const [naam, setNaam] = useState('')
  const geldig = naam.trim().length > 0

  useEffect(() => {
    setNaam(bewerken ? bewerken.naam : '')
  }, [bewerken])

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({ id: bewerken ? bewerken.id : nieuwId(), naam: naam.trim() })
  }

  return (
    <form onSubmit={verzend} className="stapel" style={{ gap: 14 }}>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="categorienaam">
          {t('Categorienaam')}
        </label>
        <input id="categorienaam" value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <div className="knoprij">
        <button type="submit" className="knop knop-primair" disabled={!geldig}>
          {bewerken ? t('Categorie wijzigen') : t('Categorie toevoegen')}
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
