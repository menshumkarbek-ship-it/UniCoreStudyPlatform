"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, Plus, Trash2, X } from "lucide-react";
import type { Item } from "@/components/admin/ResourceSection";
import TimetableGrid from "@/components/TimetableGrid";
import { Alert, EmptyState, Field, dangerButton, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { api } from "@/lib/client";
import { weekdays } from "@/lib/time";

type Faculty = { id: number; name: string; degrees?: string[] };
type Group = { id: number; name: string; facultyId: number; degree: string | null; studyYear: string | null };
type Course = { id: number; code: string; title: string; professorName: string; groups: { id: number; name: string }[] };
export type TimetableEntry = Item & { weekday: number; startsAt: string; endsAt: string; room: string; courseId: number; code: string; title: string; groupId: number; groupName: string; professorId: number; professorName: string };

/** Class fields for one group: only the subjects that group takes, with the group already chosen. */
function TimetableFields({ editing, courses, groupId }: { editing: TimetableEntry | null; courses: Course[]; groupId: number }) {
  const t = useDictionary().adm;
  const [courseId, setCourseId] = useState(editing?.courseId ?? 0);
  const course = courses.find((item) => item.id === courseId);
  return (
    <>
      <Field label={t.subject}>
        <select name="courseId" required value={courseId || ""} onChange={(event) => setCourseId(Number(event.target.value))} className={inputClass}>
          <option value="">{t.chooseSubject}</option>
          {courses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title} ({item.professorName})</option>)}
        </select>
      </Field>
      <Field label={t.group}>
        <select name="groupId" required defaultValue={editing?.groupId ?? groupId} key={courseId} className={inputClass}>
          <option value="">{course ? t.chooseGroup : t.chooseSubjectFirst}</option>
          {course?.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </Field>
      <Field label={t.day}><select name="weekday" required defaultValue={editing?.weekday ?? 1} className={inputClass}>{weekdays.map((day) => <option key={day.value} value={day.value}>{t.weekdays[day.value - 1]}</option>)}</select></Field>
      <Field label={t.room}><input name="room" required maxLength={80} defaultValue={editing?.room} placeholder={t.roomPlaceholder} className={inputClass} /></Field>
      <Field label={t.starts}><input name="startsAt" type="time" required defaultValue={editing?.startsAt ?? "09:00"} className={inputClass} /></Field>
      <Field label={t.ends}><input name="endsAt" type="time" required defaultValue={editing?.endsAt ?? "10:20"} className={inputClass} /></Field>
    </>
  );
}

function GroupTimetable({ group, entries, courses, universityId, onChanged }: { group: Group; entries: TimetableEntry[]; courses: Course[]; universityId: number; onChanged: (items: TimetableEntry[]) => void }) {
  const t = useDictionary().adm;
  const n = t.nouns.class;
  const own = entries.filter((entry) => entry.groupId === group.id);
  const offered = courses.filter((course) => course.groups.some((item) => item.id === group.id));
  const [editing, setEditing] = useState<TimetableEntry | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const current = editing === "new" ? null : editing;

  // Clicking a class card opens it for editing above the grid, scrolled into view.
  const open = (next: TimetableEntry | "new" | null) => {
    setEditing(next);
    setMessage(null);
    if (next) window.setTimeout(() => form.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const result = await api<{ items: TimetableEntry[] }>("/api/admin/timetable", {
        method: current ? "PATCH" : "POST",
        json: { courseId: Number(data.get("courseId")), groupId: Number(data.get("groupId")), weekday: Number(data.get("weekday")), startsAt: data.get("startsAt"), endsAt: data.get("endsAt"), room: data.get("room"), universityId, ...(current ? { id: current.id } : {}) },
      });
      onChanged(result.items);
      setEditing(null);
      setMessage({ tone: "success", text: current ? t.updated : t.added });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!current || !window.confirm(t.confirmDelete)) return;
    try {
      const result = await api<{ items: TimetableEntry[] }>(`/api/admin/timetable?${new URLSearchParams({ id: String(current.id), universityId: String(universityId) })}`, { method: "DELETE" });
      onChanged(result.items);
      setEditing(null);
      setMessage({ tone: "success", text: t.deleted });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{own.length ? t.clickClassToEdit : t.timetableEmpty}</p>
        {offered.length ? <button type="button" onClick={() => open(editing === "new" ? null : "new")} className={editing === "new" ? secondaryButton : primaryButton}>{editing === "new" ? <X size={16} /> : <Plus size={16} />}{editing === "new" ? t.cancel : n.add}</button>
          : <p className="text-xs text-ink">{t.timetableBlocked}</p>}
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {editing && (
        <form ref={form} key={current?.id ?? "new"} onSubmit={submit} className="rounded-lg border border-ink bg-surface p-5 sm:p-6">
          <p className="mb-5 text-lg font-medium tracking-[-0.01em] text-ink">{current ? n.edit : n.new}</p>
          <div className="grid gap-4 sm:grid-cols-2"><TimetableFields editing={current} courses={offered} groupId={group.id} /></div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className={primaryButton}>{saving ? t.saving : current ? t.saveChanges : n.add}</button>
            <button type="button" onClick={() => open(null)} className={secondaryButton}>{t.cancel}</button>
            {current && <button type="button" onClick={() => void remove()} className={`${dangerButton} ml-auto h-10`}><Trash2 size={14} />{t.delete}</button>}
          </div>
        </form>
      )}
      <TimetableGrid entries={own} view="student" onSelect={(entry) => open(own.find((item) => item.id === entry.id) ?? null)} />
    </div>
  );
}

/** Where the timetable is navigated to, read from the address (#timetable, #timetable/faculty/3, #timetable/group/7). */
type Place = { facultyId?: number; groupId?: number };
function readPlace(): Place {
  const [, kind, id] = window.location.hash.slice(1).split("/");
  return kind === "faculty" ? { facultyId: Number(id) } : kind === "group" ? { groupId: Number(id) } : {};
}

const rowLink = "flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted p-4 transition hover:border-accent";

/**
 * The university's timetable, navigated like the rest of the app: faculties, then a faculty's groups, then one group's
 * week. Each step is its own address, so Back, reload, and links work, and only one group's week is ever drawn.
 */
export default function TimetableByGroup({ faculties, groups, entries, courses, universityId, onChanged }: {
  faculties: Faculty[]; groups: Group[]; entries: TimetableEntry[]; courses: Course[]; universityId: number; onChanged: (items: TimetableEntry[]) => void;
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

  // Where you are, with a way back up: Timetable › Faculty › Group.
  const trail = faculty && (
    <nav aria-label={t.timetable} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <a href={group ? `#timetable/faculty/${faculty.id}` : "#timetable"} aria-label={t.backTo.replace("{name}", group ? faculty.name : t.timetable)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent"><ArrowLeft size={15} /></a>
      <a href="#timetable" className="font-medium text-muted hover:text-accent">{t.timetable}</a>
      <ChevronRight size={14} className="text-faint" />
      {group ? <a href={`#timetable/faculty/${faculty.id}`} className="font-medium text-muted hover:text-accent">{faculty.name}</a> : <span className="font-semibold text-ink">{faculty.name}</span>}
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
          <GroupTimetable group={group} entries={entries} courses={courses} universityId={universityId} onChanged={onChanged} />
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
                <a href={`#timetable/group/${item.id}`} className={rowLink}>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="font-semibold text-ink">{item.name}</span><span className="text-xs text-muted">{details(item)}</span></span>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (faculties.length === 0) return <EmptyState icon={CalendarDays} title={t.nouns.faculty.empty} description={t.facultyEmpty} />;
  return (
    <ul className="space-y-3">
      {faculties.map((item) => (
        <li key={item.id}>
          <a href={`#timetable/faculty/${item.id}`} className={rowLink}>
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="font-semibold text-ink">{item.name}</span><span className="text-xs text-muted">{item.degrees?.join(" · ")}</span></span>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </a>
        </li>
      ))}
    </ul>
  );
}
