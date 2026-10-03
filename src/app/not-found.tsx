"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { secondaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";

export default function NotFound() {
  const t = useDictionary().common.errors;
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border border-line bg-surface p-6 sm:p-8">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent"><SearchX size={20} /></span>
        <p className="mt-4 text-sm font-medium text-accent">404</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{t.notFoundTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t.notFoundBody}</p>
        <Link href="/" className={`${secondaryButton} mt-6`}>{t.goHome}</Link>
      </section>
    </main>
  );
}
