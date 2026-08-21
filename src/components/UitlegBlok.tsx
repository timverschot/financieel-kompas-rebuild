import type { ReactNode } from 'react'
import { useT } from '../i18n'

/**
 * "Zo werkt dit" — een uitklapblok dat uitlegt hoe een scherm in elkaar zit
 * (ronde 64).
 *
 * ⚠ WAAROM DIT ER KOMT. Timothy, na echt gebruik: *"het is allemaal onoverzichtelijk
 * geworden en ik kan de logica momenteel niet genoeg terugvinden in alle
 * functionaliteiten."* De app is functie per functie gegroeid, en negen van de
 * vijftien pagina's zeiden nergens waarvoor ze dienden of hoe hun onderdelen
 * samenhangen.
 *
 * Waarom een uitklapblok en geen rondleiding: een rondleiding loopt één keer voorbij,
 * op het moment dat je nog niets te vragen hebt. Wat je nodig hebt is een antwoord op
 * het moment dat je vastzit — en dat moet op het scherm zelf staan waar je vastzit.
 * Dicht kost het één regel; open legt het uit in gewone zinnen.
 *
 * Een echte `<details>`/`<summary>`: die werkt met een toetsenbord (Tab + Enter), een
 * schermlezer kondigt "uitgeklapt/ingeklapt" aan, en de browser doet het openklappen
 * zelf — geen eigen state die met de rest uit de pas kan lopen.
 */
export function UitlegBlok({
  titel,
  children,
  open = false,
}: {
  /** De regel die je dicht ziet staan. Standaard "Zo werkt dit". Al vertaald. */
  titel?: string
  children: ReactNode
  /** Staat het blok van bij het openen van de pagina open? Standaard niet. */
  open?: boolean
}) {
  const { t } = useT()
  return (
    <details className="uitleg" open={open}>
      {/* ⚠ GEEN `aria-describedby` naar de inhoud (nakijkronde ronde 64). Een
          schermlezer leest een `describedby`-doel ook voor wanneer het verborgen is,
          en dan kondigt hij bij het DICHTE blok meteen de hele uitleg aan — precies
          wat een uitklapblok moet vermijden. De `<details>`-semantiek doet dit werk
          zelf: "uitgeklapt/ingeklapt" hoort erbij. */}
      <summary>{titel ?? t('Zo werkt dit')}</summary>
      <div className="uitleg-inhoud">{children}</div>
    </details>
  )
}
