import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, AlertTriangle, TrendingUp,
  ShieldAlert, Lock, Monitor, Activity, RefreshCw,
  BadgeCheck, Wallet, ChevronRight, Gamepad2,
} from 'lucide-react';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { adminService } from '../../services/admin.service';
import type { AdminStats } from '../../types/admin.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;       // tailwind color token e.g. 'amber'
  subtext?: string;
  large?: boolean;
}

const ACCENTS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',  glow: 'shadow-amber-500/10' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',    glow: 'shadow-red-500/10' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',   glow: 'shadow-blue-500/10' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20', glow: 'shadow-purple-500/10' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20',   glow: 'shadow-cyan-500/10' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20', glow: 'shadow-orange-500/10' },
};

function StatCard({ label, value, icon: Icon, accent, subtext, large }: StatCardProps) {
  const c = ACCENTS[accent] ?? ACCENTS.blue;
  return (
    <div className={`relative rounded-2xl border ${c.border} bg-slate-900/70 p-5 overflow-hidden group hover:border-opacity-50 transition-all duration-200`}>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${c.glow} shadow-[inset_0_0_40px_0px]`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{label}</p>
          <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
        </div>
        <p className={`font-bold text-white ${large ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1.5">{subtext}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full bg-amber-400" />
      <Icon className="w-4 h-4 text-slate-400" />
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">{title}</h2>
    </div>
  );
}

// ─── Quick Link ───────────────────────────────────────────────────────────────

function QuickLink({ to, icon: Icon, label, sub, accent }: {
  to: string; icon: React.ElementType; label: string; sub: string; accent: string;
}) {
  const c = ACCENTS[accent] ?? ACCENTS.blue;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-4 rounded-xl border ${c.border} bg-slate-900/60 hover:bg-slate-800/60 transition-colors group`}
    >
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${c.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500 truncate">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid({ cols, count }: { cols: string; count: number }) {
  return (
    <div className={`grid ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-slate-800 rounded" />
            <div className="h-8 w-8 bg-slate-800 rounded-xl" />
          </div>
          <div className="h-8 w-16 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await adminService.fetchStats());
    } catch {
      setError('Failed to load dashboard stats. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchStats(); }, []);

  const name = admin?.firstName || admin?.username || 'Admin';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{fmtDate()}</p>
          <h1 className="text-3xl font-display font-bold text-white">
            {greeting()}, {name} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here's what's happening on the platform today.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="space-y-8">
          <SkeletonGrid cols="grid-cols-2 lg:grid-cols-4" count={4} />
          <SkeletonGrid cols="grid-cols-1 sm:grid-cols-3" count={3} />
          <SkeletonGrid cols="grid-cols-1 sm:grid-cols-3" count={3} />
        </div>
      ) : stats ? (
        <>
          {/* ── Users ─────────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={Users} title="Users" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users"   value={stats.users.total}      icon={Users}         accent="blue"    subtext="All registered accounts" />
              <StatCard label="Active"        value={stats.users.active}     icon={UserCheck}     accent="emerald" subtext="Currently active accounts" />
              <StatCard label="Banned"        value={stats.users.banned}     icon={UserX}         accent="red"     subtext="Accounts blocked by admin" />
              <StatCard label="Unverified"    value={stats.users.unverified} icon={AlertTriangle} accent="amber"   subtext="Email not yet confirmed" />
            </div>
          </section>

          {/* ── Growth ────────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={TrendingUp} title="Growth" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="New Today"      value={stats.users.newToday}      icon={TrendingUp} accent="cyan"   subtext="Registrations in last 24 h" />
              <StatCard label="New This Week"  value={stats.users.newThisWeek}   icon={TrendingUp} accent="blue"   subtext="Registrations this week" />
              <StatCard label="New This Month" value={stats.users.newThisMonth}  icon={TrendingUp} accent="purple" subtext="Registrations this month" />
            </div>
          </section>

          {/* ── Security ──────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={ShieldAlert} title="Security" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Failed Logins (24 h)"  value={stats.security.failedLogins24h}      icon={ShieldAlert}    accent="red"    subtext="Failed sign-in attempts" />
              <StatCard label="Locked Accounts"        value={stats.security.lockedAccounts}        icon={Lock}           accent="orange" subtext="Accounts locked after failures" />
              <StatCard label="Suspicious Activity"    value={stats.security.suspiciousActivities}  icon={AlertTriangle}  accent="red"    subtext="Flagged for review" />
            </div>
          </section>

          {/* ── Sessions & System ─────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={Activity} title="Sessions & System" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Active Sessions"      value={stats.sessions.activeSessions}                        icon={Monitor}  accent="emerald" />
              <StatCard label="Avg Sessions / User"  value={stats.sessions.averageSessionsPerUser.toFixed(1)}     icon={Activity} accent="blue" />
              {stats.system.version && (
                <StatCard label="System Version"    value={stats.system.version}                                 icon={Monitor}  accent="purple" />
              )}
            </div>
          </section>

          {/* ── Quick Actions ─────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={ChevronRight} title="Quick Access" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickLink to="/admin/users"         icon={Users}     label="Manage Users"    sub="Search, ban, change roles"    accent="blue" />
              <QuickLink to="/admin/verifications" icon={BadgeCheck} label="Verifications"  sub="Review organizer applications" accent="amber" />
              <QuickLink to="/admin/payouts"       icon={Wallet}    label="Payouts"         sub="Approve withdrawal requests"   accent="emerald" />
              <QuickLink to="/admin/games"         icon={Gamepad2}  label="Games"           sub="Manage platform games"         accent="purple" />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
