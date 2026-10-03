"use client";

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

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
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
  );
}
