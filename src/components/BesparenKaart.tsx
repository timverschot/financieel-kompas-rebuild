import type { Transactie } from '../data/schema'
import { uitgavenPerBesparingsdomein } from '../utils/besparen'
import type { Periode } from '../utils/analyse'
import { Kaart, Leeg, Bedrag, Balk } from '../ui/basis'
import { useT } from '../i18n'

// "Waar kan je besparen?" — dezelfde uitgaven, maar door een andere bril.
//
// De ranglijst per hoofdcategorie zegt wáár je geld heen gaat; dit blok zegt waar
// er doorgaans het meeste te wínnen valt. Vier vaste domeinen (boodschappen,
// energie, telecom, verzekeringen), elk met één concrete tip. Vaste volgorde, want
// het is een checklist en geen ranglijst.
//
// De kleuren komen uit hetzelfde object als de bedragen (utils/besparen.ts), nooit
// uit een losse kleurenlijst — zo kan een balk niet bij het verkeerde cijfer horen.
export function BesparenKaart({ transacties, periode }: { transacties: Transactie[]; periode: Periode }) {
  const { t } = useT()
  const domeinen = uitgavenPerBesparingsdomein(transacties, periode)
  const hoogste = Math.max(...domeinen.map((d) => d.bedrag), 0)
  const totaal = domeinen.reduce((s, d) => s + d.bedrag, 0)

  return (
    <Kaart
      titel={t('Waar kan je besparen?')}
      bijschrift={t('De vier domeinen waar voor een gezin doorgaans het meeste te winnen valt.')}
    >
      {totaal === 0 ? (
        <Leeg>
          {t('Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten.')}
        </Leeg>
      ) : (
        <ul className="lijst">
          {domeinen.map((d, i) => (
            <li
              key={d.sleutel}
              className="rij"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, ...(i === domeinen.length - 1 ? { borderBottom: 'none' } : {}) }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: d.kleur }} />
                <span className="rij-midden">
                  <span className="rij-titel">{t(d.naam)}</span>
                  <span className="rij-meta">{t(d.tip)}</span>
                </span>
                <Bedrag centen={d.bedrag} />
              </span>
              {/* De balk is relatief t.o.v. het zwaarste domein: zo zie je in één
                  oogopslag welk van de vier het meeste weegt. */}
              <Balk
                label={t(d.naam)}
                fractie={hoogste > 0 ? d.bedrag / hoogste : 0}
                nu={d.bedrag}
                max={hoogste}
                kleur={d.kleur}
              />
            </li>
          ))}
        </ul>
      )}
    </Kaart>
  )
}
