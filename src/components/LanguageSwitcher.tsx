"use client";

import { useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { locales } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { locale, dict, setLocale } = useLocale();

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={dict.common.language.chooseLanguage}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-accent"
      >
        <Languages size={15} />
        <span>{dict.common.language[locale]}</span>
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-8 z-30 w-40 rounded-lg border border-ink bg-surface p-1.5">
          {locales.map((option) => (
            <button
              type="button"
              role="menuitem"
              key={option}
              onClick={() => { setLocale(option); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-accent-soft hover:text-accent"
            >
              <span>{dict.common.language[option]}</span>
              {option === locale && <Check size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
