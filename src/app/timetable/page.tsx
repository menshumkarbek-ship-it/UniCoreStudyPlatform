"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
import MenuDropdown from "@/components/MenuDropdown";

type Role = "student" | "professor";
type TimetableEntry = { id: number; weekday: number; code: string; title: string; professorName: string; groupName: string; startsAt: string; endsAt: string; room: string };
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function mondayIndex(date: Date) { return (date.getDay() + 6) % 7; }

export default function TimetablePage() {
  const [role, setRole] = useState<Role | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { role?: Role } | null };
      setRole(result.user?.role === "professor" ? "professor" : "student");
    });
    window.setTimeout(() => void fetch("/api/timetable").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { entries?: TimetableEntry[] };
      setEntries(result.entries ?? []);
    }), 0);
  }, []);
  if (!role) return <main className="min-h-screen bg-[#f4f7fb]" />;
  const selectedDate = new Date();
  selectedDate.setHours(12, 0, 0, 0);
  selectedDate.setDate(selectedDate.getDate() + dayOffset);
  const weekday = mondayIndex(selectedDate);
  const schedule = entries.filter((entry) => entry.weekday === weekday).sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const dateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isToday = dayOffset === 0;
  return <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]"><header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><CalendarDays size={21} /></span><span className="text-lg font-bold text-[#15345b]">UniCore</span></Link><div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><MenuDropdown /></nav><Link href="/profile" aria-label="Open profile" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-cyan-100 bg-cyan-50 text-cyan-700"><UserRound size={18} /></Link></div></div></header><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="rounded-xl border border-white bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick access</p><nav className="space-y-1" aria-label="Workspace sections"><Link href="/dashboard" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Home</Link><Link href="/subjects" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Subjects</Link><Link href="/homework" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Homework</Link><Link href="/timetable" className="block rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700">Timetable</Link></nav></aside><section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">{role === "professor" ? "Teaching schedule" : "Class schedule"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">{role === "professor" ? "My classes" : "My timetable"}</h1><p className="mt-2 text-sm text-slate-500">{role === "professor" ? "Your database timetable grouped by teaching day." : "Your enrolled-group courses from the database timetable."}</p></div><div className="flex items-center gap-2"><button type="button" aria-label="Previous day" onClick={() => setDayOffset((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft size={16} /></button><span className="min-w-32 text-center text-sm font-semibold text-slate-700">{isToday ? "Today" : dateLabel}</span><button type="button" aria-label="Next day" onClick={() => setDayOffset((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ArrowRight size={16} /></button></div></div><div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-6">{days.map((day, index) => <button type="button" key={day} onClick={() => setDayOffset(index - mondayIndex(new Date()))} className={`rounded-lg px-2 py-2 text-xs font-bold ${weekday === index ? "bg-cyan-700 text-white" : "bg-white text-slate-500 hover:bg-cyan-50"}`}>{day.slice(0, 3)}</button>)}</div><div className="overflow-hidden rounded-xl border border-white bg-white shadow-sm"><div className="border-b border-slate-100 bg-slate-50 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{dateLabel}</p><p className="mt-1 text-sm text-slate-500">{schedule.length} class{schedule.length === 1 ? "" : "es"} scheduled</p></div>{schedule.length ? <div className="divide-y divide-slate-100">{schedule.map((entry) => <article key={entry.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[130px_minmax(0,1fr)_180px]"><div className="flex items-center gap-2 text-sm font-bold text-cyan-700"><Clock3 size={16} />{entry.startsAt} - {entry.endsAt}</div><div><p className="font-semibold text-slate-700">{entry.code} · {entry.title}</p><p className="mt-1 text-xs text-slate-400">{role === "professor" ? `Teaching group: ${entry.groupName}` : `Professor: ${entry.professorName}`}</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={15} className="text-cyan-600" />{entry.room}<span className="text-slate-300">·</span>{entry.groupName}</div></article>)}</div> : <div className="p-12 text-center"><CalendarDays className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-sm font-semibold text-slate-600">No classes scheduled for this day.</p><p className="mt-1 text-xs text-slate-400">Timetable entries created by the administrator will appear here.</p></div>}</div></section></div></div></main>;
}
