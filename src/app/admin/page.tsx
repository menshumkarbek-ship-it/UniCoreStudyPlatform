"use client";

import { useEffect, useState } from "react";
import { Database, LogOut, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Resource = "universities" | "faculties" | "professors" | "subjects" | "students" | "groups" | "enrollments" | "teaching-assignments" | "timetable";
type Item = Record<string, string | number | null>;

async function readItems(response: Response): Promise<Item[]> {
  if (!response.ok) return [];
  const body = await response.text();
  if (!body.trim()) return [];
  try {
    return (JSON.parse(body) as { items?: Item[] }).items ?? [];
  } catch {
    return [];
  }
}

const resources: { key: Resource; label: string }[] = [
  { key: "universities", label: "Universities" },
  { key: "faculties", label: "Faculties" },
  { key: "professors", label: "Professors" },
  { key: "subjects", label: "Subjects" },
  { key: "groups", label: "Groups" },
  { key: "students", label: "Students" },
  { key: "timetable", label: "Timetable" }
];

export default function AdminPage() {
  const router = useRouter();
  const [resource, setResource] = useState<Resource>("universities");
  const [items, setItems] = useState<Item[]>([]);
  const [universities, setUniversities] = useState<Item[]>([]);
  const [faculties, setFaculties] = useState<Item[]>([]);
  const [professors, setProfessors] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Item[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [resourceNavigation, setResourceNavigation] = useState<Record<string, { university: string; faculty: string; group: string }>>({});
  const [timetableMode, setTimetableMode] = useState<"groups" | "professors">("groups");
  const [selectedProfessor, setSelectedProfessor] = useState("all");

  const changeResource = (nextResource: Resource) => {
    setResourceNavigation((current) => ({ ...current, [resource]: { university: selectedUniversity, faculty: selectedFaculty, group: selectedGroup } }));
    const nextNavigation = resourceNavigation[nextResource] ?? { university: "all", faculty: "all", group: "all" };
    setSelectedUniversity(nextNavigation.university);
    setSelectedFaculty(nextNavigation.faculty);
    setSelectedGroup(nextNavigation.group);
    setResource(nextResource);
  };

  const formFields: Record<Resource, { key: string; label: string; type?: string; optional?: boolean }[]> = {
    universities: [{ key: "name", label: "Name" }, { key: "city", label: "City" }],
    faculties: [{ key: "universityId", label: "University", type: "university" }, { key: "name", label: "Name" }],
    professors: [{ key: "universityId", label: "University", type: "university" }, { key: "email", label: "Email" }, { key: "fullName", label: "Full name" }, { key: "password", label: "Password", type: "password" }],
    students: [{ key: "universityId", label: "University", type: "university" }, { key: "email", label: "Email" }, { key: "fullName", label: "Full name" }, { key: "password", label: "Password", type: "password" }, { key: "studentId", label: "Student number", optional: true }],
    subjects: [{ key: "universityId", label: "University", type: "university" }, { key: "facultyId", label: "Faculty", type: "faculty", optional: true }, { key: "professorIds", label: "Professor ID", type: "professor", optional: true }, { key: "code", label: "Code" }, { key: "title", label: "Title" }],
    groups: [{ key: "universityId", label: "University", type: "university" }, { key: "facultyId", label: "Faculty ID" }, { key: "name", label: "Name" }],
    enrollments: [{ key: "studentId", label: "Student ID" }, { key: "groupId", label: "Group ID" }],
    "teaching-assignments": [{ key: "professorId", label: "Professor ID" }, { key: "courseId", label: "Subject ID" }, { key: "groupId", label: "Group ID" }],
    timetable: [{ key: "universityId", label: "University", type: "university" }, { key: "courseId", label: "Subject ID" }, { key: "groupId", label: "Group ID" }, { key: "professorId", label: "Professor ID" }, { key: "weekday", label: "Weekday (0-6)", type: "number" }, { key: "startsAt", label: "Starts at" }, { key: "endsAt", label: "Ends at" }, { key: "room", label: "Room" }]
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch(`/api/admin/${resource}`);
      if (response.status === 403) {
        router.replace("/admin/login");
        return;
      }
      const loadedItems = await readItems(response);
      setItems(loadedItems);
      if (resource !== "universities") {
        const universityResponse = await fetch("/api/admin/universities");
        setUniversities(await readItems(universityResponse));
        if (resource === "subjects") setProfessors(await readItems(await fetch("/api/admin/professors")));
        if (resource === "subjects" || resource === "groups" || resource === "timetable") {
          const facultyResponse = await fetch("/api/admin/faculties");
          setFaculties(await readItems(facultyResponse));
        }
        if (resource === "students" || resource === "timetable") {
          const [facultyResponse, groupResponse] = await Promise.all([fetch("/api/admin/faculties"), fetch("/api/admin/groups")]);
          setFaculties(await readItems(facultyResponse));
          setGroups(await readItems(groupResponse));
        }
      } else {
        setUniversities(loadedItems);
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

  const addRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resource === "subjects" && formValues.professorIds && !professors.some((professor) => String(professor.id) === formValues.professorIds)) {
      setMessage("Enter a valid professor ID from this university.");
      return;
    }
    const payload = Object.fromEntries(Object.entries(formValues).filter(([, value]) => value.trim() !== "").map(([key, value]) => [key, key === "professorIds" ? [Number(value)] : value]));
    const response = await fetch(`/api/admin/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { items?: Item[]; error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Unable to create record.");
      return;
    }
    setItems(result.items ?? []);
    if (resource === "universities") setUniversities(result.items ?? []);
    setShowAddForm(false);
    setMessage("Record created.");
  };

  const editStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItem?.id) return;
    const payload = { id: Number(editingItem.id), universityId: editValues.universityId, email: editValues.email, fullName: editValues.fullName, studentId: editValues.studentId, ...(editValues.password ? { password: editValues.password } : {}) };
    const response = await fetch(`/api/admin/${resource}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { items?: Item[]; error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Unable to update student.");
      return;
    }
    setItems(result.items ?? []);
    setEditingItem(null);
    setEditValues({});
    setMessage("Student updated.");
  };

  const selectedUniversityName = universities.find((university) => String(university.id) === selectedUniversity)?.name;
  const visibleItems = resource === "timetable" && timetableMode === "groups" && selectedUniversity === "all"
    ? universities.map((university) => ({ id: university.id, name: university.name, city: university.city, universityName: "Global" }))
    : resource === "timetable" && timetableMode === "groups" && selectedUniversity !== "all" && selectedFaculty === "all"
    ? faculties.filter((faculty) => String(faculty.universityId ?? "") === selectedUniversity)
    : resource === "timetable" && timetableMode === "groups" && selectedFaculty !== "all" && selectedGroup === "all"
    ? groups.filter((group) => String(group.universityId ?? "") === selectedUniversity && String(group.facultyId ?? "") === selectedFaculty)
    : resource === "timetable" && timetableMode === "groups" && selectedGroup !== "all"
    ? items.filter((item) => String(item.universityId ?? "") === selectedUniversity && String(item.groupId ?? "") === selectedGroup)
    : resource === "timetable" && timetableMode === "professors" && selectedUniversity !== "all" && selectedProfessor === "all"
    ? Array.from(new Map(items.filter((item) => String(item.universityId ?? "") === selectedUniversity).map((item) => [String(item.professorId), { id: item.professorId, name: item.professorName, email: item.professorName, universityId: item.universityId }])).values())
    : resource === "timetable" && timetableMode === "professors" && selectedProfessor !== "all"
    ? items.filter((item) => String(item.universityId ?? "") === selectedUniversity && String(item.professorId ?? "") === selectedProfessor)
    : resource === "timetable" && timetableMode === "professors" && selectedUniversity === "all"
    ? universities.map((university) => ({ id: university.id, name: university.name, city: university.city, universityName: "Global" }))
    : resource === "groups" && selectedUniversity !== "all" && selectedFaculty === "all"
    ? faculties.filter((faculty) => String(faculty.universityId ?? "") === selectedUniversity)
    : resource === "groups" && selectedFaculty !== "all"
    ? items.filter((item) => String(item.universityId ?? "") === selectedUniversity && String(item.facultyId ?? "") === selectedFaculty)
    : resource === "students" && selectedUniversity !== "all" && selectedFaculty !== "all" && selectedGroup === "all"
    ? groups.filter((group) => String(group.universityId ?? "") === selectedUniversity)
    : resource === "students" && selectedUniversity !== "all" && selectedFaculty === "all"
    ? faculties.filter((faculty) => String(faculty.universityId ?? "") === selectedUniversity)
    : resource === "students" && selectedGroup !== "all"
    ? items.filter((item) => String(item.universityId ?? "") === selectedUniversity && String(item.groupIds ?? "").split(",").includes(selectedGroup))
    : resource === "subjects" && selectedUniversity !== "all" && selectedFaculty === "all"
    ? faculties.filter((faculty) => String(faculty.universityId ?? "") === selectedUniversity)
    : resource === "subjects" && selectedFaculty !== "all"
    ? items.filter((item) => String(item.universityId ?? "") === selectedUniversity && String(item.facultyId ?? "") === selectedFaculty)
    : (resource === "faculties" || resource === "professors" || resource === "subjects" || resource === "students" || resource === "groups") && selectedUniversity === "all"
    ? universities.map((university) => ({ id: university.id, name: university.name, city: university.city, universityName: "Global" }))
    : resource === "universities" || selectedUniversity === "all"
    ? items
    : items.filter((item) => String(item.universityId ?? "") === selectedUniversity || item.universityName === selectedUniversityName);
  const showSchedule = resource === "timetable" && selectedUniversity !== "all" && (timetableMode === "professors" && selectedProfessor !== "all" || timetableMode === "groups" && selectedGroup !== "all");
  useEffect(() => {
    const handleFacultyUniversityClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("aside")) {
        return;
      }
      if (!target.closest("section")) return;
      if ((resource === "faculties" || resource === "professors" || resource === "subjects" || resource === "students" || resource === "groups" || (resource === "timetable" && (timetableMode === "groups" || timetableMode === "professors"))) && selectedUniversity === "all" && target.closest("tbody")) {
        const recordName = target.closest("tr")?.querySelector("td")?.textContent?.trim();
        const university = universities.find((entry) => entry.name === recordName);
        if (university) setSelectedUniversity(String(university.id));
        return;
      }
      if (resource === "timetable" && timetableMode === "professors" && selectedUniversity !== "all" && selectedProfessor === "all" && target.closest("tbody")) {
        const recordName = target.closest("tr")?.querySelector("td")?.textContent?.trim();
        const professor = items.find((entry) => entry.professorName === recordName && String(entry.universityId ?? "") === selectedUniversity);
        if (professor) setSelectedProfessor(String(professor.professorId));
        return;
      }
      if ((resource === "groups" || (resource === "timetable" && timetableMode === "groups")) && selectedUniversity !== "all" && selectedFaculty === "all" && target.closest("tbody")) {
        const recordName = target.closest("tr")?.querySelector("td")?.textContent?.trim();
        const faculty = faculties.find((entry) => entry.name === recordName && String(entry.universityId ?? "") === selectedUniversity);
        if (faculty) setSelectedFaculty(String(faculty.id));
        return;
      }
      if ((resource === "students" || (resource === "timetable" && timetableMode === "groups")) && selectedUniversity !== "all" && selectedFaculty === "all" && target.closest("tbody")) {
        const recordName = target.closest("tr")?.querySelector("td")?.textContent?.trim();
        const faculty = faculties.find((entry) => entry.name === recordName && String(entry.universityId ?? "") === selectedUniversity);
        if (faculty) setSelectedFaculty(String(faculty.id));
        return;
      }
      if ((resource === "students" || (resource === "timetable" && timetableMode === "groups")) && selectedFaculty !== "all" && selectedGroup === "all" && target.closest("tbody")) {
        const recordName = target.closest("tr")?.querySelector("td")?.textContent?.trim();
        const group = groups.find((entry) => entry.name === recordName && String(entry.universityId ?? "") === selectedUniversity);
        if (group) setSelectedGroup(String(group.id));
        return;
      }
      if (resource === "subjects" && selectedUniversity !== "all" && selectedFaculty === "all" && target.closest("tbody")) {
        const recordName = target.closest("tr")?.querySelector("td")?.textContent?.trim();
        const faculty = faculties.find((entry) => entry.name === recordName && String(entry.universityId ?? "") === selectedUniversity);
        if (faculty) setSelectedFaculty(String(faculty.id));
        return;
      }
      const text = target.closest("span")?.textContent ?? "";
      const match = text.match(/#(\d+)$/);
      if ((resource === "faculties" || resource === "professors" || resource === "subjects" || resource === "students" || resource === "groups") && match && universities.some((university) => String(university.id) === match[1])) setSelectedUniversity(match[1]);
    };
    document.addEventListener("click", handleFacultyUniversityClick);
    return () => document.removeEventListener("click", handleFacultyUniversityClick);
  }, [faculties, groups, items, resource, selectedFaculty, selectedGroup, selectedProfessor, selectedUniversity, timetableMode, universities]);
  useEffect(() => {
    if (resource !== "faculties" && resource !== "professors" && resource !== "subjects" && resource !== "students" && resource !== "groups" && resource !== "timetable") return;
    document.querySelectorAll<HTMLElement>("section span").forEach((entry) => {
      if (!/#\d+$/.test(entry.textContent?.trim() ?? "")) return;
      entry.style.display = "block";
      entry.style.width = "100%";
      entry.style.padding = "12px 16px";
      entry.style.border = "1px solid #e2e8f0";
      entry.style.borderRadius = "8px";
      entry.style.cursor = "pointer";
    });
  }, [resource, universities]);
  useEffect(() => {
    const hideUniversityTableDeletes = resource === "universities" || ((resource === "faculties" || resource === "professors" || resource === "subjects" || resource === "students" || resource === "groups") && (selectedUniversity === "all" || selectedFaculty === "all" || selectedGroup === "all"));
    document.querySelectorAll<HTMLButtonElement>('button[aria-label="Delete record"]').forEach((button) => {
      button.style.display = hideUniversityTableDeletes ? "none" : "";
    });
  }, [resource, selectedFaculty, selectedGroup, selectedUniversity, visibleItems.length]);
  useEffect(() => {
    if (resource !== "faculties" && resource !== "professors" && resource !== "subjects" && resource !== "students" && resource !== "groups" && resource !== "timetable") return;
    const universityCard = Array.from(document.querySelectorAll("section p")).find((entry) => entry.textContent?.trim() === "Universities")?.parentElement;
    if (universityCard) universityCard.style.display = "none";
    const heading = document.querySelector("section h2")?.parentElement;
    if (!heading || selectedUniversity === "all") return;
    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.textContent = (resource === "timetable" && timetableMode === "professors" && selectedProfessor !== "all") ? "← Back to professors" : (resource === "timetable" && timetableMode === "groups" && selectedGroup !== "all") ? "← Back to groups" : ((resource === "students" || (resource === "timetable" && timetableMode === "groups")) && selectedGroup !== "all") || (resource === "subjects" && selectedFaculty !== "all") || (resource === "groups" && selectedFaculty !== "all") || (resource === "timetable" && timetableMode === "groups" && selectedFaculty !== "all") ? "← Back to faculties" : "← Back to universities";
    backButton.className = "rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50";
    backButton.onclick = () => {
      if (resource === "timetable" && timetableMode === "professors" && selectedProfessor !== "all") setSelectedProfessor("all");
      else if ((resource === "students" || (resource === "timetable" && timetableMode === "groups")) && selectedGroup !== "all") setSelectedGroup("all");
      else if ((resource === "students" || resource === "subjects" || resource === "groups") && selectedFaculty !== "all") setSelectedFaculty("all");
      else setSelectedUniversity("all");
    };
    heading.appendChild(backButton);
    return () => backButton.remove();
  }, [resource, selectedFaculty, selectedGroup, selectedProfessor, selectedUniversity, timetableMode]);
  useEffect(() => {
    const scopeLabel = Array.from(document.querySelectorAll("p")).find((entry) => entry.textContent?.trim() === "University scope");
    const scopeBar = scopeLabel?.closest("div.border-b");
    if (scopeBar) scopeBar.setAttribute("style", resource === "faculties" || resource === "professors" || resource === "subjects" || resource === "students" || resource === "groups" || resource === "enrollments" || resource === "timetable" ? "display: none" : "");
  }, [resource]);
  useEffect(() => {
    if (resource !== "timetable") return;
    const timetableDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const section = Array.from(document.querySelectorAll("section")).find((entry) => entry.querySelector("h2")?.textContent?.trim() === "Timetable");
    const heading = section?.querySelector("h2")?.parentElement;
    const baseTable = section?.querySelector("table")?.parentElement as HTMLElement | null;
    if (!section || !heading || !baseTable) return;
    const oldControls = heading.querySelector("[data-timetable-control]");
    const oldSchedule = section.querySelector("[data-timetable-schedule]");
    oldControls?.remove();
    oldSchedule?.remove();
    const control = document.createElement("select");
    control.dataset.timetableControl = "true";
    control.className = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600";
    control.innerHTML = "<option value=\"groups\">View by groups</option><option value=\"professors\">View by professors</option>";
    control.value = timetableMode;
    control.onchange = () => { setTimetableMode(control.value as "groups" | "professors"); setSelectedFaculty("all"); setSelectedGroup("all"); setSelectedProfessor("all"); };
    heading.appendChild(control);
    if (!showSchedule) return () => control.remove();
    baseTable.style.display = "none";
    const schedule = document.createElement("div");
    schedule.dataset.timetableSchedule = "true";
    schedule.className = "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm";
    schedule.className = "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm";
    const calendar = document.createElement("div");
    calendar.className = "min-w-[900px] bg-white";
    const header = document.createElement("div");
    header.className = "grid grid-cols-[64px_repeat(6,minmax(130px,1fr))] border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600";
    header.innerHTML = `<div class="border-r border-slate-200 p-3">Time</div>${timetableDays.map((day) => `<div class="border-r border-slate-200 p-3 text-center">${day}</div>`).join("")}`;
    calendar.appendChild(header);
    const body = document.createElement("div");
    body.className = "relative grid grid-cols-[64px_repeat(6,minmax(130px,1fr))]";
    const startHour = 8;
    const endHour = 21;
    const hourHeight = 64;
    const timeColumn = document.createElement("div");
    timeColumn.className = "border-r border-slate-200";
    timeColumn.innerHTML = Array.from({ length: endHour - startHour + 1 }, (_, index) => `<div class="border-b border-slate-100 px-2 py-2 text-[11px] text-slate-400" style="height:${hourHeight}px">${String(startHour + index).padStart(2, "0")}:00</div>`).join("");
    body.appendChild(timeColumn);
    timetableDays.forEach((_, weekday) => {
      const column = document.createElement("div");
      column.className = "relative border-r border-slate-200";
      column.style.height = `${(endHour - startHour + 1) * hourHeight}px`;
      column.innerHTML = Array.from({ length: endHour - startHour + 1 }, () => `<div class="border-b border-slate-100" style="height:${hourHeight}px"></div>`).join("");
      visibleItems.filter((item) => Number(item.weekday) === weekday).forEach((item) => {
        const [startHours, startMinutes] = String(item.startsAt ?? "08:00").split(":").map(Number);
        const [endHours, endMinutes] = String(item.endsAt ?? "09:00").split(":").map(Number);
        const top = ((startHours + startMinutes / 60) - startHour) * hourHeight;
        const height = Math.max(42, ((endHours + endMinutes / 60) - (startHours + startMinutes / 60)) * hourHeight);
        const block = document.createElement("div");
        block.className = "absolute inset-x-1 overflow-hidden rounded-md border border-cyan-200 bg-cyan-100 p-2 text-[11px] leading-4 text-slate-700 shadow-sm";
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.innerHTML = `<strong>${timetableMode === "groups" ? `${String(item.code ?? "")} - ${String(item.title ?? "")}` : String(item.groupName ?? "Group")}</strong><br>${timetableMode === "groups" ? String(item.professorName ?? "") : String(item.professorName ?? "")}<br>${String(item.startsAt)} - ${String(item.endsAt)}<br>${String(item.room ?? "")}`;
        column.appendChild(block);
      });
      body.appendChild(column);
    });
    calendar.appendChild(body);
    schedule.appendChild(calendar);
    section.appendChild(schedule);
    return () => { control.remove(); schedule.remove(); baseTable.style.display = ""; };
  }, [resource, timetableMode, showSchedule, selectedGroup, visibleItems]);
  useEffect(() => {
    if (resource !== "students") return;
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label="Edit record"]'));
    buttons.forEach((button, index) => {
      const item = visibleItems[index];
      button.onclick = () => {
        if (!item) return;
        setEditingItem(item);
        setEditValues({ universityId: String(item.universityId ?? ""), email: String(item.email ?? ""), fullName: String(item.fullName ?? ""), studentId: String(item.studentId ?? "") });
      };
    });
    return () => buttons.forEach((button) => { button.onclick = null; });
  }, [resource, visibleItems]);
  useEffect(() => {
    if (resource !== "students" || !editingItem) return;
    const editor = Array.from(document.querySelectorAll<HTMLFormElement>("form")).find((form) => form.textContent?.includes("Edit student"));
    if (!editor) return;
    editor.classList.add("lg:fixed", "lg:right-8", "lg:top-28", "lg:z-20", "lg:w-[min(520px,calc(100vw-300px))]", "lg:rounded-xl", "lg:border", "lg:shadow-lg");
    return () => editor.classList.remove("lg:fixed", "lg:right-8", "lg:top-28", "lg:z-20", "lg:w-[min(520px,calc(100vw-300px))]", "lg:rounded-xl", "lg:border", "lg:shadow-lg");
  }, [editingItem, resource]);
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]">{showAddForm && <form onSubmit={addRecord} className="mx-auto grid max-w-7xl gap-4 border-b border-amber-200 bg-amber-50/70 px-5 py-5 sm:grid-cols-2 sm:px-8"><div className="sm:col-span-2"><p className="text-sm font-bold text-slate-800">Add {resources.find((entry) => entry.key === resource)?.label}</p></div>{formFields[resource].map((field) => <label key={field.key} className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{field.label}{field.type === "university" ? <select required value={formValues[field.key] ?? ""} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="">Select university</option>{universities.map((university) => <option key={String(university.id)} value={String(university.id)}>{String(university.name)}</option>)}</select> : <input required={!field.optional} type={field.type ?? "text"} value={formValues[field.key] ?? ""} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal" />}</label>)}<div className="flex gap-2 sm:col-span-2"><button type="submit" className="rounded-lg bg-[#153b68] px-4 py-2 text-sm font-bold text-white">Create</button><button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button></div></form>}
      {resource !== "universities" && resource !== "faculties" && <div className="border-b border-cyan-100 bg-cyan-50/60 px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">University scope</p><p className="mt-1 text-sm text-slate-600">Choose a university to view its {resources.find((entry) => entry.key === resource)?.label.toLowerCase()}.</p></div><select aria-label="Filter by university" value={selectedUniversity} onChange={(event) => setSelectedUniversity(event.target.value)} className="h-11 min-w-64 rounded-lg border border-cyan-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-500"><option value="all">All universities</option>{universities.map((university) => <option key={String(university.id)} value={String(university.id)}>{String(university.name)}</option>)}</select></div></div>}
      {editingItem && resource === "students" && <form onSubmit={editStudent} className="mx-auto grid max-w-7xl gap-4 border-b border-cyan-200 bg-cyan-50/70 px-5 py-5 sm:grid-cols-2 sm:px-8"><div className="sm:col-span-2"><p className="text-sm font-bold text-slate-800">Edit student</p></div><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">University<select required value={editValues.universityId ?? ""} onChange={(event) => setEditValues((current) => ({ ...current, universityId: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="">Select university</option>{universities.map((university) => <option key={String(university.id)} value={String(university.id)}>{String(university.name)}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Email<input required type="email" value={editValues.email ?? ""} onChange={(event) => setEditValues((current) => ({ ...current, email: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Full name<input required value={editValues.fullName ?? ""} onChange={(event) => setEditValues((current) => ({ ...current, fullName: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Student number<input value={editValues.studentId ?? ""} onChange={(event) => setEditValues((current) => ({ ...current, studentId: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">New password <span className="font-normal normal-case tracking-normal">(optional)</span><input type="password" minLength={8} value={editValues.password ?? ""} onChange={(event) => setEditValues((current) => ({ ...current, password: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label><div className="flex gap-2 sm:col-span-2"><button type="submit" className="rounded-lg bg-[#153b68] px-4 py-2 text-sm font-bold text-white">Save changes</button><button type="button" onClick={() => { setEditingItem(null); setEditValues({}); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button></div></form>}
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><ShieldCheck size={21} /></span><div><p className="text-lg font-bold text-[#15345b]">UniCore Admin</p><p className="text-xs text-slate-400">Database management</p></div></div><button type="button" onClick={() => router.push("/login")} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><LogOut size={14} /> Sign out</button></div></header>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Administrator workspace</p><h1 className="mt-2 text-3xl font-semibold text-slate-800">Manage your data</h1><p className="mt-2 text-sm text-slate-500">Manage universities, faculties, people, subjects, groups, enrollments, assignments, and timetable entries.</p></div><button type="button" onClick={() => router.push(`/admin/new?resource=${resource}`)} className="flex items-center gap-2 rounded-lg bg-[#153b68] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Add record</button></div>{message && <p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="h-fit rounded-xl border border-white bg-white p-3 shadow-sm"><p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Models</p>{resources.map((entry) => <button type="button" key={entry.key} onClick={() => changeResource(entry.key)} className={resource === entry.key ? "w-full rounded-xl bg-[#15345b] px-3 py-2.5 text-left text-sm font-semibold text-white" : "w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"}>{entry.label}</button>)}<div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Database size={14} />{loading ? "Refreshing..." : "Connected and ready"}</div></aside>
          <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold text-slate-800">{resources.find((entry) => entry.key === resource)?.label}</h2><span className="text-sm text-slate-500">{visibleItems.length} records</span></div>{resource === "faculties" && <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Universities</p><div className="flex flex-wrap gap-2">{universities.map((university) => <span key={String(university.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">{String(university.name)} <span className="text-xs text-slate-400">#{String(university.id)}</span></span>)}</div></div>}<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Record</th><th className="px-3 py-3">University</th><th className="px-3 py-3">Details</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={String(item.id)} className="border-t border-slate-100"><td className="px-3 py-4 font-semibold">{String(item.name ?? item.fullName ?? item.code ?? item.studentName ?? item.professorName ?? "-")}</td><td className="px-3 py-4 text-slate-500">{String(item.universityName ?? "Global")}{resource === "faculties" && ` (#${String(item.universityId ?? "-")})`}</td><td className="px-3 py-4 text-slate-500">{String(item.city ?? item.title ?? item.email ?? item.facultyName ?? item.groupName ?? item.room ?? "-")}</td><td className="px-3 py-4 text-right"><button type="button" aria-label="Edit record" className="mr-2 rounded-md border border-slate-200 p-2 text-slate-600"><Pencil size={14} /></button><button type="button" aria-label="Delete record" onClick={() => deleteRecord(Number(item.id))} className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-600"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></section>
        </div>
      </div>
    </main>
  );
}
