"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarClock, Check, ClipboardList, FileText, UserRound, Users, Upload, Trash2, ExternalLink, Download, Plus } from "lucide-react";

type Role = "student" | "professor";
type Homework = { id: number; course: string; group: string; title: string; description: string; due: string; dueAt: string; points: number; status: "open" | "submitted"; submittedCount?: number; fileName?: string | null };
type Group = { id: number; name: string; course_id: number; course_code: string; course_title: string; student_count: number };
type Submission = { studentId: number; studentName: string; email: string; fileName: string | null; fileType: string | null; submittedAt: string | null };

async function readJson<T>(response: Response): Promise<T | null> {
  const body = await response.text();
  if (!body.trim()) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export default function HomeworkPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<"hm" | "assign">("hm");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [submissions, setSubmissions] = useState<Record<number, Submission[]>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [groupFilter, setGroupFilter] = useState("All groups");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    updateTime();
    const timer = window.setInterval(updateTime, 60000);
    void Promise.all([fetch("/api/auth/session"), fetch("/api/homework")]).then(async ([sessionResponse, homeworkResponse]) => {
      if (sessionResponse.ok) {
        const session = await sessionResponse.json() as { user?: { role?: Role } | null };
        setRole(session.user?.role === "professor" ? "professor" : "student");
      }
      if (!homeworkResponse.ok) return;
      const result = await homeworkResponse.json() as { homework?: { id: number; course_code: string; group_name: string; title: string; instructions: string; due_at: string; points: number; status?: "open" | "submitted"; submitted_count?: number; file_name?: string | null }[]; groups?: Group[] };
      setHomework((result.homework ?? []).map((item) => ({ id: item.id, course: item.course_code, group: item.group_name, title: item.title, description: item.instructions, due: new Date(item.due_at).toLocaleString(), dueAt: item.due_at, points: item.points, status: item.status ?? "open", submittedCount: item.submitted_count, fileName: item.file_name })));
      setAvailableGroups(result.groups ?? []);
    });
    return () => window.clearInterval(timer);
  }, []);

  const courses = ["All courses", ...Array.from(new Set(homework.map((item) => item.course)))];
  const courseHomework = courseFilter === "All courses" ? homework : homework.filter((item) => item.course === courseFilter);
  const visibleHomework = groupFilter === "All groups" ? courseHomework : courseHomework.filter((item) => item.group === groupFilter);
  const updateHomework = (nextHomework: Homework[]) => setHomework(nextHomework);
  const submitHomework = async (id: number, file: File) => { setUploadingId(id); setError(""); const body = new FormData(); body.append("file", file); const response = await fetch(`/api/homework/${id}/submissions`, { method: "POST", body }); const result = await response.json() as { error?: string; fileName?: string }; setUploadingId(null); if (!response.ok) { setError(result.error ?? "Upload failed."); return; } updateHomework(homework.map((item) => item.id === id ? { ...item, status: "submitted", fileName: result.fileName } : item)); setMessage("Homework file uploaded."); };
  const deleteSubmission = async (id: number) => { const response = await fetch(`/api/homework/${id}/submissions`, { method: "DELETE" }); if (!response.ok) { const result = await response.json() as { error?: string }; setError(result.error ?? "File could not be deleted."); return; } updateHomework(homework.map((item) => item.id === id ? { ...item, status: "open", fileName: null } : item)); setMessage("Previous upload deleted."); };
  const loadSubmissions = async (id: number) => { const response = await fetch(`/api/homework/${id}/submissions`); if (!response.ok) return; const result = await response.json() as { submissions?: Submission[] }; setSubmissions((current) => ({ ...current, [id]: result.submissions ?? [] })); };
  const createHomework = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedGroup) return; const form = new FormData(event.currentTarget); const response = await fetch("/api/homework", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: selectedGroup.course_id, groupId: selectedGroup.id, title: form.get("title"), instructions: form.get("instructions"), dueAt: new Date(String(form.get("dueAt"))).toISOString(), points: Number(form.get("points")) }) }); const result = await readJson<{ error?: string }>(response); if (!response.ok) { setError(result?.error ?? "Homework could not be created."); return; } setMessage("Homework assigned successfully."); setSelectedGroup(null); setMode("hm"); const refreshed = await fetch("/api/homework"); const data = await readJson<{ homework?: { id: number; course_code: string; group_name: string; title: string; instructions: string; due_at: string; points: number; submitted_count?: number }[] }>(refreshed); setHomework((data?.homework ?? []).map((item) => ({ id: item.id, course: item.course_code, group: item.group_name, title: item.title, description: item.instructions, due: new Date(item.due_at).toLocaleString(), dueAt: item.due_at, points: item.points, status: "open", submittedCount: item.submitted_count ?? 0 })));
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={17} /> Home</Link>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">{role === "professor" ? "Teacher workspace" : "Student workspace"}</span><Link href="/profile" aria-label="Open profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-cyan-700"><UserRound size={18} /></Link></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Quick access</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-800"><ClipboardList className="text-cyan-600" size={29} /> Homework</h1><p className="mt-2 max-w-xl text-sm text-slate-500">Assignments from your teachers, organized by subject and deadline.</p></div>
        </div>

        {role === "professor" && <div className="mb-6 flex gap-2 border-b border-slate-200"><button type="button" onClick={() => { setMode("hm"); setSelectedGroup(null); }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${mode === "hm" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500"}`}>HM</button><button type="button" onClick={() => { setMode("assign"); setSelectedGroup(null); }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${mode === "assign" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500"}`}><Plus size={15} className="mr-1 inline" /> Assign HM</button></div>}

        {role === "professor" && mode === "assign" && !selectedGroup && <section className="mb-8 rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Users size={18} className="text-cyan-600" /><h2 className="text-base font-semibold text-slate-800">Choose a group</h2></div>{availableGroups.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{availableGroups.map((group) => <button type="button" key={`${group.course_code}-${group.id}`} onClick={() => setSelectedGroup(group)} className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3 text-left hover:border-cyan-400 hover:bg-cyan-100"><p className="text-sm font-semibold text-cyan-700">{group.name}</p><p className="mt-1 text-xs text-slate-500">{group.course_code} · {group.course_title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{group.student_count} students</p></button>)}</div> : <p className="mt-3 text-sm text-slate-500">No student groups are linked to your courses yet.</p>}</section>}

        {role === "professor" && mode === "assign" && selectedGroup && <section className="mb-8 rounded-xl border border-white bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-600">{selectedGroup.course_code}</p><h2 className="mt-1 text-xl font-semibold text-slate-800">Assign HM to {selectedGroup.name}</h2></div><button type="button" onClick={() => setSelectedGroup(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Change group</button></div><form onSubmit={createHomework} className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Main topic<input name="title" required minLength={2} maxLength={160} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-cyan-500" /></label><label className="sm:col-span-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Description<textarea name="instructions" required minLength={2} maxLength={5000} rows={5} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-cyan-500" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Deadline<input name="dueAt" type="datetime-local" required min={new Date().toISOString().slice(0, 16)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-cyan-500" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Points<input name="points" type="number" min="1" max="1000" defaultValue="100" required className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-cyan-500" /></label><button type="submit" className="sm:col-span-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800"><Upload size={16} /> Assign homework</button></form></section>}

        {message && <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><Check size={16} /> {message}</div>}
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {mode === "hm" && <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText size={17} className="text-cyan-600" /> {visibleHomework.length} {visibleHomework.length === 1 ? "task" : "tasks"}</div>}
          {role === "student" && <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Filter by subject<select value={courseFilter} onChange={(event) => { setCourseFilter(event.target.value); setGroupFilter("All groups"); }} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-slate-600 outline-none focus:border-cyan-500">{courses.map((course) => <option key={course}>{course}</option>)}</select></label>
          </div>}
        </div>

        {mode === "hm" && <div className="grid gap-4">{visibleHomework.map((item) => { const closed = currentTime > 0 && new Date(item.dueAt).getTime() <= currentTime; return <article key={item.id} className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">{item.course}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{item.group}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${closed ? "bg-slate-100 text-slate-600" : item.status === "submitted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{closed ? "Closed" : item.status === "submitted" ? "Submitted" : "Needs attention"}</span></div><h2 className="mt-3 text-lg font-semibold text-slate-800">{item.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{item.description}</p></div><div className="flex shrink-0 items-start gap-4 text-sm text-slate-500 sm:text-right"><span className="flex items-center gap-1.5"><CalendarClock size={16} className="text-amber-500" /> Due {item.due}</span><span className="font-semibold text-slate-700">{item.points} pts</span></div></div><div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between"><span className="text-xs text-slate-400">{role === "professor" ? `${item.submittedCount ?? 0} submitted` : item.fileName ? <a target="_blank" rel="noreferrer" href={`/api/homework/${item.id}/file`} className="inline-flex items-center gap-1 font-semibold text-cyan-700 underline decoration-cyan-200 underline-offset-2 hover:text-cyan-900"><FileText size={14} /> {item.fileName}</a> : "Assigned by your subject teacher"}</span>{role === "professor" ? <button type="button" onClick={() => loadSubmissions(item.id)} className="text-xs font-bold text-cyan-700 hover:text-cyan-900">{submissions[item.id] ? "Refresh submissions" : "View submissions"}</button> : <div className="flex flex-wrap items-center justify-end gap-2">{closed ? <span className="text-xs font-bold text-slate-500">Uploads are closed</span> : <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-600 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50"><Upload size={14} /> {uploadingId === item.id ? "Uploading..." : item.fileName ? "Replace file" : "Upload JPG/PDF"}<input type="file" accept="image/jpeg,.jpg,application/pdf,.pdf" className="hidden" disabled={uploadingId === item.id} onChange={(event) => { const file = event.target.files?.[0]; if (file) void submitHomework(item.id, file); event.currentTarget.value = ""; }} /></label>}{item.fileName && !closed && <button type="button" onClick={() => void deleteSubmission(item.id)} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:border-red-300 hover:bg-red-100"><Trash2 size={14} /> Delete</button>}</div>}</div>{role === "professor" && submissions[item.id] && <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3">{submissions[item.id].length ? submissions[item.id].map((submission) => <div key={submission.studentId} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span><strong>{submission.studentName}</strong><span className="ml-2 text-xs text-slate-500">{submission.fileName ?? "No file"}</span></span>{submission.fileName && <span className="flex gap-3"><a target="_blank" rel="noreferrer" href={`/api/homework/${item.id}/file?studentId=${submission.studentId}`} className="flex items-center gap-1 text-xs font-bold text-cyan-700"><ExternalLink size={13} /> Open</a><a href={`/api/homework/${item.id}/file?studentId=${submission.studentId}&download=1`} className="flex items-center gap-1 text-xs font-bold text-cyan-700"><Download size={13} /> Download</a></span>}</div>) : <p className="text-xs text-slate-500">No student uploads yet.</p>}</div>}</article>; })}</div>}
        {mode === "hm" && visibleHomework.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-600">No homework in this course yet.</p><p className="mt-1 text-xs text-slate-400">New tasks from your teacher will appear here.</p></div>}
      </div>
    </main>
  );
}
