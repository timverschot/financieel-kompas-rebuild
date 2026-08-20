// Blijft je database staan, of mag de browser haar weggooien?
//
// Een browser behandelt IndexedDB standaard als "best effort": heeft het toestel
// plaats nodig, dan mag ze weg. iOS Safari gaat verder en wist de opslag van een
// website die je zeven dagen niet bezocht hebt. Voor een app waarin je jaren
// boekingen bijhoudt, is dat het verschil tussen een archief en een zandkasteel.
//
// `navigator.storage.persist()` vraagt de browser om dat niet te doen. Ze mag
// weigeren, en ze zegt niet waarom. Chrome kent het meestal stil toe wanneer de
// app op het beginscherm staat of vaak gebruikt wordt; Safari koppelt het aan het
// op het beginscherm zetten. Daarom is het antwoord hier geen `boolean` maar een
// TOESTAND: het verschil tussen "nee" en "deze browser kan het niet zeggen" is
// precies het verschil tussen een waarschuwing die klopt en een die liegt.

/**
 * - `blijvend`: de browser heeft toegezegd je gegevens niet zomaar te wissen.
 * - `tijdelijk`: ze mag ze wissen wanneer het toestel plaats nodig heeft.
 * - `onbekend`: deze browser kent de vraag niet (of de app draait in een
 *   omgeving zonder `navigator.storage`, zoals de tests). Dan zwijgen we
 *   liever dan iets te beweren.
 */
export type OpslagToestand = 'blijvend' | 'tijdelijk' | 'onbekend'

/**
 * Vraagt de browser om de lokale opslag (IndexedDB) blijvend te maken en geeft
 * terug wat eruit kwam.
 *
 * Faalt nooit hard: elke fout wordt `onbekend`. Een app die niet kan starten omdat
 * een NIET-noodzakelijke vraag mislukte, is erger dan een app die het niet weet.
 */
export async function vraagBlijvendeOpslag(): Promise<OpslagToestand> {
  const opslag = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!opslag || typeof opslag.persist !== 'function') return 'onbekend'
  try {
    // Eerst kijken of het al toegekend is: `persist()` opnieuw stellen is
    // onschuldig, maar `persisted()` is het goedkope antwoord en sommige browsers
    // tonen bij `persist()` een vraag aan de gebruiker.
    if (typeof opslag.persisted === 'function' && (await opslag.persisted())) return 'blijvend'
    return (await opslag.persist()) ? 'blijvend' : 'tijdelijk'
  } catch {
    return 'onbekend'
  }
}
