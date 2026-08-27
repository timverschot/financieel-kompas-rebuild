// Wanneer is een PERCENTAGE nog een zinvol getal? (ronde 104)
//
// ⚠ WAAROM DIT BESTAAT. Op drie plaatsen in de app stond dezelfde fout, en ze zag er
// telkens anders uit:
//
//  - **De spaarquote.** De lege staat hing aan `inkomsten === 0`. Eén regel statiegeld van
//    € 0,25 binnen een boodschappenticket van € 1.240 maakte dat vals, en dan stond er
//    **"−496000%"** op het scherm, met een balk eronder.
//  - **De besparingskaart.** `vorig > 0 ? Math.round((verschil / vorig) * 100) : null`. Het
//    commentaar erboven zei terecht dat "oneindig procent meer" misleidend is en ving
//    daarom nul af — maar vijftig cent is even misleidend: € 0,50 vorige maand tegenover
//    € 400 deze maand gaf **"+79900%"**.
//  - **Het plan-oordeel op Vooruitblik.** "Kent de app je inkomsten?" hing aan
//    `verwachteInkomsten > 0`. Dezelfde 25 cent statiegeld zette dat op ja, en dan stond
//    er een groot rood bedrag "te verdelen" dat volledig door die 25 cent bepaald werd.
//
// ⚠ WAT HIER BEWUST NIET ONDER VALT: het belletje. Een budget van € 5 waarvan je € 400
// uitgaf meldt **"8000%"**, en dat is lelijk maar niet zinloos — een budget is een getal
// dat JIJ zelf gekozen hebt, dus "veertig keer over je grens" is precies de mededeling.
// Bij de drie gevallen hierboven is de deler een gemeten bedrag dat toevallig klein
// uitviel. Het belletje staat op de lijst als smaakkwestie, niet als fout.
//
// WAAR DE REGEL WEL GELDT: de spaarquote (`utils/vooruitblik.ts`), de besparingskaart
// (`utils/besparen.ts`) en het plan-oordeel (`components/PlanRegels.tsx`).
//
// ⚠ HET IS EEN KEUZE, GEEN FEIT — en ze staat hier op één plek zodat de drie schermen niet
// uit elkaar lopen. Een percentage vergelijkt twee getallen; het is pas een percentage
// waard wanneer die twee in dezelfde orde van grootte liggen. De grens ligt op een TIENDE.
// Daaronder zegt de app liever niets dan een getal dat volledig door een teruggave van
// 25 cent bepaald wordt — en het BEDRAG ernaast blijft altijd staan, want dat klopt wel.

/** Hoeveel keer de basis minstens in de waarde mag passen vóór het percentage ruis wordt. */
export const VERHOUDINGSGRENS = 10

/**
 * En hoe klein de basis zelf mag zijn, in centen (ronde 106).
 *
 * ⚠ DE VERHOUDING ALLEEN WAS NIET GENOEG. Ze vangt "klein tegenover groot" (€ 0,25 tegenover
 * € 1.240) en laat "klein tegenover klein" gewoon door: één bakkersbon van € 2,00 met een
 * statiegeldregel van € 0,25 erin heeft een verhouding van 9 en gaf **"−800%"**. Dezelfde
 * lege maand, dezelfde onzin, één cijfer minder.
 *
 * En een verhoudingsgrens KÁN dat niet oplossen, want dezelfde verhouding is elders wél
 * zinvol: € 1.000 inkomsten tegenover € 9.000 uitgaven geeft óók −800%, en dáár is het
 * precies wat je wil weten. Wat de twee gevallen onderscheidt is niet de verhouding maar
 * hoe klein de deler is.
 *
 * ⚠ EEN KEUZE, GEEN FEIT — en bewust LAAG gezet. Tien euro is klein genoeg dat een gewone
 * vergelijking blijft staan (€ 30 vorige maand tegenover € 45 deze maand is "+50%", en dat
 * hoort er te staan), en groot genoeg dat kleingeld geen percentage meer krijgt. Hoger
 * zetten zou echte vergelijkingen doen zwijgen.
 */
export const BASISDREMPEL = 1000

/**
 * Is een percentage van `waarde` ten opzichte van `basis` zinvol?
 *
 * `basis` is waar je door deelt (de inkomsten, het bedrag van vorige maand, het budget);
 * `waarde` is waarmee je vergelijkt (de uitgaven, het bedrag van deze maand, het verbruik).
 */
export function percentageZinvol(basis: number, waarde: number): boolean {
  return basis >= BASISDREMPEL && basis * VERHOUDINGSGRENS >= waarde
}
