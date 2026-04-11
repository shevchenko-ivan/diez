import { Navbar } from "@/shared/components/Navbar";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Вхід — Diez",
};

export default function Page() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
