import { Mail, PhoneCall, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { submitSupportMessage } from "../../services/support.service";

type FormErrors = {
  name?: string;
  email?: string;
  message?: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactUs = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    tournamentId: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (next: ToastState) => {
    setToast(next);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) {
      nextErrors.name = "Name is required";
    }
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim())) {
      nextErrors.email = "Valid email is required";
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      nextErrors.message = "Message must be at least 10 characters";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      showToast({
        type: "error",
        message: "Please fix the highlighted fields.",
      });
      return;
    }

    setIsSubmitting(true);
    const response = await submitSupportMessage({
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
      tournament_id: form.tournamentId.trim() || undefined,
    });

    if (response.success) {
      showToast({
        type: "success",
        message: "Message sent. Support will reply soon.",
      });
      setForm({ name: "", email: "", tournamentId: "", message: "" });
      setErrors({});
    } else {
      showToast({
        type: "error",
        message: response.error?.message ?? "Failed to send message.",
      });
    }

    setIsSubmitting(false);
  };
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[700px] h-[400px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[200px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-slate-700/60 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="font-display text-xl sm:text-3xl font-bold text-white leading-tight">Contact Us</h1>
              <p className="text-sm text-slate-400 mt-1">Get in touch with the Apex Arenas crew — we're here to help.</p>
            </div>
          </div>

          {/* Contact method pills */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-full px-3 py-1.5">
              <Mail className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-slate-300 font-medium">support@apexarenas.com</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-full px-3 py-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-300 font-medium">+233 30 500 1122</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-full px-3 py-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-300 font-medium">In-app lobby chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {toast && (
          <div className="fixed right-6 top-6 z-50">
            <div
              className={`rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
                toast.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                  : "border-rose-500/40 bg-rose-500/15 text-rose-100"
              }`}
            >
              {toast.message}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Form */}
          <form
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
            onSubmit={handleSubmit}
          >
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">Send a message</h2>
            <div className="mt-5 grid gap-3">
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none ${
                  errors.name ? "border-rose-500/60 focus:border-rose-400" : "border-slate-800 focus:border-violet-400/50"
                }`}
              />
              {errors.name && <p className="text-xs text-rose-300 -mt-1">{errors.name}</p>}
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none ${
                  errors.email ? "border-rose-500/60 focus:border-rose-400" : "border-slate-800 focus:border-violet-400/50"
                }`}
              />
              {errors.email && <p className="text-xs text-rose-300 -mt-1">{errors.email}</p>}
              <input
                type="text"
                placeholder="Tournament or match ID (optional)"
                value={form.tournamentId}
                onChange={(event) => setForm((prev) => ({ ...prev, tournamentId: event.target.value }))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none"
              />
              <textarea
                rows={5}
                placeholder="Describe the issue"
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none ${
                  errors.message ? "border-rose-500/60 focus:border-rose-400" : "border-slate-800 focus:border-violet-400/50"
                }`}
              />
              {errors.message && <p className="text-xs text-rose-300 -mt-1">{errors.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition-all hover:shadow-lg hover:shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </button>
          </form>

          {/* Contact info — unified card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="font-display text-sm font-bold text-white">Reach us directly</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/15 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Email</p>
                  <p className="text-sm font-semibold text-white truncate">support@apexarenas.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-slate-700/60 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Phone</p>
                  <p className="text-sm font-semibold text-white">+233 30 500 1122</p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/15 to-teal-500/15 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Live Chat</p>
                  <p className="text-sm text-slate-300">Moderators respond fastest in the in-app lobby chat.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
