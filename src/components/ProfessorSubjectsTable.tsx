"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

type Course = { id: number; code: string; title: string; facultyName?: string | null; group_count: number };

export default function ProfessorSubjectsTable() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    void fetch("/api/courses").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { courses?: Course[] };
      setCourses(result.courses ?? []);
    });
  }, []);

  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8"><div className="mx-auto max-w-7xl"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Teaching catalog</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Subjects I teach</h1><p className="mt-2 text-sm text-slate-500">Courses assigned to your professor account.</p></div><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Faculty</th><th className="px-4 py-3">Groups</th></tr></thead><tbody>{courses.map((course) => <tr key={course.id} className="border-t border-slate-100"><td className="px-4 py-4 font-bold text-cyan-700">{course.code}</td><td className="px-4 py-4 font-semibold text-slate-700">{course.title}</td><td className="px-4 py-4 text-slate-500">{course.facultyName ?? ""}</td><td className="px-4 py-4 text-slate-500">{course.group_count}</td></tr>)}</tbody></table>{courses.length === 0 && <div className="p-12 text-center"><BookOpen className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-sm font-semibold text-slate-600">No subjects assigned yet.</p><p className="mt-1 text-xs text-slate-400">Subjects assigned by an administrator will appear here.</p></div>}</div></div></main>;
}
