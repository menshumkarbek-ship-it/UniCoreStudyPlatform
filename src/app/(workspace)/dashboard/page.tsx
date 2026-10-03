"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CalendarClock, CheckCheck, Clock3, Globe, GraduationCap } from "lucide-react";
import { useNotifications } from "@/components/NotificationDropdown";
import { Badge, Card, EmptyState, Stat } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { fill } from "@/i18n/format";
import { useApi, formatDate, formatDateTime } from "@/lib/client";
import { activeIntlLocale, clockIn, weekdayName } from "@/lib/time";

type Entry = { id: number; weekday: number; startsAt: string; endsAt: string; room: string };
type StudentHomework = { id: number; title: string; courseCode: string; dueAt: string; points: number; status: "submitted" | "graded" | null; grade: number | null };
type ProfessorHomework = { id: number; title: string; courseCode: string; groupName: string; dueAt: string; studentCount: number; submittedCount: number; gradedCount: number };
type Exam = { id: number; title: string; code: string; examDate: string; startsAt: string; groupName?: string };
type Profile = { placement?: { groupName: string; facultyName: string } | null };

/** The current time, updated on each `step` boundary (every minute by default), so a clock turns over exactly on time. */
function useNow(step = 60_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, step - (Date.now() % step));
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [step]);
  return now;
}

/** The class in progress or the next one to start, by the university's clock; after the week's last class it wraps to next week. */
function nextClass(entries: Entry[], now: Date, timeZone: string) {
  const { weekday, time } = clockIn(timeZone, now);
  const entry = entries.find((item) => item.weekday > weekday || (item.weekday === weekday && item.endsAt > time)) ?? entries[0];
  if (!entry) return null;
  const today = entry.weekday === weekday && entry.endsAt > time;
  return { entry, today, live: today && entry.startsAt <= time };
}

function LatestNotifications() {
  const dict = useDictionary();
  const { items, unreadCount, loaded, openItem, markAllRead } = useNotifications();
  return (
    <Card title={dict.common.notifications.title} icon={Bell} className="flex flex-col" actions={unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="flex shrink-0 items-center gap-1 text-xs font-bold text-accent hover:underline"><CheckCheck size={14} />{dict.common.notifications.markAllRead}</button>}>
      {loaded && items.length === 0 ? <EmptyState icon={Bell} title={dict.wk.noNotifications} /> : (
        // Side by side with the other card, the list scrolls inside this card instead of making the row taller.
        <div className="relative flex-1">
          <ul className="space-y-2 xl:absolute xl:inset-0 xl:overflow-y-auto xl:pr-1">
            {items.slice(0, 6).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => void openItem(item)} className={`block w-full rounded-lg border border-line px-4 py-3 text-left transition hover:border-accent ${item.readAt ? "" : "bg-mint/30 dark:bg-surface-muted"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    {!item.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-periwinkle" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.detail}</p>
                  <p className="mt-1 text-[11px] text-faint">{formatDateTime(item.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** University, next class, and the time at the university: the same three tiles on the student and professor dashboards. */
function OverviewStats({ now, entries, universityDetail }: { now: Date | null; entries: Entry[] | undefined; universityDetail: string | undefined }) {
  const t = useDictionary().wk;
  const user = useSessionUser();
  const clock = useNow(1000);
  const next = now && entries ? nextClass(entries, now, user.timezone) : null;
  const day = next && (next.live ? t.nowBadge : next.today ? t.today : weekdayName(next.entry.weekday));
  // The time at the university, which class times and deadlines follow, in the interface language.
  const atUniversity = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(activeIntlLocale(), { timeZone: user.timezone, ...options });
  return (
    // Tiles side by side span the three rows of label/value/detail; the row gap only applies when they stack.
    <div className="mb-6 grid gap-4 sm:grid-cols-3 sm:gap-y-0">
      <Stat tone="sky" icon={GraduationCap} label={t.universityLabel} value={<span className="block text-xl leading-tight">{user.universityName ?? "—"}</span>} detail={universityDetail} />
      <Stat tone="peach" icon={Clock3} label={t.statNextClass} value={next ? `${next.entry.startsAt}–${next.entry.endsAt}` : "—"}
        detail={!entries ? undefined : next ? [day!, next.entry.room].map((part) => part.replace(/ /g, "\u00a0")).join(" · ") : t.noClassesScheduled} />
      <Stat tone="mint" icon={Globe} label={t.statLocalTime} value={clock ? <span className="tabular-nums">{atUniversity({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(clock)}</span> : "—"}
        detail={clock ? atUniversity({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(clock) : undefined} />
    </div>
  );
}

type EventItem = { key: string; badge: { tone: "success" | "accent" | "warning" | "danger"; label: string }; href: string; title: string; at: number; detail: string };

/** The soonest deadlines and exams, as the "Upcoming events" card. */
function UpcomingEvents({ events }: { events: EventItem[] }) {
  const t = useDictionary().wk;
  return (
    <div className="flex flex-col">
      <Card title={t.upcomingEvents} icon={CalendarClock} className="flex-1">
        {events.length === 0 ? <p className="text-sm text-muted">{t.nothingComing}</p> : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.key}>
                <Link href={event.href} className="block rounded-lg border border-line px-3 py-2.5 hover:border-accent">
                  <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-sm font-semibold text-ink">{event.title}</p><span className="shrink-0"><Badge tone={event.badge.tone}>{event.badge.label}</Badge></span></div>
                  <p className="mt-0.5 text-xs text-muted">{event.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Latest notifications beside upcoming events: the same two containers for students and professors. */
function DashboardPanels({ events }: { events: EventItem[] }) {
  return (
    <div className="grid min-h-[530px] grid-cols-1 gap-5 lg:min-h-0 xl:grid-cols-[minmax(0,1fr)_320px]">
      <LatestNotifications />
      <UpcomingEvents events={events} />
    </div>
  );
}

function StudentDashboard() {
  const t = useDictionary().wk;
  const now = useNow();
  const { data: timetable } = useApi<{ entries: Entry[] }>("/api/timetable");
  const { data: homework } = useApi<{ homework: StudentHomework[] }>("/api/homework");
  const { data: exams } = useApi<{ exams: Exam[]; today: string }>("/api/exams");
  const { data: profile } = useApi<Profile>("/api/profile");

  // Homework stays listed until its deadline, even once handed in; the badge says where it stands.
  const upcomingHomework = (homework?.homework ?? []).filter((item) => now && new Date(item.dueAt) > now);
  const upcomingExams = (exams?.exams ?? []).filter((exam) => exam.examDate >= exams!.today).slice(0, 4);
  const homeworkBadge = (item: StudentHomework) => item.status === "graded" ? { tone: "success" as const, label: fill(t.statusGraded, { grade: item.grade ?? 0, points: item.points }) }
    : item.status === "submitted" ? { tone: "accent" as const, label: t.statusSubmitted } : { tone: "warning" as const, label: t.kindHomework };
  const events = [
    ...upcomingHomework.map((item) => ({ key: `h${item.id}`, badge: homeworkBadge(item), href: "/homework", title: item.title, at: new Date(item.dueAt).getTime(), detail: `${item.courseCode} · ${fill(t.dueDate, { date: formatDate(item.dueAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}` })),
    ...upcomingExams.map((exam) => ({ key: `e${exam.id}`, badge: { tone: "danger" as const, label: t.kindExam }, href: "/exams", title: exam.title, at: new Date(`${exam.examDate}T${exam.startsAt}`).getTime(), detail: `${exam.code} · ${formatDate(exam.examDate, { weekday: "short", day: "numeric", month: "short" })} · ${exam.startsAt}` })),
  ].sort((a, b) => a.at - b.at).slice(0, 8);

  return (
    <>
      {profile && !profile.placement && <div className="mb-5 rounded-lg bg-peach px-4 py-3 text-sm text-obsidian">{t.notInGroup}</div>}
      <OverviewStats now={now} entries={timetable?.entries} universityDetail={profile?.placement?.facultyName} />
      <DashboardPanels events={events} />
    </>
  );
}

function ProfessorDashboard() {
  const t = useDictionary().wk;
  const now = useNow();
  const user = useSessionUser();
  const { data: timetable } = useApi<{ entries: Entry[] }>("/api/timetable");
  const { data: homework } = useApi<{ homework: ProfessorHomework[] }>("/api/homework");
  const { data: exams } = useApi<{ exams: Exam[]; today: string }>("/api/exams");

  // The professor's own deadlines and exams, soonest first; a homework with submissions waiting says how many.
  const upcomingHomework = (homework?.homework ?? []).filter((item) => now && new Date(item.dueAt) > now);
  const upcomingExams = (exams?.exams ?? []).filter((exam) => exam.examDate >= exams!.today);
  const events: EventItem[] = [
    ...upcomingHomework.map((item) => {
      const waiting = item.submittedCount - item.gradedCount;
      return { key: `h${item.id}`, badge: waiting > 0 ? { tone: "accent" as const, label: fill(t.nToGrade, { n: waiting }) } : { tone: "warning" as const, label: t.kindHomework }, href: `/homework?open=${item.id}`, title: item.title, at: new Date(item.dueAt).getTime(), detail: `${item.courseCode} · ${item.groupName} · ${fill(t.dueDate, { date: formatDate(item.dueAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}` };
    }),
    ...upcomingExams.map((exam) => ({ key: `e${exam.id}`, badge: { tone: "danger" as const, label: t.kindExam }, href: "/exams", title: exam.title, at: new Date(`${exam.examDate}T${exam.startsAt}`).getTime(), detail: `${exam.code} · ${exam.groupName} · ${formatDate(exam.examDate, { weekday: "short", day: "numeric", month: "short" })} · ${exam.startsAt}` })),
  ].sort((a, b) => a.at - b.at).slice(0, 8);

  return (
    <>
      {/* Under the university: a student sees their faculty; a professor, who may teach in several, sees the city. */}
      <OverviewStats now={now} entries={timetable?.entries} universityDetail={user.universityCity ?? undefined} />
      <DashboardPanels events={events} />
    </>
  );
}

export default function DashboardPage() {
  return useSessionUser().role === "professor" ? <ProfessorDashboard /> : <StudentDashboard />;
}
