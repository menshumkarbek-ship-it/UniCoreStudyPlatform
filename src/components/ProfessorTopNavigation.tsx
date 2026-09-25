"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleUserRound, GraduationCap } from "lucide-react";
import MenuDropdown from "@/components/MenuDropdown";
import { useDictionary } from "@/i18n/locale-provider";

export default function ProfessorTopNavigation() {
  const dict = useDictionary();
  const [accountName, setAccountName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { fullName?: string; profilePhoto?: string | null } };
      setAccountName(result.user?.fullName ?? "");
      setProfilePhoto(result.user?.profilePhoto ?? null);
    });
  }, []);

  return <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white"><GraduationCap size={21} /></span><span className="text-lg font-bold text-[#15345b]">{dict.common.appName}</span></Link><div className="flex items-center gap-5"><nav className="hidden items-center gap-6 md:flex"><MenuDropdown /></nav>{accountName && <span className="hidden text-sm font-semibold text-cyan-700 sm:inline">{accountName}</span>}<Link href="/profile" aria-label={dict.dashboard.openProfessorProfile} className="profile-avatar-link flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-300 bg-cyan-50 text-cyan-700">{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : <CircleUserRound size={21} />}</Link></div></div></header>;
}
