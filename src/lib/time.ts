// Shared by server and client. Weekdays use ISO numbering: 1 = Monday ... 7 = Sunday,
// the same numbering the database stores.

export const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

const intlTags = { en: "en-GB", ru: "ru-RU", ky: "ky-KG" } as const;

/**
 * The Intl locale for the language the user picked in the language switcher (the NEXT_LOCALE cookie), so dates
 * match the interface language instead of the browser's. Client-side only: dates render after data loads in the
 * browser; on the server this returns undefined.
 */
export function activeIntlLocale() {
  if (typeof document === "undefined") return undefined;
  const picked = document.cookie.match(/(?:^|; )NEXT_LOCALE=(en|ru|ky)/)?.[1] as keyof typeof intlTags | undefined;
  return intlTags[picked ?? "en"];
}

/** Weekday name (1 = Monday ... 7 = Sunday) in the interface language. */
export function weekdayName(weekday: number) {
  // 1 January 2024 was a Monday.
  return new Date(2024, 0, weekday).toLocaleDateString(activeIntlLocale() ?? "en-GB", { weekday: "long" });
}

/** ISO weekday of a date in the viewer's local time. */
export function isoWeekday(date: Date) {
  return ((date.getDay() + 6) % 7) + 1;
}

/** "YYYY-MM-DD" for a date in the viewer's local time (toISOString would use UTC). */
export function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Value for <input type="datetime-local"> in the viewer's local time. */
export function localDateTimeInputValue(date: Date) {
  return `${localDateString(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Current date, time, and ISO weekday in a university's time zone, independent of the server's zone. */
export function clockIn(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1,
  };
}

/** ISO weekday of a "YYYY-MM-DD" calendar date. */
export function weekdayOfDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return isoWeekday(new Date(year, month - 1, day, 12));
}

/** Default class periods, used by the auto-scheduler and as the empty timetable's rows. */
export const bellSchedule = [
  { startsAt: "08:30", endsAt: "09:50" },
  { startsAt: "10:00", endsAt: "11:20" },
  { startsAt: "11:30", endsAt: "12:50" },
  { startsAt: "13:30", endsAt: "14:50" },
  { startsAt: "15:00", endsAt: "16:20" },
  { startsAt: "16:30", endsAt: "17:50" },
] as const;
