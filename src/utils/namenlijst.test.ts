import { describe, it, expect } from 'vitest'
import { namenlijst, MAX_NAMEN } from './namenlijst'

// De vertaler van de test: geeft de sleutel terug met de parameters ingevuld, net
// zoals `vertaal` dat voor het Nederlands doet.
const t = (sleutel: string, params?: Record<string, string | number>) =>
  sleutel.replace(/\{(\w+)\}/g, (heel, naam) => String(params?.[naam] ?? heel))

describe('namenlijst', () => {
  it('somt tot en met de grens alles gewoon op', () => {
    expect(namenlijst(t, ['Huur', 'Water'])).toBe('Huur, Water')
    expect(namenlijst(t, ['a', 'b', 'c'].slice(0, MAX_NAMEN))).toBe('a, b, c')
  })

  it('vat de rest samen zodra er meer namen zijn dan de grens', () => {
    expect(namenlijst(t, ['Huur', 'Water', 'Gas', 'Internet', 'Verzekering'])).toBe(
      'Huur, Water, Gas en 2 andere',
    )
  })

  it('telt wat er wegvalt in plaats van het stil af te kappen', () => {
    // Stil afkappen zou lezen als "dit is alles" — en dan mist de gebruiker posten
    // zonder dat iets hem dat vertelt.
    const uit = namenlijst(t, ['a', 'b', 'c', 'd'])
    expect(uit).toContain('1 andere')
  })

  it('geeft één naam kaal terug', () => {
    expect(namenlijst(t, ['Huur'])).toBe('Huur')
  })

  it('geeft een lege lijst als lege tekst terug', () => {
    expect(namenlijst(t, [])).toBe('')
  })
})
