import { BarChart3, BookOpen, CalendarCheck, CalendarDays, ClipboardList, LayoutDashboard, Megaphone, NotebookPen, type LucideIcon } from "lucide-react";
import { useDictionary } from "@/i18n/locale-provider";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The workspace sections, in order, labelled for a student or a professor. */
export function useNavItems(professor: boolean): NavItem[] {
  const dict = useDictionary();
  return [
    { href: "/dashboard", label: dict.common.nav.dashboard, icon: LayoutDashboard },
    { href: "/subjects", label: professor ? dict.wk.navMyTeaching : dict.common.nav.subjects, icon: BookOpen },
    { href: "/timetable", label: dict.common.nav.timetable, icon: CalendarDays },
    { href: "/homework", label: dict.common.nav.homework, icon: ClipboardList },
    { href: "/exams", label: dict.wk.navExams, icon: NotebookPen },
    { href: "/grades", label: professor ? dict.wk.navGradebook : dict.wk.navGrades, icon: BarChart3 },
    { href: "/attendance", label: dict.wk.navAttendance, icon: CalendarCheck },
    { href: "/bulletin", label: dict.wk.navBulletin, icon: Megaphone },
  ];
}
