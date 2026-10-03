"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { Alert, EmptyState, dangerButton, primaryButton, secondaryButton } from "@/components/ui";
import { api } from "@/lib/client";
import { useDictionary } from "@/i18n/locale-provider";

export type Item = { id: number } & Record<string, unknown>;
export type NounKey = "university" | "faculty" | "group" | "professor" | "student" | "subject" | "class";

export type Column<T> = { header: string; cell: (item: T) => ReactNode; className?: string };

/**
 * One admin resource: a table with edit/delete per row and a create/edit form.
 * `renderFields` gets the row being edited (or null when creating) and returns the form inputs;
 * `toPayload` turns the submitted FormData into the JSON body.
 */
export default function ResourceSection<T extends Item>({ resource, universityId, items, loading, onChanged, columns, icon, noun, emptyHint, renderFields, toPayload, canCreate = true, createBlockedReason }: {
  resource: string;
  universityId?: number;
  items: T[];
  loading: boolean;
  onChanged: (items: T[]) => void;
  columns: Column<T>[];
  icon: LucideIcon;
  noun: NounKey;
  emptyHint?: string;
  renderFields: (editing: T | null) => ReactNode;
  toPayload: (form: FormData, editing: T | null) => Record<string, unknown>;
  canCreate?: boolean;
  createBlockedReason?: string;
}) {
  const [editing, setEditing] = useState<T | "new" | null>(null);
  // The edit form opens at the top of this section, which may sit far down the page (e.g. one group's timetable).
  const section = useRef<HTMLDivElement>(null);
  const t = useDictionary().adm;
  const n = t.nouns[noun];
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const scope = universityId ? { universityId } : {};

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const current = editing === "new" ? null : editing;
    setSaving(true);
    try {
      const result = await api<{ items: T[] }>(`/api/admin/${resource}`, { method: current ? "PATCH" : "POST", json: { ...toPayload(new FormData(event.currentTarget), current), ...scope, ...(current ? { id: current.id } : {}) } });
      onChanged(result.items);
      setEditing(null);
      setMessage({ tone: "success", text: current ? t.updated : t.added });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSaving(false); }
  };

  const remove = async (item: T) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      const query = new URLSearchParams({ id: String(item.id), ...(universityId ? { universityId: String(universityId) } : {}) });
      const result = await api<{ items: T[] }>(`/api/admin/${resource}?${query}`, { method: "DELETE" });
      onChanged(result.items);
      setMessage({ tone: "success", text: t.deleted });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); }
  };

  const current = editing === "new" ? null : editing;
  return (
    <div ref={section} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted">{loading ? t.loading : ""}</p>
        {canCreate ? <button type="button" onClick={() => { setEditing(editing === "new" ? null : "new"); setMessage(null); }} className={editing === "new" ? secondaryButton : primaryButton}>{editing === "new" ? <X size={16} /> : <Plus size={16} />}{editing === "new" ? t.cancel : n.add}</button> : createBlockedReason && <p className="text-xs text-ink">{createBlockedReason}</p>}
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {editing && (
        <form key={current?.id ?? "new"} onSubmit={submit} className="rounded-lg border border-ink bg-surface p-5 sm:p-6">
          <p className="mb-5 text-lg font-medium tracking-[-0.01em] text-ink">{current ? n.edit : n.new}</p>
          <div className="grid gap-4 sm:grid-cols-2">{renderFields(current)}</div>
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={saving} className={primaryButton}>{saving ? t.saving : current ? t.saveChanges : n.add}</button>
            <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>{t.cancel}</button>
          </div>
        </form>
      )}
      {!loading && items.length === 0 ? <EmptyState icon={icon} title={n.empty} description={emptyHint} /> : (
        <>
        <ul className="space-y-3 md:hidden">
          {items.map((item) => (
            <li key={item.id} className={`rounded-lg border border-line bg-surface p-4 ${current?.id === item.id ? "bg-mint/40" : ""}`}>
              <dl className="space-y-2">
                {columns.map((column, index) => (
                  <div key={column.header} className={index === 0 ? "" : "flex items-start justify-between gap-4 text-sm"}>
                    {index === 0 ? <dd className="text-base text-ink">{column.cell(item)}</dd> : <><dt className="shrink-0 text-muted">{column.header}</dt><dd className="min-w-0 text-right text-ink-soft">{column.cell(item)}</dd></>}
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => { setEditing(item); setMessage(null); section.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-sm font-medium text-ink"><Pencil size={13} />{t.edit}</button>
                <button type="button" onClick={() => void remove(item)} className={`${dangerButton} h-10 flex-1`}><Trash2 size={13} />{t.delete}</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-[11px] text-muted">
              <tr>{columns.map((column) => <th key={column.header} className={`px-4 py-3 font-bold ${column.className ?? ""}`}>{column.header}</th>)}<th className="px-4 py-3 text-right font-bold">{t.actions}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className={`transition hover:bg-surface-muted ${current?.id === item.id ? "bg-mint/40" : ""}`}>
                  {columns.map((column) => <td key={column.header} className={`px-4 py-3 align-top text-ink-soft ${column.className ?? ""}`}>{column.cell(item)}</td>)}
                  <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                    <button type="button" onClick={() => { setEditing(item); setMessage(null); section.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="mr-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[11px] font-medium text-ink hover:border-ink"><Pencil size={13} />{t.edit}</button>
                    <button type="button" onClick={() => void remove(item)} className={dangerButton}><Trash2 size={13} />{t.delete}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
