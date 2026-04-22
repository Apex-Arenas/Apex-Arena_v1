import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Users, AlertTriangle } from "lucide-react";

const RULE_SECTIONS = [
  {
    title: "Fair play",
    icon: ShieldCheck,
    points: [
      "No cheating, scripting, or use of unauthorized overlays.",
      "Only registered players may compete on an account.",
      "Respect official match settings and lobby rules.",
    ],
  },
  {
    title: "Match integrity",
    icon: Users,
    points: [
      "Submit results within 15 minutes of match completion.",
      "Provide screenshots or video evidence when requested.",
      "Do not alter match files or replay data.",
    ],
  },
  {
    title: "Penalties",
    icon: AlertTriangle,
    points: [
      "No-shows forfeit after the check-in grace period.",
      "Repeat offenses can lead to bracket bans.",
      "Prize payouts pause while disputes are unresolved.",
    ],
  },
];

const Rules = () => {
  return (
    <div className="bg-slate-950 text-white">
      <section className="border-b border-slate-800/70">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
            Rules
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Competitive rules for every Apex Arenas bracket
          </h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            These rules apply to all tournaments unless a specific rule set is
            listed in the tournament details.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {RULE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950">
                  <Icon className="h-4 w-4 text-amber-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {section.title}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-800/70 bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
            <h2 className="text-2xl font-semibold text-white">
              Need the dispute playbook?
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              If a match breaks the rules, submit evidence and our moderators
              will review within hours.
            </p>
            <Link
              to="/support/dispute-resolution"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-300"
            >
              Open dispute flow
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Rules;
