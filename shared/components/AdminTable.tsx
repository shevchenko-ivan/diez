interface AdminTableProps {
  headers: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function AdminTable({
  headers,
  children,
  isEmpty = false,
  emptyMessage = "Нічого немає.",
}: AdminTableProps) {
  return (
    <div className="te-surface overflow-hidden" style={{ borderRadius: "1.5rem" }}>
      {isEmpty ? (
        <div className="p-12 text-center opacity-50" style={{ color: "var(--text-muted)" }}>
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="border-b"
              style={{ borderColor: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}
            >
              <tr>{headers}</tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "rgba(0,0,0,0.05)", color: "var(--text)" }}
            >
              {children}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminTh({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 font-bold tracking-wider text-xs uppercase ${className}`}>
      {children}
    </th>
  );
}

export function AdminTr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">{children}</tr>
  );
}
