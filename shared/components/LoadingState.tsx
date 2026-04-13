interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Завантаження..." }: LoadingStateProps) {
  return (
    <div
      className="p-12 text-center font-medium opacity-60"
      style={{ color: "var(--text-muted)" }}
    >
      {message}
    </div>
  );
}
