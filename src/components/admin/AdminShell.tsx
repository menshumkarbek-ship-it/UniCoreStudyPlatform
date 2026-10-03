"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, KeyRound, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import PlatformFooter from "@/components/PlatformFooter";
import ThemeToggle from "@/components/ThemeToggle";
import { SessionProvider, signOut } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import type { SessionUser } from "@/lib/auth";

export default function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const dict = useDictionary();
  const linkClass = (active: boolean) => `flex h-16 items-center gap-1.5 border-b-2 px-3 text-[11px] font-medium transition ${active ? "border-periwinkle text-ink" : "border-transparent text-muted hover:text-ink"}`;
  return (
    <SessionProvider user={user}>
      <div className="flex min-h-screen flex-col bg-canvas text-ink">
        <header className="sticky top-0 z-20 border-b border-line bg-surface shadow-[var(--nav-glow)]">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/admin"><Logo caption={dict.auth.platformAdmin} /></Link>
            <nav className="flex items-center">
              <Link href="/admin" className={linkClass(pathname === "/admin" || pathname.startsWith("/admin/universities"))}><Building2 size={14} /><span className="hidden sm:inline">{dict.adm.universities}</span></Link>
              <Link href="/admin/account" className={linkClass(pathname === "/admin/account")}><KeyRound size={14} /><span className="hidden sm:inline">{dict.adm.account}</span></Link>
              <span className="ml-3"><LanguageSwitcher /></span>
              <span className="ml-2"><ThemeToggle /></span>
              <button type="button" onClick={() => void signOut()} className="ml-1 flex items-center gap-1.5 px-3 text-[11px] font-medium text-muted hover:text-ink" title={`${dict.adm.signedInAs} ${user.email}`}><LogOut size={14} /><span className="hidden sm:inline">{dict.common.actions.signOut}</span></button>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:py-10">{children}</main>
        <PlatformFooter />
      </div>
    </SessionProvider>
  );
}
