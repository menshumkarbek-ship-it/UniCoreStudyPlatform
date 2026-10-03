"use client";

import { FormEvent, useState } from "react";
import { BookText, CalendarDays, ExternalLink, FileText, Link2, Pencil, Plus, Presentation, Trash2, Video, X } from "lucide-react";
import { Alert, Badge, Card, Field, createTile, inputClass, primaryButton, secondaryButton, textareaClass } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { fill } from "@/i18n/format";
import { api, formatFileSize, useApi } from "@/lib/client";

type Material = { id: number; title: string; url: string | null; fileName: string | null; fileType: string | null; fileSize: number | null };
type Lesson = { id: number; week: number; topic: string; materials: Material[] };
type Plan = { canEdit: boolean; syllabus: string; lessons: Lesson[] };

function MaterialIcon({ material }: { material: Material }) {
  const type = material.fileType ?? "";
  const props = { size: 16, className: "shrink-0 text-accent" };
  if (material.url) return <Link2 {...props} />;
  if (type.startsWith("video/") || type.startsWith("audio/")) return <Video {...props} />;
  if (type.includes("presentation") || type.includes("powerpoint")) return <Presentation {...props} />;
  return <FileText {...props} />;
}

function MaterialRow({ material, canEdit, onRemove }: { material: Material; canEdit: boolean; onRemove: () => void }) {
  const t = useDictionary().wk;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
      <MaterialIcon material={material} />
      <a href={material.url ?? `/api/materials/${material.id}/file`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-baseline gap-2 text-sm font-medium text-ink hover:text-accent">
        <span className="truncate">{material.title}</span>
        {material.fileSize != null && <span className="shrink-0 text-xs font-normal text-muted">{formatFileSize(material.fileSize)}</span>}
        <ExternalLink size={12} className="shrink-0 text-faint" aria-label={t.openMaterial} />
      </a>
      {canEdit && <button type="button" onClick={onRemove} aria-label={fill(t.removeMaterial, { name: material.title })} className="shrink-0 text-muted transition hover:text-[#b4234f]"><X size={16} /></button>}
    </li>
  );
}

function MaterialForm({ lessonId, onDone, onError }: { lessonId: number; onDone: () => void; onError: (error: unknown) => void }) {
  const t = useDictionary().wk;
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/api/lessons/${lessonId}/materials`, { method: "POST", body: new FormData(event.currentTarget) });
      onDone();
    } catch (error) { onError(error); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-surface p-3">
      <Field label={t.materialTitle}><input name="title" maxLength={200} className={inputClass} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.materialFile} hint={t.materialHint}><input name="file" type="file" className="block w-full text-sm text-ink file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-muted file:px-3 file:py-2 file:text-sm" /></Field>
        <Field label={t.materialLink}><input name="url" type="url" placeholder="https://" className={inputClass} /></Field>
      </div>
      <div className="flex gap-2"><button type="submit" disabled={saving} className={primaryButton}>{t.addMaterial}</button><button type="button" onClick={onDone} className={secondaryButton}>{t.cancel}</button></div>
    </form>
  );
}

/** Renames a class: a one-line form. */
function TopicForm({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (topic: string) => Promise<void>; onCancel: () => void }) {
  const t = useDictionary().wk;
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try { await onSubmit(String(form.get("topic"))); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface-muted p-4">
      <Field label={t.topicLabel} className="min-w-0 flex-1 basis-60"><input name="topic" required maxLength={300} defaultValue={initial} placeholder={t.topicPlaceholder} autoFocus className={inputClass} /></Field>
      <div className="flex gap-2"><button type="submit" disabled={saving} className={primaryButton}>{t.saveTopic}</button><button type="button" onClick={onCancel} className={secondaryButton}>{t.cancel}</button></div>
    </form>
  );
}

/** Adds classes to a week in one go: the week number (for a new week) and a topic per class, with room for more than one. */
function ClassesForm({ week, weekEditable, onSubmit, onCancel }: { week: number; weekEditable: boolean; onSubmit: (week: number, topics: string[]) => Promise<void>; onCancel: () => void }) {
  const t = useDictionary().wk;
  const [rows, setRows] = useState([0]);
  const [nextRow, setNextRow] = useState(1);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const topics = form.getAll("topic").map((topic) => String(topic).trim()).filter(Boolean);
    if (topics.length === 0) return;
    setSaving(true);
    try { await onSubmit(Number(form.get("week") ?? week), topics); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-surface-muted p-4">
      {weekEditable && <Field label={t.weekLabel} className="w-24"><input name="week" type="number" min={1} max={60} defaultValue={week} required className={inputClass} /></Field>}
      {rows.map((row, index) => (
        <div key={row} className="flex items-end gap-2">
          <Field label={fill(t.classN, { n: index + 1 })} className="min-w-0 flex-1"><input name="topic" required={index === 0} maxLength={300} placeholder={t.topicPlaceholder} autoFocus={index === rows.length - 1} className={inputClass} /></Field>
          {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((item) => item !== row))} aria-label={t.removeClassRow} className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-[#b4234f] hover:text-[#b4234f]"><X size={14} /></button>}
        </div>
      ))}
      <button type="button" onClick={() => { setRows([...rows, nextRow]); setNextRow(nextRow + 1); }} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Plus size={14} />{t.anotherClass}</button>
      <div className="flex gap-2"><button type="submit" disabled={saving} className={primaryButton}>{t.addClass}</button><button type="button" onClick={onCancel} className={secondaryButton}>{t.cancel}</button></div>
    </form>
  );
}

export default function SubjectPlan({ courseId }: { courseId: number }) {
  const t = useDictionary().wk;
  const { data, reload } = useApi<Plan>(`/api/courses/${courseId}/plan`);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // What is open for typing: a new class in a week (0 = a new week), a lesson being renamed, or a lesson getting a material.
  const [adding, setAdding] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [editingSyllabus, setEditingSyllabus] = useState(false);
  const [attaching, setAttaching] = useState<number | null>(null);
  if (!data) return null;
  const { canEdit, lessons } = data;
  const fail = (error: unknown) => setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) });
  const attempt = async (action: () => Promise<unknown>) => { setMessage(null); try { await action(); reload(); } catch (error) { fail(error); } };

  const weeks = [...new Set(lessons.map((lesson) => lesson.week))];
  const nextWeek = (weeks.length ? Math.max(...weeks) : 0) + 1;

  const saveSyllabus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const syllabus = String(new FormData(event.currentTarget).get("syllabus"));
    setSaving(true);
    setMessage(null);
    try { await api(`/api/courses/${courseId}/plan`, { method: "PUT", json: { syllabus } }); setMessage({ tone: "success", text: t.syllabusSaved }); setEditingSyllabus(false); reload(); } catch (error) { fail(error); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <Card title={t.syllabus} icon={BookText} actions={canEdit && data.syllabus && !editingSyllabus && <button type="button" onClick={() => setEditingSyllabus(true)} className="flex shrink-0 items-center gap-1 text-xs font-bold text-accent hover:underline"><Pencil size={14} />{t.editSyllabus}</button>}>
        {editingSyllabus ? (
          <form onSubmit={saveSyllabus} className="space-y-3">
            <textarea name="syllabus" rows={10} maxLength={20000} defaultValue={data.syllabus} placeholder={t.syllabusPlaceholder} aria-label={t.syllabus} autoFocus className={textareaClass} />
            <div className="flex gap-2"><button type="submit" disabled={saving} className={primaryButton}>{t.syllabusSave}</button><button type="button" onClick={() => setEditingSyllabus(false)} className={secondaryButton}>{t.cancel}</button></div>
          </form>
        ) : data.syllabus ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{data.syllabus}</p>
          : canEdit ? <button type="button" onClick={() => setEditingSyllabus(true)} className={createTile}><Plus size={16} />{t.createSyllabus}</button> : <p className="text-sm text-muted">{t.syllabusEmpty}</p>}
      </Card>

      <Card title={t.classPlan} icon={CalendarDays}>
        <div className="space-y-6">
          {weeks.length === 0 && !canEdit && <p className="text-sm text-muted">{t.planEmpty}</p>}
          {weeks.map((week) => {
            const inWeek = lessons.filter((lesson) => lesson.week === week);
            return (
              <section key={week} aria-label={fill(t.weekN, { n: week })}>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{fill(t.weekN, { n: week })}</h3>
                <ul className="space-y-3">
                  {inWeek.map((lesson, index) => (
                    <li key={lesson.id} className="space-y-3 rounded-lg border border-line bg-surface-muted p-4">
                      {renaming === lesson.id ? (
                        <TopicForm initial={lesson.topic} onCancel={() => setRenaming(null)} onSubmit={async (topic) => { await attempt(() => api(`/api/lessons/${lesson.id}`, { method: "PATCH", json: { topic } })); setRenaming(null); }} />
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><Badge tone="accent">{fill(t.classN, { n: index + 1 })}</Badge><p className="mt-1.5 font-semibold text-ink">{lesson.topic}</p></div>
                          {canEdit && (
                            <div className="flex shrink-0 gap-1">
                              <button type="button" onClick={() => setRenaming(lesson.id)} aria-label={t.editTopic} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent"><Pencil size={14} /></button>
                              <button type="button" onClick={() => { if (window.confirm(t.deleteClassQ)) void attempt(() => api(`/api/lessons/${lesson.id}`, { method: "DELETE" })); }} aria-label={t.delete} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-[#b4234f] hover:text-[#b4234f]"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                      )}
                      {lesson.materials.length > 0 && (
                        <ul className="space-y-2">{lesson.materials.map((material) => <MaterialRow key={material.id} material={material} canEdit={canEdit} onRemove={() => void attempt(() => api(`/api/materials/${material.id}`, { method: "DELETE" }))} />)}</ul>
                      )}
                      {canEdit && (attaching === lesson.id
                        ? <MaterialForm lessonId={lesson.id} onError={fail} onDone={() => { setAttaching(null); reload(); }} />
                        : <button type="button" onClick={() => setAttaching(lesson.id)} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Plus size={14} />{t.addMaterial}</button>)}
                    </li>
                  ))}
                </ul>
                {canEdit && (adding === week
                  ? <div className="mt-3"><ClassesForm week={week} weekEditable={false} onCancel={() => setAdding(null)} onSubmit={async (w, topics) => { for (const topic of topics) await attempt(() => api(`/api/courses/${courseId}/lessons`, { method: "POST", json: { week: w, topic } })); setAdding(null); }} /></div>
                  : <button type="button" onClick={() => setAdding(week)} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Plus size={14} />{t.addClass}</button>)}
              </section>
            );
          })}
          {canEdit && (adding === 0
            ? <ClassesForm week={nextWeek} weekEditable onCancel={() => setAdding(null)} onSubmit={async (w, topics) => { for (const topic of topics) await attempt(() => api(`/api/courses/${courseId}/lessons`, { method: "POST", json: { week: w, topic } })); setAdding(null); }} />
            : <button type="button" onClick={() => setAdding(0)} className={createTile}><Plus size={16} />{t.addWeek}</button>)}
        </div>
      </Card>
    </div>
  );
}
