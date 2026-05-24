import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[700px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[200px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">Notifications</h1>
            <p className="text-base text-slate-400 mt-3">Stay up to date with your tournament activity.</p>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 py-24 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-8 h-8 text-slate-600" />
          </div>
          <p className="font-display text-2xl font-semibold text-slate-300">Coming soon</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Notifications aren't available yet — we're working on it.
          </p>
        </div>
      </div>
    </div>
  );
}
