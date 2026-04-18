/**
 * Compact card with an uppercase label and arbitrary contents below.
 * Used for sidebar adjusters on the song page (Транспонування, Каподастр, Розмір, Прокрутка)
 * and demoed in the UI kit.
 */
export function ControlBlock({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`te-surface p-3 rounded-2xl ${className}`.trim()}>
      <p className="te-label mb-3">{label}</p>
      {children}
    </div>
  );
}
