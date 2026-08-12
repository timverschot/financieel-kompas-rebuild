import type { Categorie, Dossier, DossierDocument, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { bouwAfrekeningOverzicht, type AfrekeningGroep, type AfrekeningRegel } from './afrekeningOverzicht'
import {
  berekeningTekst,
  reactieTekst,
  groepLabel,
  kinderenTekst,
  periodeTekst,
  regelMeta,
  saldoLegende,
  sleutelHerkomst,
  sleutelVanRegel,
  totaalRegels,
  verdeelsleutelTekst,
  verrekenTekst,
  voorbehoudRegels,
} from './afrekeningTekst'
import { vandaag } from './datum'
import { veiligeBestandsnaam } from './download'
import { formatEuro } from './format'
import { bonnenVanKost, documentenVan, soortNaam } from './kluis'
import { LINKS, ONDERGRENS, RECHTS, maakBlad, plaatsAfbeelding } from './pdfBlad'

// De BEWIJSMAP: één PDF met alles erin, klaar om aan een advocaat of bemiddelaar
// te geven.
//
// Het verschil met de gewone afrekening-PDF (`afrekeningPdf.ts`) is niet cosmetisch:
//
//  * de afrekening is een SAMENVATTING — wat is het saldo, hoe is het opgebouwd;
//  * de bewijsmap is een DOSSIER — per kost de volledige berekening, wélke
//    verdeelsleutel gold en waarom, én de bonnen zelf als bijlage, elk op een eigen
//    bladzijde met een verwijzing uit de lijst.
//
// De grens die we bewaken staat in het document zelf (zie `voorbehoudRegels`): we
// leveren feiten en berekeningen, geen juridisch advies.
//
// Alle cijfers komen uit `bouwAfrekeningOverzicht`, dezelfde rekenkern als het
// scherm en de klembordtekst. Dit bestand doet enkel de opmaak en de bijlagen.

// De kolommen van een uitsplitsingstabel, gelijk aan die van de afrekening-PDF:
// wie beide documenten naast elkaar legt, ziet dezelfde tabel.
const KOL_TOTAAL = 118
const KOL_JIJ = 142
const KOL_PARTNER = 166
const KOL_SALDO = RECHTS

// De witruimte tussen de titel van een bijlage en de bon eronder.
//
// Bewust GEEN vaste bovenkant meer: die stond op 42 mm terwijl de titel vrij mocht
// doorlopen. Een lange omschrijving van een gedeelde kost of een lange
// documentnaam brak dan over vier regels af, en de bon werd bovenop die tekst
// getekend.
const BIJLAGE_MARGE = 6

// Hoogstens zoveel regels titel boven een bon.
const MAX_TITELREGELS = 4

/** Eén bijlage: een bon van een kost, of een document uit de kluis van het dossier. */
export type Bijlage = {
  nummer: number
  titel: string
  meta: string[]
  bestand: string
  /** Bij een bon van een kost: welke kost. Bij een kluisdocument: leeg. */
  kostId?: string
  /** Een PDF-bijlage kan niet als afbeelding ingevoegd worden. */
  isPdf: boolean
}

/** Is deze data-URL een PDF in plaats van een afbeelding? */
function isPdfBestand(dataUrl: string): boolean {
  return dataUrl.startsWith('data:application/pdf')
}

/**
 * Bouwt de lijst bijlagen: eerst de bonnen van de kosten in dezelfde
 * chronologische volgorde als de detaillijst, dan de documenten uit de kluis van
 * het dossier.
 *
 * Zuiver en los testbaar: geen jsPDF nodig om na te gaan of de nummering klopt.
 */
export function bouwBijlagen(
  t: Vertaler,
  regels: AfrekeningRegel[],
  kosten: GedeeldeKost[],
  documenten: DossierDocument[],
  dossierId: string,
): Bijlage[] {
  // Via `bonnenVanKost`, niet via `k.bonnetje`: hangt de kost aan een transactie, dan
  // zit de bonfoto in de documentkluis en niet op de kost — en er kunnen er twéé zijn.
  // Zie kluis.ts.
  const bonnenPerKost = new Map(kosten.map((k) => [k.id, bonnenVanKost(k, documenten)]))
  const bijlagen: Bijlage[] = []

  for (const r of regels) {
    const bonnen = bonnenPerKost.get(r.kostId) ?? []
    for (const [i, bon] of bonnen.entries()) {
      bijlagen.push({
        nummer: bijlagen.length + 1,
        // Bij twee bewijsstukken voor dezelfde kost zegt de titel welke van de twee,
        // zodat "bijlage 3" en "bijlage 4" niet identiek heten.
        titel:
          bonnen.length > 1
            ? `${r.datum} ${r.omschrijving} (${t('{n} van {totaal}', { n: i + 1, totaal: bonnen.length })})`
            : `${r.datum} ${r.omschrijving}`,
        meta: [formatEuro(r.bedrag), ...(r.heeftCategorie ? [r.categorieNaam] : [])],
        bestand: bon,
        kostId: r.kostId,
        isPdf: isPdfBestand(bon),
      })
    }
  }

  // De kluis van het dossier: de grondslag (overeenkomst, vonnis, attesten).
  //
  // `documentenVan` sorteert NIEUWSTE eerst — dat is juist voor het scherm, waar je
  // wil zien wat je net toevoegde. In een bewijsstuk is het omgekeerd: de
  // overeenkomst uit 2024 komt vóór het attest van vorige maand, want zo leest een
  // dossier. Daarom hier expliciet omgekeerd.
  const kluis = [...documentenVan(documenten, { soort: 'dossier', id: dossierId })].reverse()
  for (const d of kluis) {
    bijlagen.push({
      nummer: bijlagen.length + 1,
      // De SOORT erbij: een vonnis en een losse foto stonden anders identiek in de
      // lijst, en juist bij een bewijsstuk is dat het verschil dat telt.
      titel: `${soortNaam(t, d.soort)}: ${d.naam}`,
      meta: [t('toegevoegd op {datum}', { datum: d.toegevoegdOp }), ...(d.notitie ? [d.notitie] : [])],
      bestand: d.bestand,
      isPdf: isPdfBestand(d.bestand),
    })
  }

  return bijlagen
}

/**
 * Bouwt de bewijsmap en biedt ze aan om te downloaden.
 *
 * `documenten` mag leeg zijn: dan bestaat de bijlagenlijst enkel uit de bonnen van
 * de kosten zelf.
 */
export async function exporteerBewijsmapPDF(
  t: Vertaler,
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
  gebruikerCategorieen: Categorie[] = [],
  documenten: DossierDocument[] = [],
  nu: Date = new Date(),
): Promise<void> {
  // De bon-haak: zo zeggen de tellingen ('waarvan 2 met bon'), de regels onder een
  // kost en de bijlagelijst alle drie hetzelfde over dezelfde bon.
  const o = bouwAfrekeningOverzicht(
    dossier,
    afrekening,
    kosten,
    kinderen,
    gebruikerCategorieen,
    (k) => bonnenVanKost(k, documenten).length > 0,
  )
  const bijlagen = bouwBijlagen(t, o.regels, kosten, documenten, dossier.id)
  // Op kost-id en niet op de titel: twee schoolrekeningen van dezelfde dag met
  // dezelfde omschrijving zijn twee verschillende kosten met twee verschillende
  // bonnen, en dan zou een verwijzing naar de verkeerde bijlage wijzen.
  // Een lijst per kost, want één kost kan twee bewijsstukken hebben.
  const bijlagenPerKost = new Map<string, number[]>()
  for (const b of bijlagen) {
    if (b.kostId === undefined) continue
    bijlagenPerKost.set(b.kostId, [...(bijlagenPerKost.get(b.kostId) ?? []), b.nummer])
  }
  const opmaakdatum = vandaag(nu)

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const blad = maakBlad(doc)

  // ---- Kop -----------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(t('Bewijsmap — {naam}', { naam: o.dossierNaam }), LINKS, blad.positie())
  blad.verschuif(8)
  for (const regel of [
    `${t('Periode')}: ${periodeTekst(t, o)}`,
    `${t('Kinderen')}: ${kinderenTekst(t, o)}`,
    `${t('Datum van de afrekening')}: ${o.datum}`,
    `${t('Opgemaakt op')}: ${opmaakdatum}`,
    t('{n} kost(en), {m} bijlage(n)', { n: o.aantalKosten, m: bijlagen.length }),
  ]) {
    blad.regel(regel)
  }

  // ---- De grens die we bewaken --------------------------------------------
  blad.kop(t('Wat dit document is'))
  for (const regel of voorbehoudRegels(t)) blad.alinea(`• ${regel}`)

  // ---- Verdeelsleutels ----------------------------------------------------
  if (o.verdeelsleutels.length > 0) {
    blad.kop(t('Verdeelsleutel'))
    blad.alinea(t('Elke kost is verdeeld volgens een van deze afspraken. Achter elke regel staat op hoeveel kosten ze van toepassing was.'), {
      klein: true,
      grijs: true,
    })
    for (const s of o.verdeelsleutels) blad.alinea(`• ${verdeelsleutelTekst(t, s)}`)
  }

  // ---- Totalen ------------------------------------------------------------
  blad.kop(t('Totalen'))
  for (const { label, waarde } of totaalRegels(t, o)) blad.labelWaarde(label, waarde)
  blad.besluit(verrekenTekst(t, o.netto))
  if (o.wijktAf) {
    blad.alinea(
      t('Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.', {
        bedrag: formatEuro(o.bewaardNetto),
      }),
    )
  }

  // ---- Uitsplitsingen -----------------------------------------------------
  let eersteTabel = true
  function tabel(titel: string, groepen: AfrekeningGroep[]) {
    if (groepen.length === 0) return
    blad.kop(titel)
    if (eersteTabel) {
      eersteTabel = false
      blad.alinea(saldoLegende(t), { klein: true, grijs: true })
    }
    blad.ruimte(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(t('Totaal'), KOL_TOTAAL, blad.positie(), { align: 'right' })
    doc.text(t('Jij'), KOL_JIJ, blad.positie(), { align: 'right' })
    doc.text(t('Partner'), KOL_PARTNER, blad.positie(), { align: 'right' })
    doc.text(t('Saldo'), KOL_SALDO, blad.positie(), { align: 'right' })
    doc.setFont('helvetica', 'normal')
    blad.verschuif(5)
    doc.setFontSize(9.5)
    for (const g of groepen) {
      // De naam mag over twee regels lopen in plaats van afgekapt te worden.
      // "Niet toegewezen aan een kind" werd anders stil "Niet toegewezen aan een",
      // en dan lijkt er een woord te ontbreken in plaats van een regel.
      const naamDelen = doc.splitTextToSize(groepLabel(t, g), KOL_TOTAAL - LINKS - 6) as string[]
      blad.ruimte(naamDelen.length * 5 + 1)
      const y = blad.positie()
      doc.text(formatEuro(g.totaal), KOL_TOTAAL, y, { align: 'right' })
      doc.text(formatEuro(g.jouwAandeel), KOL_JIJ, y, { align: 'right' })
      doc.text(formatEuro(g.partnerAandeel), KOL_PARTNER, y, { align: 'right' })
      doc.text(formatEuro(g.netto), KOL_SALDO, y, { align: 'right' })
      for (const deel of naamDelen) {
        doc.text(deel, LINKS, blad.positie())
        blad.verschuif(5)
      }
    }
  }
  tabel(t('Per kind'), o.perKind)
  tabel(t('Per categorie'), o.perCategorie)
  tabel(t('Per kostensoort'), o.perKostensoort)

  // ---- De chronologische lijst, met de berekening per kost ----------------
  if (o.regels.length > 0) {
    blad.kop(t('De kosten, chronologisch'))
    blad.alinea(t('Per kost: het bedrag, de verdeling die erop is toegepast en waarom die gold. Zo is elke rij na te rekenen.'), {
      klein: true,
      grijs: true,
    })
    for (const r of o.regels) {
      const nummers = bijlagenPerKost.get(r.kostId) ?? []
      // De bon-status van `regelMeta` wordt vervangen door de verwijzing naar de
      // bladzijde waar die bon staat. Een tweede regel eronder zou hetzelfde twee
      // keer zeggen, en bij een kost zonder bon zelfs twee keer "geen bon".
      const antwoord = reactieTekst(t, r)
      const uitleg = [
        berekeningTekst(t, r),
        `${t('Verdeelsleutel')}: ${sleutelHerkomst(t, sleutelVanRegel(r))}`,
        // Ronde 44: een betwisting hoort in het stuk dat naar een advocaat of
        // bemiddelaar gaat. Zonder deze regel verzwijgt het document precies het
        // enige waarover partijen het oneens zijn.
        ...(antwoord ? [antwoord] : []),
        ...regelMeta(t, r, nummers.length > 0 ? t('zie bijlage {n}', { n: nummers.join(', ') }) : undefined),
      ]
      const titelDelen = doc.splitTextToSize(`${r.datum}  ${r.omschrijving}`, KOL_TOTAAL - LINKS) as string[]
      const uitlegDelen = uitleg.flatMap((deel) => doc.splitTextToSize(deel, RECHTS - LINKS - 4) as string[])
      // De hele kost blijft bij elkaar: staat de helft van de berekening op het
      // volgende blad, dan is de rij niet meer na te rekenen zonder te bladeren.
      blad.ruimte(titelDelen.length * 5 + uitlegDelen.length * 4 + 3)
      const eerste = blad.positie()
      doc.setFontSize(9.5)
      for (const deel of titelDelen) {
        doc.text(deel, LINKS, blad.positie())
        blad.verschuif(5)
      }
      doc.text(formatEuro(r.bedrag), RECHTS, eerste, { align: 'right' })
      doc.setFontSize(8)
      doc.setTextColor(90)
      for (const deel of uitlegDelen) {
        doc.text(deel, LINKS + 4, blad.positie())
        blad.verschuif(4)
      }
      doc.setTextColor(0)
      doc.setFontSize(9.5)
      blad.verschuif(2)
    }
  }

  // ---- De bijlagen: elke bon op een eigen bladzijde -----------------------
  if (bijlagen.length === 0) {
    blad.kop(t('Bijlagen'))
    blad.alinea(t('Er zijn geen bonnen of documenten toegevoegd aan de kosten van deze afrekening.'), { grijs: true })
  }

  for (const b of bijlagen) {
    blad.nieuwBlad()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(t('Bijlage {n}', { n: b.nummer }), LINKS, blad.positie())
    blad.verschuif(6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    // Hoogstens vier regels titel. Er staat geen maximumlengte op de omschrijving van
    // een gedeelde kost, dus een geplakte lap tekst zou de titel van het blad af laten
    // lopen — en dan bleef er geen plaats over voor de bon zelf.
    const alleTitelDelen = doc.splitTextToSize(b.titel, RECHTS - LINKS) as string[]
    const titelDelen = alleTitelDelen.slice(0, MAX_TITELREGELS)
    if (alleTitelDelen.length > MAX_TITELREGELS) titelDelen[MAX_TITELREGELS - 1] += '…'
    for (const deel of titelDelen) {
      doc.text(deel, LINKS, blad.positie())
      blad.verschuif(5)
    }
    if (b.meta.length > 0) {
      blad.alinea(b.meta.join(' · '), { klein: true, grijs: true })
    }

    // De bon begint onder wat er hierboven geschreven is, niet op een vaste hoogte.
    const boven = blad.positie() + BIJLAGE_MARGE

    if (b.isPdf) {
      // jsPDF kan geen PDF-bestand als afbeelding invoegen. Dat eerlijk zeggen is
      // beter dan een blanco bladzijde: wie het stuk leest, weet dan dat er een
      // bewijsstuk bestaat en dat het los op te vragen is.
      blad.verschuif(BIJLAGE_MARGE)
      blad.alinea(
        t('Deze bon is als PDF-bestand toegevoegd en kan niet als afbeelding worden ingevoegd. Vraag het losse bestand op.'),
      )
      continue
    }

    const gelukt = plaatsAfbeelding(doc, b.bestand, {
      x: LINKS,
      y: boven,
      breedte: RECHTS - LINKS,
      hoogte: ONDERGRENS - boven,
    })
    if (!gelukt) {
      blad.verschuif(BIJLAGE_MARGE)
      blad.alinea(t('Deze bon kon niet worden weergegeven. Het bestand is beschadigd of van een onbekend type.'))
    }
  }

  blad.voettekst(t, `${t('Bewijsmap')} — ${o.dossierNaam} — ${opmaakdatum}`)
  doc.save(`bewijsmap-${veiligeBestandsnaam(o.dossierNaam)}-${o.datum}.pdf`)
}
