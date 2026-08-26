import { describe, it, expect } from 'vitest'
import { verkeerdGetagdeBoekingen } from './verkeerdgetagd'
import { itemPerId, midPerId, stelCategorieboomIn } from '../data/categorieen/zoek'
import type { Transactie, TransactieRegel } from '../data/schema'

// "Brood (wit)" hangt onder Voeding › Broodwaren. Uit de boom gehaald en niet
// overgeschreven, zodat deze tests niet omvallen wanneer die ooit verhuist.
const BROOD = 'i-brood--wit-9238'
const brood = itemPerId(BROOD)!

const tx = (regels: TransactieRegel[], over: Partial<Transactie> = {}): Transactie => ({
  id: 't1',
  datum: '2026-03-05',
  omschrijving: 'Colruyt',
  bedrag: -1250,
  rekeningId: 'r1',
  regels,
  ...over,
})

/** Eén ticketregel met de naam van "Brood (wit)" op een opgegeven categorie. */
const regel = (categorieId: string, omschrijving = brood.naam): TransactieRegel => ({
  categorieId,
  omschrijving,
  bedrag: -250,
})

describe('verkeerdGetagdeBoekingen — de kern', () => {
  it('vindt de fout van ronde 78: een subcategorienaam onder een ándere hoofdcategorie', () => {
    // ⚠ Dit is letterlijk wat er gebeurde: je koos "Brood (wit)" op een ticketregel, en
    // één tik op de knop "Hoofdcategorie" verving die keuze door Drank. De omschrijving
    // bleef staan.
    const t = tx([regel('ov-drank')])
    const uit = verkeerdGetagdeBoekingen([t])
    expect(uit).toHaveLength(1)
    expect(uit[0].item.id).toBe(BROOD)
    expect(uit[0].omschrijving).toBe(brood.naam)
    expect(uit[0].transactie).toBe(t)
    expect(uit[0].regelIndex).toBe(0)
  })

  it('noemt de laag waarop de regel NU staat', () => {
    const uit = verkeerdGetagdeBoekingen([tx([regel('ov-drank')])])
    expect(uit[0].staatOp).toBe('Drank')
    expect(uit[0].isMiddenlaag).toBe(false)
  })

  it('noemt bij een middencategorie ook de hoofdcategorie erboven', () => {
    // "Voeding › Broodwaren" leest ondubbelzinnig; "Broodwaren" alleen niet.
    const mid = midPerId('cat-frisdrank')
    const uit = verkeerdGetagdeBoekingen([tx([regel('cat-frisdrank')])])
    expect(uit).toHaveLength(1)
    expect(uit[0].staatOp).toBe(`${mid!.hoofdNaam} › ${mid!.naam}`)
    expect(uit[0].isMiddenlaag).toBe(true)
  })
})

describe('verkeerdGetagdeBoekingen — wanneer ze ZWIJGT', () => {
  it('zwijgt over een regel die al op een subcategorie staat', () => {
    expect(verkeerdGetagdeBoekingen([tx([regel(BROOD)])])).toEqual([])
  })

  it('zwijgt over DEZELFDE hoofdcategorie, ook via een andere middencategorie', () => {
    // ⚠ Grover is niet FOUT. De Analyse en de donut groeperen op HOOFDcategorie, dus
    // "Brood (wit)" onder Voeding telt daar precies goed mee. Zou de app hier klagen, dan
    // stond er een lijst met dingen die niets mankeren — en dat was mijn eerste opzet.
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-voeding')])])).toEqual([])
    expect(verkeerdGetagdeBoekingen([tx([regel('cat-broodwaren')])])).toEqual([])
    expect(verkeerdGetagdeBoekingen([tx([regel('cat-zuivel-en-kaas')])])).toEqual([])
  })

  it('zwijgt wanneer de regel heet naar de LAAG waar ze op staat', () => {
    // ⚠ Wie zijn regel noemt naar de map waar hij in zit, heeft hem niet verkeerd gelegd —
    // ook al bestaat er ergens anders in de boom toevallig een subcategorie die zo heet.
    //
    // ⚠ EN DIT IS GEEN THEORIE. In de ingebouwde boom heet de middencategorie
    // "Sparen & Investeren › Buffer persoonlijk" precies zoals een subcategorie onder
    // "Inkomsten › Rendement en Vermogen". Wie elke maand "Buffer persoonlijk" boekt op
    // de categorie die zo heet — de meest correcte invoer die er bestaat — kreeg zonder
    // deze regel elke keer een vermoeden dat naar Inkomsten wees.
    const mid = midPerId('cat-buffer-persoonlijk')!
    expect(verkeerdGetagdeBoekingen([tx([regel('cat-buffer-persoonlijk', mid.naam)])])).toEqual([])
    // En zonder die regel WÉL: dezelfde naam op een willekeurige andere laag.
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', mid.naam)])])).toHaveLength(1)
  })

  it('zwijgt over een EIGEN hoofdcategorie', () => {
    // ⚠ Die laag heb je zelf gemaakt om er dingen op te zetten, en een ingebouwd item
    // hangt er per definitie nooit onder. Zonder deze regel werd élke boeking op een eigen
    // hoofdcategorie gemeld zodra haar omschrijving toevallig een subcategorienaam is.
    stelCategorieboomIn([], [{ id: 'eigen-1', naam: 'Vakantie 2026' }])
    try {
      expect(verkeerdGetagdeBoekingen([tx([regel('eigen-1')])])).toEqual([])
      // Ter controle dat de boom écht omgezet is: een ingebouwde laag meldt nog wel.
      expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank')])])).toHaveLength(1)
    } finally {
      // ⚠ Het register is module-globaal; laat het achter zoals je het vond, anders
      // beïnvloedt deze test elke volgende.
      stelCategorieboomIn([], [])
    }
  })

  it('zwijgt wanneer TWEE subcategorieën zo heten', () => {
    // ⚠ Geen theorie: "Strijkdienst" hangt in de ingebouwde boom onder twee takken. Welke
    // van de twee je bedoelde, is niet af te leiden.
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', 'Strijkdienst')])])).toEqual([])
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', 'Reisverzekering')])])).toEqual([])
  })

  it('zwijgt over een omschrijving die naar niets heet', () => {
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', 'Zomaar iets')])])).toEqual([])
  })

  it('eist een EXACTE naam, geen gedeeltelijke en geen synoniem', () => {
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', `${brood.naam} 800g`)])])).toEqual([])
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', 'brood')])])).toEqual([])
    for (const syn of brood.synoniemen) {
      expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', syn)])])).toEqual([])
    }
  })

  it('trekt zich niets aan van hoofdletters en spaties eromheen', () => {
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', `  ${brood.naam.toUpperCase()} `)])])).toHaveLength(1)
  })

  it('zwijgt over een lege omschrijving en over een regel zonder categorie', () => {
    expect(verkeerdGetagdeBoekingen([tx([regel('ov-drank', '   ')])])).toEqual([])
    expect(verkeerdGetagdeBoekingen([tx([{ omschrijving: brood.naam, bedrag: -250 }])])).toEqual([])
    expect(verkeerdGetagdeBoekingen([tx([{ categorieId: 'ov-drank', bedrag: -250 }])])).toEqual([])
  })

  it('zwijgt over een categorie die de app niet kent', () => {
    expect(verkeerdGetagdeBoekingen([tx([regel('bestaat-niet')])])).toEqual([])
  })

  it('zwijgt over een lege lijst en over een boeking zonder regels', () => {
    expect(verkeerdGetagdeBoekingen([])).toEqual([])
    expect(
      verkeerdGetagdeBoekingen([
        { id: 't1', datum: '2026-03-05', omschrijving: brood.naam, bedrag: -250, rekeningId: 'r1', categorieId: 'ov-drank' },
      ]),
    ).toEqual([])
  })

  it('kijkt NIET naar de handelaarsnaam van een gewone boeking', () => {
    // ⚠ Dat veld heet op het scherm "Handelaar / winkel", en de fout van ronde 78 zat in
    // `ItemZoeker` — dat staat op precies één plek: de ticketregels. Een handelaarsnaam
    // tegen subcategorienamen leggen leverde ruis op die niets met ronde 78 te maken had.
    const t = tx([regel('ov-voeding', 'Zomaar iets')], { omschrijving: brood.naam, categorieId: 'ov-drank' })
    expect(verkeerdGetagdeBoekingen([t])).toEqual([])
  })
})

describe('verkeerdGetagdeBoekingen — meerdere regels en de volgorde', () => {
  it('kijkt PER REGEL', () => {
    const t = tx([
      { omschrijving: brood.naam, categorieId: 'ov-drank', bedrag: -250 },
      // ⚠ Een regel die op zijn eigen hoofdcategorie staat: die hoort te zwijgen.
      { omschrijving: 'Cola', categorieId: 'ov-drank', bedrag: -180 },
    ])
    const uit = verkeerdGetagdeBoekingen([t])
    expect(uit).toHaveLength(1)
    expect(uit[0].regelIndex).toBe(0)
  })

  it('kan meerdere regels van dezelfde boeking melden', () => {
    const t = tx([regel('ov-drank'), regel('ov-vervoer-en-mobiliteit')])
    expect(verkeerdGetagdeBoekingen([t]).map((v) => v.regelIndex)).toEqual([0, 1])
  })

  it('houdt de volgorde van de lijst aan', () => {
    const a = tx([regel('ov-drank')], { id: 'a' })
    const b = tx([regel('ov-vervoer-en-mobiliteit')], { id: 'b' })
    expect(verkeerdGetagdeBoekingen([a, b]).map((v) => v.transactie.id)).toEqual(['a', 'b'])
  })

  it('verandert niets aan wat je erin stopt', () => {
    const t = tx([regel('ov-drank')])
    const kopie = JSON.parse(JSON.stringify(t))
    verkeerdGetagdeBoekingen([t])
    expect(t).toEqual(kopie)
  })
})
