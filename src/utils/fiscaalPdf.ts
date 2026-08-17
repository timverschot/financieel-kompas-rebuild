import type { Vertaler } from '../i18n'
import type { FiscaalOverzicht, FiscaleRegel } from './fiscaal'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { vandaag } from './datum'
import { veiligeBestandsnaam } from './download'
import { formatEuro } from './format'
import { LINKS, RECHTS, maakBlad, type Blad, type Doc } from './pdfBlad'

// Het fiscale jaaroverzicht als PDF — het blad dat naar de boekhouder gaat (ronde 50).
//
// WAAROM NAAST DE CSV. Ze zijn niet twee vormen van hetzelfde. De CSV is om mee te
// REKENEN: één rij per boeking, filterbaar, optelbaar. Dit document is om te LEZEN:
// per post het bedrag, het vak, de code, en de reden waarom dat bedrag niet zomaar
// in de aangifte mag. Wie de CSV opent ziet cijfers zonder hun voorbehoud; wie dit
// blad leest ziet het voorbehoud even groot als het cijfer.
//
// DE GRENS STAAT IN HET DOCUMENT ZELF, net als in de bewijsmap en de indexatiebrief:
// feiten en bedragen, geen advies. Een blad dat bij een boekhouder belandt zonder die
// zin, leest als een berekening — en dit is er geen.
//
// Alle cijfers komen uit `fiscaalJaaroverzicht`, dezelfde rekenkern als het scherm en
// de CSV. Dit bestand doet enkel de opmaak.

// De rechterkolom van de boekingenlijst. Dezelfde plaats als in de periode-PDF, zodat
// wie beide bladen naast elkaar legt dezelfde tabel ziet.
const KOL_DATUM = LINKS
const KOL_TEKST = LINKS + 22

/** "Vak X · code 1384", of de zin die zegt dat de code van je situatie afhangt. */
function codeRegel(t: Vertaler, regel: FiscaleRegel, vervallen: boolean): string {
  const vak = t(regel.post.vak)
  // Bij een VERVALLEN post geen codes. Er valt niets meer in te vullen, en een code
  // op papier is een uitnodiging om ze toch over te typen.
  if (vervallen) return vak
  if (regel.post.codes.length === 0) {
    return t('{vak} — de code hangt af van je situatie en staat op je attest', { vak })
  }
  return t('{vak} · code {codes}', { vak, codes: regel.post.codes.join(' / ') })
}

/** Waar de app voor deze post gekeken heeft, met de NAMEN van de categorieën. */
export function kijktInRegel(t: Vertaler, regel: FiscaleRegel): string {
  if (regel.post.uitOnderhoudsbetalingen) {
    return t('Kijkt in: je betalingen op een onderhoudsregeling in Dossiers.')
  }
  const namen = regel.post.categorieIds
    .map((id) => labelVanCategorie(id, []))
    .filter((naam): naam is string => naam !== undefined && naam !== 'Onbekend')
  if (namen.length === 0) return ''
  return t('Kijkt in: {categorieen}.', { categorieen: namen.join(', ') })
}

/**
 * Bouwt het document en biedt het als download aan.
 *
 * `nu` is meegegeven en niet binnenin opgehaald, zodat de datum op het blad in een
 * test vastligt — dezelfde afspraak als in `periodePdf.ts`.
 */
export async function exporteerFiscaalPDF(
  t: Vertaler,
  overzicht: FiscaalOverzicht,
  nu: Date = new Date(),
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const blad = maakBlad(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(t('Fiscaal jaaroverzicht {jaar}', { jaar: overzicht.inkomstenjaar }), LINKS, blad.positie())
  blad.verschuif(8)
  blad.regel(`${t('Opgemaakt op')}: ${vandaag(nu)}`)
  blad.regel(
    t('Wat je in {jaar} betaalde, geef je aan in de aangifte van aanslagjaar {aj}.', {
      jaar: overzicht.inkomstenjaar,
      aj: overzicht.aanslagjaar,
    }),
    { vet: true },
  )

  // De grens, meteen onder de kop en niet achteraan. Wie enkel het eerste blad leest,
  // moet ze gezien hebben.
  blad.verschuif(2)
  blad.alinea(
    t('De app verzamelt en telt op. Ze rekent niet uit wat je terugkrijgt: dat hangt af van je volledige aangifte. Dit is geen belastingadvies.'),
    { klein: true, grijs: true },
  )
  blad.alinea(
    t('De lijst is die van België. Waar een post gewestelijk is, staat ze zoals ze in Vlaanderen geldt; in Brussel en Wallonië gelden andere regels.'),
    { klein: true, grijs: true },
  )

  if (!overzicht.gekend) {
    blad.kop(t('Dit jaar staat niet in de app'))
    blad.alinea(
      t('Voor aanslagjaar {aj} heeft de app geen lijst. In aanslagjaar 2026 verdween een reeks belastingverminderingen in één keer, dus een lijst uit die tijd zou vandaag posten tonen die niet meer bestaan — en een te korte lijst leest als "er valt niets af te trekken".', {
        aj: overzicht.aanslagjaar,
      }),
    )
    blad.voettekst(t, `Financieel Kompas — ${overzicht.inkomstenjaar}`)
    doc.save(bestandsnaam(overzicht))
    return
  }

  const metIets = overzicht.regels.filter((r) => r.bedrag > 0)
  const leeg = overzicht.regels.filter((r) => r.bedrag === 0)

  if (metIets.length === 0) {
    blad.kop(t('Niets gevonden'))
    blad.alinea(
      t('De app vond in {jaar} geen boekingen onder een fiscale post. Boek je die uitgaven onder een andere categorie, dan vindt ze hier niets — hieronder staat per post waar ze kijkt.', {
        jaar: overzicht.inkomstenjaar,
      }),
    )
  }

  for (const regel of metIets) postBlok(doc, blad, t, regel, false)
  for (const regel of overzicht.vervallen) postBlok(doc, blad, t, regel, true)

  if (leeg.length > 0) {
    blad.kop(t('Waar de app nog gekeken heeft'))
    blad.alinea(
      t('Onder deze posten vond ze in {jaar} niets. Staat er iets dat je wél betaalde, dan is het waarschijnlijk onder een andere categorie geboekt.', {
        jaar: overzicht.inkomstenjaar,
      }),
      { klein: true, grijs: true },
    )
    for (const regel of leeg) {
      blad.regel(t(regel.post.naam), { vet: true })
      blad.alinea(codeRegel(t, regel, false), { klein: true, grijs: true, indent: 4 })
      const kijkt = kijktInRegel(t, regel)
      if (kijkt !== '') blad.alinea(kijkt, { klein: true, grijs: true, indent: 4 })
    }
    blad.verschuif(2)
    blad.alinea(
      t('Twee dingen ziet dit scherm nooit: een overboeking tussen je eigen rekeningen (dat is geen uitgave) en een aflossing die je los van een categorie boekt. Staat je storting of je lening zo in de app, boek ze dan als uitgave met de juiste categorie.'),
      { klein: true, grijs: true },
    )
  }

  // De app-naam is een eigennaam en wordt niet vertaald.
  blad.voettekst(t, `Financieel Kompas — ${overzicht.inkomstenjaar}`)
  doc.save(bestandsnaam(overzicht))
}

/** Eén post: de kop, het bedrag, het voorbehoud, en dan pas de boekingen. */
function postBlok(
  doc: Doc,
  blad: Blad,
  t: Vertaler,
  regel: FiscaleRegel,
  vervallen: boolean,
): void {
  blad.kop(vervallen ? `${t(regel.post.naam)} — ${t('Vervallen')}` : t(regel.post.naam))
  blad.regel(codeRegel(t, regel, vervallen), { klein: true, grijs: true })
  blad.labelWaarde(t('Betaald in dit jaar'), formatEuro(regel.bedrag), true)

  if (regel.aftrekbaar !== undefined) {
    blad.alinea(
      regel.bouwtVerderAf
        ? t('{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde en daalt de komende jaren nog. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.', {
            pct: regel.percentage ?? 0,
            bedrag: formatEuro(regel.aftrekbaar),
          })
        : t('{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.', {
            pct: regel.percentage ?? 0,
            bedrag: formatEuro(regel.aftrekbaar),
          }),
    )
  }

  // Het voorbehoud staat VÓÓR de boekingen en in de gewone letter, niet in de kleine
  // grijze. Op papier is dat het verschil tussen een waarschuwing en een voetnoot.
  if (regel.post.waarschuwing) blad.alinea(t(regel.post.waarschuwing))
  blad.alinea(t(regel.post.voorwaarde), { klein: true, grijs: true })
  const kijkt = kijktInRegel(t, regel)
  if (kijkt !== '') blad.alinea(kijkt, { klein: true, grijs: true })
  blad.alinea(`${t('Bron')}: ${regel.post.bron}`, { klein: true, grijs: true })

  if (regel.boekingen.length === 0) return
  blad.verschuif(2)
  blad.regel(t('{n} boeking(en)', { n: regel.boekingen.length }), { klein: true, vet: true })

  for (const b of regel.boekingen) {
    const titel = b.omschrijving || t('Betaling')
    const delen = doc.splitTextToSize(titel, RECHTS - KOL_TEKST - 26) as string[]
    // De hele boeking in één keer plaatsen of naar het volgende blad: een datum
    // zonder haar bedrag onderaan een blad leest als een andere boeking.
    blad.ruimte(delen.length * 5)
    const eerste = blad.positie()
    doc.setFontSize(9.5)
    doc.text(b.datum, KOL_DATUM, eerste)
    for (const deel of delen) {
      doc.text(deel, KOL_TEKST, blad.positie())
      blad.verschuif(5)
    }
    doc.text(formatEuro(b.bedrag), RECHTS, eerste, { align: 'right' })
  }
}

function bestandsnaam(overzicht: FiscaalOverzicht): string {
  return `${veiligeBestandsnaam(`fiscaal-${overzicht.inkomstenjaar}-aanslagjaar-${overzicht.aanslagjaar}`)}.pdf`
}
