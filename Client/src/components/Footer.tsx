import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative border-t border-slate-800/70 bg-slate-950/70 text-white backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px w-full bg-linear-to-r from-transparent via-cyan-400/30 to-transparent" />

        <div className="flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 w-9 h-9 rounded-lg flex items-center justify-center text-slate-950">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-wide">
                APEX ARENAS
              </span>
            </Link>
            <p className="text-sm text-slate-400">
              Ghana&apos;s trusted esports tournament platform.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-300 md:justify-end">
            <Link
              to="/dashboard"
              className="hover:text-white transition-colors"
            >
              Tournaments
            </Link>
            <Link to="/signup" className="hover:text-white transition-colors">
              Sign Up
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Login
            </Link>
          </nav>

          <div className="text-slate-500 text-center md:text-right">
            <p className="text-xs">© 2025 APEX ARENAS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
