import { useId, useState } from 'react'
import {
  kiesbareOverzichtKaarten,
  nietKiesbareOverzichtKaarten,
  overzichtKaartLabel,
  toontOverzichtKaart,
  wisselOverzichtKaart,
  type OverzichtKaartId,
} from '../utils/overzichtkaarten'
import { useInstellingen } from '../instellingen'
import { useT } from '../i18n'

/**
 * "Welke kaarten wil je hier zien?" op het Overzicht (ronde 90).
 *
 * ⚠ DEZELFDE VRAAG ALS RONDE 81, MET ÉÉN GEMETEN VERSCHIL: hier staat ze DICHTGEKLAPT.
 * Het blok op Analyse › Verdeling draagt drie korte chips en is meteen open. Hier zijn het
 * er zes, en die rij is in Chromium op een scherm van 360 px opgemeten: open beslaat ze
 * 269 px — vier rijen chips — op de pagina waar je LANDT. Een bedieningspaneel van een
 * derde beeldscherm, elke keer opnieuw, op de plek waar je je cijfers komt halen: dat is
 * precies het struikelblok dat deze ronde moet wegnemen, niet toevoegen.
 *
 * Dichtgeklapt kost de rij 46 px — één regel, met een tikzone van 44 px — en die regel zegt
 * zelf in gewone woorden wat erachter zit. Ronde 81 kon open blijven omdat je Analyse ›
 * Verdeling zélf opzoekt; op je startpagina kom je voor je cijfers.
 *
 * ⚠ EEN ECHTE `<details>`/`<summary>`, dezelfde als `UitlegBlok` (ronde 64): die werkt met
 * een toetsenbord, een schermlezer kondigt "uitgeklapt/ingeklapt" aan, en de browser doet
 * het openklappen zelf — geen eigen toestand die met de rest uit de pas kan lopen. En dus
 * ook geen `aria-controls` naar een blok dat alleen bestaat als het open staat (ronde 67).
 *
 * ⚠ NÁ HET MAANDBLOK, niet erboven. Ronde 81 mat na dat de rij helemaal onderaan op een
 * telefoon 3.551 pixels van de bovenkant stond — vier schermen scrollen om de knop te
 * vinden die het scrollen moet inkorten. En helemaal bovenaan zou de eerste regel van je
 * startpagina een BEDIENING zijn in plaats van je cijfers. Dus: eerst waarvoor je kwam,
 * dan de vraag wat je er nog bij wil.
 *
 * ⚠ HET MAANDBLOK ZELF ZIT ER NIET IN, en de zijkolom ook niet — zie de kopregels van
 * utils/overzichtkaarten.ts.
 */
export function OverzichtKaartkeuze({ gevuld }: { gevuld: Readonly<Record<OverzichtKaartId, boolean>> }) {
  const { t } = useT()
  const { verborgenOverzichtkaarten, zetVerborgenOverzichtkaarten } = useInstellingen()
  const kopId = useId()
  const belofteId = useId()
  const [melding, setMelding] = useState('')

  const kiesbaar = kiesbareOverzichtKaarten(gevuld)
  if (kiesbaar.length === 0) return null

  return (
    /* ⚠ `data-geen-print`: de enige `window.print()` van de app zit in `RapportKaart`, en
       die kaart staat op DEZE pagina. De printopmaak verbergt `.knop` maar met opzet niet
       `.chip` (chips dragen elders een filter dat op papier moet blijven staan), dus zonder
       dit attribuut kwam er op elk afgedrukt blad een kader "Welke kaarten wil je hier
       zien?" met zes lege pillen te staan. */
    <details className="uitleg" data-kaartkeuze data-geen-print>
      <summary id={kopId}>{t('Welke kaarten wil je hier zien?')}</summary>
      <div className="uitleg-inhoud">
        <div className="chiprooster" role="group" aria-labelledby={kopId}>
          {kiesbaar.map((id) => {
            const aan = toontOverzichtKaart(id, verborgenOverzichtkaarten)
            const naam = t(overzichtKaartLabel(id))
            return (
              <button
                key={id}
                type="button"
                aria-pressed={aan}
                /* ⚠ De belofte hangt aan élke chip (huisregel sinds ronde 75): wie de app
                   hóórt, kreeg anders alleen "Rapport, knop, ingedrukt" en nooit de zin die
                   zegt dat er niets verloren gaat én dat dezelfde knop het terugzet — en
                   dan durf je zo'n schakelaar niet aan te raken. */
                aria-describedby={belofteId}
                className={aan ? 'chip chip-actief' : 'chip'}
                onClick={() => {
                  zetVerborgenOverzichtkaarten(wisselOverzichtKaart(verborgenOverzichtkaarten, id))
                  setMelding(
                    aan
                      ? t('De kaart {kaart} staat nu uit.', { kaart: naam })
                      : t('De kaart {kaart} staat nu aan.', { kaart: naam }),
                  )
                }}
              >
                {naam}
              </button>
            )
          })}
        </div>
        <p id={belofteId}>
          {t('Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren, en je zet het hier met één tik terug.')}
        </p>
        {/* ⚠ HET GAT DAT `kiesbareOverzichtKaarten` ANDERS LAAT VALLEN. Ronde 75 begon met de
            vaststelling dat kaarten STIL verdwenen zodra er geen gegevens waren, "je ontdekte
            dus nooit dat de app iets kón". Zonder deze regels doet deze ronde precies dat
            opnieuw, nu ook met de chip erbij.

            ⚠ MET NAAM EN TOEGIFT ÉÉN PER KAART, anders dan ronde 81. Daar konden drie van de
            vier kaarten wegvallen en wisselde het per periode, dus bleef de zin algemeen.
            Hier kan er maar één ontbreken — vijf van de zes kaarten blijven staan zonder
            cijfers — en dan is "kaarten ... staan hier niet bij" een meervoud dat nooit
            klopt en een mededeling waar je niets mee kan. */}
        {nietKiesbareOverzichtKaarten(gevuld).map((id) => (
          <p key={id} data-niet-kiesbaar>
            {t('De kaart {kaart} staat er niet bij: daar valt nu nog niets te tonen.', {
              kaart: t(overzichtKaartLabel(id)),
            })}
          </p>
        ))}
        {/* ⚠ De kaart die verschijnt of verdwijnt staat ONDER deze rij, en op een telefoon dus
            buiten beeld. Het live-gebied staat er altijd, ook leeg: een `role="status"` die pas
            mét zijn tekst verschijnt, wordt vaak niet voorgelezen (les van ronde 56). */}
        <p role="status">{melding}</p>
      </div>
    </details>
  )
}
