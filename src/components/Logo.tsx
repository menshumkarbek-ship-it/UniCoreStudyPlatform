/** Wordmark: the platform name with an optional caption underneath. */
export default function Logo({ caption }: { caption?: string | null }) {
  return (
    <span className="min-w-0 leading-tight">
      <span className="block text-[20px] font-bold tracking-[-0.01em] text-ink">UniCore</span>
      {caption && <span className="block truncate text-[11px] text-muted">{caption}</span>}
    </span>
  );
}
