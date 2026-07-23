// Genereert een unieke id. Gebruikt de ingebouwde crypto.randomUUID wanneer die
// bestaat, met een eenvoudige terugval voor omgevingen zonder.
export function nieuwId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}
