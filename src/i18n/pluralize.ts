/**
 * Simple count-aware pluralization helper.
 *
 * - Russian ("ru") uses the standard three-form rule (one / few / many).
 * - English ("en") uses two forms (singular / plural).
 * - Kyrgyz ("ky") nouns do not inflect after a numeral, so the first form
 *   is always used regardless of count.
 */
import type { Locale } from "@/i18n/config";

export type PluralForms = [one: string, few: string, many: string] | [singular: string, plural: string, plural2?: string];

function russianForm(count: number): 0 | 1 | 2 {
  const remainder10 = count % 10;
  const remainder100 = count % 100;
  if (remainder10 === 1 && remainder100 !== 11) return 0;
  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) return 1;
  return 2;
}

export function pluralize(locale: Locale, count: number, forms: readonly string[]): string {
  if (locale === "ru") return forms[russianForm(Math.abs(count))] ?? forms[0];
  if (locale === "ky") return forms[0];
  return Math.abs(count) === 1 ? forms[0] : (forms[1] ?? forms[0]);
}

export function formatCount(locale: Locale, count: number, forms: readonly string[]): string {
  return `${count} ${pluralize(locale, count, forms)}`;
}
