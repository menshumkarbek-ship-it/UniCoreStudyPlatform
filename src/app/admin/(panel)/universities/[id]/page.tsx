"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Building2, CalendarDays, GraduationCap, Landmark, Percent, UserRound, Users } from "lucide-react";
import ByFaculty from "@/components/admin/ByFaculty";
import GradingSection from "@/components/admin/GradingSection";
import ResourceSection, { type Item } from "@/components/admin/ResourceSection";
import StudentsByGroup from "@/components/admin/StudentsByGroup";
import TimetableByGroup, { type TimetableEntry } from "@/components/admin/TimetableByGroup";
import { Badge, Field, PageHeader, inputClass, secondaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { api, useApi } from "@/lib/client";

type University = Item & { name: string; city: string; timezone: string };
type Faculty = Item & { name: string; degrees: string[]; groupCount: number; courseCount: number };
type Group = Item & { name: string; facultyId: number; facultyName: string; degree: string | null; studyYear: string | null; studentCount: number; courseCount: number };
type Professor = Item & { fullName: string; email: string; courseCount: number };
type Student = Item & { fullName: string; email: string; studentNumber: string | null; groupId: number | null; groupName: string | null; facultyName: string | null };
type Course = Item & { code: string; title: string; facultyId: number | null; facultyName: string | null; professorId: number; professorName: string; groups: { id: number; name: string }[] };

const tabs = [
  { key: "faculties", label: "faculties", icon: Landmark },
  { key: "groups", label: "groups", icon: Users },
  { key: "professors", label: "professors", icon: UserRound },
  { key: "students", label: "students", icon: GraduationCap },
  { key: "courses", label: "subjects", icon: BookOpen },
  { key: "timetable", label: "timetable", icon: CalendarDays },
  { key: "grading", label: "grading", icon: Percent },
] as const;
type Tab = (typeof tabs)[number]["key"];

function GroupFields({ editing, faculties, defaultFacultyId }: { editing: Group | null; faculties: Faculty[]; defaultFacultyId?: number }) {
  const t = useDictionary().adm;
  const [facultyId, setFacultyId] = useState(editing?.facultyId ?? defaultFacultyId ?? 0);
  const faculty = faculties.find((item) => item.id === facultyId);
  const noDegrees = Boolean(faculty) && faculty!.degrees.length === 0;
  return (
    <>
      <Field label={t.name}><input name="name" required maxLength={120} defaultValue={editing?.name} className={inputClass} /></Field>
      <Field label={t.faculty}>
        <select name="facultyId" required value={facultyId || ""} onChange={(event) => setFacultyId(Number(event.target.value))} className={inputClass}>
          <option value="">{t.choose}</option>
          {faculties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label={t.degree} hint={noDegrees ? t.noDegreesListed : undefined}>
        <select name="degree" key={facultyId} required={!noDegrees} disabled={!faculty || noDegrees} defaultValue={editing?.facultyId === facultyId ? editing?.degree ?? "" : ""} className={inputClass}>
          <option value="">{faculty ? t.chooseDegree : t.chooseFacultyFirst}</option>
          {faculty?.degrees.map((degree) => <option key={degree} value={degree}>{degree}</option>)}
        </select>
      </Field>
      <Field label={t.studyYear}><input name="studyYear" required maxLength={40} defaultValue={editing?.studyYear ?? ""} placeholder={t.studyYearPlaceholder} className={inputClass} /></Field>
    </>
  );
}

function PasswordField({ editing }: { editing: boolean }) {
  const t = useDictionary().adm;
  return <Field label={editing ? t.passwordNew : t.passwordInitial} hint={editing ? t.passwordEditHint : t.passwordCreateHint}><input name="password" type="text" autoComplete="off" minLength={8} required={!editing} className={inputClass} /></Field>;
}

export default function UniversityPage() {
  const dict = useDictionary();
  const t = dict.adm;
  const universityId = Number(useParams<{ id: string }>().id);
  const scoped = (resource: string) => `/api/admin/${resource}?universityId=${universityId}`;
  const universities = useApi<{ items: University[] }>("/api/admin/universities");
  const faculties = useApi<{ items: Faculty[] }>(scoped("faculties"));
  const groups = useApi<{ items: Group[] }>(scoped("groups"));
  const professors = useApi<{ items: Professor[] }>(scoped("professors"));
  const students = useApi<{ items: Student[] }>(scoped("students"));
  const courses = useApi<{ items: Course[] }>(scoped("courses"));
  const timetable = useApi<{ items: TimetableEntry[] }>(scoped("timetable"));
  const [tab, setTab] = useState<Tab>("faculties");
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoNote, setAutoNote] = useState("");

  // The tab lives in the URL hash so links, reloads, and Back/Forward keep it.
  useEffect(() => {
    const syncFromHash = () => {
      // The first part names the tab; the timetable adds its own path after it (e.g. #timetable/group/41).
      const fromHash = window.location.hash.slice(1).split("/")[0];
      if (tabs.some((item) => item.key === fromHash)) setTab(fromHash as Tab);
    };
    const timer = window.setTimeout(syncFromHash, 0);
    window.addEventListener("hashchange", syncFromHash);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", syncFromHash); };
  }, []);
  // pushState alone fires no hashchange; announcing one lets a view nested in the tab (the timetable) return to its start.
  const chooseTab = (next: Tab) => { setTab(next); window.history.pushState(null, "", `#${next}`); window.dispatchEvent(new HashChangeEvent("hashchange")); };

  // Counts and pickers on other tabs depend on what just changed, so refresh them too.
  const refreshAll = () => { faculties.reload(); groups.reload(); professors.reload(); students.reload(); courses.reload(); timetable.reload(); };
  const changed = <T,>(setter: (value: { items: T[] }) => void) => (items: T[]) => { setter({ items }); refreshAll(); };

  const autoFill = async () => {
    setAutoBusy(true);
    try {
      const { created, unplaced } = await api<{ created: number; unplaced: number }>("/api/admin/autoschedule", { method: "POST", json: { universityId } });
      setAutoNote(`${t.autoDone.replace("{created}", String(created))}${unplaced ? t.autoUnplaced.replace("{unplaced}", String(unplaced)) : ""}.`);
      timetable.reload();
    } catch (error) { setAutoNote(error instanceof Error ? error.message : String(error)); } finally { setAutoBusy(false); }
  };

  const university = universities.data?.items.find((item) => item.id === universityId);
  const facultyList = faculties.data?.items ?? [];
  const groupList = groups.data?.items ?? [];
  const professorList = professors.data?.items ?? [];
  const courseList = courses.data?.items ?? [];
  const entries = timetable.data?.items ?? [];

  if (universities.data && !university) return <p className="text-sm text-muted">{t.notFound} <Link href="/admin" className="text-accent">{t.back}</Link></p>;

  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-accent"><ArrowLeft size={15} />{t.back}</Link>
      <PageHeader eyebrow={university ? `${university.city} · ${university.timezone}` : ""} title={university?.name ?? "…"} icon={Building2} description={t.uniPageDescription} />
      <div className="mb-5 grid grid-cols-2 gap-2 md:flex md:gap-1 md:overflow-x-auto md:overflow-y-hidden md:border-b md:border-line" role="tablist">
        {tabs.map((item) => {
          return <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => chooseTab(item.key)} className={`flex items-center gap-2 rounded-lg border px-3 py-3.5 text-sm font-medium transition active:bg-surface-muted md:-mb-px md:shrink-0 md:rounded-none md:border-0 md:border-b-2 md:px-4 md:py-3 md:text-[11px] ${tab === item.key ? "border-periwinkle bg-accent-soft text-ink md:bg-transparent" : "border-line bg-surface text-muted hover:text-ink md:border-transparent md:bg-transparent"}`}><item.icon size={14} strokeWidth={1.75} />{t[item.label]}</button>;
        })}
      </div>

      {tab === "faculties" && (
        <ResourceSection<Faculty> resource="faculties" universityId={universityId} items={facultyList} loading={faculties.loading} onChanged={changed(faculties.setData)} icon={Landmark} noun="faculty"
          emptyHint={t.facultyEmpty}
          columns={[
            { header: t.faculty, cell: (item) => <span className="font-semibold text-ink">{item.name}</span> },
            { header: t.degrees, cell: (item) => item.degrees.length ? <div className="flex flex-wrap gap-1">{item.degrees.map((degree) => <Badge key={degree}>{degree}</Badge>)}</div> : <span className="text-faint">—</span> },
            { header: t.groups, cell: (item) => item.groupCount },
            { header: t.subjects, cell: (item) => item.courseCount },
          ]}
          renderFields={(editing) => (
            <>
              <Field label={t.name} className="sm:col-span-2"><input name="name" required maxLength={160} defaultValue={editing?.name} className={inputClass} /></Field>
              <Field label={t.degrees} hint={t.degreesHint} className="sm:col-span-2"><input name="degrees" maxLength={600} defaultValue={editing?.degrees.join(", ")} placeholder={t.degreesPlaceholder} className={inputClass} /></Field>
            </>
          )}
          toPayload={(form) => ({ name: form.get("name"), degrees: String(form.get("degrees") ?? "").split(",").map((degree) => degree.trim()).filter(Boolean) })} />
      )}

      {tab === "groups" && (
        <ByFaculty tab="groups" title={t.groups} faculties={facultyList} countFor={(id) => groupList.filter((group) => group.facultyId === id).length} countLabel={t.nouns.group.count}>
          {(faculty) => (
            <ResourceSection<Group> resource="groups" universityId={universityId} items={groupList.filter((group) => group.facultyId === faculty?.id)} loading={groups.loading} onChanged={changed(groups.setData)} icon={Users} noun="group"
              emptyHint={t.groupEmpty}
              columns={[
                { header: t.group, cell: (item) => <span className="font-semibold text-ink">{item.name}</span> },
                { header: t.degree, cell: (item) => item.degree ?? <span className="text-faint">—</span> },
                { header: t.studyYear, cell: (item) => item.studyYear ?? <span className="text-faint">—</span> },
                { header: t.students, cell: (item) => item.studentCount },
                { header: t.subjects, cell: (item) => item.courseCount },
              ]}
              renderFields={(editing) => <GroupFields editing={editing} faculties={facultyList} defaultFacultyId={faculty?.id} />}
              toPayload={(form) => ({ name: form.get("name"), facultyId: Number(form.get("facultyId")), degree: form.get("degree") ?? undefined, studyYear: form.get("studyYear") })} />
          )}
        </ByFaculty>
      )}

      {tab === "professors" && (
        <ResourceSection<Professor> resource="professors" universityId={universityId} items={professorList} loading={professors.loading} onChanged={changed(professors.setData)} icon={UserRound} noun="professor"
          emptyHint={t.professorEmpty}
          columns={[{ header: t.nameShort, cell: (item) => <span className="font-semibold text-ink">{item.fullName}</span> }, { header: t.email, cell: (item) => item.email }, { header: t.subjects, cell: (item) => item.courseCount }]}
          renderFields={(editing) => (
            <>
              <Field label={t.fullName}><input name="fullName" required maxLength={160} defaultValue={editing?.fullName} className={inputClass} /></Field>
              <Field label={t.email}><input name="email" type="email" required maxLength={160} defaultValue={editing?.email} className={inputClass} /></Field>
              <PasswordField editing={Boolean(editing)} />
            </>
          )}
          toPayload={(form) => ({ fullName: form.get("fullName"), email: form.get("email"), password: form.get("password") })} />
      )}

      {tab === "students" && (
        <StudentsByGroup faculties={facultyList} groups={groupList} students={students.data?.items ?? []} universityId={universityId} onChanged={changed(students.setData)} />
      )}

      {tab === "courses" && (
        <ByFaculty tab="courses" title={t.subjects} faculties={facultyList} includeNone countFor={(id) => courseList.filter((course) => course.facultyId === id).length} countLabel={t.nouns.subject.count}>
          {(faculty) => (
        <ResourceSection<Course> resource="courses" universityId={universityId} items={courseList.filter((course) => (course.facultyId ?? null) === (faculty?.id ?? null))} loading={courses.loading} onChanged={changed(courses.setData)} icon={BookOpen} noun="subject"
          canCreate={professorList.length > 0} createBlockedReason={t.subjectBlocked}
          emptyHint={t.subjectEmpty}
          columns={[
            { header: t.subject, cell: (item) => <span><span className="font-bold text-accent">{item.code}</span> <span className="text-ink">{item.title}</span></span> },
            { header: t.professor, cell: (item) => item.professorName },
            { header: t.groups, cell: (item) => item.groups.length ? <div className="flex flex-wrap gap-1">{item.groups.map((group) => <Badge key={group.id}>{group.name}</Badge>)}</div> : <Badge tone="warning">{t.noGroups}</Badge> },
          ]}
          renderFields={(editing) => (
            <>
              <Field label={t.code}><input name="code" required maxLength={40} defaultValue={editing?.code} placeholder={t.codePlaceholder} className={`${inputClass} uppercase`} /></Field>
              <Field label={t.title}><input name="title" required maxLength={200} defaultValue={editing?.title} className={inputClass} /></Field>
              <Field label={t.professor}><select name="professorId" required defaultValue={editing?.professorId ?? ""} className={inputClass}><option value="">{t.choose}</option>{professorList.map((professor) => <option key={professor.id} value={professor.id}>{professor.fullName}</option>)}</select></Field>
              <Field label={t.faculty}><select name="facultyId" defaultValue={editing ? editing.facultyId ?? "" : faculty?.id ?? ""} className={inputClass}><option value="">{t.none}</option>{facultyList.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}</select></Field>
              <fieldset className="sm:col-span-2">
                <legend className="text-xs font-bold text-muted">{t.groupsTaking}</legend>
                {groupList.length === 0 ? <p className="mt-2 text-sm text-muted">{t.noGroupsYet}</p> : (
                  <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2 lg:grid-cols-3">
                    {groupList.map((group) => <label key={group.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-surface-muted"><input type="checkbox" name="groupIds" value={group.id} defaultChecked={editing?.groups.some((item) => item.id === group.id)} className="accent-[var(--accent)]" />{group.name}<span className="truncate text-xs text-faint">{group.facultyName}</span></label>)}
                  </div>
                )}
              </fieldset>
            </>
          )}
          toPayload={(form) => ({ code: form.get("code"), title: form.get("title"), professorId: Number(form.get("professorId")), facultyId: form.get("facultyId") ? Number(form.get("facultyId")) : null, groupIds: form.getAll("groupIds").map(Number) })} />
          )}
        </ByFaculty>
      )}

      {tab === "timetable" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={autoBusy} onClick={() => void autoFill()} className={secondaryButton}>{autoBusy ? t.scheduling : t.autoFill}</button>
            <p className="text-xs text-muted">{t.autoHint}</p>
          </div>
          {autoNote && <p role="status" className="text-sm text-muted">{autoNote}</p>}
          {/* Never the whole university at once: faculties, then their groups, then the week of each opened group. */}
          <TimetableByGroup faculties={facultyList} groups={groupList} entries={entries} courses={courseList} universityId={universityId} onChanged={changed(timetable.setData)} />
        </div>
      )}

      {tab === "grading" && <GradingSection universityId={universityId} />}
    </>
  );
}
