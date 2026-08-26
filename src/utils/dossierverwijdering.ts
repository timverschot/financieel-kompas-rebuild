import type {
  DossierDocument,
  GedeeldeKost,
  Kindrekening,
  Kindrekeningpost,
  Onderhoudsbetaling,
  Onderhoudsbijdrage,
  Verrekening,
} from '../data/schema'
import type { Vertaler } from '../i18n'

// Wat gaat er precies weg met dit dossier? (ronde 59)
//
// ⚠ WAAROM DEZE FUNCTIE BESTAAT. Het kruisje naast de dossierkeuzelijst wiste het
// HELE dossier — alle gedeelde kosten, alle verrekeningen, de kindrekening met haar
// posten, de onderhoudsbijdrage met al haar betalingen, én de volledige
// documentkluis met elke scan en elke bon erin — zonder één vraag. De enige redding
// was de ongedaan-balk (acht seconden toen, twintig sinds ronde 61). Ter vergelijking:
// voor "Begin opnieuw" moet je het woord WISSEN intikken.
//
// En het stond naast een KEUZELIJST, waar je juist heen gaat om van dossier te
// wisselen. Eén mistik op een telefoon en jaren bewijsmateriaal waren weg.
//
// ⚠ EN WAAROM ZE TELT in plaats van "weet je het zeker?" te vragen. Het verschil
// tussen een leeg dossier en een dossier met zestig kosten en twaalf documenten is
// precies wat je op dát moment moet weten. "Weet je het zeker" leert een mens in
// twee weken wegklikken; een lijst met getallen niet.

/**
 * Wat gaat er precies weg met dit dossier?
 *
 * Alleen regels voor wat er ECHT is: bij een leeg dossier staat er één regel en
 * geen lijst met zes keer "0". En de documentkluis staat er nadrukkelijk bij, want
 * dat is het enige wat je niet opnieuw kan intikken.
 */
export function telVoorVerwijderen(
  t: Vertaler,
  dossierId: string,
  gegevens: {
    kosten: GedeeldeKost[]
    verrekeningen: Verrekening[]
    kindrekeningen: Kindrekening[]
    kindrekeningposten: Kindrekeningpost[]
    onderhoudsbijdragen?: Onderhoudsbijdrage[]
    onderhoudsbetalingen?: Onderhoudsbetaling[]
    documenten?: DossierDocument[]
  },
): string[] {
  const rekeningIds = new Set(gegevens.kindrekeningen.filter((k) => k.dossierId === dossierId).map((k) => k.id))
  const bijdrageIds = new Set(
    (gegevens.onderhoudsbijdragen ?? []).filter((b) => b.dossierId === dossierId).map((b) => b.id),
  )
  const paren: [number, string][] = [
    [gegevens.kosten.filter((k) => k.dossierId === dossierId).length, '{n} gedeelde kost(en)'],
    // ⚠ De kindrekening ZELF, en niet alleen haar posten (nakijkronde ronde 59).
    // Een rekening draagt een beginsaldo, de maandbijdragen van beide ouders en de
    // indexcijfers. Had je die net ingesteld maar nog geen post geboekt, dan zei het
    // venster "Er staat nog niets in dit dossier" terwijl al die afspraken weg gingen.
    [rekeningIds.size, '{n} kindrekening(en)'],
    [gegevens.verrekeningen.filter((v) => v.dossierId === dossierId).length, '{n} afrekening(en)'],
    [gegevens.kindrekeningposten.filter((p) => rekeningIds.has(p.kindrekeningId)).length, '{n} post(en) op de kindrekening'],
    [bijdrageIds.size, '{n} regeling(en) voor de onderhoudsbijdrage'],
    [
      (gegevens.onderhoudsbetalingen ?? []).filter((b) => bijdrageIds.has(b.bijdrageId)).length,
      '{n} betaling(en) van de onderhoudsbijdrage',
    ],
    [(gegevens.documenten ?? []).filter((d) => d.dossierId === dossierId).length, '{n} bewaard(e) document(en) — bonnen, scans, overeenkomsten'],
  ]
  const regels = paren.filter(([n]) => n > 0).map(([n, sleutel]) => t(sleutel, { n }))
  return regels.length > 0 ? regels : [t('Er staat nog niets in dit dossier.')]
}
