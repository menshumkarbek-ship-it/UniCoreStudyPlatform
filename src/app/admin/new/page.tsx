"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type Resource = "universities" | "faculties" | "professors" | "subjects" | "students" | "groups" | "enrollments" | "teaching-assignments" | "timetable";
type Item = Record<string, string | number | null>;
type Field = { key: string; label: string; type?: string; optional?: boolean };

const resourceLabels: Record<Resource, string> = {
  universities: "Universities",
  faculties: "Faculties",
  professors: "Professors",
  subjects: "Subjects",
  students: "Students",
  groups: "Groups",
  enrollments: "Student enrollments",
  "teaching-assignments": "Teaching assignments",
  timetable: "Timetable"
};

const fields: Record<Resource, Field[]> = {
  universities: [{ key: "name", label: "Name" }, { key: "city", label: "City" }],
  faculties: [{ key: "universityId", label: "University", type: "university" }, { key: "name", label: "Name" }],
  professors: [{ key: "universityId", label: "University", type: "university" }, { key: "email", label: "Email" }, { key: "fullName", label: "Full name" }, { key: "password", label: "Password", type: "password" }],
  students: [{ key: "universityId", label: "University", type: "university" }, { key: "facultyId", label: "Faculty", type: "faculty" }, { key: "groupId", label: "Group", type: "group" }, { key: "email", label: "Email" }, { key: "fullName", label: "Full name" }, { key: "password", label: "Password", type: "password" }, { key: "studentId", label: "Student number", optional: true }],
  subjects: [{ key: "universityId", label: "University", type: "university" }, { key: "facultyId", label: "Faculty", type: "faculty", optional: true }, { key: "professorIds", label: "Professor", type: "professor", optional: true }, { key: "code", label: "Code" }, { key: "title", label: "Title" }],
  groups: [{ key: "universityId", label: "University", type: "university" }, { key: "facultyId", label: "Faculty", type: "faculty" }, { key: "name", label: "Name" }],
  enrollments: [{ key: "studentId", label: "Student", type: "student" }, { key: "groupId", label: "Group", type: "group" }],
  "teaching-assignments": [{ key: "professorId", label: "Professor", type: "professor" }, { key: "courseId", label: "Subject", type: "subject" }, { key: "groupId", label: "Group", type: "group" }],
  timetable: [{ key: "universityId", label: "University", type: "university" }, { key: "facultyId", label: "Faculty", type: "faculty" }, { key: "groupId", label: "Group", type: "group" }, { key: "courseId", label: "Subject", type: "subject" }, { key: "professorId", label: "Professor", type: "professor" }, { key: "weekday", label: "Study day", type: "weekday" }, { key: "startsAt", label: "Starts at", type: "time" }, { key: "endsAt", label: "Ends at", type: "time" }, { key: "room", label: "Room" }]
};

function isResource(value: string | null): value is Resource {
  return value !== null && value in resourceLabels;
}

export default function NewAdminRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resource = isResource(searchParams.get("resource")) ? searchParams.get("resource") : "universities";
  const [universities, setUniversities] = useState<Item[]>([]);
  const [faculties, setFaculties] = useState<Item[]>([]);
  const [professors, setProfessors] = useState<Item[]>([]);
  const [students, setStudents] = useState<Item[]>([]);
  const [subjects, setSubjects] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Item[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUniversities = async () => {
      const response = await fetch("/api/admin/universities");
      if (response.status === 403) {
        router.replace("/admin/login");
        return;
      }
      const resourcesToLoad = ["universities", "faculties", "professors", "students", "subjects", "groups"];
      const responses = await Promise.all(resourcesToLoad.map((name) => fetch(`/api/admin/${name}`)));
      if (responses.some((item) => item.status === 403)) {
        router.replace("/admin/login");
        return;
      }
      const results = await Promise.all(responses.map(async (item) => (await item.json()) as { items?: Item[] }));
      setUniversities(results[0].items ?? []);
      setFaculties(results[1].items ?? []);
      setProfessors(results[2].items ?? []);
      setStudents(results[3].items ?? []);
      setSubjects(results[4].items ?? []);
      setGroups(results[5].items ?? []);
    };
    void loadUniversities();
  }, [router, resource]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== "").map(([key, value]) => [key, key === "professorIds" ? [Number(value)] : value]));
    const response = await fetch(`/api/admin/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Unable to create record.");
      setSaving(false);
      return;
    }
    router.push(`/admin?resource=${resource}`);
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => router.push(`/admin?resource=${resource}`)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#153b68]"><ArrowLeft size={16} /> Back to {resourceLabels[resource]}</button>
        <section className="rounded-2xl border border-white bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><ShieldCheck size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Administrator workspace</p><h1 className="mt-1 text-2xl font-semibold text-slate-800">Add {resourceLabels[resource]}</h1></div></div>
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            {fields[resource].map((field) => {
              const universityId = values.universityId;
              const facultyId = values.facultyId;
              const student = students.find((item) => String(item.id) === values.studentId);
              const professor = professors.find((item) => String(item.id) === values.professorId);
              const selectedUniversityId = universityId || String(student?.universityId ?? professor?.universityId ?? "");
              const options = field.type === "university" ? universities : field.type === "faculty" ? faculties.filter((item) => !selectedUniversityId || String(item.universityId) === selectedUniversityId) : field.type === "professors" || field.type === "professor" ? professors.filter((item) => !selectedUniversityId || String(item.universityId) === selectedUniversityId) : field.type === "student" ? students : field.type === "subject" ? subjects.filter((item) => !selectedUniversityId || String(item.universityId) === selectedUniversityId) : field.type === "group" ? groups.filter((item) => (!selectedUniversityId || String(item.universityId) === selectedUniversityId) && (!facultyId || String(item.facultyId) === facultyId)) : [];
              if (["university", "faculty", "professors", "professor", "student", "subject", "group", "weekday"].includes(field.type ?? "")) {
                const multiple = false;
                const value = multiple ? (values[field.key] ?? "").split(",").filter(Boolean) : values[field.key] ?? "";
                const optionItems = field.type === "weekday" ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((label, index) => ({ id: index, label })) : options.map((item) => ({ id: item.id, label: field.type === "university" ? item.name : field.type === "faculty" ? `${item.name} (${item.universityName})` : field.type === "student" ? `${item.fullName} (${item.studentId ?? item.email})` : field.type === "professors" || field.type === "professor" ? `${item.fullName} (${item.email})` : field.type === "subject" ? `${item.code} - ${item.title}` : item.name }));
                return <label key={field.key} className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{field.label}<select required={!field.optional} multiple={multiple} value={value} onChange={(event) => setValues((current) => {
                  const nextValue = multiple ? Array.from(event.target.selectedOptions, (option) => option.value).filter(Boolean).join(",") : event.target.value;
                  if (field.key === "universityId") return { ...current, universityId: nextValue, facultyId: "", professorIds: "", professorId: "", studentId: "", courseId: "", groupId: "" };
                  if (field.key === "facultyId") return { ...current, facultyId: nextValue, groupId: "" };
                  if (field.key === "studentId") return { ...current, studentId: nextValue, groupId: "" };
                  if (field.key === "professorId") return { ...current, professorId: nextValue, courseId: "", groupId: "" };
                  return { ...current, [field.key]: nextValue };
                })} className={`${multiple ? "min-h-28 py-2" : "h-11"} mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal`}><option value="">{multiple ? "Select one or more" : `Select ${field.label.toLowerCase()}`}</option>{optionItems.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.label)}</option>)}</select></label>;
              }
              return <label key={field.key} className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{field.label}<input required={!field.optional} type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} max={field.type === "number" ? 6 : undefined} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal" /></label>;
            })}
            {message && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
            <div className="flex gap-3 sm:col-span-2"><button type="submit" disabled={saving} className="rounded-lg bg-[#153b68] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Creating..." : "Create record"}</button><button type="button" onClick={() => router.push(`/admin?resource=${resource}`)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600">Cancel</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}
