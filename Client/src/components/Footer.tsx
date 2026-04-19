import { Link } from "react-router-dom";
import { Twitter, Youtube, Instagram, MessageCircle, ShieldCheck } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">

        {/* Brand */}
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 shrink-0">
              <img src="/apex-logo.png" alt="Apex Arenas" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-base tracking-wide text-white">
              APEX ARENAS
            </span>
          </Link>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            Ghana's escrow-backed esports tournament platform. Compete with confidence — every time.
          </p>
          <div className="flex items-center gap-3 mt-5">
            {[
              { icon: Twitter,        label: "Twitter" },
              { icon: Youtube,        label: "YouTube" },
              { icon: Instagram,      label: "Instagram" },
              { icon: MessageCircle,  label: "Discord" },
            ].map(({ icon: Icon, label }) => (
              <a
                key={label}
                aria-label={label}
                className="w-9 h-9 rounded-lg border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <p className="font-display font-semibold text-sm text-white mb-3">Platform</p>
          <ul className="space-y-2.5">
            {[
              { label: "Tournaments",      to: "/login" },
              { label: "Leaderboard",      to: "/login" },
              { label: "For Organizers",   to: "/signup" },
              { label: "Organizer Tools",  to: "/signup" },
            ].map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <p className="font-display font-semibold text-sm text-white mb-3">Support</p>
          <ul className="space-y-2.5">
            {[
              { label: "Help Center",        to: "/" },
              { label: "Rules",              to: "/" },
              { label: "Dispute Resolution", to: "/" },
              { label: "Contact Us",         to: "/" },
            ].map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <p className="font-display font-semibold text-sm text-white mb-3">Company</p>
          <ul className="space-y-2.5">
            {[
              { label: "About",            to: "/" },
              { label: "Careers",          to: "/" },
              { label: "Privacy Policy",   to: "/" },
              { label: "Terms of Service", to: "/" },
            ].map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Apex Arenas. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Escrow-backed · Verified operators
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
