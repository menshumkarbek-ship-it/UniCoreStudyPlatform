"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, LogOut } from "lucide-react";
import ProfessorSubjectsTable from "@/components/ProfessorSubjectsTable";

type Role = "student" | "professor";
type Course = { id: number; code: string; title: string; professorName?: string; facultyName?: string | null };

export default function SubjectsPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { role?: Role } | null };
      setRole(result.user?.role === "professor" ? "professor" : "student");
    });
  }, []);

  useEffect(() => {
    if (role !== "student") return;
    void fetch("/api/courses").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { courses?: Course[] };
      const registeredCourses = result.courses ?? [];
      setCourses(registeredCourses);
      setSelected(registeredCourses[0] ?? null);
    });
  }, [role]);

  const signOut = () => {
    window.localStorage.removeItem("tronsabak-role");
    router.push("/login");
  };

  if (role === "professor") return <ProfessorSubjectsTable />;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={17} /> Home</Link>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">My subjects</span><button type="button" onClick={signOut} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400"><LogOut size={14} /> Sign out</button></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Academic catalog</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">My subjects</h1><p className="mt-2 text-sm text-slate-500">Subjects registered through your student group.</p></div>
        {courses.length === 0 ? <section className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-sm font-semibold text-slate-600">No registered subjects yet.</p><p className="mt-1 text-xs text-slate-400">Subjects connected to your group will appear here.</p></section> : <div className="grid gap-3">{courses.map((course) => <article key={course.id} className={`rounded-xl border p-5 transition ${selected?.id === course.id ? "border-cyan-400 bg-cyan-50 shadow-sm" : "border-white bg-white"}`}><button type="button" onClick={() => setSelected(course)} className="flex w-full items-center justify-between text-left"><span><span className="text-xs font-bold text-cyan-700">{course.code}</span><span className="ml-3 text-base font-semibold text-slate-700">{course.title}</span><span className="mt-1 block text-xs text-slate-400">{course.professorName || "Professor not assigned"}</span></span><BookOpen size={19} className="text-slate-300" /></button></article>)}</div>}
      </div>
    </main>
  );
}
