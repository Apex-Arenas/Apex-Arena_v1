import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-px w-full bg-linear-to-r from-transparent via-cyan-400/25 to-transparent" />
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-linear-to-br from-cyan-300 via-sky-400 to-indigo-400" />
              <div className="leading-tight">
                <div className="font-display text-lg font-bold tracking-wide text-white">
                  APEX ARENAS
                </div>
                <div className="text-xs text-slate-400">SuperAdmin Console</div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-shadow hover:shadow-md hover:shadow-cyan-500/30"
              >
                Open console
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-950/50 px-4 py-2 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Secure operations for Apex Arenas
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                SuperAdmin tools to keep tournaments fast,
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400">
                  {" "}
                  fair
                </span>
                , and reliable.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-300 font-body">
                Review organizer accounts, audit tournaments, and manage
                platform settings in one place.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/login"
                  className="inline-flex justify-center rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-shadow hover:shadow-md hover:shadow-cyan-500/30"
                >
                  Continue to sign in
                </Link>
                <a
                  href="#capabilities"
                  className="inline-flex justify-center rounded-lg border border-slate-800/70 bg-slate-950/40 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
                >
                  Learn what you can manage
                </a>
              </div>

              <dl className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <dt className="text-xs text-slate-400">Access</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    Role-based control
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <dt className="text-xs text-slate-400">Visibility</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    Audit-ready logs
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <dt className="text-xs text-slate-400">Quality</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    Faster review cycles
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-white">
                    Capabilities
                  </h2>
                  <div className="h-8 w-8 rounded-lg bg-linear-to-br from-cyan-300 via-sky-400 to-indigo-400" />
                </div>

                <div id="capabilities" className="mt-6 grid gap-4">
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                    <div className="text-sm font-semibold text-white">
                      Organizer approvals
                    </div>
                    <div className="mt-1 text-sm text-slate-400 font-body">
                      Verify accounts, manage permissions, and reduce fraud.
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                    <div className="text-sm font-semibold text-white">
                      Tournament oversight
                    </div>
                    <div className="mt-1 text-sm text-slate-400 font-body">
                      Monitor event status, rules, and disputes.
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                    <div className="text-sm font-semibold text-white">
                      Platform configuration
                    </div>
                    <div className="mt-1 text-sm text-slate-400 font-body">
                      Manage global settings and operational policies.
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                  <p className="text-xs text-slate-400">
                    Tip: keep this portal private; share access only with
                    trusted staff.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-px w-full bg-linear-to-r from-transparent via-cyan-400/30 to-transparent" />
          <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              <span className="font-display font-bold text-white">
                APEX ARENAS
              </span>{" "}
              <span className="text-slate-500">•</span>{" "}
              <span className="text-slate-400">SuperAdmin</span>
            </div>
            <div className="text-xs text-slate-500">© 2026 Apex Arenas</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
