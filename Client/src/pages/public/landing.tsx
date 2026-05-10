import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Shield, Cpu, Smartphone, Users, Globe, Award,
  Trophy, Zap, ArrowRight, ChevronRight,
  Gamepad2, ArrowUpRight,
} from "lucide-react";
import { tournamentService, type Tournament } from "../../services/tournament.service";

// ─── data ────────────────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  { icon: Shield,     color: "text-cyan-400",   bg: "bg-cyan-400/10",   title: "Guaranteed prize pools",  desc: "Every prize is locked in escrow before registration opens. You compete knowing the reward is real." },
  { icon: Cpu,        color: "text-indigo-400", bg: "bg-indigo-400/10", title: "Fair dispute resolution",  desc: "Verified moderators, match-evidence workflows, and clear rules — so every result stands on merit." },
  { icon: Smartphone, color: "text-emerald-400",bg: "bg-emerald-400/10",title: "Instant winner payouts",   desc: "MTN MoMo, Vodafone Cash, AirtelTigo. Your win is confirmed, your money moves — no waiting." },
  { icon: Users,      color: "text-violet-400", bg: "bg-violet-400/10", title: "Build your player career", desc: "Profiles, stats, highlights, and a ranking system that tracks your growth across every tournament." },
  { icon: Globe,      color: "text-sky-400",    bg: "bg-sky-400/10",    title: "Every format, one arena",  desc: "Online, LAN, hybrid — a single bracket tool built for Mobile Legends, CODM, EA FC, PUBG, and more." },
  { icon: Award,      color: "text-amber-400",  bg: "bg-amber-400/10",  title: "Verified organizers",      desc: "Every organizer on the platform is vetted. Legit tournaments, clear rules, and real accountability." },
];

const STEPS = [
  { n: "01", title: "Claim your handle",      desc: "Set up your account in minutes. Lock in the IGN that'll carry your legacy across every bracket." },
  { n: "02", title: "Pick your arena",        desc: "Browse verified tournaments with clear rules, trusted organizers, and brackets that actually run." },
  { n: "03", title: "Compete with proof",     desc: "Play, submit match evidence, and have every result logged — no disputes, no he-said-she-said." },
  { n: "04", title: "Win and get paid",       desc: "Verified win = automatic Mobile Money payout. The moment it's confirmed, it's yours." },
];

// ─── Game image fallbacks (used when tournament has no thumbnail) ─────────────
const GAME_IMG: Record<string, string> = {
  "mobile legends": "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
  "call of duty":   "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=1200&auto=format&fit=crop",
  "pubg":           "https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=1200&auto=format&fit=crop",
  "ea fc":          "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop",
  "fifa":           "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop",
  "free fire":      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop",
  "tekken":         "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop",
};
const FALLBACK_IMG = "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop";

function getTournamentImg(t: Tournament): string {
  if (t.thumbnailUrl) return t.thumbnailUrl;
  if (t.bannerUrl) return t.bannerUrl;
  const name = (t.game?.name ?? "").toLowerCase();
  for (const [key, url] of Object.entries(GAME_IMG)) {
    if (name.includes(key)) return url;
  }
  return FALLBACK_IMG;
}

function formatGhs(minorUnits: number): string {
  return `GHS ${(minorUnits / 100).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Featured trio shown as a mosaic
const FEATURED_TRIO = [
  { title: "EA FC 26",       tag: "Football · 1v1",    img: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop", prize: "GHS 1,000+", span: "col-span-2 row-span-2" },
  { title: "Mortal Kombat",  tag: "Fighter · 1v1",     img: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop",  prize: "GHS 800+",   span: "col-span-1 row-span-1" },
  { title: "DLS 26",         tag: "Mobile Football",   img: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop",  prize: "GHS 500+",   span: "col-span-1 row-span-1" },
];

const GAMES = [
  { title: "Mobile Legends", tag: "5v5 MOBA",     img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop",  prize: "GHS 500+" },
  { title: "Call of Duty",   tag: "FPS",           img: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop", prize: "GHS 2,000+" },
  { title: "PUBG Mobile",    tag: "Battle Royale", img: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=800&auto=format&fit=crop", prize: "GHS 1,200+" },
  { title: "Free Fire",      tag: "BR · Squads",   img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop",  prize: "GHS 1,500+" },
];

const TESTIMONIALS = [
  { quote: "This is the first platform where my rank actually means something. Every win is on the record — that's legacy.", name: "Phoenix GG",   role: "MLBB · 3× tournament winner", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop" },
  { quote: "The bracket ran clean, results were verified, and no one could dispute our win. That's how it should always be.", name: "Ada Boateng", role: "CODM · Team Captain",          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop" },
  { quote: "We've run 40+ brackets on Apex. The organizer tools are unmatched — our players trust every tournament we post.", name: "Nana Asante", role: "Organizer · Accra Esports",   avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" },
];

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  live:      { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", label: "Live"   },
  ongoing:   { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", label: "Live"   },
  started:   { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", label: "Live"   },
  open:      { cls: "bg-cyan-500/15    text-cyan-300    border-cyan-500/25",    label: "Open"   },
  published: { cls: "bg-cyan-500/15    text-cyan-300    border-cyan-500/25",    label: "Open"   },
  locked:    { cls: "bg-violet-500/15  text-violet-300  border-violet-500/25",  label: "Locked" },
};

// ─── Landing ─────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(["open", "published", "ongoing", "started", "live", "locked"]);

const Landing = () => {
  const reduceMotion = useReducedMotion();
  const [featured, setFeatured] = useState<Tournament[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  // Plain function — does NOT call any hooks, safe to call anywhere in JSX
  const fade = (delay = 0) => {
    if (reduceMotion) return {};
    return {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.12 },
      transition: { duration: 0.55, ease: EASE, delay },
    };
  };

  useEffect(() => {
    let cancelled = false;
    tournamentService.getTournaments({ limit: 10 })
      .then(({ tournaments }) => {
        if (cancelled) return;
        // Sort: live/ongoing first, then open, then others
        const order = { ongoing: 0, started: 0, live: 0, open: 1, published: 1, locked: 2 };
        const active = tournaments
          .filter((t) => ACTIVE_STATUSES.has(t.status) && t.visibility === "public")
          .sort((a, b) => (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9))
          .slice(0, 3);
        setFeatured(active);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFeaturedLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="text-white overflow-x-hidden">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at -15% 0%, rgba(6,182,212,0.18), transparent)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 115% 30%, rgba(99,102,241,0.18), transparent)" }} />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.035) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-24 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left — text */}
            <div>
              <motion.span {...fade(0)} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-1.5 text-cyan-200 text-xs sm:text-sm font-medium">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Next-gen esports infrastructure for West Africa</span>
              </motion.span>

              <motion.h1 {...fade(0.05)} className="font-display text-[2.2rem] sm:text-5xl lg:text-[2.2rem] xl:text-[2.8rem] font-bold tracking-tight leading-[1.1] mt-5">
                <span className="block">Build your legacy in</span>
                <span className="block text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-sky-400 to-cyan-300">
                  verified esports tournaments
                </span>
              </motion.h1>

              <motion.p {...fade(0.1)} className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed max-w-md">
                Escrow-backed prizes, instant payouts, verified organizers, and real results — every match, every time.
              </motion.p>

              <motion.div {...fade(0.15)} className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-px transition-all duration-200"
                >
                  Start competing free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-500 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
                >
                  Browse tournaments
                </Link>
              </motion.div>
            </div>

            {/* Right — platform screenshot */}
            <motion.div {...fade(0.15)} className="hidden lg:block relative">
              {/* Glow behind screenshot */}
              <div className="absolute -inset-4 rounded-3xl bg-cyan-500/10 blur-2xl pointer-events-none" />
              <div className="absolute -inset-4 rounded-3xl bg-indigo-500/8 blur-3xl pointer-events-none" />
              {/* Screenshot frame */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/70 shadow-2xl shadow-black/70 ring-1 ring-white/5">
                {/* Fake browser bar */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 border-b border-slate-700/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <div className="ml-2 flex-1 h-5 rounded bg-slate-700/60 flex items-center px-2">
                    <span className="text-[10px] text-slate-500">apexarenas.com</span>
                  </div>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=1200&auto=format&fit=crop"
                  alt="Esports players competing at Apex Arenas"
                  className="w-full object-cover object-center aspect-video"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 pb-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-slate-800/80 overflow-hidden divide-x divide-y md:divide-y-0 divide-slate-800/60">
            {[
              { value: "100%", label: "Prize security",         sub: "Escrow guaranteed",       color: "text-cyan-300"    },
              { value: "0%",   label: "Payout risk",            sub: "Winners always get paid",  color: "text-emerald-300" },
              { value: "100%", label: "Verified organizers",    sub: "Every tournament vetted",  color: "text-amber-300"   },
              { value: "100%", label: "Fee transparency",       sub: "No hidden charges",        color: "text-violet-300"  },
            ].map((s, i) => (
              <motion.div key={s.label} {...fade(i * 0.06)} className="bg-slate-900/70 px-4 py-6 sm:px-6 sm:py-7 text-center">
                <p className={`font-display text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">{s.label}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured tournaments ─────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-14 sm:py-20 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.div {...fade()} className="flex items-end justify-between flex-wrap gap-4 mb-8 sm:mb-10">
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-[0.2em] mb-2.5">Featured this week</p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">Brackets dropping now</h2>
            </div>
            <Link to="/auth/player/join-tournament" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {featuredLoading ? (
              // Skeleton placeholders while loading
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 animate-pulse">
                  <div className="h-44 bg-slate-800" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : featured.length > 0 ? (
              featured.map((t, i) => {
                const chip = STATUS_CHIP[t.status];
                const img = getTournamentImg(t);
                return (
                  <motion.div key={t.id} {...fade(i * 0.06)}>
                    <Link
                      to="/login"
                      className="group block rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 hover:border-cyan-500/40 transition-all"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <img src={img} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        {chip && (
                          <div className="absolute top-3 left-3">
                            <span className={`text-[11px] px-2 py-1 rounded-full border font-semibold backdrop-blur-sm ${chip.cls}`}>
                              {chip.label}
                            </span>
                          </div>
                        )}
                        {t.prizePool && t.prizePool > 0 && (
                          <div className="absolute top-3 right-3 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 px-2.5 py-1 text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> {formatGhs(t.prizePool)}
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 right-3">
                          {t.game?.name && (
                            <p className="text-[11px] text-cyan-300 font-medium flex items-center gap-1.5">
                              <Gamepad2 className="w-3 h-3" /> {t.game.name}
                            </p>
                          )}
                          <h3 className="font-display text-xl font-bold text-white mt-0.5 leading-tight line-clamp-2">{t.title}</h3>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> {t.currentCount}/{t.maxParticipants} registered
                        </span>
                        <span className="text-slate-400">
                          Entry · <span className="text-white font-semibold">{t.isFree ? "Free" : formatGhs(t.entryFee)}</span>
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            ) : (
              // No active tournaments — prompt to check back
              <div className="md:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                <Trophy className="w-10 h-10 mx-auto text-slate-700 mb-4" />
                <p className="font-display text-xl font-bold text-white">New brackets dropping soon</p>
                <p className="text-sm text-slate-500 mt-2">Sign up to get notified when new tournaments go live.</p>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all"
                >
                  Create account <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Games showcase ───────────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-14 sm:py-20 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.div {...fade()} className="flex items-end justify-between flex-wrap gap-4 mb-8 sm:mb-10">
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-[0.2em] mb-2.5">Supported titles</p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">Compete in every title that matters</h2>
              <p className="text-slate-400 text-sm sm:text-lg mt-3 max-w-xl">From 5v5 MOBA to 1v1 fighters — if it's competitive in West Africa, there's a bracket here.</p>
            </div>
            <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors shrink-0">
              View all titles <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* ── Featured trio mosaic — hidden on mobile, too complex ── */}
          <motion.div {...fade(0.05)} className="hidden sm:grid grid-cols-3 grid-rows-2 gap-2 h-105 mb-3 rounded-2xl overflow-hidden border border-slate-800/80">
            {/* FC 26 — large left (spans 2 cols × 2 rows) */}
            <div className="col-span-2 row-span-2 group relative overflow-hidden cursor-pointer">
              <img
                src={FEATURED_TRIO[0].img}
                alt={FEATURED_TRIO[0].title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/30 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-r from-transparent to-slate-950/40" />
              <div className="absolute bottom-5 left-5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 border border-cyan-500/25 px-2 py-0.5 rounded-full mb-2">
                  {FEATURED_TRIO[0].tag}
                </span>
                <h3 className="font-display text-3xl font-bold text-white">{FEATURED_TRIO[0].title}</h3>
                <p className="text-amber-300 text-sm font-semibold mt-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" /> Prize pool from {FEATURED_TRIO[0].prize}
                </p>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-950/60 backdrop-blur-sm border border-slate-700/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Mortal Kombat — top right */}
            <div className="col-span-1 row-span-1 group relative overflow-hidden cursor-pointer">
              <img
                src={FEATURED_TRIO[1].img}
                alt={FEATURED_TRIO[1].title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-orange-300">{FEATURED_TRIO[1].tag}</p>
                <h4 className="font-display text-base font-bold text-white leading-tight">{FEATURED_TRIO[1].title}</h4>
                <p className="text-[10px] text-amber-300 font-semibold">{FEATURED_TRIO[1].prize}</p>
              </div>
            </div>

            {/* DLS 26 — bottom right */}
            <div className="col-span-1 row-span-1 group relative overflow-hidden cursor-pointer">
              <img
                src={FEATURED_TRIO[2].img}
                alt={FEATURED_TRIO[2].title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">{FEATURED_TRIO[2].tag}</p>
                <h4 className="font-display text-base font-bold text-white leading-tight">{FEATURED_TRIO[2].title}</h4>
                <p className="text-[10px] text-amber-300 font-semibold">{FEATURED_TRIO[2].prize}</p>
              </div>
            </div>
          </motion.div>

          {/* ── More games portrait row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:mt-3">
            {GAMES.map((g, i) => (
              <motion.div key={g.title} {...fade(i * 0.05)}
                className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer"
                style={{ aspectRatio: "3/4" }}
              >
                <img src={g.img} alt={g.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="text-[10px] text-cyan-300 font-medium uppercase tracking-wider">{g.tag}</p>
                  <p className="font-display text-sm font-bold text-white leading-tight mt-0.5">{g.title}</p>
                  <p className="text-[10px] text-amber-300 mt-1 font-semibold">{g.prize}</p>
                </div>
                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-slate-950/70 backdrop-blur-sm border border-slate-700/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-14 sm:py-20 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.div {...fade()} className="max-w-2xl mb-10 sm:mb-12">
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-[0.2em] mb-2.5">Why Apex Arenas</p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Built for players who{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-sky-400">
                compete to leave a mark
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg mt-3">
              Every corner of the platform is built to keep the game honest — so your skill, your results, and your name mean something real.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fade(i * 0.05)}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 hover:border-cyan-500/30 hover:bg-slate-900 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${f.bg} ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-14 sm:py-20 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.div {...fade()} className="flex items-end justify-between flex-wrap gap-4 mb-10 sm:mb-12">
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-[0.2em] mb-2.5">How it works</p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">From signup to champion — four steps</h2>
            </div>
            <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...fade(i * 0.07)}
                className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 overflow-hidden"
              >
                <p className="font-display text-6xl font-bold text-transparent bg-clip-text bg-linear-to-b from-cyan-500/40 to-transparent">{s.n}</p>
                <h3 className="font-display text-lg font-bold text-white mt-2">{s.title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-10 -right-2 w-5 h-5 text-slate-700" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-14 sm:py-20 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.div {...fade()} className="max-w-2xl mb-10 sm:mb-12">
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-[0.2em] mb-2.5">From the arena</p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">Trusted by the scene</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} {...fade(i * 0.07)}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <Trophy className="w-5 h-5 text-cyan-400/60" />
                <p className="text-slate-200 mt-4 leading-relaxed text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-800">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-14 sm:py-24 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <motion.div {...fade()}
            className="relative rounded-2xl sm:rounded-3xl border border-cyan-500/25 overflow-hidden p-8 sm:p-10 md:p-14 text-center"
            style={{ background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(6,182,212,0.15), transparent), #0f172a" }}
          >
            <Trophy className="w-9 h-9 sm:w-10 sm:h-10 mx-auto text-amber-400" />
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight mt-4">
              Your next bracket is live
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-xl mx-auto">
              Sign up free, lock in your handle, and step into verified competition — your legacy starts here.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7 sm:mt-8">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm sm:text-base font-bold hover:shadow-2xl hover:shadow-orange-500/25 hover:-translate-y-px transition-all duration-200"
              >
                Start competing free <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700 text-slate-300 text-sm sm:text-base font-medium hover:border-slate-500 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
              >
                I already have an account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default Landing;
