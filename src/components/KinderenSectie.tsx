import { useState } from 'react'
import type { FormEvent } from 'react'
import { GEZINSROLLEN, type Gezinsrol, type Kind } from '../data/schema'
import { ROL_SLEUTELS } from '../utils/persoon'
import { Kaart, Leeg } from '../ui/basis'
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
}: {
  kinderen: Kind[]
  onToevoegen: (naam: string, rol?: Gezinsrol) => void
  onWijzigen: (lid: Kind) => void
  onVerwijderen: (id: string) => void
}) {
  const { t } = useT()
  const [nieuw, setNieuw] = useState('')
  const [nieuweRol, setNieuweRol] = useState<Gezinsrol>('kind')
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [bewerkRol, setBewerkRol] = useState<Gezinsrol>('kind')

  const actief = kinderen.filter((k) => !k.gearchiveerd)
  const gearchiveerd = kinderen.filter((k) => k.gearchiveerd)

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
              <button
                type="button"
                className="knop knop-kaal"
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
                onClick={() => onVerwijderen(k.id)}
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
        <button type="submit" className="knop knop-secundair" disabled={!nieuw.trim()}>
          {t('Gezinslid toevoegen')}
        </button>
      </form>
    </Kaart>
  )
}
