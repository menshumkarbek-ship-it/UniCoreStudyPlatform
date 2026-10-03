import { redirect } from "next/navigation";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { getSession } from "@/lib/auth";

// Every student and professor page shares this shell. The session is read once on the server,
// so pages no longer fetch /api/auth/session themselves.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}
