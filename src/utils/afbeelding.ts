// Leest een gekozen afbeelding in en verkleint ze via een canvas, zodat een
// bon/factuur klein genoeg blijft om als data-URL bij de kost te bewaren (en mee
// te syncen). Geeft een JPEG-data-URL terug.
export async function verkleinAfbeelding(bestand: File, maxZijde = 1200, kwaliteit = 0.7): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const lezer = new FileReader()
    lezer.onload = () => res(lezer.result as string)
    lezer.onerror = () => rej(new Error('Bestand lezen mislukt'))
    lezer.readAsDataURL(bestand)
  })

  // Geen afbeelding (bv. een PDF)? Bewaar dan de originele data-URL ongewijzigd.
  if (!bestand.type.startsWith('image/')) return dataUrl

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error('Afbeelding laden mislukt'))
    i.src = dataUrl
  })

  const schaal = Math.min(1, maxZijde / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * schaal))
  const h = Math.max(1, Math.round(img.height * schaal))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', kwaliteit)
}

/**
 * Hoe groot een bewaarde bon hoogstens mag zijn, als data-URL (ronde 111).
 *
 * ⚠ WAAROM DIT HIER STAAT EN NIET IN ELK FORMULIER APART. Twee van de zes bestandskiezers
 * hadden deze grens (het boekingsformulier en de documentkluis), en de vier andere niet — de
 * gedeelde kost, de garantie, de lening en de kindrekeningpost. Alle vier accepteren ze
 * `image/*,application/pdf`, en een PDF wordt hierboven met opzet ONVERKLEIND bewaard: die kan
 * dus tientallen megabytes in je database en in élke synchronisatie zetten. Het schema van een
 * gedeelde kost zegt letterlijk dat dit veld "klein gehouden" wordt; niets hield dat tegen.
 */
export const MAX_BON_BYTES = 4_000_000

/** Is deze bon te groot om te bewaren? */
export function bonTeGroot(dataUrl: string): boolean {
  return dataUrl.length > MAX_BON_BYTES
}
