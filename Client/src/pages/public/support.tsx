import { Link } from "react-router-dom";
import {
  BookOpen,
  Gavel,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

const SUPPORT_LINKS = [
  {
    title: "Help Center",
    desc: "Find answers fast and browse platform FAQs.",
    to: "/support/help-center",
    icon: BookOpen,
    tone: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    title: "Rules",
    desc: "Match rules, fair play standards, and penalties.",
    to: "/support/rules",
    icon: Gavel,
    tone: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    title: "Dispute Resolution",
    desc: "Submit evidence and track dispute outcomes.",
    to: "/support/dispute-resolution",
    icon: ShieldCheck,
    tone: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    title: "Contact Us",
    desc: "Talk to a human when you need real help.",
    to: "/support/contact-us",
    icon: MessageSquare,
    tone: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
];

const Support = () => {
  return (
    <div className="bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800/70">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 5% 0%, rgba(6,182,212,0.2), transparent)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 55% at 95% 30%, rgba(124,58,237,0.2), transparent)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Support
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            We have your back in every bracket
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Whether you need help before a match, during a dispute, or after a
            payout, the support team stays on call 7 days a week.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/support/contact-us"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/20"
            >
              Talk to support
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/support/help-center"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              Browse help center
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          {SUPPORT_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.title}
                to={link.to}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition-all hover:-translate-y-1 hover:border-slate-600"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${link.border} ${link.bg}`}
                >
                  <Icon className={`h-5 w-5 ${link.tone}`} />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">
                  {link.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{link.desc}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">
                  Go to {link.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-800/70 bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Response times
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Guaranteed response within 4 hours
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                We triage disputes and payouts as priority 1. General questions
                are answered in under 12 hours.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Live disputes", value: "Under 4 hrs" },
                  { label: "Payout issues", value: "Same day" },
                  { label: "Tournament edits", value: "Under 6 hrs" },
                  { label: "Account recovery", value: "Under 12 hrs" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                Escalations
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">
                Need urgent help during a match?
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                Tag a live moderator in the tournament lobby or send a
                screenshot to the support chat. We will pause the bracket if
                needed.
              </p>
              <Link
                to="/support/dispute-resolution"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                See the dispute flow
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
