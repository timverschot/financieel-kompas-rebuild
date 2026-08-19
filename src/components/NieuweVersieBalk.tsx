import { useEffect, useState } from 'react'
import { herlaadApp, isNieuweVersieKlaar, volgNieuweVersie, volgServiceWorker } from '../utils/appVersie'
import { useT } from '../i18n'

/**
 * "Er is een nieuwe versie" — de balk die één stille dood wegneemt (ronde 56).
 *
 * WAAROM ZE ER KOMT. Deze app wordt automatisch opnieuw gepubliceerd bij elke push.
 * Had je ze op dat moment open staan, dan draait je scherm vanaf dan code die niet
 * meer bij de bestanden op de server past. Het meeste blijft werken — de app zit in
 * de cache — maar het stuk dat pas bij gebruik opgehaald wordt (de PDF-bibliotheek,
 * 390 kB) is verdwenen. Vraag je dan een afrekening of een bewijsmap, dan lukt dat
 * niet meer, hoe vaak je ook duwt.
 *
 * VIER KEUZES, en alle vier bewust:
 *
 *  - **In de gewone stroom, bovenaan de inhoud — niet zwevend.** De eerste versie
 *    zweefde onderaan, en dekte daar de onderste regels van elke lijst af zolang ze
 *    stond (en ze staat tot je herlaadt). Nu schuift ze de inhoud een stukje naar
 *    beneden in plaats van er iets achter te verstoppen.
 *  - **Het vak staat er altijd, ook leeg.** Een `role="status"` die pas MÉT zijn tekst
 *    in het document verschijnt, wordt door sommige schermlezers niet voorgelezen.
 *    Dezelfde regel als bij de exportmeldingen elders in de app.
 *  - **Wegklikbaar.** De eerste versie was dat niet, "want dan sta je later voor een
 *    afrekening die niet lukt". Maar sinds de foutmelding bij zo'n export zélf zegt
 *    dat je moet herladen, is dat geen argument meer — en een balk die je bij bijna
 *    elk bezoek na een publicatie ziet en niet weg kan doen, wordt een sta-in-de-weg.
 *  - **Niet dringend van kleur.** Er is niets stuk en je verliest niets; er staat
 *    alleen iets nieuws klaar. Rood blijft voor een échte fout.
 */
export function NieuweVersieBalk() {
  const { t } = useT()
  const [klaar, setKlaar] = useState(isNieuweVersieKlaar)
  const [weggeklikt, setWeggeklikt] = useState(false)

  useEffect(() => {
    const stopVolgen = volgNieuweVersie(() => setKlaar(true))
    const stopSw = volgServiceWorker()
    // Was het al zo vóór deze component bestond, dan meteen tonen.
    if (isNieuweVersieKlaar()) setKlaar(true)
    return () => {
      stopVolgen()
      stopSw()
    }
  }, [])

  const tonen = klaar && !weggeklikt

  return (
    // Het vak blijft staan; alleen de inhoud komt en gaat. Zie de uitleg hierboven.
    // `data-geen-print`: op papier heeft deze zin niets te zoeken.
    <div role="status" aria-live="polite" data-geen-print>
      {tonen && (
        <div className="versiebalk">
          <span>{t('Er is een nieuwe versie van de app. Herlaad om ze te gebruiken — je gegevens blijven staan.')}</span>
          <button type="button" className="knop knop-klein" onClick={herlaadApp}>
            {t('Herlaad')}
          </button>
          <button
            type="button"
            className="knop knop-kaal knop-klein"
            aria-label={t('Melding sluiten')}
            onClick={() => setWeggeklikt(true)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
