interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className={`mb-10 ${action ? "flex items-center justify-between gap-4" : ""}`}>
      <div>
        {/* The heading font (e-Ukraine Head) declares an outsized ascent —
            2em of content box against Tailwind's 1.11 line-height — so the
            baseline lands below the box and Cyrillic descenders (Д, Ц, Щ)
            spill ~10px past it at md. `mb-2` was less than that spill, which
            is why the subtitle sat on top of the glyphs. The margin has to
            clear the overflow before it can read as a gap, and the overflow
            scales with font size, hence the responsive step. */}
        <h1
          className="text-2xl md:text-4xl font-bold mb-3 md:mb-5 uppercase tracking-tighter"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm font-medium tracking-wide border-l-2 pl-3 opacity-60"
            style={{ color: "var(--text-muted)", borderColor: "var(--orange)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
