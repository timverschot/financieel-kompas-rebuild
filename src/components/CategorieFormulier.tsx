import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { useT } from '../i18n'
import { IcoonKleurKiezer } from './IcoonKleurKiezer'

// Formulier om een categorie aan te maken of te hernoemen. Staat in App.tsx al
// binnen een <Kaart>, dus hier geen eigen kaart: enkel veldgroepen + knoppenrij.
//
// Naast de naam kan de gebruiker een icoon en een kleur kiezen — allebei
// optioneel. Wordt er niets gekozen, dan slaan we die velden helemaal NIET op
// (geen lege strings in de database): het schema laat ze weg wanneer ze ontbreken.
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
  const [icoon, setIcoon] = useState<string | undefined>(undefined)
  const [kleur, setKleur] = useState<string | undefined>(undefined)
  // De id van de regel die zegt wat er nog ontbreekt (ronde 61).
  const redenId = useId()
  const geldig = naam.trim().length > 0

  // Bij het openen van een bestaande categorie: alle drie de velden invullen.
  // Bij 'nieuw' (bewerken = null): alles leeg.
  useEffect(() => {
    setNaam(bewerken ? bewerken.naam : '')
    setIcoon(bewerken ? bewerken.icoon : undefined)
    setKleur(bewerken ? bewerken.kleur : undefined)
  }, [bewerken])

  function leegmaken() {
    setNaam('')
    setIcoon(undefined)
    setKleur(undefined)
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const schoonIcoon = (icoon ?? '').trim()
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      naam: naam.trim(),
      // Weglaten wanneer er niets gekozen is — geen lege waarden opslaan.
      ...(schoonIcoon ? { icoon: schoonIcoon } : {}),
      ...(kleur ? { kleur } : {}),
    })
    // Opslaan gelukt: het formulier staat weer klaar voor de volgende categorie.
    // Mislukt het opslaan, dan gooit onOpslaan en blijft de invoer staan.
    leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel" style={{ gap: 14 }}>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="categorienaam">
          {t('Naam hoofdcategorie')}
        </label>
        <input id="categorienaam" value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <IcoonKleurKiezer
        icoon={icoon}
        kleur={kleur}
        onIcoon={setIcoon}
        onKleur={setKleur}
        naam={naam}
        idVoorvoegsel="categorie"
      />

      <div className="knoprij">
        <button
          type="submit"
          className="knop knop-primair"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
        >
          {bewerken ? t('Hoofdcategorie wijzigen') : t('Hoofdcategorie toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-ghost" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
      {/* ⚠ Hier stond niets (ronde 61): de knop lag uit en er stond nergens waarom.
          Met een toetsenbord kwam je hem bovendien niet eens tegen, want `disabled`
          haalt een knop uit de tab-volgorde. */}
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Geef een naam om op te slaan.')}
      </p>
    </form>
  )
}
