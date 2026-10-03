"use client";

import { FormEvent, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Alert, Badge, Card, EmptyState, Field, inputClass, primaryButton, textareaClass } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { api, formatDateTime, useApi } from "@/lib/client";

type Announcement = { id: number; title: string; body: string; createdAt: string; courseCode: string; courseTitle: string; groupName: string; professorName: string };
type Offering = { courseId: number; courseCode: string; courseTitle: string; groupId: number; groupName: string };

export default function BulletinPage() {
  const t = useDictionary().wk;
  const professor = useSessionUser().role === "professor";
  const { data, loading, reload } = useApi<{ announcements: Announcement[]; offerings?: Offering[] }>("/api/bulletin");
  const [offeringKey, setOfferingKey] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const [courseId, groupId] = offeringKey.split(":").map(Number);
    setSending(true);
    try {
      await api("/api/bulletin", { method: "POST", json: { courseId, groupId, title: values.get("title"), body: values.get("body") } });
      setMessage({ tone: "success", text: t.announcementPublished });
      form.reset();
      setOfferingKey("");
      reload();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSending(false); }
  };

  const announcements = data?.announcements ?? [];
  return (
    <>
      <div className={professor ? "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : ""}>
        {professor && (
          <Card title={t.newAnnouncement} icon={Send}>
            {(data?.offerings ?? []).length === 0 && !loading ? <p className="text-sm text-muted">{t.noGroupsToPost}</p> : (
              <form onSubmit={publish} className="space-y-4">
                <Field label={t.subjectAndGroup}>
                  <select required value={offeringKey} onChange={(event) => setOfferingKey(event.target.value)} className={inputClass}>
                    <option value="">{t.choose}</option>
                    {(data?.offerings ?? []).map((entry) => <option key={`${entry.courseId}:${entry.groupId}`} value={`${entry.courseId}:${entry.groupId}`}>{entry.courseCode} — {entry.groupName}</option>)}
                  </select>
                </Field>
                <Field label={t.title}><input name="title" required minLength={2} maxLength={160} className={inputClass} /></Field>
                <Field label={t.messageField}><textarea name="body" required minLength={2} maxLength={5000} rows={6} className={textareaClass} /></Field>
                {message && <Alert tone={message.tone}>{message.text}</Alert>}
                <button type="submit" disabled={sending} className={primaryButton}><Send size={16} />{sending ? t.publishing : t.publish}</button>
              </form>
            )}
          </Card>
        )}
        <div className="space-y-3">
          {!loading && announcements.length === 0 && <EmptyState icon={Megaphone} title={t.noAnnouncements} />}
          {announcements.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{item.courseCode}</Badge>{professor && <Badge>{item.groupName}</Badge>}<span className="text-xs text-faint">{formatDateTime(item.createdAt)}</span></div>
              <h2 className="mt-2 font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{item.body}</p>
              {!professor && <p className="mt-3 text-xs text-muted">{item.professorName} · {item.courseTitle}</p>}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
