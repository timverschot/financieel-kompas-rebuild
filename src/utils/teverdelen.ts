import type { Budget, TerugkerendePost } from '../data/schema'
import { regelHoortBijBudget } from './budget'
import { teltAlsVasteLastInMaand } from './vastelast'

/**
 * Wanneer "van je inkomen staat {bedrag} nog nergens ondergebracht" kan liegen
 * (ronde 80).
 *
 * WAT DE APP WIL ZEGGEN. De Budget-pagina rekende al uit wat er te verdelen valt
 * (inkomsten min vaste lasten min wat je opzijzet) en zei daarna los daarvan "je
 * budgetten vragen samen € 400 hiervan". Twee halve zinnen, en de aftrekking die
 * je zelf moest maken — precies het getal waar je op stuurt — stond nergens.
 *
 * ⚠ MAAR DIE AFTREKKING KAN DUBBEL TELLEN, en deze module bestaat daarvoor. Een
 * vaste last gaat er één keer af als vaste last. Zet je óók een budget op de
 * categorie waar die kost onder valt — een budget van € 900 op "Wonen" terwijl je
 * huur van € 850 daar ook onder hangt — dan kan diezelfde huur er een tweede keer
 * afgaan via dat budget.
 *
 * ⚠ "KAN", EN NIET "GAAT". Een nakijkronde wees erop dat de eerste versie hier te
 * stellig was. Bedoelde je die € 900 als grens op je hele woonkost, dán telt de
 * huur twee keer. Bedoelde je er de kleine dingen mee die naast de huur nog op
 * Wonen komen, dan klopt alles. En zelfs in het eerste geval is de overlap hoogstens
 * het kleinste van de twee bedragen: met een budget van € 50 op Wonen kan er nooit
 * € 850 dubbel staan. De app kan het verschil niet weten, dus ze corrigeert niets —
 * ze zegt gewoon dat het na te kijken valt. Verzinnen is erger dan vertellen.
 *
 * ⚠ ALLEEN de posten die DEZE maand vervallen, en de reden is niet wat ik er eerst
 * bij schreef. Ik had genoteerd dat een budget "er deze maand niets van vangt" —
 * maar dat gaat over VERBRUIK (`uitgavenInMaand` telt boekingen), en de dubbeltelling
 * hier zit in het PLAN: `opzij` en het budgetbedrag gaan allebei van je inkomen af,
 * of er nu iets geboekt is of niet. De echte reden is een keuze: een maandbudget is
 * zelden bedoeld om een opbouw voor een kost van volgend jaar te dekken, en die
 * melding elf maanden per jaar tonen zou meer ruis dan hulp zijn. Het bedrag onder
 * "Opzij voor later" gaat wél gewoon van het cijfer af.
 */
export function vasteLastenInEenBudget(
  posten: readonly TerugkerendePost[],
  geldendeBudgetten: readonly Budget[],
  maand: string,
): TerugkerendePost[] {
  return posten.filter((p) => {
    // ⚠ Hetzelfde predicaat als `plancijfers` gebruikt voor "Vaste lasten deze maand"
    // (utils/vastelast.ts), en geen handmatige kopie van dezelfde drie voorwaarden.
    // Anders waarschuwt deze module ooit over een kost die in het cijfer waarover ze
    // waarschuwt niet eens meetelt.
    if (!teltAlsVasteLastInMaand(p, maand)) return false
    // ⚠ GEEN aparte controle op een ontbrekende categorie, hoe verleidelijk ook. Ik
    // had er eerst één staan, tot ik `regelHoortBijBudget` naliep: zonder categorie
    // geeft die op alle drie de budgetniveaus al `false` — een itembudget via zijn
    // eigen tak, een middenbudget omdat `itemPerId('')` niets vindt, en een hoofd- of
    // eigen budget omdat een lege categorie oprolt naar de lege groep `''` terwijl een
    // budget-id nooit leeg is (`z.string().min(1)`). Een controle die niets kan
    // uitsluiten is dode code (les van ronde 73) — en dode code die er belangrijk
    // uitziet, is de ergste soort.
    return geldendeBudgetten.some((b) => regelHoortBijBudget(p.categorieId, b.categorieId))
  })
}
