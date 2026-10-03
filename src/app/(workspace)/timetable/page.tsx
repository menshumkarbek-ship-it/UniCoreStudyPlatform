"use client";

import { useEffect, useState } from "react";
import TimetableGrid from "@/components/TimetableGrid";
import { useSessionUser } from "@/components/workspace/session-context";
import { useApi } from "@/lib/client";
import { isoWeekday } from "@/lib/time";

type Entry = { id: number; weekday: number; startsAt: string; endsAt: string; room: string; code: string; title: string; groupName: string; professorName: string };

// A weekly grid (days across, periods down); today's column is highlighted.
export default function TimetablePage() {
  const professor = useSessionUser().role === "professor";
  const { data, loading } = useApi<{ entries: Entry[] }>("/api/timetable");
  const [today, setToday] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(isoWeekday(new Date())), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const entries = data?.entries ?? [];

  return (
    <>
      {/* The grid is always drawn, with every hour of every day, even before any class is scheduled. */}
      {!loading && <TimetableGrid entries={entries} view={professor ? "professor" : "student"} today={today} />}
    </>
  );
}
