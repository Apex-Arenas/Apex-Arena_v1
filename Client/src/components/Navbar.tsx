import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogIn, User, Sparkles } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-cyan-300 via-sky-400 to-indigo-400 text-slate-950">
              <Sparkles size={18} />
            </span>
            <span className="font-semibold tracking-wide text-lg text-white">
              APEX ARENAS
            </span>
          </Link>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <LogIn size={18} />
              <span>Login</span>
            </NavLink>

            <NavLink
              to="/signup"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950"
                    : "bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 hover:shadow-md hover:shadow-cyan-500/30"
                }`
              }
            >
              <User size={18} />
              <span>Sign Up</span>
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-800 py-4">
            <div className="flex flex-col space-y-3">
              <NavLink
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    isActive
                      ? "bg-white/10 text-white font-medium"
                      : "text-slate-300 hover:bg-white/5"
                  }`
                }
              >
                <LogIn size={20} />
                <span>Login</span>
              </NavLink>

              <NavLink
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg font-medium ${
                    isActive
                      ? "bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950"
                      : "bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950"
                  }`
                }
              >
                <User size={20} />
                <span>Sign Up</span>
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
