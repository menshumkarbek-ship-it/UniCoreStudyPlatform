import "server-only";

import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import type en from "@/i18n/dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/i18n/dictionaries/en.json").then((module) => module.default),
  ru: () => import("@/i18n/dictionaries/ru.json").then((module) => module.default),
  ky: () => import("@/i18n/dictionaries/ky.json").then((module) => module.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const load = dictionaries[locale] ?? dictionaries[defaultLocale];
  return load();
}
