import { useEffect, useState } from 'react'
import { Dialoog } from './Dialoog'
import { useT } from '../i18n'
import { dataUrlNaarBlob, downloadBlob } from '../utils/download'

// Dé manier om een bewaarde bon, factuur of garantiebewijs te bekijken.
//
// Waarom dit een eigen bouwsteen is en geen gewone link (ronde 35):
//
// Bonnen worden bewaard als data-URL (`data:image/jpeg;base64,…`) ín de gegevens.
// Overal in de app stond daarvoor `<a href={bon} target="_blank">bekijken</a>`. Dat
// werkt op een pc, maar **WebKit weigert elke navigatie naar een data-URL**. Op een
// iPhone deed die link dus helemaal niets — en in een app die op het beginscherm
// staat is er niet eens een tabblad om naar te openen. Gevolg: elk garantiebewijs
// en elke factuur in de Dossiers-module, precies de troef van deze app, was op de
// telefoon niet te openen. Zonder foutmelding: je tikte, en er gebeurde niets.
//
// De oplossing is niet ingewikkeld: een data-URL mag je wél in een `<img>` zetten,
// alleen niet naartoe navigeren. Dus tonen we hem in de popup van de app zelf. Dat
// is bovendien beter: je blijft in je formulier, en sluiten is één tik.
//
// Downloaden gaat via een blob-URL. Ook dat is bewust: `download` op een
// `data:`-link werkt op iOS niet betrouwbaar, op een blob-URL wel.

/** Verlengsel dat bij een bestandstype hoort. `image/jpeg` → `jpg`. */
function extensieVoor(soort: string): string {
  const staart = (soort.split('/')[1] ?? '').split(';')[0].toLowerCase()
  if (staart === 'jpeg') return 'jpg'
  if (staart === 'svg+xml') return 'svg'
  // Alles wat de browser niet nader kan benoemen krijgt `.bin`. Een naam als
  // "iets.octetstream" opent op geen enkel toestel iets zinnigs.
  if (staart === 'octet-stream' || staart === '') return 'bin'
  return staart.replace(/[^a-z0-9]/g, '') || 'bin'
}

/**
 * Zet een bestandsnaam klaar zonder dubbele extensie.
 *
 * De naam die we meekrijgen is soms al een échte bestandsnaam
 * ("overeenkomst.pdf", uit de Dossierkluis) en soms gewoon een omschrijving
 * ("Colruyt 12 juli"). Plakten we er altijd de extensie achter, dan bewaarde je
 * "overeenkomst.pdf.pdf".
 */
export function bestandsnaamMet(naam: string, soort: string): string {
  const ext = extensieVoor(soort)
  const kaal = naam.trim() || 'bon'
  return kaal.toLowerCase().endsWith(`.${ext}`) ? kaal : `${kaal}.${ext}`
}

export function Bonknop({
  bestand,
  naam,
  label,
}: {
  /** De data-URL van de bewaarde afbeelding of het pdf-bestand. */
  bestand: string
  /** Bestandsnaam bij het bewaren. Zonder extensie; die komt uit het bestandstype. */
  naam?: string
  /** Opschrift van de knop. Standaard "bekijken", zoals overal in de app. */
  label?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [fout, setFout] = useState<'download' | 'beeld' | null>(null)
  const isPdf = bestand.startsWith('data:application/pdf')
  const titel = naam ?? t('Bewaard document')

  // Doe je de popup opnieuw open, dan begin je met een schone lei: een eerdere
  // mislukking blijft niet als spookmelding staan.
  useEffect(() => {
    if (open) setFout(null)
  }, [open])

  function bewaar() {
    // Van data-URL naar blob-URL. Een `download` op een data-URL wordt door Safari
    // genegeerd; op een blob-URL werkt hij wel.
    try {
      // Ronde 41: de omzetting naar een blob en de download zelf staan nu in
      // utils/download.ts. Dat was hier de derde kopie van hetzelfde patroon, en de
      // les die hier het duurst geleerd is (het adres pas na tien seconden vrijgeven,
      // en een fout laten zien in plaats van slikken) staat daar nu voor alle drie.
      const { blob, soort } = dataUrlNaarBlob(bestand)
      downloadBlob(bestandsnaamMet(naam ?? 'bon', soort), blob)
      setFout(null)
    } catch {
      // Vroeger slikte deze vangnetregel de fout stil door. Dan tikte je op
      // "Bewaren", er gebeurde niets, en je wist niet of het aan jou of aan de app
      // lag. Nu zegt de app het. Het bekijken zelf blijft sowieso werken.
      setFout('download')
    }
  }

  return (
    <>
      <button
        type="button"
        className="knop knop-ghost knop-klein knop-raakvlak"
        onClick={() => setOpen(true)}
      >
        {label ?? t('bekijken')}
      </button>

      <Dialoog titel={titel} open={open} onSluiten={() => setOpen(false)}>
        {isPdf ? (
          // Een pdf kan niet in een <img>. In een <iframe> mag een data-URL wél,
          // en anders is de bewaarknop eronder de uitweg.
          <>
            <iframe
              title={t('Pdf-bestand: {naam}', { naam: titel })}
              src={bestand}
              style={{
                width: '100%',
                height: '60vh',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            {/* Safari op iPhone toont een pdf in een iframe soms als een leeg wit
                vlak. Dat is geen fout van de app, maar zonder uitleg lijkt het er
                wel op. Vandaar deze regel — kort, en met de uitweg erbij. */}
            <p className="hulptekst" style={{ marginTop: 8 }}>
              {t('Blijft het vak leeg? Bewaar het bestand hieronder en open het met je eigen pdf-lezer.')}
            </p>
          </>
        ) : fout === 'beeld' ? (
          <p role="alert" className="kaart kaart-compact statusregel statusregel-fout" style={{ marginTop: 0 }}>
            {t('Deze afbeelding kan niet getoond worden. Ze is mogelijk beschadigd bij het bewaren.')}
          </p>
        ) : (
          <img
            src={bestand}
            // De naam van een bon zegt niets over wát je ziet. Voor wie de app laat
            // voorlezen is "Colruyt 12 juli" zonder meer onduidelijk; "Foto van bon
            // of factuur: Colruyt 12 juli" wel.
            alt={t('Foto van bon of factuur: {naam}', { naam: titel })}
            onError={() => setFout('beeld')}
            style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-sm)', display: 'block' }}
          />
        )}
        <div className="knoprij">
          <button type="button" className="knop knop-secundair knop-klein knop-raakvlak" onClick={bewaar}>
            {t('Bewaren op dit toestel')}
          </button>
        </div>
        {fout === 'download' && (
          // `role="alert"`: wie de app laat voorlezen, tikte anders op "Bewaren",
          // hoorde niets, en wist niet of het gelukt was.
          <p role="alert" className="kaart kaart-compact statusregel statusregel-fout">
            {t('Bewaren lukte niet. Je kan het bestand hierboven wel gewoon bekijken.')}
          </p>
        )}
      </Dialoog>
    </>
  )
}
