import { useMemo, useState } from 'react'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { spaarquote, maandVooruitblik } from '../utils/vooruitblik'
import type { Periode } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { useT, type Vertaler } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { huidigeMaand, vandaag, maandVoluit } from '../utils/datum'

function kleurVanSaldo(saldo: number): string {
  return saldo >= 0 ? 'var(--positive)' : 'var(--negative)'
}
function procent(q: number | null): string {
  return q === null ? '—' : `${Math.round(q)}%`
}

// Kleine label-links / bedrag-rechts regel, in de vorm van een lijstrij.
function Regel({ label, bedrag, teken }: { label: string; bedrag: number; teken: '+' | '−' }) {
  return (
    <li className="rij">
      <span className="rij-midden rij-titel">{label}</span>
      <span className="bedrag">
        {teken}
        {formatEuro(bedrag)}
      </span>
    </li>
  )
}


/**
 * Eén telregel met de posten eronder, elk met een "Boek in"-knop.
 *
 * Zonder de knop was de regel een doodloper — je las dat er drie openstonden en
 * moest dan zelf naar de Plan-pagina om uit te zoeken wélke.
 *
 * BUITEN `VooruitblikSectie` gedeclareerd, en dat is geen stijlkeuze: een functie
 * die ín een component staat is bij elke render een nieuw componenttype, dus haalt
 * React de hele subtree weg en bouwt hem opnieuw op. Wie met de tab-toets op de
 * uitklapknop stond en Enter duwde, verloor daardoor de focus naar `<body>` — bij
 * precies de knop die deze ronde toegankelijk moest maken.
 */
function TeBoeken({
  t,
  tekst,
  posten,
  maand,
  open,
  onWissel,
  onBoekVasteLast,
}: {
  t: Vertaler
  tekst: string
  posten: TerugkerendePost[]
  maand: string
  open: boolean
  onWissel: () => void
  // ⚠ `Promise<void> | void` (ronde 68): dit schrijft een boeking weg en kan mislukken.
  onBoekVasteLast?: (postId: string, maand: string) => Promise<void> | void
}) {
  // Vangt een mislukte inboeking op en zegt het (ronde 68). ⚠ Een haak moet vóór elke
  // vroege `return` staan; React telt ze per tekening.
  const opslag = useOpslagpoging()
  if (!onBoekVasteLast || posten.length === 0) {
    return (
      <p className="rij-meta" style={{ margin: 0 }}>
        {tekst}
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Opslagfout fout={opslag.fout} zin={t('Inboeken is niet gelukt. Er is niets geboekt.')} />
      <button
        type="button"
        className="knop knop-ghost knop-klein"
        style={{ alignSelf: 'flex-start' }}
        aria-expanded={open}
        onClick={onWissel}
      >
        {tekst}{' '}
        {/* Het driehoekje is puur een dubbeling van `aria-expanded`; het hoort
            dus niet in de voorgelezen naam van de knop. */}
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ul className="lijst">
          {posten.map((p) => (
            <li key={p.id} className="rij">
              <span className="rij-midden">
                <span className="rij-titel">{p.omschrijving}</span>
                <span className="rij-meta">{t('dag {dag}', { dag: p.dag })}</span>
              </span>
              <span className="bedrag">
                {p.bedrag >= 0 ? '+' : '−'}
                {formatEuro(Math.abs(p.bedrag))}
              </span>
              <span className="rij-acties">
                <button
                  type="button"
                  className="knop knop-secundair knop-klein"
                  // Drie keer "Boek in" in dezelfde lijst is voor een schermlezer
                  // niet te onderscheiden; de naam van de post hoort erbij.
                  aria-label={t('Boek {naam} in', { naam: p.omschrijving })}
                  onClick={() => void opslag.probeer(() => onBoekVasteLast(p.id, maand))}
                >
                  {t('Boek in')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// "Vooruitblik & spaarquote": bovenaan de spaarquote over de gekozen periode
// (hoeveel % van je inkomsten je overhield), daaronder een vooruitblik voor de
// huidige maand die je nog niet ingeboekte vaste lasten meerekent.
export function VooruitblikSectie({
  transacties,
  terugkerendePosten,
  periode,
  periodeLabel,
  maand: maandProp,
  onBoekVasteLast,
  onNaarVast,
}: {
  transacties: Transactie[]
  terugkerendePosten: TerugkerendePost[]
  periode: Periode
  periodeLabel: string
  /**
   * Over welke maand de vooruitblik gaat ('JJJJ-MM'). Ronde 40: dit stond hard
   * op de huidige maand, terwijl de rest van de pagina wél kon terugbladeren.
   * Standaard blijft het de huidige maand.
   *
   * Let op: de DAG blijft altijd vandaag. Welke maand je bekijkt is iets anders
   * dan welke dag het is — de scheiding tussen "nog te komen" en "achterstallig"
   * hangt aan die dag.
   */
  maand?: string
  /**
   * Een vaste last hier meteen inboeken (ronde 40). Krijgt de maand mee die deze
   * kaart toont, zodat er nooit stil in een andere maand geboekt wordt.
   */
  onBoekVasteLast?: (postId: string, maand: string) => void
  /** De eerste stap wanneer er nog geen vaste lasten zijn (ronde 66). Optioneel. */
  onNaarVast?: () => void
}) {
  const { t } = useT()
  const [openLijst, setOpenLijst] = useState<'komend' | 'achterstallig' | null>(null)

  const sq = useMemo(() => spaarquote(transacties, periode), [transacties, periode])

  // Vandaag en de huidige maand komen uit utils/datum.ts, zodat elk scherm met
  // dezelfde (lokale) dag rekent. De dag is nodig om te zien welke vaste lasten
  // achterstallig zijn.
  const nu = new Date()
  const vandaagISO = vandaag(nu)
  const maand = maandProp ?? huidigeMaand(nu)
  const maandNaam = maandVoluit(maand)
  const vb = useMemo(
    () => maandVooruitblik(transacties, terugkerendePosten, maand, vandaagISO),
    [transacties, terugkerendePosten, maand, vandaagISO],
  )

  // Balkje toont het overgehouden deel van de inkomsten (0–100%); negatief = leeg.
  const vulling = sq.quote === null ? 0 : Math.max(0, Math.min(100, sq.quote))

  const postPerId = new Map(terugkerendePosten.map((p) => [p.id, p]))
  const postenVan = (ids: string[]): TerugkerendePost[] =>
    ids.map((id) => postPerId.get(id)).filter((p): p is TerugkerendePost => Boolean(p))

  return (
    <Kaart titel={t('Vooruitblik & spaarquote')}>
      {/* Spaarquote over de gekozen periode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {t('Spaarquote')} · {periodeLabel}
        </p>
        {sq.inkomsten === 0 ? (
          <Leeg>{t('Nog geen inkomsten in deze periode')}</Leeg>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="bedrag-groot" style={{ color: kleurVanSaldo(sq.saldo) }}>
                {procent(sq.quote)}
              </span>
              <span className="rij-meta">
                {t('{saldo} van {inkomsten} inkomsten overgehouden', { saldo: formatEuro(sq.saldo), inkomsten: formatEuro(sq.inkomsten) })}
              </span>
            </div>
            <div className="balk">
              <div className="balk-vulling" style={{ width: `${vulling}%`, background: kleurVanSaldo(sq.saldo) }} />
            </div>
            <ul className="lijst">
              <Regel label={t('Inkomsten')} bedrag={sq.inkomsten} teken="+" />
              <Regel label={t('Uitgaven')} bedrag={sq.uitgaven} teken="−" />
            </ul>
          </>
        )}
      </div>

      {/* Vooruitblik voor de huidige maand */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid var(--divider)' }}>
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {t('Vooruitblik — {maand}', { maand: maandNaam })}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="bedrag-groot" style={{ color: kleurVanSaldo(vb.verwachtSaldo) }}>
            {vb.verwachtSaldo >= 0 ? '+' : '−'}
            {formatEuro(Math.abs(vb.verwachtSaldo))}
          </span>
          <span className="rij-meta">
            {t('verwacht in {maand}', { maand: maandNaam })}
            {vb.verwachteQuote !== null ? ` · ${procent(vb.verwachteQuote)} ${t('spaarquote')}` : ''}
          </span>
        </div>

        {/* RONDE 69 — waar dit cijfer vandaan komt.
            `bepaalVooruitblik` telt: wat er deze maand al geboekt is, plus de
            terugkerende posten die déze maand nog moeten vallen (en de achterstallige).
            Meer niet. Er zit dus GEEN schatting in van de boodschappen, de tankbeurten
            en de rest van de losse uitgaven voor de resterende dagen. Op de 3de van de
            maand staat er daardoor een royaal overschot dat op de 30ste verdwenen is,
            zonder dat er iets misgelopen is — het cijfer beloofde alleen iets anders
            dan het rekende. BufferRegel zegt deze beperking al met zoveel woorden
            ("eten en tanken komen daar nog bij"); hier ontbrak ze.

            ⚠ Alleen voor de HUIDIGE maand. Je kan bovenaan naar maart bladeren, en dan
            is `isVoorbij` voor alles waar: er komt niets meer. "Wat er nog komt" zou
            dan een onderschatting aankondigen bij een maand die af is. */}
        {maand === huidigeMaand(nu) ? (
          <p className="rij-meta" data-vooruitblikbron style={{ margin: 0 }}>
            {t(
              'Hierin zit wat er deze maand al geboekt is, plus de terugkerende posten die déze maand vervallen — ook de te late. Losse uitgaven die nog komen — boodschappen, tanken — zitten er niet in.',
            )}
          </p>
        ) : null}

        <ul className="lijst">
          <Regel label={t('Al geboekt — inkomsten')} bedrag={vb.geboekt.inkomsten} teken="+" />
          <Regel label={t('Al geboekt — uitgaven')} bedrag={vb.geboekt.uitgaven} teken="−" />
          {vb.aantalKomend > 0 && vb.komend.inkomsten > 0 && (
            <Regel label={t('Nog te komen — inkomsten')} bedrag={vb.komend.inkomsten} teken="+" />
          )}
          {vb.aantalKomend > 0 && vb.komend.uitgaven > 0 && (
            <Regel label={t('Nog te komen — uitgaven')} bedrag={vb.komend.uitgaven} teken="−" />
          )}
          {/* Achterstallig: de dag van de maand is voorbij en er is niets geboekt.
              Bewust rustig getoond — het blijft een gewone regel in dezelfde lijst. */}
          {vb.achterstallig.inkomsten > 0 && (
            <Regel label={t('Achterstallig — inkomsten')} bedrag={vb.achterstallig.inkomsten} teken="+" />
          )}
          {vb.achterstallig.uitgaven > 0 && (
            <Regel label={t('Achterstallig — uitgaven')} bedrag={vb.achterstallig.uitgaven} teken="−" />
          )}
        </ul>
        {vb.aantalKomend > 0 && (
          <TeBoeken
            t={t}
            tekst={t('{n} vaste last(en) nog in te boeken in {maand}', { n: vb.aantalKomend, maand: maandNaam })}
            posten={postenVan(vb.komendeIds)}
            maand={maand}
            open={openLijst === 'komend'}
            onWissel={() => setOpenLijst(openLijst === 'komend' ? null : 'komend')}
            onBoekVasteLast={onBoekVasteLast}
          />
        )}
        {vb.aantalAchterstallig > 0 && (
          <TeBoeken
            t={t}
            tekst={t('{n} vaste last(en) achterstallig — de dag is voorbij', { n: vb.aantalAchterstallig })}
            posten={postenVan(vb.achterstalligeIds)}
            maand={maand}
            open={openLijst === 'achterstallig'}
            onWissel={() => setOpenLijst(openLijst === 'achterstallig' ? null : 'achterstallig')}
            onBoekVasteLast={onBoekVasteLast}
          />
        )}
        {/* Zonder ÉÉN vaste last stonden beide tellers op nul en meldde de app
            triomfantelijk dat alles ingeboekt was — terwijl je nog nooit een vaste
            last had aangemaakt. Dat is drie keer erger dan niets zeggen. */}
        {terugkerendePosten.length === 0 ? (
          /* ⚠ RONDE 66: de zin zei wat er ontbrak, maar niet waar je het invult. */
          <Leeg
            actie={onNaarVast ? <EersteStapKnop onClick={onNaarVast}>{t('Vul je vaste lasten in')}</EersteStapKnop> : undefined}
          >
            {t('Je hebt nog geen vaste lasten ingesteld. Zonder die weet de app niet wat er nog moet komen.')}
          </Leeg>
        ) : (
          vb.aantalKomend === 0 &&
          vb.aantalAchterstallig === 0 && (
            <p className="rij-meta" style={{ margin: 0 }}>
              {/* ⚠ RONDE 66, slotronde. "Alles al ingeboekt" mag alleen als er deze
                  maand ook écht iets te boeken viel. Heb je enkel een jaarpost die in
                  december vervalt, dan stonden beide tellers in augustus op nul en
                  bevestigde de app een controle die ze niet gedaan had. */}
              {vb.aantalDezeMaand > 0
                ? t('Alle vaste lasten voor {maand} zijn al ingeboekt', { maand: maandNaam })
                : t('Voor {maand} vervalt er geen enkele vaste last.', { maand: maandNaam })}
            </p>
          )
        )}
      </div>
    </Kaart>
  )
}
