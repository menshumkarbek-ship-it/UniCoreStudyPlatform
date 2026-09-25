"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

type Faculty = { id: number; name: string; universityName: string; universityId: number };
type University = { id: number; name: string; city: string };

export default function UniversityFacultiesPage() {
  const router = useRouter();
  const params = useParams<{ universityId: string }>();
  const universityId = params.universityId;
  const [university, setUniversity] = useState<University | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [universityResponse, facultyResponse] = await Promise.all([fetch("/api/admin/universities"), fetch("/api/admin/faculties")]);
      if (universityResponse.status === 403 || facultyResponse.status === 403) {
        router.replace("/admin/login");
        return;
      }
      const universityResult = await universityResponse.json() as { items?: University[] };
      const facultyResult = await facultyResponse.json() as { items?: Faculty[] };
      setUniversity((universityResult.items ?? []).find((item) => String(item.id) === universityId) ?? null);
      setFaculties((facultyResult.items ?? []).filter((item) => String(item.universityId) === universityId));
      setLoading(false);
    };
    void load();
  }, [router, universityId]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => router.push("/admin/faculties")} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#153b68]"><ArrowLeft size={16} /> Back to universities</button>
        <section className="rounded-2xl border border-white bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><ShieldCheck size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Faculty records</p><h1 className="mt-1 text-2xl font-semibold text-slate-800">{university?.name ?? "University faculties"}</h1><p className="mt-2 text-sm text-slate-500">{university?.city ?? ""}</p></div></div><button type="button" onClick={() => router.push("/admin/new?resource=faculties")} className="flex items-center gap-2 rounded-lg bg-[#153b68] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Add faculty</button></div>
          {loading ? <p className="text-sm text-slate-500">Loading faculties...</p> : faculties.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-500">No faculties have been added for this university.</p> : <div className="space-y-3">{faculties.map((faculty) => <div key={faculty.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4"><span className="font-semibold text-slate-700">{faculty.name}</span><span className="text-xs text-slate-400">Faculty #{faculty.id}</span></div>)}</div>}
        </section>
      </div>
    </main>
  );
}
