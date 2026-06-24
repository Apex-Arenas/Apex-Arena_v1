export default function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-pulse space-y-6">
      <div className="h-5 w-32 bg-slate-800 rounded" />
      <div className="rounded-2xl overflow-hidden border border-slate-800 h-72 bg-slate-800" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 space-y-2"
          >
            <div className="h-3 w-16 bg-slate-800 rounded" />
            <div className="h-6 w-24 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3"
            >
              <div className="h-4 w-40 bg-slate-800 rounded" />
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-4/5 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 h-48" />
      </div>
    </div>
  );
}
