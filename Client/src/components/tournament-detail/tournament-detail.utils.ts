// Formatting helpers + status metadata for the tournament detail page.

export function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree || fee === 0) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}

export function formatPrize(pesewas: number, currency: string) {
  return `${currency} ${(pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  open: { label: "Open", dot: "bg-emerald-400", text: "text-emerald-300" },
  published: { label: "Published", dot: "bg-cyan-400", text: "text-cyan-300" },
  started: {
    label: "Live",
    dot: "bg-orange-400 animate-pulse",
    text: "text-orange-300",
  },
  ongoing: {
    label: "Live",
    dot: "bg-orange-400 animate-pulse",
    text: "text-orange-300",
  },
  locked: { label: "Locked", dot: "bg-amber-400", text: "text-amber-300" },
  awaiting_deposit: {
    label: "Awaiting Deposit",
    dot: "bg-amber-400",
    text: "text-amber-300",
  },
  completed: {
    label: "Completed",
    dot: "bg-slate-400",
    text: "text-slate-400",
  },
  cancelled: { label: "Cancelled", dot: "bg-red-400", text: "text-red-400" },
  draft: { label: "Draft", dot: "bg-slate-500", text: "text-slate-300" },
};

export const REG_STATUS_META: Record<string, { label: string; cls: string }> = {
  registered: {
    label: "Registered",
    cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  },
  checked_in: {
    label: "Checked In",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  },
  pending_payment: {
    label: "Pmt. Pending",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
  waitlist: {
    label: "Waitlisted",
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  },
  withdrawn: {
    label: "Withdrawn",
    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-slate-700/50 text-slate-400 border-slate-600/25",
  },
  disqualified: {
    label: "Disqualified",
    cls: "bg-red-500/15 text-red-300 border-red-500/25",
  },
};

export const ACTIVE_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

export const COLLAPSE_LINES = 3;
