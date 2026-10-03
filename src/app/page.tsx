"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useDictionary } from "@/i18n/locale-provider";

const mono = "text-[11px] font-medium ";
const primary = "inline-flex h-11 items-center gap-2 rounded-lg border-[1.5px] border-aubergine px-5 text-[13px] font-medium text-aubergine transition hover:shadow-sm";

const roles = ["students", "professors"] as const;

/** Abstract hero art: translucent rings, a sphere, and a faceted diamond with mono callouts. */
function HeroArt() {
  const l = useDictionary().landing;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[480px]" aria-hidden>
      <svg viewBox="0 0 480 480" className="h-full w-full">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fb4f5" /><stop offset="0.55" stopColor="#9b8cff" /><stop offset="1" stopColor="#ff9a6a" /></linearGradient>
          <radialGradient id="sphere" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stopColor="#ffffff" /><stop offset="0.35" stopColor="#c1dff9" /><stop offset="0.8" stopColor="#9b8cff" /><stop offset="1" stopColor="#6d5ce8" /></radialGradient>
          <linearGradient id="diamond" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd1b8" /><stop offset="0.5" stopColor="#ff9a6a" /><stop offset="1" stopColor="#f0673a" /></linearGradient>
        </defs>
        <ellipse cx="240" cy="250" rx="190" ry="72" fill="none" stroke="url(#ring)" strokeWidth="22" opacity="0.45" transform="rotate(-18 240 250)" />
        <ellipse cx="240" cy="250" rx="150" ry="150" fill="none" stroke="url(#ring)" strokeWidth="2" opacity="0.5" strokeDasharray="2 8" />
        <circle cx="228" cy="236" r="92" fill="url(#sphere)" opacity="0.92" />
        <ellipse cx="240" cy="250" rx="190" ry="72" fill="none" stroke="url(#ring)" strokeWidth="22" opacity="0.8" transform="rotate(-18 240 250)" strokeDasharray="330 900" strokeDashoffset="-40" />
        <g transform="translate(350 330)">
          <polygon points="0,-46 34,-10 0,46 -34,-10" fill="url(#diamond)" />
          <polygon points="0,-46 34,-10 0,-2" fill="#ffffff" opacity="0.35" />
          <polygon points="-34,-10 0,-2 0,46" fill="#000000" opacity="0.08" />
        </g>
      </svg>
      <span className={`absolute left-0 top-[14%] ${mono} text-muted`}>— {l.heroTimetable}</span>
      <span className={`absolute right-0 top-[40%] ${mono} text-muted`}>{l.heroHomework} —</span>
      <span className={`absolute bottom-[8%] left-[10%] ${mono} text-muted`}>— {l.heroGrades}</span>
    </div>
  );
}

export default function Home() {
  const dict = useDictionary();
  const l = dict.landing;
  const [role, setRole] = useState<(typeof roles)[number]>("students");
  const points = (role === "students" ? ["s1", "s2", "s3", "s4"] : ["p1", "p2", "p3", "p4"]).map((key) => l[key as keyof typeof l]);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface shadow-[var(--nav-glow)]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
          <span className="text-[20px] font-bold tracking-[-0.01em] text-ink">UniCore</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block"><LanguageSwitcher /></span>
            <ThemeToggle />
            <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-aubergine px-4 text-[12px] font-medium text-aubergine hover:shadow-sm">{l.signIn}<ArrowRight size={14} /></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className={`flex items-center gap-2 ${mono} text-muted`}><span aria-hidden className="h-0.5 w-4 bg-periwinkle" />{l.studyPlatform}</p>
          <h1 className="mt-5 text-[44px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
            {l.heroLine1}
            <span className="block font-normal text-muted">{l.heroLine2}</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-[1.4] text-muted">{l.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className={primary}>{l.signIn}<ArrowRight size={15} /></Link>
          </div>
        </div>
        <HeroArt />
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-4 px-5 pb-20 md:grid-cols-3">
        <div className="rounded-lg bg-sky p-6 text-obsidian"><p className={mono}>↑ {dict.landing.courseAccess}</p><p className="mt-8 text-[64px] font-medium leading-none tracking-[-0.03em]">1</p><p className="mt-3 text-sm text-slate">{l.stat1}</p></div>
        <div className="rounded-lg bg-blush p-6 text-obsidian"><p className={mono}>↑ {dict.landing.assignmentHub}</p><p className="mt-8 text-[64px] font-medium leading-none tracking-[-0.03em]">2</p><p className="mt-3 text-sm text-slate">{l.stat2}</p></div>
        <div className="rounded-lg bg-peach p-6 text-obsidian"><p className={mono}>↑ {dict.landing.progressInsights}</p><p className="mt-8 text-[64px] font-medium leading-none tracking-[-0.03em]">3</p><p className="mt-3 text-sm text-slate">{l.stat3}</p></div>
      </section>

      <section id="platform" className="border-t border-line py-20">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="text-center">
            <p className={`${mono} text-muted`}>{l.platformLabel}</p>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.02em] sm:text-[40px]">{l.platformTitle}</h2>
          </div>
          <div role="tablist" className="mt-10 grid gap-3 sm:grid-cols-2">
            {roles.map((entry) => (
              <button key={entry} type="button" role="tab" aria-selected={role === entry} onClick={() => setRole(entry)} className={`rounded-lg border py-5 text-[22px] font-medium tracking-[-0.01em] transition ${role === entry ? "border-transparent border-aubergine bg-accent-soft text-obsidian" : "border-line bg-surface text-ink hover:border-ink"}`}>{l[entry]}</button>
            ))}
          </div>
          <ul role="tabpanel" className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {points.map((point, index) => (
              <li key={point} className="flex gap-4 bg-surface p-6"><span className={`${mono} text-faint`}>0{index + 1}</span><span className="text-base leading-[1.4]">{point}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-5 py-20 md:flex-row md:items-center">
        <h2 className="max-w-xl text-[32px] font-bold leading-[1.15] tracking-[-0.02em]">{l.ctaTitle}<span className="block font-normal text-muted">{l.ctaText}</span></h2>
        <div className="flex gap-3"><Link href="/login" className={primary}>{l.signIn}<ArrowRight size={15} /></Link></div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-6">
          <Logo />
          <p className={`${mono} text-faint`}>© {new Date().getFullYear()} UniCore · {l.footer}</p>
        </div>
      </footer>
    </main>
  );
}
