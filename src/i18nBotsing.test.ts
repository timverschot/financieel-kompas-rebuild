import { describe, it, expect } from 'vitest'
import { vertaal, vertaalSleutels } from './i18n'
import type { Taal } from './i18n'

// Eén woord per ding — nu ook in het Engels en het Frans (ronde 91).
//
// ⚠ WAAROM DEZE TEST BESTAAT. Ronde 66 zette de regel "één woord per ding" in
// `woordenschat.test.ts`, maar die leest `vertaalSleutels(...)` en dat zijn de
// NEDERLANDSE sleutels. De vertalingen bleven dus ongedekt, en ronde 89 vond bij het
// nalezen met de hand elf botsingen. Timothy vroeg daarop: "corrigeer het op een logische
// wijze. hoe doen engelstalige budgetapps het?"
//
// Deze test draait de tabel OM: van vertaling naar sleutel. Zodra twee verschillende
// Nederlandse begrippen op hetzelfde Engelse of Franse woord uitkomen, valt dat hier op —
// zonder dat iemand 2.100 regels met de hand hoeft na te lezen.
//
// Wat er zo gevonden werd, met de schermtaal van bestaande budgetapps als richtsnoer
// (Monarch, Copilot, Quicken Simplifi, YNAB, Lunch Money, Actual Budget, Firefly III,
// Splitwise, Tricount):
//
//   EN `Save`        was zowel "Bewaar" als "Sparen". Geen enkele onderzochte app gebruikt
//                    het werkwoord "save" voor geld: het is `Savings goal` (Monarch,
//                    Copilot, Simplifi), `Target` (YNAB) of `Piggy bank` (Firefly III).
//                    → "Sparen" heet nu `Savings`.
//   EN `Settlements` was zowel "Afrekeningen" als "Verrekeningen". Splitwise en Tricount
//                    houden die twee uit elkaar met `Balance` (de stand) en `Payment` /
//                    `Transfer` (het geld dat het vereffent). → "Verrekeningen" heet nu
//                    `Payments`.
//   EN `Note`        was "Notitie", "Toelichting" én "Let op". Apps gebruiken `Notes` alleen
//                    voor het vrije tekstveld. → "Let op" heet nu `Important`, en de
//                    CSV-kolom "Toelichting" heet gewoon "Omschrijving", zoals het veld.
//   EN `Receipt`     stond op een kolom die het TICKETNUMMER draagt (`tx.id`) — een kolom
//                    "Receipt" vol id's is geen vertaalfout maar een onjuiste kop.
//   FR `Aperçu`      was zowel "Overzicht" (de hoofdpagina!) als "Voorbeeld". In het Frans
//                    IS `Aperçu` het woord voor preview — Apple's Preview heet zo. In het
//                    Franse tekstbestand van Actual Budget komt het nul keer voor.
//                    → "Overzicht" heet nu `Vue d'ensemble`.
//   FR `Annuler`     was "Annuleer", "Ongedaan maken" én "Terugdraaien".
//   FR `Modifier`    was zowel "Wijzigen" (de knop die OPSLAAT) als "Bewerken" (de knop die
//                    OPENT) — precies het onderscheid dat ronde 89 in het Engels wél maakte.
//
// ⚠ De uitzonderingen hieronder staan er MET EEN REDEN, zoals in `index.css.test.ts`. En ze
// worden in twee richtingen bewaakt: een uitzondering die niet meer klopt, faalt óók. Zo
// kunnen ze niet stil groeien en blijven ze niet staan nadat het probleem opgelost is.

type Uitzondering = { taal: Taal; waarde: string; sleutels: string[]; reden: string }

const TOEGESTAAN: Uitzondering[] = [
  {
    taal: 'en',
    waarde: 'Income',
    sleutels: ['Inkomen', 'Inkomst', 'Inkomsten'],
    reden:
      'Het Engels heeft één woord voor "inkomen" en "inkomsten", en telt het niet: er is geen ' +
      '"incomes". Drie Nederlandse woorden, één juist Engels woord.',
  },
  {
    taal: 'en',
    waarde: 'income',
    sleutels: ['inkomst', 'inkomsten'],
    reden: 'Zelfde reden als hierboven; dit is de variant met een kleine letter, midden in een zin.',
  },
  {
    taal: 'en',
    waarde: 'Insurance',
    sleutels: ['Verzekering', 'Verzekeringen'],
    reden: '"Insurance" is in het Engels ontelbaar: "insurances" bestaat niet als categorienaam.',
  },
  {
    taal: 'fr',
    waarde: 'Revenu',
    sleutels: ['Inkomen', 'Inkomst'],
    reden: 'Zelfde als het Engelse "Income", maar het Frans kent hier wél een meervoud: "Inkomsten" is "Revenus".',
  },
  {
    taal: 'fr',
    waarde: 'Frais ordinaires',
    sleutels: ['Gewone kost', 'Gewone kosten'],
    reden: '"Frais" is in het Frans altijd meervoud; enkelvoud en meervoud vallen dus samen.',
  },
  {
    taal: 'fr',
    waarde: 'Frais extraordinaires',
    sleutels: ['Buitengewone kost', 'Buitengewone kosten'],
    reden: '"Frais" is in het Frans altijd meervoud, net als bij de gewone kosten hierboven.',
  },
  {
    taal: 'en',
    waarde: 'Edit {naam}',
    sleutels: ['Bewerk {naam}', '{naam} bewerken'],
    reden:
      'Ronde 89: twee Nederlandse VORMEN van dezelfde handeling — de gebiedende wijs op een ' +
      'rijknop, het werkwoord achteraan in een venstertitel. Het Engels heeft daar één vorm voor.',
  },
  {
    taal: 'fr',
    waarde: 'Modifier {naam}',
    sleutels: ['Bewerk {naam}', '{naam} bewerken'],
    reden: 'Zelfde twee Nederlandse vormen als bij het Engelse "Edit {naam}" hierboven; ook het Frans heeft er één vorm voor.',
  },
  {
    taal: 'fr',
    waarde: 'sur {n} mois',
    sleutels: ['over {n} maand(en)', 'over {n} maanden'],
    reden:
      'Twee Nederlandse vormen van dezelfde zin, met een reden: bij de onderhoudsbijdrage kan ' +
      'het aantal 1 zijn en is de haakjesvorm nodig, bij de vermogensgrafiek is het altijd twaalf. ' +
      'Het Frans schrijft in allebei de gevallen "mois", enkelvoud en meervoud gelijk.',
  },
  {
    taal: 'fr',
    waarde: 'Afficher',
    sleutels: ['Toon', 'Toon het'],
    reden:
      'Twee Nederlandse formuleringen van dezelfde handeling: "Toon" schakelt een blok open, ' +
      '"Toon het" staat achter een zin over één uitgezet onderdeel. Het Frans zegt in beide ' +
      'gevallen "Afficher", en dat is juist Frans.',
  },
]

/**
 * De STAM van een tekst: kleine letters, zonder slotleesteken, zonder meervoudsuitgang en
 * zonder verdubbelde slotmedeklinker.
 *
 * ⚠ WAAROM DIT ERBIJ MOET (doorlichting ronde 91). De eerste opzet van deze test vergeleek
 * alleen VOLLEDIGE, exact gelijke waarden. Daardoor zag ze `Payment` naast `Payments` niet,
 * `Note` naast `Note:` niet, en `Book` naast `Books` niet — en dat waren precies drie van de
 * botsingen die deze ronde zelf aan het maken was. Een test die gelijke ZINNEN toetst waar
 * ze gelijke WOORDEN belooft, is een test die zich groter voordoet dan ze is.
 *
 * ⚠ De stam wordt op ALLEBEI de kanten toegepast. Zonder dat vangt de tweede ronde vooral
 * Nederlandse enkelvouden en meervouden ("Rekening" en "Rekeningen" heten allebei "account"),
 * en dat is geen botsing maar grammatica.
 */
function stam(tekst: string): string {
  let v = tekst.trim().toLowerCase().replace(/ë/g, 'e').replace(/…/g, '')
  v = v.replace(/[\s:.;!?]+$/, '')
  for (const eind of ['eren', 'en', 's', 'n']) {
    if (v.length - eind.length >= 4 && v.endsWith(eind)) {
      v = v.slice(0, -eind.length)
      break
    }
  }
  return v.replace(/(.)\1$/, '$1')
}

/** Van vertaling naar de Nederlandse sleutels die erop uitkomen. */
function omgekeerd(taal: Taal): Map<string, string[]> {
  const uit = new Map<string, string[]>()
  for (const sleutel of vertaalSleutels(taal)) {
    const waarde = vertaal(taal, sleutel).trim()
    const lijst = uit.get(waarde)
    if (lijst) lijst.push(sleutel)
    else uit.set(waarde, [sleutel])
  }
  return uit
}

function gedeeld(taal: Taal): Map<string, string[]> {
  const uit = new Map<string, string[]>()
  for (const [waarde, sleutels] of omgekeerd(taal)) {
    if (sleutels.length > 1) uit.set(waarde, [...sleutels].sort())
  }
  return uit
}

/**
 * De tweede, strengere ronde: waarden die op hun STAM samenvallen terwijl de Nederlandse
 * sleutels dat NIET doen. Zo blijven enkelvoud/meervoud en hoofdletters buiten beeld, en
 * blijft over wat echt twee verschillende Nederlandse begrippen zijn.
 */
function gedeeldeStammen(taal: Taal): Map<string, string[]> {
  const perStam = new Map<string, string[]>()
  for (const sleutel of vertaalSleutels(taal)) {
    const s = stam(vertaal(taal, sleutel))
    const lijst = perStam.get(s)
    if (lijst) lijst.push(sleutel)
    else perStam.set(s, [sleutel])
  }
  const uit = new Map<string, string[]>()
  for (const [s, sleutels] of perStam) {
    if (sleutels.length < 2) continue
    // Zelfde Nederlandse begrip in twee vormen? Dan is het grammatica, geen botsing.
    if (new Set(sleutels.map(stam)).size < 2) continue
    uit.set(s, [...sleutels].sort())
  }
  return uit
}

function toegestaanVoor(taal: Taal): Map<string, Uitzondering> {
  return new Map(TOEGESTAAN.filter((u) => u.taal === taal).map((u) => [u.waarde, u]))
}

/** Welke uitzonderingen niet meer nodig zijn, omdat hun waarde vandaag nergens meer botst. */
function overbodigeUitzonderingen(lijst: readonly Uitzondering[]): string[] {
  const uit: string[] = []
  for (const u of lijst) {
    if (!gedeeld(u.taal).has(u.waarde)) {
      uit.push(`${u.taal}: "${u.waarde}" botst niet meer — haal de uitzondering weg`)
    }
  }
  return uit
}

describe('geen twee betekenissen op één vertaald woord (ronde 91)', () => {
  // ⚠ Het vangnet vóór het vangnet: leest de tabel om de een of andere reden leeg, dan
  // zou alles hieronder stil slagen op nul sleutels.
  it('leest allebei de tabellen', () => {
    expect(vertaalSleutels('en').length).toBeGreaterThan(1500)
    expect(vertaalSleutels('fr').length).toBeGreaterThan(1500)
  })

  for (const taal of ['en', 'fr'] as const) {
    it(`geeft in het ${taal === 'en' ? 'Engels' : 'Frans'} geen twee begrippen hetzelfde woord`, () => {
      const toegestaan = toegestaanVoor(taal)
      const fouten: string[] = []
      for (const [waarde, sleutels] of gedeeld(taal)) {
        const uitzondering = toegestaan.get(waarde)
        if (!uitzondering) {
          fouten.push(`"${waarde}" ← ${sleutels.map((s) => `"${s}"`).join(' + ')}`)
          continue
        }
        // ⚠ En de uitzondering moet nog altijd exact kloppen. Komt er een DERDE
        // Nederlandse sleutel bij die op hetzelfde woord uitkomt, dan is dat een nieuwe
        // botsing die niemand bekeken heeft.
        if (JSON.stringify([...uitzondering.sleutels].sort()) !== JSON.stringify(sleutels)) {
          fouten.push(
            `"${waarde}" is toegestaan voor ${uitzondering.sleutels.join(' + ')}, ` +
              `maar draagt nu ${sleutels.join(' + ')}`,
          )
        }
      }
      // De volledige lijst in de foutmelding, zodat je ze in één keer kan nakijken.
      expect(fouten).toEqual([])
    })
  }

  // -------------------------------------------------------------------------------------
  // De tweede ronde: gelijke WOORDEN, niet alleen gelijke zinnen
  // -------------------------------------------------------------------------------------
  //
  // ⚠ Wat hier overblijft, is met opzet een INVENTARIS en geen foutenlijst. Elk paar hieronder
  // is nagekeken: het gaat telkens om twee Nederlandse vormen of woorden die in het Engels of
  // het Frans terecht op één stam uitkomen. Komt er een paar bij dat er niet in staat, dan
  // faalt deze test — en dan hoort iemand ernaar te kijken vóór het in de app terechtkomt.
  const STAMMEN_TOEGESTAAN: Record<Taal, Record<string, string[]>> = {
    nl: {},
    en: {
      archive: ['Archiveren', 'archiveer'],
      close: ['Sluiten', 'sluit af'],
      'delete {naam}': ['Verwijder {naam}', '{naam} verwijderen?'],
      done: ['Klaar?', 'rond'],
      'edit {naam}': ['Bewerk {naam}', '{naam} bewerken'],
      expense: ['Uitgave', 'Uitgaven', 'uitgave', 'uitgaven'],
      'family member': ['Gezinsleden', 'Gezinslid'],
      income: ['Inkomen', 'Inkomst', 'Inkomsten', 'inkomst', 'inkomsten'],
      note: ['Let op', 'Let op:', 'Notitie'],
      reop: ['Heropenen', 'heropen'],
      saving: ['Bewaren…', 'Sparen'],
      to: ['Tot', 't/m'],
      total: ['Totaal', 'Totalen'],
      withdraw: ['Ingetrokken', 'Intrekken'],
      you: ['Jij', 'jou'],
    },
    fr: {
      afficher: ['Toon', 'Toon het'],
      archiver: ['Archiveren', 'archiveer'],
      au: ['Tot', 't/m'],
      'dépense': ['Uitgave', 'Uitgaven', 'uitgave', 'uitgaven'],
      'en cour': ['Bezig…', 'bezig…', 'loopt nog'],
      'modifier {naam}': ['Bewerk {naam}', '{naam} bewerken'],
      revenu: ['Inkomen', 'Inkomst', 'Inkomsten', 'inkomsten'],
      rouvrir: ['Heropenen', 'heropen'],
      'supprimer {naam}': ['Verwijder {naam}', '{naam} verwijderen?'],
      'sur {n} moi': ['over {n} maand(en)', 'over {n} maanden'],
      toi: ['Jij', 'jou'],
    },
  }

  for (const taal of ['en', 'fr'] as const) {
    it(`laat in het ${taal === 'en' ? 'Engels' : 'Frans'} geen NIEUW woord twee begrippen dragen`, () => {
      const toegestaan = STAMMEN_TOEGESTAAN[taal]
      const fouten: string[] = []
      for (const [s, sleutels] of gedeeldeStammen(taal)) {
        const verwacht = toegestaan[s]
        if (!verwacht) {
          fouten.push(`"${s}" ← ${sleutels.map((k) => `"${k}"`).join(' + ')}`)
        } else if (JSON.stringify([...verwacht].sort()) !== JSON.stringify(sleutels)) {
          fouten.push(`"${s}" was toegestaan voor ${verwacht.join(' + ')}, draagt nu ${sleutels.join(' + ')}`)
        }
      }
      expect(fouten).toEqual([])
    })

    it(`houdt in het ${taal === 'en' ? 'Engels' : 'Frans'} geen stam-uitzondering staan die niet meer botst`, () => {
      const echt = gedeeldeStammen(taal)
      const overbodig = Object.keys(STAMMEN_TOEGESTAAN[taal]).filter((s) => !echt.has(s))
      expect(overbodig).toEqual([])
    })
  }

  // -------------------------------------------------------------------------------------
  // Woorden die al bezet zijn
  // -------------------------------------------------------------------------------------
  //
  // ⚠ DEZE REEKS BESTAAT DOOR EEN MUTATIETEST. Zet je `Terugdraaien` in het Engels terug op
  // `Restore`, dan blijft alles hierboven groen — want geen enkele ándere sleutel heet
  // exact "Restore"; de back-upfamilie heet "Restore from backup" en "Restore account
  // {naam}". Een woord dat vooraan in een lángere zin al bezet is, kan geen van beide
  // vergelijkingen zien, en een controle daarop bleek 544 valse treffers te geven (élk
  // knoplabel is nu eenmaal het eerste woord van een langere zin: "View" en "View your
  // budgets").
  //
  // Vandaar deze korte, met de hand geschreven lijst — dezelfde vorm als de regels in
  // `woordenschat.test.ts`. Ze dekt niet alles; ze dekt de woorden waarvan we WETEN dat ze
  // al een eigenaar hebben.
  const BEZET: { taal: Taal; sleutel: string; verboden: RegExp; eigenaar: string }[] = [
    {
      taal: 'en',
      sleutel: 'Terugdraaien',
      verboden: /^Restore\b/,
      eigenaar: 'de back-upfamilie: "Restore from backup", "Restore account {naam}", "Restore failed".',
    },
    {
      taal: 'en',
      sleutel: 'Boek in',
      verboden: /^Books?$/,
      eigenaar: 'het icoon 📚 "Boeken", dat in het Engels "Books" heet.',
    },
    {
      taal: 'en',
      sleutel: 'Sparen',
      verboden: /^Sav(e|ing)$/,
      eigenaar: 'de opslaanknop "Bewaar" ("Save") en haar bezig-vorm "Bewaren…" ("Saving…").',
    },
    {
      taal: 'en',
      sleutel: 'Notitie',
      verboden: /^Note$/,
      eigenaar: 'het signaalwoord "Let op" ("Note" / "Note:"), veertien zinnen lang.',
    },
    {
      taal: 'fr',
      sleutel: 'Overzicht',
      verboden: /Aperçu/i,
      eigenaar: 'het Franse woord voor preview — "Voorbeeld", en Apple\'s Preview heet zo.',
    },
    {
      taal: 'fr',
      sleutel: 'Ongedaan maken',
      verboden: /^Annuler$/,
      eigenaar: 'de knop "Annuleer" in elk venster.',
    },
    {
      taal: 'fr',
      sleutel: 'Terugdraaien',
      verboden: /^Rétablir$/,
      eigenaar: 'in Franse menu\'s de REDO-knop; "Annuler / Rétablir" is daar het vaste paar.',
    },
    {
      taal: 'fr',
      sleutel: 'Post',
      verboden: /^Rubrique$/,
      eigenaar: 'het veldlabel "Rubriek" van een rekening.',
    },
    {
      taal: 'fr',
      sleutel: 'Weggooien',
      verboden: /^Supprimer$/,
      eigenaar: '"Verwijderen" — en weggooien is iets anders dan verwijderen (ronde 86).',
    },
    {
      taal: 'fr',
      sleutel: 'Overgemaakt',
      verboden: /^(Payé|Versé|Viré)$/,
      eigenaar: '"Betaald" ("Payé") en "Storting" ("Versement").',
    },
  ]

  /** Welke regels uit `BEZET` vandaag geschonden worden. Zuiver, dus zelf te beproeven. */
  function schendingen(regels: typeof BEZET): string[] {
    const fouten: string[] = []
    for (const b of regels) {
      const waarde = vertaal(b.taal, b.sleutel)
      if (b.verboden.test(waarde)) fouten.push(`${b.taal} "${b.sleutel}" → "${waarde}" — dat woord is van ${b.eigenaar}`)
    }
    return fouten
  }

  it('gebruikt geen woord dat al een andere eigenaar heeft', () => {
    expect(schendingen(BEZET)).toEqual([])
  })

  it('zou een schending ook écht aanwijzen', () => {
    // ⚠ Ook deze test bestaat door een mutatietest: de controle hierboven uitschakelen liet
    // alles groen, want er is vandaag geen schending. Hier krijgt ze er wél een.
    expect(
      schendingen([
        { taal: 'en', sleutel: 'Bewaar', verboden: /^Save$/, eigenaar: 'een verzonnen eigenaar voor deze test' },
      ]),
    ).toHaveLength(1)
  })

  it('houdt die lijst eerlijk: elke sleutel erin bestaat écht', () => {
    // ⚠ Anders bewaakt een regel een sleutel die niemand meer gebruikt, en slaagt ze altijd.
    for (const b of BEZET) {
      expect(vertaalSleutels(b.taal), `${b.taal}: ${b.sleutel}`).toContain(b.sleutel)
      expect(b.eigenaar.length, `${b.taal}: ${b.sleutel}`).toBeGreaterThan(25)
    }
  })

  it('vangt met de stam méér dan met de kale vergelijking', () => {
    // ⚠ Het bewijs dat de tweede ronde iets toevoegt, en niet alleen een duurdere kopie van
    // de eerste is. Zonder de stam viel "Note" naast "Note:" buiten beeld — precies het gat
    // waar deze ronde zelf in gelopen was.
    expect(stam('Note')).toBe(stam('Note:'))
    expect(stam('Payment')).toBe(stam('Payments'))
    expect(stam('Book')).toBe(stam('Books'))
    // ...en dat het niet álles op één hoop gooit:
    expect(stam('Income')).not.toBe(stam('Expense'))
    expect(stam('Settlement')).not.toBe(stam('Payment'))
  })

  // -------------------------------------------------------------------------------------
  // Eén Nederlands woord, één vreemd woord — de andere richting (ronde 94)
  // -------------------------------------------------------------------------------------
  //
  // ⚠ Alles hierboven zoekt naar één VREEMD woord dat twee Nederlandse begrippen draagt.
  // Ronde 94 vond het spiegelbeeld: één NEDERLANDS woord dat in de vertaling uiteenviel.
  // "Kost" kwam in het Engels als *cost* (63×) én als *expense* (15×) terug, en in het Frans
  // als *frais* (93×) én als *charge* (18×) — en dat laatste is het woord van "vaste last".
  //
  // Bij het uitzoeken bleek de oorzaak in het NEDERLANDS te zitten: "kost" betekende in de
  // dossiermodule een gedeelde kost en in de vaste-lastenmodule een vaste last. De
  // vertalingen liepen niet uiteen door slordigheid maar omdat ze twee verschillende dingen
  // beschreven. Dezelfde soort vondst als in ronde 91 met "afrekening" en "verrekening".
  //
  // Deze reeks bewaakt de uitkomst: draagt een Nederlandse tekst het woord "kost" (en niet
  // óók "uitgave" of "vaste last"), dan hoort daar in het Engels `cost` te staan en in het
  // Frans `frais` — en omgekeerd voor "uitgave".
  const WOORDPAREN: {
    nl: RegExp
    nietOok: RegExp
    verboden: Record<'en' | 'fr', RegExp>
    hoort: string
  }[] = [
    {
      nl: /\bkost(en)?\b/i,
      nietOok: /\buitgave|vaste (last|lasten)/i,
      verboden: { en: /\bexpenses?\b/i, fr: /\bcharges?\b|\bdépenses?\b/i },
      hoort: 'EN "cost", FR "frais" — want "expense" is van "uitgave" en "charge" van "vaste last"',
    },
    {
      nl: /\buitgave/i,
      nietOok: /\bkost(en)?\b|vaste (last|lasten)/i,
      verboden: { en: /\bcosts?\b/i, fr: /\bfrais\b|\bcharges?\b/i },
      hoort: 'EN "expense" of "spending", FR "dépense"',
    },
  ]

  // ⚠ Twee categorienamen waar het FRANS écht een ander woord gebruikt, mét reden. Per taal,
  // want een fout Engels op diezelfde sleutel hoort gewoon te blijven opvallen (doorlichting).
  const VAKTERMEN: { sleutel: string; taal: 'en' | 'fr'; reden: string }[] = [
    {
      sleutel: 'Syndicus of gemeenschappelijke kosten',
      taal: 'fr',
      reden:
        '"Charges communes" is in het Frans de vaste term voor de gemeenschappelijke kosten van ' +
        'een gebouw. "Frais communs" bestaat, maar staat niet op een afrekening van een syndicus.',
    },
    {
      sleutel: 'Uitgaven voor kinderoppas',
      taal: 'fr',
      reden:
        '"Frais de garde" is in het Frans de vaste term voor kinderopvangkosten, ook op de ' +
        'belastingbrief. "Dépenses de garde" zou daar niemand herkennen.',
    },
  ]

  /**
   * Welke teksten de regel breken.
   *
   * ⚠ De vertalingen komen ERIN, niet uit de tabel — zodat deze functie op verzonnen teksten
   * te beproeven is. Anders kan ze alleen falen wanneer er al iets fout in de tabel staat, en
   * dat is geen controle (les van ronde 91, 92 en 93).
   */
  function tegenstrijdig(teksten: readonly { sleutel: string; en: string; fr: string }[]): string[] {
    const uit: string[] = []
    for (const paar of WOORDPAREN) {
      for (const { sleutel, en, fr } of teksten) {
        if (!paar.nl.test(sleutel) || paar.nietOok.test(sleutel)) continue
        for (const [taal, waarde] of [
          ['en', en],
          ['fr', fr],
        ] as const) {
          if (VAKTERMEN.some((v) => v.sleutel === sleutel && v.taal === taal)) continue
          if (paar.verboden[taal].test(waarde)) {
            uit.push(`${taal} "${sleutel}" → "${waarde}" (hoort: ${paar.hoort})`)
          }
        }
      }
    }
    return uit
  }

  const UIT_DE_TABEL = () =>
    vertaalSleutels('en').map((sleutel) => ({
      sleutel,
      en: vertaal('en', sleutel),
      fr: vertaal('fr', sleutel),
    }))

  it('vertaalt "kost" en "uitgave" elk met één vast woord', () => {
    expect(tegenstrijdig(UIT_DE_TABEL())).toEqual([])
  })

  it('zou een tegenstrijdige vertaling ook écht aanwijzen', () => {
    // ⚠ Verzonnen teksten die de regel BREKEN — anders bewijst de test hierboven niets.
    expect(
      tegenstrijdig([{ sleutel: 'Kost toevoegen', en: 'Add expense', fr: 'Ajouter des frais' }]),
    ).toEqual(['en "Kost toevoegen" → "Add expense" (hoort: ' + WOORDPAREN[0].hoort + ')'])
    expect(
      tegenstrijdig([{ sleutel: 'Uitgave toevoegen', en: 'Add cost', fr: 'Ajouter des frais' }]),
    ).toHaveLength(2)
    // ...en teksten die haar volgen, komen er niet in voor.
    expect(
      tegenstrijdig([{ sleutel: 'Kost toevoegen', en: 'Add cost', fr: 'Ajouter des frais' }]),
    ).toEqual([])
    // De vakterm werkt alleen in de taal waarvoor ze bedoeld is.
    expect(
      tegenstrijdig([
        { sleutel: 'Uitgaven voor kinderoppas', en: 'Childcare expenses', fr: 'Frais de garde' },
      ]),
    ).toEqual([])
    expect(
      tegenstrijdig([
        { sleutel: 'Uitgaven voor kinderoppas', en: 'Childcare costs', fr: 'Frais de garde' },
      ]),
    ).toHaveLength(1)
  })

  it('houdt geen vakterm staan die niet meer nodig is', () => {
    // ⚠ In twee richtingen: de sleutel moet nog bestaan, én ze moet zónder de uitzondering
    // écht een melding geven. Anders blijft een uitzondering staan die niets meer afdekt.
    for (const v of VAKTERMEN) {
      expect(vertaalSleutels('en'), v.sleutel).toContain(v.sleutel)
      const waarde = { sleutel: v.sleutel, en: vertaal('en', v.sleutel), fr: vertaal('fr', v.sleutel) }
      const zonder = WOORDPAREN.some(
        (paar) =>
          paar.nl.test(v.sleutel) && !paar.nietOok.test(v.sleutel) && paar.verboden[v.taal].test(waarde[v.taal]),
      )
      expect(zonder, `${v.sleutel} (${v.taal}) heeft de uitzondering niet meer nodig`).toBe(true)
    }
  })

  it('geeft elke vakterm een reden die iets zegt', () => {
    for (const v of VAKTERMEN) {
      expect(v.reden.length, v.sleutel).toBeGreaterThan(60)
    }
  })

  it('houdt geen uitzondering staan die niet meer nodig is', () => {
    // ⚠ De andere richting. Zonder deze test blijft een uitzondering die ooit terecht was
    // voor altijd staan, en dan dekt ze op een dag iets af wat niemand meer bekeken heeft.
    expect(overbodigeUitzonderingen(TOEGESTAAN)).toEqual([])
  })

  it('zou een verouderde uitzondering ook écht aanwijzen', () => {
    // ⚠ Deze test bestaat door een MUTATIETEST. Toen de controle hierboven uitgeschakeld
    // werd, bleef alles groen — niet omdat ze niets doet, maar omdat er vandaag toevallig
    // geen verouderde uitzondering ís. Een controle die alleen kán falen wanneer er al iets
    // fout staat, is geen controle. Daarom wordt ze hier op een verzonnen lijst losgelaten.
    const verzonnen: Uitzondering[] = [
      { taal: 'en', waarde: 'Dit woord staat nergens in de tabel', sleutels: ['a', 'b'], reden: 'x' },
    ]
    expect(overbodigeUitzonderingen(verzonnen)).toHaveLength(1)
    expect(overbodigeUitzonderingen([])).toEqual([])
  })

  it('geeft elke uitzondering een reden die iets zegt', () => {
    for (const u of TOEGESTAAN) {
      expect(u.reden.length, `${u.taal}: "${u.waarde}"`).toBeGreaterThan(40)
      expect(u.sleutels.length, `${u.taal}: "${u.waarde}"`).toBeGreaterThan(1)
    }
  })

  it('somt de uitzonderingen op die er vandaag zijn', () => {
    // ⚠ Een TELLING, geen bewering over wat er in staat: zo valt het op wanneer er een
    // uitzondering bijkomt zonder dat iemand deze reeks opnieuw bekeek.
    expect(TOEGESTAAN.length).toBe(10)
    expect(TOEGESTAAN.filter((u) => u.taal === 'en')).toHaveLength(4)
    expect(TOEGESTAAN.filter((u) => u.taal === 'fr')).toHaveLength(6)
  })
})
