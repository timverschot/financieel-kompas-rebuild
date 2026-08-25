import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dossier, GedeeldeKost, Kind } from '../data/schema'
import type { EigenCategorie } from '../data/categorieen/resolve'
import {
  bouwUitwisselBestand,
  leesUitwisselBestand,
  vergelijkMetDossier,
  naarEigenKost,
  metWijziging,
  metReactie,
  metIntrekking,
  zonderIntrekking,
  metKoppeling,
  reactieVervallen,
  uitwisselBestandsnaam,
  type UitwisselBestand,
  type Uitwisseloverzicht,
  type Vergelijking,
} from '../utils/uitwisseling'
import { kostIdsInOpenAfrekening } from '../utils/afrekening'
import { downloadTekst, veiligeBestandsnaam } from '../utils/download'
import { leesTekstbestand } from '../utils/csv'
import { nieuwId } from '../data/sync/id'
import { formatEuro } from '../utils/format'
import { dagJaar, vandaag } from '../utils/datum'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// "Uitwisselen met de andere ouder" (ronde 44).
//
// Alles wat met het uitwisselbestand te maken heeft staat in één kaart, in de
// volgorde waarin je het doet: doorsturen, inlezen, antwoorden. Drie losse plekken
// zou betekenen dat je moet onthouden waar je in de heen-en-weer zat.
//
// De kaart is ingeklapt. Wie alleen zijn eigen kosten bijhoudt heeft ze nooit
// nodig, en dan hoort ze niet elke keer mee te scrollen.

export function UitwisselingKaart({
  dossier,
  dossiers,
  kosten,
  verrekeningen,
  kinderen,
  categorieen,
  onKostenBewaren,
  vandaagISO = vandaag(),
}: {
  dossier: Dossier
  dossiers: Dossier[]
  kosten: GedeeldeKost[]
  verrekeningen: { dossierId: string; overgemaakt?: boolean; kostIds?: string[] }[]
  kinderen: Kind[]
  categorieen: EigenCategorie[]
  /** Schrijft een reeks kosten in één blok weg (alles of niets). */
  onKostenBewaren: (kosten: GedeeldeKost[]) => Promise<void>
  vandaagISO?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [ookVanPartner, setOokVanPartner] = useState(false)
  const [metBonnen, setMetBonnen] = useState(false)
  const [melding, setMelding] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  // Het verborgen bestandsveld dat de knop hieronder aanklikt (ronde 68).
  const bestandsveld = useRef<HTMLInputElement | null>(null)
  const [ontvangen, setOntvangen] = useState<UitwisselBestand | null>(null)
  const [overgeslagen, setOvergeslagen] = useState(0)
  const [gekozen, setGekozen] = useState<Set<string>>(new Set())
  const [redenen, setRedenen] = useState<Record<string, string>>({})
  // Vermoedelijke dubbels die je als DEZELFDE kost verklaart in plaats van er een
  // tweede bij te zetten. Zonder deze mogelijkheid komt zo'n rij elke ronde
  // opnieuw als dubbel terug en is er geen manier om te zeggen dat het klopt.
  const [gekoppeld, setGekoppeld] = useState<Set<string>>(new Set())

  // Van dossier wisselen terwijl er een voorstel openstaat, zou het bestand in
  // het VERKEERDE dossier inlezen: het voorstel bleef staan, maar 'dossier.id'
  // wees intussen ergens anders heen.
  useEffect(() => {
    setOntvangen(null)
    setGekozen(new Set())
    setGekoppeld(new Set())
    setRedenen({})
    setMelding('')
    setFout('')
  }, [dossier.id])

  const eigenKosten = useMemo(() => kosten.filter((k) => k.dossierId === dossier.id), [kosten, dossier.id])

  // Wat er bij het exporteren zou meegaan. We rekenen dit ook wanneer de kaart
  // dicht is: het is één regel samenvatting, en dat is precies wat je wil weten.
  const teSturen = useMemo(
    () => bouwUitwisselBestand(dossier, kosten, kinderen, categorieen, vandaagISO, { ookVanPartner, metBonnen }),
    [dossier, kosten, kinderen, categorieen, vandaagISO, ookVanPartner, metBonnen],
  )

  const vastgelegd = useMemo(
    () => kostIdsInOpenAfrekening(verrekeningen as never[], dossier.id),
    [verrekeningen, dossier.id],
  )

  const overzicht: Uitwisseloverzicht | null = useMemo(() => {
    if (!ontvangen) return null
    return vergelijkMetDossier(ontvangen, dossier, kosten, vastgelegd, (id) => dossiers.find((d) => d.id === id)?.naam)
  }, [ontvangen, dossier, kosten, vastgelegd, dossiers])

  // Kosten die je van de andere ouder kreeg en waarop je nog kan antwoorden.
  const teBeantwoorden = useMemo(
    () => eigenKosten.filter((k) => k.uitwisselId && !k.ingetrokken && (!k.reactie || reactieVervallen(k))),
    [eigenKosten],
  )
  const beantwoord = useMemo(
    () => eigenKosten.filter((k) => k.uitwisselId && k.reactie && !reactieVervallen(k)),
    [eigenKosten],
  )
  // Antwoorden die JIJ terugkreeg op je eigen kosten.
  const gekregenReacties = useMemo(
    () => eigenKosten.filter((k) => !k.uitwisselId && k.reactie && !reactieVervallen(k)),
    [eigenKosten],
  )
  const betwistDoorAnder = gekregenReacties.filter((k) => k.reactie?.soort === 'betwist')
  // Kosten die ingetrokken zijn. Ze staan hier zodat ze niet spoorloos uit het
  // dossier verdwijnen: uit isOpenKost vallen betekent uit de lijst en uit het
  // saldo vallen, en dan is geld weg zonder dat je ziet waarheen.
  const ingetrokkenKosten = useMemo(() => eigenKosten.filter((k) => k.ingetrokken), [eigenKosten])

  function exporteer() {
    setFout('')
    try {
      const naam = uitwisselBestandsnaam(dossier.naam, vandaagISO, veiligeBestandsnaam)
      downloadTekst(naam, JSON.stringify(teSturen.bestand, null, 2), 'application/json')
      const aantal = teSturen.bestand.kosten.length
      setMelding(
        teSturen.bonnenOvergeslagen > 0
          ? t('{naam} klaargezet: {n} kost(en). {b} bon(nen) waren te groot om mee te sturen.', {
              naam,
              n: aantal,
              b: teSturen.bonnenOvergeslagen,
            })
          : t('{naam} klaargezet: {n} kost(en).', { naam, n: aantal }),
      )
    } catch {
      setFout(t('Het bestand kon niet klaargezet worden.'))
    }
  }

  async function kiesBestand(bestand: File) {
    setFout('')
    setMelding('')
    setOntvangen(null)
    let tekst: string
    try {
      // Bewust via de eigen lezer en niet via bestand.text(): die valt terug op
      // Windows-1252 wanneer het bestand geen geldige UTF-8 is, en haalt een BOM
      // weg. Een bestand dat door een mailprogramma is gegaan heeft dat nodig.
      tekst = await leesTekstbestand(bestand)
    } catch {
      setFout(t('Het bestand kon niet gelezen worden.'))
      return
    }
    const uit = leesUitwisselBestand(tekst)
    if (!uit.ok) {
      setFout(
        uit.fout === 'nieuwere-versie'
          ? t('Dit bestand komt van een nieuwere versie van de app. Werk eerst bij.')
          : uit.fout === 'oudere-versie'
            ? t('Dit bestand komt van een oudere versie van de app. De bedragen erin zijn niet betrouwbaar te lezen; vraag de andere ouder om een nieuw bestand.')
            : uit.fout === 'te-groot'
            ? t('Dit bestand is te groot om in te lezen.')
            : t('Dit is geen uitwisselbestand van Financieel Kompas.'),
      )
      return
    }
    setOntvangen(uit.bestand)
    setOvergeslagen(uit.overgeslagen)
    // Alles wat veilig over te nemen is, staat vooraf aan. Een vermoedelijke
    // dubbel niet: die kies je bewust, want hem overnemen telt het geld twee keer.
    const vergelijking = vergelijkMetDossier(uit.bestand, dossier, kosten, vastgelegd, () => undefined)
    setGekoppeld(new Set())
    setGekozen(
      new Set(
        vergelijking.vergelijkingen
          .filter((v) => {
            if (v.anderDossier) return false
            if (v.oordeel === 'nieuw') return true
            // Een WIJZIGING alleen voorvinken op een kost die van de andere ouder
            // komt of die zij betaalde. Over een kost die jij betaalde en waarvan
            // jij de bon hebt, is zij niet de bron van waarheid — dan zou een
            // bestand jouw bedrag van EUR 400 stil op EUR 1 kunnen zetten.
            if (v.oordeel === 'gewijzigd' && v.eigen) {
              return !!v.eigen.uitwisselId || v.eigen.betaaldDoor === 'partner'
            }
            return false
          })
          .map((v) => v.kost.id),
      ),
    )
  }

  async function neemOver() {
    if (!overzicht || !ontvangen) return
    setBezig(true)
    setFout('')
    try {
      // Per kost ÉÉN eindtoestand. Het logboek is last-writer-wins per id: schreven
      // we een wijziging en daarna een antwoord allebei vanaf de oorspronkelijke
      // kost, dan gooide de tweede het werk van de eerste weg — het scherm beloofde
      // EUR 50 en in de database stond EUR 40.
      const perId = new Map<string, GedeeldeKost>()
      const nu = (k: GedeeldeKost) => perId.get(k.id) ?? k

      for (const v of overzicht.vergelijkingen) {
        if (v.oordeel === 'vast' || v.anderDossier) continue
        if (gekoppeld.has(v.kost.id) && v.eigen) {
          perId.set(v.eigen.id, metKoppeling(nu(v.eigen), v.kost))
          continue
        }
        if (!gekozen.has(v.kost.id)) continue
        if (v.oordeel === 'gewijzigd' && v.eigen) perId.set(v.eigen.id, metWijziging(nu(v.eigen), v.kost))
        else if (v.oordeel === 'nieuw' || v.oordeel === 'dubbel') {
          const nieuweKost = naarEigenKost(v.kost, dossier.id, kinderen, nieuwId())
          perId.set(nieuweKost.id, nieuweKost)
        }
      }
      // Antwoorden en intrekkingen gaan altijd mee: dat zijn geen keuzes van jou
      // maar berichten van de andere ouder. Ze verzwijgen zou het document dat je
      // straks uitdraait onvolledig maken.
      for (const { reactie, eigen } of overzicht.reacties) perId.set(eigen.id, metReactie(nu(eigen), reactie))
      for (const k of overzicht.ingetrokken) perId.set(k.id, metIntrekking(nu(k)))

      const teBewaren = [...perId.values()]
      if (teBewaren.length === 0) {
        setMelding(t('Er viel niets over te nemen.'))
      } else {
        await onKostenBewaren(teBewaren)
        setMelding(t('{n} kost(en) bijgewerkt of toegevoegd.', { n: teBewaren.length }))
      }
      setOntvangen(null)
      setGekozen(new Set())
      setGekoppeld(new Set())
    } catch {
      setFout(t('Het overnemen is niet gelukt. Er is niets gewijzigd.'))
    } finally {
      setBezig(false)
    }
  }

  // Een kost intrekken, of die intrekking terugdraaien. Intrekken is wat je doet
  // in plaats van verwijderen: verwijder je een kost die je al doorstuurde, dan
  // krijgt de andere ouder daar nooit een signaal van en blijft ze bij hem in het
  // saldo staan. Een intrekking reist wél mee.
  async function zetIntrekking(kost: GedeeldeKost, aan: boolean) {
    setFout('')
    try {
      await onKostenBewaren([aan ? metIntrekking(kost) : zonderIntrekking(kost)])
      setMelding(
        aan
          ? t('Ingetrokken. Stuur het bestand door zodat de andere ouder het ziet.')
          : t('De intrekking is teruggedraaid.'),
      )
    } catch {
      setFout(t('Je antwoord kon niet bewaard worden.'))
    }
  }

  async function antwoord(kost: GedeeldeKost, soort: 'akkoord' | 'betwist') {
    setFout('')
    try {
      const reden = (redenen[kost.id] ?? '').trim()
      await onKostenBewaren([
        metReactie(kost, {
          uitwisselId: kost.uitwisselId!,
          soort,
          op: vandaagISO.slice(0, 10),
          ...(soort === 'betwist' && reden ? { reden } : {}),
        }),
      ])
      setMelding(
        soort === 'akkoord'
          ? t('Genoteerd als akkoord. Stuur het bestand door zodat de andere ouder het ziet.')
          : t('Genoteerd als betwist. Stuur het bestand door zodat de andere ouder het ziet.'),
      )
    } catch {
      setFout(t('Je antwoord kon niet bewaard worden.'))
    }
  }

  return (
    <Kaart
      titel={t('Uitwisselen met de andere ouder')}
      bijschrift={samenvatting()}
      actie={
        <button
          type="button"
          className="knop knop-ghost knop-klein"
          aria-expanded={open}
          onClick={() => setOpen((aan) => !aan)}
        >
          {open ? t('Verberg') : t('Toon')}
        </button>
      }
      data-uitwisseling
    >
      {/* Altijd aanwezig, ook dicht: een schermlezer moet een gelukte handeling
          horen zonder dat het element pas dan verschijnt. */}
      <p className="rij-meta" role="status" style={{ margin: melding ? '6px 0 0' : 0 }}>
        {melding}
      </p>
      {fout && (
        <p className="foutregel" role="alert">
          {fout}
        </p>
      )}

      {open && (
        <div className="stapel">
          {/* ── 1. Doorsturen ───────────────────────────────────────────── */}
          <section>
            <p className="label-caps">{t('1. Doorsturen')}</p>
            <p className="rij-meta" style={{ margin: '0 0 8px' }}>
              {t(
                'Er gaan {n} kost(en) mee, samen {bedrag}. Alleen wat nog niet afgerekend is. Je stuurt het bestand door zoals je een foto doorstuurt; de andere ouder leest het in zijn eigen Financieel Kompas in.',
                { n: teSturen.bestand.kosten.length, bedrag: formatEuro(totaal()) },
              )}
            </p>
            <label className="raak-label" style={{ display: 'block' }}>
              <input type="checkbox" checked={ookVanPartner} onChange={(e) => setOokVanPartner(e.target.checked)} />{' '}
              {t('Ook de kosten meesturen die de andere ouder betaalde')}
            </label>
            <p className="rij-meta" style={{ margin: '0 0 6px 24px' }}>
              {t('Standaard uit: die staan bij hem al, en dan krijgt hij ze van jou terug als vermoedelijke dubbel.')}
            </p>
            <label className="raak-label" style={{ display: 'block' }}>
              <input type="checkbox" checked={metBonnen} onChange={(e) => setMetBonnen(e.target.checked)} />{' '}
              {t('Bonnen meesturen')}
            </label>
            <p className="rij-meta" style={{ margin: '0 0 10px 24px' }}>
              {t('Maakt het bestand een stuk groter. Zonder bonnen blijft het klein genoeg om te mailen.')}
            </p>
            <div className="knoprij">
              <button type="button" className="knop knop-secundair" onClick={exporteer}>
                {t('Bestand klaarzetten')}
              </button>
            </div>
          </section>

          <hr className="scheiding" />

          {/* ── 2. Inlezen ──────────────────────────────────────────────── */}
          <section>
            <p className="label-caps">{t('2. Inlezen wat je kreeg')}</p>
            <p className="rij-meta" style={{ margin: '0 0 8px' }}>
              {t('De app legt het bestand eerst naast dit dossier. Er verandert niets tot je het bevestigt.')}
            </p>
            {/* ⚠ RONDE 68 — HIER STOND EEN `<label>` MET EEN VERBORGEN BESTANDSVELD.
                Dat haalt het veld uit de tabvolgorde én uit de toegankelijkheidsboom,
                en een label is zelf niet focusbaar: met een toetsenbord of een
                schermlezer was deze knop niet te bedienen. Dezelfde ingreep als in
                ronde 63 bij "Herstel uit back-up"; dit was het laatste exemplaar in
                de app. Nu is het een échte knop die het verborgen veld aanklikt. */}
            <button
              type="button"
              className="knop knop-secundair"
              onClick={() => bestandsveld.current?.click()}
            >
              {t('Kies een uitwisselbestand')}
            </button>
            <input
              ref={bestandsveld}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const b = e.target.files?.[0]
                // Leegmaken, anders werkt hetzelfde bestand een tweede keer kiezen niet.
                e.target.value = ''
                if (b) void kiesBestand(b)
              }}
            />

            {overzicht && ontvangen && (
              <Voorstel
                bestand={ontvangen}
                overzicht={overzicht}
                overgeslagen={overgeslagen}
                gekozen={gekozen}
                gekoppeld={gekoppeld}
                bezig={bezig}
                onKoppel={(id) =>
                  setGekoppeld((oud) => {
                    const nieuw = new Set(oud)
                    if (nieuw.has(id)) nieuw.delete(id)
                    else nieuw.add(id)
                    return nieuw
                  })
                }
                onWissel={(id) =>
                  setGekozen((oud) => {
                    const nieuw = new Set(oud)
                    if (nieuw.has(id)) nieuw.delete(id)
                    else nieuw.add(id)
                    return nieuw
                  })
                }
                onNeemOver={neemOver}
                onAnnuleer={() => {
                  setOntvangen(null)
                  setGekozen(new Set())
                  setGekoppeld(new Set())
                }}
              />
            )}
          </section>

          <hr className="scheiding" />

          {/* ── 3. Antwoorden ───────────────────────────────────────────── */}
          <section>
            <p className="label-caps">{t('3. Je antwoord')}</p>
            {teBeantwoorden.length === 0 && beantwoord.length === 0 && ingetrokkenKosten.length === 0 ? (
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('Er staan nog geen kosten van de andere ouder in dit dossier.')}
              </p>
            ) : (
              <>
                <p className="rij-meta" style={{ margin: '0 0 8px' }}>
                  {t(
                    'Wat je hier antwoordt, reist mee in het volgende bestand dat je klaarzet. Betwist een kost liever dan hem te verwijderen: verwijder je hem, dan komt hij bij de volgende uitwisseling gewoon terug.',
                  )}
                </p>
                <ul className="lijst">
                  {teBeantwoorden.map((k) => (
                    <li key={k.id} className="rij rij-kost">
                      <div className="rij-midden">
                        <span className="rij-titel">{k.omschrijving}</span>
                        <span className="rij-meta">
                          {formatEuro(k.bedrag)} · {dagJaar(k.datum)}
                        </span>
                        <input
                          type="text"
                          placeholder={t('Reden (alleen bij betwisten)')}
                          value={redenen[k.id] ?? ''}
                          onChange={(e) => setRedenen((r) => ({ ...r, [k.id]: e.target.value }))}
                          aria-label={t('Reden om {naam} te betwisten', { naam: k.omschrijving })}
                        />
                      </div>
                      <div className="rij-acties">
                        <button
                          type="button"
                          className="knop knop-secundair knop-klein"
                          onClick={() => void antwoord(k, 'akkoord')}
                        >
                          {t('Akkoord')}
                        </button>
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          onClick={() => void antwoord(k, 'betwist')}
                        >
                          {t('Betwist')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {beantwoord.length > 0 && (
                  <p className="rij-meta" style={{ margin: '8px 0 0' }}>
                    {t('{n} kost(en) al beantwoord.', { n: beantwoord.length })}
                  </p>
                )}
              </>
            )}

            {/* Kosten van jou waar de andere ouder al op antwoordde. Hier kan je er
                een intrekken: dat is het eerlijke alternatief voor verwijderen. */}
            {gekregenReacties.length > 0 && (
              <>
                <p className="label-caps" style={{ marginTop: 12 }}>
                  {t('Wat de andere ouder van jouw kosten vindt')}
                </p>
                <ul className="lijst">
                  {gekregenReacties.map((k) => (
                    <li key={k.id} className="rij rij-kost">
                      <div className="rij-midden">
                        <span className="rij-titel">{k.omschrijving}</span>
                        <span className="rij-meta">
                          {formatEuro(k.bedrag)} · {dagJaar(k.datum)} ·{' '}
                          {k.reactie?.soort === 'betwist'
                            ? t('betwist door de andere ouder')
                            : t('aanvaard door de andere ouder')}
                          {k.reactie?.reden ? ` — ${k.reactie.reden}` : ''}
                        </span>
                      </div>
                      <div className="rij-acties">
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          onClick={() => void zetIntrekking(k, true)}
                        >
                          {t('Intrekken')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Ingetrokken kosten blijven zichtbaar en zijn terug te draaien. Een
                handeling die geld uit een saldo haalt, mag nooit definitief zijn. */}
            {ingetrokkenKosten.length > 0 && (
              <>
                <p className="label-caps" style={{ marginTop: 12 }}>
                  {t('Ingetrokken')}
                </p>
                <ul className="lijst">
                  {ingetrokkenKosten.map((k) => (
                    <li key={k.id} className="rij rij-kost">
                      <div className="rij-midden">
                        <span className="rij-titel" style={{ textDecoration: 'line-through' }}>
                          {k.omschrijving}
                        </span>
                        <span className="rij-meta">
                          {formatEuro(k.bedrag)} · {dagJaar(k.datum)} · {t('telt niet mee in wat er te verrekenen valt')}
                        </span>
                      </div>
                      <div className="rij-acties">
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          onClick={() => void zetIntrekking(k, false)}
                        >
                          {t('Terugdraaien')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </Kaart>
  )

  function totaal(): number {
    return teSturen.bestand.kosten.reduce((s, k) => s + k.bedrag, 0)
  }

  function samenvatting(): string {
    if (betwistDoorAnder.length > 0) {
      return t('De andere ouder betwist {n} kost(en). {rest}', {
        n: betwistDoorAnder.length,
        rest: t('{k} kost(en) klaar om door te sturen.', { k: teSturen.bestand.kosten.length }),
      })
    }
    if (teBeantwoorden.length > 0) {
      return t('{n} kost(en) van de andere ouder wachten op je antwoord.', { n: teBeantwoorden.length })
    }
    if (teSturen.bestand.kosten.length === 0) {
      return t('Niets om door te sturen: er staan geen open kosten in dit dossier.')
    }
    return t('{n} kost(en) klaar om door te sturen, samen {bedrag}.', {
      n: teSturen.bestand.kosten.length,
      bedrag: formatEuro(totaal()),
    })
  }
}

// ── Het voorstel: wat het bestand met dit dossier zou doen ─────────────────
//
// Nooit inlezen zonder dit scherm. Een uitwisselbestand komt van buiten en kan
// kosten bevatten die je al hebt, kosten die de ander intussen wijzigde, en
// kosten die je zelf ook boekte. Stil overnemen betekent een dubbel saldo.

function Voorstel({
  bestand,
  overzicht,
  overgeslagen,
  gekozen,
  gekoppeld,
  bezig,
  onWissel,
  onKoppel,
  onNeemOver,
  onAnnuleer,
}: {
  bestand: UitwisselBestand
  overzicht: Uitwisseloverzicht
  overgeslagen: number
  gekozen: Set<string>
  gekoppeld: Set<string>
  bezig: boolean
  onWissel: (id: string) => void
  onKoppel: (id: string) => void
  onNeemOver: () => void
  onAnnuleer: () => void
}) {
  const { t } = useT()
  const v = overzicht.vergelijkingen
  const nieuw = v.filter((x) => x.oordeel === 'nieuw')
  const gewijzigd = v.filter((x) => x.oordeel === 'gewijzigd')
  const dubbel = v.filter((x) => x.oordeel === 'dubbel')
  const ongewijzigd = v.filter((x) => x.oordeel === 'ongewijzigd')
  const vast = v.filter((x) => x.oordeel === 'vast')
  const elders = v.filter((x) => x.anderDossier)
  const anderePct = v.filter((x) => x.anderePctDanDossier && (x.oordeel === 'nieuw' || x.oordeel === 'gewijzigd'))
  const verschil =
    typeof overzicht.saldoAfzender === 'number' ? overzicht.saldoJij - overzicht.saldoAfzender : 0

  return (
    <div style={{ marginTop: 12 }}>
      <p className="rij-meta" style={{ margin: '0 0 8px' }}>
        {t('Uit het dossier "{naam}", klaargezet op {datum}.', {
          naam: bestand.dossierNaam,
          datum: dagJaar(bestand.gemaaktOp.slice(0, 10)),
        })}
      </p>

      {/* De twee saldo's naast elkaar. Verschillen ze meer dan een cent, dan is er
          echt iets anders — dan gaat het niet over afronding maar over de inhoud. */}
      {typeof overzicht.saldoAfzender === 'number' && (
        <p className="rij-meta" style={{ margin: '0 0 8px' }}>
          {verschil === 0
            ? t('Over de {n} kost(en) in dit bestand komen jullie allebei op {bedrag} uit. Je eigen kosten zitten er niet in.', {
                n: bestand.kosten.length,
                bedrag: formatEuro(Math.abs(overzicht.saldoJij)),
              })
            : Math.abs(verschil) === 1
              ? t('De andere ouder komt op {hun}, jij op {jouw}. Eén cent verschil, door afronding.', {
                  hun: formatEuro(Math.abs(overzicht.saldoAfzender)),
                  jouw: formatEuro(Math.abs(overzicht.saldoJij)),
                })
              : t('Let op: de andere ouder komt op {hun}, jij op {jouw}.', {
                  hun: formatEuro(Math.abs(overzicht.saldoAfzender)),
                  jouw: formatEuro(Math.abs(overzicht.saldoJij)),
                })}
        </p>
      )}

      <Groep titel={t('Nieuw voor jou')} rijen={nieuw} gekozen={gekozen} onWissel={onWissel} />
      <Groep
        titel={t('Gewijzigd door de andere ouder')}
        rijen={gewijzigd}
        gekozen={gekozen}
        onWissel={onWissel}
        toonOud
      />
      <Groep
        titel={t('Lijkt op een kost die je al hebt')}
        rijen={dubbel}
        gekozen={gekozen}
        gekoppeld={gekoppeld}
        onWissel={onWissel}
        onKoppel={onKoppel}
        toonOud
        waarschuwing={t(
          'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer. Is het dezelfde kost, kies dan "Dit is dezelfde" — anders komt ze elke ronde opnieuw terug.',
        )}
      />

      <ul className="lijst">
        {ongewijzigd.length > 0 && (
          <li className="rij">
            <span className="rij-meta">{t('{n} kost(en) staan er al en zijn ongewijzigd.', { n: ongewijzigd.length })}</span>
          </li>
        )}
        {vast.length > 0 && (
          <li className="rij">
            <span className="rij-meta">
              {t('{n} kost(en) liggen hier vast (afgerekend, ingetrokken of in een afrekening) en blijven zoals ze zijn.', { n: vast.length })}
            </span>
          </li>
        )}
        {elders.length > 0 && (
          <li className="rij">
            <span className="rij-meta">
              {t('{n} kost(en) staan in een ander dossier ({naam}) en worden hier niet nog eens ingelezen.', {
                n: elders.length,
                naam: elders[0].anderDossier ?? '',
              })}
            </span>
          </li>
        )}
        {overzicht.reacties.length > 0 && (
          <li className="rij">
            <span className="rij-meta">
              {t('{n} antwoord(en) op jouw kosten. Die worden altijd overgenomen.', {
                n: overzicht.reacties.length,
              })}
            </span>
          </li>
        )}
        {overzicht.ingetrokken.length > 0 && (
          <li className="rij">
            <span className="rij-meta">
              {t('De andere ouder trekt in: {namen}. Ze blijven staan, maar tellen niet meer mee.', {
                namen: overzicht.ingetrokken.map((k) => k.omschrijving).join(', '),
              })}
            </span>
          </li>
        )}
        {overzicht.reactiesZonderKost > 0 && (
          <li className="rij">
            <span className="rij-meta">
              {t('{n} antwoord(en) horen bij een kost die hier niet (meer) staat.', {
                n: overzicht.reactiesZonderKost,
              })}
            </span>
          </li>
        )}
        {anderePct.length > 0 && (
          <li className="rij">
            <span className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
              {t(
                '{n} kost(en) gebruiken een andere verdeelsleutel dan dit dossier. De app houdt het percentage van de andere ouder aan, zodat jullie hetzelfde bedrag zien.',
                { n: anderePct.length },
              )}
            </span>
          </li>
        )}
        {overgeslagen > 0 && (
          <li className="rij">
            <span className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
              {t('{n} regel(s) in het bestand waren onleesbaar en zijn overgeslagen.', { n: overgeslagen })}
            </span>
          </li>
        )}
      </ul>

      {/* Secundair, om dezelfde reden als "Document toevoegen" in DossierKluis.tsx
          (ronde 47): DESIGN.md staat hoogstens één gevulde knop per SCHERM toe, en op
          Dossiers is dat "Kost toevoegen". Deze kaart verschijnt pas nadat je een
          bestand hebt ingelezen, dus stonden er vanaf dat moment twee gevulde knoppen
          onder elkaar die allebei "begin hier" zeggen. Dat de knop minder opvalt maakt
          hem niet minder vindbaar: hij staat alleen op het scherm wanneer er iets over
          te nemen valt, en hij staat er als eerste. */}
      <div className="knoprij" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="knop knop-secundair"
          aria-disabled={bezig}
          onClick={() => {
            if (bezig) return
            onNeemOver()
          }}
        >
          {t('Neem over')}
        </button>
        <button type="button" className="knop knop-ghost" onClick={onAnnuleer}>
          {t('Annuleer')}
        </button>
      </div>
    </div>
  )
}

function Groep({
  titel,
  rijen,
  gekozen,
  gekoppeld,
  onWissel,
  onKoppel,
  toonOud,
  waarschuwing,
}: {
  titel: string
  rijen: Vergelijking[]
  gekozen: Set<string>
  gekoppeld?: Set<string>
  onWissel: (id: string) => void
  onKoppel?: (id: string) => void
  toonOud?: boolean
  waarschuwing?: string
}) {
  const { t } = useT()
  if (rijen.length === 0) return null
  return (
    <>
      <p className="label-caps" style={{ marginTop: 10 }}>
        {titel} ({rijen.length})
      </p>
      {waarschuwing && (
        <p className="rij-meta" style={{ margin: '0 0 6px', color: 'var(--warn-tekst)' }}>
          {waarschuwing}
        </p>
      )}
      <ul className="lijst">
        {rijen.map((v) => (
          <li key={v.kost.id} className="rij rij-kost">
            <div className="rij-midden">
              <label className="raak-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  className="tx-vinkje"
                  checked={gekozen.has(v.kost.id) && !gekoppeld?.has(v.kost.id)}
                  disabled={!!v.anderDossier || gekoppeld?.has(v.kost.id)}
                  onChange={() => onWissel(v.kost.id)}
                />
                <span className="rij-titel">{v.kost.omschrijving}</span>
              </label>
              <span className="rij-meta">
                {formatEuro(v.kost.bedrag)} · {dagJaar(v.kost.datum)} ·{' '}
                {v.kost.betaaldDoorAfzender ? t('betaald door de andere ouder') : t('betaald door jou')} ·{' '}
                {t('jij {p}%', { p: v.aandeelJij })}
              </span>
              {toonOud && v.eigen && (
                <span className="rij-meta">
                  {t('Bij jou: {bedrag} op {datum}', {
                    bedrag: formatEuro(v.eigen.bedrag),
                    datum: dagJaar(v.eigen.datum),
                  })}
                </span>
              )}
            </div>
            {onKoppel && v.eigen && (
              <div className="rij-acties">
                <button
                  type="button"
                  className={klassenVoorKoppel(gekoppeld?.has(v.kost.id))}
                  aria-pressed={!!gekoppeld?.has(v.kost.id)}
                  onClick={() => onKoppel(v.kost.id)}
                >
                  {gekoppeld?.has(v.kost.id) ? t('Toch niet dezelfde') : t('Dit is dezelfde')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

// Een gekoppelde rij krijgt de secundaire knopvorm, zodat je in één oogopslag ziet
// welke rijen je als dezelfde kost verklaard hebt.
function klassenVoorKoppel(actief: boolean | undefined): string {
  return actief ? 'knop knop-secundair knop-klein' : 'knop knop-ghost knop-klein'
}
