import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  Building2,
  X,
  Trophy,
  Users,
  Swords,
  Wallet,
  Award,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { authService } from "../../../services/auth.service";
import DocumentDropzoneField from "../../../components/DocumentDropzoneField";
import type {
  OrganizerVerificationInfo,
  OrganizerVerificationPayload,
} from "../../../types/auth.types";

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({ info }: { info: OrganizerVerificationInfo }) {
  const config = {
    pending: {
      icon: Clock,
      border: "border-amber-500/30",
      bg: "bg-amber-500/8",
      iconBg: "bg-amber-500/15 border-amber-500/25",
      iconColor: "text-amber-400",
      title: "Request Submitted",
      titleColor: "text-amber-200",
      desc: "Your organizer verification request has been submitted and is awaiting review by our team.",
      descColor: "text-amber-300/70",
    },
    under_review: {
      icon: RefreshCw,
      border: "border-blue-500/30",
      bg: "bg-blue-500/8",
      iconBg: "bg-blue-500/15 border-blue-500/25",
      iconColor: "text-blue-400",
      title: "Under Review",
      titleColor: "text-blue-200",
      desc: "Our team is reviewing your verification request. This usually takes 1–3 business days.",
      descColor: "text-blue-300/70",
    },
    approved: {
      icon: CheckCircle2,
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/8",
      iconBg: "bg-emerald-500/15 border-emerald-500/25",
      iconColor: "text-emerald-400",
      title: "Approved!",
      titleColor: "text-emerald-200",
      desc: "Your organizer verification has been approved. You can now create and host tournaments.",
      descColor: "text-emerald-300/70",
    },
    rejected: {
      icon: XCircle,
      border: "border-red-500/30",
      bg: "bg-red-500/8",
      iconBg: "bg-red-500/15 border-red-500/25",
      iconColor: "text-red-400",
      title: "Request Rejected",
      titleColor: "text-red-200",
      desc: "Your verification request was rejected. Review the reasons below and resubmit.",
      descColor: "text-red-300/70",
    },
    needs_resubmission: {
      icon: AlertCircle,
      border: "border-orange-500/30",
      bg: "bg-orange-500/8",
      iconBg: "bg-orange-500/15 border-orange-500/25",
      iconColor: "text-orange-400",
      title: "Resubmission Required",
      titleColor: "text-orange-200",
      desc: "Please review the feedback below and resubmit your verification request.",
      descColor: "text-orange-300/70",
    },
  };

  const c = config[info.status];
  const Icon = c.icon;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${c.iconBg}`}>
            <Icon className={`w-5 h-5 ${c.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-display text-base font-bold ${c.titleColor}`}>{c.title}</h3>
            <p className={`text-sm mt-1 ${c.descColor}`}>{c.desc}</p>

            {info.rejectionReasons && info.rejectionReasons.length > 0 && (
              <div className="mt-4 rounded-xl bg-slate-900/60 border border-slate-700/60 p-4 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rejection Reasons</p>
                {info.rejectionReasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-300">
                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                    {r}
                  </div>
                ))}
              </div>
            )}

            {info.reviewNotes && (
              <div className="mt-3 rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin Notes</p>
                <p className="text-sm text-slate-300">{info.reviewNotes}</p>
              </div>
            )}

            {info.submittedAt && (
              <p className="text-xs text-slate-500 mt-3">
                Submitted {new Date(info.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors";

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1.5">{hint}</p>}
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
  idFrontFile: File | null;
  idBackFile: File | null;
  selfieWithIdFile: File | null;
  businessRegistrationFile: File | null;
}

const INITIAL_FORM: FormState = {
  businessName: "",
  businessType: "",
  registrationNumber: "",
  taxId: "",
  contactPerson: "",
  address: "",
  idFrontFile: null,
  idBackFile: null,
  selfieWithIdFile: null,
  businessRegistrationFile: null,
};

type FileKeys = "idFrontFile" | "idBackFile" | "selfieWithIdFile" | "businessRegistrationFile";

const fileLabels: Record<FileKeys, { label: string; required: boolean; hint: string }> = {
  idFrontFile:              { label: "ID Front",                       required: true,  hint: "Front of your national ID, passport, or driver's license."  },
  idBackFile:               { label: "ID Back",                        required: true,  hint: "Back of your ID document."                                   },
  selfieWithIdFile:         { label: "Selfie with ID",                 required: true,  hint: "A clear photo of you holding your ID next to your face."     },
  businessRegistrationFile: { label: "Business Registration (optional)", required: false, hint: "Registration certificate or supporting business document."  },
};

// ─── Verification Form ────────────────────────────────────────────────────────

function VerificationForm({ onSubmitted, isResubmission }: {
  onSubmitted: () => void; isResubmission?: boolean;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setFile = (key: FileKeys, file: File | null) =>
    setForm((prev) => ({ ...prev, [key]: file }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.businessName.trim()) { setError("Business name is required."); return; }
    if (!form.businessType)        { setError("Please select a business type."); return; }
    if (!form.contactPerson.trim()) { setError("Contact person is required."); return; }
    if (!form.address.trim())      { setError("Address is required."); return; }
    if (!form.idFrontFile || !form.idBackFile || !form.selfieWithIdFile) {
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
        contactPerson: form.contactPerson.trim(),
        address: form.address.trim(),
        idFront: form.idFrontFile,
        idBack: form.idBackFile,
        selfieWithId: form.selfieWithIdFile,
        businessRegistration: form.businessRegistrationFile ?? undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Business Details */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className="font-display text-sm font-bold text-white">Business Information</h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business / Event Name" required>
            <input type="text" value={form.businessName} onChange={(e) => set("businessName", e.target.value)}
              placeholder="e.g. Apex Gaming Events" className={inputCls} />
          </Field>
          <Field label="Business Type" required>
            <select value={form.businessType} onChange={(e) => set("businessType", e.target.value)} className={`${inputCls} bg-slate-800 [&>option]:bg-slate-800 [&>option]:text-white`}>
              <option value="">Select type</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="organization">Organization / NGO</option>
              <option value="gaming_club">Gaming Club</option>
              <option value="esports_team">Esports Team</option>
            </select>
          </Field>
          <Field label="Registration Number" hint="Optional — business registration number">
            <input type="text" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)}
              placeholder="Optional" className={inputCls} />
          </Field>
          <Field label="Tax ID" hint="Optional — tax identification number">
            <input type="text" value={form.taxId} onChange={(e) => set("taxId", e.target.value)}
              placeholder="Optional" className={inputCls} />
          </Field>
          <Field label="Contact Person" required>
            <input type="text" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)}
              placeholder="Full name of primary contact" className={inputCls} />
          </Field>
          <Field label="Address" required>
            <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)}
              placeholder="Business or personal address" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Identity Documents */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className="font-display text-sm font-bold text-white">Identity Documents</h3>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4">
          {(Object.keys(fileLabels) as FileKeys[]).map((key) => {
            const meta = fileLabels[key];
            return (
              <DocumentDropzoneField
                key={key}
                label={meta.label}
                required={meta.required}
                hint={meta.hint}
                file={form[key]}
                disabled={isSubmitting}
                onChange={(f) => setFile(key, f)}
              />
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
        ) : (
          <><Shield className="w-4 h-4" /> {isResubmission ? "Resubmit Verification Request" : "Submit Verification Request"}</>
        )}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERKS = [
  { icon: Trophy,  label: "Host Tournaments",       desc: "Create and publish professional tournaments on the platform."      },
  { icon: Wallet,  label: "Collect Entry Fees",      desc: "Charge entry fees and distribute prizes to winners seamlessly."   },
  { icon: Users,   label: "Manage Registrations",    desc: "Handle player registrations, check-ins, and team management."    },
  { icon: Swords,  label: "Bracket Management",      desc: "Auto-generate brackets and manage matches in real time."         },
  { icon: Award,   label: "Organizer Badge",         desc: "Get a verified organizer badge displayed on your profile."       },
  { icon: ChevronRight, label: "Analytics & Payouts", desc: "Track tournament performance and request prize pool payouts."   },
];

const STEPS = [
  { n: "01", label: "Submit Application",  desc: "Fill in your business details and upload identity documents."        },
  { n: "02", label: "Admin Review",        desc: "Our team reviews your application within 1–3 business days."        },
  { n: "03", label: "Start Hosting",       desc: "Once approved, create and host tournaments immediately."             },
];

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
    setStatus({ status: "pending", submittedAt: new Date().toISOString() });
  };

  const canResubmit = status !== "not_requested" && status !== null &&
    (status.status === "rejected" || status.status === "needs_resubmission");

  const hasActiveRequest = status !== "not_requested" && status !== null &&
    (status.status === "pending" || status.status === "under_review" || status.status === "approved");

  const showLanding = !showForm && (status === "not_requested" || canResubmit);

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-slate-900 px-6 sm:px-10 py-10">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Icon badge */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/25 flex items-center justify-center">
              <Shield className="w-10 h-10 text-orange-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-950">✓</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-orange-400/80 font-bold uppercase tracking-[0.2em] mb-1">Organizer Program</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-none mb-2">
              Become an Organizer
            </h1>
            <p className="text-sm text-slate-400 max-w-md">
              Apply for verified organizer status to create tournaments, manage prizes, and build your esports brand on Apex Arenas.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-8 space-y-8">

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        )}

        {/* Success state */}
        {!isLoading && submitted && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Request Submitted!</h3>
              <p className="text-sm text-emerald-300/80 max-w-sm mx-auto">
                Your verification request has been received. We'll review it within 1–3 business days and notify you of the outcome.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !submitted && (
          <>
            {/* Status banner */}
            {status !== "not_requested" && status !== null && (
              <StatusBanner info={status} />
            )}

            {/* Landing content (perks + steps) */}
            {showLanding && (
              <>
                {/* Perks grid */}
                <div>
                  <h2 className="font-display text-lg font-bold text-white mb-4">What you get</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PERKS.map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                          <Icon className="w-4.5 h-4.5 text-orange-400" />
                        </div>
                        <p className="text-sm font-bold text-white mb-1">{label}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How it works */}
                <div>
                  <h2 className="font-display text-lg font-bold text-white mb-4">How it works</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STEPS.map((step, i) => (
                      <div key={step.n} className="relative rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        {i < STEPS.length - 1 && (
                          <ArrowRight className="hidden sm:block absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700 z-10" />
                        )}
                        <p className="font-display text-3xl font-bold text-orange-500/30 mb-3 leading-none">{step.n}</p>
                        <p className="text-sm font-bold text-white mb-1">{step.label}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* CTA or form */}
            {showForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-white">
                    {canResubmit ? "Resubmit Application" : "Organizer Application"}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
                <VerificationForm onSubmitted={handleSubmitted} isResubmission={canResubmit} />
              </div>
            ) : canResubmit ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Resubmit Verification Request
              </button>
            ) : !hasActiveRequest ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                <Shield className="w-4 h-4" />
                Apply to Become an Organizer
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default BecomeOrganizer;
