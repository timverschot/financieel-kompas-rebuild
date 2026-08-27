import { describe, it, expect, beforeEach } from 'vitest'
import {
  GEMELD_SLEUTEL,
  HOOGSTENS_ONTHOUDEN,
  leesGemeld,
  nogNietGemeld,
  onthoudGemeld,
  type GeweigerdeRegel,
} from './geweigerdeRegels'

// Ronde 100. Timothy synchroniseerde met Google Drive, kreeg de melding over één
// geweigerde regel, klikte ze weg, drukte F5 — en ze stond er weer. *"En verder kan ik
// ook niets doen."* Allebei klopte het: een geweigerde regel komt nooit in het eigen
// logboek, dus elke ronde telt haar opnieuw, en het wegklikken leefde in `useState`.

const regel = (over: Partial<GeweigerdeRegel> = {}): GeweigerdeRegel => ({
  id: 'r1',
  tijdstip: 1_700_000_000_000,
  reden: 'te-oud',
  ...over,
})

beforeEach(() => {
  localStorage.clear()
})

describe('leesGemeld', () => {
  it('geeft een lege verzameling zonder opslag', () => {
    expect(leesGemeld().size).toBe(0)
  })

  it('leest terug wat er onthouden is', () => {
    onthoudGemeld(['a', 'b'])
    expect([...leesGemeld()].sort()).toEqual(['a', 'b'])
  })

  it('houdt eerdere id\'s vast bij een tweede keer onthouden', () => {
    // ⚠ Anders zou de tweede geweigerde regel de eerste wissen, en kwam die eerste
    // melding gewoon weer terug — precies wat deze ronde moest wegnemen.
    onthoudGemeld(['a'])
    onthoudGemeld(['b'])
    expect([...leesGemeld()].sort()).toEqual(['a', 'b'])
  })

  it('valt terug op niets bij kapotte opslag', () => {
    // ⚠ Bij twijfel MELDEN. Dan zegt de app iets te veel in plaats van iets te weinig, en
    // dat is bij een waarschuwing over geld de goede kant om op te vallen.
    localStorage.setItem(GEMELD_SLEUTEL, '{geen json')
    expect(leesGemeld().size).toBe(0)
  })

  it('negeert een bewaarde waarde die geen lijst van teksten is', () => {
    localStorage.setItem(GEMELD_SLEUTEL, JSON.stringify({ a: 1 }))
    expect(leesGemeld().size).toBe(0)
    localStorage.setItem(GEMELD_SLEUTEL, JSON.stringify(['a', 42, null, 'b']))
    expect([...leesGemeld()].sort()).toEqual(['a', 'b'])
  })

  it('kapt de lijst af zodat localStorage niet volloopt', () => {
    // ⚠ Zonder bovengrens groeit deze lijst voor altijd, in een opslag die ze deelt met
    // het Drive-token. Loopt die vol, dan mislukt het bewaren daar STIL — en dan komt de
    // melding weer eeuwig terug. De oudste id's vallen als eerste weg: die worden dan
    // hoogstens één keer te veel gemeld, en dat is de goede kant om op te vallen.
    onthoudGemeld(Array.from({ length: HOOGSTENS_ONTHOUDEN + 10 }, (_, i) => `id-${i}`))
    const gemeld = leesGemeld()
    expect(gemeld.size).toBe(HOOGSTENS_ONTHOUDEN)
    expect(gemeld.has('id-0')).toBe(false)
    expect(gemeld.has(`id-${HOOGSTENS_ONTHOUDEN + 9}`)).toBe(true)
  })

  it('overleeft een browser die opslag weigert', () => {
    const stuk = {
      getItem: () => {
        throw new Error('geweigerd')
      },
      setItem: () => {
        throw new Error('geweigerd')
      },
    }
    expect(leesGemeld(stuk).size).toBe(0)
    expect(() => onthoudGemeld(['a'], stuk)).not.toThrow()
  })
})

describe('nogNietGemeld', () => {
  it('geeft alles terug wanneer er nog niets gemeld is', () => {
    expect(nogNietGemeld([regel(), regel({ id: 'r2' })]).map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('laat weg wat al gemeld is', () => {
    onthoudGemeld(['r1'])
    expect(nogNietGemeld([regel(), regel({ id: 'r2' })]).map((r) => r.id)).toEqual(['r2'])
  })

  it('zwijgt volledig wanneer alles al gemeld is', () => {
    // ⚠ DIT IS DE KERN VAN DE RONDE. Dezelfde geweigerde regel komt bij élke
    // synchronisatie opnieuw langs — ze wordt immers nooit in het logboek opgenomen.
    // Zonder deze regel kwam de melding na élke herlaadbeurt terug, voor altijd.
    onthoudGemeld(['r1'])
    expect(nogNietGemeld([regel()])).toEqual([])
  })

  it('meldt wél opnieuw zodra er een NIEUWE regel bij komt', () => {
    // ⚠ En dat is de andere helft: stilvallen mag nooit betekenen "nooit meer iets zeggen".
    onthoudGemeld(['r1'])
    expect(nogNietGemeld([regel(), regel({ id: 'r9' })]).map((r) => r.id)).toEqual(['r9'])
  })

  it('kijkt naar het ID en niet naar het AANTAL', () => {
    // ⚠ Een teller kan niet zien of het om dezelfde regel gaat. Eén oude regel die elke
    // ronde terugkomt en één nieuwe geweigerde regel geven allebei "1" — en juist dat
    // verschil is waar het hier om draait.
    onthoudGemeld(['r1'])
    expect(nogNietGemeld([regel({ id: 'r2' })]).length).toBe(1)
    expect(nogNietGemeld([regel({ id: 'r1' })]).length).toBe(0)
  })
})
