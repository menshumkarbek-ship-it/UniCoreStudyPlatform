"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Alert, Card, Field, inputClass, primaryButton } from "@/components/ui";
import { useDictionary } from "@/i18n/locale-provider";
import { api } from "@/lib/client";

/** Changes the signed-in user's password. Other devices are signed out; this one stays signed in. */
export default function PasswordForm() {
  const t = useDictionary().adm;
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("newPassword") !== values.get("confirmPassword")) {
      setMessage({ tone: "error", text: t.passwordMismatch });
      return;
    }
    setSaving(true);
    try {
      await api("/api/auth/password", { method: "PATCH", json: { currentPassword: values.get("currentPassword"), newPassword: values.get("newPassword") } });
      form.reset();
      setMessage({ tone: "success", text: t.passwordChanged });
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setSaving(false); }
  };

  return (
    <Card title={t.changePassword} icon={LockKeyhole}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t.currentPassword}><input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} /></Field>
        <Field label={t.newPassword} hint={t.newPasswordHint}><input name="newPassword" type="password" autoComplete="new-password" required minLength={8} className={inputClass} /></Field>
        <Field label={t.repeatPassword}><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={inputClass} /></Field>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <button type="submit" disabled={saving} className={primaryButton}>{saving ? t.saving : t.updatePassword}</button>
      </form>
    </Card>
  );
}
