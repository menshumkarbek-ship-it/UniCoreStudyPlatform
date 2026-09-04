"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { localeCookieName } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: React.ReactNode }) {
  const router = useRouter();

  const setLocale = useCallback((nextLocale: Locale) => {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${maxAge}; SameSite=Lax`;
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ locale, dict, setLocale }), [locale, dict, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within a LocaleProvider");
  return context;
}

export function useDictionary() {
  return useLocale().dict;
}
