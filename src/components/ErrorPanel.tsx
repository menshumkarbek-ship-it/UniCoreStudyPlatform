"use client";

import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { primaryButton, secondaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";

/** Fallback shown by the error boundaries: what happened, a retry, and a way home. */
export default function ErrorPanel({ error, retry, fullPage = false }: { error?: Error & { digest?: string }; retry?: () => void; fullPage?: boolean }) {
  const t = useDictionary().common.errors;
  // Client-side failures (e.g. "temporarily unavailable" from the API) carry a readable message. Server errors are
  // replaced by Next.js with a generic one that has a digest, so those get the standard text plus the reference.
  const detail = error && !error.digest && error.message ? error.message : t.body;
  return (
    <div className={fullPage ? "flex min-h-screen items-center justify-center bg-canvas px-4 py-10" : "w-full"}>
      <section role="alert" className="w-full max-w-xl rounded-lg border border-line bg-surface p-6 sm:p-8">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-lg bg-blush text-obsidian"><AlertTriangle size={20} /></span>
        <h1 className="mt-4 text-2xl font-bold text-ink">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {retry && <button type="button" onClick={retry} className={primaryButton}><RotateCw size={16} />{t.tryAgain}</button>}
          <Link href="/" className={secondaryButton}>{t.goHome}</Link>
        </div>
        {error?.digest && <p className="mt-5 text-xs text-faint">{t.reference} {error.digest}</p>}
      </section>
    </div>
  );
}
