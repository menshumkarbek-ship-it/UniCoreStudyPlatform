"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ProfessorSidebar from "@/components/ProfessorSidebar";
import StudentSidebar from "@/components/StudentSidebar";
import ProfessorTopNavigation from "@/components/ProfessorTopNavigation";
import StudentTopNavigation from "@/components/StudentTopNavigation";
import PlatformFooter from "@/components/PlatformFooter";

type Props = { children: React.ReactNode };
type UserRole = "student" | "professor";

export default function ProfessorNavigation({ children }: Props) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: { role?: string } };
      if (result.user?.role === "professor" || result.user?.role === "student") setRole(result.user.role);
    });
  }, [pathname]);

  const workspaceRoutes = ["/dashboard", "/subjects", "/homework", "/timetable", "/exams", "/grades", "/attendance", "/bulletin"];
  const showProfessorShell = role === "professor" && workspaceRoutes.includes(pathname);
  const showStudentShell = role === "student" && workspaceRoutes.includes(pathname);
  const showPlatformFooter = (role === "student" || role === "professor") && pathname !== "/" && pathname !== "/login" && !pathname.startsWith("/admin");
  return <>{showProfessorShell && <ProfessorTopNavigation />}{showStudentShell && <StudentTopNavigation />}{showProfessorShell ? <div className="professor-shell"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start"><ProfessorSidebar /><div className="professor-content">{children}</div></div></div><PlatformFooter /></div> : showStudentShell ? <div className="student-shell"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start"><StudentSidebar /><div className="student-content">{children}</div></div></div><PlatformFooter /></div> : <>{children}{showPlatformFooter && <PlatformFooter />}</>}</>;
}
