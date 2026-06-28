import { useState } from 'react';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export function ProofGallery({ shots }: { shots: { label: string; url: string }[] }) {
  const [active, setActive] = useState(0);
  if (shots.length === 0) return null;

  const cur = shots[Math.min(active, shots.length - 1)];

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Proof Screenshot
          </span>
          {shots.length > 1 && (
            <span className="text-[10px] text-slate-600 ml-1">
              {active + 1} / {shots.length}
            </span>
          )}
        </div>
        {shots.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActive(i => Math.max(0, i - 1))}
              disabled={active === 0}
              className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActive(i => Math.min(shots.length - 1, i + 1))}
              disabled={active === shots.length - 1}
              className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {shots.length > 1 && (
        <div className="flex gap-1 px-4 py-2 border-b border-slate-700/30 bg-slate-800/20 overflow-x-auto">
          {shots.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap transition-colors shrink-0 ${
                i === active
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <a href={cur.url} target="_blank" rel="noopener noreferrer" className="block p-3">
        <img
          src={cur.url}
          alt={cur.label}
          className="w-full rounded-lg object-contain max-h-60 bg-slate-950"
        />
      </a>
    </div>
  );
}
