import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[700px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[200px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-slate-700/60 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="font-display text-xl sm:text-3xl font-bold text-white leading-tight">Notifications</h1>
              <p className="text-sm text-slate-400 mt-1">Stay up to date with your tournament activity.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-20 px-6 text-center">
          <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="font-display text-xl font-semibold text-slate-400">Coming soon</p>
          <p className="text-sm text-slate-600 mt-2">
            Notifications aren't available yet — we're working on it.
          </p>
        </div>
      </div>
    </div>
  );
}
