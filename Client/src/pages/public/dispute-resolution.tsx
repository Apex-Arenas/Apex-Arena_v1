import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, ShieldCheck, Upload } from "lucide-react";

const STEPS = [
  {
    title: "Open a dispute",
    desc: "Submit the match ID and a quick description within 30 minutes.",
    icon: ClipboardList,
  },
  {
    title: "Upload evidence",
    desc: "Provide screenshots, video clips, or match logs from both teams.",
    icon: Upload,
  },
  {
    title: "Moderator review",
    desc: "A verified mod reviews the evidence and issues a final ruling.",
    icon: ShieldCheck,
  },
];

const DisputeResolution = () => {
  return (
    <div className="bg-slate-950 text-white">
      <section className="border-b border-slate-800/70">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Dispute Resolution
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Resolve match disputes in under 24 hours
          </h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Every report is handled by verified moderators. Clear evidence means
            faster rulings.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <p className="text-xs font-semibold text-slate-500">
                  Step {index + 1}
                </p>
                <div className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                  <Icon className="h-4 w-4 text-emerald-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-800/70 bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-2xl font-semibold text-white">
                Evidence checklist
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-400">
                {[
                  "Match ID and bracket name",
                  "Final scoreboard or end-match screen",
                  "Chat logs if abusive behavior occurred",
                  "Stream clip or VOD timestamps",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
              <h3 className="text-xl font-semibold text-white">
                Ready to submit?
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                Use the dispute form from your bracket page or reach out to
                support for manual review.
              </p>
              <Link
                to="/support/contact-us"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"
              >
                Contact support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DisputeResolution;
