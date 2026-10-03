"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarCheck, CalendarDays, CircleUserRound, ClipboardList, LayoutDashboard, LogOut, Megaphone, NotebookPen, type LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationDropdown from "@/components/NotificationDropdown";
import PlatformFooter from "@/components/PlatformFooter";
import ThemeToggle from "@/components/ThemeToggle";
import { SessionProvider, signOut } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import type { SessionUser } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: LucideIcon };

export function Avatar({ user, size }: { user: Pick<SessionUser, "fullName" | "photoUrl">; size: number }) {
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky font-medium text-obsidian" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by an authenticated route, not the image optimizer */}
      {user.photoUrl ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover" /> : initials || <CircleUserRound size={size * 0.6} />}
    </span>
  );
}

export default function WorkspaceShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const dict = useDictionary();
  const professor = user.role === "professor";
  const nav: NavItem[] = [
    { href: "/dashboard", label: dict.common.nav.dashboard, icon: LayoutDashboard },
    { href: "/subjects", label: professor ? dict.wk.navMyTeaching : dict.common.nav.subjects, icon: BookOpen },
    { href: "/timetable", label: dict.common.nav.timetable, icon: CalendarDays },
    { href: "/homework", label: dict.common.nav.homework, icon: ClipboardList },
    { href: "/exams", label: dict.wk.navExams, icon: NotebookPen },
    { href: "/grades", label: professor ? dict.wk.navGradebook : dict.wk.navGrades, icon: BarChart3 },
    { href: "/attendance", label: dict.wk.navAttendance, icon: CalendarCheck },
    { href: "/bulletin", label: dict.wk.navBulletin, icon: Megaphone },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // Profile & settings opens on its own, without the sidebar, and has a Back button.
  const focused = isActive("/profile");
  const frame = useRef<HTMLDivElement>(null);
  // The frame persists across sections and scrolls on its own, so start each section at its top.
  useEffect(() => { frame.current?.scrollTo(0, 0); }, [pathname]);

  return (
    <SessionProvider user={user}>
      <div className="flex min-h-screen flex-col bg-canvas text-ink">
        <header className="sticky top-0 z-20 border-b border-line bg-surface shadow-[var(--nav-glow)]">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/dashboard" className="min-w-0"><Logo /></Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:block"><LanguageSwitcher /></span>
              <ThemeToggle />
              <NotificationDropdown />
              <Link href="/profile" aria-label={dict.common.nav.profile} className="ml-1 rounded-full"><Avatar user={user} size={34} /></Link>
            </div>
          </div>
          {!focused && <nav aria-label={dict.wk.workspace} className="flex gap-1 overflow-x-auto border-t border-line px-4 lg:hidden">
            {nav.map((item) => <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[11px] font-medium tracking-[0.05em] ${isActive(item.href) ? "border-periwinkle text-ink" : "border-transparent text-muted"}`}><item.icon size={13} strokeWidth={1.75} />{item.label}</Link>)}
          </nav>}
        </header>

        <div className={`mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:py-10 ${focused ? "" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`}>
          {!focused && <aside className="hidden lg:block">
            <div className="flex h-full flex-col rounded-lg border border-line bg-surface p-5">
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <Avatar user={user} size={80} />
                <div className="min-w-0 max-w-full">
                  <p className="text-base font-medium leading-snug text-ink [overflow-wrap:anywhere]">{user.fullName}</p>
                  <p className="mt-0.5 text-xs text-muted [overflow-wrap:anywhere]">{professor ? dict.auth.professor : dict.auth.student}{user.studentNumber ? ` · ${user.studentNumber}` : ""}</p>
                </div>
              </div>
              <p className="mb-2 px-3 text-[10px] font-medium text-faint">{dict.wk.workspace}</p>
              <nav aria-label={dict.wk.workspace} className="mb-6 space-y-px">
                {nav.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] transition ${active ? "bg-surface-muted font-medium text-ink" : "text-muted hover:text-ink"}`}>
                      {active && <span aria-hidden className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-periwinkle" />}
                      <item.icon size={16} strokeWidth={1.75} />{item.label}
                    </Link>
                  );
                })}
              </nav>
              <button type="button" onClick={() => void signOut()} className="mt-auto flex w-full items-center gap-2 border-t border-line px-3 pt-5 text-[11px] font-medium text-muted transition hover:text-ink">
                <LogOut size={14} /> {dict.common.actions.signOut}
              </button>
            </div>
          </aside>}
          {/* Beside the sidebar the content sits in a fixed frame and scrolls inside it, so page content never changes the row height:
              the sidebar and cards stay the same height in every section. The stable gutter keeps card widths from shifting too. */}
          <main className="relative flex min-w-0 flex-col">
            <div ref={frame} className={`flex flex-1 flex-col [&>:last-child]:flex-1 ${focused ? "" : "lg:absolute lg:inset-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable]"}`}>{children}</div>
          </main>
        </div>
        <PlatformFooter />
      </div>
    </SessionProvider>
  );
}
