export function SectionCard({
  step,
  title,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      {/* Section header */}
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-900/80 rounded-t-2xl">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500/15 border border-orange-500/25 shrink-0">
          <span className="font-display text-xs sm:text-sm font-bold text-orange-400">{step}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-orange-400 shrink-0" />
          <h2 className="font-display text-sm sm:text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        {label}
        {required
          ? <span className="text-orange-400 normal-case font-normal tracking-normal">*</span>
          : <span className="text-slate-600 text-[10px] font-normal normal-case tracking-normal">optional</span>
        }
      </label>
      {children}
    </div>
  );
}
