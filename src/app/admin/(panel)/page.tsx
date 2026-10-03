"use client";

import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import ResourceSection, { type Item } from "@/components/admin/ResourceSection";
import { Field, PageHeader, inputClass } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { useApi } from "@/lib/client";

type University = Item & { name: string; city: string; timezone: string; facultyCount: number; groupCount: number; professorCount: number; studentCount: number; courseCount: number };

export default function UniversitiesPage() {
  const dict = useDictionary();
  const t = dict.adm;
  const { data, loading, setData } = useApi<{ items: University[] }>("/api/admin/universities");
  return (
    <>
      <PageHeader eyebrow={dict.auth.platformAdmin} title={t.universities} icon={Building2} description={t.uniDescription} />
      <ResourceSection<University>
        resource="universities"
        items={data?.items ?? []}
        loading={loading}
        onChanged={(items) => setData({ items })}
        icon={Building2}
        noun="university"
        emptyHint={t.uniEmpty}
        columns={[
          { header: t.university, cell: (item) => <Link href={`/admin/universities/${item.id}`} className="group inline-flex items-center gap-1 font-semibold text-ink hover:text-accent">{item.name}<ChevronRight size={15} className="text-faint group-hover:text-accent" /></Link> },
          { header: t.city, cell: (item) => item.city },
          { header: t.faculties, cell: (item) => item.facultyCount },
          { header: t.groups, cell: (item) => item.groupCount },
          { header: t.professors, cell: (item) => item.professorCount },
          { header: t.students, cell: (item) => item.studentCount },
          { header: t.subjects, cell: (item) => item.courseCount },
        ]}
        renderFields={(editing) => (
          <>
            <Field label={t.name}><input name="name" required maxLength={200} defaultValue={editing?.name} className={inputClass} /></Field>
            <Field label={t.city}><input name="city" required maxLength={120} defaultValue={editing?.city} className={inputClass} /></Field>
            <Field label={t.timezone} hint={t.timezoneHint}><input name="timezone" required defaultValue={editing?.timezone ?? "Asia/Bishkek"} className={inputClass} /></Field>
          </>
        )}
        toPayload={(form) => ({ name: form.get("name"), city: form.get("city"), timezone: form.get("timezone") })}
      />
    </>
  );
}
