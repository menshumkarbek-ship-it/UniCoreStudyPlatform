"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type University = { id: number; name: string; city: string };

export default function FacultiesUniversitiesPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/universities");
      if (response.status === 403) {
        router.replace("/admin/login");
        return;
      }
      const result = await response.json() as { items?: University[] };
      setUniversities(result.items ?? []);
      setLoading(false);
    };
    void load();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => router.push("/admin")} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#153b68]"><ArrowLeft size={16} /> Back to admin panel</button>
        <section className="rounded-2xl border border-white bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><ShieldCheck size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Administrator workspace</p><h1 className="mt-1 text-2xl font-semibold text-slate-800">Faculties by university</h1><p className="mt-2 text-sm text-slate-500">Choose a university to view its faculties.</p></div></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">{loading ? <p className="px-4 py-5 text-sm text-slate-500">Loading universities...</p> : universities.length === 0 ? <p className="px-4 py-5 text-sm text-slate-500">No universities have been added yet.</p> : <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Record</th><th className="px-3 py-3">University</th><th className="px-3 py-3">Details</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{universities.map((university) => <tr key={university.id} className="border-t border-slate-100"><td className="px-3 py-4"><button type="button" onClick={() => router.push(`/admin/faculties/${university.id}`)} className="font-semibold text-slate-700 hover:text-cyan-700">{university.name}</button></td><td className="px-3 py-4 text-slate-500">Global</td><td className="px-3 py-4 text-slate-500">{university.city}</td><td className="px-3 py-4 text-right"><button type="button" aria-label={`Edit ${university.name}`} className="mr-2 rounded-md border border-slate-200 p-2 text-slate-500"><Pencil size={14} /></button><button type="button" aria-label={`Delete ${university.name}`} className="rounded-md border border-rose-200 p-2 text-rose-500"><Trash2 size={14} /></button></td></tr>)}</tbody></table>}</div>
        </section>
      </div>
    </main>
  );
}
