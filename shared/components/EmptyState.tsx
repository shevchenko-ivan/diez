interface EmptyStateProps {
  message: string;
  variant?: "surface" | "inset";
  action?: React.ReactNode;
}

export function EmptyState({ message, variant = "surface", action }: EmptyStateProps) {
  if (variant === "inset") {
    return (
      <div
        className="te-inset rounded-2xl p-8 text-center opacity-60"
        style={{ color: "var(--text-muted)" }}
      >
        {message}
        {action && <span className="ml-1">{action}</span>}
      </div>
    );
  }

  return (
    <div
      className="te-surface p-12 text-center"
      style={{ borderRadius: "1.5rem", color: "var(--text-muted)" }}
    >
      <p className="font-medium opacity-60">
        {message}
        {action && <span className="ml-1">{action}</span>}
      </p>
    </div>
  );
}
