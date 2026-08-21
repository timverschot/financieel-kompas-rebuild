import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { bouwEffectieveBoom } from '../data/categorieen/effectief'
import type { Categorie, Subcategorie } from '../data/schema'
import { Kaart } from '../ui/basis'
import { opVolgorde } from '../utils/categorieVolgorde'
import { useHoofdvolgorde } from '../categorievolgorde'
import { useT } from '../i18n'
import { zoekHoofdcategorieen, zoekItems, zoekMidCategorieen, ZOEK_VANAF } from '../data/categorieen/zoek'

/**
 * Hoeveel treffers we hoogstens uit de zoekindex halen.
 *
 * Ruim genomen: dit is geen suggestielijstje van acht regels maar een filter over
 * de hele boom. Kapte het af op de standaard 25, dan zou "kaas" een deel van de
 * kaassoorten stil weglaten.
 */
const MAX_TREFFERS = 2000

// De uitklapregel van een tak is één kale knop over de volle breedte: zo blijft de
// hele regel aanklikbaar, met het driehoekje links als open/dicht-teken. De maten
// zijn bewust compact — de boom kan honderden items tonen.
const takKnop: CSSProperties = {
  width: '100%',
  height: 'auto',
  justifyContent: 'flex-start',
  textAlign: 'left',
  gap: 10,
  padding: '10px 8px',
  fontSize: 'var(--tekst-m)',
  color: 'var(--text)',
}
const driehoek: CSSProperties = {
  width: 12,
  flexShrink: 0,
  fontSize: 'var(--tekst-s)',
  color: 'var(--text-subtle)',
}

// Het icoon van een hoofdcategorie: groot en in een gekleurd vlakje, zoals in V1.
// Het was een kaal emoji op leesgrootte, en dan is een lijst van veertien takken
// één grijze muur waarin je niets terugvindt. Dit is het herkenningspunt van de
// rij, dus het mag de grootste vorm op de regel zijn.
function hoofdTeken(kleur: string | null): CSSProperties {
  return {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    lineHeight: 1,
    borderRadius: 'var(--radius-sm)',
    background: kleur ? `color-mix(in srgb, ${kleur} 18%, transparent)` : 'var(--accent-soft)',
  }
}
// Compacte bladrij: geen scheidingslijn per item, anders wordt de lijst rumoerig.
const bladRij: CSSProperties = { padding: '4px 8px', gap: 8, borderBottom: 'none' }
const subLijst: CSSProperties = { paddingLeft: 18 }

/**
 * Doorbladerbaar én bewerkbaar overzicht van de categorieboom: vouw open van
 * hoofdcategorie → categorie → items.
 *
 * Sinds ronde 27 kan je op ELK niveau iets toevoegen, ook onder je eigen
 * hoofdcategorieën. Daarvóór was een eigen categorie een losse, vlakke naam
 * waaronder niets kon hangen, terwijl de ingebouwde categorieën wél drie lagen
 * hadden — dus je eigen indeling bleef altijd grover dan de standaard.
 */
export function CategorieBoom({
  aanpassingen,
  eigenCategorieen = [],
  onToevoegen,
  onWijzigen,
  onVerwijderen,
  onCategorieToevoegen,
  onCategorieVerwijderen,
  onVerplaats,
}: {
  aanpassingen: Subcategorie[]
  /** De eigen categorieën: hoofdcategorieën (zonder ouder) én middencategorieën. */
  eigenCategorieen?: Categorie[]
  onToevoegen: (categorieId: string, naam: string) => void
  onWijzigen: (id: string, categorieId: string, naam: string) => void
  onVerwijderen: (id: string) => void
  /** Maakt een eigen MIDDENcategorie onder een hoofdcategorie. */
  onCategorieToevoegen?: (ouderId: string, naam: string) => void
  /** Verwijdert een eigen middencategorie, met alles wat eronder hangt. */
  onCategorieVerwijderen?: (id: string) => void
  /**
   * Zet een hoofdcategorie één plaats omhoog (-1) of omlaag (+1).
   *
   * Alleen HIER kan je de volgorde wijzigen — niet in de invoerpopup. Daar ben je
   * aan het boeken, en dan wil je kiezen, niet inrichten. Zonder deze prop
   * verschijnen de pijltjes gewoon niet.
   */
  onVerplaats?: (id: string, richting: -1 | 1) => void
}) {
  const { t } = useT()
  const zoekVeldId = useId()
  // Dezelfde volgorde als overal elders; ze wordt hieronder ook ingesteld.
  const volgorde = useHoofdvolgorde()
  const volledigeBoom = opVolgorde(bouwEffectieveBoom(aanpassingen, eigenCategorieen), volgorde)
  const [zoek, setZoek] = useState('')
  const [openHoofd, setOpenHoofd] = useState<Set<string>>(new Set())
  const [openCat, setOpenCat] = useState<Set<string>>(new Set())
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [toevoegCatId, setToevoegCatId] = useState<string | null>(null)
  const [toevoegTekst, setToevoegTekst] = useState('')
  // Voor welke hoofdcategorie staat het veld "nieuwe categorie" open?
  const [nieuweCatOnder, setNieuweCatOnder] = useState<string | null>(null)
  const [nieuweCatTekst, setNieuweCatTekst] = useState('')

  /**
   * Zoeken in de boom (ronde 40).
   *
   * Waarom dit er moest komen: dit scherm toont ruim duizend subcategorieën in
   * drie lagen, allemaal dichtgeklapt en zonder één zoekveld — terwijl drie andere
   * schermen er wél een hebben en de zoekindex al bestond. Iets terugvinden was
   * hier letterlijk veertien takken openklikken.
   *
   * Twee bronnen samen, en dat is bewust:
   *  - de gedeelde zoekindex (`zoekHoofdcategorieen`/`zoekMidCategorieen`/
   *    `zoekItems`) levert de SYNONIEMEN mee, zodat "pampers" je bij "Luiers"
   *    brengt;
   *  - de namen in de boom zelf, zodat wat je op dit scherm net hebt toegevoegd
   *    gegarandeerd vindbaar is, ook al is de index nog niet bijgewerkt.
   *
   * En we filteren op ID'S in de echte boom in plaats van de zoekresultaten los te
   * renderen. Anders zouden de bewerkknoppen naast iets staan wat ze niet kunnen
   * wegschrijven.
   */
  const term = zoek.trim().toLowerCase()
  const zoekend = term.length >= ZOEK_VANAF

  const raakt = (naam: string) => naam.toLowerCase().includes(term)

  const gevondenHoofd = new Set<string>()
  const gevondenMid = new Set<string>()
  const gevondenItem = new Set<string>()
  if (zoekend) {
    for (const h of zoekHoofdcategorieen(term, MAX_TREFFERS)) gevondenHoofd.add(h.id)
    for (const m of zoekMidCategorieen(term, MAX_TREFFERS)) gevondenMid.add(m.id)
    for (const i of zoekItems(term, MAX_TREFFERS)) gevondenItem.add(i.id)
  }

  /**
   * Wat er tijdens het zoeken open hoort te staan.
   *
   * Belangrijke nuance: raakt alleen de NAAM van een hoofdcategorie, dan blijft die
   * tak dicht. Twaalf van de veertien ingebouwde hoofdnamen bevatten "en"
   * ("Huishouden en Verzorging", "Woning en vaste lasten", …), dus bij het tweede
   * letterteken van "energie" zouden er in één keer bijna vijfhonderd itemrijen
   * met bewerkknoppen gerenderd worden. Dat hapert merkbaar op een telefoon, en het
   * is ook niet wat je vroeg: je zocht "energie", niet "alles onder Huishouden".
   */
  const zoekOpenHoofd = new Set<string>()
  const zoekOpenCat = new Set<string>()
  let aantalTreffers = 0

  const boom = !zoekend
    ? volledigeBoom
    : volledigeBoom
        .map((h) => {
          const hoofdRaakt = gevondenHoofd.has(h.id) || raakt(h.naam)
          if (hoofdRaakt) aantalTreffers++
          let dieper = 0
          const gefilterd = h.categorieen
            .map((c) => {
              const midRaakt = gevondenMid.has(c.id) || raakt(c.naam)
              if (midRaakt) {
                aantalTreffers++
                dieper++
                return c
              }
              const items = c.items.filter((it) => gevondenItem.has(it.id) || raakt(it.naam))
              if (items.length === 0) return null
              aantalTreffers += items.length
              dieper++
              zoekOpenCat.add(c.id)
              return { ...c, items }
            })
            .filter((c): c is (typeof h.categorieen)[number] => c !== null)
          if (dieper > 0) zoekOpenHoofd.add(h.id)
          if (!hoofdRaakt && dieper === 0) return null
          // Zijn er DIEPERE treffers, dan laten we alleen die staan — ook wanneer de
          // hoofdnaam óók raakt. Anders klapte "Huishouden en Verzorging" bij de term
          // "en" open met al zijn twintig categorieën terwijl er drie treffers waren,
          // en moest je zelf zoeken waar ze zaten. Raakt enkel de hoofdnaam, dan
          // blijft de volledige (dichte) tak staan om in te bladeren.
          return dieper > 0 ? { ...h, categorieen: gefilterd } : h
        })
        .filter((h): h is (typeof volledigeBoom)[number] => h !== null)

  /**
   * Open of dicht.
   *
   * Tijdens het zoeken is de zoekstand het VERTREKPUNT en blijft de knop gewoon
   * werken: `openHoofd` telt dan als "andersom dan de zoekstand". Zonder die
   * omkering zou de tak zeggen dat hij open is (`aria-expanded="true"`), zich niet
   * laten sluiten, en zichtbaar niets doen als je erop duwt.
   */
  const isOpenHoofd = (id: string) => (zoekend ? zoekOpenHoofd.has(id) !== openHoofd.has(id) : openHoofd.has(id))
  const isOpenCat = (id: string) => (zoekend ? zoekOpenCat.has(id) !== openCat.has(id) : openCat.has(id))

  function wissel(set: Set<string>, zet: (s: Set<string>) => void, id: string) {
    const nieuw = new Set(set)
    if (nieuw.has(id)) nieuw.delete(id)
    else nieuw.add(id)
    zet(nieuw)
  }

  function bewaarHernoeming(catId: string) {
    if (bewerkId && bewerkTekst.trim()) onWijzigen(bewerkId, catId, bewerkTekst.trim())
    setBewerkId(null)
    setBewerkTekst('')
  }
  function bewaarToevoeging(catId: string) {
    if (toevoegTekst.trim()) onToevoegen(catId, toevoegTekst.trim())
    setToevoegCatId(null)
    setToevoegTekst('')
  }
  function bewaarNieuweCategorie(ouderId: string) {
    if (nieuweCatTekst.trim()) onCategorieToevoegen?.(ouderId, nieuweCatTekst.trim())
    setNieuweCatOnder(null)
    setNieuweCatTekst('')
  }

  return (
    <Kaart
      titel={t('Alle categorieën')}
      bijschrift={t('Vouw open om te bekijken. Je kan op elk niveau iets toevoegen.')}
    >
      {/* Het zoekveld staat bovenaan, net als "+ categorie" en "+ subcategorie":
          in een lange lijst hoort wat je het vaakst nodig hebt vóór de lijst. */}
      <div className="veldgroep">
        <label className="label-caps" htmlFor={zoekVeldId}>
          {t('Zoeken')}
        </label>
        <input
          id={zoekVeldId}
          type="search"
          value={zoek}
          onChange={(e) => {
            setZoek(e.target.value)
            // Wat je met de hand had open- of dichtgeklapt, gaat mee op de schop.
            // Zonder dit vecht de handmatige stand met de zoekstand: had je Voeding
            // al open staan en typ je dan "eieren", dan hief de ene de andere op en
            // stond de énige tak met de treffer dicht.
            setOpenHoofd(new Set())
            setOpenCat(new Set())
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={t('Zoek een categorie of subcategorie (vanaf {n} letters)…', { n: ZOEK_VANAF })}
        />
        {/* `role="status"` omdat de lijst eronder vanzelf verandert: wie niet ziet
            dat er gefilterd is, denkt dat zijn categorieën verdwenen zijn.
            De regel staat ALTIJD in de DOM en is leeg zolang je niet zoekt — een
            live region die samen met haar tekst verschijnt, wordt door NVDA en
            VoiceOver geregeld overgeslagen. */}
        <p className="rij-meta" style={{ margin: 0 }} role="status">
          {!zoekend
            ? ''
            : boom.length === 0
              ? t('Niets gevonden voor “{term}”', { term: zoek.trim() })
              : t('{n} treffer(s) in {m} hoofdcategorie(ën)', { n: aantalTreffers, m: boom.length })}
        </p>
      </div>

      <ul className="lijst">
        {boom.map((h) => {
          // De pijltjes verplaatsen de hoofdcategorie in de VOLLEDIGE lijst, dus
          // hun plaats komt daar ook vandaan. Zou de index uit de gefilterde lijst
          // komen, dan zou tijdens het zoeken elke tak "de eerste" lijken en het
          // pijltje omhoog stil uitgeschakeld staan.
          const hIndex = volledigeBoom.findIndex((x) => x.id === h.id)
          const hOpen = isOpenHoofd(h.id)
          const aantalItems = h.categorieen.reduce((s, c) => s + c.items.length, 0)
          return (
            <li key={h.id} style={{ borderBottom: '1px solid var(--rij-lijn)', padding: '2px 0' }}>
              {/* De open/dicht-knop en de twee pijltjes staan NAAST elkaar en niet
                  in elkaar: een knop in een knop bestaat niet in HTML. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="knop knop-kaal"
                aria-expanded={hOpen}
                onClick={() => wissel(openHoofd, setOpenHoofd, h.id)}
                style={{ ...takKnop, fontWeight: 600, flex: 1, minWidth: 0 }}
              >
                <span aria-hidden style={driehoek}>
                  {hOpen ? '▾' : '▸'}
                </span>
                <span aria-hidden style={hoofdTeken(h.kleur)}>
                  {h.icoon || h.naam.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="rij-midden">
                  <span className="rij-titel">{h.naam}</span>
                  {/* BEIDE aantallen, zoals in V1: het aantal categorieën zegt hoe
                      fijn de tak vertakt is, het aantal items hoe diep. Alleen dat
                      tweede tonen liet de middenlaag onbenoemd. */}
                  <span className="rij-meta">
                    {t('{c} cat. · {i} items', { c: h.categorieen.length, i: aantalItems })}
                    {h.eigen && <span style={{ color: 'var(--accent-ink)' }}> · {t('eigen')}</span>}
                  </span>
                </span>
              </button>

              {/* Volgorde wijzigen. Bewust twee knoppen en geen slepen: dit werkt
                  identiek met een muis, met een vinger én met het toetsenbord, en
                  het is volledig na te meten in de tests. De eerste kan niet
                  omhoog, de laatste niet omlaag. */}
              {onVerplaats && (
                <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="knop knop-kaal"
                    aria-label={t('Zet {naam} hoger', { naam: h.naam })}
                    disabled={hIndex === 0}
                    onClick={() => onVerplaats(h.id, -1)}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="knop knop-kaal"
                    aria-label={t('Zet {naam} lager', { naam: h.naam })}
                    disabled={hIndex === volledigeBoom.length - 1}
                    onClick={() => onVerplaats(h.id, 1)}
                  >
                    ▼
                  </button>
                </span>
              )}
              </div>

              {hOpen && (
                <ul className="lijst" style={subLijst}>
                  {/* Toevoegen op het MIDDENniveau. Dit ontbrak volledig: onder een
                      eigen hoofdcategorie kon je niets hangen, dus bleef ze een losse
                      naam terwijl de ingebouwde categorieën drie lagen hadden.

                      Sinds ronde 36 staat deze regel BOVENAAN in plaats van onderaan:
                      "Voeding" heeft zesentwintig categorieën, en de knop om er een bij
                      te maken lag daar helemaal onder — je moest er eerst langs scrollen
                      om te vinden wat je zocht. */}
                  {onCategorieToevoegen && (
                    <li className="rij" style={{ ...bladRij, paddingTop: 6, paddingBottom: 6 }}>
                      {nieuweCatOnder === h.id ? (
                        <>
                          <input
                            aria-label={t('Nieuwe categorie in {naam}', { naam: h.naam })}
                            style={{ flex: 1, minWidth: 0 }}
                            value={nieuweCatTekst}
                            onChange={(e) => setNieuweCatTekst(e.target.value)}
                            placeholder={t('Naam categorie')}
                          />
                          <span className="rij-acties">
                            <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarNieuweCategorie(h.id)}>
                              {t('Toevoegen')}
                            </button>
                            <button type="button" className="knop knop-kaal" onClick={() => setNieuweCatOnder(null)}>
                              ×
                            </button>
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          aria-label={t('Voeg categorie toe aan {naam}', { naam: h.naam })}
                          onClick={() => {
                            setNieuweCatOnder(h.id)
                            setNieuweCatTekst('')
                          }}
                        >
                          {t('+ categorie')}
                        </button>
                      )}
                    </li>
                  )}

                  {h.categorieen.map((c) => {
                    const cOpen = isOpenCat(c.id)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="knop knop-kaal"
                          aria-expanded={cOpen}
                          onClick={() => wissel(openCat, setOpenCat, c.id)}
                          style={{ ...takKnop, padding: '6px 8px', fontWeight: 500 }}
                        >
                          <span aria-hidden style={driehoek}>
                            {cOpen ? '▾' : '▸'}
                          </span>
                          <span className="rij-midden">
                            <span style={{ fontSize: 'var(--tekst-sm)' }}>
                              {c.naam}
                              {c.eigen && <span style={{ color: 'var(--accent-ink)' }}> · {t('eigen')}</span>}
                            </span>
                          </span>
                          <span className="rij-meta">{c.items.length}</span>
                        </button>
                        {cOpen && (
                          <ul className="lijst" style={subLijst}>
                            <li className="rij" style={{ ...bladRij, paddingTop: 6, paddingBottom: 6 }}>
                              {toevoegCatId === c.id ? (
                                <>
                                  <input
                                    aria-label={t('Nieuwe subcategorie in {naam}', { naam: c.naam })}
                                    style={{ flex: 1, minWidth: 0 }}
                                    value={toevoegTekst}
                                    onChange={(e) => setToevoegTekst(e.target.value)}
                                    placeholder={t('Naam subcategorie')}
                                  />
                                  <span className="rij-acties">
                                    <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarToevoeging(c.id)}>
                                      {t('Toevoegen')}
                                    </button>
                                    <button type="button" className="knop knop-kaal" onClick={() => setToevoegCatId(null)}>
                                      ×
                                    </button>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="knop knop-ghost knop-klein"
                                    aria-label={t('Voeg subcategorie toe aan {naam}', { naam: c.naam })}
                                    onClick={() => {
                                      setToevoegCatId(c.id)
                                      setToevoegTekst('')
                                    }}
                                  >
                                    {t('+ subcategorie')}
                                  </button>
                                  {/* ⚠ RONDE 65. Hier stond een TWEEDE knop
                                      "Verwijderen", met exact hetzelfde label als
                                      die onderaan de lijst. Ronde 36 verplaatste
                                      hem naar beneden — weg van "+ subcategorie" —
                                      maar haalde het origineel niet weg. Zo stonden
                                      er twee identieke gevaarknoppen bij elke eigen
                                      categorie. Alleen die onderaan blijft. */}
                                </>
                              )}
                            </li>

                            {c.items.map((it) => (
                              <li key={it.id} className="rij" style={bladRij}>
                                {bewerkId === it.id ? (
                                  <>
                                    <input
                                      aria-label={t('Nieuwe naam voor {naam}', { naam: it.naam })}
                                      style={{ flex: 1, minWidth: 0 }}
                                      value={bewerkTekst}
                                      onChange={(e) => setBewerkTekst(e.target.value)}
                                    />
                                    <span className="rij-acties">
                                      <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarHernoeming(c.id)}>
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
                                      <span style={{ fontSize: 'var(--tekst-sm)', color: 'var(--text-muted)' }}>
                                        {it.naam}
                                        {it.eigen && <span style={{ color: 'var(--accent-ink)' }}> · {t('eigen')}</span>}
                                      </span>
                                    </span>
                                    <span className="rij-acties">
                                      <button
                                        type="button"
                                        className="knop knop-kaal"
                                        aria-label={t('Wijzig {naam}', { naam: it.naam })}
                                        onClick={() => {
                                          setBewerkId(it.id)
                                          setBewerkTekst(it.naam)
                                        }}
                                      >
                                        ✎
                                      </button>
                                      {it.eigen && (
                                        <button
                                          type="button"
                                          className="knop knop-kaal knop-gevaar"
                                          aria-label={t('Verwijder {naam}', { naam: it.naam })}
                                          onClick={() => onVerwijderen(it.id)}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}

                            {/* Een eigen middencategorie mag je weer weghalen; een
                                ingebouwde niet — die is de referentie. Deze knop staat
                                bewust ONDERAAN: hij zat op dezelfde regel als
                                "+ subcategorie", en die verhuisde in ronde 36 naar boven.
                                Een onherroepelijke actie hoort niet het eerste te zijn
                                wat je ziet, en al zeker niet pal naast de knop die je
                                het vaakst gebruikt. */}
                            {c.eigen && onCategorieVerwijderen && (
                              <li className="rij" style={{ ...bladRij, paddingTop: 6, paddingBottom: 6 }}>
                                <button
                                  type="button"
                                  className="knop knop-ghost knop-klein knop-gevaar"
                                  aria-label={t('Verwijder categorie {naam}', { naam: c.naam })}
                                  onClick={() => onCategorieVerwijderen(c.id)}
                                >
                                  {t('Verwijderen')}
                                </button>
                              </li>
                            )}
                          </ul>
                        )}
                      </li>
                    )
                  })}

                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </Kaart>
  )
}
