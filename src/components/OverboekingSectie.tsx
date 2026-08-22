import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { Bedrag, EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
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
  onNieuweRekening,
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
  /**
   * Het rekeningformulier op deze pagina tevoorschijn halen (ronde 66, slotronde).
   *
   * ⚠ Zonder dit wees de lege toestand naar iets wat er niet altijd stond. Deze
   * handler doet wat de knop "+ Nieuwe rekening" doet: de keuze wissen, zodat het
   * formulier weer in beeld komt.
   */
  onNieuweRekening?: () => void
}) {
  const { t } = useT()
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  const naam = (id: string) => rekeningen.find((r) => r.id === id)?.naam ?? t('onbekende rekening')
  const gesorteerd = gesorteerdNieuwsteEerst(overboekingen)

  return (
    <Kaart titel={t('Alle overboekingen')} bijschrift={t('Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).')}>
      <Opslagfout fout={opslag.fout} zin={t('Verwijderen is niet gelukt. Er is niets weggehaald.')} />
      {rekeningen.length < 2 ? (
        /* ⚠ RONDE 66, slotronde: dezelfde zin stond hier kaal en in de boekingspopup
           mét eerste stap. Hier staat het rekeningformulier op ditzelfde scherm, dus
           een knop is overbodig — maar de zin moest dat wél zeggen. */
        /* ⚠ RONDE 66, slotronde. Deze zin heeft twee versies gehad die allebei naar
           iets wezen dat er niet altijd stond: "het formulier op deze pagina" (dat op
           een breed scherm door het rekeningdetail vervangen wordt zodra je een
           rekening aantikt) en "+ Nieuwe rekening hierboven" (die knop bestaat alleen
           mét een gekozen rekening). Een knop die het formulier zélf tevoorschijn
           haalt, klopt altijd. */
        <Leeg
          actie={
            onNieuweRekening ? (
              <EersteStapKnop onClick={onNieuweRekening}>{t('Maak een rekening aan')}</EersteStapKnop>
            ) : undefined
          }
        >
          {t('Je hebt minstens twee rekeningen nodig om over te boeken.')}
        </Leeg>
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
                      onClick={() => void opslag.probeer(() => onVerwijderen(o.id))}
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
