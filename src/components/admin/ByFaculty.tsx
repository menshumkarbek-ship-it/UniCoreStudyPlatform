"use client";

import { ReactNode, useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Landmark } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";

type Faculty = { id: number; name: string; degrees?: string[] };

/** The faculty being looked at, from the address (#groups/faculty/3, or #courses/faculty/none for items without one). */
function readFaculty(): number | "none" | undefined {
  const [, kind, id] = window.location.hash.slice(1).split("/");
  if (kind !== "faculty") return undefined;
  return id === "none" ? "none" : Number(id);
}

const rowLink = "flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted p-4 transition hover:border-accent";

/**
 * One level of categorization by faculty: a list of faculties, and inside one, `children` for that faculty's items.
 * Like the timetable and students, each step is its own address, so Back, reload and links work.
 * `countFor(null)` counts items with no faculty; when it is above zero a "No faculty" row is offered.
 */
export default function ByFaculty({ tab, title, faculties, countFor, countLabel, includeNone = false, children }: {
  tab: string; title: string; faculties: Faculty[]; countFor: (facultyId: number | null) => number; countLabel: string; includeNone?: boolean;
  children: (faculty: Faculty | null) => ReactNode;
}) {
  const t = useDictionary().adm;
  const [place, setPlace] = useState<number | "none" | undefined>(undefined);
  useEffect(() => {
    const sync = () => setPlace(readFaculty());
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", sync); };
  }, []);

  const faculty = typeof place === "number" ? faculties.find((item) => item.id === place) : undefined;
  const inside = place === "none" ? true : Boolean(faculty);

  if (inside) {
    const name = faculty?.name ?? t.noFaculty;
    return (
      <div>
        <nav aria-label={title} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <a href={`#${tab}`} aria-label={t.backTo.replace("{name}", title)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent"><ArrowLeft size={15} /></a>
          <a href={`#${tab}`} className="font-medium text-muted hover:text-accent">{title}</a>
          <ChevronRight size={14} className="text-faint" />
          <span className="font-semibold text-ink">{name}</span>
        </nav>
        {children(faculty ?? null)}
      </div>
    );
  }

  const noneCount = includeNone ? countFor(null) : 0;
  if (faculties.length === 0 && noneCount === 0) return <EmptyState icon={Landmark} title={t.nouns.faculty.empty} description={t.facultyEmpty} />;
  return (
    <ul className="space-y-3">
      {faculties.map((item) => (
        <li key={item.id}>
          <a href={`#${tab}/faculty/${item.id}`} className={rowLink}>
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="font-semibold text-ink">{item.name}</span><span className="text-xs text-muted">{item.degrees?.join(" · ")}</span></span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{countLabel.replace("{n}", String(countFor(item.id)))}<ChevronRight size={18} /></span>
          </a>
        </li>
      ))}
      {noneCount > 0 && (
        <li>
          <a href={`#${tab}/faculty/none`} className={rowLink}>
            <span className="font-semibold text-ink">{t.noFaculty}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{countLabel.replace("{n}", String(noneCount))}<ChevronRight size={18} /></span>
          </a>
        </li>
      )}
    </ul>
  );
}
