import { Link } from "react-router-dom";
import {
  Trophy,
  Shield,
  Zap,
  Users,
  Globe,
  Smartphone,
  Award,
  CheckCircle,
  Sparkles,
  Cpu,
  Radar,
  ArrowRight,
  Wallet,
  Crown,
} from "lucide-react";

const Landing = () => {
  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Escrow-locked prizes",
      description:
        "Every prize is secured before a bracket goes live. Zero payout drama.",
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "Integrity workflow",
      description:
        "Clear rules, verified brackets, and transparent results tracking.",
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile money ready",
      description:
        "MTN, Vodafone, AirtelTigo integrations for instant GHS payouts.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Player career stack",
      description:
        "Profiles, stats, and highlights that help players get discovered.",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Hybrid tournaments",
      description:
        "Online, offline, and hybrid formats supported in one workflow.",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Organizer control",
      description:
        "Brackets, streaming, payments, and prize distribution in one place.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Create your handle",
      description: "Set up your account in minutes and lock in your identity.",
    },
    {
      number: "02",
      title: "Pick a verified arena",
      description: "Join tournaments with secured prize pools and clear rules.",
    },
    {
      number: "03",
      title: "Compete with proof",
      description: "Play, submit results, and keep outcomes accountable.",
    },
    {
      number: "04",
      title: "Cash out instantly",
      description: "Automatic Mobile Money payouts when you win.",
    },
  ];

  const stats = [
    { label: "Prize security", value: "100%", sub: "Escrow guaranteed" },
    { label: "Payment risk", value: "0%", sub: "Protected payouts" },
    { label: "Platform fee", value: "10%", sub: "Lowest in region" },
    { label: "Escrow fee", value: "1%", sub: "Transparent charges" },
  ];

  return (
    <div className="min-h-screen bg-transparent text-white">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap");
        .font-display { font-family: "Rajdhani", sans-serif; }
        .font-body { font-family: "Space Grotesk", sans-serif; }
        .grid-bg { background-image: radial-gradient(circle at 1px 1px, rgba(148,163,184,0.15) 1px, transparent 0); background-size: 32px 32px; }
        .glow-orb { filter: blur(40px); opacity: 0.35; }
        .float-slow { animation: float 9s ease-in-out infinite; }
        .float-fast { animation: float 6s ease-in-out infinite; }
        .scanline { background: linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent); animation: sweep 6s linear infinite; }
        .shine { background-size: 200% 200%; animation: gradientShift 10s ease infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-18px); } }
        @keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-cyan-400 glow-orb float-slow" />
        <div className="absolute top-10 right-0 w-96 h-96 rounded-full bg-indigo-500 glow-orb float-fast" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-1 gap-12 items-center">
            <div className="font-body">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-cyan-200 text-sm">
                <Sparkles className="w-4 h-4" />
                Next-gen esports infrastructure for West Africa
              </div>
              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mt-6">
                Build your legacy in a
                <span className="block text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400">
                  verified tournament arena
                </span>
              </h1>
              <p className="text-lg text-slate-300 mt-6 max-w-xl">
                Apex Arenas locks prize pools in escrow, verifies results with
                trusted workflows, and pays winners instantly. Compete with
                confidence, every time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-slate-950 bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  Start competing free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-cyan-200 border border-cyan-400/40 rounded-lg hover:bg-cyan-400/10 transition-colors"
                >
                  Browse tournaments
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-cyan-300" />
                  Escrow-backed payouts
                </div>
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-indigo-300" />
                  Dispute resolution support
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  Verified tournament operators
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signal Strip */}
        <section className="border-y border-slate-800 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-body">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="text-3xl font-display font-bold text-cyan-200">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-300 mt-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
        <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center font-body mb-12">
            <p className="text-cyan-300 text-sm tracking-widest uppercase">
              Core systems
            </p>
            <h2 className="font-display text-4xl font-bold mt-3">
              Built for Ghana's esports ecosystem
            </h2>
            <p className="text-slate-300 mt-4 max-w-2xl mx-auto">
              We engineered a tournament stack that protects players, empowers
              organizers, and guarantees payouts.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 font-body">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 to-slate-950 p-6 hover:border-cyan-400/60 transition-all"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-400/10 text-cyan-300 mb-4 group-hover:bg-cyan-400/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-slate-300 mt-3">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
        <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12 items-start">
            <div className="font-body">
              <p className="text-indigo-300 text-sm tracking-widest uppercase">
                Arena flow
              </p>
              <h2 className="font-display text-4xl font-bold mt-3">
                From sign up to payout in four steps
              </h2>
              <p className="text-slate-300 mt-4">
                A streamlined pipeline that keeps tournaments fair and payments
                instant.
              </p>
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">Apex Integrity Shield</span>
                </div>
                <p className="text-sm text-slate-400 mt-3">
                  We monitor brackets, disputes, and payout health in real time.
                </p>
              </div>
            </div>
            <div className="space-y-4 font-body">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-indigo-400/60 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="font-display text-2xl font-bold text-indigo-300">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {step.title}
                      </h3>
                      <p className="text-slate-300 mt-2">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Organizers */}
        <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-800 bg-linear-to-r from-slate-900 via-slate-950 to-slate-900 p-8 lg:p-12">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
              <div className="font-body">
                <p className="text-cyan-300 text-sm tracking-widest uppercase">
                  For organizers
                </p>
                <h2 className="font-display text-4xl font-bold mt-3">
                  Run tournaments with pro-grade trust
                </h2>
                <p className="text-slate-300 mt-4">
                  Secure escrow, automated registration, streaming tools, and
                  verified players. Everything you need to host with confidence.
                </p>
                <ul className="mt-6 space-y-3 text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-cyan-300" />
                    Mandatory prize escrow builds trust
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-cyan-300" />
                    90% of entry fees go to you
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-cyan-300" />
                    Access verified player database
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 font-body">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-300 to-orange-400 flex items-center justify-center text-slate-950">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Organizer tier</p>
                    <p className="text-lg font-semibold">Prime Operator</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Escrow coverage</span>
                    <span className="text-cyan-200">100%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average payout time</span>
                    <span className="text-cyan-200">Instant</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Support</span>
                    <span className="text-cyan-200">24/7</span>
                  </div>
                </div>
                <Link
                  to="/signup"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 px-6 py-3 font-semibold text-slate-950 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  Become an organizer
                  <Users className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center font-body">
          <div className="rounded-3xl border border-slate-800 bg-linear-to-r from-slate-900 via-slate-950 to-slate-900 p-10 lg:p-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-cyan-200 text-sm">
              <Zap className="w-4 h-4" />
              Join Ghana's most trusted esports platform
            </div>
            <h2 className="font-display text-4xl font-bold mt-6">
              Ready to compete with confidence?
            </h2>
            <p className="text-slate-300 mt-4 max-w-2xl mx-auto">
              No more empty promises. Escrow-backed prizes, verified
              tournaments, and instant payouts for winners.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-slate-950 bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 rounded-lg hover:shadow-xl hover:shadow-cyan-500/30 transition-all"
              >
                Create free account
                <Trophy className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-cyan-200 border border-cyan-400/40 rounded-lg hover:bg-cyan-400/10 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
