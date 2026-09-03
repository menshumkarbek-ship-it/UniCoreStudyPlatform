"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Camera, Check, ChevronLeft, LockKeyhole, LogOut, Save, Trash2, UserRound } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(() => typeof window === "undefined" ? null : window.localStorage.getItem("tronsabak-profile-photo"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [university, setUniversity] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (response) => response.ok ? response.json() as Promise<{ user: { fullName: string; email: string; role: string }; university?: { name: string } }> : null)
      .then((result) => {
        if (!result) return;
        setName(result.user.fullName);
        setEmail(result.user.email);
        setRole(result.user.role);
        setUniversity(result.university?.name ?? "");
      })
      .catch(() => setMessage("Unable to load your account details."));
  }, []);

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
        window.localStorage.setItem("tronsabak-profile-photo", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = () => {
    setPhoto(null);
    window.localStorage.removeItem("tronsabak-profile-photo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Profile details saved locally.");
  };

  const changePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Complete all password fields first.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed in this local prototype.");
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17233d]">
      {role === "admin" && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Administrator profile{university ? ` · ${university}` : ""}</div>}
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-5xl items-center justify-between"><button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ChevronLeft size={17} /> Back to dashboard</button><button type="button" onClick={() => { window.localStorage.removeItem("tronsabak-role"); router.push("/login"); }} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400"><LogOut size={14} /> Sign out</button></div></header>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Student account</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Profile &amp; settings</h1><p className="mt-2 text-sm text-slate-500">Manage your personal information and account preferences.</p></div>{message && <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><Check size={16} /> {message}</div>}
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-xl border border-white bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-800">Profile photo</h2><div className="mt-6 flex flex-col items-center text-center"><div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-cyan-100 text-cyan-700 ring-4 ring-cyan-50">{photo ? <img src={photo} alt="Student profile" className="h-full w-full object-cover" /> : <UserRound size={54} strokeWidth={1.4} />}<span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-cyan-600 text-white"><Camera size={15} /></span></div><p className="mt-4 text-sm font-semibold text-slate-700">{name}</p><p className="mt-1 text-xs text-slate-400">AIU-24-0107</p><div className="mt-5 flex gap-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-700"><Camera size={14} /> {photo ? "Change photo" : "Set photo"}<input ref={fileInputRef} type="file" accept="image/*" onChange={selectPhoto} className="sr-only" /></label>{photo && <button type="button" onClick={deletePhoto} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button>}</div></div></section>
          <section className="rounded-xl border border-white bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-800">Personal information</h2><form onSubmit={saveProfile} className="mt-5 space-y-4"><div><label htmlFor="full-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Full name</label><input id="full-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" /></div><div><label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Email address</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" /></div><button type="submit" className="flex items-center gap-2 rounded-lg bg-[#153b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#102f54]"><Save size={14} /> Save changes</button></form></section>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-white bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 font-semibold text-slate-800"><LockKeyhole size={18} className="text-cyan-600" /> Change password</h2><form onSubmit={changePassword} className="mt-5 space-y-4"><input aria-label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500" /><input aria-label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500" /><input aria-label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500" /><button type="submit" className="rounded-lg border border-cyan-600 px-4 py-2.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50">Update password</button></form></section><section className="rounded-xl border border-white bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 font-semibold text-slate-800"><Bell size={18} className="text-cyan-600" /> Preferences</h2><label className="mt-5 flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-4"><span><span className="block text-sm font-semibold text-slate-700">Course notifications</span><span className="mt-1 block text-xs text-slate-400">Deadlines, grades, and announcements</span></span><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} className="h-5 w-5 accent-cyan-600" /></label></section></div>
        <div className="mt-8 flex justify-end border-t border-slate-200 pt-6"><button type="button" onClick={() => { window.localStorage.removeItem("tronsabak-role"); router.push("/login"); }} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"><LogOut size={16} /> Sign out of TronSabak</button></div>
      </div>
    </main>
  );
}

