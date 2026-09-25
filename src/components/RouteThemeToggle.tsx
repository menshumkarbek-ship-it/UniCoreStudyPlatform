"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function RouteThemeToggle() {
  const pathname = usePathname();
  if (pathname !== "/" && pathname !== "/login" && !pathname.startsWith("/admin")) return null;

  if (pathname === "/") return null;

  return <div className="fixed right-5 top-5 z-50"><ThemeToggle /></div>;
}
