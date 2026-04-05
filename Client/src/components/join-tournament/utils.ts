export const STATUS_COLORS: Record<string, string> = {
  awaiting_deposit: "bg-amber-500/20 text-amber-300",
  open: "bg-green-500/20 text-green-300",
  published: "bg-cyan-500/20 text-cyan-300",
  locked: "bg-amber-500/20 text-amber-300",
  started: "bg-blue-500/20 text-blue-300",
  ongoing: "bg-blue-500/20 text-blue-300",
  completed: "bg-slate-500/20 text-slate-400",
  cancelled: "bg-red-500/20 text-red-400",
  draft: "bg-slate-600/20 text-slate-500",
};

export const REGISTRATION_STATUS_COLORS: Record<string, string> = {
  registered: "bg-cyan-500/20 text-cyan-300",
  checked_in: "bg-green-500/20 text-green-300",
  pending_payment: "bg-amber-500/20 text-amber-300",
  waitlist: "bg-purple-500/20 text-purple-300",
  withdrawn: "bg-slate-600/20 text-slate-400",
  cancelled: "bg-slate-600/20 text-slate-400",
  disqualified: "bg-red-500/20 text-red-300",
};

const ACTIVE_REGISTRATION_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

const WITHDRAWABLE_REGISTRATION_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_payment",
  "waitlist",
]);

export function normalizeRegistrationStatus(status?: string) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

export function isActiveRegistrationStatus(status?: string) {
  return ACTIVE_REGISTRATION_STATUSES.has(normalizeRegistrationStatus(status));
}

export function canWithdrawRegistration(status?: string) {
  return WITHDRAWABLE_REGISTRATION_STATUSES.has(
    normalizeRegistrationStatus(status),
  );
}

export function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}
