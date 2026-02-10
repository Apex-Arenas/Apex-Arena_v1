import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-xl bg-linear-to-br from-cyan-300 via-sky-400 to-indigo-400" />
        <h1 className="font-display text-2xl font-bold text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-400 font-body">
          The link you followed doesn&apos;t exist in SuperAdmin.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-shadow hover:shadow-md hover:shadow-cyan-500/30"
          >
            Go to landing
          </Link>
        </div>
      </div>
    </div>
  );
}
