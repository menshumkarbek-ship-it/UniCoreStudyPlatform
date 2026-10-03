"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, ClipboardList, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Alert, Badge, Card, EmptyState, primaryButton } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { fill } from "@/i18n/format";
import { api, formatDate, useApi } from "@/lib/client";
import { weekdayName } from "@/lib/time";

type ScheduleEntry = { id: number; weekday: number; startsAt: string; endsAt: string; code: string; title: string; groupName: string; active: boolean; attendanceCode: string | null };
type History = { id: number; sessionDate: string; startsAt: string; courseCode: string; courseTitle: string; groupName: string; enrolledCount: number; attendedCount: number };
type CourseAttendance = { id: number; code: string; title: string; sessionCount: number; attendedCount: number };

function ProfessorAttendance() {
  const t = useDictionary().wk;
  const { data, reload } = useApi<{ schedule: ScheduleEntry[]; history: History[] }>("/api/attendance");
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const start = async (entryId: number) => {
    setError("");
    try {
      const result = await api<{ code: string }>("/api/attendance", { method: "POST", json: { action: "start", timetableEntryId: entryId } });
      setCodes((current) => ({ ...current, [entryId]: result.code }));
      reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  };

  const schedule = data?.schedule ?? [];
  const active = schedule.filter((entry) => entry.active);

  return (
    <>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t.happeningNow} icon={QrCode} description={t.happeningDesc}>
          {active.length === 0 ? <EmptyState icon={QrCode} title={t.noClassInProgress} description={schedule.length ? t.comeBack : t.noClassesInTimetable} /> : (
            <ul className="space-y-3">
              {active.map((entry) => {
                const code = codes[entry.id] ?? entry.attendanceCode;
                return (
                  <li key={entry.id} className="rounded-lg border border-accent p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold text-ink">{entry.code} · {entry.title}</p><p className="text-xs text-muted">{t.group} {entry.groupName} · {entry.startsAt}–{entry.endsAt}</p></div>
                      {!code && <button type="button" onClick={() => void start(entry.id)} className={`${primaryButton} h-9 text-xs`}>{t.openAttendance}</button>}
                    </div>
                    {code && (
                      <div className="mt-4 flex flex-col items-center border-t border-line pt-4 text-center">
                        {origin && <div className="rounded-lg bg-white p-3"><QRCodeSVG value={`${origin}/attendance?code=${code}`} size={168} /></div>}
                        <p className="mt-3 font-mono text-3xl font-bold tracking-[0.3em] text-ink">{code}</p>
                        <p className="mt-1 text-xs text-muted">{fill(t.scanOrType, { time: entry.endsAt })}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title={t.history} icon={ClipboardList} description={t.historyDesc}>
          {(data?.history ?? []).length === 0 ? <p className="text-sm text-muted">{t.noSessionsYet}</p> : (
            <ul className="divide-y divide-line">
              {data!.history.map((item) => {
                const percent = item.enrolledCount ? Math.round(item.attendedCount / item.enrolledCount * 100) : 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{item.courseCode} · {item.groupName}</p><p className="text-xs text-muted">{formatDate(item.sessionDate, { weekday: "short", day: "numeric", month: "short" })} · {item.startsAt}</p></div>
                    <Badge tone={percent >= 75 ? "success" : percent >= 50 ? "warning" : "danger"}>{item.attendedCount}/{item.enrolledCount}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      {schedule.length > 0 && (
        <Card title={t.weeklyClasses} className="mt-5">
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {schedule.map((entry) => <li key={entry.id} className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-soft"><span className="font-semibold text-ink">{entry.code}</span> · {entry.groupName} · {weekdayName(entry.weekday)} {entry.startsAt}–{entry.endsAt}</li>)}
          </ul>
        </Card>
      )}
    </>
  );
}

function StudentAttendance() {
  const t = useDictionary().wk;
  const { data, reload } = useApi<{ courses: CourseAttendance[]; totals: { sessionCount: number; attendedCount: number } }>("/api/attendance");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fromQr = new URLSearchParams(window.location.search).get("code");
    const timer = window.setTimeout(() => { if (fromQr && /^\d{6}$/.test(fromQr)) setCode(fromQr); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const result = await api<{ message: string }>("/api/attendance", { method: "POST", json: { action: "verify", code } });
      setMessage({ tone: "success", text: result.message });
      setCode("");
      reload();
    } catch (caught) { setMessage({ tone: "error", text: caught instanceof Error ? caught.message : String(caught) }); } finally { setSending(false); }
  };

  const totals = data?.totals;
  const overall = totals?.sessionCount ? Math.round(totals.attendedCount / totals.sessionCount * 100) : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card title={t.checkIn} icon={Check}>
          <form onSubmit={verify} className="space-y-3">
            <input aria-label={t.codeAria} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="h-14 w-full rounded-lg border border-line bg-surface px-3 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
            <button type="submit" disabled={code.length !== 6 || sending} className={`${primaryButton} w-full`}><Check size={16} />{sending ? t.checking : t.checkIn}</button>
          </form>
          {message && <div className="mt-3"><Alert tone={message.tone}>{message.text}</Alert></div>}
        </Card>
        <Card title={t.yourAttendance} icon={ClipboardList} actions={overall !== null && <Badge tone={overall >= 75 ? "success" : overall >= 50 ? "warning" : "danger"}>{fill(t.overallPct, { n: overall })}</Badge>}>
          {(data?.courses ?? []).length === 0 ? <p className="text-sm text-muted">{t.noAttendanceTaken}</p> : (
            <ul className="space-y-3">
              {data!.courses.map((course) => {
                const percent = Math.round(course.attendedCount / course.sessionCount * 100);
                return (
                  <li key={course.id}>
                    <div className="flex items-center justify-between text-sm"><span className="font-semibold text-ink">{course.code} <span className="font-normal text-muted">{course.title}</span></span><span className="text-xs font-semibold text-ink-soft">{course.attendedCount}/{course.sessionCount} · {percent}%</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-lg bg-surface-muted"><div className={`h-full rounded-lg ${percent >= 75 ? "bg-ink" : percent >= 50 ? "bg-[#e9855a]" : "bg-[#d6336c]"}`} style={{ width: `${percent}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export default function AttendancePage() {
  return useSessionUser().role === "professor" ? <ProfessorAttendance /> : <StudentAttendance />;
}

