"use client";

import { useEffect, useState } from "react";
import { Database, LogOut, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Resource = "universities" | "faculties" | "professors" | "subjects" | "students" | "groups" | "enrollments" | "teaching-assignments" | "timetable";
type Item = Record<string, string | number | null>;

const resources: { key: Resource; label: string }[] = [
  { key: "universities", label: "Universities" },
  { key: "faculties", label: "Faculties" },
  { key: "professors", label: "Professors" },
  { key: "subjects", label: "Subjects" },
  { key: "students", label: "Students" },
  { key: "groups", label: "Groups" },
  { key: "enrollments", label: "Student enrollments" },
  { key: "teaching-assignments", label: "Teaching assignments" },
  { key: "timetable", label: "Timetable" }
];

export default function AdminPage() {
  const router = useRouter();
  const [resource, setResource] = useState<Resource>("universities");
  const [items, setItems] = useState<Item[]>([]);
  const [universities, setUniversities] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch(`/api/admin/${resource}`);
      if (response.status === 403) {
        router.replace("/admin/login");
        return;
      }
      const result = await response.json() as { items?: Item[] };
      setItems(result.items ?? []);
      if (resource !== "universities") {
        const universityResponse = await fetch("/api/admin/universities");
        const universityResult = await universityResponse.json() as { items?: Item[] };
        setUniversities(universityResult.items ?? []);
      } else {
        setUniversities(result.items ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [resource, router]);

  const deleteRecord = async (id: number) => {
    if (!window.confirm("Delete this record? Related records may also be removed.")) return;
    const response = await fetch(`/api/admin/${resource}?id=${id}`, { method: "DELETE" });
    const result = await response.json() as { items?: Item[]; error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Unable to delete record.");
      return;
    }
    setItems(result.items ?? []);
    setMessage("Record deleted.");
  };

  const visibleItems = resource === "faculties" ? items : items;
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><ShieldCheck size={21} /></span><div><p className="text-lg font-bold text-[#15345b]">TronSabak Admin</p><p className="text-xs text-slate-400">Database management</p></div></div><button type="button" onClick={() => router.push("/login")} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><LogOut size={14} /> Sign out</button></div></header>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Administrator workspace</p><h1 className="mt-2 text-3xl font-semibold text-slate-800">Manage your data</h1><p className="mt-2 text-sm text-slate-500">Manage universities, faculties, people, subjects, groups, enrollments, assignments, and timetable entries.</p></div><button type="button" onClick={() => setMessage("Create records using the resource form.")} className="flex items-center gap-2 rounded-lg bg-[#153b68] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Add record</button></div>{message && <p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="h-fit rounded-xl border border-white bg-white p-3 shadow-sm"><p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Models</p>{resources.map((entry) => <button type="button" key={entry.key} onClick={() => setResource(entry.key)} className={resource === entry.key ? "w-full rounded-xl bg-[#15345b] px-3 py-2.5 text-left text-sm font-semibold text-white" : "w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"}>{entry.label}</button>)}<div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Database size={14} />{loading ? "Refreshing..." : "Connected and ready"}</div></aside>
          <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold text-slate-800">{resources.find((entry) => entry.key === resource)?.label}</h2><span className="text-sm text-slate-500">{visibleItems.length} records</span></div>{resource === "faculties" && <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Universities</p><div className="flex flex-wrap gap-2">{universities.map((university) => <span key={String(university.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">{String(university.name)} <span className="text-xs text-slate-400">#{String(university.id)}</span></span>)}</div></div>}<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Record</th><th className="px-3 py-3">University</th><th className="px-3 py-3">Details</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={String(item.id)} className="border-t border-slate-100"><td className="px-3 py-4 font-semibold">{String(item.name ?? item.fullName ?? item.code ?? item.studentName ?? item.professorName ?? "-")}</td><td className="px-3 py-4 text-slate-500">{String(item.universityName ?? "Global")}{resource === "faculties" && ` (#${String(item.universityId ?? "-")})`}</td><td className="px-3 py-4 text-slate-500">{String(item.city ?? item.title ?? item.email ?? item.facultyName ?? item.groupName ?? item.room ?? "-")}</td><td className="px-3 py-4 text-right"><button type="button" aria-label="Edit record" className="mr-2 rounded-md border border-slate-200 p-2 text-slate-600"><Pencil size={14} /></button><button type="button" aria-label="Delete record" onClick={() => deleteRecord(Number(item.id))} className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-600"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></section>
        </div>
      </div>
    </main>
  );
}
