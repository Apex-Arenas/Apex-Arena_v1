import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-slate-950 flex items-center justify-center overflow-hidden px-6">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-orange-500/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[200px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">

        {/* Big 404 */}
        <div className="relative mb-6 select-none">
          <p className="font-display text-[120px] sm:text-[160px] font-black leading-none text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-800/0 tracking-tight">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Page not found
        </div>

        {/* Heading */}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          This arena doesn't exist
        </h1>

        {/* Path */}
        <p className="text-sm text-slate-500 mb-2">
          No match for
        </p>
        <p className="font-mono text-xs sm:text-sm text-slate-300 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl mb-8 max-w-xs truncate">
          {location.pathname}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-600 hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-600">
          If you think this is a mistake, double-check the link or contact support.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
