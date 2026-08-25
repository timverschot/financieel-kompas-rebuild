import { describe, it, expect } from 'vitest'
import {
  ANALYSE_KAART_IDS,
  kaartLabel,
  keurVerborgenKaarten,
  kiesbareKaarten,
  toontKaart,
  wisselKaart,
  type AnalyseKaartId,
} from './analysekaarten'

const ALLES = { subcategorie: true, winkel: true, gezinslid: true }

describe('ANALYSE_KAART_IDS', () => {
  it('bevat de hoofdcategoriekaart NIET', () => {
    // Die is waarvoor het tabblad bestaat. Kan je ze uitzetten, dan hou je een leeg
    // tabblad over — dezelfde veiligheidsregel als bij APP_ONDERDELEN in ronde 75.
    expect(ANALYSE_KAART_IDS).not.toContain('hoofdcategorie' as AnalyseKaartId)
    expect(ANALYSE_KAART_IDS).toEqual(['subcategorie', 'winkel', 'gezinslid'])
  })
})

describe('kaartLabel', () => {
  it('noemt de winkelkaart bij inkomsten een BRON', () => {
    // De kaart zelf heet daar "Inkomsten per bron": je loon komt niet van een winkel.
    expect(kaartLabel('winkel', 'uitgave')).toBe('Per winkel')
    expect(kaartLabel('winkel', 'inkomst')).toBe('Per bron')
  })

  it('laat de twee andere namen ongemoeid', () => {
    for (const richting of ['uitgave', 'inkomst'] as const) {
      expect(kaartLabel('subcategorie', richting)).toBe('Per subcategorie')
      expect(kaartLabel('gezinslid', richting)).toBe('Per gezinslid')
    }
  })

  it('draagt exact het kopwoord van de kaart die de chip bedient', () => {
    // "Per winkel" ↔ "Uitgaven per winkel", "Per gezinslid" ↔ "Uitgaven per
    // gezinslid". Wijkt dit af, dan zegt de chip iets anders dan de kaart eronder.
    expect('Uitgaven per winkel').toContain(kaartLabel('winkel', 'uitgave').toLowerCase())
    expect('Inkomsten per bron').toContain(kaartLabel('winkel', 'inkomst').toLowerCase())
    expect('Verdeling per subcategorie').toContain(kaartLabel('subcategorie', 'uitgave').toLowerCase())
    expect('Uitgaven per gezinslid').toContain(kaartLabel('gezinslid', 'uitgave').toLowerCase())
  })
})

describe('toontKaart', () => {
  it('toont standaard alles', () => {
    for (const id of ANALYSE_KAART_IDS) expect(toontKaart(id, [])).toBe(true)
  })

  it('verbergt wat in de lijst staat, en alleen dat', () => {
    expect(toontKaart('winkel', ['winkel'])).toBe(false)
    expect(toontKaart('subcategorie', ['winkel'])).toBe(true)
  })
})

describe('wisselKaart', () => {
  it('zet een zichtbare kaart uit en weer aan', () => {
    const uit = wisselKaart([], 'winkel')
    expect(uit).toEqual(['winkel'])
    expect(wisselKaart(uit, 'winkel')).toEqual([])
  })

  it('laat de andere kaarten met rust', () => {
    expect(wisselKaart(['winkel'], 'gezinslid')).toEqual(['winkel', 'gezinslid'])
  })

  it('verandert de meegegeven lijst niet', () => {
    const begin: AnalyseKaartId[] = ['winkel']
    wisselKaart(begin, 'gezinslid')
    expect(begin).toEqual(['winkel'])
  })
})

describe('kiesbareKaarten', () => {
  it('geeft een chip aan elke kaart waarvoor er iets te tonen is', () => {
    expect(kiesbareKaarten(ALLES)).toEqual(['subcategorie', 'winkel', 'gezinslid'])
  })

  it('laat een kaart zonder gegevens weg', () => {
    // Een schakelaar voor iets wat er toch niet kan staan, is een knop die niets doet.
    expect(kiesbareKaarten({ ...ALLES, gezinslid: false })).toEqual(['subcategorie', 'winkel'])
  })

  it('geeft niets terug wanneer er nergens gegevens voor zijn', () => {
    // Op een verse app blijft het hele blok dan weg.
    expect(kiesbareKaarten({ subcategorie: false, winkel: false, gezinslid: false })).toEqual([])
  })

  it('houdt de vaste volgorde aan', () => {
    expect(kiesbareKaarten({ subcategorie: true, winkel: false, gezinslid: true })).toEqual([
      'subcategorie',
      'gezinslid',
    ])
  })
})

describe('keurVerborgenKaarten', () => {
  it('leest een geldige lijst', () => {
    expect(keurVerborgenKaarten(['winkel', 'gezinslid'])).toEqual(['winkel', 'gezinslid'])
  })

  it('gooit onbekende namen weg', () => {
    // Een voorkeur van een oudere versie mag geen kaart wegdrukken die vandaag
    // anders heet.
    expect(keurVerborgenKaarten(['winkel', 'iets-ouds', 'hoofdcategorie'])).toEqual(['winkel'])
  })

  it('ontdubbelt', () => {
    expect(keurVerborgenKaarten(['winkel', 'winkel'])).toEqual(['winkel'])
  })

  it('valt bij onzin terug op "niets verborgen"', () => {
    // ⚠ De veilige kant op: bij twijfel TOONT de app alles.
    expect(keurVerborgenKaarten(null)).toEqual([])
    expect(keurVerborgenKaarten('winkel')).toEqual([])
    expect(keurVerborgenKaarten([1, 2, 3])).toEqual([])
    expect(keurVerborgenKaarten({ winkel: true })).toEqual([])
  })
})
