/**
 * Formate un montant numérique selon une devise et une locale.
 *
 * @param amount Montant numérique (ex: 12.5)
 * @param currency Code ISO de la devise (défaut: 'EUR')
 * @param locale Locale BCP 47 (défaut: 'fr-FR')
 */
export function formatCurrency(
  amount: number,
  currency = 'EUR',
  locale = 'fr-FR'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `0,00 ${currency}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Formate une date ISO en chaîne lisible pour les commandes et réservations.
 */
export function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  },
  locale = 'fr-FR'
): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return isoDate;
  }
}
