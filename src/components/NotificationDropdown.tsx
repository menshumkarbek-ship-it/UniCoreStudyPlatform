"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, CheckCheck, FileText, Megaphone, Presentation, Users, ClipboardCheck } from "lucide-react";
import { useDictionary } from "@/i18n/locale-provider";

const notifications = [
  { id: 1, title: "New presentation", detail: "Lecture materials added to MED101.", href: "/subjects", icon: Presentation, tone: "text-cyan-600" },
  { id: 2, title: "Assignment reminder", detail: "Case Study 04 is due tomorrow.", href: "/homework", icon: FileText, tone: "text-amber-600" },
  { id: 3, title: "Exam schedule", detail: "Midterm review opens next week.", href: "/timetable", icon: CalendarDays, tone: "text-emerald-600" },
  { id: 4, title: "New announcement", detail: "The faculty orientation meeting is Friday at 14:00.", href: "/dashboard", icon: Megaphone, tone: "text-indigo-600" },
  { id: 5, title: "Group update", detail: "Your MED-24A group timetable has been updated.", href: "/timetable", icon: Users, tone: "text-sky-600" },
  { id: 6, title: "Submission received", detail: "Your Respiratory Physiology notes were submitted successfully.", href: "/homework", icon: ClipboardCheck, tone: "text-rose-600" },
];

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<number[]>([]);
  const unreadCount = notifications.length - readIds.length;
  const dict = useDictionary();

  return <div className="relative"><button type="button" aria-label={dict.common.notifications.openNotifications} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((isOpen) => !isOpen)} className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-cyan-50 hover:text-cyan-700"><Bell size={18} />{unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />}</button>{open && <div role="menu" className="absolute right-0 top-11 z-30 max-h-[min(32rem,calc(100vh-6rem))] w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2"><span className="text-sm font-semibold text-slate-800">{dict.common.notifications.title}</span><button type="button" onClick={() => setReadIds(notifications.map((notification) => notification.id))} disabled={unreadCount === 0} className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-slate-300"><CheckCheck size={14} /> {dict.common.notifications.markAllRead}</button></div>{notifications.map(({ id, title, detail, href, icon: Icon, tone }) => <Link role="menuitem" key={id} href={href} onClick={() => { setReadIds((ids) => ids.includes(id) ? ids : [...ids, id]); setOpen(false); }} className={`flex gap-3 rounded-md px-3 py-3 hover:bg-slate-50 ${!readIds.includes(id) ? "bg-cyan-50/40" : ""}`}><Icon size={17} className={`mt-0.5 shrink-0 ${tone}`} /><span><span className="block text-xs font-bold text-slate-700">{title}</span><span className="mt-1 block text-xs leading-4 text-slate-500">{detail}</span></span></Link>)}</div>}</div>;
}
