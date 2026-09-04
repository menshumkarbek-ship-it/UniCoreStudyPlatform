"use client";

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import MenuDropdown from "@/components/MenuDropdown";
import ProfessorWorkspace from "@/components/ProfessorWorkspace";
import { BarChart3, BookOpen, CalendarCheck, CircleUserRound, ClipboardList, FileUp, GraduationCap, LayoutDashboard, LogOut, Plus, Users, CalendarDays } from "lucide-react";

type Role = "student" | "professor" | "admin";
type Course = { code: string; title: string; professor: string; students: number };

const getUniversity = () => window.localStorage.getItem("tronsabak-university") ?? "Ala-Too International University";

const courses: Course[] = [
  { code: "MED101", title: "Human Anatomy", professor: "Dr. A. Karimov", students: 32 },
  { code: "MED112", title: "Human Physiology", professor: "Dr. M. Sadykova", students: 30 },
  { code: "MED203", title: "Medical Biochemistry", professor: "Prof. B. Ergeshov", students: 28 },
  { code: "MED216", title: "Medical Microbiology", professor: "Dr. N. Isaeva", students: 27 },
  { code: "MED301", title: "Public Health & Epidemiology", professor: "Prof. E. Tursunov", students: 24 },
];

export default function Dashboard() {
  const [role, setRole] = useState<Role>("student");
  const [course] = useState(courses[0]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const university = useSyncExternalStore(() => () => undefined, getUniversity, () => "Ala-Too International University");
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    const savedRole = window.localStorage.getItem("tronsabak-role");
    if (savedRole === "professor" || savedRole === "admin") setRole(savedRole);
    setProfilePhoto(window.localStorage.getItem("tronsabak-profile-photo"));

    const updateDateTime = () => setCurrentDateTime(new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date()));
    updateDateTime();
    const clock = window.setInterval(updateDateTime, 1000);
    return () => window.clearInterval(clock);
  }, []);

  if (role === "professor") return <ProfessorWorkspace currentDateTime={currentDateTime} profilePhoto={profilePhoto} />;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]">
      {role === "admin" && <Link href="/profile" className="block border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Open administrator profile</Link>}
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><BookOpen size={21} /></span><span className="text-lg font-bold text-[#15345b]">UniCore</span></Link>
          <div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><MenuDropdown />{role === "student" && <Link href="/profile" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">Aibek Temirov</Link>}</nav>{role === "student" && <Link href="/profile" aria-label="Open student profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-100 bg-cyan-50 text-xs font-bold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"><span className="sr-only">Student profile</span>{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : <CircleUserRound size={21} />}</Link>}</div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-xl border border-white bg-white p-4 shadow-sm lg:self-stretch">
            <ProfileSummary name="Aibek Temirov" role="Student" photo={profilePhoto} />
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick access</p>
            <nav className="space-y-1" aria-label="Workspace sections"><Link href="/subjects" className="block rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700">Subjects</Link><Link href="/homework" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Homework</Link><Link href="/timetable" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Timetable</Link><a href="#assignments" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Assignments</a><a href="#exams" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Exams</a><Link href="/profile" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">Profile</Link></nav>
            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Student account</p>
              <p className="mt-3 text-sm font-semibold text-slate-700">Faculty of Medicine</p>
              <Link href="/login" className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-600"><LogOut size={14} /> Sign out</Link>
            </div>
          </aside>

          <div className="flex flex-col gap-5">
            <div className="grid gap-6 md:grid-cols-2">
              <Stat icon={BookOpen} label="University" value={university} detail="Faculty of Medicine" />
              <Stat icon={CalendarCheck} label="Today" value={currentDateTime || "Loading time..."} detail="Local date and time" />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
              <section className="flex min-h-[560px] flex-col rounded-xl border border-white bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Latest notifications</h2><p className="mt-1 text-sm text-slate-500">Course updates and university messages.</p></div><span className="h-2 w-2 rounded-full bg-cyan-500" /></div>
                <div className="mt-4 flex flex-1 flex-col justify-between gap-3"><p className="rounded-lg bg-cyan-50/70 p-3 text-xs leading-5 text-slate-600"><b className="block text-cyan-800">New presentation</b>Lecture materials added to {course.code}.</p><p id="assignments" className="rounded-lg bg-amber-50/70 p-3 text-xs leading-5 text-slate-600"><b className="block text-amber-800">Assignment reminder</b>Case Study 04 is due tomorrow.</p><p id="exams" className="rounded-lg bg-emerald-50/70 p-3 text-xs leading-5 text-slate-600"><b className="block text-emerald-800">Exam schedule</b>Midterm review opens next week.</p><p className="rounded-lg bg-indigo-50/70 p-3 text-xs leading-5 text-slate-600"><b className="block text-indigo-800">Faculty announcement</b>Faculty orientation meeting is Friday at 14:00.</p><p className="rounded-lg bg-sky-50/70 p-3 text-xs leading-5 text-slate-600"><b className="block text-sky-800">Group update</b>Your MED-24A group timetable has been updated.</p><p className="rounded-lg bg-rose-50/70 p-3 text-xs leading-5 text-slate-600"><b className="block text-rose-800">Submission received</b>Your latest homework submission was received successfully.</p></div>
              </section>

              <div className="flex justify-end lg:pt-0">
                <TodoList />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function ProfessorDashboardMain({ currentDateTime, profilePhoto }: { currentDateTime: string; profilePhoto: string | null }) {
  const courses = [{ code: "MED101", title: "Human Anatomy", groups: "MED-24A, MED-24B", students: 56 }, { code: "MED112", title: "Human Physiology", groups: "MED-24B", students: 18 }, { code: "MED203", title: "Medical Biochemistry", groups: "MED-23B", students: 13 }];
  const homework = [{ title: "Cardiovascular case study", course: "MED101", group: "MED-24A", submitted: 24, total: 32, due: "Sep 8" }, { title: "Respiratory physiology notes", course: "MED112", group: "MED-24B", submitted: 11, total: 18, due: "Sep 11" }, { title: "Enzyme kinetics worksheet", course: "MED203", group: "MED-23B", submitted: 8, total: 13, due: "Sep 5" }];
  return <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]"><header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><GraduationCap size={21} /></span><span className="text-lg font-bold text-[#15345b]">UniCore</span></Link><div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><MenuDropdown /></nav><Link href="/profile" aria-label="Open professor profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-100 bg-cyan-50 text-cyan-700">{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : <CircleUserRound size={21} />}</Link></div></div></header><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-6 grid gap-5 md:grid-cols-3"><Stat icon={BookOpen} label="Teaching faculty" value="Faculty of Medicine" detail="Ala-Too International University" /><Stat icon={Users} label="Students" value="87 enrolled" detail="across 3 active groups" /><Stat icon={CalendarCheck} label="Today" value={currentDateTime || "Loading time..."} detail="Local date and time" /></div><div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="rounded-xl border border-white bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick access</p><nav className="space-y-1" aria-label="Professor workspace"><Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700"><LayoutDashboard size={16} /> Dashboard</Link><Link href="/subjects" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><BookOpen size={16} /> My subjects</Link><Link href="/homework" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><ClipboardList size={16} /> Homework</Link><Link href="/timetable" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><CalendarDays size={16} /> My timetable</Link></nav></aside><section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"><div className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-600">Teaching overview</p><h1 className="mt-2 text-2xl font-semibold text-slate-800">My courses</h1><p className="mt-1 text-sm text-slate-500">Subjects and groups currently assigned to you.</p></div><BookOpen size={22} className="text-cyan-600" /></div><div className="mt-5 space-y-3">{courses.map((course) => <Link key={course.code} href="/subjects" className="block rounded-lg border border-slate-100 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold text-cyan-700">{course.code}</span><p className="mt-1 font-semibold text-slate-700">{course.title}</p><p className="mt-1 text-xs text-slate-400">Groups: {course.groups}</p></div><span className="text-right text-xs font-semibold text-slate-500">{course.students}<span className="block font-normal text-slate-400">students</span></span></div></Link>)}</div><Link href="/subjects" className="mt-4 inline-block text-xs font-bold text-cyan-700 hover:text-cyan-900">Open subjects and groups</Link></div><div className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Homework for my groups</h2><p className="mt-1 text-sm text-slate-500">Check submissions by deadline.</p></div><ClipboardList size={22} className="text-cyan-600" /></div><div className="mt-5 space-y-3">{homework.map((item) => <Link key={item.title} href="/homework" className="block rounded-lg border border-slate-100 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold text-cyan-700">{item.course} · {item.group}</span><p className="mt-1 text-sm font-semibold text-slate-700">{item.title}</p></div><span className="shrink-0 text-xs font-bold text-amber-600">Due {item.due}</span></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{item.submitted} of {item.total} submitted</span><span className="font-semibold text-cyan-700">{Math.round(item.submitted / item.total * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${item.submitted / item.total * 100}%` }} /></div></Link>)}</div><Link href="/homework" className="mt-4 inline-block text-xs font-bold text-cyan-700 hover:text-cyan-900">Manage all homework</Link></div></section></div></div><Footer /></main>;
}

function LegacyProfessorDashboardMain({ currentDateTime, profilePhoto }: { currentDateTime: string; profilePhoto: string | null }) {
  const schedule = [{ day: "Monday", time: "09:00 - 10:30", course: "Human Anatomy", group: "MED-24A", room: "Room 204" }, { day: "Tuesday", time: "11:00 - 12:30", course: "Medical Biochemistry", group: "MED-23B", room: "Lab 3" }, { day: "Wednesday", time: "09:00 - 10:30", course: "Human Physiology", group: "MED-24B", room: "Room 118" }];
  return <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]"><header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><GraduationCap size={21} /></span><span className="text-lg font-bold text-[#15345b]">UniCore</span></Link><div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><MenuDropdown /></nav><Link href="/profile" aria-label="Open professor profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-100 bg-cyan-50 text-cyan-700">{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : <CircleUserRound size={21} />}</Link></div></div></header><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-6 grid gap-5 md:grid-cols-3"><Stat icon={BookOpen} label="Teaching faculty" value="Faculty of Medicine" detail="Ala-Too International University" /><Stat icon={Users} label="Students" value="87 enrolled" detail="across 3 active groups" /><Stat icon={CalendarCheck} label="Today" value={currentDateTime || "Loading time..."} detail="Local date and time" /></div><div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="rounded-xl border border-white bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick access</p><nav className="space-y-1" aria-label="Professor workspace"><Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700"><LayoutDashboard size={16} /> Dashboard</Link><Link href="/subjects" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><BookOpen size={16} /> My subjects</Link><Link href="/homework" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><ClipboardList size={16} /> Homework</Link><Link href="/timetable" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><CalendarDays size={16} /> My timetable</Link></nav></aside><section className="space-y-5"><div className="rounded-xl border border-white bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-600">Teaching overview</p><h1 className="mt-2 text-2xl font-semibold text-slate-800">Good morning, Dr. Karimov</h1><p className="mt-1 text-sm text-slate-500">Manage your subjects, groups, and course activity from one place.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><ProfessorMetric label="Active subjects" value="3" /><ProfessorMetric label="Teaching groups" value="3" /><ProfessorMetric label="Pending reviews" value="12" /></div></div><div className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Today's lectures</h2><p className="mt-1 text-sm text-slate-500">Your current teaching schedule.</p></div><CalendarDays size={20} className="text-cyan-600" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{schedule.map((item) => <div key={`${item.day}-${item.time}`} className="rounded-lg border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">{item.day}</span><span className="text-xs font-semibold text-slate-500">{item.time}</span></div><p className="mt-3 font-semibold text-slate-700">{item.course}</p><p className="mt-1 text-xs text-slate-500">{item.group} · {item.room}</p></div>)}</div><Link href="/timetable" className="mt-4 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900">Open full timetable</Link></div></section></div></div><Footer /></main>;
}

function LegacyProfessorDashboard({ currentDateTime, profilePhoto }: { currentDateTime: string; profilePhoto: string | null }) {
  const schedule = [{ day: "Monday", time: "09:00 - 10:30", course: "Human Anatomy", group: "MED-24A", room: "Room 204" }, { day: "Tuesday", time: "11:00 - 12:30", course: "Medical Biochemistry", group: "MED-23B", room: "Lab 3" }, { day: "Wednesday", time: "09:00 - 10:30", course: "Human Physiology", group: "MED-24B", room: "Room 118" }, { day: "Friday", time: "14:00 - 15:30", course: "Human Anatomy", group: "MED-24A", room: "Room 204" }];
  return <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]"><header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><GraduationCap size={21} /></span><span className="text-lg font-bold text-[#15345b]">UniCore</span></Link><div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><Link href="/dashboard" className="text-sm font-semibold text-cyan-700">Dashboard</Link><Link href="/subjects" className="text-sm font-semibold text-slate-500 hover:text-slate-800">Subjects</Link><Link href="/homework" className="text-sm font-semibold text-slate-500 hover:text-slate-800">Homework</Link></nav><Link href="/profile" aria-label="Open professor profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-100 bg-cyan-50 text-cyan-700">{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : <CircleUserRound size={21} />}</Link></div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-6 grid gap-5 md:grid-cols-3"><Stat icon={BookOpen} label="Teaching faculty" value="Faculty of Medicine" detail="Ala-Too International University" /><Stat icon={Users} label="Students" value="87 enrolled" detail="across 3 active groups" /><Stat icon={CalendarCheck} label="Today" value={currentDateTime || "Loading time..."} detail="Local date and time" /></div><div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="rounded-xl border border-white bg-white p-4 shadow-sm lg:min-h-[600px]"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick access</p><nav className="space-y-1" aria-label="Professor workspace"><Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700"><LayoutDashboard size={16} /> Dashboard</Link><Link href="/subjects" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><BookOpen size={16} /> My subjects</Link><Link href="/homework" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><ClipboardList size={16} /> Homework</Link><a href="#timetable" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"><CalendarDays size={16} /> My timetable</a></nav><div className="mt-8 border-t border-slate-100 pt-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Professor account</p><p className="mt-3 text-sm font-semibold text-slate-700">Dr. A. Karimov</p><p className="mt-1 text-xs text-slate-400">Department of Medical Sciences</p><Link href="/login" className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-600"><LogOut size={14} /> Sign out</Link></div></aside><div className="space-y-5"><section className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-600">Teaching overview</p><h1 className="mt-2 text-2xl font-semibold text-slate-800">Good morning, Dr. Karimov</h1><p className="mt-1 text-sm text-slate-500">Manage your subjects, groups, and course activity from one place.</p></div><GraduationCap className="hidden text-cyan-200 sm:block" size={42} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><ProfessorMetric label="Active subjects" value="3" /><ProfessorMetric label="Teaching groups" value="3" /><ProfessorMetric label="Pending reviews" value="12" /></div></section><section id="timetable" className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">My timetable</h2><p className="mt-1 text-sm text-slate-500">Your lectures for this week.</p></div><CalendarDays size={20} className="text-cyan-600" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{schedule.map((item) => <div key={`${item.day}-${item.time}`} className="rounded-lg border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">{item.day}</span><span className="text-xs font-semibold text-slate-500">{item.time}</span></div><p className="mt-3 font-semibold text-slate-700">{item.course}</p><p className="mt-1 text-xs text-slate-500">{item.group} · {item.room}</p></div>)}</div></section></div></div></div><Footer /></main>;
}

function ProfessorMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-800">{value}</p>{label === "Active subjects" && <div className="mt-4 border-t border-slate-200 pt-4"><ProfileSummary name="Dr. A. Karimov" role="Professor" photo={null} /></div>}</div>; }

function Stat({ icon: Icon, label, value, detail }: { icon: typeof BookOpen; label: string; value: string; detail: string }) { return <div className="rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon size={18} className="text-cyan-600" /></div><p className="mt-4 break-words text-lg font-bold text-slate-800 sm:text-2xl">{value}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }

function ProfileSummary({ name, role, photo }: { name: string; role: string; photo: string | null }) { return <div className="mb-5 flex flex-col items-center border-b border-slate-100 pb-5 text-center"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-cyan-100 text-cyan-700 ring-4 ring-cyan-50">{photo ? <img src={photo} alt={`${name} profile`} className="h-full w-full object-cover" /> : <CircleUserRound size={43} />}</div><p className="mt-3 max-w-full truncate text-sm font-bold text-slate-700">{name}</p><p className="mt-1 text-xs text-slate-400">{role}</p></div>; }

function TodoList() {
  const items = [{ title: "Enzyme kinetics worksheet", course: "MED203", due: "Due tomorrow", urgent: true }, { title: "Cardiovascular case study", course: "MED101", due: "Due Sep 8", urgent: false }, { title: "Respiratory physiology notes", course: "MED112", due: "Due Sep 11", urgent: false }];
  return (
    <section className="h-full w-[320px] rounded-xl border border-white bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">To-Do list</h2>
          <p className="mt-1 text-sm text-slate-500">Closest homework deadlines.</p>
        </div>
        <ClipboardList size={20} className="text-cyan-600" />
      </div>

      <div className="mt-4 flex h-[calc(100%-5.25rem)] flex-col">
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.title} href="/homework" className="block rounded-lg border border-slate-100 p-3 transition hover:border-cyan-300 hover:bg-cyan-50/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-cyan-700">{item.course}</span>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{item.title}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-bold ${item.urgent ? "text-amber-600" : "text-slate-400"}`}>{item.due}</span>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/homework" className="mt-auto pt-4 text-xs font-bold text-cyan-700 hover:text-cyan-900">View all homework</Link>
      </div>
    </section>
  );
}

function ProfessorPanel({ course, onNotice }: { course: Course; onNotice: (message: string) => void }) { return <section className="mt-6 rounded-xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Course management</h2><p className="mt-1 text-sm text-slate-500">{course.code} · {course.title}</p></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">Professor</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => onNotice("Presentation upload ready. Select a file to continue.")} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-50/40"><FileUp size={20} className="text-cyan-600" /><span><b className="block text-sm text-slate-700">Upload presentation</b><small className="text-xs text-slate-400">Share lecture slides with the group</small></span></button><button type="button" onClick={() => onNotice("New assignment draft created for this subject.")} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-50/40"><Plus size={20} className="text-indigo-500" /><span><b className="block text-sm text-slate-700">Assign a task</b><small className="text-xs text-slate-400">Create work for the whole group</small></span></button></div><div className="mt-6 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 font-semibold text-slate-800"><ClipboardList size={17} /> Recent subject activity</h3><div className="mt-3 space-y-2 text-sm"><p className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-slate-600"><span>Lecture 04 presentation</span><span className="text-xs text-slate-400">Today</span></p><p className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-slate-600"><span>Case Study 04 · Cardiovascular System</span><span className="text-xs text-amber-600">Due tomorrow</span></p></div></div></section>; }



