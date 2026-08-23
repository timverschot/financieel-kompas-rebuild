import type { Aflossing, Lening } from '../data/schema'
import { leningstand, nettoVermogen } from '../utils/vermogen'
import { formatEuro } from '../utils/format'
import { Herkomstregel } from '../ui/Herkomstregel'
import { useT } from '../i18n'

/**
 * Het netto vermogen: wat er op je rekeningen staat, plus wat men jou nog
 * schuldig is, min wat jij nog schuldig bent.
 *
 * Waarom dit een APARTE regel is en niet de saldotegel vervangt (ronde 38):
 * "Saldo" en "vermogen" zijn twee verschillende vragen. Het saldo is wat je
 * vandaag kan uitgeven; het vermogen is wat je waard bent. Ze door elkaar halen
 * maakt allebei de cijfers onbetrouwbaar — en het cijfer waarop je maandelijks
 * rekent, hoort niet ineens € 80.000 lager te staan omdat je je hypotheek hebt
 * ingevoerd.
 *
 * De regel verschijnt alleen wanneer ze iets toevoegt: zonder openstaande lening
 * is het netto vermogen exact gelijk aan het saldo, en dan is een tweede keer
 * hetzelfde bedrag tonen alleen maar ruis.
 */
export function VermogenRegel({
  bezit,
  leningen,
  aflossingen,
  kaal = false,
}: {
  /** De som van je rekeningsaldo's. */
  bezit: number
  leningen: Lening[]
  aflossingen: Aflossing[]
  /** Zonder eigen kaartvlak, voor gebruik binnen een groter blok. */
  kaal?: boolean
}) {
  const { t } = useT()
  const stand = leningstand(leningen, aflossingen)
  if (stand.teOntvangen === 0 && stand.teBetalen === 0) return null

  const netto = nettoVermogen(bezit, leningen, aflossingen)

  // Hele zinnen in plaats van een lijmwoord. Een losse vertaalsleutel ' en ' zou de
  // enige in het hele bestand zijn waarvan de betekenis in de spaties zit — één
  // export die trimt en er staat ineens een Nederlands woord in een Engelse zin.
  const bezitTekst = formatEuro(bezit)
  const teOntvangen = formatEuro(stand.teOntvangen)
  const teBetalen = formatEuro(stand.teBetalen)
  const zin =
    stand.teOntvangen > 0 && stand.teBetalen > 0
      ? t('Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen en {teBetalen} nog te betalen.', {
          bezit: bezitTekst,
          teOntvangen,
          teBetalen,
        })
      : stand.teOntvangen > 0
        ? t('Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen.', { bezit: bezitTekst, teOntvangen })
        : t('Je rekeningen staan op {bezit}, met {teBetalen} nog te betalen.', { bezit: bezitTekst, teBetalen })

  // RONDE 69. Wat hier "nog te betalen" heet, is het OPENSTAAND KAPITAAL:
  // `openstaandKapitaal` rekent hoofdsom − afgelost, en de rentevoet op een lening
  // is in het schema uitdrukkelijk informatief. Wie een autolening van € 15.000 aan
  // 6 % invoert, ziet zijn vermogen dus met € 15.000 dalen en niet met wat hij de
  // bank in totaal nog zal betalen. Dat verschil hoort in beeld te staan, niet in de
  // broncode — anders neemt iemand een beslissing op een cijfer dat te mooi is.
  const kapitaalzin =
    stand.teBetalen > 0
      ? ' ' + t('Bij wat je nog moet betalen telt alleen het openstaande kapitaal mee; de interest komt daar nog bij.')
      : ''

  // Dezelfde vorm als BalansRegel en BufferRegel, waar ze tussen staat: een badge
  // links en één zin ernaast. Een negatief vermogen krijgt dezelfde nadruk als een
  // tekort in de balansregel.
  return (
    <Herkomstregel
      badge={t('Netto vermogen {bedrag}', { bedrag: formatEuro(netto) })}
      toon={netto < 0 ? 'let-op' : 'neutraal'}
      kaal={kaal}
      data-vermogen="1"
    >
      {zin + kapitaalzin}
    </Herkomstregel>
  )
}
