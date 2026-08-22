import type { Categorie, Transactie } from '../data/schema'
import { groepenVanTransactie, isGesplitstOverCategorieen } from '../utils/transactie'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { Bedrag, EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { dagKort } from '../utils/datum'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

// Je laatste boekingen, op het Overzicht.
//
// Deze lijst zat tot ronde 31 in de zijkolom, en die zijkolom bestaat alleen op
// een breed scherm. Op een telefoon zag je je eigen laatste boekingen dus nergens
// op de startpagina — terwijl "klopt wat ik net ingetikt heb?" precies is waarvoor
// je die pagina opent. Ze staat nu in de hoofdkolom, op elk schermformaat.
//
// Sorteren gaat via `gesorteerdNieuwsteEerst`: dat is de enige datumvergelijker in
// de app, en de enige die twee boekingen op dezelfde dag een vaste volgorde geeft
// (zie utils/sorteer.ts). De vorige versie hier vergeleek zelf op datum en liet
// rijen van dezelfde dag dus rondspringen bij elke herlaad.

const AANTAL = 6

function TekenVoor({ tx, categorieen }: { tx: Transactie; categorieen: Categorie[] }) {
  const groepen = groepenVanTransactie(tx, categorieen)
  const gesplitst = isGesplitstOverCategorieen(tx, categorieen)
  // Zelfde logica als in de transactielijst: winkelkar voor een ticket met
  // meerdere categorieën, anders het icoon van de categorie, anders de beginletter.
  const icoon = gesplitst ? '🛒' : groepen[0]?.icoon
  const kleur = gesplitst ? null : (groepen[0]?.kleur ?? null)
  return (
    <span
      className="rij-teken"
      style={kleur ? { backgroundColor: `color-mix(in srgb, ${kleur} 18%, transparent)` } : undefined}
      aria-hidden
    >
      {icoon ?? tx.omschrijving.trim().slice(0, 1).toUpperCase()}
    </span>
  )
}

export function RecenteTransacties({
  transacties,
  categorieen,
  onAlle,
  onBewerk,
  onNieuw,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  onAlle: () => void
  /** De eerste stap in de lege toestand (ronde 66). Optioneel: zonder handler geen knop. */
  onNieuw?: () => void
  /**
   * Een rij aanklikken opent die boeking (ronde 40).
   *
   * Zonder dit was dit lijstje een doodloper: je zag "Colruyt € 43,20" staan,
   * merkte dat er een categorie ontbrak, en moest dan via Transacties zelf
   * teruggaan zoeken. Optioneel gehouden zodat de kaart ook zonder bewerken kan
   * blijven bestaan.
   */
  onBewerk?: (tx: Transactie) => void
}) {
  const { t } = useT()
  const recent = gesorteerdNieuwsteEerst(transacties).slice(0, AANTAL)

  return (
    <Kaart
      titel={t('Recente boekingen')}
      actie={
        <button className="knop knop-ghost knop-klein" onClick={onAlle}>
          {t('Alle boekingen')}
        </button>
      }
    >
      {recent.length === 0 ? (
        <Leeg actie={onNieuw ? <EersteStapKnop onClick={onNieuw}>{t('Boeking toevoegen')}</EersteStapKnop> : undefined}>
          {t('Nog geen boekingen.')}
        </Leeg>
      ) : (
        <ul className="lijst">
          {recent.map((tx) => {
            const inhoud = (
              <>
                <TekenVoor tx={tx} categorieen={categorieen} />
                <span className="rij-midden">
                  <span className="rij-titel">{tx.omschrijving}</span>
                  <span className="rij-meta">{dagKort(tx.datum)}</span>
                </span>
                <Bedrag centen={tx.bedrag} richting="auto" />
              </>
            )
            return (
              <li key={tx.id} className="rij" style={{ gap: 10 }}>
                {onBewerk ? (
                  <button
                    type="button"
                    className="rij-knop"
                    // Datum en bedrag horen ÍN het label. Een <button> biedt zijn
                    // inhoud niet apart aan hulpsoftware aan, dus zonder deze
                    // toevoeging werd een schermlezer stil een lijst zonder
                    // bedragen voorgelezen.
                    aria-label={t('Bewerk {oms} — {datum}, {bedrag}', {
                      oms: tx.omschrijving,
                      datum: dagKort(tx.datum),
                      bedrag: formatEuro(tx.bedrag),
                    })}
                    onClick={() => onBewerk(tx)}
                  >
                    {inhoud}
                  </button>
                ) : (
                  inhoud
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Kaart>
  )
}
