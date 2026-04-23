import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
  LogIn,
  User,
  LogOut,
  LayoutDashboard,
  Zap,
  ArrowRight,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../lib/auth-context";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const reduceMotion = useReducedMotion();

  const profilePath =
    user?.role === "organizer"
      ? "/auth/organizer/profile"
      : "/auth/player/profile";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsMenuOpen(false);
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navLinks = isAuthenticated
    ? [
        { label: "Tournaments", to: "/auth/player/join-tournament" },
        { label: "Leaderboard", to: "/auth/leaderboard" },
      ]
    : [
        { label: "Tournaments", to: "/tournaments" },
        { label: "Leaderboard", to: "/leaderboard" },
      ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 text-white backdrop-blur-md">
      {/* Announcement bar */}
      <div className="bg-linear-to-r from-cyan-500/10 via-sky-500/10 to-cyan-500/10 border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <span className="text-cyan-300 font-semibold">GHS 5,000</span> in prize pools this weekend
          </span>
          <span className="text-slate-600">·</span>
          <Link
            to="/login"
            className="text-cyan-300 font-medium hover:text-cyan-200 inline-flex items-center gap-1"
          >
            View brackets <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white p-0.5 shrink-0">
              <img src="/apex-logo.png" alt="Apex Arenas" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold tracking-wide text-lg text-white">
              APEX ARENAS
            </span>
          </Link>

          {/* Middle nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map((n) => (
              <NavLink
                key={n.label}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isActive
                      ? "text-white bg-white/5"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <NavLink
                    to="/auth"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`
                    }
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </NavLink>
                </motion.div>

                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <NavLink
                    to={profilePath}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`
                    }
                  >
                    <User size={18} />
                    <span>{user?.username ?? "Profile"}</span>
                  </NavLink>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={
                    reduceMotion || isLoggingOut ? undefined : { y: -1 }
                  }
                  whileTap={
                    reduceMotion || isLoggingOut ? undefined : { scale: 0.98 }
                  }
                >
                  <LogOut size={18} />
                  <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                </motion.button>
              </>
            ) : (
              <>
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`
                    }
                  >
                    <LogIn size={18} />
                    <span>Log in</span>
                  </NavLink>
                </motion.div>

                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <NavLink
                    to="/signup"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 hover:shadow-md hover:shadow-orange-500/25 transition-all"
                  >
                    <User size={18} />
                    <span>Start free</span>
                  </NavLink>
                </motion.div>
              </>
            )}
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
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              key="mobile-menu"
              className="md:hidden border-t border-slate-800/70 overflow-hidden"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={
                reduceMotion ? undefined : { height: "auto", opacity: 1 }
              }
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="py-4">
                <div className="flex flex-col gap-1">
                  {/* Nav links */}
                  {navLinks.map((n) => (
                    <NavLink
                      key={n.label}
                      to={n.to}
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg text-sm ${
                          isActive
                            ? "bg-white/10 text-white font-medium"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`
                      }
                    >
                      {n.label}
                    </NavLink>
                  ))}

                  <div className="border-t border-slate-800/60 my-2" />

                  {isAuthenticated ? (
                    <>
                      <NavLink
                        to="/auth"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent ${
                            isActive
                              ? "bg-white/10 text-white font-medium border-slate-700"
                              : "text-slate-300 hover:bg-white/5 hover:border-slate-800"
                          }`
                        }
                      >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                      </NavLink>

                      <NavLink
                        to={profilePath}
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent ${
                            isActive
                              ? "bg-white/10 text-white font-medium border-slate-700"
                              : "text-slate-300 hover:bg-white/5 hover:border-slate-800"
                          }`
                        }
                      >
                        <User size={20} />
                        <span>{user?.username ?? "Profile"}</span>
                      </NavLink>

                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent text-slate-300 hover:bg-white/5 hover:border-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <LogOut size={20} />
                        <span>
                          {isLoggingOut ? "Logging out..." : "Logout"}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <NavLink
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent ${
                            isActive
                              ? "bg-white/10 text-white font-medium border-slate-700"
                              : "text-slate-300 hover:bg-white/5 hover:border-slate-800"
                          }`
                        }
                      >
                        <LogIn size={20} />
                        <span>Log in</span>
                      </NavLink>

                      <NavLink
                        to="/signup"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium bg-linear-to-r from-orange-400 to-amber-400 text-slate-950"
                      >
                        <User size={20} />
                        <span>Start free</span>
                      </NavLink>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
