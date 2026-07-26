import { useState } from 'react'
import type { FormEvent } from 'react'
import { DOCUMENTSOORTEN } from '../data/schema'
import type { DossierDocument, Documentsoort } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { vandaag } from '../utils/datum'
import { Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'

// Boven deze grens weigeren we het bestand: een data-URL van meer dan ~4 MB maakt
// de lokale database én de back-up onnodig zwaar. Beter meteen zeggen dat de scan
// kleiner moet, dan stil een trage app veroorzaken.
const MAX_BESTAND = 4_000_000

// De weergavenaam van een documentsoort. De opgeslagen sleutel ('overeenkomst',
// 'attest', …) blijft taal-onafhankelijk; alleen wat je ziet wordt vertaald.
function soortNaam(t: Vertaler, soort: Documentsoort): string {
  switch (soort) {
    case 'overeenkomst':
      return t('Overeenkomst')
    case 'attest':
      return t('Attest')
    case 'bon':
      return t('Bon')
    case 'vonnis':
      return t('Vonnis')
    default:
      return t('Ander')
  }
}

// De documentkluis binnen één dossier: de ouderschapsovereenkomst, schoolattesten,
// bonnen en een vonnis op één plek, zodat je ze niet meer moet zoeken in je mailbox.
// De bestanden zelf blijven lokaal (als data-URL) en gaan gewoon mee in de back-up.
export function DossierKluis({
  dossierId,
  documenten,
  onOpslaan,
  onVerwijderen,
}: {
  dossierId: string
  // Alle documenten van de app; deze component filtert zelf op dossierId.
  documenten: DossierDocument[]
  onOpslaan: (d: DossierDocument) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [naam, setNaam] = useState('')
  const [soort, setSoort] = useState<Documentsoort>('overeenkomst')
  const [notitie, setNotitie] = useState('')
  const [bestand, setBestand] = useState('')
  const [bestandsnaam, setBestandsnaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  // De rij waarvoor "weet je het zeker?" openstaat; een tweede klik verwijdert echt.
  const [bevestigId, setBevestigId] = useState<string | null>(null)

  const eigen = documenten.filter((d) => d.dossierId === dossierId)
  // Nieuwste eerst.
  const gesorteerd = [...eigen].sort((a, b) => (a.toegevoegdOp < b.toegevoegdOp ? 1 : a.toegevoegdOp > b.toegevoegdOp ? -1 : 0))

  const geldig = naam.trim().length > 0 && bestand.length > 0

  function leegmaken() {
    setNaam('')
    setSoort('overeenkomst')
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
      id: nieuwId(),
      dossierId,
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
    setBevestigId(null)
    await onVerwijderen(id)
  }

  return (
    <Kaart
      titel={t('Documentkluis')}
      bijschrift={t('Bewaar de ouderschapsovereenkomst, attesten, bonnen en het vonnis van dit dossier op één plek.')}
    >
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
                <span className="rij-titel">{d.naam}</span>
                <span className="rij-meta">
                  <span className="badge badge-neutraal">{soortNaam(t, d.soort)}</span> {d.toegevoegdOp}
                  {d.notitie && <> · {d.notitie}</>}
                </span>
              </div>
              <span className="rij-acties">
                <a href={d.bestand} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  {t('Openen')}
                </a>
                <a href={d.bestand} download={d.bestandsnaam || d.naam} style={{ fontSize: 13 }}>
                  {t('Bewaren')}
                </a>
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

      <form onSubmit={verzend} className="stapel">
        <div className="veldrij">
          <div className="veldgroep">
            <label className="label-caps" htmlFor="kluis-naam">
              {t('Naam')}
            </label>
            <input id="kluis-naam" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t('bv. Ouderschapsovereenkomst 2026')} />
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor="kluis-soort">
              {t('Soort')}
            </label>
            <select id="kluis-soort" value={soort} onChange={(e) => setSoort(e.target.value as Documentsoort)}>
              {DOCUMENTSOORTEN.map((s) => (
                <option key={s} value={s}>
                  {soortNaam(t, s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="veldgroep">
          <label className="label-caps" htmlFor="kluis-bestand">
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
              <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => { setBestand(''); setBestandsnaam('') }}>
                {t('Ander bestand kiezen')}
              </button>
            </div>
          ) : (
            <input
              id="kluis-bestand"
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
          <label className="label-caps" htmlFor="kluis-notitie">
            {t('Notitie (optioneel)')}
          </label>
          <input id="kluis-notitie" value={notitie} onChange={(e) => setNotitie(e.target.value)} />
        </div>

        {fout && (
          <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left', color: 'var(--negative)' }}>
            {fout}
          </p>
        )}

        <div className="knoprij">
          <button type="submit" disabled={!geldig} className="knop knop-primair">
            {t('Document toevoegen')}
          </button>
        </div>

        {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
        {!geldig && (
          <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
            {t('Geef een naam en kies een bestand om op te slaan.')}
          </p>
        )}
      </form>
    </Kaart>
  )
}
