"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, GraduationCap, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Item } from "@/components/admin/ResourceSection";
import { Alert, EmptyState, Field, dangerButton, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { api } from "@/lib/client";

type Faculty = { id: number; name: string; degrees?: string[] };
type Group = { id: number; name: string; facultyId: number; degree: string | null; studyYear: string | null };
export type Student = Item & { fullName: string; email: string; studentNumber: string | null; groupId: number | null; groupName: string | null; facultyName: string | null };

const editButton = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[11px] font-medium text-ink hover:border-ink";

function PasswordField({ editing }: { editing: boolean }) {
  const t = useDictionary().adm;
  return <Field label={editing ? t.passwordNew : t.passwordInitial} hint={editing ? t.passwordEditHint : t.passwordCreateHint}><input name="password" type="text" autoComplete="off" minLength={8} required={!editing} className={inputClass} /></Field>;
}

/** Name, email, student number, and a group picker (defaulting to the group this list is already inside). */
function StudentFields({ editing, allGroups, groupId }: { editing: Student | null; allGroups: Group[]; groupId: number }) {
  const t = useDictionary().adm;
  const byFaculty = Array.from(allGroups.reduce((map, group) => map.set(group.facultyId, [...(map.get(group.facultyId) ?? []), group]), new Map<number, Group[]>()));
  return (
    <>
      <Field label={t.fullName}><input name="fullName" required maxLength={160} defaultValue={editing?.fullName} className={inputClass} /></Field>
      <Field label={t.email}><input name="email" type="email" required maxLength={160} defaultValue={editing?.email} className={inputClass} /></Field>
      <Field label={t.studentNumber} hint={t.studentNumberHint}><input name="studentNumber" maxLength={60} defaultValue={editing?.studentNumber ?? ""} className={inputClass} /></Field>
      <Field label={t.group}>
        <select name="groupId" required defaultValue={editing?.groupId ?? groupId} className={inputClass}>
          {byFaculty.map(([, items]) => items.map((group) => <option key={group.id} value={group.id}>{group.name}</option>))}
        </select>
      </Field>
      <PasswordField editing={Boolean(editing)} />
    </>
  );
}

function GroupStudents({ group, students, allGroups, universityId, onChanged }: { group: Group; students: Student[]; allGroups: Group[]; universityId: number; onChanged: (items: Student[]) => void }) {
  const t = useDictionary().adm;
  const n = t.nouns.student;
  const own = students.filter((student) => student.groupId === group.id);
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const current = editing === "new" ? null : editing;

  // Add or Edit opens the form above the list, scrolled into view.
  const open = (next: Student | "new" | null) => {
    setEditing(next);
    setMessage(null);
    if (next) window.setTimeout(() => form.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const result = await api<{ items: Student[] }>("/api/admin/students", {
        method: current ? "PATCH" : "POST",
        json: { fullName: data.get("fullName"), email: data.get("email"), studentNumber: data.get("studentNumber"), groupId: Number(data.get("groupId")), password: data.get("password"), universityId, ...(current ? { id: current.id } : {}) },
      });
      onChanged(result.items);
      setEditing(null);
      setMessage({ tone: "success", text: current ? t.updated : t.added });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSaving(false); }
  };

  const remove = async (student: Student) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      const result = await api<{ items: Student[] }>(`/api/admin/students?${new URLSearchParams({ id: String(student.id), universityId: String(universityId) })}`, { method: "DELETE" });
      onChanged(result.items);
      setMessage({ tone: "success", text: t.deleted });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{own.length ? n.count.replace("{n}", String(own.length)) : t.studentEmpty}</p>
        <button type="button" onClick={() => open(editing === "new" ? null : "new")} className={editing === "new" ? secondaryButton : primaryButton}>{editing === "new" ? <X size={16} /> : <Plus size={16} />}{editing === "new" ? t.cancel : n.add}</button>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {editing && (
        <form ref={form} key={current?.id ?? "new"} onSubmit={submit} className="rounded-lg border border-ink bg-surface p-5 sm:p-6">
          <p className="mb-5 text-lg font-medium tracking-[-0.01em] text-ink">{current ? n.edit : n.new}</p>
          <div className="grid gap-4 sm:grid-cols-2"><StudentFields editing={current} allGroups={allGroups} groupId={group.id} /></div>
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={saving} className={primaryButton}>{saving ? t.saving : current ? t.saveChanges : n.add}</button>
            <button type="button" onClick={() => open(null)} className={secondaryButton}>{t.cancel}</button>
          </div>
        </form>
      )}
      {own.length === 0 ? <EmptyState icon={GraduationCap} title={n.empty} description={t.studentEmpty} /> : (
        <ul className="space-y-3">
          {own.map((student) => (
            <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted p-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{student.fullName}</p>
                <p className="truncate text-xs text-muted">{student.studentNumber ? `${student.studentNumber} · ` : ""}{student.email}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => open(student)} className={editButton}><Pencil size={13} />{t.edit}</button>
                <button type="button" onClick={() => void remove(student)} className={dangerButton}><Trash2 size={13} />{t.delete}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Where this is navigated to, read from the address (#students, #students/faculty/3, #students/group/7). */
type Place = { facultyId?: number; groupId?: number };
function readPlace(): Place {
  const [, kind, id] = window.location.hash.slice(1).split("/");
  return kind === "faculty" ? { facultyId: Number(id) } : kind === "group" ? { groupId: Number(id) } : {};
}

const rowLink = "flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted p-4 transition hover:border-accent";

/**
 * Students, navigated like the timetable: faculties, then a faculty's groups, then one group's roster. Each step is
 * its own address, so Back, reload, and links work, and only one group's students are ever listed at a time.
 */
export default function StudentsByGroup({ faculties, groups, students, universityId, onChanged }: {
  faculties: Faculty[]; groups: Group[]; students: Student[]; universityId: number; onChanged: (items: Student[]) => void;
}) {
  const t = useDictionary().adm;
  const [place, setPlace] = useState<Place>({});
  useEffect(() => {
    const sync = () => setPlace(readPlace());
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", sync); };
  }, []);

  const group = place.groupId ? groups.find((item) => item.id === place.groupId) : undefined;
  const faculty = faculties.find((item) => item.id === (group?.facultyId ?? place.facultyId));
  const details = (item: Group) => [item.degree, item.studyYear].filter(Boolean).join(" · ");
  const countFor = (groupId: number) => students.filter((student) => student.groupId === groupId).length;

  // Where you are, with a way back up: Students › Faculty › Group.
  const trail = faculty && (
    <nav aria-label={t.students} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <a href={group ? `#students/faculty/${faculty.id}` : "#students"} aria-label={t.backTo.replace("{name}", group ? faculty.name : t.students)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent"><ArrowLeft size={15} /></a>
      <a href="#students" className="font-medium text-muted hover:text-accent">{t.students}</a>
      <ChevronRight size={14} className="text-faint" />
      {group ? <a href={`#students/faculty/${faculty.id}`} className="font-medium text-muted hover:text-accent">{faculty.name}</a> : <span className="font-semibold text-ink">{faculty.name}</span>}
      {group && <><ChevronRight size={14} className="text-faint" /><span className="font-semibold text-ink">{group.name}</span></>}
    </nav>
  );

  if (group && faculty) {
    return (
      <div>
        {trail}
        <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
          <p className="text-lg font-semibold text-ink">{group.name}</p>
          <p className="text-sm text-muted">{[faculty.name, details(group)].filter(Boolean).join(" · ")}</p>
          <GroupStudents group={group} students={students} allGroups={groups} universityId={universityId} onChanged={onChanged} />
        </div>
      </div>
    );
  }

  if (faculty) {
    const facultyGroups = groups.filter((item) => item.facultyId === faculty.id);
    return (
      <div>
        {trail}
        {facultyGroups.length === 0 ? <p className="text-sm text-muted">{t.noGroupsYet}</p> : (
          <ul className="space-y-3">
            {facultyGroups.map((item) => (
              <li key={item.id}>
                <a href={`#students/group/${item.id}`} className={rowLink}>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="font-semibold text-ink">{item.name}</span><span className="text-xs text-muted">{details(item)}</span></span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{t.nouns.student.count.replace("{n}", String(countFor(item.id)))}<ChevronRight size={18} className="text-muted" /></span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (faculties.length === 0) return <EmptyState icon={GraduationCap} title={t.nouns.faculty.empty} description={t.facultyEmpty} />;
  return (
    <ul className="space-y-3">
      {faculties.map((item) => (
        <li key={item.id}>
          <a href={`#students/faculty/${item.id}`} className={rowLink}>
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="font-semibold text-ink">{item.name}</span><span className="text-xs text-muted">{item.degrees?.join(" · ")}</span></span>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </a>
        </li>
      ))}
    </ul>
  );
}
