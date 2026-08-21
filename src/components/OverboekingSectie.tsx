import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { OverboekingFormulier } from './OverboekingFormulier'


// Overzicht van interne overboekingen tussen je eigen rekeningen.
//
// Het invoerformulier zelf staat sinds kort in `OverboekingFormulier`. Deze sectie
// bezit het dus niet meer, ze leent het — zodat exact hetzelfde formulier ook in de
// invoerpopup kan hangen zonder tweede kopie van de logica.
//
// Een overboeking is géén inkomst of uitgave; ze verschuift enkel geld en telt dus
// nergens mee in het maandoverzicht of de budgetten.
export function OverboekingSectie({
  overboekingen,
  rekeningen,
  transacties = [],
  waarderingen,
  bewerken,
  onOpslaan,
  onVerwijderen,
  onBewerk,
  onStopBewerken,
}: {
  overboekingen: Overboeking[]
  rekeningen: Rekening[]
  // Nodig om per rekening het saldo van vandaag te tonen in de keuzelijsten, zodat
  // je ziet wat er beschikbaar is vóór je overboekt.
  transacties?: Transactie[]
  waarderingen: Waardering[]
  bewerken?: Overboeking | null
  onOpslaan: (o: Overboeking) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBewerk: (o: Overboeking) => void
  onStopBewerken: () => void
}) {
  const { t } = useT()
  const naam = (id: string) => rekeningen.find((r) => r.id === id)?.naam ?? t('onbekende rekening')
  const gesorteerd = gesorteerdNieuwsteEerst(overboekingen)

  return (
    <Kaart titel={t('Alle overboekingen')} bijschrift={t('Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).')}>
      {rekeningen.length < 2 ? (
        <Leeg>{t('Je hebt minstens twee rekeningen nodig om over te boeken.')}</Leeg>
      ) : (
        <>
          {gesorteerd.length > 0 && (
            <ul className="lijst">
              {gesorteerd.map((o) => (
                <li key={o.id} className="rij">
                  <div className="rij-midden">
                    <span className="rij-titel">
                      {naam(o.vanRekeningId)} → {naam(o.naarRekeningId)}
                    </span>
                    <span className="rij-meta">
                      {o.omschrijving ? o.omschrijving + ' · ' : ''}
                      {o.datum}
                    </span>
                  </div>
                  <span className="rij-acties">
                    <Bedrag centen={o.bedrag} />
                    <button
                      className="knop knop-kaal"
                      aria-label={t('Bewerk overboeking {van} naar {naar}', { van: naam(o.vanRekeningId), naar: naam(o.naarRekeningId) })}
                      onClick={() => onBewerk(o)}
                    >
                      ✎
                    </button>
                    <button
                      className="knop knop-kaal knop-gevaar"
                      aria-label={t('Verwijder overboeking {van} naar {naar}', { van: naam(o.vanRekeningId), naar: naam(o.naarRekeningId) })}
                      onClick={() => onVerwijderen(o.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <OverboekingFormulier
            rekeningen={rekeningen}
            overboekingen={overboekingen}
            transacties={transacties}
            waarderingen={waarderingen}
            bewerken={bewerken}
            onOpslaan={onOpslaan}
            onStopBewerken={onStopBewerken}
          />
        </>
      )}
    </Kaart>
  )
}
