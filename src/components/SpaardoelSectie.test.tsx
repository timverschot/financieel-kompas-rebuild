import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SpaardoelSectie } from './SpaardoelSectie'
import type { Spaardoel } from '../data/schema'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

describe('SpaardoelSectie', () => {
  it('voegt een manueel spaardoel toe met bedragen in centen', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Buffer')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '3000')
    await user.type(screen.getByLabelText('Huidig bedrag (€)'), '1500')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }),
    )
  })

  it('toont een voortgangsbalk voor een bestaand doel', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }
    render(
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )
    expect(screen.getByRole('progressbar', { name: 'Buffer' })).toBeInTheDocument()
  })
})
