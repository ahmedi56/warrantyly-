/** Input checks for product details. They mirror the database so a saved value can never be rejected during sync. */

/** A real calendar date in YYYY-MM-DD form. `new Date('2026-02-31')` silently becomes 3 March, and the database rejects it. */
export const isValidISO = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
};

/** Accepts "699", "699.50", "699,50", "1 299" and "1,299.50"; returns undefined for anything else. */
export function parsePrice(input: string): number | undefined {
  let s = input.replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return undefined;
  const n = Number(s);
  return n < 1e10 ? n : undefined; // database column is numeric(12, 2)
}

/** Warranty lengths the confirm screen offers, in months. */
export const WARRANTY_MONTH_CHOICES = [6, 12, 18, 24, 36, 48, 60];
