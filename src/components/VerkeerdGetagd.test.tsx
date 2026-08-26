import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerkeerdGetagd } from './VerkeerdGetagd'
import { itemPerId } from '../data/categorieen/zoek'
import type { Transactie, TransactieRegel } from '../data/schema'

const BROOD = 'i-brood--wit-9238'
const brood = itemPerId(BROOD)!

const regel = (categorieId = 'ov-drank', omschrijving = brood.naam, bedrag = -250): TransactieRegel => ({
  categorieId,
  omschrijving,
  bedrag,
})

const tx = (regels: TransactieRegel[], over: Partial<Transactie> = {}): Transactie => ({
  id: 't1',
  datum: '2026-03-05',
  omschrijving: 'Colruyt',
  bedrag: -1250,
  rekeningId: 'r1',
  regels,
  ...over,
})

/** Eén boeking met één foute ticketregel. */
const fout = (over: Partial<Transactie> = {}) => tx([regel()], over)

function toon(transacties: Transactie[], onBekijk = vi.fn()) {
  render(<VerkeerdGetagd transacties={transacties} categorieen={[]} subcategorieen={[]} onBekijk={onBekijk} />)
  return onBekijk
}

async function openLijst() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Toon de lijst' }))
  return user
}

describe('VerkeerdGetagd (ronde 87)', () => {
  it('staat er NIET wanneer er niets te melden valt', () => {
    // ⚠ Een blok dat op een schoon huishouden "alles in orde" roept, is precies het "te
    // veel op één scherm" waar de rondes 75 en 81 vanaf wilden.
    const { container } = render(
      <VerkeerdGetagd transacties={[tx([regel('ov-voeding')])]} categorieen={[]} subcategorieen={[]} onBekijk={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('zegt waar dit vandaan komt, zodat je niet denkt dat het nog steeds gebeurt', () => {
    toon([fout()])
    expect(screen.getByText(/uit een oudere versie van de app/)).toBeInTheDocument()
  })

  it('zegt wat het KOST, niet alleen dat er iets is', () => {
    // Timothy's derde struikelblok: niet weten wat een getal betekent.
    toon([fout()])
    expect(screen.getByRole('status').textContent).toMatch(/in je Analyse, in de donut en in elk budget daarop/)
  })

  it('zet die zin in een live-gebied dat er ALTIJD staat', () => {
    // ⚠ Zet je een regel recht, dan verdwijnt die rij en zakt het getal. Zonder live-gebied
    // gebeurt dat volkomen geruisloos — en een `role="status"` die pas mét zijn tekst
    // verschijnt, wordt vaak niet voorgelezen (les van ronde 56).
    toon([fout()])
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('telt BOEKINGEN, niet regels', () => {
    // ⚠ Eén kassaticket met twee foute regels is één boeking. "2 boekingen" zeggen terwijl
    // er één onder staat, is de telfout-familie van ronde 69.
    toon([tx([regel(), regel('ov-vervoer-en-mobiliteit')])])
    const zin = screen.getByRole('status').textContent ?? ''
    expect(zin).toMatch(/^Eén boeking heeft een ticketregel/)
    expect(zin).toContain('Samen gaat het om 2 regels.')
  })

  it('zegt het aantal regels NIET wanneer dat hetzelfde is als het aantal boekingen', () => {
    toon([fout({ id: 'a' }), fout({ id: 'b' })])
    const zin = screen.getByRole('status').textContent ?? ''
    expect(zin).toMatch(/^2 boekingen hebben een ticketregel/)
    expect(zin).not.toContain('Samen gaat het om')
  })

  it('houdt de lijst dicht tot je hem opent', async () => {
    toon([fout()])
    expect(screen.queryByText(/De subcategorie die zo heet/)).toBeNull()
    const knop = screen.getByRole('button', { name: 'Toon de lijst' })
    expect(knop).toHaveAttribute('aria-expanded', 'false')
    await openLijst()
    expect(screen.getByText(/De subcategorie die zo heet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verberg de lijst' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('noemt de LAAG bij naam, niet alleen de categorie', async () => {
    // "Drank" alleen zegt een twaalfjarige niet of dat groot of klein is.
    toon([fout()])
    await openLijst()
    expect(screen.getByText(/Staat nu in de hoofdcategorie Drank\./)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`hangt onder ${brood.hoofdNaam} › ${brood.categorieNaam}`))).toBeInTheDocument()
  })

  it('zegt "categorie" bij een middencategorie en "hoofdcategorie" bij een hoofdcategorie', async () => {
    toon([tx([regel('cat-frisdrank')])])
    await openLijst()
    expect(screen.getByText(/Staat nu in de categorie Drank › Frisdrank\./)).toBeInTheDocument()
  })

  it('BIEDT GEEN HERSTELKNOP AAN — dat was Timothy\'s voorwaarde', async () => {
    // ⚠ De app kan niet weten wat je bedoelde. Eén knop, en die OPENT alleen.
    toon([fout()])
    await openLijst()
    expect(screen.getAllByRole('button').map((k) => k.textContent)).toEqual([
      'Verberg de lijst',
      'Boeking openen',
    ])
  })

  it('opent de juiste boeking', async () => {
    const a = fout({ id: 'a' })
    const onBekijk = toon([tx([regel('ov-voeding')], { id: 'schoon' }), a])
    const user = await openLijst()
    await user.click(screen.getByRole('button', { name: /^Boeking openen/ }))
    expect(onBekijk).toHaveBeenCalledWith(a)
  })

  it('geeft twee gemelde regels van HETZELFDE ticket elk een eigen knopnaam', async () => {
    // ⚠ Datum en handelaar zijn dan gelijk, en de twee regels kunnen ook nog gelijk heten.
    // Zonder het regelnummer droegen die twee knoppen exact dezelfde naam (huisregel
    // sinds ronde 66) — en ze roepen bovendien dezelfde handler aan.
    toon([tx([regel(), regel('ov-vervoer-en-mobiliteit')])])
    await openLijst()
    const namen = screen.getAllByRole('button', { name: /^Boeking openen/ }).map((k) => k.getAttribute('aria-label'))
    expect(namen).toHaveLength(2)
    expect(new Set(namen).size).toBe(2)
    for (const n of namen) expect(n?.startsWith('Boeking openen')).toBe(true)
    expect(namen[0]).toContain('regel 1')
    expect(namen[1]).toContain('regel 2')
  })

  it('toont het bedrag van die REGEL, niet van het hele ticket', async () => {
    toon([tx([regel('ov-voeding', 'Zomaar iets', -3750), regel('ov-drank', brood.naam, -250)], { bedrag: -4000 })])
    await openLijst()
    const rij = within(document.querySelector('.lijst li') as HTMLElement)
    expect(rij.getByText(/regel 2/).textContent).toContain('2,50')
    expect(rij.getByText(/regel 2/).textContent).not.toContain('40,00')
  })

  it('toont er hoogstens tien, en zegt hoeveel het er zijn', async () => {
    // ⚠ Wie er vijftig heeft, kreeg anders vijf schermen tekst bóven zijn eigen lijst —
    // en stille afkapping leest als "dit is alles".
    const veel = Array.from({ length: 12 }, (_, i) => fout({ id: `t${i}` }))
    toon(veel)
    const user = await openLijst()
    expect(screen.getAllByRole('button', { name: /^Boeking openen/ })).toHaveLength(10)
    expect(screen.getByText(/Hier staan de eerste 10 van 12\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toon alle 12' }))
    expect(screen.getAllByRole('button', { name: /^Boeking openen/ })).toHaveLength(12)
    expect(screen.queryByText(/Hier staan de eerste/)).toBeNull()
  })

  it('kapt niet af zolang er tien of minder zijn', async () => {
    toon(Array.from({ length: 10 }, (_, i) => fout({ id: `t${i}` })))
    await openLijst()
    expect(screen.queryByText(/Hier staan de eerste/)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Toon alle/ })).toBeNull()
  })
})
