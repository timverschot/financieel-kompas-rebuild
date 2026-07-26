// Op het beginscherm zetten — de twee wegen die er zijn.
//
// Waarom dit bestaat: Timothy kreeg op zijn iPhone geen enkele mogelijkheid om de
// app op zijn beginscherm te zetten. Dat is geen fout in de app maar een verschil
// tussen de platformen, en de app hoorde dat verschil uit te leggen in plaats van
// erover te zwijgen.
//
//  - **Android / Chrome / Edge**: de browser biedt het zélf aan via de gebeurtenis
//    `beforeinstallprompt`. Die vangen we op en bewaren we, zodat we een eigen knop
//    kunnen tonen op het moment dat het de gebruiker past.
//  - **iPhone / iPad**: Safari toont **nooit** een voorstel. Het gaat daar alleen
//    met de hand, via het deelmenu. Sinds iOS 26 zit dat menu achter de drie
//    puntjes naast de adresbalk, staat "Zet op beginscherm" ver naar onder in de
//    lijst, en is er een schakelaar "Open as Web App" die bepaalt of je een echte
//    app of een gewone bladwijzer krijgt. Dat vindt niemand vanzelf.
//
// Zuivere functies met de user-agent als parameter, zodat ze los te testen zijn.

export type Platform = 'ios' | 'installeerbaar' | 'alGeinstalleerd' | 'onbekend'

/**
 * Herkent iOS (iPhone/iPad) uit een user-agent. Ook iPadOS, dat zich sinds enige
 * tijd als een Mac voordoet en enkel via het aantal aanraakpunten te onderscheiden
 * is — dat laatste geven we apart mee zodat de functie zuiver blijft.
 */
export function isIOS(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  // iPadOS meldt zich als 'Macintosh' maar heeft aanraakpunten; een echte Mac niet.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

/** Draait de app al als losstaande app (dus vanaf het beginscherm)? */
export function isStandalone(matchStandalone: boolean, iosStandalone: boolean): boolean {
  return matchStandalone || iosStandalone
}

/**
 * Wat we de gebruiker moeten aanbieden.
 * - `alGeinstalleerd`: niets, de app staat er al.
 * - `installeerbaar`: een knop, want de browser heeft een voorstel klaarliggen.
 * - `ios`: de uitleg met het deelmenu.
 * - `onbekend`: geen voorstel én geen iOS — dan zeggen we niets liever dan iets fout.
 */
export function bepaalPlatform(invoer: {
  userAgent: string
  maxTouchPoints?: number
  standalone: boolean
  heeftVoorstel: boolean
}): Platform {
  if (invoer.standalone) return 'alGeinstalleerd'
  if (invoer.heeftVoorstel) return 'installeerbaar'
  if (isIOS(invoer.userAgent, invoer.maxTouchPoints ?? 0)) return 'ios'
  return 'onbekend'
}
