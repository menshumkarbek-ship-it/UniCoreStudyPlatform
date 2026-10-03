"use client";

import { KeyRound } from "lucide-react";
import PasswordForm from "@/components/PasswordForm";
import { Card, PageHeader } from "@/components/ui";
import { useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";

export default function AdminAccountPage() {
  const user = useSessionUser();
  const dict = useDictionary();
  return (
    <>
      <PageHeader eyebrow={dict.auth.platformAdmin} title={dict.adm.account} icon={KeyRound} />
      <div className="grid max-w-4xl gap-5 md:grid-cols-2">
        <Card title={dict.adm.signedInAs}>
          <p className="font-semibold text-ink">{user.fullName}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mt-4 text-xs text-faint">{dict.adm.accountAddAdmin}</p>
        </Card>
        <PasswordForm />
      </div>
    </>
  );
}
