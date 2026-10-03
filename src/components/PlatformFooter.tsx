"use client";

import { useDictionary } from "@/i18n/locale-provider";

export default function PlatformFooter() {
  const dict = useDictionary();
  return (
    <footer className="border-t border-line px-6 py-5">
      <p className="mx-auto max-w-[1200px] text-[10px] text-faint">© {new Date().getFullYear()} UniCore · {dict.adm.footer}</p>
    </footer>
  );
}
