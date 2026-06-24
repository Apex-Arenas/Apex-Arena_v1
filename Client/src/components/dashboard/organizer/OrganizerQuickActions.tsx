import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function OrganizerQuickActions() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/60">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Quick Actions
        </p>
      </div>
      <div className="p-2">
        {[
          {
            label: "Create a tournament",
            to: "/auth/organizer/create-tournament",
            accent: true,
          },
          {
            label: "Manage tournaments",
            to: "/auth/organizer/tournaments",
          },
          { label: "Analytics", to: "/auth/organizer/analytics" },
          { label: "Payouts", to: "/auth/organizer/payouts" },
          { label: "Profile", to: "/auth/organizer/profile" },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex items-center justify-between text-xs rounded-lg px-3 py-2.5 transition-all group ${
              a.accent
                ? "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {a.label}
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
