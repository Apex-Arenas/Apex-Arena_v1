import { Link } from "react-router-dom";
import { Trophy, Wallet, ArrowRight, Swords, Users } from "lucide-react";

export default function PlayerQuickActions() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/60">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Quick Actions</p>
      </div>
      <div className="p-2">
        {[
          { icon: Swords,   label: "Browse Tournaments", to: "/auth/player/join-tournament", accent: true },
          { icon: Trophy,   label: "Leaderboard",        to: "/auth/leaderboard"                          },
          { icon: Wallet,   label: "Wallet",             to: "/auth/wallet"                               },
          { icon: Users,    label: "Profile",            to: "/auth/player/profile"                       },
        ].map(({ icon: Icon, label, to, accent }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-between text-xs rounded-xl px-3 py-2.5 transition-all group ${
              accent
                ? "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </div>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
