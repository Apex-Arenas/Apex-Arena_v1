import { useCallback, useEffect, useRef, useState } from "react";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileText,
  Building2,
  X,
} from "lucide-react";
import { authService } from "../../services/auth.service";
import type { OrganizerVerificationInfo, OrganizerVerificationPayload } from "../../types/auth.types";

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({ info }: { info: OrganizerVerificationInfo }) {
  const config = {
    pending: {
      icon: Clock,
      color: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      title: "Request Submitted",
      desc: "Your organizer verification request has been submitted and is awaiting review.",
    },
    under_review: {
      icon: RefreshCw,
      color: "bg-blue-500/10 border-blue-500/30 text-blue-300",
      title: "Under Review",
      desc: "Our team is reviewing your verification request. This usually takes 1–3 business days.",
    },
    approved: {
      icon: CheckCircle2,
      color: "bg-green-500/10 border-green-500/30 text-green-300",
      title: "Approved!",
      desc: "Your organizer verification has been approved. You can now create and host tournaments.",
    },
    rejected: {
      icon: XCircle,
      color: "bg-red-500/10 border-red-500/30 text-red-300",
      title: "Request Rejected",
      desc: "Your verification request was rejected. Review the reasons below and resubmit.",
    },
    needs_resubmission: {
      icon: AlertCircle,
      color: "bg-orange-500/10 border-orange-500/30 text-orange-300",
      title: "Resubmission Required",
      desc: "Please review the feedback below and resubmit your verification request.",
    },
  };

  const { icon: Icon, color, title, desc } = config[info.status];

  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm opacity-80 mt-1">{desc}</p>

          {info.rejectionReasons && info.rejectionReasons.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Rejection Reasons:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {info.rejectionReasons.map((r, i) => (
                  <li key={i} className="text-sm">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {info.reviewNotes && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">Admin Notes:</p>
              <p className="text-sm">{info.reviewNotes}</p>
            </div>
          )}

          {info.submittedAt && (
            <p className="text-xs opacity-60 mt-3">
              Submitted:{" "}
              {new Date(info.submittedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Request Form ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors";

function Field({ label, required, hint, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

interface FormState {
  businessName: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;
  contactPerson: string;
  address: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfieWithIdUrl: string;
  businessRegistrationUrl: string;
}

const INITIAL_FORM: FormState = {
  businessName: "",
  businessType: "",
  registrationNumber: "",
  taxId: "",
  contactPerson: "",
  address: "",
  idFrontUrl: "",
  idBackUrl: "",
  selfieWithIdUrl: "",
  businessRegistrationUrl: "",
};

function VerificationForm({
  onSubmitted,
  isResubmission,
}: {
  onSubmitted: () => void;
  isResubmission?: boolean;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.businessName.trim()) { setError("Business name is required."); return; }
    if (!form.businessType) { setError("Please select a business type."); return; }
    if (!form.idFrontUrl.trim() || !form.idBackUrl.trim() || !form.selfieWithIdUrl.trim()) {
      setError("ID front, ID back, and selfie with ID are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: OrganizerVerificationPayload = {
        businessName: form.businessName.trim(),
        businessType: form.businessType,
        registrationNumber: form.registrationNumber.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        address: form.address.trim() || undefined,
        idFrontUrl: form.idFrontUrl.trim(),
        idBackUrl: form.idBackUrl.trim(),
        selfieWithIdUrl: form.selfieWithIdUrl.trim(),
        businessRegistrationUrl: form.businessRegistrationUrl.trim() || undefined,
      };

      await authService.requestOrganizerVerification(payload);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Business Details */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          Business Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business / Event Name" required>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="e.g. Apex Gaming Events"
              className={inputCls}
            />
          </Field>

          <Field label="Business Type" required>
            <select
              value={form.businessType}
              onChange={(e) => set("businessType", e.target.value)}
              className={inputCls}
            >
              <option value="">Select type</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="organization">Organization / NGO</option>
              <option value="gaming_club">Gaming Club</option>
              <option value="esports_team">Esports Team</option>
            </select>
          </Field>

          <Field label="Registration Number">
            <input
              type="text"
              value={form.registrationNumber}
              onChange={(e) => set("registrationNumber", e.target.value)}
              placeholder="Business registration number (optional)"
              className={inputCls}
            />
          </Field>

          <Field label="Tax ID">
            <input
              type="text"
              value={form.taxId}
              onChange={(e) => set("taxId", e.target.value)}
              placeholder="Tax identification number (optional)"
              className={inputCls}
            />
          </Field>

          <Field label="Contact Person">
            <input
              type="text"
              value={form.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
              placeholder="Full name of primary contact"
              className={inputCls}
            />
          </Field>

          <Field label="Address">
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Business / personal address"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Identity Documents */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          Identity Documents
          <span className="text-xs text-slate-500 font-normal">(paste image URLs)</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <Field
            label="ID Front (URL)"
            required
            hint="A photo URL of the front of your national ID, passport, or driver's license."
          >
            <input
              type="url"
              value={form.idFrontUrl}
              onChange={(e) => set("idFrontUrl", e.target.value)}
              placeholder="https://example.com/id-front.jpg"
              className={inputCls}
            />
          </Field>

          <Field
            label="ID Back (URL)"
            required
            hint="A photo URL of the back of your ID."
          >
            <input
              type="url"
              value={form.idBackUrl}
              onChange={(e) => set("idBackUrl", e.target.value)}
              placeholder="https://example.com/id-back.jpg"
              className={inputCls}
            />
          </Field>

          <Field
            label="Selfie With ID (URL)"
            required
            hint="A photo URL of you holding your ID next to your face."
          >
            <input
              type="url"
              value={form.selfieWithIdUrl}
              onChange={(e) => set("selfieWithIdUrl", e.target.value)}
              placeholder="https://example.com/selfie-with-id.jpg"
              className={inputCls}
            />
          </Field>

          <Field
            label="Business Registration Document (URL)"
            hint="Optional — URL to your business registration certificate."
          >
            <input
              type="url"
              value={form.businessRegistrationUrl}
              onChange={(e) => set("businessRegistrationUrl", e.target.value)}
              placeholder="https://example.com/business-registration.pdf"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              {isResubmission ? "Resubmit Request" : "Submit Verification Request"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BecomeOrganizer = () => {
  const [status, setStatus] = useState<OrganizerVerificationInfo | null | "not_requested">("not_requested");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hasFetched = useRef(false);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await authService.getVerificationStatus();
      setStatus(info ?? "not_requested");
    } catch {
      setStatus("not_requested");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void checkStatus();
  }, [checkStatus]);

  const handleSubmitted = () => {
    setSubmitted(true);
    setShowForm(false);
    setStatus({
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
  };

  const canResubmit =
    status !== "not_requested" &&
    status !== null &&
    (status.status === "rejected" || status.status === "needs_resubmission");

  const hasActiveRequest =
    status !== "not_requested" &&
    status !== null &&
    (status.status === "pending" || status.status === "under_review" || status.status === "approved");

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-2">
          <Shield className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Become an Organizer</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Verified organizers can create and host tournaments, manage registrations, distribute prizes, and more.
        </p>
      </div>

      {/* Benefits */}
      {(status === "not_requested" || showForm) && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">What you get as an Organizer</h2>
          <div className="space-y-2">
            {[
              "Create and publish tournaments",
              "Collect entry fees and distribute prizes",
              "Manage player registrations and check-ins",
              "Generate brackets and manage matches",
              "Organizer badge on your profile",
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm text-slate-300">
                <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : submitted ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
          <h3 className="font-display text-lg font-bold text-white">Request Submitted!</h3>
          <p className="text-sm text-green-300">
            Your verification request has been received. We'll review it within 1–3 business days and notify you.
          </p>
        </div>
      ) : (
        <>
          {/* Current Status */}
          {status !== "not_requested" && status !== null && (
            <StatusBanner info={status} />
          )}

          {/* Form */}
          {(showForm || canResubmit) ? (
            <>
              {canResubmit && !showForm && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    Resubmit Verification Request
                  </button>
                </div>
              )}
              {showForm && (
                <VerificationForm
                  onSubmitted={handleSubmitted}
                  isResubmission={canResubmit}
                />
              )}
            </>
          ) : !hasActiveRequest ? (
            <div className="flex justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition-colors"
              >
                <Shield className="w-5 h-5" />
                Apply to Become an Organizer
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default BecomeOrganizer;
