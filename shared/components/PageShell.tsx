import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: "2xl" | "4xl" | "5xl" | "6xl";
  footer?: boolean;
}

export function PageShell({ children, maxWidth = "6xl", footer = true }: PageShellProps) {
  const maxWidthClass =
    maxWidth === "2xl" ? "max-w-2xl" :
    maxWidth === "4xl" ? "max-w-4xl" :
    maxWidth === "5xl" ? "max-w-5xl" : "max-w-6xl";

  return (
    <div
      className={footer ? "min-h-screen min-h-dvh flex flex-col" : "min-h-screen min-h-dvh"}
      style={{ background: "var(--bg)" }}
    >
      <Navbar />
      <main id="main-content" tabIndex={-1} className={`${footer ? "flex-1" : "pb-20"} ${maxWidthClass} mx-auto w-full px-4 md:px-6 pt-2 md:pt-4 pb-8`}>
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}
