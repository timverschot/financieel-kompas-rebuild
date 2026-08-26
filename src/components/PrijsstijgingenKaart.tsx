import { useMemo, useState } from 'react'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { bouwPrijsbeeld, verouderdeVasteLasten, type Prijswijziging } from '../utils/prijsstijging'
import { dagJaar, vandaag } from '../utils/datum'
import { formatEuro } from '../utils/format'
import { Bedrag, Kaart } from '../ui/basis'
import { useT } from '../i18n'

// "Wat werd er duurder?" (ronde 43, deel 2).
//
// Waarom dit een eigen kaart is en niet een rij in de trends. De trends vergelijken
// CATEGORIEËN tussen twee periodes ("Vervoer € 40 meer dan vorige maand"). Dat zegt
// niets over de oorzaak: heb je meer getankt, of is de brandstof duurder geworden?
// Deze kaart kijkt per HANDELAAR naar het bedrag dat elke maand terugkomt, en meldt
// alleen wanneer dat bedrag zelf veranderd is. Dat is een ander soort feit: je hebt
// niets anders gedaan, en toch betaal je meer.
//
// Ingeklapt, net als de besparingskaart: het is een signaal, geen hoofdgerecht.
// Dicht neemt ze één regel in, en die regel is meteen het antwoord.

/** Hoeveel wijzigingen de open kaart toont vóór ze afkapt. */
const MAX_RIJEN = 8

export function PrijsstijgingenKaart({
  transacties,
  terugkerendePosten,
  onToonHandelaar,
  vandaagISO = vandaag(),
}: {
  transacties: Transactie[]
  terugkerendePosten: TerugkerendePost[]
  /** Toont de boekingen van deze handelaar in de transactielijst. */
  onToonHandelaar?: (naam: string) => void
  vandaagISO?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  const beeld = useMemo(
    () => bouwPrijsbeeld({ transacties, terugkerendePosten, vandaagISO }),
    [transacties, terugkerendePosten, vandaagISO],
  )
  const verouderd = useMemo(
    () => new Set(verouderdeVasteLasten(beeld, terugkerendePosten).map((w) => w.postId)),
    [beeld, terugkerendePosten],
  )

  const duurder = beeld.wijzigingen.filter((w) => w.verschil > 0)
  const goedkoper = beeld.wijzigingen.filter((w) => w.verschil < 0)

  return (
    <Kaart
      titel={t('Wat werd er duurder?')}
      bijschrift={samenvatting()}
      actie={
        beeld.wijzigingen.length > 0 ? (
          <button
            type="button"
            className="knop knop-ghost knop-klein"
            aria-expanded={open}
            onClick={() => setOpen((aan) => !aan)}
          >
            {open ? t('Verberg') : t('Toon')}
          </button>
        ) : undefined
      }
      data-prijsstijgingen
    >
      {open && (
        <>
          <ul className="lijst">
            {[...duurder, ...goedkoper].slice(0, MAX_RIJEN).map((w) => (
              <Rij key={w.sleutel} wijziging={w} verouderd={verouderd.has(w.postId)} onToon={onToonHandelaar} />
            ))}
          </ul>
          {beeld.wijzigingen.length > MAX_RIJEN && (
            <p className="rij-meta" style={{ margin: '8px 0 0' }}>
              {t('Nog {n} andere wijzigingen.', { n: beeld.wijzigingen.length - MAX_RIJEN })}
            </p>
          )}
          <p className="rij-meta" style={{ margin: '10px 0 0' }}>
            {t(
              'De app vergelijkt het bedrag dat bij dezelfde handelaar elke keer terugkomt. Ze kijkt achttien maanden terug, vraagt minstens zes betalingen, en zwijgt over winkels waar je bedrag elke keer anders is.',
            )}
          </p>
        </>
      )}
    </Kaart>
  )

  function samenvatting(): string {
    if (beeld.wijzigingen.length === 0) {
      return t('Nog niets gevonden. Daar is minstens een half jaar aan boekingen bij dezelfde handelaar voor nodig.')
    }
    if (beeld.duurderPerMaand > 0 && beeld.goedkoperPerMaand > 0) {
      return t('{duurder} per maand duurder, {goedkoper} goedkoper — netto {netto} per maand.', {
        duurder: formatEuro(beeld.duurderPerMaand),
        goedkoper: formatEuro(beeld.goedkoperPerMaand),
        netto: formatEuro(Math.abs(beeld.nettoPerMaand)),
      })
    }
    if (beeld.duurderPerMaand > 0) {
      return t('{bedrag} per maand duurder dan voorheen, over {n} prijsstijging(en).', {
        bedrag: formatEuro(beeld.duurderPerMaand),
        n: duurder.length,
      })
    }
    return t('{bedrag} per maand goedkoper dan voorheen.', { bedrag: formatEuro(beeld.goedkoperPerMaand) })
  }
}

function Rij({
  wijziging,
  verouderd,
  onToon,
}: {
  wijziging: Prijswijziging
  /** Klopt het bedrag van de bijbehorende vaste last niet meer? */
  verouderd: boolean
  onToon?: (naam: string) => void
}) {
  const { t } = useT()
  const w = wijziging
  const naam = (
    <span className="rij-titel">
      {w.naam}
      {w.bron === 'vastelast' && <span className="badge badge-mini badge-info"> {t('vaste last')}</span>}
      {w.zekerheid === 'gemiddeld' && <span className="badge badge-mini badge-neutraal"> {t('nog onzeker')}</span>}
    </span>
  )

  return (
    <li className="rij rij-kost">
      <div className="rij-midden">
        {onToon ? (
          <button
            type="button"
            // `raak-label` geeft de knop op een aanraakscherm 44 px hoogte. Zonder
            // die klasse is ze precies zo hoog als de tekst — een raakvlak van 20 px,
            // en dat is te klein om met een duim te treffen.
            className="rij-titel raak-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
            }}
            onClick={() => onToon(w.naam)}
          >
            {naam}
          </button>
        ) : (
          naam
        )}
        <span className="rij-meta">
          {t('{oud} → {nieuw} sinds {datum}', {
            oud: formatEuro(w.oudBedrag),
            nieuw: formatEuro(w.nieuwBedrag),
            datum: dagJaar(w.sindsDatum),
          })}
        </span>
        {/* Zolang de vaste last niet bijgewerkt is, rekent de app in je vooruitblik,
            je buffer en je "nog niet ingeboekt"-meldingen met een bedrag dat niet
            meer bestaat. Dat is een andere handeling dan onderhandelen met je
            leverancier, dus het staat er apart bij. */}
        {verouderd && (
          <span className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
            {t('Je vaste last staat op een ander bedrag dan wat je nu betaalt. Pas ze aan bij Budget.')}
          </span>
        )}
      </div>
      <div className="rij-acties" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
        <Bedrag centen={-w.verschilPerMaand} />
        <span className="rij-meta" style={{ display: 'block' }}>
          {t('per maand')}
        </span>
      </div>
    </li>
  )
}
