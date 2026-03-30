/**
 * Format a points value for display.
 * Whole numbers show without a decimal  → 5.0  becomes "5"
 * Half-point values keep their decimal  → 4.5  stays  "4.5"
 */
export function formatPoints(value) {
  const n = parseFloat(value);
  if (isNaN(n)) return '--';
  return n % 1 === 0 ? String(Math.round(n)) : String(n);
}
