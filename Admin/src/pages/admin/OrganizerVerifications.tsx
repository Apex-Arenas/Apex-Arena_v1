import { useCallback, useEffect, useRef, useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  ExternalLink,
  Loader2,
  User,
  Building2,
  FileText,
  BadgeCheck,
} from "lucide-react";
import {
  adminService,
  type OrganizerVerificationRequest,
} from "../../services/admin.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: Clock,
  },
  under_review: {
    label: "Under Review",
    cls: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    icon: RefreshCw,
  },
  approved: {
    label: "Approved",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-500/15 text-red-300 border-red-500/30",
    icon: XCircle,
  },
  needs_resubmission: {
    label: "Needs Resubmission",
    cls: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    icon: AlertCircle,
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Info Row helper ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  request,
  onClose,
  onReviewed,
}: {
  request: OrganizerVerificationRequest;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [action, setAction] = useState<
    "approve" | "reject" | "needs_resubmission" | ""
  >("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startingReview, setStartingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsStart = request.status === "pending";
  const isFinalized =
    request.status === "approved" || request.status === "rejected";

  const handleStartReview = async () => {
    setStartingReview(true);
    try {
      await adminService.startVerificationReview(request.id);
    } catch {
      /* non-critical */
    } finally {
      setStartingReview(false);
    }
  };

  const handleSubmit = async () => {
    if (!action) {
      setError("Please select a decision.");
      return;
    }
    if (
      (action === "reject" || action === "needs_resubmission") &&
      !reason.trim()
    ) {
      setError("A reason is required for this decision.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await adminService.reviewVerification(
        request.id,
        action,
        notes.trim() || undefined,
        reason.trim() ? [reason.trim()] : undefined,
      );
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none";

  const avatar = request.avatarUrl ? (
    <img
      src={request.avatarUrl}
      alt=""
      className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-500/20 to-cyan-500/20 border border-slate-700 flex items-center justify-center text-slate-100 shrink-0">
      <User className="w-4 h-4" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Review Application
              </h2>
              <p className="text-xs text-slate-400">{request.businessName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Applicant */}
          <section className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-amber-400" /> Applicant
            </h3>
            <div className="flex items-center gap-3">
              {avatar}
              <div>
                <p className="text-sm font-semibold text-white">
                  {request.displayName}
                </p>
                <p className="text-xs text-slate-400">
                  @{request.username} · {request.email}
                </p>
              </div>
            </div>
          </section>

          {/* Business Info */}
          <section className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> Business
              Information
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow label="Business Name" value={request.businessName} />
              <InfoRow label="Business Type" value={request.businessType} />
              <InfoRow
                label="Registration #"
                value={request.registrationNumber}
              />
              <InfoRow label="Contact Person" value={request.contactPerson} />
              <InfoRow label="Address" value={request.address} />
              <InfoRow label="Submitted" value={fmtDate(request.submittedAt)} />
            </div>
          </section>

          {/* Documents */}
          <section className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Documents
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "ID Front", url: request.documents.idFront },
                { label: "ID Back", url: request.documents.idBack },
                {
                  label: "Selfie with ID",
                  url: request.documents.selfieWithId,
                },
                {
                  label: "Business Registration",
                  url: request.documents.businessRegistration,
                },
              ].map(({ label, url }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">Not provided</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Finalized state */}
          {isFinalized && (
            <div
              className={`rounded-xl border p-4 text-sm ${STATUS_CONFIG[request.status as StatusKey].cls}`}
            >
              <p className="font-semibold">
                This application has been {request.status}.
              </p>
              {request.reviewedAt && (
                <p className="text-xs opacity-70 mt-1">
                  Reviewed: {fmtDate(request.reviewedAt)}
                </p>
              )}
              {request.rejectionReasons?.map((r, i) => (
                <p key={i} className="mt-1.5 text-xs opacity-80">
                  • {r}
                </p>
              ))}
            </div>
          )}

          {/* Decision panel */}
          {!isFinalized && (
            <div className="space-y-4">
              {needsStart && (
                <button
                  onClick={handleStartReview}
                  disabled={startingReview}
                  className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {startingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Mark as Under Review
                </button>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Decision
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        value: "approve",
                        label: "Approve",
                        cls: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20",
                      },
                      {
                        value: "reject",
                        label: "Reject",
                        cls: "border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20",
                      },
                      {
                        value: "needs_resubmission",
                        label: "Request Changes",
                        cls: "border-orange-500/40 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAction(opt.value)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        action === opt.value
                          ? opt.cls +
                            " ring-1 ring-offset-1 ring-offset-slate-900"
                          : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(action === "reject" || action === "needs_resubmission") && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain what needs to be addressed…"
                    rows={3}
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Internal Notes{" "}
                  <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes visible only to admins…"
                  rows={2}
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !action}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Submitting…" : "Submit Decision"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status filter pills ──────────────────────────────────────────────────────

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_resubmission", label: "Needs Resubmission" },
];

const STATUS_BORDER: Record<string, string> = {
  pending: "border-l-amber-500",
  under_review: "border-l-blue-500",
  approved: "border-l-emerald-500",
  rejected: "border-l-red-500",
  needs_resubmission: "border-l-orange-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const OrganizerVerifications = () => {
  const [requests, setRequests] = useState<OrganizerVerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<OrganizerVerificationRequest | null>(
    null,
  );
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const hasFetched = useRef(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (filter: string) => {
    setIsLoading(true);
    try {
      setRequests(await adminService.fetchVerifications(filter || undefined));
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to load verifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void load(statusFilter);
  }, [load, statusFilter]);

  const handleFilterChange = (val: string) => {
    setStatusFilter(val);
    void load(val);
  };

  const handleReviewed = () => {
    setSelected(null);
    showToast("success", "Decision submitted successfully.");
    void load(statusFilter);
  };

  const pendingCount = requests.filter(
    (r) => r.status === "pending" || r.status === "under_review",
  ).length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full-bleed Hero */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BadgeCheck className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-white">
                    Organizer Verifications
                  </h1>
                  {pendingCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  Review and approve organizer applications.
                </p>
              </div>
            </div>
            <button
              onClick={() => void load(statusFilter)}
              disabled={isLoading}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                statusFilter === value
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-40 bg-slate-800 rounded" />
                    <div className="h-2.5 w-64 bg-slate-800/70 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">
              No Requests
            </h2>
            <p className="text-sm text-slate-500">
              No organizer verification requests match this filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((req) => {
              const conf =
                STATUS_CONFIG[req.status as StatusKey] ?? STATUS_CONFIG.pending;
              const StatusIcon = conf.icon;
              const borderColor =
                STATUS_BORDER[req.status] ?? "border-l-slate-600";
              const avatar = req.avatarUrl ? (
                <img
                  src={req.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-500/20 to-cyan-500/20 border border-slate-700 flex items-center justify-center text-slate-100 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              );

              return (
                <div
                  key={req.id}
                  className={`group bg-slate-900/60 rounded-2xl border border-slate-800 pl-0 pr-5 py-4 flex items-center gap-4 hover:border-slate-700 transition-all overflow-hidden border-l-4 ${borderColor}`}
                >
                  <div className="pl-4 flex items-center gap-4 flex-1 min-w-0">
                    {avatar}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">
                          {req.displayName}
                        </p>
                        <span className="text-xs text-slate-500">
                          @{req.username}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {req.businessName}
                        {req.businessType ? ` · ${req.businessType}` : ""}
                        {" · Submitted "}
                        {fmtDate(req.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${conf.cls}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {conf.label}
                  </span>

                  <button
                    onClick={() => setSelected(req)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors shrink-0"
                  >
                    Review <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <ReviewModal
          request={selected}
          onClose={() => setSelected(null)}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  );
};

export default OrganizerVerifications;
