import { useRef, useState } from 'react'
import type { Vertaler } from '../i18n'
import { meldFout } from '../sentry'

// ---------------------------------------------------------------------------
// "Elke mislukking zegt het" (ronde 68)
//
// WAAROM DIT BESTAAT. Bijna alles in deze app schrijft iets weg, en wegschrijven
// kan mislukken: de opslag van het toestel zit vol, de browser staat in privémodus,
// of de database weigert. Tot deze ronde gebeurde er in zo'n geval op ruim zestig
// plaatsen ZICHTBAAR NIETS. Je tikte op "Toevoegen", het scherm bleef staan, en je
// dacht dat je te zacht getikt had — of erger: het veld werd leeggemaakt en je
// invoer was weg.
//
// Twee schermen deden het al goed (het boekingsformulier en de documentkluis). Hun
// aanpak staat hier, één keer, in plaats van zestig keer gekopieerd. Dat is geen
// netheid maar noodzaak: de zin over een volle opslag stond op precies één plek in
// de app, en zestig kopieën daarvan lopen binnen drie rondes uit elkaar.
// ---------------------------------------------------------------------------

/**
 * De zin die bovenaan komt te staan.
 *
 * ⚠ De VOLLE OPSLAG krijgt een eigen zin, en dat is geen luxe. "Opslaan is niet
 * gelukt" nodigt uit om het nog eens te proberen, en dat is precies wat níét helpt
 * wanneer de schijf vol zit — dan moet er eerst iets weg. Deze app schrijft
 * bonfoto's als tekst in de database, dus een volle opslag is hier geen theoretisch
 * geval.
 *
 * `standaard` is per plek anders: bij een formulier is de geruststelling "je invoer
 * staat er nog", bij een kruisje "er is niets verwijderd". Vandaar een parameter en
 * geen vaste tekst.
 */
export function opslagFoutTekst(t: Vertaler, fout: string, standaard: string): string {
  return /opslag|quota|storage|exceeded/i.test(fout)
    ? t('De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.')
    : standaard
}

/** De tekst van een opgevangen fout, hoe die ook verpakt zat. */
export function foutTekst(fout: unknown): string {
  if (fout instanceof Error) return fout.message
  if (typeof fout === 'string') return fout
  try {
    return String(fout)
  } catch {
    return 'onbekende fout'
  }
}

/**
 * Eén poging om iets weg te schrijven: bezig-toestand, dubbele-tik-grendel en de
 * foutmelding, in één haakje.
 *
 * Gebruik:
 *
 *   const opslag = useOpslagpoging()
 *   ...
 *   if (!(await opslag.probeer(() => onOpslaan(record)))) return   // mislukt: stop
 *   leegmaken()                                                    // gelukt
 *   ...
 *   <Opslagfout fout={opslag.fout} />
 *
 * ⚠ `probeer` geeft WAAR of ONWAAR terug in plaats van te gooien. Zo staat op elke
 * aanroepplaats zichtbaar wat er bij een mislukking níét meer mag gebeuren — en dat
 * is de kern van deze ronde: het leegmaken, het sluiten van een venster en het
 * tonen van een ongedaan-balk horen allemaal ná een GESLAAGDE opslag.
 *
 * ⚠ De grendel is een ref en geen state: state wordt pas bij de volgende tekening
 * waar, en twee tikken binnen één tel glippen er dan allebei door.
 */
export type Opslagpoging = {
  /** Waar zolang er geschreven wordt. Zet dit op de knop (`aria-busy`). */
  bezig: boolean
  /** De laatste foutmelding, of een lege tekst. Geef door aan `<Opslagfout>`. */
  fout: string
  /** Voert `actie` uit. Geeft waar terug wanneer het gelukt is. */
  probeer: (actie: () => unknown | Promise<unknown>) => Promise<boolean>
  /** Wist de melding, bijvoorbeeld zodra de gebruiker iets aanpast. */
  wis: () => void
}

export function useOpslagpoging(): Opslagpoging {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const bezigRef = useRef(false)

  async function probeer(actie: () => unknown | Promise<unknown>): Promise<boolean> {
    // ⚠ HIER STOND EEN GRENDEL DIE EEN TWEEDE POGING WEIGERDE ZOLANG DE EERSTE LIEP,
    // en die is er bewust weer uit (tweede doorlichting ronde 68).
    //
    // Eén kaart deelt één poging, dus die grendel sloeg ook toe wanneer je tijdens een
    // trage opslag op een ÁNDERE knop van dezelfde kaart tikte: er gebeurde dan
    // zichtbaar niets. Precies het gedrag dat deze ronde moest uitroeien, in een nieuwe
    // vorm — en de aanroepplaats kon "mislukt" niet van "geweigerd want bezig"
    // onderscheiden.
    //
    // Weglaten mag nu, omdat élke schrijfactie in de app een VAST id gebruikt: twee
    // keer dezelfde knop levert dus twee keer hetzelfde record op, niet twee records.
    // Een formulier dat écht maar één poging tegelijk mag doen (het boekingsformulier)
    // houdt zijn eigen grendel.
    bezigRef.current = true
    setBezig(true)
    setFout('')
    try {
      await actie()
      return true
    } catch (f) {
      setFout(foutTekst(f))
      // ⚠ Ook naar de crashrapportage. Vóór deze ronde werden deze mislukkingen
      // weggegooide beloftes, en die ving Sentry op via zijn globale vanger. Nu ze
      // netjes opgevangen worden, zou je als bouwer nooit meer zien hóé vaak dit
      // gebeurt — en dan repareer je iets wat je niet kan meten.
      meldFout(f, { waar: 'opslagpoging' })
      return false
    } finally {
      bezigRef.current = false
      setBezig(false)
    }
  }

  return { bezig, fout, probeer, wis: () => setFout('') }
}
