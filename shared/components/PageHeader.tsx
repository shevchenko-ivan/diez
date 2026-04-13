interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className={`mb-10 ${action ? "flex items-center justify-between gap-4" : ""}`}>
      <div>
        <h1
          className="text-4xl font-bold mb-2 uppercase tracking-tighter"
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
