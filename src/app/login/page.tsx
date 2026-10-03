"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, MapPin, Search, UserRound } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useDictionary } from "@/i18n/locale-provider";
import { readStored, writeStored } from "@/lib/storage";

/** True only for paths on this site. Browsers read "/\\host" like "//host", so a leading slash alone is not enough. */
function isLocalPath(target: string) {
  if (!/^\/(?![/\\])/.test(target)) return false;
  try { return new URL(target, window.location.origin).origin === window.location.origin; } catch { return false; }
}

type Role = "student" | "professor" | "admin";
type University = { id: number; name: string; city: string };

const fieldClass = "h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-periwinkle/60";
const labelClass = "mb-2 block text-[11px] font-medium text-muted";
const buttonClass = "flex h-11 items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition disabled:opacity-60";

export default function LoginPage() {
  const adminLogin = usePathname() === "/admin/login";
  const dict = useDictionary();
  const a = dict.auth;
  const features = [
    { fill: "bg-sky", label: a.featTimetable, text: a.featTimetableText },
    { fill: "bg-peach", label: a.featHomework, text: a.featHomeworkText },
    { fill: "bg-blush", label: a.featExams, text: a.featExamsText },
    { fill: "bg-mint", label: a.featAttendance, text: a.featAttendanceText },
  ];
  const [universities, setUniversities] = useState<University[]>([]);
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState<University | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  useEffect(() => {
    // Already signed in? Go straight to the right workspace.
    fetch("/api/auth/session").then(async (response) => {
      const { user } = await response.json() as { user: { role: Role } | null };
      if (user) window.location.replace(user.role === "admin" ? "/admin" : "/dashboard");
    }, () => undefined);
    if (adminLogin) return;
    fetch("/api/universities").then((response) => response.json() as Promise<{ universities?: University[] }>).then((result) => {
      const list = result.universities ?? [];
      setUniversities(list);
      const remembered = Number(readStored("unicore-university"));
      setUniversity(list.find((entry) => entry.id === remembered) ?? (list.length === 1 ? list[0] : null));
    }, () => setUniversities([]));
  }, [adminLogin]);

  const matches = useMemo(() => universities.filter((entry) => `${entry.name} ${entry.city}`.toLowerCase().includes(search.toLowerCase())), [universities, search]);

  const signIn = async (event: FormEvent, role: Role) => {
    event.preventDefault();
    if (!identifier.trim() || !password) { setError(dict.auth.errorMissingFields); return; }
    if (role !== "admin" && !university) { setError(dict.auth.errorMissingUniversity); return; }
    setError("");
    setPendingRole(role);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, identifier: identifier.trim(), password, universityId: university?.id }) });
      const result = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) { setError(result.error ?? dict.auth.errorGeneric); setPendingRole(null); return; }
      if (university) writeStored("unicore-university", String(university.id));
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next && role !== "admin" && isLocalPath(next) ? next : result.redirectTo ?? "/dashboard");
    } catch {
      setError(dict.auth.errorUnreachable);
      setPendingRole(null);
    }
  };

  return (
    <main className="grid min-h-screen bg-canvas text-ink lg:grid-cols-2">
      <div className="flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/"><Logo caption={adminLogin ? a.platformAdmin : null} /></Link>
          <div className="flex items-center gap-2"><LanguageSwitcher /><ThemeToggle /></div>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <section className="w-full max-w-[400px]">
            <p className="flex items-center gap-2 text-[11px] font-medium text-muted"><span aria-hidden className="h-0.5 w-4 bg-periwinkle" />{adminLogin ? a.administration : dict.auth.universityLabel}</p>
            <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-[-0.02em] text-ink">{adminLogin ? a.platformAdministration : dict.auth.welcomeBack}</h1>
            <p className="mt-3 text-base text-muted">{adminLogin ? a.adminPrompt : dict.auth.chooseRole}</p>

            <form onSubmit={(event) => void signIn(event, adminLogin ? "admin" : "student")} className="mt-8 space-y-5" noValidate>
              {!adminLogin && (
                <div className="relative">
                  <label htmlFor="university" className={labelClass}>{dict.auth.universityLabel}</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                    <input id="university" role="combobox" aria-expanded={pickerOpen} aria-controls="university-options" autoComplete="off" value={university?.name ?? search} placeholder={dict.auth.universitySearchPlaceholder} className={fieldClass}
                      onChange={(event) => { setUniversity(null); setSearch(event.target.value); setPickerOpen(true); }} onFocus={() => setPickerOpen(true)} onClick={() => setPickerOpen(true)} onBlur={() => setPickerOpen(false)} />
                  </div>
                  {pickerOpen && (
                    // Keep focus in the search field while an option is pressed; otherwise blur closes the list before the click lands.
                    <div id="university-options" role="listbox" onMouseDown={(event) => event.preventDefault()} className="absolute left-0 right-0 top-[4.6rem] z-10 max-h-56 overflow-y-auto rounded-lg border border-ink bg-surface p-1">
                      {matches.length === 0 ? <p className="px-3 py-4 text-center text-xs text-muted">{dict.auth.noUniversitiesFound}</p> : matches.map((entry) => (
                        <button type="button" role="option" aria-selected={university?.id === entry.id} key={entry.id} onClick={() => { setUniversity(entry); setSearch(""); setPickerOpen(false); setError(""); }} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-mint dark:hover:bg-surface-muted">
                          <MapPin size={15} className="mt-0.5 shrink-0 text-muted" />
                          <span><span className="block text-sm font-medium text-ink">{entry.name}</span><span className="block text-[10px] text-muted">{entry.city}</span></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="identifier" className={labelClass}>{adminLogin ? a.emailLabel : dict.auth.identifierLabel}</label>
                <div className="relative"><UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" /><input id="identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={adminLogin ? "admin@example.kg" : dict.auth.identifierPlaceholder} className={fieldClass} /></div>
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>{dict.auth.passwordLabel}</label>
                <div className="relative"><LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" /><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={dict.auth.passwordPlaceholder} className={fieldClass} /></div>
              </div>
              {error && <p role="alert" className="rounded-lg bg-blush px-3 py-2 text-sm font-medium text-obsidian">{error}</p>}
              {adminLogin ? (
                <button type="submit" disabled={pendingRole !== null} className={`${buttonClass} w-full border-[1.5px] border-aubergine text-aubergine hover:shadow-sm`}>{pendingRole ? dict.auth.opening : <>{dict.auth.loginAsAdmin}<ArrowRight size={15} /></>}</button>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="submit" disabled={pendingRole !== null} className={`${buttonClass} border-[1.5px] border-aubergine text-aubergine hover:shadow-sm`}>{pendingRole === "student" ? dict.auth.opening : <>{dict.auth.student}<ArrowRight size={15} /></>}</button>
                  <button type="button" disabled={pendingRole !== null} onClick={(event) => void signIn(event, "professor")} className={`${buttonClass} border border-line text-ink hover:border-ink`}>{pendingRole === "professor" ? dict.auth.opening : <>{dict.auth.professor}<ArrowRight size={15} /></>}</button>
                </div>
              )}
            </form>
            {!adminLogin && <p className="mt-8 border-t border-line pt-5 text-sm text-muted">{a.forgotPassword}</p>}
          </section>
        </div>
      </div>

      {/* The page's single dark band: Midnight Ink, not pure black. */}
      <aside className="hidden flex-col justify-between bg-midnight p-12 text-white lg:flex">
        <p className="flex items-center gap-2 text-[11px] font-medium text-white/60"><span aria-hidden className="h-0.5 w-4 bg-periwinkle" />{dict.landing.studyPlatform}</p>
        <div>
          <h2 className="max-w-md text-[48px] font-bold leading-[1.08] tracking-[-0.03em]">{a.asideTitle1}<span className="block font-normal text-white/55">{a.asideTitle2}</span></h2>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {features.map((feature) => (
              <div key={feature.label} className={`rounded-lg p-4 text-obsidian ${feature.fill}`}>
                <p className="text-[10px] font-medium ">{feature.label}</p>
                <p className="mt-2 text-sm text-slate">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-white/40">English · Русский · Кыргызча</p>
      </aside>
    </main>
  );
}
