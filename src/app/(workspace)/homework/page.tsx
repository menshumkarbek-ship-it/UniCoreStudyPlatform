"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, ClipboardList, Download, ExternalLink, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { Alert, Badge, Card, EmptyState, Field, createTile, dangerButton, inputBase, inputClass, linkButton, primaryButton, secondaryButton, textareaClass } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary, useLocale } from "@/i18n/locale-provider";
import { fill } from "@/i18n/format";
import { pluralize } from "@/i18n/pluralize";
import { api, formatDateTime, formatFileSize, useApi } from "@/lib/client";
import { localDateTimeInputValue } from "@/lib/time";

type StudentHomework = { id: number; title: string; instructions: string; dueAt: string; points: number; courseCode: string; courseTitle: string; professorName: string; componentName: string; status: "submitted" | "graded" | null; fileName: string | null; submittedAt: string | null; grade: number | null; feedback: string | null };
type ProfessorHomework = { id: number; title: string; instructions: string; dueAt: string; points: number; courseId: number; courseCode: string; courseTitle: string; groupId: number; groupName: string; componentName: string; studentCount: number; submittedCount: number; gradedCount: number };
type GradingComponent = { id: number; name: string; weight: number; defaultHomework: boolean; defaultExams: boolean };
type Offering = { courseId: number; courseCode: string; courseTitle: string; groupId: number; groupName: string; studentCount: number };
type Submission = { studentId: number; studentName: string; studentNumber: string | null; status: "submitted" | "graded" | null; fileName: string | null; fileSize: number | null; submittedAt: string | null; grade: number | null; feedback: string | null };

const acceptedFiles = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

function useFeedback() {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return { message, success: (text: string) => setMessage({ tone: "success", text }), failure: (error: unknown) => setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }), clear: () => setMessage(null) };
}

function StudentHomeworkView() {
  const dict = useDictionary();
  const t = dict.wk;
  const { locale } = useLocale();
  const { data, loading, reload } = useApi<{ homework: StudentHomework[] }>("/api/homework");
  const feedback = useFeedback();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [course, setCourse] = useState("all");
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  const homework = data?.homework ?? [];
  const courses = Array.from(new Set(homework.map((item) => item.courseCode)));
  const visible = homework.filter((item) => course === "all" || item.courseCode === course);

  const upload = async (item: StudentHomework, file: File) => {
    setBusyId(item.id);
    feedback.clear();
    const body = new FormData();
    body.append("file", file);
    try {
      await api(`/api/homework/${item.id}/submissions`, { method: "POST", body });
      feedback.success(fill(t.uploadedMsg, { file: file.name, title: item.title }));
      reload();
    } catch (error) { feedback.failure(error); } finally { setBusyId(null); }
  };

  const remove = async (item: StudentHomework) => {
    if (!window.confirm(t.removeConfirm)) return;
    setBusyId(item.id);
    try {
      await api(`/api/homework/${item.id}/submissions`, { method: "DELETE" });
      feedback.success(t.submissionRemoved);
      reload();
    } catch (error) { feedback.failure(error); } finally { setBusyId(null); }
  };

  return (
    <>
      {feedback.message && <div className="mb-4"><Alert tone={feedback.message.tone}>{feedback.message.text}</Alert></div>}
      {/* One list, an assignment per row, like the Subjects page. */}
      <Card title={dict.common.nav.homework} icon={ClipboardList} actions={courses.length > 1 && <select aria-label={t.filterBySubject} value={course} onChange={(event) => setCourse(event.target.value)} className={`${inputBase} w-auto`}><option value="all">{t.allSubjects}</option>{courses.map((code) => <option key={code}>{code}</option>)}</select>}>
        {!loading && visible.length === 0 ? <EmptyState icon={ClipboardList} title={t.noHomeworkTitle} description={t.noHomeworkDesc} /> : (
          <ul className="space-y-3">
            {visible.map((item) => {
              const closed = now > 0 && new Date(item.dueAt).getTime() <= now;
              const status = item.status === "graded" ? <Badge tone="success">{fill(t.statusGraded, { grade: item.grade ?? 0, points: item.points })}</Badge> : item.status === "submitted" ? <Badge tone="accent">{t.statusSubmitted}</Badge> : closed ? <Badge tone="danger">{t.statusMissed}</Badge> : <Badge tone="warning">{t.statusToDo}</Badge>;
              return (
                <li key={item.id} className="rounded-lg border border-line bg-surface-muted p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{item.courseCode}</Badge>{status}<Badge>{item.componentName}</Badge></div>
                      <h3 className="mt-2 font-semibold text-ink">{item.title}</h3>
                      <p className="text-xs text-muted">{item.courseTitle} · {item.professorName}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{item.instructions}</p>
                    </div>
                    <div className="shrink-0 text-sm sm:text-right">
                      <p className={`flex items-center gap-1.5 font-semibold sm:justify-end ${closed ? "text-muted" : "text-ink"}`}><CalendarClock size={15} />{formatDateTime(item.dueAt)}</p>
                      <p className="mt-1 text-xs text-muted">{fill(t.pointsN, { n: item.points, noun: pluralize(locale, item.points, t.pointForms) })}</p>
                    </div>
                  </div>
                  {item.status === "graded" && item.feedback && <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-soft"><span className="font-semibold">{t.feedbackLabel}</span> {item.feedback}</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    {item.fileName ? <a href={`/api/homework/${item.id}/file`} target="_blank" rel="noreferrer" className={linkButton}><FileText size={14} />{item.fileName}</a> : <span className="text-xs text-faint">{t.noFileSubmitted}</span>}
                    {item.status !== "graded" && !closed && (
                      <div className="flex items-center gap-2">
                        <label className={`${secondaryButton} h-9 cursor-pointer text-xs ${busyId === item.id ? "pointer-events-none opacity-60" : ""}`}>
                          <Upload size={14} />{busyId === item.id ? t.uploading : item.fileName ? t.replaceFile : t.uploadFile}
                          <input type="file" accept={acceptedFiles} className="sr-only" disabled={busyId === item.id} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void upload(item, file); }} />
                        </label>
                        {item.fileName && <button type="button" onClick={() => void remove(item)} disabled={busyId === item.id} className={dangerButton}><Trash2 size={14} />{t.remove}</button>}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function GradeRow({ homework, submission, onSaved }: { homework: ProfessorHomework; submission: Submission; onSaved: () => void }) {
  const t = useDictionary().wk;
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "");
  const [comment, setComment] = useState(submission.feedback ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setState("saving");
    try {
      await api(`/api/homework/${homework.id}/submissions`, { method: "PATCH", json: { studentId: submission.studentId, grade: Number(grade), feedback: comment } });
      setState("saved");
      onSaved();
    } catch (error) { setState(error instanceof Error ? error.message : t.couldNotSave); }
  };
  const fileUrl = `/api/homework/${homework.id}/file?studentId=${submission.studentId}`;
  return (
    <li className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">{submission.studentName}{submission.status === "graded" ? <Badge tone="success">{submission.grade}/{homework.points}</Badge> : submission.status === "submitted" ? <Badge tone="warning">{t.toGradeBadge}</Badge> : <Badge>{t.notSubmitted}</Badge>}</p>
        {submission.fileName ? (
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="truncate">{submission.fileName} · {formatFileSize(submission.fileSize ?? 0)} · {formatDateTime(submission.submittedAt!)}</span>
            <a href={fileUrl} target="_blank" rel="noreferrer" className={linkButton}><ExternalLink size={12} />{t.openFile}</a>
            <a href={`${fileUrl}&download=1`} className={linkButton}><Download size={12} />{t.downloadFile}</a>
          </p>
        ) : <p className="mt-1 text-xs text-faint">{submission.studentNumber ?? ""}</p>}
      </div>
      {submission.status && (
        <form onSubmit={save} className="flex flex-wrap items-start gap-2">
          <input aria-label={t.gradeAria} type="number" min={0} max={homework.points} required value={grade} onChange={(event) => { setGrade(event.target.value); setState("idle"); }} className={`${inputBase} w-20`} placeholder="0" />
          <input aria-label={t.feedbackAria} value={comment} onChange={(event) => { setComment(event.target.value); setState("idle"); }} maxLength={2000} className={`${inputBase} min-w-40 flex-1`} placeholder={t.feedbackPlaceholder} />
          <button type="submit" disabled={state === "saving"} className={`${primaryButton} h-10`}>{state === "saving" ? t.saving : state === "saved" ? t.savedBtn : t.save}</button>
          {state !== "idle" && state !== "saving" && state !== "saved" && <p className="w-full text-xs text-red-600">{state}</p>}
        </form>
      )}
    </li>
  );
}

function ProfessorHomeworkCard({ item, expanded, onToggle, onChanged, onError }: { item: ProfessorHomework; expanded: boolean; onToggle: () => void; onChanged: () => void; onError: (error: unknown) => void }) {
  const t = useDictionary().wk;
  const { data, reload } = useApi<{ submissions: Submission[] }>(expanded ? `/api/homework/${item.id}/submissions` : null);
  const remove = async () => {
    if (!window.confirm(fill(t.deleteHomeworkConfirm, { title: item.title, n: item.submittedCount }))) return;
    try { await api(`/api/homework/${item.id}`, { method: "DELETE" }); onChanged(); } catch (error) { onError(error); }
  };
  return (
    <li className="rounded-lg border border-line bg-surface-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{item.courseCode}</Badge><Badge>{item.groupName}</Badge>{new Date(item.dueAt) < new Date() ? <Badge>{t.closedBadge}</Badge> : <Badge tone="warning">{t.openBadge}</Badge>}<Badge>{item.componentName}</Badge></div>
          <h3 className="mt-2 font-semibold text-ink">{item.title}</h3>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-ink-soft">{item.instructions}</p>
        </div>
        <div className="shrink-0 text-sm sm:text-right">
          <p className="flex items-center gap-1.5 font-semibold text-ink-soft sm:justify-end"><CalendarClock size={15} />{formatDateTime(item.dueAt)}</p>
          <p className="mt-1 text-xs text-muted">{fill(t.submittedProgress, { submitted: item.submittedCount, total: item.studentCount, graded: item.gradedCount, points: item.points })}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <button type="button" onClick={onToggle} className={linkButton}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{expanded ? t.hideSubmissions : t.reviewAndGrade}</button>
        <button type="button" onClick={() => void remove()} className={dangerButton}><Trash2 size={13} />{t.delete}</button>
      </div>
      {expanded && (
        <ul className="mt-2 divide-y divide-line">
          {!data ? <li className="py-3 text-xs text-muted">{t.loading}</li> : data.submissions.length === 0 ? <li className="py-3 text-xs text-muted">{t.noStudentsInGroup}</li> : data.submissions.map((submission) => <GradeRow key={`${submission.studentId}-${submission.grade}`} homework={item} submission={submission} onSaved={() => { reload(); onChanged(); }} />)}
        </ul>
      )}
    </li>
  );
}

function ProfessorHomeworkView() {
  const dict = useDictionary();
  const t = dict.wk;
  const { locale } = useLocale();
  const { data, loading, reload } = useApi<{ homework: ProfessorHomework[]; offerings: Offering[]; components: GradingComponent[] }>("/api/homework");
  const feedback = useFeedback();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [offeringKey, setOfferingKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [minDue, setMinDue] = useState("");
  const offerings = useMemo(() => data?.offerings ?? [], [data]);
  const homework = data?.homework ?? [];
  const components = data?.components ?? [];

  useEffect(() => {
    const open = Number(new URLSearchParams(window.location.search).get("open"));
    const timer = window.setTimeout(() => { if (open) setExpanded(open); setMinDue(localDateTimeInputValue(new Date())); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const offering = offerings.find((entry) => `${entry.courseId}:${entry.groupId}` === offeringKey);
    if (!offering) return;
    setSaving(true);
    try {
      await api("/api/homework", { method: "POST", json: { courseId: offering.courseId, groupId: offering.groupId, title: form.get("title"), instructions: form.get("instructions"), dueAt: new Date(String(form.get("dueAt"))).toISOString(), points: Number(form.get("points")), componentId: Number(form.get("componentId")) || undefined } });
      feedback.success(fill(t.homeworkAssigned, { group: offering.groupName }));
      setCreating(false);
      setOfferingKey("");
      reload();
    } catch (error) { feedback.failure(error); } finally { setSaving(false); }
  };

  return (
    <>
      {feedback.message && <div className="mb-4"><Alert tone={feedback.message.tone}>{feedback.message.text}</Alert></div>}
      <Card title={dict.common.nav.homework} icon={ClipboardList}>
        {/* Creating starts from a full-width tile styled like the assignments below; it opens into the form in place. */}
        {offerings.length > 0 && !creating && <button type="button" onClick={() => { setCreating(true); feedback.clear(); }} className={`${createTile} mb-4`}><Plus size={16} />{t.newHomework}</button>}
        {creating && (
          <div className="mb-4 rounded-lg border border-line bg-surface-muted p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-ink">{t.newHomework}</h3>
              <button type="button" onClick={() => setCreating(false)} className={secondaryButton}><X size={16} />{t.cancel}</button>
            </div>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <Field label={t.subjectAndGroup} className="sm:col-span-2">
                <select required value={offeringKey} onChange={(event) => setOfferingKey(event.target.value)} className={inputClass}>
                  <option value="">{t.choose}</option>
                  {offerings.map((entry) => <option key={`${entry.courseId}:${entry.groupId}`} value={`${entry.courseId}:${entry.groupId}`}>{fill(t.optionLabel, { code: entry.courseCode, title: entry.courseTitle, group: entry.groupName, count: `${entry.studentCount} ${pluralize(locale, entry.studentCount, t.studentForms)}` })}</option>)}
                </select>
              </Field>
              <Field label={t.title} className="sm:col-span-2"><input name="title" required minLength={2} maxLength={160} className={inputClass} /></Field>
              <Field label={t.instructions} className="sm:col-span-2"><textarea name="instructions" required minLength={2} maxLength={5000} rows={5} className={textareaClass} /></Field>
              <Field label={t.deadline}><input name="dueAt" type="datetime-local" required min={minDue} className={inputClass} /></Field>
              <Field label={t.pointsField}><input name="points" type="number" min={1} max={1000} defaultValue={100} required className={inputClass} /></Field>
              <Field label={t.countsToward} className="sm:col-span-2">
                <select name="componentId" defaultValue={components.find((component) => component.defaultHomework)?.id} className={inputClass}>
                  {components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.weight}%</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><button type="submit" disabled={saving} className={primaryButton}><Upload size={16} />{saving ? t.assigning : t.assignAndNotify}</button></div>
            </form>
          </div>
        )}
        {!loading && offerings.length === 0 && <EmptyState icon={ClipboardList} title={t.noGroupsToAssignTitle} description={t.noGroupsToAssignDesc} />}
        {!loading && offerings.length > 0 && homework.length === 0 && !creating && <EmptyState icon={ClipboardList} title={t.noHomeworkTitle} description={t.noHomeworkProfDesc} />}
        {homework.length > 0 && (
          <ul className="space-y-3">
            {homework.map((item) => <ProfessorHomeworkCard key={item.id} item={item} expanded={expanded === item.id} onToggle={() => setExpanded(expanded === item.id ? null : item.id)} onChanged={reload} onError={feedback.failure} />)}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function HomeworkPage() {
  return useSessionUser().role === "professor" ? <ProfessorHomeworkView /> : <StudentHomeworkView />;
}
