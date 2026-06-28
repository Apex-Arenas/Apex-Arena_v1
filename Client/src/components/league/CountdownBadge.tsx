import { Timer } from 'lucide-react';

export function CountdownBadge({ seconds, label }: { seconds: number | null; label: string }) {
  if (seconds === null) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 60;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
      isUrgent
        ? 'bg-red-500/10 border-red-500/30 text-red-300'
        : 'bg-slate-800/60 border-slate-700 text-slate-300'
    }`}>
      <Timer className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400' : 'text-orange-400'}`} />
      {label} {mins}:{String(secs).padStart(2, '0')}
    </div>
  );
}
