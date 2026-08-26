import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopDrie } from './TopDrie'
import type { CategorieUitgave } from '../utils/overzicht'

// Ronde 96 — het getal onder de donut telde CATEGORIEËN en zei "uitgaven".
//
// ⚠ `posten` is `CategorieUitgave[]`: één ingang per (hoofd)categorie, met haar totaal.
// De knop zei "Bekijk alle 12 uitgaven in Analyse ›" terwijl er driehonderd boekingen in
// twaalf categorieën konden zitten. Dat het Engelse label toevallig wél `expense
// categories` zei, bewees dat de twee kanten uit elkaar gelopen waren.
//
// ⚠ Dit is de derde struikelblok van Timothy: NIET WETEN WAT EEN GETAL BETEKENT. Een
// aantal dat een ander ding telt dan het woord ernaast noemt, is geen slordigheid maar
// een verkeerd antwoord op de enige vraag die de gebruiker stelt.

const posten = (aantal: number): CategorieUitgave[] =>
  Array.from({ length: aantal }, (_, i) => ({
    sleutel: `cat-${i}`,
    naam: `Categorie ${i + 1}`,
    bedrag: (aantal - i) * 1000,
    kleur: null,
  }))

describe('TopDrie — het getal op de knop telt categorieën', () => {
  it('noemt ze ook categorieën, en niet uitgaven', () => {
    render(<TopDrie posten={posten(12)} onAlles={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Bekijk alle 12 uitgavencategorieën in Analyse ›' }),
    ).toBeInTheDocument()
    // ⚠ POSITIEF ÉN NEGATIEF. Zonder de eerste regel bewaakt de tweede niets (een knop die
    // helemaal verdwijnt, zegt "uitgaven" ook niet meer).
    expect(screen.queryByRole('button', { name: /12 uitgaven in Analyse/ })).toBeNull()
  })

  it('doet hetzelfde aan de inkomstenkant', () => {
    render(<TopDrie posten={posten(5)} richting="inkomst" onAlles={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Bekijk alle 5 inkomstencategorieën in Analyse ›' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /5 inkomsten in Analyse/ })).toBeNull()
  })

  it('telt élke categorie, niet alleen de drie die je ziet', () => {
    // ⚠ De lijst toont er drie; het getal hoort over de VOLLEDIGE lijst te gaan, want de
    // knop brengt je naar alles. Zou iemand `top.length` gebruiken, dan stond er altijd 3.
    render(<TopDrie posten={posten(9)} onAlles={vi.fn()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /alle 9 uitgavencategorieën/ })).toBeInTheDocument()
  })

  it('laat het getal weg zodra je alles al ziet', () => {
    // Met drie of minder is er niets meer "erbij"; dan zou een aantal alleen ruis zijn.
    render(<TopDrie posten={posten(3)} onAlles={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Bekijk je uitgaven in Analyse ›' })).toBeInTheDocument()
  })
})
