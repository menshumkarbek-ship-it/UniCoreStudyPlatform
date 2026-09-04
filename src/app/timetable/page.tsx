"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
import MenuDropdown from "@/components/MenuDropdown";

type Role = "student" | "professor";
type TimetableCourse = { code: string; title: string; teacher: string; group: string; time: string; room: string; type: string };

const studentSchedule: Record<number, TimetableCourse[]> = {
  1: [{ code: "MED101", title: "Human Anatomy", teacher: "Dr. A. Karimov", group: "MED-24A", time: "09:00 - 10:30", room: "Room 204", type: "Lecture" }, { code: "MED101", title: "Human Anatomy Lab", teacher: "Dr. A. Karimov", group: "MED-24A", time: "13:00 - 14:30", room: "Lab 1", type: "Practical" }],
  2: [{ code: "MED203", title: "Medical Biochemistry", teacher: "Prof. B. Ergeshov", group: "MED-24A", time: "11:00 - 12:30", room: "Lab 3", type: "Lecture" }],
  3: [{ code: "MED112", title: "Human Physiology", teacher: "Dr. M. Sadykova", group: "MED-24A", time: "09:00 - 10:30", room: "Room 118", type: "Lecture" }, { code: "MED216", title: "Medical Microbiology", teacher: "Dr. N. Isaeva", group: "MED-24A", time: "14:00 - 15:30", room: "Room 302", type: "Seminar" }],
  4: [{ code: "MED203", title: "Medical Biochemistry", teacher: "Prof. B. Ergeshov", group: "MED-24A", time: "10:00 - 11:30", room: "Room 211", type: "Practical" }],
  5: [{ code: "MED101", title: "Human Anatomy", teacher: "Dr. A. Karimov", group: "MED-24A", time: "14:00 - 15:30", room: "Room 204", type: "Lecture" }],
};

const professorSchedule: Record<number, TimetableCourse[]> = {
  1: [{ code: "MED101", title: "Human Anatomy", teacher: "Dr. A. Karimov", group: "MED-24A", time: "09:00 - 10:30", room: "Room 204", type: "Lecture" }, { code: "MED101", title: "Human Anatomy", teacher: "Dr. A. Karimov", group: "MED-24B", time: "13:00 - 14:30", room: "Lab 1", type: "Practical" }],
  2: [{ code: "MED203", title: "Medical Biochemistry", teacher: "Dr. A. Karimov", group: "MED-23B", time: "11:00 - 12:30", room: "Lab 3", type: "Lecture" }],
  3: [{ code: "MED112", title: "Human Physiology", teacher: "Dr. A. Karimov", group: "MED-24B", time: "09:00 - 10:30", room: "Room 118", type: "Lecture" }],
  5: [{ code: "MED101", title: "Human Anatomy", teacher: "Dr. A. Karimov", group: "MED-24A", time: "14:00 - 15:30", room: "Room 204", type: "Lecture" }],
};

const getRole = () => window.localStorage.getItem("tronsabak-role") === "professor" ? "professor" : "student";
const getToday = () => new Date();

export default function TimetablePage() {
  const role = useSyncExternalStore(() => () => undefined, getRole, () => "student") as Role;
  const [dayOffset, setDayOffset] = useState(0);
  const selectedDate = new Date(getToday());
  selectedDate.setDate(selectedDate.getDate() + dayOffset);
  const weekday = selectedDate.getDay();
  const schedule = (role === "professor" ? professorSchedule : studentSchedule)[weekday] ?? [];
  const dateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isToday = dayOffset === 0;

  return <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]"><header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><CalendarDays size={21} /></span><span className="text-lg font-bold text-[#15345b]">UniCore</span></Link><div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><MenuDropdown /></nav><Link href="/profile" aria-label="Open profile" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-cyan-100 bg-cyan-50 text-cyan-700"><UserRound size={18} /></Link></div></div></header><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="rounded-xl border border-white bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick access</p><nav className="space-y-1" aria-label="Workspace sections"><Link href="/dashboard" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Home</Link><Link href="/subjects" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Subjects</Link><Link href="/homework" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Homework</Link><Link href="/timetable" className="block rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700">Timetable</Link></nav></aside><section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">{role === "professor" ? "Teaching schedule" : "Class schedule"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Timetable</h1><p className="mt-2 text-sm text-slate-500">{isToday ? "Today's courses" : `Courses for ${dateLabel}`}</p></div><div className="flex gap-2"><button type="button" aria-label="Previous day" disabled={dayOffset <= -5} onClick={() => setDayOffset((offset) => Math.max(-5, offset - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-35"><ArrowLeft size={18} /></button><button type="button" aria-label="Next day" disabled={dayOffset >= 5} onClick={() => setDayOffset((offset) => Math.min(5, offset + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-35"><ArrowRight size={18} /></button></div></div>{schedule.length > 0 ? <div className="space-y-3">{schedule.map((item) => <article key={`${item.code}-${item.group}-${item.time}`} className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">{item.code}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{item.type}</span></div><h2 className="mt-3 text-lg font-semibold text-slate-800">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{role === "professor" ? item.group : item.teacher}</p></div><div className="flex flex-col gap-2 text-sm text-slate-500 sm:items-end"><span className="flex items-center gap-2 font-semibold text-slate-700"><Clock3 size={16} className="text-cyan-600" /> {item.time}</span><span className="flex items-center gap-2"><MapPin size={16} /> {item.room}</span></div></div></article>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-sm font-semibold text-slate-600">No courses scheduled</p><p className="mt-1 text-xs text-slate-400">Use the arrows to review another day.</p></div>}<p className="mt-4 text-center text-xs text-slate-400">Viewing {dayOffset + 5} of 11 available days</p></section></div></div></main>;
}
