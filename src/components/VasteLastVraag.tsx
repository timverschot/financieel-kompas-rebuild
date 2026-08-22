import type { TerugkerendePost, Transactie } from '../data/schema'
import { Dialoog } from '../ui/Dialoog'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { formatEuro } from '../utils/format'
import { dagJaar } from '../utils/datum'

/**
 * Waar de vraag vandaan komt bepaalt hoe ze klinkt — en wat "nee" betekent.
 *
 * - `na-boeking`: je tikte net een uitgave in die op een openstaande vaste last
 *   lijkt. "Nee" doet niets; het blijft een gewone uitgave.
 * - `voor-inboeken`: je drukte op "Boek in" terwijl er al een boeking staat die op
 *   die vaste last lijkt. "Nee" maakt de boeking alsnog aan.
 */
export type VasteLastVraagSoort = 'na-boeking' | 'voor-inboeken'

export type VasteLastVraagInhoud = {
  soort: VasteLastVraagSoort
  post: TerugkerendePost
  boeking: Transactie
}

/**
 * "Is dit je vaste last Water?" (ronde 64)
 *
 * ⚠ WAAROM VRAGEN EN NIET BESLISSEN. De app herkende een zelf ingetikte betaling
 * alleen bij een exacte match — tot de cent. Een waterfactuur van € 32 tegenover een
 * vaste last van € 30 zag ze niet, en drukte je dan op "Boek in", dan maakte ze er
 * een tweede boeking van € 30 bij. Losser matchen was geen oplossing: dan moffelt ze
 * een gewone uitgave weg als vaste last, en dat is erger. De derde weg is deze: zij
 * herkent wat waarschijnlijk bij elkaar hoort, jij beslist, en jouw antwoord blijft
 * staan (`Transactie.vasteLastId`).
 *
 * De vraag zegt er altijd bij wat er dán gebeurt. Een vraag waarvan je het gevolg
 * niet kent, is geen keuze.
 */
export function VasteLastVraag({
  inhoud,
  onJa,
  onNee,
  onAnnuleer,
  bezig = false,
  fout = '',
}: {
  inhoud: VasteLastVraagInhoud | null
  onJa: () => void
  onNee: () => void
  /** Waar zolang het antwoord weggeschreven wordt (ronde 68). */
  bezig?: boolean
  /**
   * De melding wanneer dat wegschrijven mislukte. ⚠ Het venster blijft dan OPEN
   * staan: sloot het toch, dan zou het beweren dat je antwoord verwerkt is terwijl
   * je vaste last als niet-betaald blijft staan én de vraag nooit meer terugkomt.
   */
  fout?: string
  /**
   * Wegklikken zonder te antwoorden: Escape, het kruisje, een klik naast het
   * venster, de terugknop.
   *
   * ⚠ Dit is NIET hetzelfde als "nee" (tweede nakijkronde ronde 64). Bij
   * `voor-inboeken` betekent "nee" *boek die vaste last alsnog bij*, en dat hing
   * hiervóór aan `onSluiten` — dus wie de vraag wegklikte, kreeg een boeking van
   * € 30 bovenop de betaling van € 32 die hij al had. Precies de fout die deze ronde
   * moest wegnemen, bereikbaar via het gebaar waarmee je iets wégdoet. Wegklikken
   * doet nu niets.
   */
  onAnnuleer: () => void
}) {
  const { t } = useT()
  if (!inhoud) return null
  const { soort, post, boeking } = inhoud
  const postBedrag = formatEuro(Math.abs(post.bedrag))
  const boekingBedrag = formatEuro(Math.abs(boeking.bedrag))

  return (
    <Dialoog
      titel={soort === 'na-boeking' ? t('Hoort dit bij een vaste last?') : t('Is dit al betaald?')}
      open
      onSluiten={onAnnuleer}
    >
      <div className="stapel">
        <p style={{ margin: 0 }}>
          {soort === 'na-boeking'
            ? t(
                'Je boekte {bedrag} en dat lijkt op je vaste last {naam} ({vast} per maand) — zelfde rekening, zelfde categorie, en die is deze maand nog niet afgepunt.',
                { bedrag: boekingBedrag, naam: post.omschrijving, vast: postBedrag },
              )
            : t(
                'Er staat deze maand al een boeking van {bedrag} op {datum} ({omschrijving}) die op {naam} lijkt. Je vaste last staat op {vast}.',
                {
                  bedrag: boekingBedrag,
                  datum: dagJaar(boeking.datum),
                  omschrijving: boeking.omschrijving,
                  naam: post.omschrijving,
                  vast: postBedrag,
                },
              )}
        </p>
        <p className="rij-meta" style={{ margin: 0 }}>
          {t(
            'Zeg je ja, dan telt deze boeking als je vaste last van deze maand: ze verdwijnt uit "nog te boeken" en het belletje zwijgt erover. Er wordt niets bijgemaakt en je bedrag verandert niet.',
          )}
        </p>
      </div>
      <div className="knoprij" style={{ marginTop: 12 }}>
        <button type="button" className="knop knop-primair" aria-busy={bezig} onClick={onJa}>
          {t('Ja, dit is die betaling')}
        </button>
        <button type="button" className="knop knop-secundair" aria-busy={bezig} onClick={onNee}>
          {soort === 'na-boeking'
            ? t('Nee, aparte uitgave')
            : t('Nee, boek {vast} bij', { vast: postBedrag })}
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <Opslagfout fout={fout} zin={t('Je antwoord is niet bewaard. Er is niets veranderd.')} />
      </div>
    </Dialoog>
  )
}
