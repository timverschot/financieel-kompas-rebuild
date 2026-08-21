import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { GEZINSROLLEN, type Gezinsrol, type Kind } from '../data/schema'
import { ROL_SLEUTELS } from '../utils/persoon'
import { Kaart, Leeg } from '../ui/basis'
import { Dialoog } from '../ui/Dialoog'
import { useT } from '../i18n'

// Beheer van de globale lijst gezinsleden (kinderen, partner, jezelf, iemand
// anders). Deze leden zijn herbruikbaar: je kan er gedeelde kosten, spaardoelen,
// leningen, garanties en transacties aan koppelen.
//
// De bestandsnaam en het type blijven bewust "Kind(eren)" heten: dat is de naam
// die in élke bestaande logregel en back-up staat. Enkel wat de gebruiker ziet,
// spreekt van gezinsleden.
//
// ARCHIVEREN i.p.v. verwijderen is de zachte weg. Verwijder je een lid, dan
// blijven zijn id's in bestaande gedeelde kosten staan en verdwijnt zijn naam
// stil uit de afrekening. Archiveren haalt hem enkel uit de keuzelijsten; overal
// waar hij al gebruikt werd, blijft zijn naam gewoon staan.
export function KinderenSectie({
  kinderen,
  onToevoegen,
  onWijzigen,
  onVerwijderen,
  telGebruik,
}: {
  kinderen: Kind[]
  onToevoegen: (naam: string, rol?: Gezinsrol) => void
  onWijzigen: (lid: Kind) => void
  onVerwijderen: (id: string) => void
  // Wat hangt er nog aan dit lid? Optioneel, zodat de kaart ook zonder de rest
  // van de app te renderen is; ontbreekt ze, dan vraagt het venster gewoon
  // zonder telling.
  telGebruik?: (id: string) => string[]
}) {
  const { t } = useT()
  const [nieuw, setNieuw] = useState('')
  const [nieuweRol, setNieuweRol] = useState<Gezinsrol>('kind')
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [bewerkRol, setBewerkRol] = useState<Gezinsrol>('kind')
  // Ronde 65: het kruisje wist niet langer meteen. Het opent een venster dat toont
  // waar dit lid nog aan hangt, en dat naar archiveren wijst.
  //
  // ⚠ Een ID en geen KOPIE: zo werkt "Liever archiveren" op het lid zoals het NU is
  // (een naamswijziging die van een ander toestel binnenkwam wordt niet stil
  // teruggedraaid), en sluit het venster vanzelf wanneer het lid intussen weg is.
  const [lidWegId, setLidWegId] = useState<string | null>(null)
  const lidWeg = kinderen.find((k) => k.id === lidWegId) ?? null

  const actief = kinderen.filter((k) => !k.gearchiveerd)
  const gearchiveerd = kinderen.filter((k) => k.gearchiveerd)

  // De id van de regel die zegt wat er nog ontbreekt (ronde 61).
  const redenId = useId()

  function voegToe(e: FormEvent) {
    e.preventDefault()
    if (!nieuw.trim()) return
    onToevoegen(nieuw.trim(), nieuweRol)
    setNieuw('')
    setNieuweRol('kind')
  }

  function startBewerken(lid: Kind) {
    setBewerkId(lid.id)
    setBewerkTekst(lid.naam)
    setBewerkRol(lid.rol ?? 'kind')
  }

  function bewaarBewerking(lid: Kind) {
    // Een lege naam zou het lid onvindbaar maken; dan bewaren we niets.
    if (bewerkTekst.trim()) onWijzigen({ ...lid, naam: bewerkTekst.trim(), rol: bewerkRol })
    setBewerkId(null)
    setBewerkTekst('')
  }

  // Archiveren en heropenen zijn dezelfde wijziging, alleen andersom.
  function zetArchief(lid: Kind, archiveer: boolean) {
    onWijzigen({ ...lid, gearchiveerd: archiveer })
  }

  function rolKeuze(waarde: Gezinsrol, zet: (r: Gezinsrol) => void, label: string) {
    return (
      <select aria-label={label} value={waarde} onChange={(e) => zet(e.target.value as Gezinsrol)}>
        {GEZINSROLLEN.map((r) => (
          <option key={r} value={r}>
            {t(ROL_SLEUTELS[r])}
          </option>
        ))}
      </select>
    )
  }

  function rij(k: Kind) {
    const isArchief = Boolean(k.gearchiveerd)
    return (
      <li key={k.id} className="rij" style={{ opacity: isArchief ? 0.55 : 1 }}>
        {bewerkId === k.id ? (
          <>
            <input
              aria-label={t('Nieuwe naam voor {naam}', { naam: k.naam })}
              style={{ flex: 1, minWidth: 0 }}
              value={bewerkTekst}
              onChange={(e) => setBewerkTekst(e.target.value)}
            />
            {rolKeuze(bewerkRol, setBewerkRol, t('Rol van {naam}', { naam: k.naam }))}
            <span className="rij-acties">
              <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarBewerking(k)}>
                {t('Bewaar')}
              </button>
              <button type="button" className="knop knop-kaal" onClick={() => setBewerkId(null)}>
                ×
              </button>
            </span>
          </>
        ) : (
          <>
            <span className="rij-midden">
              <span className="rij-titel">{k.naam}</span>
              {isArchief && <span className="rij-meta">{t('gearchiveerd')}</span>}
            </span>
            {k.rol && <span className="badge badge-neutraal">{t(ROL_SLEUTELS[k.rol])}</span>}
            <span className="rij-acties">
              <button
                type="button"
                className="knop knop-kaal"
                aria-label={t('Wijzig gezinslid {naam}', { naam: k.naam })}
                onClick={() => startBewerken(k)}
              >
                ✎
              </button>
              {/* `knop-kaal` is de vorm voor een ICOON: vast 44 x 44 px. Een woord
                  van negen letters werd daarin afgekapt. Een tekstknop hoort
                  `knop-ghost knop-klein` te zijn, die met de tekst meegroeit en
                  onder een grove aanwijzer ook 44 px hoog wordt (ronde 47). */}
              <button
                type="button"
                className="knop knop-ghost knop-klein"
                aria-label={
                  isArchief
                    ? t('Heropen gezinslid {naam}', { naam: k.naam })
                    : t('Archiveer gezinslid {naam}', { naam: k.naam })
                }
                onClick={() => zetArchief(k, !isArchief)}
              >
                {isArchief ? t('heropen') : t('archiveer')}
              </button>
              <button
                type="button"
                className="knop knop-kaal knop-gevaar"
                aria-label={t('Verwijder gezinslid {naam}', { naam: k.naam })}
                onClick={() => setLidWegId(k.id)}
              >
                ×
              </button>
            </span>
          </>
        )}
      </li>
    )
  }

  return (
    <Kaart
      titel={t('Gezinsleden')}
      bijschrift={t('Stel je gezinsleden één keer in; je kan er kosten, doelen, leningen en garanties aan koppelen.')}
    >
      {kinderen.length === 0 && <Leeg>{t('Nog geen gezinsleden ingesteld.')}</Leeg>}

      {actief.length > 0 && <ul className="lijst">{actief.map(rij)}</ul>}

      {gearchiveerd.length > 0 && (
        <>
          <p className="label-caps" style={{ margin: '4px 0 0' }}>
            {t('Gearchiveerd')}
          </p>
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Gearchiveerde gezinsleden verdwijnen uit de keuzelijsten, maar hun naam blijft staan waar ze al gebruikt zijn.')}
          </p>
          <ul className="lijst">{gearchiveerd.map(rij)}</ul>
        </>
      )}

      <form onSubmit={voegToe} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          aria-label={t('Naam gezinslid')}
          style={{ flex: 1, minWidth: 140 }}
          placeholder={t('Naam gezinslid')}
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
        />
        {rolKeuze(nieuweRol, setNieuweRol, t('Rol'))}
        <button
          type="submit"
          className="knop knop-secundair"
          aria-disabled={!nieuw.trim()}
          aria-describedby={nieuw.trim() ? undefined : redenId}
        >
          {t('Gezinslid toevoegen')}
        </button>
        {/* ⚠ Hier stond niets (ronde 61): de knop lag uit en er stond nergens waarom.
            Met een toetsenbord kwam je hem bovendien niet eens tegen. */}
        <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left', width: '100%' }}>
          {nieuw.trim() ? '' : t('Geef een naam om op te slaan.')}
        </p>
      </form>

      {/* De vraag vóór het verwijderen (ronde 65). Ze telt waar het lid nog aan
          hangt, en zet de zachte weg — archiveren — als eerste keuze. Verwijderen
          laat immers ruwe id's achter in kosten en afrekeningen; archiveren laat
          alles staan en haalt het lid enkel uit de keuzelijsten. */}
      <Dialoog
        titel={lidWeg ? t('{naam} verwijderen?', { naam: lidWeg.naam }) : t('Gezinslid verwijderen?')}
        open={lidWeg !== null}
        onSluiten={() => setLidWegId(null)}
        voet={
          <div className="knoprij">
            <button type="button" className="knop knop-secundair" onClick={() => setLidWegId(null)}>
              {t('Nee, behouden')}
            </button>
            {/* Alleen zinvol voor een lid dat nog NIET gearchiveerd is; anders is
                het een knop die zichtbaar niets doet. */}
            {!lidWeg?.gearchiveerd && (
              <button
                type="button"
                className="knop knop-secundair"
                onClick={() => {
                  const doel = lidWeg
                  setLidWegId(null)
                  if (doel) zetArchief(doel, true)
                }}
              >
                {t('Liever archiveren')}
              </button>
            )}
            <button
              type="button"
              className="knop knop-secundair knop-gevaar"
              onClick={() => {
                const doel = lidWegId
                setLidWegId(null)
                if (doel) onVerwijderen(doel)
              }}
            >
              {t('Ja, verwijder')}
            </button>
          </div>
        }
      >
        {lidWeg && (
          <div className="stapel" style={{ gap: 10 }}>
            {/* ⚠ Zonder telfunctie mag hier geen "wordt nergens gebruikt" staan: dat
                is een bewering, en de kaart weet het dan niet. Niet weten en niets
                vinden zijn twee verschillende dingen, en juist in dít venster is het
                verschil de hele reden van bestaan. */}
            {(() => {
              if (!telGebruik) {
                return <p style={{ margin: 0 }}>{t('De app kan hier niet nakijken waar deze naam nog gebruikt wordt.')}</p>
              }
              const regels = telGebruik(lidWeg.id)
              // ⚠ De kop wisselt mee. Stond hij vast, dan las het scherm bij een net
              // toegevoegd lid: "Deze naam wordt nu nog gebruikt in: • Dit gezinslid
              // wordt nergens gebruikt."
              if (regels.length === 0) {
                return <p style={{ margin: 0 }}>{t('Dit gezinslid wordt nergens gebruikt.')}</p>
              }
              return (
                <>
                  <p style={{ margin: 0 }}>{t('Deze naam wordt nu nog gebruikt in:')}</p>
                  <ul className="lijst">
                    {regels.map((regel) => (
                      <li key={regel} className="rij">
                        <span className="rij-midden">
                          <span className="rij-titel">{regel}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )
            })()}
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Verwijder je het lid, dan blijft het overal waar het al gebruikt is als naamloze verwijzing staan. Archiveren haalt het alleen uit de keuzelijsten en laat elke naam staan.')}
            </p>
          </div>
        )}
      </Dialoog>
    </Kaart>
  )
}
