import { Navbar } from "@/shared/components/Navbar";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata = {
  title: "Новий пароль — Diez",
};

export default function Page() {
  return (
    <div className="min-h-screen min-h-dvh" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
