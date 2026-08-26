import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DOCUMENTSOORTEN } from '../data/schema'
import type { DossierDocument, Documentsoort } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { vandaag } from '../utils/datum'
import { documentenVan, soortNaam, veldVanSoort, type KluisEigenaar } from '../utils/kluis'
import { Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'
import { Bonknop } from '../ui/Bonknop'

// Boven deze grens weigeren we het bestand: een data-URL van meer dan ~4 MB maakt
// de lokale database én de back-up onnodig zwaar. Beter meteen zeggen dat de scan
// kleiner moet, dan stil een trage app veroorzaken.
const MAX_BESTAND = 4_000_000

// `soortNaam` staat sinds ronde 41 in utils/kluis.ts: de bewijsmap gebruikt
// dezelfde namen, en twee kopieën lopen na één wijziging uit elkaar.

// De uitleg en de standaardsoort verschillen per soort kluis: bij een dossier
// denk je aan de ouderschapsovereenkomst, bij een lening aan de leningovereenkomst,
// bij een aankoop aan de factuur en het garantiebewijs.
function kluisTekst(t: Vertaler, soort: KluisEigenaar['soort']): { bijschrift: string; voorbeeld: string; begin: Documentsoort } {
  switch (soort) {
    case 'lening':
      return {
        bijschrift: t('Bewaar de leningovereenkomst en de betalingsbewijzen van deze lening op één plek.'),
        voorbeeld: t('bv. Leningovereenkomst'),
        begin: 'overeenkomst',
      }
    case 'garantie':
      return {
        bijschrift: t('Bewaar de factuur, het aankoopbewijs, het garantiebewijs en de handleiding van deze aankoop op één plek.'),
        voorbeeld: t('bv. Factuur wasmachine'),
        begin: 'bon',
      }
    case 'transactie':
      return {
        bijschrift: t('Bewaar de bon of factuur van deze boeking.'),
        voorbeeld: t('bv. Kassaticket Colruyt'),
        begin: 'bon',
      }
    default:
      return {
        bijschrift: t('Bewaar de ouderschapsovereenkomst, attesten, bonnen en het vonnis van dit dossier op één plek.'),
        voorbeeld: t('bv. Ouderschapsovereenkomst 2026'),
        begin: 'overeenkomst',
      }
  }
}

// De documentkluis. Hangt aan één eigenaar — een dossier, een lening of een
// garantie — en zet de bijbehorende papieren op één plek, zodat je ze niet meer
// moet zoeken in je mailbox. De bestanden zelf blijven lokaal (als data-URL) en
// gaan gewoon mee in de back-up.
//
// LET OP: het bestand heet nog 'DossierKluis.tsx' omdat de kluis begon als een
// dossier-onderdeel. De component zelf is niet meer aan dossiers gebonden.
export function Documentkluis({
  eigenaar,
  documenten,
  onOpslaan,
  onVerwijderen,
  inklapbaar = false,
}: {
  /** Waaraan deze kluis hangt: een dossier, een lening of een garantie. */
  eigenaar: KluisEigenaar
  /**
   * Ingeklapt tonen: enkel een knop 'Documenten (n)', die de kluis openvouwt.
   * Zo staat er geen volledig formulier in élke rij van een lange lijst. In deze
   * vorm tekent de component géén eigen kaart, want ze zit al in een rij.
   */
  inklapbaar?: boolean
  // Alle documenten van de app; deze component filtert zelf op de eigenaar.
  documenten: DossierDocument[]
  onOpslaan: (d: DossierDocument) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const tekst = kluisTekst(t, eigenaar.soort)
  // Meerdere kluizen kunnen tegelijk openstaan (bv. twee leningen), dus moeten de
  // veld-id's uniek zijn — anders wijst een label naar het verkeerde veld.
  const veldId = `kluis-${eigenaar.soort}-${eigenaar.id}`
  const [naam, setNaam] = useState('')
  const [soort, setSoort] = useState<Documentsoort>(tekst.begin)
  const [notitie, setNotitie] = useState('')
  const [bestand, setBestand] = useState('')
  const [bestandsnaam, setBestandsnaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const nieuwIdRef = useRef(nieuwId())
  // De rij waarvoor "weet je het zeker?" openstaat; een tweede klik verwijdert echt.
  const [bevestigId, setBevestigId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Nieuwste eerst; het filteren op eigenaar gebeurt in utils/kluis.ts.
  const gesorteerd = documentenVan(documenten, eigenaar)

  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met

  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).

  const redenId = useId()

  const geldig = naam.trim().length > 0 && bestand.length > 0

  function leegmaken() {
    // Klaar voor het volgende document: een vers id (ronde 68).
    nieuwIdRef.current = nieuwId()
    setNaam('')
    setSoort(tekst.begin)
    setNotitie('')
    setBestand('')
    setBestandsnaam('')
    setFout('')
  }

  async function kiesBestand(f: File) {
    setBezig(true)
    setFout('')
    try {
      const data = await verkleinAfbeelding(f)
      if (data.length > MAX_BESTAND) {
        setBestand('')
        setBestandsnaam('')
        setFout(t('Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.'))
        return
      }
      setBestand(data)
      setBestandsnaam(f.name)
      // Nog geen naam ingevuld? Neem de bestandsnaam als vertrekpunt.
      setNaam((vorige) => (vorige.trim() ? vorige : f.name.replace(/\.[^.]+$/, '')))
    } catch {
      setFout(t('Dit bestand kon niet gelezen worden. Probeer een andere scan of foto.'))
    } finally {
      setBezig(false)
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const doc: DossierDocument = {
      // ⚠ Eén vast id per invulbeurt (ronde 68): mislukt het bewaren en probeer je het
      // opnieuw, dan hoort dat hetzelfde document te overschrijven — niet er een
      // tweede bij te zetten.
      id: nieuwIdRef.current,
      [veldVanSoort(eigenaar.soort)]: eigenaar.id,
      naam: naam.trim(),
      soort,
      bestand,
      toegevoegdOp: vandaag(),
      ...(bestandsnaam ? { bestandsnaam } : {}),
      ...(notitie.trim() ? { notitie: notitie.trim() } : {}),
    }
    try {
      await onOpslaan(doc)
    } catch {
      // Een mislukte opslag mag de gebruiker nooit zijn invoer kosten: alles blijft
      // staan zodat hij het gewoon opnieuw kan proberen.
      setFout(t('Opslaan is mislukt. Probeer het opnieuw; je invoer blijft staan.'))
      return
    }
    leegmaken()
  }

  async function verwijder(id: string) {
    if (bevestigId !== id) {
      setBevestigId(id)
      return
    }
    // ⚠ RONDE 68 — de bevestiging werd hier gereset vóór er iets gebeurd was.
    // Mislukte het verwijderen, dan stond het document er nog, was de tweede tik
    // "vergeten", en zei niets iets. Het opslaan hierboven deed het al goed; dit was
    // de andere helft van dezelfde kaart.
    try {
      await onVerwijderen(id)
    } catch {
      setFout(t('Verwijderen is mislukt. Het document staat er nog; probeer het opnieuw.'))
      return
    }
    setFout('')
    setBevestigId(null)
  }

  const inhoud = (
    <>
      {gesorteerd.length === 0 && <Leeg>{t('Nog geen documenten. Voeg er hieronder een toe.')}</Leeg>}

      {gesorteerd.length > 0 && (
        <ul className="lijst">
          {gesorteerd.map((d) => (
            <li key={d.id} className="rij">
              {d.bestand.startsWith('data:image') && (
                <img
                  src={d.bestand}
                  alt=""
                  style={{ maxHeight: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              )}
              <div className="rij-midden">
                {/* `overflowWrap`: `.rij-midden` heeft `min-width: 0`, dus een lange
                    documentnaam werd op een telefoon stil weggeknipt — zonder
                    weglatingsteken, dus je zag niet dát er iets ontbrak. Juist bij een
                    bewijsstuk is de naam wat het document identificeert. */}
                <span className="rij-titel" style={{ overflowWrap: 'anywhere' }}>
                  {d.naam}
                </span>
                <span className="rij-meta">
                  <span className="badge badge-neutraal">{soortNaam(t, d.soort)}</span> {d.toegevoegdOp}
                  {d.notitie && <> · {d.notitie}</>}
                </span>
              </div>
              <span className="rij-acties">
                {/* Eén knop in plaats van twee links. Navigeren naar een
                    data-URL wordt door Safari geweigerd, dus deden "Openen" en
                    "Bewaren" op een iPhone allebei niets. De popup toont het
                    document in de app zelf en bewaart via een blob-URL. */}
                {/* Bewust "Bekijken" en niet "Openen": het document gaat niet naar
                    buiten open, het verschijnt in een venster ín de app. */}
                <Bonknop bestand={d.bestand} naam={d.bestandsnaam || d.naam} label={t('Bekijken')} />
                {bevestigId === d.id ? (
                  <>
                    <button
                      type="button"
                      className="knop knop-klein knop-secundair knop-gevaar"
                      onClick={() => void verwijder(d.id)}
                    >
                      {t('Ja, verwijder')}
                    </button>
                    <button type="button" className="knop knop-klein knop-ghost" onClick={() => setBevestigId(null)}>
                      {t('Annuleer')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="knop knop-kaal knop-gevaar"
                    aria-label={t('Verwijder document {naam}', { naam: d.naam })}
                    onClick={() => void verwijder(d.id)}
                  >
                    ×
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="label-caps" style={{ margin: 0 }}>
        {t('Nieuw document')}
      </h3>

      {/* ⚠ RONDE 95 — een naam op het `<form>` maakt er een landmark van. Op de
          dossierpagina staan er meerdere onder elkaar; zonder naam heten ze alle
          "formulier". */}
      <form onSubmit={verzend} className="stapel" aria-label={t('Document toevoegen')}>
        <div className="veldrij">
          <div className="veldgroep">
            <label className="label-caps" htmlFor={`${veldId}-naam`}>
              {t('Naam')}
            </label>
            <input id={`${veldId}-naam`} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={tekst.voorbeeld} />
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor={`${veldId}-soort`}>
              {t('Soort')}
            </label>
            <select id={`${veldId}-soort`} value={soort} onChange={(e) => setSoort(e.target.value as Documentsoort)}>
              {DOCUMENTSOORTEN.map((s) => (
                <option key={s} value={s}>
                  {soortNaam(t, s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${veldId}-bestand`}>
            {t('Bestand (foto of PDF)')}
          </label>
          {bestand ? (
            <div className="knoprij">
              {bestand.startsWith('data:image') && (
                <img
                  src={bestand}
                  alt={t('Gekozen bestand')}
                  style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              )}
              {bestandsnaam && <span className="rij-meta">{bestandsnaam}</span>}
              {/* ⚠ RONDE 86 — deze knop droeg `knop-gevaar` en gooit niets weg: ze maakt
                  de bestandskeuze leeg zodat het keuzeveld terugkomt. Je document staat op
                  dat moment nog niet in de kluis. Rood is in deze app de kleur van
                  verwijderen; zie `.knop-terzijde` in index.css. */}
              <button type="button" className="knop knop-ghost knop-klein knop-terzijde" onClick={() => { setBestand(''); setBestandsnaam('') }}>
                {t('Ander bestand kiezen')}
              </button>
            </div>
          ) : (
            <input
              id={`${veldId}-bestand`}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void kiesBestand(f)
                e.target.value = ''
              }}
            />
          )}
          {bezig && <span className="rij-meta">{t('bezig…')}</span>}
        </div>

        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${veldId}-notitie`}>
            {t('Notitie (optioneel)')}
          </label>
          <input id={`${veldId}-notitie`} value={notitie} onChange={(e) => setNotitie(e.target.value)} />
        </div>

        {fout && (
          <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left', color: 'var(--negative)' }}>
            {fout}
          </p>
        )}

        <div className="knoprij">
          {/* Secundair sinds ronde 47: DESIGN.md staat hoogstens één gevulde knop
              per scherm toe, en op Dossiers is "Kost toevoegen" de handeling waar
              je voor komt. Twee gevulde knoppen naast elkaar zeggen allebei "begin
              hier" en dan zegt geen van beide nog iets. */}
          <button
            type="submit"
            aria-disabled={!geldig}
            aria-describedby={geldig ? undefined : redenId}
            className="knop knop-secundair"
          >
            {t('Document toevoegen')}
          </button>
        </div>

        {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
            `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
            sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
            knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
            hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
        <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {geldig ? '' : t('Geef een naam en kies een bestand om op te slaan.')}
        </p>
      </form>
    </>
  )

  // Ingeklapt: enkel een knop in de rij, die de kluis openvouwt.
  if (inklapbaar) {
    return (
      <div className="stapel" style={{ gap: 8 }}>
        <div>
          <button type="button" className="knop knop-ghost knop-klein" onClick={() => setOpen((v) => !v)}>
            {open
              ? t('Documenten verbergen')
              : gesorteerd.length > 0
                ? t('Documenten ({n})', { n: gesorteerd.length })
                : t('Documenten')}
          </button>
        </div>
        {/* Ingesprongen met een randje links, zodat duidelijk is dat deze
            documenten bij déze regel horen en niet bij de lijst eronder. */}
        {open && (
          <div className="stapel" style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
            {inhoud}
          </div>
        )}
      </div>
    )
  }

  return (
    <Kaart titel={t('Documentkluis')} bijschrift={tekst.bijschrift}>
      {inhoud}
    </Kaart>
  )
}
