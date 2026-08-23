import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Herkomstregel } from './Herkomstregel'

// Ronde 69. BalansRegel, BufferRegel en VermogenRegel hadden alle drie dezelfde acht
// regels opmaak staan. Deze tests bewaken wat die drie van deze component verwachten.
describe('Herkomstregel', () => {
  it('zet de badge en de zin naast elkaar op een eigen kaartvlak', () => {
    const { container } = render(
      <Herkomstregel badge="Overschot" toon="ok">
        Je houdt deze maand € 100,00 over.
      </Herkomstregel>,
    )
    expect(screen.getByText('Overschot')).toHaveClass('badge', 'badge-ok')
    expect(screen.getByText('Je houdt deze maand € 100,00 over.')).toHaveClass('rij-meta')
    expect(container.querySelector('.kaart.kaart-compact')).not.toBeNull()
  })

  it('tekent kaal geen eigen kaartvlak', () => {
    // In het kengetallenblok van het Overzicht staan er drie onder elkaar; daar zou
    // elk een eigen kaartje precies de rommeligheid geven die er weg moest.
    const { container } = render(
      <Herkomstregel badge="3 maanden buffer" toon="info" kaal>
        Je vaste lasten zijn € 500,00 per maand.
      </Herkomstregel>,
    )
    expect(container.querySelector('.kaart')).toBeNull()
  })

  it('geeft data-attributen door', () => {
    // De App-test zoekt deze blokken op hun rol, niet op een zichtbare tekst.
    const { container } = render(
      <Herkomstregel badge="Tekort" toon="let-op" data-balans="1">
        Je geeft meer uit dan er binnenkomt.
      </Herkomstregel>,
    )
    expect(container.querySelector('[data-balans]')).not.toBeNull()
  })

  it('blijft een rij en geen kolom', () => {
    // `.kaart` is in index.css een flex-KOLOM. Zonder deze richting kwam de badge
    // bovenop de tekst te staan in plaats van ernaast.
    const { container } = render(
      <Herkomstregel badge="Netto vermogen € 0,00" toon="neutraal">
        Je rekeningen staan op € 0,00.
      </Herkomstregel>,
    )
    const blok = container.querySelector('.kaart') as HTMLElement
    expect(blok.style.flexDirection).toBe('row')
  })
})
