"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, LogOut, Trash2 } from "lucide-react";
import PasswordForm from "@/components/PasswordForm";
import { Alert, Card, dangerButton, secondaryButton } from "@/components/ui";
import { Avatar } from "@/components/workspace/WorkspaceShell";
import { signOut, useSessionUser } from "@/components/workspace/session-context";
import { useDictionary } from "@/i18n/locale-provider";
import { api, useApi } from "@/lib/client";

/** Downscales a photo in the browser so uploads stay small. */
async function resizeImage(file: File, maxSide = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not read the image.")), "image/jpeg", 0.85));
}

export default function ProfilePage() {
  const user = useSessionUser();
  const router = useRouter();
  const dict = useDictionary();
  const { data } = useApi<{ placement?: { groupName: string; facultyName: string } | null; faculties?: string[] }>("/api/profile");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Back to wherever the user came from; falls back to the dashboard when the page was opened directly.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push("/dashboard"));

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("photo", await resizeImage(file), "photo.jpg");
      await api("/api/auth/photo", { method: "PUT", body });
      setMessage({ tone: "success", text: dict.wk.photoUpdated });
      router.refresh();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setBusy(false); }
  };

  const removePhoto = async () => {
    setBusy(true);
    try {
      await api("/api/auth/photo", { method: "DELETE" });
      setMessage({ tone: "success", text: dict.wk.photoRemoved });
      router.refresh();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) }); } finally { setBusy(false); }
  };

  const details: [string, string | null | undefined][] = [
    [dict.wk.fullName, user.fullName],
    [dict.wk.emailLabel, user.email],
    [dict.wk.universityLabel, user.universityName],
    ...(user.role === "student" ? [[dict.wk.studentNumber, user.studentNumber ?? "—"], [dict.wk.facultyLabel, data?.placement?.facultyName ?? dict.wk.notAssigned], [dict.wk.group, data?.placement?.groupName ?? dict.wk.notAssigned]] as [string, string][] : [[dict.wk.facultiesLabel, data?.faculties?.join(", ") || "—"]] as [string, string][]),
  ];

  return (
    <>
      <div className="mb-5 hidden items-center gap-4 rounded-lg border border-line bg-surface p-4 sm:px-6 lg:flex">
        <button type="button" onClick={goBack} className={`${secondaryButton} h-9 text-xs`}><ArrowLeft size={14} />{dict.common.actions.back}</button>
        <h1 className="text-xl font-bold text-ink">{dict.profile.title}</h1>
      </div>
      {message && <div className="mb-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={dict.wk.accountCard}>
          <div className="mb-5 flex items-center gap-4">
            <Avatar user={user} size={80} />
            <div className="flex flex-wrap gap-2">
              <label className={`${secondaryButton} h-9 cursor-pointer text-xs ${busy ? "pointer-events-none opacity-60" : ""}`}><Camera size={14} />{user.photoUrl ? dict.wk.changePhoto : dict.wk.addPhoto}<input type="file" accept="image/*" className="sr-only" onChange={(event) => void changePhoto(event)} /></label>
              {user.photoUrl && <button type="button" disabled={busy} onClick={() => void removePhoto()} className={dangerButton}><Trash2 size={13} />{dict.wk.remove}</button>}
            </div>
          </div>
          <dl className="divide-y divide-line">
            {details.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-muted">{label}</dt><dd className="text-right font-medium text-ink">{value}</dd></div>)}
          </dl>
        </Card>
        <PasswordForm />
      </div>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => void signOut()} className={`${dangerButton} h-10 px-4`}><LogOut size={16} />{dict.common.actions.signOut}</button>
      </div>
    </>
  );
}
