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
 * ⚠ STAAT OPEN — BESLIST DOOR TIMOTHY (26 augustus 2026). Ronde 90 leverde dit blok eerst
 * DICHT op. De aanleiding was een meting: in Chromium op een scherm van 360 px beslaat de
 * open rij 269 px in vier rijen chips, tegenover 46 px dicht — en dit is de pagina waar je
 * LANDT. Timothy koos, met een schermafdruk erbij, uitdrukkelijk voor open: "kaarten staan
 * open op startpagina".
 *
 * ⚠ De meting blijft hier staan omdat ze niet ONWAAR geworden is door die keuze. Valt de
 * hoogte op een telefoon ooit tegen, dan is het `open`-attribuut hieronder het enige dat
 * moet wijzigen, en dan staat hier meteen waarom dat een overweging was. Wat WEL uit die eerste opzet blijft:
 * twee van de zes chipnamen zijn ingekort, wat een hele rij scheelt (189 px → 150 px).
 *
 * ⚠ EN HET BLIJFT EEN ECHTE `<details>`/`<summary>`, dezelfde als `UitlegBlok` (ronde 64):
 * open bij het laden, maar wie de rij wég wil, klapt ze dicht. Die vorm werkt met een
 * toetsenbord, een schermlezer kondigt "uitgeklapt/ingeklapt" aan, en de browser doet het
 * klappen zelf — geen eigen toestand die met de rest uit de pas kan lopen, en dus ook geen
 * `aria-controls` naar een blok dat alleen bestaat als het open staat (ronde 67).
 *
 * ⚠ De open/dicht-stand wordt NIET onthouden, net zomin als bij `UitlegBlok`. Wat je uitzet
 * blijft wél bewaard; het dichtklappen is een handeling van dit bezoek, zoals scrollen.
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
    <details className="uitleg" data-kaartkeuze data-geen-print open>
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
