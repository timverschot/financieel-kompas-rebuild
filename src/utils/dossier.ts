import type { Dossier, GedeeldeKost } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'

// Bepaalt het effectieve percentage dat JIJ voor één kost draagt, volgens de
// verdeel-hiërarchie: een eigen percentage op de kost wint, anders een percentage
// dat per categorie is ingesteld op het dossier (waarbij een kost op een
// subcategorie/item oprolt naar haar hoofdcategorie), en anders de dossier-standaard.
export function effectiefAandeel(dossier: Dossier, kost: GedeeldeKost): number {
  if (typeof kost.aandeelJijOverride === 'number') return kost.aandeelJijOverride
  const splits = dossier.categorieAandelen
  if (kost.categorieId && splits) {
    if (kost.categorieId in splits) return splits[kost.categorieId]
    const groep = groepVanCategorie(kost.categorieId, []).sleutel
    if (groep && groep in splits) return splits[groep]
  }
  return dossier.aandeelJij
}

// Zuivere kern: netto verrekening voor een reeks kosten, waarbij het percentage
// per kost bepaald wordt door 'aandeelVan'. Bedragen in centen; er wordt pas op
// het einde afgerond, zodat tussentijdse deel-centen de uitkomst niet laten
// afdrijven. Positief = partner is jou verschuldigd, negatief = jij de partner.
function netto(kosten: GedeeldeKost[], aandeelVan: (k: GedeeldeKost) => number): number {
  let som = 0
  for (const k of kosten) {
    const jouwAandeel = k.bedrag * (aandeelVan(k) / 100)
    const partnerAandeel = k.bedrag - jouwAandeel
    if (k.betaaldDoor === 'jij') {
      // Jij betaalde alles, maar hoefde maar jouw aandeel te dragen -> partner
      // is jou zijn deel verschuldigd.
      som += partnerAandeel
    } else {
      // Partner betaalde alles -> jij bent jouw aandeel verschuldigd.
      som -= jouwAandeel
    }
  }
  return Math.round(som)
}

// Verrekening met één vast percentage voor alle kosten (de eenvoudige variant).
export function saldoVerrekening(aandeelJij: number, kosten: GedeeldeKost[]): number {
  return netto(kosten, () => aandeelJij)
}

// Verrekening voor een volledig dossier, waarbij elke kost zijn effectieve
// percentage krijgt volgens de hiërarchie (kost-override -> categorie -> standaard).
export function saldoVerrekeningDossier(dossier: Dossier, kosten: GedeeldeKost[]): number {
  return netto(kosten, (k) => effectiefAandeel(dossier, k))
}
