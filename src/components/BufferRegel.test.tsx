import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Rekening, TerugkerendePost } from '../data/schema'
import { BufferRegel } from './BufferRegel'

const spaar: Rekening = { id: 'sp', naam: 'Spaar', beginsaldo: 500000, type: 'spaar' }
const betaal: Rekening = { id: 'bt', naam: 'Zicht', beginsaldo: 300000, type: 'betaal' }
const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'bt', dag: 3 }

function toon(rekeningen: Rekening[], posten: TerugkerendePost[]) {
  render(
    <BufferRegel
      rekeningen={rekeningen}
      transacties={[]}
      overboekingen={[]}
      terugkerendePosten={posten}
      waarderingen={[]}
      vandaagISO="2026-07-15"
    />,
  )
}

describe('BufferRegel', () => {
  it('toont hoeveel maanden je toekomt, met de cijfers erachter', () => {
    toon([spaar], [huur])
    // € 5.000 / € 950 = 5,26 → naar beneden op één decimaal: 5,2.
    expect(screen.getByText('5,2 maanden buffer')).toBeInTheDocument()
    expect(screen.getByText(/Je vaste lasten zijn € 950,00 per maand/)).toBeInTheDocument()
    expect(screen.getByText(/Met € 5.000,00 op je spaar- en cashrekeningen/)).toBeInTheDocument()
  })

  it('waarschuwt bij een krappe buffer van minder dan drie maanden', () => {
    const klein: Rekening = { ...spaar, beginsaldo: 150000 }
    toon([klein], [huur])
    expect(screen.getByText('1,5 maanden buffer').className).toContain('badge-laat')
  })

  it('blijft rustig bij een ruime buffer', () => {
    toon([spaar], [huur])
    expect(screen.getByText('5,2 maanden buffer').className).toContain('badge-info')
  })

  it('gebruikt het enkelvoud bij exact één maand', () => {
    // € 950 spaargeld tegenover € 950 vaste lasten = precies 1 maand.
    toon([{ ...spaar, beginsaldo: 95000 }], [huur])
    expect(screen.getByText('1 maand buffer')).toBeInTheDocument()
  })

  it('zet de badge naast de tekst, niet erboven', () => {
    toon([spaar], [huur])
    const regel = document.querySelector('[data-buffer]') as HTMLElement
    expect(regel.style.flexDirection).toBe('row')
  })

  it('zwijgt zonder spaar- of cashrekening', () => {
    toon([betaal], [huur])
    expect(document.querySelector('[data-buffer]')).toBeNull()
  })

  it('zwijgt zonder vaste lasten', () => {
    toon([spaar], [])
    expect(document.querySelector('[data-buffer]')).toBeNull()
  })
})
