import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { STANDAARD_SORTERING, sorteerTransacties, volgendeSortering } from './transactieSorteer'

const tx = (id: string, datum: string, omschrijving: string, bedrag: number): Transactie => ({
  id,
  datum,
  omschrijving,
  bedrag,
  rekeningId: 'r1',
})

const lijst = [
  tx('a', '2026-07-05', 'Colruyt', -3000),
  tx('b', '2026-07-20', 'Aldi', -90000),
  tx('c', '2026-07-05', 'Zeeman', 2000),
]

const namen = (l: Transactie[]) => l.map((t) => t.omschrijving)

describe('sorteerTransacties', () => {
  it('zet standaard de nieuwste bovenaan', () => {
    expect(namen(sorteerTransacties(lijst, STANDAARD_SORTERING))).toEqual(['Aldi', 'Colruyt', 'Zeeman'])
  })

  it('draait om naar oudste eerst', () => {
    expect(namen(sorteerTransacties(lijst, { veld: 'datum', oplopend: true }))).toEqual(['Zeeman', 'Colruyt', 'Aldi'])
  })

  it('sorteert op grootte van het bedrag, niet op teken', () => {
    // Een uitgave van € 900 hoort bovenaan te staan wanneer je op bedrag sorteert,
    // niet onderaan omdat ze negatief is.
    expect(namen(sorteerTransacties(lijst, { veld: 'bedrag', oplopend: false }))).toEqual(['Aldi', 'Colruyt', 'Zeeman'])
    expect(namen(sorteerTransacties(lijst, { veld: 'bedrag', oplopend: true }))).toEqual(['Zeeman', 'Colruyt', 'Aldi'])
  })

  it('sorteert op handelaar van A naar Z en terug', () => {
    expect(namen(sorteerTransacties(lijst, { veld: 'omschrijving', oplopend: true }))).toEqual(['Aldi', 'Colruyt', 'Zeeman'])
    expect(namen(sorteerTransacties(lijst, { veld: 'omschrijving', oplopend: false }))).toEqual(['Zeeman', 'Colruyt', 'Aldi'])
  })

  it('geeft bij gelijke waarden altijd dezelfde volgorde', () => {
    // Twee boekingen van dezelfde dag en hetzelfde bedrag: zonder tiebreaker zou
    // de onderlinge volgorde bij elke herlaad kunnen wisselen (de fout van ronde 19).
    const gelijk = [tx('x', '2026-07-05', 'Bakker', -1000), tx('y', '2026-07-05', 'Bakker', -1000)]
    const een = sorteerTransacties(gelijk, { veld: 'bedrag', oplopend: false }).map((t) => t.id)
    const twee = sorteerTransacties([...gelijk].reverse(), { veld: 'bedrag', oplopend: false }).map((t) => t.id)
    expect(een).toEqual(twee)
  })

  it('laat de invoerlijst ongemoeid', () => {
    const kopie = [...lijst]
    sorteerTransacties(lijst, { veld: 'bedrag', oplopend: true })
    expect(lijst).toEqual(kopie)
  })
})

describe('volgendeSortering', () => {
  it('draait dezelfde kolom om', () => {
    expect(volgendeSortering({ veld: 'datum', oplopend: false }, 'datum')).toEqual({ veld: 'datum', oplopend: true })
  })

  it('kiest bij een nieuwe kolom de richting die je bijna altijd wil', () => {
    // Datum en bedrag: grootste/nieuwste eerst. Namen: van A naar Z.
    expect(volgendeSortering({ veld: 'datum', oplopend: true }, 'bedrag')).toEqual({ veld: 'bedrag', oplopend: false })
    expect(volgendeSortering({ veld: 'datum', oplopend: true }, 'omschrijving')).toEqual({
      veld: 'omschrijving',
      oplopend: true,
    })
  })
})
