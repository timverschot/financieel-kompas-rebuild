import type {
  GedeeldeKost,
  Garantie,
  Kindrekeningpost,
  Lening,
  Onderhoudsbijdrage,
  Spaardoel,
  Transactie,
  Verrekening,
} from '../data/schema'
import type { Vertaler } from '../i18n'

// Waar wordt dit gezinslid nog gebruikt? (ronde 65)
//
// ⚠ WAAROM DEZE FUNCTIE BESTAAT. Naast elk gezinslid stond een kaal kruisje
// zonder vraag. Het bestand zei het zelf al bovenaan: verwijder je een lid, dan
// blijven zijn id's in bestaande gedeelde kosten staan en verdwijnt zijn naam
// stil uit de afrekening — daar staat dan een ruwe id of "onbekend". Dat is geen
// foutmelding, het is een afrekening die er nog steeds klopt uitziet.
//
// Ze TELT dus waar het lid nog aan hangt, en het venster wijst naar de zachte
// weg die één knop verder al bestond: archiveren.

export type GezinslidGegevens = {
  kosten?: GedeeldeKost[]
  verrekeningen?: Verrekening[]
  kindrekeningposten?: Kindrekeningpost[]
  onderhoudsbijdragen?: Onderhoudsbijdrage[]
  transacties?: Transactie[]
  spaardoelen?: Spaardoel[]
  leningen?: Lening[]
  garanties?: Garantie[]
}

/**
 * Alleen regels voor wat er ECHT is. Staat het lid nergens, dan is de lijst LEEG —
 * en niet één regel met "nergens gebruikt" erin. Het venster zette daar namelijk de
 * kop "Deze naam wordt nu nog gebruikt in:" boven, en dan las het scherm: "wordt nu
 * nog gebruikt in: • wordt nergens gebruikt". De kop hoort mee te wisselen, dus die
 * keuze laten we aan het venster.
 */
export function telGezinslidGebruik(t: Vertaler, id: string, g: GezinslidGegevens): string[] {
  const bevat = (ids?: string[]) => (ids ?? []).includes(id)
  const paren: [number, string][] = [
    [(g.kosten ?? []).filter((k) => bevat(k.kindIds)).length, '{n} gedeelde kost(en) in een dossier'],
    [(g.verrekeningen ?? []).filter((v) => bevat(v.kindIds)).length, '{n} afrekening(en)'],
    [(g.kindrekeningposten ?? []).filter((p) => bevat(p.kindIds)).length, '{n} post(en) op een kindrekening'],
    [
      (g.onderhoudsbijdragen ?? []).filter((o) => bevat(o.kindIds)).length,
      '{n} regeling(en) voor de onderhoudsbijdrage',
    ],
    [(g.transacties ?? []).filter((x) => bevat(x.persoonIds)).length, '{n} boeking(en)'],
    [(g.spaardoelen ?? []).filter((s) => s.persoonId === id).length, '{n} spaardoel(en)'],
    [(g.leningen ?? []).filter((l) => l.persoonId === id).length, '{n} lening(en)'],
    [(g.garanties ?? []).filter((x) => x.persoonId === id).length, '{n} garantie(s)'],
  ]
  return paren.filter(([n]) => n > 0).map(([n, sleutel]) => t(sleutel, { n }))
}
