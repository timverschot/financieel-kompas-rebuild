// Vraagt de browser om de lokale opslag (IndexedDB) niet zomaar te wissen bij
// schijfdruk. Zonder dit kan een browser — vooral iOS Safari — de data na een
// tijd van inactiviteit weggooien. Geeft terug of blijvende opslag actief is.
// Faalt nooit hard: in omgevingen zonder deze API (bv. tests) geeft ze false.
export async function vraagBlijvendeOpslag(): Promise<boolean> {
  const opslag = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!opslag || typeof opslag.persist !== 'function') return false
  if (typeof opslag.persisted === 'function' && (await opslag.persisted())) return true
  return opslag.persist()
}
