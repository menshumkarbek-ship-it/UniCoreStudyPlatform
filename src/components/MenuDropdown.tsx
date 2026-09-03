"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, BookOpen, ChevronDown, Home } from "lucide-react";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function MenuDropdown() {
  const [open, setOpen] = useState(false);

  return <div className="flex items-center gap-5"><div className="relative"><button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((isOpen) => !isOpen)} className="flex items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-900"><span>Menu</span><ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div role="menu" className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"><Link role="menuitem" href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"><Home size={16} /> Home</Link><Link role="menuitem" href="/subjects" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"><BookOpen size={16} /> Subjects</Link><Link role="menuitem" href="/timetable" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"><CalendarDays size={16} /> Timetable</Link></div>}</div><NotificationDropdown /></div>;
}
