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
