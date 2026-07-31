import type { Transactie } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'

export type CategorieBedrag = { categorieId?: string; bedrag: number }

// Geeft de (categorie, bedrag)-regels van een transactie. Bij een gesplitste
// transactie zijn dat de deelregels; anders één regel met het hele bedrag.
//
// BELANGRIJK: élke telling, grafiek en budget hoort dit te gebruiken. Zo wordt een
// splitsing overal correct uitgesplitst en telt niets ooit dubbel op de
// moedertransactie (een bekende valkuil uit v1).
export function categorieBedragen(t: Transactie): CategorieBedrag[] {
  if (t.regels && t.regels.length > 0) {
    const lijnen = t.regels.map((r) => ({ categorieId: r.categorieId, bedrag: r.bedrag }))
    // Dekt de itemisatie niet het volledige totaal, dan telt het restbedrag mee
    // als 'zonder categorie', zodat de som van de regels altijd het totaal is.
    //
    // Maar ALLEEN wanneer die rest dezelfde kant op wijst als de transactie zelf.
    // Verdelen de regels MEER dan het totaal (een typfout: een ticket van € 50 met
    // regels van € 40 en € 20), dan draait de rest van teken om, en dan zou hier
    // een INKOMST verschijnen die nooit bestaan heeft — met als gevolg te hoge
    // bruto-uitgaven, te hoge bruto-inkomsten, een schijf "Zonder categorie" in de
    // inkomstendonut en een verkeerde spaarquote. Het maandsaldo klopte toevallig
    // wel, dus je zag er niets van.
    //
    // Het formulier laat zo'n ticket sinds ronde 35 niet meer opslaan. Deze
    // controle is het vangnet voor wat er al in de database staat: dan zijn de
    // REGELS wat de gebruiker per categorie heeft ingetikt, en is het totaal het
    // getal dat niet klopt. Een verzonnen tegenboeking maakt dat alleen erger.
    const som = lijnen.reduce((s, r) => s + r.bedrag, 0)
    const rest = t.bedrag - som
    // `t.bedrag === 0` telt hier NIET als "zelfde richting" (ronde 35). Stond het
    // totaal op nul met regels van −€ 40 en −€ 20, dan kwam er een verzonnen
    // inkomst van € 60 "Zonder categorie" bij: het maandsaldo klopte, maar je bruto
    // inkomsten én je bruto uitgaven waren allebei € 60 te hoog, en er stond een
    // schijf in de inkomstendonut die nooit bestaan heeft. Precies wat de rest van
    // deze functie juist wegneemt.
    const zelfdeRichting = rest === 0 || Math.sign(rest) === Math.sign(t.bedrag)
    if (rest !== 0 && zelfdeRichting) {
      lijnen.push({ categorieId: undefined, bedrag: rest })
      return lijnen
    }
    if (rest === 0) return lijnen

    // Hier klopt het ticket écht niet: de regels verdelen méér dan het totaal.
    //
    // Eerst lieten we de rest gewoon vallen. Dat maakte de spookinkomst weg, maar
    // brak iets anders: de regels telden dan op tot € 60 terwijl er € 50 van de
    // rekening ging. Je maandoverzicht zei −€ 60,00, je rekeningsaldo −€ 50,00, en
    // een budget van € 55 stond onterecht in het rood. Twee cijfers over hetzelfde
    // die niet meer op elkaar aansloten — precies wat we nergens willen.
    //
    // Wat het wél moet doen: het bedrag dat écht van de rekening ging is heilig,
    // en de verdeling die de gebruiker intikte is zijn bedoeling. Dus houden we
    // het totaal vast en verdelen we het náár verhouding over dezelfde regels. Een
    // ticket van € 50 met regels van € 40 en € 20 wordt € 33,33 en € 16,67: de
    // verhouding klopt, het totaal klopt, en er verschijnt geen categorie die de
    // gebruiker nooit gekozen heeft.
    //
    // Het formulier laat zo'n ticket sinds ronde 35 niet meer opslaan; dit is het
    // vangnet voor wat er al in de database staat of van een ander toestel
    // binnenkomt.
    if (som === 0) return [{ categorieId: undefined, bedrag: t.bedrag }]
    // `+ 0` haalt de min weg van een uitkomst als `-0`: die formatteert namelijk
    // als "€ -0,00", en dat is geen bedrag dat iemand hoort te zien.
    const geschaald = lijnen.map((r) => ({ ...r, bedrag: Math.round((r.bedrag * t.bedrag) / som) + 0 }))
    // Afronden per regel laat hooguit een paar centen over. Die leggen we op de
    // grootste regel, zodat de som exact het transactiebedrag is.
    //
    // Wel met één voorwaarde: die regel mag er niet van omslaan van teken. Bij heel
    // scheve gegevens (bedrag −3 cent verdeeld over vijf regels van −1 cent) werd
    // een regel anders +1 cent — een verzonnen inkomst van één cent, precies het
    // soort spookregel dat deze hele functie wegneemt. Lukt het bij de grootste
    // niet, dan schuiven we door naar de volgende die het wél kan hebben.
    let restNaSchalen = t.bedrag - geschaald.reduce((s, r) => s + r.bedrag, 0)
    if (restNaSchalen !== 0) {
      const volgorde = geschaald
        .map((_, i) => i)
        .sort((a, b) => Math.abs(geschaald[b].bedrag) - Math.abs(geschaald[a].bedrag))
      for (const i of volgorde) {
        if (restNaSchalen === 0) break
        const nieuw = geschaald[i].bedrag + restNaSchalen
        // Toegestaan zolang het teken niet omslaat (nul mag: dat is geen richting).
        if (geschaald[i].bedrag !== 0 && nieuw !== 0 && Math.sign(nieuw) !== Math.sign(geschaald[i].bedrag)) continue
        geschaald[i] = { ...geschaald[i], bedrag: nieuw + 0 }
        restNaSchalen = 0
      }
      // Kan geen enkele regel de rest dragen zonder om te slaan, dan is het ticket
      // zo scheef dat een aparte restregel het eerlijkst is: dan zie je tenminste
      // dát er iets niet klopt in plaats van een stil verschoven bedrag.
      if (restNaSchalen !== 0) geschaald.push({ categorieId: undefined, bedrag: restNaSchalen })
    }
    return geschaald
  }
  return [{ categorieId: t.categorieId, bedrag: t.bedrag }]
}

export type TransactieGroep = {
  sleutel: string
  naam: string
  kleur: string | null
  icoon: string | null
  bedrag: number
}

// De deelregels van een transactie opgerold naar hun hoofdcategorie, met per
// groep het opgetelde bedrag, gesorteerd van groot naar klein (op absolute
// grootte). Zo kan de transactielijst tonen: "🍽️ Voeding € 41,20 · 🧹 Huishouden
// € 12,60", en kan ze het icoon van de belangrijkste groep gebruiken.
export function groepenVanTransactie(
  t: Transactie,
  gebruikerCategorieen: { id: string; naam: string }[],
): TransactieGroep[] {
  const per = new Map<string, TransactieGroep>()
  for (const regel of categorieBedragen(t)) {
    const g = groepVanCategorie(regel.categorieId, gebruikerCategorieen)
    const bestaand = per.get(g.sleutel)
    if (bestaand) bestaand.bedrag += regel.bedrag
    else per.set(g.sleutel, { sleutel: g.sleutel, naam: g.naam, kleur: g.kleur, icoon: g.icoon, bedrag: regel.bedrag })
  }
  return [...per.values()].sort((a, b) => Math.abs(b.bedrag) - Math.abs(a.bedrag))
}

// Is dit een gesplitst kassaticket, d.w.z. verdeeld over meer dan één categorie?
// Enkel dan verdient het het winkelkar-icoon.
export function isGesplitstOverCategorieen(
  t: Transactie,
  gebruikerCategorieen: { id: string; naam: string }[],
): boolean {
  return groepenVanTransactie(t, gebruikerCategorieen).length > 1
}

/**
 * Geef een boeking een categorie, ook wanneer ze gesplitst is.
 *
 * Waarom dit niet gewoon `{ ...tx, categorieId }` mag zijn. Zodra een transactie
 * REGELS heeft, negeert `categorieBedragen` het kopveld volledig — het bedrag zit
 * dan in de regels. Het kopveld invullen leverde daardoor een boeking op die in de
 * categorielijst verscheen zonder er één cent aan bij te dragen, terwijl de rij in
 * de maandafsluiting bleef staan omdat er nog altijd een regel zonder categorie was.
 * Je kon dus eindeloos kiezen zonder dat er iets veranderde.
 *
 * Wat er wél gebeurt bij een gesplitst ticket:
 *  - elke regel die nog geen categorie heeft, krijgt deze;
 *  - dekt de som van de regels het totaal niet, dan komt er een regel bij voor het
 *    restant — precies het bedrag dat `categorieBedragen` anders als 'zonder
 *    categorie' zou tellen.
 *
 * Het restant krijgt alleen een eigen regel wanneer het dezelfde kant op wijst als
 * het totaal. Wijst het de andere kant op, dan is het totaal het getal dat niet
 * klopt (zie de uitleg in `categorieBedragen`), en dan zou een extra regel die fout
 * enkel vastleggen.
 */
export function vulCategorieAan(tx: Transactie, categorieId: string): Transactie {
  if (!tx.regels || tx.regels.length === 0) return { ...tx, categorieId }

  const regels = tx.regels.map((r) => (r.categorieId ? r : { ...r, categorieId }))
  const som = regels.reduce((s, r) => s + r.bedrag, 0)
  const rest = tx.bedrag - som
  const zelfdeRichting = (rest > 0 && tx.bedrag > 0) || (rest < 0 && tx.bedrag < 0)
  if (rest !== 0 && zelfdeRichting) regels.push({ categorieId, bedrag: rest })
  return { ...tx, regels }
}
