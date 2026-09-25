"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Check, ClipboardList, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Role = "student" | "professor";
type Schedule = { id: number; code: string; title: string; groupName: string; weekday: number; startsAt: string; endsAt: string };
type History = { id: number; attendanceDate: string; courseCode: string; courseTitle: string; groupName: string; enrolledCount: number; attendedCount: number };
type AttendanceResponse = { attendanceStartDate?: string; totals?: { sessionCount: number; attendedCount: number }; schedule?: Schedule[]; history?: History[] };

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AttendancePage() {
  const [role, setRole] = useState<Role | null>(null);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [percentage, setPercentage] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [activeCode, setActiveCode] = useState<{ code: string; scheduleId: number } | null>(null);

  const loadAttendance = async () => {
    const response = await fetch("/api/attendance");
    if (!response.ok) return;
    const result = await response.json() as AttendanceResponse;
    setStartDate(result.attendanceStartDate ?? "");
    if (role === "professor") {
      setSchedule(result.schedule ?? []);
      setHistory(result.history ?? []);
    } else {
      const totals = result.totals ?? { sessionCount: 0, attendedCount: 0 };
      setPercentage(totals.sessionCount ? Math.round((totals.attendedCount / totals.sessionCount) * 100) : 0);
    }
  };

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { role?: Role } | null };
      setRole(result.user?.role === "professor" ? "professor" : "student");
    });
  }, []);

  useEffect(() => {
    if (!role) return;
    void fetch("/api/attendance").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as AttendanceResponse;
      setStartDate(result.attendanceStartDate ?? "");
      if (role === "professor") {
        setSchedule(result.schedule ?? []);
        setHistory(result.history ?? []);
      } else {
        const totals = result.totals ?? { sessionCount: 0, attendedCount: 0 };
        setPercentage(totals.sessionCount ? Math.round((totals.attendedCount / totals.sessionCount) * 100) : 0);
      }
    });
    const code = new URLSearchParams(window.location.search).get("code");
    if (role === "student" && code && /^\d{6}$/.test(code)) window.setTimeout(() => setInput(code), 0);
  }, [role]);

  const verifyAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: input }) });
    const result = await response.json() as { message?: string; error?: string };
    setMessage(result.message ?? result.error ?? "Attendance could not be verified.");
    if (response.ok) void loadAttendance();
  };

  const startAttendance = async (scheduleId: number) => {
    const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", timetableEntryId: scheduleId }) });
    const result = await response.json() as { code?: string; error?: string };
    if (!response.ok || !result.code) { setMessage(result.error ?? "Attendance could not be started."); return; }
    setActiveCode({ code: result.code, scheduleId });
    setMessage("Attendance is active for this class.");
    void loadAttendance();
  };

  if (!role) return <main className="min-h-screen bg-[#f4f7fb]" />;

  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-[#17233d] sm:px-8"><div className="mx-auto max-w-7xl"><Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={17} /> Dashboard</Link><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Class participation</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-800"><CalendarCheck className="text-cyan-600" size={29} /> Attendance</h1><p className="mt-2 text-sm text-slate-500">{role === "professor" ? "Start attendance during a scheduled class and review attendance history." : "Verify your attendance with the active class code."}</p></div>{role === "student" ? <section className="max-w-xl rounded-xl border border-white bg-white p-6 shadow-sm"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Attendance percentage</h2><p className="mt-1 text-xs text-slate-400">Tracking starts {startDate}.</p></div><span className="text-3xl font-bold text-cyan-700">{percentage ?? 0}%</span></div><form onSubmit={verifyAttendance}><label className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Six-digit class code<input inputMode="numeric" maxLength={6} value={input} onChange={(event) => setInput(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-center font-mono text-xl tracking-[0.2em] outline-none focus:border-emerald-500" /></label><button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"><Check size={17} /> Verify attendance</button></form>{message && <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p>}</section> : <div className="grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Scheduled classes</h2><p className="mt-1 text-xs text-slate-400">Attendance opens only during class time after September 15.</p></div><QrCode className="text-cyan-600" size={21} /></div><div className="mt-5 space-y-3">{schedule.length ? schedule.map((item) => <div key={item.id} className="rounded-lg border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-cyan-700">{item.code} · {item.groupName}</p><p className="mt-1 font-semibold text-slate-700">{item.title}</p><p className="mt-1 text-xs text-slate-400">{weekdayNames[item.weekday]} · {item.startsAt} - {item.endsAt}</p></div><button type="button" onClick={() => void startAttendance(item.id)} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Generate code</button></div>{activeCode?.scheduleId === item.id && <div className="mt-4 border-t border-slate-100 pt-4 text-center"><QRCodeSVG value={`${window.location.origin}/attendance?code=${activeCode.code}`} size={150} className="mx-auto" /><p className="mt-3 font-mono text-2xl font-bold tracking-[0.2em] text-slate-800">{activeCode.code}</p><p className="mt-1 text-xs text-slate-400">Students can scan the QR or enter this code.</p></div>}</div>) : <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No timetable classes are assigned yet.</p>}</div>{message && <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p>}</section><section className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Attendance history</h2><p className="mt-1 text-xs text-slate-400">Sessions and verified students.</p></div><ClipboardList className="text-cyan-600" size={21} /></div><div className="mt-5 space-y-2">{history.length ? history.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-700">{item.courseCode} · {item.groupName}</p><p className="mt-1 text-xs text-slate-400">{item.attendanceDate} · {item.courseTitle}</p></div><span className="text-sm font-bold text-cyan-700">{item.attendedCount}/{item.enrolledCount}</span></div></div>) : <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No attendance history yet.</p>}</div></section></div>}</div></main>;
}
