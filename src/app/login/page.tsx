"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GraduationCap, LockKeyhole, MapPin, Search, UserRound } from "lucide-react";
import { useDictionary } from "@/i18n/locale-provider";

type Role = "student" | "professor" | "admin";

type University = { id: number; name: string; city: string };

export default function LoginPage() {
  const pathname = usePathname();
  const adminLogin = pathname === "/admin/login";
  const router = useRouter();
  const dict = useDictionary();
  const [role, setRole] = useState<Role>(adminLogin ? "admin" : "student");
  const [universities, setUniversities] = useState<University[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [universitySearch, setUniversitySearch] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState<typeof universities[number] | null>(null);
  const [universityOpen, setUniversityOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adminLogin) return;
    void fetch("/api/universities")
      .then((response) => response.json() as Promise<{ universities?: University[] }>)
      .then((result) => setUniversities(result.universities ?? []))
      .catch(() => setUniversities([]));
  }, [adminLogin]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, selectedRole = role) => {
    event.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError(dict.auth.errorMissingFields);
      return;
    }
    if (!adminLogin && !selectedUniversity) {
      setError(dict.auth.errorMissingUniversity);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: identifier.trim(), password, ...(selectedUniversity ? { universityName: selectedUniversity.name } : {}), role: selectedRole }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? dict.auth.errorGeneric);
        setLoading(false);
        return;
      }
      window.localStorage.setItem("tronsabak-role", selectedRole);
      window.localStorage.setItem("tronsabak-university", selectedUniversity?.name ?? "Global administration");
      router.push(selectedRole === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError(dict.auth.errorUnreachable);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-5 py-10 text-[#17233d]">
      <section className="w-full max-w-md rounded-2xl border border-white bg-white p-6 shadow-[0_22px_70px_rgba(43,69,105,0.14)] sm:p-9">
        <Link href="/" className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><GraduationCap size={22} /></span><span className="text-lg font-bold text-[#15345b]">{dict.common.appName}</span></Link>
        <h1 className="text-2xl font-semibold text-[#172b49]">{dict.auth.welcomeBack}</h1>
        <p className="mt-2 text-sm text-[#71809a]">{dict.auth.chooseRole}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {!adminLogin && <div className="relative"><label htmlFor="university-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#536680]">{dict.auth.universityLabel}</label><div className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a0b4]" /><input id="university-search" value={selectedUniversity?.name ?? universitySearch} onChange={(event) => { setSelectedUniversity(null); setUniversitySearch(event.target.value); setUniversityOpen(true); }} onFocus={() => setUniversityOpen(true)} placeholder={dict.auth.universitySearchPlaceholder} autoComplete="off" className="h-12 w-full rounded-lg border border-[#d6e0eb] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none focus:border-[#3f77aa] focus:ring-4 focus:ring-[#3f77aa]/10" /></div>{universityOpen && <div className="absolute left-0 right-0 top-[4.7rem] z-10 max-h-56 overflow-y-auto rounded-lg border border-[#d6e0eb] bg-white p-1 shadow-lg">{universities.filter((university) => `${university.name} ${university.city}`.toLowerCase().includes(universitySearch.toLowerCase())).map((university) => <button type="button" key={university.name} onClick={() => { setSelectedUniversity(university); setUniversitySearch(""); setUniversityOpen(false); setError(""); }} className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-cyan-50"><MapPin size={16} className="mt-0.5 shrink-0 text-cyan-600" /><span><span className="block text-sm font-semibold text-slate-700">{university.name}</span><span className="mt-0.5 block text-xs text-slate-400">{university.city}</span></span></button>)}{universities.filter((university) => `${university.name} ${university.city}`.toLowerCase().includes(universitySearch.toLowerCase())).length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">{dict.auth.noUniversitiesFound}</p>}</div>}</div>}
          <div><label htmlFor="identifier" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#536680]">{dict.auth.identifierLabel}</label><div className="relative"><UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a0b4]" /><input id="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={dict.auth.identifierPlaceholder} className="h-12 w-full rounded-lg border border-[#d6e0eb] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none focus:border-[#3f77aa] focus:ring-4 focus:ring-[#3f77aa]/10" /></div></div>
          <div><label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#536680]">{dict.auth.passwordLabel}</label><div className="relative"><LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a0b4]" /><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={dict.auth.passwordPlaceholder} className="h-12 w-full rounded-lg border border-[#d6e0eb] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none focus:border-[#3f77aa] focus:ring-4 focus:ring-[#3f77aa]/10" /></div></div>
          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
          {adminLogin ? <button type="button" disabled={loading} onClick={() => handleSubmit({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>, "admin")} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-amber-600 bg-amber-50 text-sm font-bold text-amber-800 transition hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800 disabled:opacity-70">{loading ? dict.auth.opening : <>{dict.auth.loginAsAdmin} <ArrowRight size={16} /></>}</button> : <div className="grid gap-2 sm:grid-cols-2"><button type="button" disabled={loading} onClick={() => { setRole("student"); handleSubmit({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>, "student"); }} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#153b68] bg-white text-sm font-bold text-[#153b68] transition hover:bg-[#eef5fb] dark:border-cyan-700 dark:bg-slate-800 dark:text-cyan-200 dark:hover:bg-slate-700 disabled:opacity-70">{loading ? dict.auth.opening : <>{dict.auth.student} <ArrowRight size={16} /></>}</button><button type="button" disabled={loading} onClick={() => { setRole("professor"); handleSubmit({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>, "professor"); }} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#153b68] text-sm font-bold text-white transition hover:bg-[#102f54] disabled:opacity-70">{loading ? dict.auth.opening : <>{dict.auth.professor} <ArrowRight size={16} /></>}</button></div>}
        </form>
        <p className="mt-6 text-center text-[11px] leading-5 text-[#9aa7b7]">{dict.auth.demoModeNotice}</p>
      </section>
    </main>
  );
}
