interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  /** id of the input inside `children` — wires up <label htmlFor> for screen readers. */
  htmlFor?: string;
}

export function FormField({ label, children, htmlFor }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-xs font-bold tracking-widest uppercase"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
        {children}
      </div>
    </div>
  );
}
