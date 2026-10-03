"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth";

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** The signed-in user. Only available inside the workspace and admin layouts. */
export function useSessionUser() {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useSessionUser must be used inside a signed-in layout.");
  return user;
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  // A full page load (not router.push) so no signed-in data survives in client caches.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}
