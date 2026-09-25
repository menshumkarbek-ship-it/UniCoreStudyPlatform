"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, CalendarCheck, CalendarDays, ClipboardList, CircleUserRound, GraduationCap, LayoutDashboard, LogOut, Megaphone } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useDictionary } from "@/i18n/locale-provider";

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dict = useDictionary();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { fullName?: string; profilePhoto?: string | null } };
      setName(result.user?.fullName ?? "");
      setPhoto(result.user?.profilePhoto ?? null);
    });
  }, []);

  const signOut = () => {
    window.localStorage.removeItem("tronsabak-role");
    router.push("/login");
  };

  const linkClass = (href: string) => pathname === href
    ? "flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700"
    : "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800";

  return <aside className="rounded-xl border border-white bg-white p-4 shadow-sm lg:fixed lg:left-[max(1.25rem,calc((100vw-1280px)/2))] lg:top-24 lg:z-10 lg:w-[220px]"><div className="mb-5 flex flex-col items-center border-b border-slate-100 pb-5 text-center"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-cyan-100 text-cyan-700 ring-4 ring-cyan-50">{photo ? <img src={photo} alt="Student profile" className="h-full w-full object-cover" /> : <CircleUserRound size={43} />}</div><p className="mt-3 max-w-full truncate text-sm font-bold text-slate-700">{name}</p><p className="mt-1 text-xs text-slate-400">{dict.auth.student}</p></div><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{dict.dashboard.quickAccess}</p><nav className="space-y-1" aria-label="Student workspace"><Link href="/dashboard" className={linkClass("/dashboard")}><LayoutDashboard size={16} /> Dashboard</Link><Link href="/subjects" className={linkClass("/subjects")}><BookOpen size={16} /> Courses</Link><Link href="/homework" className={linkClass("/homework")}><ClipboardList size={16} /> {dict.common.nav.homework}</Link><Link href="/timetable" className={linkClass("/timetable")}><CalendarDays size={16} /> {dict.common.nav.timetable}</Link><Link href="/exams" className={linkClass("/exams")}><GraduationCap size={16} /> Exams</Link><Link href="/grades" className={linkClass("/grades")}><BarChart3 size={16} /> Grades</Link><Link href="/attendance" className={linkClass("/attendance")}><CalendarCheck size={16} /> Attendance</Link><Link href="/bulletin" className={linkClass("/bulletin")}><Megaphone size={16} /> Bulletin</Link><Link href="/profile" className={linkClass("/profile")}><CircleUserRound size={16} /> {dict.common.nav.profile}</Link></nav><button type="button" onClick={signOut} className="mt-8 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500 hover:text-red-600"><LogOut size={14} /> {dict.common.actions.signOut}</button></aside>;
}
