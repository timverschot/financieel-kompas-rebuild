import type { Dossier, Kind, Onderhoudsbijdrage } from '../data/schema'
import type { Vertaler } from '../i18n'
import { reeksinfo } from '../data/indexreeksen'
import { maandJaarLabel, vandaag } from './datum'
import { veiligeBestandsnaam } from './download'
import { formatEuro } from './format'
import type { BijdrageOpbouw } from './onderhoudsbijdrage'
import {
  aanvangsindexTekst,
  bijdrageVoorbehoud,
  briefGestopt,
  briefKern,
  briefOnderwerp,
  briefSlot,
  richtingTekstNeutraal,
  stapUitleg,
} from './onderhoudsbijdrageTekst'
import { laadJsPdf, LINKS, maakBlad, RECHTS } from './pdfBlad'

// Het overzicht van de onderhoudsbijdrage als PDF (ronde 42).
//
// Waarvoor dit dient: je stuurt het mee naar de andere ouder wanneer de bijdrage
// geïndexeerd is. De indexatie gebeurt in België van rechtswege, maar niemand past
// zijn overschrijving vanzelf aan — en een blad met de berekening erop is een
// makkelijker gesprek dan een bericht met alleen een nieuw bedrag.
//
// Daarom staat de volledige berekening erin en niet enkel de uitkomst: het bedrag
// uit de regeling, beide indexcijfers, de formule uitgeschreven, en per verjaardag
// wat eruit kwam. Zo is elke regel na te rekenen door iemand die de app niet heeft.
//
// De grens is dezelfde als bij de bewijsmap: feiten en berekening, geen juridisch
// advies. Bij dit onderwerp weegt dat zwaarder — een bedrag dat als standpunt
// gelezen wordt, maakt het gesprek erger in plaats van makkelijker.

// De kolommen van de tabel met verjaardagen.
const KOL_BEDRAG = RECHTS

export async function exporteerIndexatiebriefPDF(
  t: Vertaler,
  dossier: Dossier,
  bijdrage: Onderhoudsbijdrage,
  opbouw: BijdrageOpbouw,
  kinderen: Kind[] = [],
  nuISO: string = vandaag(),
): Promise<void> {
  const { jsPDF } = await laadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const blad = maakBlad(doc)

  const kindNamen = (bijdrage.kindIds ?? [])
    .map((id) => kinderen.find((k) => k.id === id)?.naam)
    .filter(Boolean)
    .join(', ')

  const gegevens = {
    basisbedrag: bijdrage.basisbedrag,
    datumRegeling: bijdrage.datumRegeling,
    geindexeerd: bijdrage.geindexeerd,
    eindDatum: bijdrage.eindDatum,
  }
  // Is de regeling afgelopen, dan is "vandaag" het verkeerde woord — precies zoals
  // op het scherm. Er is sindsdien niets meer verschuldigd en niets meer geïndexeerd.
  const gestopt = briefGestopt(gegevens, nuISO)

  // ---- Blad 1: de begeleidende brief ---------------------------------------
  //
  // Waarom een brief vóór het overzicht, en niet als tweede bijlage: wie een blad
  // met alleen cijfers krijgt, moet zelf bedenken wat de bedoeling is. En twee
  // bestanden meesturen is één handeling meer dan er nodig is — dus zit de brief
  // in dezelfde PDF, als blad 1.
  blad.regel(nuISO, { grijs: true })
  blad.verschuif(6)
  // Afbrekend en niet als losse regel: bij drie of vier kindnamen liep de
  // onderwerpregel voorbij de rechtermarge, en jsPDF meldt dat niet — de tekst
  // verdwijnt gewoon van het blad.
  blad.alinea(briefOnderwerp(t, kindNamen, bijdrage.geindexeerd), { vet: true })
  blad.verschuif(4)
  for (const alinea of briefKern(t, opbouw, gegevens, nuISO)) {
    blad.alinea(alinea)
    blad.verschuif(3)
  }
  blad.alinea(briefSlot(t))
  blad.verschuif(6)
  blad.alinea(
    t('Deze brief is opgemaakt met Financieel Kompas. Hij bevat een berekening en geen juridisch standpunt.'),
    { klein: true, grijs: true },
  )
  blad.nieuwBlad()

  // ---- Kop -----------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(t('Onderhoudsbijdrage — {naam}', { naam: dossier.naam }), LINKS, blad.positie())
  blad.verschuif(8)
  for (const regel of [
    `${t('Regeling van')}: ${bijdrage.datumRegeling}`,
    `${t('Bedrag in de regeling')}: ${formatEuro(bijdrage.basisbedrag)}`,
    richtingTekstNeutraal(t, bijdrage.richting),
    ...(kindNamen ? [`${t('Kinderen')}: ${kindNamen}`] : []),
    ...(bijdrage.eindDatum ? [`${t('Loopt tot')}: ${bijdrage.eindDatum}`] : []),
    `${t('Opgemaakt op')}: ${nuISO}`,
  ]) {
    blad.regel(regel)
  }

  // ---- De uitkomst, meteen ------------------------------------------------
  blad.kop(gestopt ? t('Bijdrage bij het einde van de regeling') : t('De bijdrage vandaag'))
  blad.besluit(formatEuro(opbouw.huidigBedrag))
  if (bijdrage.geindexeerd === false) {
    blad.alinea(t('De regeling sluit indexatie uit, dus het bedrag blijft ongewijzigd.'))
  }

  // ---- Hoe het berekend is ------------------------------------------------
  blad.kop(t('Hoe dit berekend is'))
  blad.alinea(
    t('De onderhoudsbijdrage volgt de {reeks}. Het nieuwe bedrag is telkens: het bedrag uit de regeling, maal de index van de maand vóór de verjaardag, gedeeld door de aanvangsindex.', {
      reeks: t(reeksinfo(opbouw.reeks).naamInZin),
    }),
  )
  blad.alinea(aanvangsindexTekst(t, opbouw))
  blad.alinea(
    t('De indexcijfers komen van Statbel en staan in basis {jaar} = 100. De app kent cijfers tot {laatste}.', {
      jaar: opbouw.basisjaarTabel,
      laatste: maandJaarLabel(`${opbouw.laatsteBekendeMaand}-01`),
    }),
    { klein: true, grijs: true },
  )

  // ---- De verjaardagen ----------------------------------------------------
  if (opbouw.stappen.length > 0) {
    blad.kop(t('Per verjaardag'))
    blad.ruimte(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(t('Bedrag'), KOL_BEDRAG, blad.positie(), { align: 'right' })
    doc.setFont('helvetica', 'normal')
    blad.verschuif(5)
    doc.setFontSize(9.5)

    for (const stap of opbouw.stappen) {
      const uitleg = stapUitleg(t, stap, bijdrage.basisbedrag, opbouw.aanvangsindex)
      const delen = doc.splitTextToSize(uitleg, KOL_BEDRAG - LINKS - 28) as string[]
      // De datum, de uitleg en het bedrag horen bij elkaar op één blad te staan.
      blad.ruimte(5 + delen.length * 4 + 2)
      const y = blad.positie()
      doc.setFontSize(9.5)
      doc.text(stap.datum, LINKS, y)
      doc.text(formatEuro(stap.bedrag), KOL_BEDRAG, y, { align: 'right' })
      blad.verschuif(5)
      doc.setFontSize(8)
      doc.setTextColor(90)
      for (const deel of delen) {
        doc.text(deel, LINKS + 4, blad.positie())
        blad.verschuif(4)
      }
      doc.setTextColor(0)
      doc.setFontSize(9.5)
      blad.verschuif(2)
    }
  } else {
    blad.kop(t('Per verjaardag'))
    // Bij een reeksconflict is de lijst óók leeg, maar niet omdat er nog geen
    // verjaardag geweest is — bij een regeling uit 2010 waren dat er zestien. Zo'n
    // onware zin in een blad dat naar een advocaat kan gaan, is geen detail.
    blad.alinea(
      opbouw.indexConflict !== null
        ? t('De verjaardagen zijn niet berekend, omdat de gebruikte indexcijfers niet uit dezelfde reeks komen.')
        : t('Er is nog geen verjaardag van de regeling geweest.'),
      { grijs: true },
    )
  }

  // ---- Wat ontbreekt ------------------------------------------------------
  if (opbouw.ontbrekendeMaanden.length > 0) {
    blad.kop(t('Wat er nog ontbreekt'))
    blad.alinea(
      t('Voor deze maanden is er geen indexcijfer gebruikt: {maanden}. De bedragen van die verjaardagen zijn daarom ongewijzigd gelaten in plaats van geschat.', {
        maanden: opbouw.ontbrekendeMaanden.map((m) => maandJaarLabel(`${m}-01`)).join(', '),
      }),
    )
  }

  // ---- Het voorbehoud -----------------------------------------------------
  blad.kop(t('Wat dit blad is'))
  for (const regel of bijdrageVoorbehoud(t, opbouw.reeks)) blad.alinea(`• ${regel}`)

  blad.voettekst(t, `${t('Onderhoudsbijdrage')} — ${dossier.naam} — ${nuISO}`)
  doc.save(`onderhoudsbijdrage-${veiligeBestandsnaam(dossier.naam)}-${nuISO}.pdf`)
}
