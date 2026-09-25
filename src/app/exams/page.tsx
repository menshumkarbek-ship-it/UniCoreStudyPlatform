"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardCheck, FileText, Upload } from "lucide-react";

type Role = "student" | "professor";
type Entry = { id: number; weekday: number; startsAt: string; endsAt: string; code: string; title: string; groupName: string };
type Exam = { id: number; title: string; examDate: string; startsAt: string; endsAt: string; fileName: string; code: string; courseTitle: string; groupName: string };
type ExamsResponse = { entries?: Entry[]; exams?: Exam[] };

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextClassDate(weekday: number) {
  const date = new Date();
  const days = (weekday - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ExamsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedEntry, setSelectedEntry] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExams = async () => {
    const response = await fetch("/api/exams");
    if (!response.ok) return;
    const result = await response.json() as ExamsResponse;
    setEntries(result.entries ?? []);
    setExams(result.exams ?? []);
  };

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { role?: Role } | null };
      setRole(result.user?.role === "professor" ? "professor" : "student");
    });
  }, []);

  useEffect(() => {
    if (role) window.setTimeout(() => void loadExams(), 0);
  }, [role]);

  const chooseEntry = (value: string) => {
    setSelectedEntry(value);
    const entry = entries.find((item) => String(item.id) === value);
    if (entry) {
      setExamDate(nextClassDate(entry.weekday));
      setStartsAt(entry.startsAt);
      setEndsAt(entry.endsAt);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) { setMessage("Upload a JPG or PDF file with the exam questions."); return; }
    setSaving(true);
    setMessage("");
    const formData = new FormData();
    formData.set("timetableEntryId", selectedEntry);
    formData.set("title", title);
    formData.set("examDate", examDate);
    formData.set("startsAt", startsAt);
    formData.set("endsAt", endsAt);
    formData.set("file", file);
    const response = await fetch("/api/exams", { method: "POST", body: formData });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error ?? "Unable to schedule the exam."); setSaving(false); return; }
    setMessage("Exam scheduled.");
    setTitle("");
    setFile(null);
    setSaving(false);
    void loadExams();
  };

  if (!role) return <main className="min-h-screen bg-[#f4f7fb]" />;

  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8"><div className="mx-auto max-w-7xl"><Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={17} /> Dashboard</Link><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Assessment center</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-800"><ClipboardCheck className="text-cyan-600" size={29} /> Exams</h1><p className="mt-2 text-sm text-slate-500">{role === "professor" ? "Schedule an exam inside one of your class windows." : "View your upcoming examinations and question files."}</p></div>{role === "professor" ? <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]"><section className="rounded-xl border border-white bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><CalendarClock className="text-cyan-600" size={22} /><div><h2 className="font-semibold text-slate-800">Schedule exam</h2><p className="mt-1 text-xs text-slate-400">Date and time must stay within the selected class.</p></div></div><form onSubmit={submit} className="space-y-4"><label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Class<select required value={selectedEntry} onChange={(event) => chooseEntry(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="">Select a scheduled class</option>{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.code} · {entry.groupName} · {weekdayNames[entry.weekday]} {entry.startsAt}-{entry.endsAt}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Exam title<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Midterm exam" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal" /></label><div className="grid gap-4 sm:grid-cols-3"><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 sm:col-span-1">Date<input required type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-2 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Starts<input required type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-2 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Ends<input required type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-2 text-sm font-normal normal-case tracking-normal" /></label></div><label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Questions file<input required type="file" accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-normal normal-case tracking-normal file:mr-3 file:rounded-md file:border-0 file:bg-cyan-700 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /><span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">JPG or PDF, maximum 10 MB.</span></label>{message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}<button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#153b68] py-3 text-sm font-bold text-white disabled:opacity-60"><Upload size={16} /> {saving ? "Scheduling..." : "Schedule exam"}</button></form></section><ExamList exams={exams} professor /></div> : <ExamList exams={exams} />}</div></main>;
}

function ExamList({ exams, professor = false }: { exams: Exam[]; professor?: boolean }) {
  return <section className="rounded-xl border border-white bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><FileText className="text-cyan-600" size={22} /><div><h2 className="font-semibold text-slate-800">{professor ? "Scheduled exams" : "Upcoming exams"}</h2><p className="mt-1 text-xs text-slate-400">{exams.length} exam{exams.length === 1 ? "" : "s"}</p></div></div>{exams.length ? <div className="space-y-3">{exams.map((exam) => <article key={exam.id} className="rounded-lg border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-cyan-700">{exam.code} · {exam.groupName}</p><h3 className="mt-1 font-semibold text-slate-700">{exam.title}</h3><p className="mt-1 text-xs text-slate-400">{exam.courseTitle} · {exam.examDate} · {exam.startsAt}-{exam.endsAt}</p></div><a href={`/api/exams/${exam.id}/file`} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-cyan-200 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50">Open file</a></div><p className="mt-3 truncate text-xs text-slate-400">{exam.fileName}</p></article>)}</div> : <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center"><ClipboardCheck className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-600">No exams scheduled yet.</p></div>}</section>;
}
