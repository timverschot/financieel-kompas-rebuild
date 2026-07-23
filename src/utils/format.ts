export function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(bedrag)
}
