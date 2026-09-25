"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Megaphone, Send } from "lucide-react";

type Role = "student" | "professor";
type Group = { id: number; name: string; code: string; courseTitle: string };
type Announcement = { id: number; title: string; detail: string; createdAt: string; groupName: string; professorName?: string };

export default function BulletinPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/bulletin");
    if (!response.ok) return;
    const result = await response.json() as { announcements?: Announcement[]; groups?: Group[] };
    setAnnouncements(result.announcements ?? []);
    setGroups(result.groups ?? []);
  };

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { role?: Role } | null };
      setRole(result.user?.role === "professor" ? "professor" : "student");
    });
  }, []);
  useEffect(() => { if (role) window.setTimeout(() => void load(), 0); }, [role]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/bulletin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, title, detail }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error ?? "Unable to publish announcement."); return; }
    setTitle("");
    setDetail("");
    setMessage("Announcement published and students notified.");
    void load();
  };

  if (!role) return <main className="min-h-screen bg-[#f4f7fb]" />;
  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={17} /> Dashboard</Link><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Announcements</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-800"><Megaphone className="text-cyan-600" size={29} /> Bulletin</h1><p className="mt-2 text-sm text-slate-500">{role === "professor" ? "Share an announcement with one of your groups." : "Announcements from your professors."}</p></div>{role === "professor" && <section className="mb-6 rounded-xl border border-white bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-800">New announcement</h2><form onSubmit={submit} className="mt-4 grid gap-4"><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Group<select required value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="">Select a group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.code} · {group.courseTitle} · {group.name}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Message<textarea required maxLength={5000} value={detail} onChange={(event) => setDetail(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label>{message && <p className="text-sm text-emerald-700">{message}</p>}<button type="submit" className="flex w-fit items-center gap-2 rounded-lg bg-[#153b68] px-4 py-2.5 text-sm font-bold text-white"><Send size={16} /> Publish announcement</button></form></section>}{message && role === "student" && <p className="mb-4 text-sm text-emerald-700">{message}</p>}<section className="rounded-xl border border-white bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-800">Recent announcements</h2><div className="mt-4 space-y-3">{announcements.length ? announcements.map((announcement) => <article key={announcement.id} className="rounded-lg border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-cyan-700">{announcement.groupName}{announcement.professorName ? ` · ${announcement.professorName}` : ""}</p><h3 className="mt-1 font-semibold text-slate-700">{announcement.title}</h3></div><time className="shrink-0 text-xs text-slate-400">{new Date(announcement.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{announcement.detail}</p></article>) : <p className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-xs text-slate-400">No announcements yet.</p>}</div></section></div></main>;
}
