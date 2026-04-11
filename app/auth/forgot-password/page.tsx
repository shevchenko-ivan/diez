import { Navbar } from "@/shared/components/Navbar";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = {
  title: "Відновлення паролю — Diez",
};

export default function Page() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
