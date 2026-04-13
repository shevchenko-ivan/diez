interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
        {children}
      </div>
    </div>
  );
}
