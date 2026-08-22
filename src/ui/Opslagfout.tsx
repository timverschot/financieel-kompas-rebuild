import { useT } from '../i18n'
import { opslagFoutTekst } from './opslagpoging'

/**
 * Het meldingsblokje: eerst wat het voor jou betekent, daaronder de technische
 * melding.
 *
 * ⚠ `role="alert"` en geen `role="status"`: dit gaat over iets wat misging ná een
 * handeling van de gebruiker, en dat hoort meteen voorgelezen te worden. Het blokje
 * MAG hier wél pas bij de fout verschijnen — de huisregel dat een live-regel er
 * altijd moet staan, geldt voor `status`, niet voor `alert` (zie index.css).
 *
 * ⚠ De techniek staat eronder en niet ertussen. Een Engelse foutcode midden in een
 * Nederlandse zin laat de lezer afhaken vóór hij bij het belangrijkste komt: dat
 * zijn invoer er nog staat.
 */
export function Opslagfout({ fout, zin }: { fout: string; zin?: string }) {
  const { t } = useT()
  if (fout === '') return null
  return (
    <div role="alert" style={{ margin: 0 }}>
      <p className="foutregel" style={{ fontWeight: 600 }}>
        {opslagFoutTekst(t, fout, zin ?? t('Opslaan is niet gelukt. Je invoer staat er nog.'))}
      </p>
      <p className="rij-meta" style={{ margin: '2px 0 0' }}>
        {t('Technische melding: {fout}', { fout })}
      </p>
    </div>
  )
}
