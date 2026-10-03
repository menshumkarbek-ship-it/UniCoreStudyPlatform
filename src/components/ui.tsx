import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Shared building blocks. Style: ink type on white cards over a cool-gray canvas, weight/size for hierarchy,
// 8px corners, hairline borders, outlined violet actions (never filled), soft tints that tag status.

/** Small label with the violet dash that marks a section. */
export function Eyebrow({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
      <span aria-hidden className="h-0.5 w-4 bg-periwinkle" />
      {Icon && <Icon size={13} strokeWidth={1.75} />}
      {children}
    </p>
  );
}

export function PageHeader({ eyebrow, title, description, icon: Icon, actions }: { eyebrow?: string; title: string; description?: string; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        {Icon && <span aria-hidden className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent sm:flex"><Icon size={22} strokeWidth={1.75} /></span>}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 truncate text-[13px] font-medium text-accent">{eyebrow}</p>}
          <h1 className="text-[26px] font-bold leading-[1.2] text-ink sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-[1.5] text-muted sm:text-base">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, icon: Icon, actions, children, className = "" }: { title?: string; description?: string; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="flex items-center gap-2 text-lg font-medium text-ink">{Icon && <Icon size={17} strokeWidth={1.75} className="text-muted" />}{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <Icon className="mx-auto text-faint" size={26} strokeWidth={1.5} />
      <p className="mt-3 text-base font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
    </div>
  );
}

// Pastel fills tag meaning; text stays black on every pastel so it reads in both themes.
const badgeTones = {
  neutral: "border border-line text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-mint text-obsidian",
  warning: "bg-peach text-obsidian",
  danger: "bg-blush text-[#8a1239]",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>{children}</span>;
}

export function Alert({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm font-medium text-obsidian ${tone === "success" ? "bg-mint" : "bg-blush"}`}>{children}</div>;
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-[13px] font-medium text-muted ${className}`}>
      {label}
      <div className="mt-2 font-sans text-sm font-normal normal-case tracking-normal">{children}</div>
      {hint && <span className="mt-1.5 block font-sans text-xs font-normal normal-case tracking-normal text-faint">{hint}</span>}
    </label>
  );
}

const focus = "outline-none transition focus:border-aubergine focus:ring-1 focus:ring-aubergine";
export const inputBase = `h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink ${focus} disabled:opacity-60`;
export const inputClass = `${inputBase} w-full`;
export const textareaClass = `w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink ${focus}`;
const buttonBase = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-base font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButton = `${buttonBase} border-[1.5px] border-aubergine bg-transparent text-aubergine hover:shadow-sm`;
export const secondaryButton = `${buttonBase} border border-line bg-transparent text-ink hover:shadow-sm`;
export const dangerButton = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-[#b4234f] transition hover:border-[#b4234f] dark:text-[#ff9fbd] dark:hover:border-[#ff9fbd] disabled:opacity-50";
export const linkButton = "inline-flex items-center gap-1 text-sm font-medium text-aubergine underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-aubergine";
/** A create action that fills the width of its list, styled like the list's rows instead of as an outlined button. */
export const createTile = "flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-muted p-4 text-sm font-medium text-accent transition hover:border-accent";

const statFills = { sky: "bg-sky", blush: "bg-blush", peach: "bg-peach", mint: "bg-mint" };

/** Metric tile: the pastel fill is the card; each fill tags one kind of metric. */
export function Stat({ label, value, detail, icon: Icon, tone = "sky" }: { label: string; value: ReactNode; detail?: string; icon: LucideIcon; tone?: keyof typeof statFills }) {
  return (
    // Side by side, each tile shares the row's label/value/detail tracks (subgrid), so every detail starts at the same
    // height even when one value wraps, and a long detail simply wraps instead of being cut off.
    <div className="rounded-lg border border-line bg-surface p-3 sm:row-span-3 sm:grid sm:grid-rows-subgrid sm:p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-muted"><span className={`flex h-6 w-6 items-center justify-center rounded-lg text-obsidian ${statFills[tone]}`}><Icon size={14} strokeWidth={1.75} /></span>{label}</p>
      <p className="mt-2 break-words text-[28px] font-bold leading-none text-ink">{value}</p>
      {detail && <p className="pt-1 text-sm text-muted">{detail}</p>}
    </div>
  );
}
