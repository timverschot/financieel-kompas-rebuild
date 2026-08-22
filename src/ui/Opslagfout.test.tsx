import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Opslagfout } from './Opslagfout'

describe('Opslagfout', () => {
  it('toont niets zolang er niets misging', () => {
    const { container } = render(<Opslagfout fout="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('meldt zich als alert, met de techniek eronder', () => {
    render(<Opslagfout fout="DataError: geweigerd" />)
    const melding = screen.getByRole('alert')
    expect(melding).toHaveTextContent('Opslaan is niet gelukt. Je invoer staat er nog.')
    expect(melding).toHaveTextContent('Technische melding: DataError: geweigerd')
  })

  it('laat de zin aanpassen aan wat er misging', () => {
    // Bij een kruisje klopt "je invoer staat er nog" niet.
    render(<Opslagfout fout="DataError" zin="Er is niets verwijderd." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Er is niets verwijderd.')
  })

  it('vervangt die zin bij een volle opslag', () => {
    render(<Opslagfout fout="QuotaExceededError" zin="Er is niets verwijderd." />)
    expect(screen.getByRole('alert')).toHaveTextContent('De opslag van dit toestel zit vol')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Er is niets verwijderd.')
  })
})
