"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Mail, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import SubjectPlan from "@/components/SubjectPlan";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary, useLocale } from "@/i18n/locale-provider";
import { pluralize } from "@/i18n/pluralize";
import { useApi } from "@/lib/client";

type Group = { id: number; name: string; studentCount: number };
type Course = { id: number; code: string; title: string; facultyName: string | null; groups?: Group[]; professorName?: string; professorEmail?: string };

/** One subject: its syllabus and class plan, and (for the professor) the groups taking it. */
export default function SubjectPage() {
  const dict = useDictionary();
  const t = dict.wk;
  const { locale } = useLocale();
  const professor = useSessionUser().role === "professor";
  const id = Number(useParams<{ id: string }>().id);
  const { data } = useApi<{ courses: Course[] }>("/api/courses");
  const course = data?.courses.find((item) => item.id === id);
  const section = professor ? t.navMyTeaching : dict.common.nav.subjects;

  return (
    <div className="space-y-6">
      <nav aria-label={section} className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/subjects" aria-label={section} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent"><ArrowLeft size={15} /></Link>
        <Link href="/subjects" className="font-medium text-muted hover:text-accent">{section}</Link>
        <ChevronRight size={14} className="text-faint" />
        <span className="font-semibold text-ink">{course ? `${course.code} · ${course.title}` : "…"}</span>
      </nav>

      <SubjectPlan courseId={id} />

      {professor && course?.groups && course.groups.length > 0 && (
        <Card title={t.groupsHeading} icon={Users}>
          <ul className="space-y-3">
            {course.groups.map((group) => (
              <li key={group.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted p-4">
                <Badge>{group.name}</Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-muted"><Users size={14} />{group.studentCount} {pluralize(locale, group.studentCount, t.studentForms)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {!professor && course?.professorEmail && (
        <p className="flex items-center gap-2 text-sm text-ink-soft"><span>{course.professorName}</span><a href={`mailto:${course.professorEmail}`} className="text-accent" aria-label={course.professorName}><Mail size={14} /></a></p>
      )}
    </div>
  );
}
