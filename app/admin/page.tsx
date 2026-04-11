import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft, Check, X, Edit, Trash2, Users, Music, Activity } from "lucide-react";
import Link from "next/link";
import { getAllSongs } from "@/features/song/services/songs";

export const metadata = {
  title: "Адмін-панель — Diez",
};

export default async function AdminPage() {
  const songs = await getAllSongs();
  // Mock some pending songs
  const pendingSongs = [
    { title: "Там, де ми є", artist: "Антитіла", user: "Іван Іванов", date: "Сьогодні" },
    { title: "Зорі", artist: "Kalush", user: "Gitarist99", date: "Вчора" },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/profile" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Мій профіль
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Адмін-панель</h1>
          <p className="text-sm font-medium tracking-wide border-l-2 pl-3 opacity-60" style={{ color: "var(--text-muted)", borderColor: "var(--orange)" }}>Керування контентом та користувачами платформи</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="te-surface p-6 flex flex-col gap-2" style={{ borderRadius: "1.5rem" }}>
            <div className="flex items-center gap-3 mb-2" style={{ color: "var(--orange)" }}>
              <Music size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">Пісень у базі</span>
            </div>
            <span className="text-4xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>{songs.length}</span>
          </div>
          
          <div className="te-surface p-6 flex flex-col gap-2" style={{ borderRadius: "1.5rem" }}>
            <div className="flex items-center gap-3 mb-2 text-blue-500">
              <Users size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">Користувачів</span>
            </div>
            <span className="text-4xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>2,405</span>
          </div>

          <div className="te-surface p-6 flex flex-col gap-2 relative overflow-hidden" style={{ borderRadius: "1.5rem" }}>
             <div className="absolute -right-4 -top-4 opacity-10">
               <Activity size={120} />
             </div>
            <div className="flex items-center gap-3 mb-2 text-green-500">
              <Activity size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">Очікують на перевірку</span>
            </div>
            <span className="text-4xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>{pendingSongs.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pending Approvals */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>Очікують затвердження</h3>
            
            {pendingSongs.map((song, i) => (
              <div key={i} className="te-surface p-5 flex flex-col gap-4" style={{ borderRadius: "1.25rem" }}>
                <div>
                  <h4 className="font-bold text-lg leading-tight mb-1" style={{ color: "var(--text)" }}>{song.title}</h4>
                  <p className="text-sm font-medium opacity-70 mb-2" style={{ color: "var(--text-muted)" }}>{song.artist}</p>
                  <div className="flex items-center justify-between text-xs font-medium opacity-50" style={{ color: "var(--text-muted)" }}>
                    <span>Від: {song.user}</span>
                    <span>{song.date}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <button className="flex-1 te-key h-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors">
                    <Check size={18} />
                  </button>
                  <button className="flex-1 te-key h-10 flex items-center justify-center rounded-xl hover:bg-red-500/10 text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Catalog Management */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>Усі пісні (Останні додані)</h3>
            
            <div className="te-surface overflow-hidden" style={{ borderRadius: "1.5rem" }}>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[rgba(0,0,0,0.02)] border-b" style={{ borderColor: 'rgba(0,0,0,0.05)', color: "var(--text-muted)" }}>
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Назва</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Виконавець</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Перегляди</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.05)', color: "var(--text)" }}>
                  {songs.slice(0, 5).map((song) => (
                    <tr key={song.slug} className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                      <td className="px-6 py-4 font-bold">{song.title}</td>
                      <td className="px-6 py-4 font-medium opacity-80">{song.artist}</td>
                      <td className="px-6 py-4 font-mono text-xs">{song.views}</td>
                      <td className="px-6 py-4 flex items-center justify-end gap-2">
                        <button className="p-2 te-key rounded-lg opacity-60 hover:opacity-100"><Edit size={16}/></button>
                        <button className="p-2 te-key rounded-lg opacity-60 hover:opacity-100 hover:text-red-500"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t flex justify-center" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                <button className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--orange)" }}>Завантажити ще</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
