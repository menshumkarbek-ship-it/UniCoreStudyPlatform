"use client";

import { FormEvent, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, FileText, NotebookPen, Plus, Trash2, Upload, X } from "lucide-react";
import { Alert, Badge, Card, EmptyState, Field, createTile, dangerButton, inputBase, inputClass, linkButton, primaryButton, secondaryButton } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { fill } from "@/i18n/format";
import { api, formatDate, useApi } from "@/lib/client";
import { isoWeekday, localDateString, weekdayName } from "@/lib/time";

type Entry = { id: number; weekday: number; startsAt: string; endsAt: string; code: string; title: string; groupName: string };
type Exam = {
  id: number; title: string; examDate: string; startsAt: string; endsAt: string; fileName: string; code: string; courseTitle: string; groupName: string;
  points: number; componentName: string;
  // Student view: their own result. Professor view: how many results are in.
  score?: number | null; feedback?: string | null; resultCount?: number; studentCount?: number;
};
type GradingComponent = { id: number; name: string; weight: number; defaultHomework: boolean; defaultExams: boolean };
type Result = { studentId: number; studentName: string; studentNumber: string | null; score: number | null; feedback: string | null };

/** The next date (today included) that falls on the class's weekday. */
function nextClassDate(weekday: number) {
  const date = new Date();
  date.setDate(date.getDate() + ((weekday - isoWeekday(date) + 7) % 7));
  return localDateString(date);
}

function ResultRow({ exam, result, onSaved }: { exam: Exam; result: Result; onSaved: () => void }) {
  const t = useDictionary().wk;
  const [score, setScore] = useState(result.score?.toString() ?? "");
  const [comment, setComment] = useState(result.feedback ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setState("saving");
    try {
      await api(`/api/exams/${exam.id}/results`, { method: "PATCH", json: { studentId: result.studentId, score: Number(score), feedback: comment } });
      setState("saved");
      onSaved();
    } catch (error) { setState(error instanceof Error ? error.message : t.couldNotSave); }
  };
  return (
    <li className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center">
      <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-ink">{result.studentName}{result.score !== null ? <Badge tone="success">{result.score}/{exam.points}</Badge> : <Badge>{t.noResultYet}</Badge>}</p>
      <form onSubmit={save} className="flex flex-wrap items-start gap-2">
        <input aria-label={t.scoreAria} type="number" min={0} max={exam.points} required value={score} onChange={(event) => { setScore(event.target.value); setState("idle"); }} className={`${inputBase} w-20`} placeholder="0" />
        <input aria-label={t.feedbackAria} value={comment} onChange={(event) => { setComment(event.target.value); setState("idle"); }} maxLength={2000} className={`${inputBase} min-w-40 flex-1`} placeholder={t.feedbackPlaceholder} />
        <button type="submit" disabled={state === "saving"} className={`${primaryButton} h-10`}>{state === "saving" ? t.saving : state === "saved" ? t.savedBtn : t.save}</button>
        {state !== "idle" && state !== "saving" && state !== "saved" && <p className="w-full text-xs text-red-600">{state}</p>}
      </form>
    </li>
  );
}

/** The professor's results panel for one exam: every student in the group with a score field. */
function ExamResults({ exam, onChanged }: { exam: Exam; onChanged: () => void }) {
  const t = useDictionary().wk;
  const { data, reload } = useApi<{ results: Result[] }>(`/api/exams/${exam.id}/results`);
  return (
    <ul className="mt-2 divide-y divide-line">
      {!data ? <li className="py-3 text-xs text-muted">{t.loading}</li> : data.results.length === 0 ? <li className="py-3 text-xs text-muted">{t.noStudentsInGroup}</li>
        : data.results.map((result) => <ResultRow key={`${result.studentId}-${result.score}`} exam={exam} result={result} onSaved={() => { reload(); onChanged(); }} />)}
    </ul>
  );
}

function ExamList({ exams, today, professor, onDelete, onChanged }: { exams: Exam[]; today: string; professor: boolean; onDelete?: (exam: Exam) => void; onChanged?: () => void }) {
  const t = useDictionary().wk;
  const [expanded, setExpanded] = useState<number | null>(null);
  const upcoming = exams.filter((exam) => exam.examDate >= today);
  const past = exams.filter((exam) => exam.examDate < today);
  const render = (exam: Exam, isPast: boolean) => (
    <li key={exam.id} className="rounded-lg border border-line bg-surface-muted p-4">
      <div className={`flex items-start justify-between gap-3 ${isPast && expanded !== exam.id ? "opacity-70" : ""}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{exam.code}</Badge>{professor && <Badge>{exam.groupName}</Badge>}{exam.examDate === today && <Badge tone="warning">{t.today}</Badge>}<Badge>{exam.componentName}</Badge>
            {!professor && (exam.score !== null && exam.score !== undefined ? <Badge tone="success">{fill(t.examResult, { score: exam.score, points: exam.points })}</Badge> : isPast && <Badge>{t.noResultYet}</Badge>)}
          </div>
          <h3 className="mt-2 font-semibold text-ink">{exam.title}</h3>
          <p className="mt-0.5 text-xs text-muted">{exam.courseTitle}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink-soft"><CalendarClock size={14} className="text-accent" />{formatDate(exam.examDate, { weekday: "long", day: "numeric", month: "long" })} · {exam.startsAt}–{exam.endsAt}</p>
          {!professor && exam.feedback && <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-soft"><span className="font-semibold">{t.feedbackLabel}</span> {exam.feedback}</p>}
        </div>
        {professor && onDelete && <button type="button" onClick={() => onDelete(exam)} className={dangerButton} aria-label={fill(t.deleteAria, { title: exam.title })}><Trash2 size={13} /></button>}
      </div>
      <a href={`/api/exams/${exam.id}/file`} target="_blank" rel="noreferrer" className={`${linkButton} mt-3`}><FileText size={13} />{exam.fileName}</a>
      {professor && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => setExpanded(expanded === exam.id ? null : exam.id)} className={linkButton}>{expanded === exam.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{expanded === exam.id ? t.hideResults : t.enterResults}</button>
            <p className="text-xs text-muted">{fill(t.resultsProgress, { n: exam.resultCount ?? 0, total: exam.studentCount ?? 0, points: exam.points })}</p>
          </div>
          {expanded === exam.id && <ExamResults exam={exam} onChanged={() => onChanged?.()} />}
        </>
      )}
    </li>
  );
  if (exams.length === 0) return <EmptyState icon={NotebookPen} title={t.noExamsScheduled} />;
  return (
    <div className="space-y-5">
      {upcoming.length > 0 && <ul className="space-y-3">{upcoming.map((exam) => render(exam, false))}</ul>}
      {past.length > 0 && <div><p className="mb-2 text-xs font-bold text-faint">{t.pastLabel}</p><ul className="space-y-3">{past.map((exam) => render(exam, true))}</ul></div>}
    </div>
  );
}

function ProfessorExams() {
  const t = useDictionary().wk;
  const { data, reload } = useApi<{ entries: Entry[]; exams: Exam[]; today: string; components: GradingComponent[] }>("/api/exams");
  const [entryId, setEntryId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const entries = data?.entries ?? [];
  const exams = data?.exams ?? [];
  const components = data?.components ?? [];
  const entry = entries.find((item) => String(item.id) === entryId);

  const chooseEntry = (value: string) => {
    setEntryId(value);
    const selected = entries.find((item) => String(item.id) === value);
    if (selected) { setExamDate(nextClassDate(selected.weekday)); setStartsAt(selected.startsAt); setEndsAt(selected.endsAt); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("timetableEntryId", entryId);
    setSaving(true);
    try {
      await api("/api/exams", { method: "POST", body });
      setMessage({ tone: "success", text: t.examScheduled });
      form.reset();
      setEntryId("");
      setCreating(false);
      reload();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSaving(false); }
  };

  const remove = async (exam: Exam) => {
    if (!window.confirm(fill(t.deleteExamConfirm, { title: exam.title }))) return;
    try { await api(`/api/exams/${exam.id}`, { method: "DELETE" }); reload(); } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); }
  };

  return (
    <>
      {message && <div className="mb-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
      {/* Laid out like Homework: a full-width tile above the exams opens into the scheduling form in place. */}
      <Card title={t.navExams} icon={NotebookPen}>
        {data && entries.length === 0 && <p className="mb-4 text-sm text-muted">{t.noClassesInTimetable}</p>}
        {entries.length > 0 && !creating && <button type="button" onClick={() => { setCreating(true); setMessage(null); }} className={`${createTile} mb-4`}><Plus size={16} />{t.scheduleAnExam}</button>}
        {creating && (
          <div className="mb-4 rounded-lg border border-line bg-surface-muted p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{t.scheduleAnExam}</h3>
                <p className="mt-0.5 text-sm text-muted">{t.scheduleDesc}</p>
              </div>
              <button type="button" onClick={() => setCreating(false)} className={`${secondaryButton} shrink-0`}><X size={16} />{t.cancel}</button>
            </div>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field label={t.classLabel} className="sm:col-span-2">
                <select required value={entryId} onChange={(event) => chooseEntry(event.target.value)} className={inputClass}>
                  <option value="">{t.chooseClass}</option>
                  {entries.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.groupName} · {weekdayName(item.weekday)} {item.startsAt}–{item.endsAt}</option>)}
                </select>
              </Field>
              <Field label={t.title} className="sm:col-span-2"><input name="title" required minLength={2} maxLength={200} placeholder={t.midtermPlaceholder} className={inputClass} /></Field>
              <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3 sm:col-span-2">
                <Field label={t.dateLabel}><input name="examDate" type="date" required value={examDate} min={data?.today} onChange={(event) => setExamDate(event.target.value)} className={inputClass} /></Field>
                <Field label={t.starts}><input name="startsAt" type="time" required value={startsAt} min={entry?.startsAt} max={entry?.endsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} /></Field>
                <Field label={t.ends}><input name="endsAt" type="time" required value={endsAt} min={entry?.startsAt} max={entry?.endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputClass} /></Field>
              </div>
              <Field label={t.countsToward}>
                <select name="componentId" defaultValue={components.find((component) => component.defaultExams)?.id} className={inputClass}>
                  {components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.weight}%</option>)}
                </select>
              </Field>
              <Field label={t.maxScore}><input name="points" type="number" min={1} max={1000} defaultValue={100} required className={inputClass} /></Field>
              <Field label={t.questionPaper} hint={t.questionPaperHint} className="sm:col-span-2"><input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-obsidian file:px-3 file:py-2 file:text-[11px] file:font-medium file:text-white" /></Field>
              <div className="sm:col-span-2"><button type="submit" disabled={saving || !entryId} className={primaryButton}><Upload size={16} />{saving ? t.schedulingBtn : t.scheduleExam}</button></div>
            </form>
          </div>
        )}
        <ExamList exams={exams} today={data?.today ?? ""} professor onDelete={(exam) => void remove(exam)} onChanged={reload} />
      </Card>
    </>
  );
}

function StudentExams() {
  const t = useDictionary().wk;
  const { data } = useApi<{ exams: Exam[]; today: string }>("/api/exams");
  return (
    <Card title={t.navExams} icon={NotebookPen}>
      <ExamList exams={data?.exams ?? []} today={data?.today ?? ""} professor={false} />
    </Card>
  );
}

export default function ExamsPage() {
  return useSessionUser().role === "professor" ? <ProfessorExams /> : <StudentExams />;
}
