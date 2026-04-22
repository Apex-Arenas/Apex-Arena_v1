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
    <div className="bg-slate-950 text-white">
      <section className="border-b border-slate-800/70">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">
            Contact Us
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Get in touch with the Apex Arenas crew
          </h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Use the form below or reach us directly for urgent tournament
            support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
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
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            onSubmit={handleSubmit}
          >
            <h2 className="text-2xl font-semibold text-white">
              Send a message
            </h2>
            <div className="mt-6 grid gap-4">
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none ${
                  errors.name
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-800 focus:border-violet-400/50"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-rose-300">{errors.name}</p>
              )}
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none ${
                  errors.email
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-800 focus:border-violet-400/50"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-rose-300">{errors.email}</p>
              )}
              <input
                type="text"
                placeholder="Tournament or match ID (optional)"
                value={form.tournamentId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tournamentId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none"
              />
              <textarea
                rows={5}
                placeholder="Describe the issue"
                value={form.message}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, message: event.target.value }))
                }
                className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none ${
                  errors.message
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-800 focus:border-violet-400/50"
                }`}
              />
              {errors.message && (
                <p className="text-xs text-rose-300">{errors.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-linear-to-r from-orange-400 to-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </button>
          </form>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <Mail className="h-5 w-5 text-violet-300" />
              <h3 className="mt-4 text-xl font-semibold text-white">Email</h3>
              <p className="mt-2 text-sm text-slate-400">
                support@apexarenas.com
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <PhoneCall className="h-5 w-5 text-amber-300" />
              <h3 className="mt-4 text-xl font-semibold text-white">Phone</h3>
              <p className="mt-2 text-sm text-slate-400">+233 30 500 1122</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
              <MessageCircle className="h-5 w-5 text-cyan-300" />
              <h3 className="mt-4 text-xl font-semibold text-white">
                Live chat
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Tournament moderators respond fastest in the in-app lobby chat.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;
