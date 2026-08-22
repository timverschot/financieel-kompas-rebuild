// Gedeelde bouwstenen van het Kompal-design.
//
// Doel: elke pagina bouwt met dezelfde kaart, dezelfde lege-toestand, hetzelfde
// bedrag en dezelfde voortgangsbalk, zodat de app er overal hetzelfde uitziet en
// een latere designwijziging op één plek gebeurt. De vormgeving zelf staat in
// index.css (klassen .kaart, .leeg, .bedrag, .balk); deze componenten zetten
// enkel de juiste structuur en klassen.

import type { CSSProperties, ReactNode } from 'react'
import { formatEuro } from '../utils/format'

function klassen(...delen: Array<string | false | undefined>): string {
  return delen.filter(Boolean).join(' ')
}

// De kaart mag ook `data-*`-attributen doorgeven. Waarom dat nodig is: sommige
// blokken worden in een test op hun rol gezocht (bv. `[data-maandblok]`) in plaats
// van op een zichtbare tekst, want die tekst mag veranderen zonder dat de test
// breekt. React geeft onbekende props niet door, dus zonder deze doorgeeflijn
// verdwenen ze stil — en dan zoekt de test naar iets wat er nooit stond.
type DataAttributen = { [sleutel: `data-${string}`]: string | boolean | undefined }

type KaartProps = {
  /** Titel bovenaan de kaart (Bricolage-kop). Weglaten = kaart zonder kop. */
  titel?: ReactNode
  /** Kleine grijze regel onder de titel. */
  bijschrift?: ReactNode
  /** Knop of chip rechts van de titel. */
  actie?: ReactNode
  /** Compacte variant: kleinere radius en padding, voor rijtjes-in-rijtjes. */
  compact?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
} & DataAttributen

/** Het standaard inhoudsvlak: crème vlak, zachte rand, grote radius. */
export function Kaart({ titel, bijschrift, actie, compact, className, style, children, ...rest }: KaartProps) {
  // ⚠ RONDE 66: `bijschrift` hoort hier ook bij. Stond er alleen een bijschrift en
  // geen titel, dan verdween die zin geruisloos — precies wat er gebeurde toen een
  // kaart haar titel afstond aan het tabblad erboven. Een tekst die je meegeeft en
  // die dan nergens verschijnt, is de stilste fout die een component kan maken.
  const heeftKop = titel !== undefined || actie !== undefined || bijschrift !== undefined
  return (
    <section className={klassen('kaart', compact && 'kaart-compact', className)} style={style} {...rest}>
      {heeftKop && (
        <div className="kaart-kop">
          <div>
            {titel !== undefined && <h2 className="kaart-titel">{titel}</h2>}
            {bijschrift !== undefined && <p className="kaart-bijschrift">{bijschrift}</p>}
          </div>
          {actie}
        </div>
      )}
      {children}
    </section>
  )
}

/** Titel van een pagina, met optionele ondertitel en actie rechts. */
export function PaginaKop({ titel, bijschrift, actie }: { titel: ReactNode; bijschrift?: ReactNode; actie?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <h1 className="paginakop">{titel}</h1>
        {bijschrift !== undefined && <p className="paginasub">{bijschrift}</p>}
      </div>
      {actie}
    </div>
  )
}

/**
 * Vriendelijke lege toestand: "hier staat nog niets".
 *
 * ⚠ RONDE 66 — DE EERSTE STAP. De doorlichting telde negentien lege toestanden die
 * alleen een CONSTATERING toonden ("Nog geen budgetten ingesteld.") en niets zeiden
 * over wat je dan moet doen. Voor wie de app al kent is dat genoeg; voor wie ze
 * leert is het een doodlopend scherm. Een lege toestand hoort te bestaan uit twee
 * delen: wat er niet is, en wat je eraan doet.
 *
 * De actie is OPTIONEEL, want niet elke lege toestand heeft er een: "Geen inkomsten
 * deze maand" is gewoon waar, en er is niets aan te doen. Een knop die nergens heen
 * gaat is erger dan geen knop.
 */
export function Leeg({ children, actie }: { children: ReactNode; actie?: ReactNode }) {
  if (actie === undefined) return <p className="leeg">{children}</p>
  return (
    <div className="leeg leeg-met-stap">
      <p style={{ margin: 0 }}>{children}</p>
      <div className="knoprij" style={{ justifyContent: 'center' }}>
        {actie}
      </div>
    </div>
  )
}

/**
 * De knop in een lege toestand. Eén vorm, zodat de eerste stap er overal hetzelfde
 * uitziet en je hem na één keer herkent.
 */
export function EersteStapKnop({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="knop knop-secundair knop-klein" onClick={onClick}>
      {children}
    </button>
  )
}

/**
 * Een bedrag in centen, tabulair uitgelijnd in het monospace-lettertype.
 * `richting` kleurt: 'in' groen, 'uit' terracotta, 'auto' volgt het teken,
 * en standaard (geen richting) blijft het bedrag neutraal — zoals het design
 * voorschrijft: kleur enkel bij expliciete richting.
 */
export function Bedrag({
  centen,
  richting,
  groot,
  toonTeken,
  className,
}: {
  centen: number
  richting?: 'in' | 'uit' | 'auto'
  groot?: boolean
  toonTeken?: boolean
  className?: string
}) {
  const effectief = richting === 'auto' ? (centen >= 0 ? 'in' : 'uit') : richting
  const tekst = toonTeken && centen > 0 ? '+' + formatEuro(centen) : formatEuro(centen)
  return (
    <span
      className={klassen(
        groot ? 'bedrag-groot' : 'bedrag',
        effectief === 'in' && 'bedrag-positief',
        effectief === 'uit' && 'bedrag-negatief',
        className,
      )}
    >
      {tekst}
    </span>
  )
}

/**
 * Klein label boven een cijfer, en het cijfer zelf.
 *
 * Met `onClick` wordt het hele blokje een knop die naar de gegevens achter het
 * cijfer leidt (ronde 48). Zonder `onClick` blijft het een gewoon blokje — een
 * knop die nergens heen gaat, is erger dan geen knop.
 *
 * `aria-label` is dan verplicht in de praktijk: "€ 1.240,00" alleen zegt een
 * schermlezer niets. De zichtbare tekst hoort er vooraan in te staan (WCAG 2.5.3,
 * "Label in Name"), dus de vorm is "{label} {waarde} — bekijk …" en niet
 * "Bekijk de … van {label}".
 */
export function Stat({
  label,
  doorklik,
  children,
}: {
  label: ReactNode
  children: ReactNode
  /**
   * Bestemming en toegankelijke naam samen in ÉÉN prop, en niet als twee losse
   * optionele props. Zo kan er geen knop ontstaan zonder naam: dan zou een
   * schermlezer alleen "Netto€ 1.500,00" voorlezen, zonder dat er iets zegt dat
   * je erop kan tikken of waar je terechtkomt.
   */
  doorklik?: { naar: () => void; naam: string }
}) {
  const inhoud = (
    <>
      <span className="label-caps">{label}</span>
      <span className="stat-waarde">{children}</span>
    </>
  )
  if (!doorklik) return <div className="stat">{inhoud}</div>
  return (
    <button type="button" className="stat stat-knop" aria-label={doorklik.naam} onClick={doorklik.naar}>
      {inhoud}
      <Chevron />
    </button>
  )
}

/**
 * Het pijltje dat zegt: hier zit iets achter (ronde 51).
 *
 * WAAROM DIT NODIG IS. `.stat-knop` en `.kengetal-knop` laten zich alleen kennen
 * door `cursor: pointer` en een randje bij aanwijzen — en allebei bestaan niet op een
 * aanraakscherm. Op een telefoon, waar deze app vooral gebruikt wordt, was een
 * klikbaar kengetal dus visueel niet te onderscheiden van een gewoon cijfer. Wie niet
 * toevallig tikte, wist niet dat er iets achter zat.
 *
 * Hetzelfde teken en dezelfde klasse als bij een klikbare lijstrij (ronde 48/49), want
 * het betekent hetzelfde. `aria-hidden`: de toegankelijke naam van de knop zegt al
 * waar je terechtkomt, en "groter dan"-teken erbij voorgelezen krijgen helpt niemand.
 */
function Chevron() {
  return (
    <span className="rij-chevron" aria-hidden="true">
      ›
    </span>
  )
}

/**
 * Een tegel met een label en een groot bedrag: de rij bovenaan het Overzicht en
 * bovenaan de transactielijst.
 *
 * Waarom dit één component is (ronde 51): allebei de schermen bouwden hun eigen
 * versie uit dezelfde CSS-klassen, en op het Overzicht waren ze sinds ronde 48
 * klikbaar terwijl ze boven de transactielijst kale blokjes bleven. Ze zagen er
 * identiek uit, dus tikte je erop en gebeurde er niets.
 *
 * `children` en geen `bedrag`-prop: de twee schermen kleuren hun cijfer verschillend,
 * en dat verschil hoort niet in deze component thuisgesmokkeld te worden.
 *
 * `doorklik` heeft dezelfde vorm als bij `Stat`, en om dezelfde reden: bestemming en
 * toegankelijke naam in één prop, zodat er geen naamloze knop kan ontstaan.
 */
export function Kengetal({
  label,
  doorklik,
  children,
}: {
  label: ReactNode
  children: ReactNode
  doorklik?: { naar: () => void; naam: string }
}) {
  const inhoud = (
    <>
      <span className="label-caps">{label}</span>
      {children}
    </>
  )
  if (!doorklik) return <div className="kengetal">{inhoud}</div>
  return (
    <button type="button" className="kengetal kengetal-knop" aria-label={doorklik.naam} onClick={doorklik.naar}>
      {inhoud}
      <Chevron />
    </button>
  )
}

/**
 * Voortgangsbalk (budget, spaardoel, lening). `label` is de toegankelijke naam,
 * `fractie` loopt van 0 tot 1 en wordt afgekapt.
 */
export function Balk({
  label,
  fractie,
  kleur,
  nu,
  max,
}: {
  label: string
  fractie: number
  kleur?: string
  nu?: number
  max?: number
}) {
  const breedte = Math.max(0, Math.min(fractie, 1)) * 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      {...(nu !== undefined ? { 'aria-valuenow': Math.round(nu) } : {})}
      {...(max !== undefined ? { 'aria-valuemin': 0, 'aria-valuemax': Math.round(max) } : {})}
      className="balk"
    >
      <div className="balk-vulling" style={{ width: `${breedte}%`, ...(kleur ? { background: kleur } : {}) }} />
    </div>
  )
}
