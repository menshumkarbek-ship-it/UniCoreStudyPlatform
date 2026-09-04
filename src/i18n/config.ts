export type Locale = "en" | "ru" | "ky";

export const locales: Locale[] = ["en", "ru", "ky"];

export const defaultLocale: Locale = "en";

export const localeCookieName = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as string[]).includes(value);
}
