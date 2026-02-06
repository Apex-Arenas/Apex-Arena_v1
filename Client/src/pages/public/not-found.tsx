import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 py-16 text-center text-white">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-white/5 px-4 py-2 text-sm text-slate-200">
        <span className="font-semibold">404</span>
        <span className="text-slate-500">|</span>
        <span>Page not found</span>
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-5xl">
        We can’t find that page
      </h1>

      <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
        The URL{" "}
        <span className="font-mono text-white">{location.pathname}</span>{" "}
        doesn’t match any page in this app.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-md bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
        >
          Go to Home
        </Link>
        <Link
          to="/login"
          className="rounded-md border border-cyan-400/40 bg-transparent px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10 transition-colors"
        >
          Go to Login
        </Link>
      </div>

      <p className="mt-10 text-sm text-slate-400">
        If you expected something here, double-check the link.
      </p>
    </section>
  );
};

export default NotFound;
