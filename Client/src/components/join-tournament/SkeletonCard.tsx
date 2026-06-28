export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden animate-pulse">
      <div className="aspect-4/3 bg-slate-800" />
      <div className="px-4 pt-3 pb-4 space-y-3">
        <div className="h-3 bg-slate-800 rounded w-3/4" />
        <div className="h-2.5 bg-slate-800 rounded w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-2 bg-slate-800 rounded" />
          <div className="h-2 bg-slate-800 rounded" />
          <div className="h-2 bg-slate-800 rounded" />
          <div className="h-2 bg-slate-800 rounded" />
        </div>
        <div className="h-9 bg-slate-800 rounded-xl mt-1" />
      </div>
    </div>
  );
}
