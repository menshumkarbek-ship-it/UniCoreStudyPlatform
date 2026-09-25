"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

type GradeItem = { id: number; title: string; course_code: string; group_name: string; points: number; grade: number | null };

export default function GradesPage() {
  const [grades, setGrades] = useState<GradeItem[]>([]);

  useEffect(() => {
    void fetch("/api/homework").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { homework?: GradeItem[] };
      setGrades((result.homework ?? []).filter((item) => item.grade !== null));
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Academic performance</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-800"><BarChart3 className="text-cyan-600" size={29} /> Grades</h1>
          <p className="mt-2 text-sm text-slate-500">Review and manage student grades across your subjects.</p>
        </div>
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BarChart3 className="mx-auto text-slate-300" size={30} />
          {grades.length === 0 ? <><p className="mt-3 text-sm font-semibold text-slate-600">No grades recorded yet.</p><p className="mt-1 text-xs text-slate-400">Grades will appear here when your submitted work is assessed.</p></> : <div className="mt-5 space-y-2 text-left">{grades.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3"><div><p className="text-sm font-semibold text-slate-700">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.course_code} · {item.group_name}</p></div><p className="shrink-0 text-lg font-bold text-cyan-700">{item.grade}<span className="text-xs font-normal text-slate-400"> / {item.points}</span></p></div>)}</div>}
        </section>
      </div>
    </main>
  );
}
