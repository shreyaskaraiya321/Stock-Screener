/**
 * Indian Number System & Financial Formatters
 */

/**
 * Format a number into Indian currency format (e.g., ₹1,23,456.78)
 */
export function formatINR(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '₹0.00';
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  const parts = absVal.toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] !== undefined ? `.${parts[1]}` : '';

  // Indian numbering: last 3 digits, then groups of 2
  let result = '';
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${withCommas},${lastThree}`;
  } else {
    result = integerPart;
  }

  return `${isNegative ? '-' : ''}₹${result}${decimalPart}`;
}

/**
 * Format Market Cap in Crores (Cr) (e.g., ₹12,450.50 Cr or ₹1.25 L Cr)
 */
export function formatMarketCap(valInCrores: number | null | undefined): string {
  if (valInCrores === null || valInCrores === undefined || isNaN(valInCrores)) return '₹0 Cr';

  if (valInCrores >= 100000) {
    // 1 Lakh Crore+
    const lakhCr = valInCrores / 100000;
    return `₹${lakhCr.toFixed(2)}L Cr`;
  }

  // Format with Indian grouping
  const formatted = formatINR(valInCrores, valInCrores >= 1000 ? 0 : 1).replace('₹', '');
  return `₹${formatted} Cr`;
}

/**
 * Abbreviate Volume as K, L (Lakhs), or Cr (Crores)
 */
export function formatVolume(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 10000000) {
    // 1 Crore = 10,000,000
    return `${sign}${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    // 1 Lakh = 100,000
    return `${sign}${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)} K`;
  }
  return `${sign}${abs.toLocaleString('en-IN')}`;
}

/**
 * Format Percent with sign (+1.25% or -0.50%)
 */
export function formatPercent(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(decimals)}%`;
}

/**
 * Format standard numeric metric
 */
export function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return val.toFixed(decimals);
}
