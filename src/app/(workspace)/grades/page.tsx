"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Badge, Card, EmptyState, linkButton } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { fill } from "@/i18n/format";
import { formatDate, useApi } from "@/lib/client";
import { activeIntlLocale } from "@/lib/time";

type GradingComponent = { id: number; name: string; weight: number; defaultHomework: boolean; defaultExams: boolean };
type ComponentResult = { componentId: number; itemCount: number; countedCount: number; averagePercent: number | null; earned: number | null };
type Score = { earned: number; possible: number; percent: number | null; components: ComponentResult[] };
type ScoredItem = { kind: "homework" | "exam"; id: number; componentId: number; title: string; points: number; earned: number | null; state: "graded" | "missed" | "pending"; at: string };
type Subject = { id: number; code: string; title: string; professorName: string; score: Score; items: ScoredItem[] };
type GradebookStudent = { studentId: number; studentName: string; studentNumber: string | null; score: Score };
type Offering = { courseId: number; courseCode: string; courseTitle: string; groupId: number; groupName: string; studentCount: number; awaitingCount: number; averagePercent: number | null; students: GradebookStudent[] };

function percentTone(percent: number) {
  return percent >= 85 ? "success" : percent >= 60 ? "accent" : percent >= 40 ? "warning" : "danger";
}

/** Points and percentages to at most one decimal, in the interface language (e.g. 26.4 / 26,4). */
function useNumber() {
  return (value: number) => new Intl.NumberFormat(activeIntlLocale(), { maximumFractionDigits: 1 }).format(value);
}

/** One box per component: its weight, the student's average there, and the points that earns out of the weight. */
function ComponentBreakdown({ components, score }: { components: GradingComponent[]; score: Score }) {
  const number = useNumber();
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {components.map((component) => {
        const result = score.components.find((item) => item.componentId === component.id);
        const average = result?.averagePercent ?? null;
        return (
          <div key={component.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
            <p className="flex items-baseline justify-between gap-2 text-xs text-muted"><span className="truncate font-medium text-ink-soft">{component.name}</span><span className="shrink-0">{number(component.weight)}%</span></p>
            <p className="mt-1 flex items-baseline justify-between gap-2">
              <span className={`text-lg font-bold ${average === null ? "text-faint" : "text-ink"}`}>{average === null ? "—" : `${number(average)}%`}</span>
              <span className="text-xs text-muted">{result?.earned === null || result?.earned === undefined ? "—" : number(result.earned)} / {number(component.weight)}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** The headline for a score: points out of 100, and the standing on what has been assessed so far. */
function Total({ score, align = "right" }: { score: Score; align?: "left" | "right" }) {
  const t = useDictionary().wk;
  const number = useNumber();
  return (
    <div className={align === "right" ? "sm:text-right" : ""}>
      <p className="text-xs text-muted">{t.totalScore}</p>
      <p className="text-2xl font-bold leading-tight text-ink">{number(score.earned)} <span className="text-sm font-normal text-muted">{t.outOf100}</span></p>
      <p className="mt-0.5 text-xs text-muted">{score.percent === null ? t.nothingAssessed : fill(t.assessedSoFar, { percent: number(score.percent), possible: number(score.possible) })}</p>
    </div>
  );
}

function StudentGrades() {
  const t = useDictionary().wk;
  const number = useNumber();
  const { data, loading } = useApi<{ components: GradingComponent[]; subjects: Subject[] }>("/api/grades");
  const [open, setOpen] = useState<number | null>(null);
  const subjects = data?.subjects ?? [];
  const components = data?.components ?? [];
  return (
    <Card title={t.navGrades} icon={BarChart3}>
      {!loading && subjects.length === 0 ? <EmptyState icon={BarChart3} title={t.noGradesTitle} description={t.noGradesDesc} /> : (
        <ul className="space-y-3">
          {subjects.map((subject) => (
            <li key={subject.id} className="rounded-lg border border-line bg-surface-muted p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge tone="accent">{subject.code}</Badge>
                  <p className="mt-1.5 font-semibold text-ink">{subject.title}</p>
                  <p className="text-xs text-muted">{subject.professorName}</p>
                </div>
                <Total score={subject.score} />
              </div>
              <div className="mt-4"><ComponentBreakdown components={components} score={subject.score} /></div>
              {subject.items.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <button type="button" onClick={() => setOpen(open === subject.id ? null : subject.id)} className={linkButton}>{open === subject.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{open === subject.id ? t.hideWork : t.showWork}</button>
                  {open === subject.id && (
                    <ul className="mt-2 divide-y divide-line">
                      {subject.items.map((item) => (
                        <li key={`${item.kind}-${item.id}`} className="flex items-start justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">{item.title}</p>
                            <p className="mt-0.5 text-xs text-muted">{item.kind === "exam" ? t.kindExam : t.kindHomework} · {components.find((component) => component.id === item.componentId)?.name} · {formatDate(item.at, { day: "numeric", month: "short" })}</p>
                          </div>
                          <span className="shrink-0">
                            {item.state === "graded" ? <Badge tone={percentTone(item.earned! / item.points * 100)}>{item.earned}/{item.points} · {number(item.earned! / item.points * 100)}%</Badge>
                              : item.state === "missed" ? <Badge tone="danger">{t.statusMissed} · 0/{item.points}</Badge>
                              : <Badge>{t.notGradedYet}</Badge>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProfessorGradebook() {
  const t = useDictionary().wk;
  const number = useNumber();
  const { data, loading } = useApi<{ components: GradingComponent[]; offerings: Offering[] }>("/api/grades");
  const [open, setOpen] = useState<string | null>(null);
  const offerings = data?.offerings ?? [];
  const components = data?.components ?? [];
  return (
    <Card title={t.navGradebook} icon={BarChart3}>
      {!loading && offerings.length === 0 ? <EmptyState icon={BarChart3} title={t.noGroupsTitle} description={t.noGroupsDesc} /> : (
        <ul className="space-y-3">
          {offerings.map((offering) => {
            const key = `${offering.courseId}-${offering.groupId}`;
            return (
              <li key={key} className="rounded-lg border border-line bg-surface-muted p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{offering.courseCode}</Badge><Badge>{offering.groupName}</Badge>{offering.awaitingCount > 0 && <Link href="/homework"><Badge tone="warning">{fill(t.nToGrade, { n: offering.awaitingCount })}</Badge></Link>}</div>
                    <p className="mt-1.5 font-semibold text-ink">{offering.courseTitle}</p>
                  </div>
                  {offering.averagePercent !== null && <Badge tone={percentTone(offering.averagePercent)}>{fill(t.classAverage, { n: number(offering.averagePercent) })}</Badge>}
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <button type="button" onClick={() => setOpen(open === key ? null : key)} className={linkButton}>{open === key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{open === key ? t.hideStudents : t.showStudents}</button>
                  {open === key && (offering.students.length === 0 ? <p className="mt-2 text-xs text-muted">{t.noStudentsInGroup}</p> : (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-line text-[11px] text-muted">
                          <tr>
                            <th className="px-3 py-2.5 font-medium">{t.colStudent}</th>
                            {components.map((component) => <th key={component.id} className="whitespace-nowrap px-3 py-2.5 text-right font-medium">{component.name} <span className="text-faint">{number(component.weight)}%</span></th>)}
                            <th className="px-3 py-2.5 text-right font-medium">{t.colTotal}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {offering.students.map((student) => (
                            <tr key={student.studentId}>
                              <td className="whitespace-nowrap px-3 py-2.5"><span className="font-medium text-ink">{student.studentName}</span>{student.studentNumber && <span className="ml-2 text-xs text-faint">{student.studentNumber}</span>}</td>
                              {components.map((component) => {
                                const average = student.score.components.find((item) => item.componentId === component.id)?.averagePercent ?? null;
                                return <td key={component.id} className="px-3 py-2.5 text-right text-ink-soft">{average === null ? <span className="text-faint">—</span> : `${number(average)}%`}</td>;
                              })}
                              <td className="whitespace-nowrap px-3 py-2.5 text-right"><span className="font-bold text-ink">{number(student.score.earned)}</span><span className="text-xs text-muted"> / 100</span>{student.score.percent !== null && <span className="ml-2"><Badge tone={percentTone(student.score.percent)}>{number(student.score.percent)}%</Badge></span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function GradesPage() {
  return useSessionUser().role === "professor" ? <ProfessorGradebook /> : <StudentGrades />;
}
