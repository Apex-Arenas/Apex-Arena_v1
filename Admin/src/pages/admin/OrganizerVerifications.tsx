import { useCallback, useEffect, useRef, useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  X,
  ChevronDown,
  ExternalLink,
  Loader2,
  User,
  Building2,
  FileText,
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
    cls: "bg-green-500/15 text-green-300 border-green-500/30",
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
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const [error, setError] = useState<string | null>(null);
  const [startingReview, setStartingReview] = useState(false);

  const needsReviewStart = request.status === "pending";

  const handleStartReview = async () => {
    setStartingReview(true);
    try {
      await adminService.startVerificationReview(request.id);
    } catch {
      // non-critical, continue
    } finally {
      setStartingReview(false);
    }
  };

  const handleSubmit = async () => {
    if (!action) {
      setError("Please select an action.");
      return;
    }
    if (
      (action === "reject" || action === "needs_resubmission") &&
      !reason.trim()
    ) {
      setError("Please provide a reason.");
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
    "w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Review Verification Request
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {request.businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Applicant */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              Applicant
            </h3>
            <div className="flex items-center gap-3">
              {request.avatarUrl ? (
                <img
                  src={request.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                  {request.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {request.displayName}
                </p>
                <p className="text-xs text-slate-400">
                  @{request.username} · {request.email}
                </p>
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Business Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Business Name", value: request.businessName },
                { label: "Business Type", value: request.businessType },
                { label: "Registration #", value: request.registrationNumber },
                { label: "Contact Person", value: request.contactPerson },
                { label: "Address", value: request.address },
                { label: "Submitted", value: formatDate(request.submittedAt) },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-slate-200">{value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Documents
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
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Document
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">Not provided</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Review Action */}
          {!["approved", "rejected"].includes(request.status) && (
            <div className="space-y-4">
              {needsReviewStart && (
                <button
                  onClick={handleStartReview}
                  disabled={startingReview}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {startingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Mark as Under Review
                </button>
              )}

              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">
                  Decision
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      {
                        value: "approve",
                        label: "Approve",
                        cls: "border-green-500/40 text-green-300 bg-green-500/10 hover:bg-green-500/20",
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
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        action === opt.value
                          ? opt.cls +
                            " ring-1 ring-offset-1 ring-offset-slate-900"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
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
                    placeholder="Explain what needs to be corrected..."
                    rows={3}
                    className={`${inputCls} resize-none`}
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
                  placeholder="Notes visible only to admins..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !action}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Submitting..." : "Submit Decision"}
                </button>
              </div>
            </div>
          )}

          {["approved", "rejected"].includes(request.status) && (
            <div
              className={`rounded-xl border p-4 text-sm ${STATUS_CONFIG[request.status].cls}`}
            >
              <p className="font-medium">
                This request has already been {request.status}.
              </p>
              {request.reviewedAt && (
                <p className="text-xs opacity-70 mt-1">
                  Reviewed: {formatDate(request.reviewedAt)}
                </p>
              )}
              {request.rejectionReasons?.map((r, i) => (
                <p key={i} className="mt-1 text-xs opacity-80">
                  • {r}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_resubmission", label: "Needs Resubmission" },
];

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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${
            toast.type === "success"
              ? "bg-green-500/15 border-green-500/30 text-green-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            Organizer Verifications
            {pendingCount > 0 && (
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and approve organizer verification requests.
          </p>
        </div>
        <button
          onClick={() => void load(statusFilter)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
              className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 animate-pulse"
            >
              <div className="h-4 w-48 bg-slate-800 rounded mb-2" />
              <div className="h-3 w-32 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-slate-600" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No Requests</h2>
          <p className="text-sm text-slate-400">
            No organizer verification requests match this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusConf = STATUS_CONFIG[req.status];
            const StatusIcon = statusConf.icon;
            return (
              <div
                key={req.id}
                className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
              >
                {/* Avatar */}
                {req.avatarUrl ? (
                  <img
                    src={req.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                    {req.displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">
                      {req.displayName}
                    </p>
                    <span className="text-xs text-slate-500">
                      @{req.username}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.businessName} · {req.businessType} · Submitted{" "}
                    {formatDate(req.submittedAt)}
                  </p>
                </div>

                {/* Status */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 shrink-0 ${statusConf.cls}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConf.label}
                </span>

                {/* Review Button */}
                <button
                  onClick={() => setSelected(req)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors shrink-0"
                >
                  Review
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
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
