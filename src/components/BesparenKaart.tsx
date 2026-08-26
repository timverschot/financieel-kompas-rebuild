import { useState } from 'react'
import type { Transactie } from '../data/schema'
import { vergelijkBesparingsdomeinen, type DomeinVergelijking } from '../utils/besparen'
import type { Periode } from '../utils/analyse'
import { Kaart, Leeg, Bedrag } from '../ui/basis'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'

// "Waar loopt het op?" — de vier domeinen waar voor een gezin doorgaans het meeste
// te winnen valt, elk vergeleken met de vorige even lange periode.
//
// Wat hier tot ronde 31 stond: vier bedragen met een algemene tip ("vergelijk je
// polissen"). Dat is informatie die je ook uit de ranglijst haalt, zonder norm en
// zonder aanleiding om iets te doen — en het onderbrak de leesvolgorde van de
// pagina middenin.
//
// Wat het nu doet: per domein staat er wat je deze periode uitgaf, hoeveel dat
// scheelt met de vorige, en — bij een maandperiode — wat dat verschil op een JAAR
// zou kosten. "Energie € 210, € 32 meer dan vorige maand, dat is € 384 per jaar"
// is een zin waar je iets mee kan; "Energie € 210" niet.
//
// De kaart staat bovenaan de pagina maar INGEKLAPT: ze is een signaal, geen
// hoofdgerecht. Dicht neemt ze één regel in; open zie je de vier domeinen.

/** Het domein dat het sterkst gestegen is, of null wanneer er niets steeg. */
function grootsteStijger(domeinen: DomeinVergelijking[]): DomeinVergelijking | null {
  const stijgers = domeinen.filter((d) => d.verschil !== null && d.verschil > 0)
  if (stijgers.length === 0) return null
  return stijgers.reduce((a, b) => ((b.verschil ?? 0) > (a.verschil ?? 0) ? b : a))
}

/** De samenvatting op de dichte kaart: het belangrijkste in één regel. */
function samenvatting(t: Vertaler, domeinen: DomeinVergelijking[], totaal: number): string {
  if (totaal === 0) return t('Nog geen uitgaven in deze vier domeinen.')
  const top = grootsteStijger(domeinen)
  if (!top || top.verschil === null) return t('Samen {bedrag} in deze periode.', { bedrag: formatEuro(totaal) })
  return t('Samen {bedrag}. Sterkst gestegen: {naam}, {verschil} meer.', {
    bedrag: formatEuro(totaal),
    naam: t(top.naam),
    verschil: formatEuro(top.verschil),
  })
}

export function BesparenKaart({
  transacties,
  periode,
  vorigePeriode,
  /**
   * Waar of onwaar: de gekozen periode is één maand. Alleen dan is "op jaarbasis"
   * een eerlijke omrekening (× 12). Voor een jaar- of vrije periode zwijgen we
   * erover in plaats van een getal te verzinnen.
   */
  perMaand,
  onKies,
}: {
  transacties: Transactie[]
  periode: Periode
  vorigePeriode: Periode | null
  perMaand: boolean
  /**
   * Doorklikken naar de boekingen achter één domein (ronde 40). Een domein
   * bundelt meerdere categorieën, dus het filter erachter is een domeinfilter en
   * geen categoriefilter — anders zou de lijst minder tonen dan het bedrag.
   */
  onKies?: (sleutel: string, naam: string) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const domeinen = vergelijkBesparingsdomeinen(transacties, periode, vorigePeriode)
  const totaal = domeinen.reduce((s, d) => s + d.bedrag, 0)

  return (
    <Kaart
      titel={t('Waar loopt het op?')}
      bijschrift={samenvatting(t, domeinen, totaal)}
      actie={
        <button type="button" className="knop knop-ghost knop-klein" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t('Verberg de opbouw') : t('Toon de opbouw')}
        </button>
      }
    >
      {open && totaal === 0 && (
        <Leeg>
          {t('Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten en of ze stijgen.')}
        </Leeg>
      )}

      {open && totaal > 0 && (
        <ul className="lijst">
          {domeinen.map((d, i) => {
            const gestegen = d.verschil !== null && d.verschil > 0
            const gedaald = d.verschil !== null && d.verschil < 0
            // Op jaarbasis: wat dit verschil kost (of oplevert) als het twaalf
            // maanden aanhoudt. Alleen zinvol bij een maandperiode.
            const perJaar = perMaand && d.verschil !== null && d.verschil !== 0 ? Math.abs(d.verschil) * 12 : null
            return (
              <li
                key={d.sleutel}
                className="rij"
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, ...(i === domeinen.length - 1 ? { borderBottom: 'none' } : {}) }}
              >
                {/* De bovenste regel is een knop zodra doorklikken kan. Een echte
                    <button> en geen span met role: alleen zo werkt het toetsenbord
                    en krijgt de rij een focusring. */}
                {(() => {
                  const Wikkel = onKies ? 'button' : 'span'
                  const knopEigenschappen = onKies
                    ? {
                        type: 'button' as const,
                        className: 'rij-knop',
                        'aria-label': t('Bekijk de boekingen van {naam} — {bedrag}', {
                          naam: t(d.naam),
                          bedrag: formatEuro(d.bedrag),
                        }),
                        onClick: () => onKies(d.sleutel, t(d.naam)),
                      }
                    : { style: { display: 'flex', alignItems: 'center', gap: 12 } }
                  return (
                    <Wikkel {...knopEigenschappen}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: d.kleur }} />
                  <span className="rij-midden">
                    <span className="rij-titel">{t(d.naam)}</span>
                  </span>
                  {/* Het verschil met de vorige periode, in dezelfde kleurtaal als
                      "Stijgers en dalers": bij uitgaven is meer rood en minder groen. */}
                  {d.verschil !== null && d.verschil !== 0 && (
                    <span
                      className="bedrag"
                      style={{ color: gestegen ? 'var(--negative)' : 'var(--positive)', fontSize: 'var(--tekst-s)' }}
                    >
                      {gestegen ? '▲' : '▼'} {formatEuro(Math.abs(d.verschil))}
                      {d.procent !== null && ` (${Math.abs(d.procent)}%)`}
                    </span>
                  )}
                  <Bedrag centen={d.bedrag} />
                    </Wikkel>
                  )
                })()}

                <span className="rij-meta">
                  {perJaar !== null
                    ? gestegen
                      ? t('Houdt dit een jaar aan, dan kost het {bedrag} extra. {tip}', { bedrag: formatEuro(perJaar), tip: t(d.tip) })
                      : t('Houdt dit een jaar aan, dan bespaar je {bedrag}. {tip}', { bedrag: formatEuro(perJaar), tip: t(d.tip) })
                    : d.vorig === null
                      ? t(d.tip)
                      : gedaald || gestegen
                        ? t('Vorige periode: {bedrag}. {tip}', { bedrag: formatEuro(d.vorig), tip: t(d.tip) })
                        : t('Even veel als de vorige periode. {tip}', { tip: t(d.tip) })}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Kaart>
  )
}
