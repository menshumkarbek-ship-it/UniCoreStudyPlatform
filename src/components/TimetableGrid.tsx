"use client";

import { useState } from "react";
import { useDictionary } from "@/i18n/locale-provider";
import { weekdays } from "@/lib/time";

export type GridEntry = { id: number; weekday: number; startsAt: string; endsAt: string; room: string; code: string; title: string; groupName: string; professorName: string };

/** What each cell shows: a student sees who teaches, a professor sees which group, the admin sees both. */
export type GridView = "student" | "professor" | "admin";

const minutes = (time: string) => { const [hours, mins] = time.split(":").map(Number); return hours * 60 + mins; };
const dayStart = 8;
const dayEnd = 20;
const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/**
 * A real weekly timetable: one column per day, one row per hour, always the whole teaching day (08:00–20:00) so an empty
 * day still has its grid; a class outside those hours stretches the rows to fit. A class shows in every
 * hour it covers, so a class from 08:30 to 09:50 has a card in the 08:00 row and another in the 09:00 row. Cards
 * name the subject and who teaches it (or which group) — the row says when.
 */
/** With `onSelect`, each card is a button (the admin edits a class by clicking it). */
export default function TimetableGrid({ entries, view, today = 0, onSelect }: { entries: GridEntry[]; view: GridView; today?: number; onSelect?: (entry: GridEntry) => void }) {
  const t = useDictionary().adm;
  const days = weekdays.filter((day) => day.value <= 5 || entries.some((entry) => entry.weekday === day.value));
  const firstHour = Math.min(dayStart, ...entries.map((entry) => Math.floor(minutes(entry.startsAt) / 60)));
  const lastHour = Math.max(dayEnd, ...entries.map((entry) => Math.ceil(minutes(entry.endsAt) / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);

  // Phones show one day at a time instead of the wide grid: pick a day, then read its classes top to bottom.
  const [picked, setPicked] = useState<number | null>(null);
  const selectedDay = picked !== null && days.some((day) => day.value === picked) ? picked : days.some((day) => day.value === today) ? today : days[0].value;
  const dayEntries = entries.filter((entry) => entry.weekday === selectedDay).sort((a, b) => minutes(a.startsAt) - minutes(b.startsAt));
  const cardLine = (entry: GridEntry) => view === "student" ? entry.professorName : view === "professor" ? `${t.group} ${entry.groupName}` : `${entry.groupName} · ${entry.professorName}`;

  return (
    <>
      <div className="md:hidden">
        <div role="tablist" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const active = day.value === selectedDay;
            return (
              <button key={day.value} type="button" role="tab" aria-selected={active} onClick={() => setPicked(day.value)}
                className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs font-medium transition ${active ? "border-aubergine bg-accent-soft text-accent" : "border-line bg-surface text-muted"}`}>
                {t.weekdays[day.value - 1].slice(0, 3)}
                {day.value === today && <span aria-hidden className="mt-0.5 h-1 w-1 rounded-full bg-periwinkle" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-2">
          {dayEntries.length === 0 ? <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">—</p> : dayEntries.map((entry) => {
            const content = (
              <>
                <span className="w-14 shrink-0 text-sm font-medium text-ink">{entry.startsAt}<span className="block text-xs text-faint">{entry.endsAt}</span></span>
                <span className="min-w-0 flex-1 border-l-[3px] border-aubergine pl-3">
                  <span className="block text-sm font-bold text-ink">{entry.code}</span>
                  <span className="block text-sm text-ink-soft">{entry.title}</span>
                  <span className="block text-xs text-muted">{cardLine(entry)}{entry.room ? ` · ${entry.room}` : ""}</span>
                </span>
              </>
            );
            const row = "flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-3 text-left";
            return onSelect
              ? <button key={entry.id} type="button" onClick={() => onSelect(entry)} className={`${row} active:bg-surface-muted`}>{content}</button>
              : <div key={entry.id} className={row}>{content}</div>;
          })}
        </div>
      </div>
    <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-muted">
            <th scope="col" className="w-24 px-3 py-3 text-xs font-medium text-muted">{t.time}</th>
            {days.map((day) => (
              <th key={day.value} scope="col" className={`border-l border-line px-3 py-3 text-xs font-medium ${day.value === today ? "bg-accent-soft text-accent" : "text-muted"}`}>
                {t.weekdays[day.value - 1]}{day.value === today && ` · ${t.today}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour} className="border-b border-line last:border-b-0">
              <th scope="row" className="px-3 py-3 align-top text-xs font-medium text-muted">{hourLabel(hour)}<span className="block text-faint">{hourLabel(hour + 1)}</span></th>
              {days.map((day) => {
                // Every class of this day that overlaps this hour.
                const cell = entries.filter((entry) => entry.weekday === day.value && minutes(entry.startsAt) < (hour + 1) * 60 && minutes(entry.endsAt) > hour * 60);
                return (
                  <td key={day.value} className={`h-16 border-l border-line p-1.5 align-top ${day.value === today ? "bg-accent-soft/40" : ""}`}>
                    {cell.map((entry) => {
                      const content = (
                        <>
                          <p className="font-bold text-ink">{entry.code}</p>
                          <p className="truncate text-ink-soft" title={entry.title}>{entry.title}</p>
                          <p className="truncate text-muted">
                            {view === "student" ? entry.professorName : view === "professor" ? `${t.group} ${entry.groupName}` : `${entry.groupName} · ${entry.professorName}`}
                          </p>
                        </>
                      );
                      const card = "mb-1 block w-full rounded-md border-l-[3px] border-aubergine bg-accent-soft px-2 py-1.5 text-left text-xs last:mb-0";
                      return onSelect
                        ? <button key={entry.id} type="button" onClick={() => onSelect(entry)} className={`${card} transition hover:ring-1 hover:ring-aubergine`}>{content}</button>
                        : <div key={entry.id} className={card}>{content}</div>;
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
