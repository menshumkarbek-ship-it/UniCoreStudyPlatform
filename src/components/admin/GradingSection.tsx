"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Badge, createTile, inputBase, primaryButton, secondaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { api, useApi } from "@/lib/client";

type Saved = { id: number; name: string; weight: number; usage: number; defaultHomework: boolean; defaultExams: boolean };
type Row = { key: string; id?: number; name: string; weight: string; usage: number; defaultHomework: boolean; defaultExams: boolean };
/** A removed component that still has work: where that work moves on save. */
type Move = { row: Row; to: number };
type Draft = { rows: Row[]; moves: Move[] };

const toRows = (components: Saved[]): Row[] => components.map((component) => ({ ...component, key: String(component.id), weight: String(component.weight) }));

/**
 * A university's grading scheme: the components a subject's final score is split into, and their weights.
 * The whole scheme is saved at once, and only when the weights add up to 100%. Any component can be removed;
 * one that still has homework or exams needs another component to move them to.
 */
export default function GradingSection({ universityId }: { universityId: number }) {
  const t = useDictionary().adm;
  const { data, setData } = useApi<{ components: Saved[] }>(`/api/admin/grading?universityId=${universityId}`);
  // Edits live in a draft until saved; with no draft the saved scheme is shown.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const { rows, moves } = draft ?? { rows: data ? toRows(data.components) : [], moves: [] };
  const targets = rows.filter((row) => row.id);
  const total = Math.round(rows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0) * 100) / 100;
  const valid = total === 100 && rows.every((row) => row.name.trim() && row.weight !== "" && Number(row.weight) >= 0 && Number(row.weight) <= 100)
    && moves.every((move) => targets.some((row) => row.id === move.to));

  const edit = (next: Draft) => { setDraft(next); setMessage(null); };
  const update = (key: string, change: Partial<Row>) => edit({ rows: rows.map((row) => row.key === key ? { ...row, ...change } : row), moves });
  const remove = (row: Row) => {
    const left = rows.filter((item) => item.key !== row.key);
    const to = left.find((item) => item.id)?.id;
    // Work in a removed component moves to another saved one (the first by default); empty ones just go.
    edit({ rows: left, moves: row.id && row.usage > 0 && to ? [...moves, { row, to }] : moves });
  };
  const keep = (move: Move) => edit({ rows: [...rows, move.row], moves: moves.filter((item) => item !== move) });

  const save = async () => {
    setSaving(true);
    try {
      const result = await api<{ components: Saved[] }>("/api/admin/grading", {
        method: "PUT",
        json: { universityId, components: rows.map((row) => ({ id: row.id, name: row.name.trim(), weight: Number(row.weight) })), moves: moves.map((move) => ({ from: move.row.id, to: move.to })) },
      });
      setData(result);
      setDraft(null);
      setMessage({ tone: "success", text: t.schemeSaved });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSaving(false); }
  };

  if (!data) return <p className="text-sm text-muted">{t.loading}</p>;
  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface p-5 sm:p-6">
      <p className="max-w-3xl text-sm text-muted">{t.gradingIntro}</p>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="grid items-center gap-3 rounded-lg border border-line bg-surface-muted p-4 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,15rem)_2.25rem]">
            <input aria-label={t.component} value={row.name} maxLength={80} placeholder={t.componentPlaceholder} onChange={(event) => update(row.key, { name: event.target.value })} className={`${inputBase} w-full`} />
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <span className="sr-only">{t.weight}</span>
              <input aria-label={`${t.weight}: ${row.name}`} type="number" min={0} max={100} step="0.5" value={row.weight} onChange={(event) => update(row.key, { weight: event.target.value })} className={`${inputBase} w-20 text-right`} />%
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {row.defaultHomework && <Badge tone="accent">{t.defaultForHomework}</Badge>}
              {row.defaultExams && <Badge tone="accent">{t.defaultForExams}</Badge>}
              {row.usage > 0 && <span>{t.inUse.replace("{n}", String(row.usage))}</span>}
            </div>
            <button type="button" disabled={rows.length === 1} onClick={() => remove(row)} aria-label={t.removeComponentAria.replace("{name}", row.name || t.component)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-[#b4234f] hover:text-[#b4234f] disabled:pointer-events-none disabled:opacity-30"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
      {moves.map((move) => (
        <div key={move.row.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-peach/40 p-4 text-sm text-ink">
          <span>{t.moveWorkTo.replace("{name}", move.row.name).replace("{n}", String(move.row.usage))}</span>
          <select aria-label={t.moveWorkTo.replace("{name}", move.row.name).replace("{n}", String(move.row.usage))} value={move.to} onChange={(event) => edit({ rows, moves: moves.map((item) => item === move ? { ...item, to: Number(event.target.value) } : item) })} className={`${inputBase} w-auto`}>
            {targets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <button type="button" onClick={() => keep(move)} className={`${secondaryButton} ml-auto`}>{t.keepComponent}</button>
        </div>
      ))}
      <button type="button" onClick={() => edit({ rows: [...rows, { key: `new-${Date.now()}`, name: "", weight: "0", usage: 0, defaultHomework: false, defaultExams: false }], moves })} className={createTile}><Plus size={16} />{t.addComponent}</button>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-center gap-2 text-sm">
          <Badge tone={total === 100 ? "success" : "danger"}>{t.weightTotal.replace("{n}", String(total))}</Badge>
          {total !== 100 && <span className="text-muted">{t.weightMustTotal}</span>}
        </p>
        <button type="button" disabled={!draft || !valid || saving} onClick={() => void save()} className={primaryButton}>{saving ? t.saving : t.saveScheme}</button>
      </div>
    </div>
  );
}
