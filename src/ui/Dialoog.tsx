import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'

// Dé popup van de app. Er bestond nog geen enkele: de enige `role="dialog"` in de
// codebase zat hardgecodeerd in de barcodescanner, en de invoer van een transactie
// was een kaart op een pagina waar je eerst naartoe moest navigeren.
//
// Wat een popup écht moet doen om bruikbaar te zijn — en wat een los `div`-je met
// `position: fixed` niet doet:
//  - **Escape sluit.** Altijd, ook wanneer de focus in een invoerveld staat.
//  - **De focus blijft binnen.** Tab loopt rond in de popup in plaats van naar de
//    pagina eronder te ontsnappen, waar je met de tab-toets dingen zou aanklikken
//    die je niet ziet.
//  - **De focus komt terug.** Bij het sluiten gaat hij naar de knop waarmee je de
//    popup opende, zodat je niet bovenaan de pagina belandt.
//  - **De pagina eronder scrollt niet mee.** Anders schuift de achtergrond weg
//    terwijl je in de popup naar beneden veegt.
//  - **Hulpsoftware weet dat de rest weg is.** Vandaar `aria-modal` en een titel
//    die aan de popup hangt.
//
// Vorm: op een breed scherm een gecentreerde kaart, op een telefoon een blad dat
// van onderen komt en de volle breedte neemt — daar is een gecentreerd venstertje
// met marge rondom verspilde ruimte.
// Alles waar de tab-toets normaal op landt.
const FOCUSBAAR =
  'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * De focusbare elementen in tab-volgorde.
 *
 * In een echte browser laten we weggeklapte velden weg — een veld in een gesloten
 * blok mag geen tab-stop zijn. Dat meten we met `getClientRects()`. Maar in de
 * testomgeving (jsdom) doet niets aan layout, dus meet *elk* element als
 * onzichtbaar; daar zou dat filter de hele lijst wegvegen en de focusval stil
 * uitschakelen. Daarom vragen we het paneel eerst of deze omgeving überhaupt
 * layout doet, en filteren we alleen dan.
 */
function focusbareElementen(root: HTMLElement): HTMLElement[] {
  const alle = [...root.querySelectorAll<HTMLElement>(FOCUSBAAR)]
  const doetLayout = root.getClientRects().length > 0 || root.offsetWidth > 0
  if (!doetLayout) return alle
  return alle.filter((el) => el.getClientRects().length > 0)
}

/**
 * Hoeveel hoogte er ECHT nog over is voor de popup, in pixels.
 *
 * Waarom dit nodig is (ronde 34). Op een telefoon neemt het toetsenbord bijna de
 * halve schermhoogte in. Je zou verwachten dat `100dvh` daar rekening mee houdt,
 * maar dat doet het niet: op iOS blijft `dvh` de hoogte van het VENSTER, en het
 * toetsenbord schuift daar gewoon overheen. Het onderste stuk van de popup — met
 * de opslaanknop — verdween daardoor achter het toetsenbord.
 *
 * `window.visualViewport` is het enige dat wél weet wat je nog ziet: het krimpt
 * mee zodra het toetsenbord opengaat en groeit weer wanneer het sluit. We geven
 * die hoogte door als CSS-variabele, zodat de opmaak in index.css blijft staan.
 *
 * Geeft `null` terug wanneer de browser (of de testomgeving) dit niet kent; dan
 * valt de popup terug op haar oude gedrag en is er niets veranderd.
 */
function useZichtbareHoogte(actief: boolean): number | null {
  const [hoogte, setHoogte] = useState<number | null>(null)

  useEffect(() => {
    if (!actief) {
      // Terug op nul bij het sluiten. Zonder dit onthoudt de popup de hoogte van
      // de vórige keer — inclusief het toetsenbord dat toen openstond — en opent
      // ze de volgende keer één beeldje lang half zo hoog.
      setHoogte(null)
      return
    }
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined
    if (!vv) return

    function meet() {
      // `offsetTop` erbij: op iOS schuift het zichtbare venster óók omhoog
      // wanneer het toetsenbord opengaat, en dan is de onderkant van de popup
      // niet waar we ze denken.
      setHoogte(Math.round(vv!.height + vv!.offsetTop))
    }
    meet()
    vv.addEventListener('resize', meet)
    vv.addEventListener('scroll', meet)
    return () => {
      vv.removeEventListener('resize', meet)
      vv.removeEventListener('scroll', meet)
    }
  }, [actief])

  return hoogte
}

/**
 * De popups die op dit moment openstaan, van onder naar boven.
 *
 * Waarom dit op moduleniveau staat (ronde 35): een popup kan in een andere popup
 * zitten. Bekijk je een bon terwijl je een transactie aan het intikken bent, dan
 * staan er twee. Elke popup hing zijn Escape-luisteraar aan `document`, dus één
 * druk op Escape sloot ze ALLEBEI — en dan was je hele boeking weg. En elke popup
 * zette bij het sluiten `body.overflow` terug naar wat zíj bij het openen zag; de
 * binnenste zag 'hidden', dus sloten ze samen, dan kon de pagina daarna niet meer
 * scrollen tot je opnieuw een popup opende.
 *
 * Met deze stapel geldt: alleen de bovenste popup luistert naar Escape, en het
 * scrollslot gaat pas los wanneer de laatste popup dicht is.
 */
type Knoop = { ouder: Knoop | null }
const openePopups: Knoop[] = []

/**
 * Wie is de popup waar je NU in staat? Elke popup geeft zichzelf door, zodat een
 * popup die binnenin getekend wordt weet wie haar ouder is.
 *
 * Waarom niet gewoon kijken wie wie bevat, zoals eerst (ronde 35): sinds elke
 * popup rechtstreeks aan de pagina gehangen wordt (zie de `createPortal` onderaan)
 * staan ze in de HTML naast elkaar in plaats van in elkaar. De familieband moeten
 * we dus zelf bijhouden. Een `useRef`-voorwerp is per popup uniek en blijft
 * bestaan zolang de component leeft; dat is genoeg om ze uit elkaar te houden.
 */
const PopupContext = createContext<Knoop | null>(null)

/** Wat `body.style.overflow` was vóór de eerste popup het scrollen op slot deed. */
let oorspronkelijkeOverflow: string | null = null

function isAfstammeling(kind: Knoop, van: Knoop): boolean {
  for (let k = kind.ouder; k; k = k.ouder) if (k === van) return true
  return false
}

/**
 * Is DEZE popup de bovenste — dus degene die op Escape mag reageren?
 *
 * Twee regels, in deze volgorde:
 *  1. een popup met een open popup ín zich is nooit de bovenste;
 *  2. van wie overblijft, wint de laatst geopende.
 *
 * Regel 1 is er omdat je anders met één druk op Escape ook het formulier eronder
 * sluit — met je halve boeking erin. En bewust niet "de laatst aangemelde wint":
 * React voert de effecten van een KIND uit vóór die van de ouder, dus de binnenste
 * popup meldt zich als eerste aan. Regel 2 vangt het geval van twee popups die
 * naast elkaar staan; zonder die regel voelden ze zich allebei de bovenste en sloot
 * één druk op Escape ze allebei.
 */
function isBovenste(mij: Knoop): boolean {
  const zonderKinderen = openePopups.filter((p) => !openePopups.some((q) => isAfstammeling(q, p)))
  return zonderKinderen[zonderKinderen.length - 1] === mij
}

export function Dialoog({
  titel,
  open,
  onSluiten,
  children,
  /** Optionele vaste voet, bv. met de opslaan-knoppen. Scrollt niet mee. */
  voet,
  /**
   * Zit er een INVULFORMULIER in deze popup? Dan mag ze niet per ongeluk sluiten.
   *
   * Wat er misging (melding van Timothy, ronde 55): je vulde de helft van een
   * boeking in, klikte ergens naast het venster, en alles was weg. Opnieuw op
   * "Toevoegen" gaf een leeg formulier. Een klik naast het venster is bijna nooit
   * een beslissing — je mikt op een veld, of je klapt iets weg — en toch was het
   * de enige handeling in de app die je invoer zonder waarschuwing wiste.
   *
   * Met deze vlag aan:
   *  - een klik NAAST het venster doet niets meer zodra je iets ingevuld hebt;
   *  - Escape en het kruisje vragen eerst of je je invoer wil weggooien.
   *
   * Zonder de vlag blijft alles zoals het was: een popup die alleen iets TOONT
   * (een bon bijvoorbeeld) mag gewoon dichtklikken.
   */
  bewaakInvoer = false,
  /**
   * Verhoog dit getal na een geslaagde opslag. Dan telt de popup het formulier
   * weer als leeg — anders blijft ze na "Opslaan + volgende" bewaken wat al
   * bewaard is, en moet je bevestigen om een leeg formulier te sluiten.
   */
  schoonNa = 0,
}: {
  titel: string
  open: boolean
  onSluiten: () => void
  children: ReactNode
  voet?: ReactNode
  bewaakInvoer?: boolean
  schoonNa?: number
}) {
  const { t } = useT()
  const paneel = useRef<HTMLDivElement | null>(null)
  const inhoud = useRef<HTMLDivElement | null>(null)
  const bevestigVak = useRef<HTMLDivElement | null>(null)
  // Heeft de gebruiker in DEZE popup iets ingetikt of gekozen?
  //
  // Bewust gemeten aan de echte `input`- en `change`-gebeurtenissen in het paneel,
  // en niet door de velden te vergelijken met hun beginwaarde. Die gebeurtenissen
  // komen alleen van een MENS: een waarde die de app zelf zet, geeft er geen. Zo
  // hoeft geen enkel formulier iets door te geven, en werkt de bewaking ook voor
  // velden die pas later verschijnen (achter "Meer opties").
  //
  // DE GRENS, en die staat er eerlijk bij: kies je alleen een categorie via de
  // chips — dat zijn knoppen, geen invoervelden — dan ziet deze meting dat niet.
  // Opslaan kan dan toch niet: daarvoor heb je op zijn minst een handelaar en een
  // bedrag nodig, en die tik je wél in.
  const vuil = useRef(false)
  const [bevestigen, setBevestigen] = useState(false)
  const bevestigenRef = useRef(false)
  bevestigenRef.current = bevestigen
  const bewaakRef = useRef(bewaakInvoer)
  bewaakRef.current = bewaakInvoer
  const vorigeFocus = useRef<HTMLElement | null>(null)
  const titelId = useId()
  const zichtbareHoogte = useZichtbareHoogte(open)
  // `onSluiten` is bij bijna elke oproeper een verse functie per render. Stond ze
  // in de afhankelijkheden van het effect hieronder, dan werd bij ELKE
  // hertekening van de ouder de focusval afgebroken en opnieuw opgezet — met als
  // zichtbaar gevolg dat de cursor middenin het typen terugsprong naar het eerste
  // veld, en dat het schuiven naar het actieve veld stilletjes wegviel. Via een
  // ref blijft de laatste versie beschikbaar zonder het effect te herstarten.
  const sluitRef = useRef(onSluiten)
  sluitRef.current = onSluiten
  // Wie is mijn ouder-popup (of null als ik de eerste ben)? Zie PopupContext.
  const ouder = useContext(PopupContext)
  const knoopRef = useRef<Knoop>({ ouder: null })
  knoopRef.current.ouder = ouder
  const knoop = knoopRef.current

  useEffect(() => {
    if (!open) return

    // Elke opening begint schoon. Zonder dit zou een popup die je vorige keer half
    // invulde en weggooide, meteen weer als "er staat iets in" gelden.
    vuil.current = false
    setBevestigen(false)

    // Onthoud waar de focus stond, en zet hem in de popup.
    vorigeFocus.current = document.activeElement as HTMLElement | null
    // Waar de focus heen moet, in aflopende voorkeur:
    //  1. het eerste échte invoerveld in de inhoud;
    //  2. anders het eerste focusbare element in de inhoud;
    //  3. anders wat er ook in het paneel te focussen valt.
    //
    // Waarom niet simpelweg "het eerste focusbare element": in de HTML-volgorde is
    // dat het kruisje in de kop, en dan sluit een druk op Enter je popup meteen
    // weer. En in de boekingspopup staan bovenaan vier keuzeknoppen; landt de focus
    // daar, dan moet je alsnog naar het eerste veld tabben voor je kan typen.
    //
    // Is er GEEN invoerveld, dan landt de focus op de inhoud zelf en niet op de
    // eerste knop (ronde 35). Neem de popup die een bewaarde bon toont: daar is de
    // eerste knop "Bewaren op dit toestel". Landde de focus daarop, dan startte
    // één druk op Enter meteen een download, en werd de beschrijving van de foto
    // ("Foto van bon of factuur: …") nooit voorgelezen — je begon eronder. Nu
    // begin je bij wat er te zien is, en breng één keer Tab je naar de knop.
    const inInhoud = inhoud.current ? focusbareElementen(inhoud.current) : []
    const eersteVeld = inInhoud.find((el) => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
    const eersteFocus = eersteVeld ?? inhoud.current ?? inInhoud[0] ?? (paneel.current ? focusbareElementen(paneel.current)[0] : undefined)
    eersteFocus?.focus()

    // Deze popup bovenop de stapel. De knoop komt uit een ref en verandert nooit
    // van identiteit, dus hij hoort niet in de afhankelijkheden thuis — vandaar dat
    // hij hier uit de ref gelezen wordt en niet van buiten meekomt.
    const sleutel = knoopRef.current
    openePopups.push(sleutel)

    // De pagina eronder mag niet meescrollen. Alleen de EERSTE popup onthoudt de
    // oorspronkelijke waarde; de rest zou 'hidden' onthouden en die bij het sluiten
    // terugzetten.
    //
    // Die waarde staat BUITEN de component (ronde 35). Ze stond eerst in deze
    // functie, en dan ging het mis wanneer twee popups tegelijk verdwenen — wat
    // gebeurt als een formulier vastloopt terwijl er een bon openstaat. React ruimt
    // dan eerst de buitenste op: die zag de binnenste nog in de stapel staan en
    // liet het scrollslot dus liggen; de binnenste had de oorspronkelijke waarde
    // niet en liet het óók liggen. Gevolg: de app scrolde daarna nergens meer, tot
    // je ze afsloot en opnieuw opende. Met de waarde buiten de component kan wie er
    // ook als laatste opruimt, hem terugzetten.
    if (openePopups.length === 1) {
      oorspronkelijkeOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    function opToets(e: KeyboardEvent) {
      // Alleen de bovenste popup mag op Escape reageren. Anders sluit één druk
      // ook de popup eronder — met je halve boeking erin.
      if (!isBovenste(sleutel)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        // Staat de vraag "weggooien?" op het scherm, dan betekent Escape: nee,
        // toch niet. Dat is de veilige kant, en het is ook wat je verwacht van de
        // toets waarmee je iets wégklikt.
        if (bevestigenRef.current) {
          setBevestigen(false)
          return
        }
        if (bewaakRef.current && vuil.current) {
          setBevestigen(true)
          return
        }
        sluitRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Focus-val: bereken bij elke Tab opnieuw wie er te focussen valt, want de
      // inhoud verandert (een keuzelijst klapt open, een veld verschijnt).
      //
      // Staat de bevestigingsvraag open, dan loopt de tab-toets alleen rond in DIE
      // twee knoppen. Het formulier eronder blijft staan (anders was je invoer weg
      // op het moment dat we ze net proberen te redden), maar het is op dat moment
      // niet bedienbaar, en dus hoort het ook geen tab-stop te zijn.
      const zone = bevestigVak.current ?? paneel.current
      if (!zone) return
      const kandidaten = focusbareElementen(zone)
      if (kandidaten.length === 0) return
      const eerste = kandidaten[0]
      const laatste = kandidaten[kandidaten.length - 1]
      if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      } else if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      }
    }

    // Zodra je in een veld tikt, schuift de popup naar dat veld toe. Zonder dit
    // staat de cursor achter het toetsenbord en typ je blind. `block: 'nearest'`
    // schuift zo weinig mogelijk: staat het veld al in beeld, dan beweegt er niets.
    //
    // Drie voorzorgen die er niet uit mogen:
    //  - ÉÉN timer die telkens gewist wordt. Vijf keer snel tabben zou anders
    //    vijf zachte schuifbewegingen tegelijk starten, en dan schokt het beeld.
    //  - de timer wordt ook bij het sluiten gewist, zodat er nooit geschoven
    //    wordt naar iets wat er niet meer is.
    //  - een bestaanscheck op `scrollIntoView`: die functie bestaat niet in de
    //    testomgeving, en een fout in een timer valt buiten elke test — dat zet
    //    de hele suite op rood zonder dat je ziet waarom.
    let schuifTimer: ReturnType<typeof setTimeout> | undefined
    function opFocus(e: FocusEvent) {
      const doel = e.target
      if (!(doel instanceof HTMLElement)) return
      // Het hele paneel, niet enkel de inhoud: een knop in de vaste voet is juist
      // het deel dat achter het toetsenbord verdwijnt.
      if (!paneel.current?.contains(doel)) return
      if (schuifTimer) clearTimeout(schuifTimer)
      // Wachten tot het toetsenbord er echt is; anders rekent de browser met de
      // hoogte van vóór het openschuiven.
      schuifTimer = setTimeout(() => {
        if (typeof doel.scrollIntoView !== 'function' || !doel.isConnected) return
        // Zacht schuiven, tenzij iemand beweging heeft uitgezet. Een
        // CSS-mediaquery bereikt een scroll uit JavaScript niet, dus dat moet
        // hier expliciet.
        const rustig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        doel.scrollIntoView({ block: 'nearest', behavior: rustig ? 'auto' : 'smooth' })
      }, 220)
    }

    // Zie de uitleg bij `vuil`: alleen een MENS veroorzaakt deze gebeurtenis.
    //
    // BEWUST ALLEEN `input`, en niet ook `change`. Een tekstveld stuurt `change`
    // pas wanneer het de focus VERLIEST — en dat gebeurt precies op het moment dat
    // je ernaast klikt. Met `change` erbij werd een formulier dus opnieuw "vuil"
    // door de klik waarvan we net moeten beslissen of ze mag sluiten. Alles wat
    // `change` stuurt (een keuzelijst, een vinkje, een bestandskeuze) stuurt ook
    // `input`, dus er gaat niets verloren.
    function opInvoer() {
      vuil.current = true
    }

    // EN een klik op een bediening BINNEN een formulier in de popup (nakijkronde
    // ronde 55). Een categoriechip en een gezinslid kies je met een knop, en een
    // knop geeft geen `input`: die keuzes verdwenen dus nog altijd bij een klik
    // ernaast. `closest('form')` is de grens die telt — de vier soortknoppen
    // bovenaan de boekingspopup staan erbuiten, en die kiezen alleen wélk formulier
    // je ziet. Ze mogen een leeg venster niet op slot zetten.
    function opKlik(e: Event) {
      const doel = e.target
      if (!(doel instanceof Element)) return
      if (!doel.closest('form')) return
      if (doel.closest('button, [role="button"], label, input, select, textarea')) vuil.current = true
    }

    document.addEventListener('keydown', opToets)
    document.addEventListener('focusin', opFocus)
    paneel.current?.addEventListener('input', opInvoer)
    paneel.current?.addEventListener('click', opKlik)
    const paneelBijStart = paneel.current
    return () => {
      document.removeEventListener('keydown', opToets)
      document.removeEventListener('focusin', opFocus)
      paneelBijStart?.removeEventListener('input', opInvoer)
      paneelBijStart?.removeEventListener('click', opKlik)
      if (schuifTimer) clearTimeout(schuifTimer)
      const plek = openePopups.lastIndexOf(sleutel)
      if (plek >= 0) openePopups.splice(plek, 1)
      // Pas losmaken wanneer er geen enkele popup meer openstaat — door wie dan
      // ook als laatste opruimt.
      if (openePopups.length === 0 && oorspronkelijkeOverflow !== null) {
        document.body.style.overflow = oorspronkelijkeOverflow
        oorspronkelijkeOverflow = null
      }
      // De bevestigingsvraag mag niet blijven staan (nakijkronde ronde 55). Ze werd
      // alleen bij het OPENEN gewist, en een effect draait ná het tekenen: sloot de
      // popup terwijl de vraag openstond, dan flitste "Wil je ze weggooien?" bij de
      // volgende opening één beeld lang over een leeg formulier — en wie snel tikt,
      // sluit een venster dat hij net opende.
      setBevestigen(false)
      // Terug naar de knop waarmee de popup geopend werd.
      vorigeFocus.current?.focus?.()
    }
    // Bewust ALLEEN `open`: zie de opmerking bij `sluitRef`.
  }, [open])

  // Na een geslaagde opslag telt het formulier weer als leeg. Anders zou je na
  // "Opslaan + volgende" moeten bevestigen om een leeg formulier te sluiten.
  useEffect(() => {
    vuil.current = false
  }, [schoonNa])

  // Een poging tot sluiten die NIET van de opslaanknop komt: het kruisje, Escape.
  // Staat er iets in, dan vragen we het eerst.
  function probeerSluiten() {
    if (bewaakInvoer && vuil.current) {
      setBevestigen(true)
      return
    }
    onSluiten()
  }

  if (!open) return null

  // De popup wordt rechtstreeks aan `document.body` gehangen (ronde 35).
  //
  // Waarom: `position: fixed` gaat uit van het scherm — behalve wanneer er ergens
  // boven het element een `transform` staat, want dan wordt dát element het
  // referentiekader. De pagina's van de app schuiven bij het wisselen van tabblad
  // kort omhoog, en dat is een transform. Opende je in die halve seconde een bon,
  // dan hing de popup aan de pagina in plaats van aan het scherm: gemeten stond de
  // titelbalk mét de sluitknop bóven het scherm, en het donkere vlak dekte de
  // pagina niet meer af — een tik ernaast belandde op de knoppen eronder.
  //
  // Aan `body` hangen haalt de popup onder élke transform vandaan, nu en in de
  // toekomst. De prijs is dat geneste popups niet meer ín elkaar staan; daarvoor is
  // PopupContext hierboven.
  const laag = (
    <div
      className="dialoog-laag"
      // Een klik NAAST het venster sluit alleen wanneer er niets te verliezen valt.
      // Zie `bewaakInvoer`: dit was de handeling die een half ingevulde boeking
      // zonder één woord wiste. Ze vraagt bewust ook niets — een klik ernaast is
      // meestal geen beslissing, en dan is een vraag stellen alleen maar ruis.
      // Bewust een functie die PAS BIJ DE KLIK kijkt. `vuil` is een ref en
      // veroorzaakt dus geen hertekening; had de keuze hier bij het tekenen
      // gestaan, dan bleef de oude beslissing hangen tot er toevallig iets anders
      // hertekende — en dan sloot het venster alsnog.
      onClick={() => {
        if (bewaakInvoer && vuil.current) return
        onSluiten()
      }}
      // De laag zelf krimpt mee met wat er zichtbaar is. Daardoor blijft het blad
      // met de knoppen bóven het toetsenbord in plaats van erachter.
      style={zichtbareHoogte !== null ? { height: zichtbareHoogte } : undefined}
    >
      <div
        className="dialoog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        ref={paneel}
        // Een klik ín de popup mag niet als "buiten" gelden.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialoog-kop">
          <h2 className="kaart-titel" id={titelId}>
            {titel}
          </h2>
          <button type="button" className="knop knop-kaal" aria-label={t('Sluiten')} onClick={probeerSluiten}>
            ×
          </button>
        </div>

        {/* `tabIndex={-1}`: het vak kan de focus krijgen wanneer er geen
            invoerveld is, maar het komt niet in de tab-volgorde te staan. */}
        <div className="dialoog-inhoud" ref={inhoud} tabIndex={-1}>
          {children}
        </div>

        {voet && <div className="dialoog-voet">{voet}</div>}

        {bevestigen && (
          <div
            className="dialoog-bevestig"
            role="alertdialog"
            aria-modal="true"
            aria-label={t('Je invoer is nog niet opgeslagen')}
            ref={bevestigVak}
          >
            <div className="dialoog-bevestig-kaart">
              <p style={{ margin: 0 }}>{t('Je invoer is nog niet opgeslagen. Wil je ze weggooien?')}</p>
              <div className="knoprij">
                {/* "Verder invullen" staat eerst én krijgt de focus: de veilige
                    keuze hoort de gemakkelijke te zijn. */}
                <button
                  type="button"
                  className="knop"
                  autoFocus
                  onClick={() => setBevestigen(false)}
                >
                  {t('Verder invullen')}
                </button>
                <button
                  type="button"
                  className="knop knop-secundair knop-gevaar"
                  onClick={() => {
                    setBevestigen(false)
                    onSluiten()
                  }}
                >
                  {t('Weggooien')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return <PopupContext.Provider value={knoop}>{createPortal(laag, document.body)}</PopupContext.Provider>
}
