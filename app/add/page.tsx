import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Додати пісню — Diez",
};

export default function AddSongPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    // In a real app we'd save to DB here
    console.log("Saving song...", Object.fromEntries(formData));
    redirect("/songs");
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/songs" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Каталог
        </Link>

        <div className="te-surface p-10 md:p-14" style={{ borderRadius: "2rem" }}>
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-3 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Додати пісню</h1>
            <p className="text-sm font-medium tracking-wide uppercase opacity-60" style={{ color: "var(--text-muted)" }}>Поділіться акордами з іншими</p>
          </div>

          <form action={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Назва пісні</label>
                <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
                  <input 
                    name="title" 
                    required 
                    placeholder="Напр. Без бою" 
                    className="w-full bg-transparent outline-none text-sm font-medium" 
                    style={{ color: "var(--text)" }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Виконавець</label>
                <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
                  <input 
                    name="artist" 
                    required 
                    placeholder="Напр. Океан Ельзи" 
                    className="w-full bg-transparent outline-none text-sm font-medium" 
                    style={{ color: "var(--text)" }} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Складність</label>
              <div className="flex gap-4 flex-wrap">
                <label className="te-key flex-1 flex items-center justify-center gap-2 px-6 py-4 cursor-pointer min-w-[120px]">
                  <input type="radio" name="difficulty" value="easy" defaultChecked className="accent-orange-500" />
                  <span className="text-sm font-bold">Легка</span>
                </label>
                <label className="te-key flex-1 flex items-center justify-center gap-2 px-6 py-4 cursor-pointer min-w-[120px]">
                  <input type="radio" name="difficulty" value="medium" className="accent-orange-500" />
                  <span className="text-sm font-bold">Середня</span>
                </label>
                <label className="te-key flex-1 flex items-center justify-center gap-2 px-6 py-4 cursor-pointer min-w-[120px]">
                  <input type="radio" name="difficulty" value="hard" className="accent-orange-500" />
                  <span className="text-sm font-bold">Складна</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase ml-1 flex items-baseline justify-between" style={{ color: "var(--text-muted)" }}>
                <span>Текст і акорди</span>
                <span className="hidden sm:inline text-[10px] opacity-70 normal-case tracking-normal">Ставте акорди в квадратних дужках, напр. [Am]</span>
              </label>
              <div className="te-inset p-4" style={{ borderRadius: "1.5rem" }}>
                <textarea 
                  name="lyrics_with_chords" 
                  required 
                  rows={12}
                  placeholder={`[Am]Вставай, мила [C]моя, вставай\n[G]Більшого вимагай...`}
                  className="w-full bg-transparent outline-none text-sm font-medium min-h-[200px] resize-y font-mono leading-relaxed" 
                  style={{ color: "var(--text)" }} 
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" className="te-btn-orange px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
                <Save size={16} /> ЗБЕРЕГТИ ПІСНЮ
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
