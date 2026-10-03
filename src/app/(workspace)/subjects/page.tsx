"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { useApi } from "@/lib/client";

type Group = { id: number; name: string; studentCount: number };
type ProfessorCourse = { id: number; code: string; title: string; facultyName: string | null; groups: Group[] };
type StudentCourse = { id: number; code: string; title: string; facultyName: string | null; professorName: string; professorEmail: string };
type Course = ProfessorCourse & StudentCourse;

function SubjectInfo({ course }: { course: Course }) {
  return (
    <div className="min-w-0">
      <Badge tone="accent">{course.code}</Badge>
      <p className="mt-1.5 font-semibold text-ink">{course.title}</p>
      {course.facultyName && <p className="text-xs text-muted">{course.facultyName}</p>}
    </div>
  );
}

const rowClass = "grid gap-3 rounded-lg border border-line bg-surface-muted p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5";

export default function SubjectsPage() {
  const dict = useDictionary();
  const t = dict.wk;
  const user = useSessionUser();
  const professor = user.role === "professor";
  const { data, loading } = useApi<{ courses: Course[] }>("/api/courses");
  const courses = data?.courses ?? [];
  return (
    <>
      {!loading && courses.length === 0 ? (
        <EmptyState icon={BookOpen} title={professor ? t.noSubjectsProf : t.noSubjectsStudent} description={professor ? t.noSubjectsProfDesc : t.noSubjectsStudentDesc} />
      ) : (
        // One row per subject; a professor sees the groups inside. Class times live on the Timetable page.
        <Card title={professor ? t.navMyTeaching : dict.common.nav.subjects} icon={BookOpen}>
          <ul className="space-y-3">
            {courses.map((course) => (
              <li key={course.id}>
                <Link href={`/subjects/${course.id}`} className={`${rowClass} transition hover:border-accent`}>
                  <SubjectInfo course={course} />
                  <div className="flex items-center gap-3 md:justify-end">
                    {!professor && <span className="truncate text-sm text-ink-soft">{course.professorName}</span>}
                    <ChevronRight size={18} className="shrink-0 text-muted" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
