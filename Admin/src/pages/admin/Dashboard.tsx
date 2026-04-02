import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Activity,
  TrendingUp,
  AlertTriangle,
  Lock,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { adminService } from '../../services/admin.service';
import type { AdminStats } from '../../types/admin.types';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: 'amber' | 'green' | 'red' | 'blue' | 'purple' | 'cyan';
  subtext?: string;
}

const colorMap = {
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};

const StatCard = ({ label, value, icon: Icon, color, subtext }: StatCardProps) => (
  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.fetchStats();
      setStats(data);
    } catch {
      setError('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const firstName = admin?.firstName || admin?.username || 'Admin';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Here's an overview of the platform
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 animate-pulse">
              <div className="h-4 w-20 bg-slate-800 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* User Stats */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              User Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.users.total} icon={Users} color="blue" />
              <StatCard label="Active Users" value={stats.users.active} icon={UserCheck} color="green" />
              <StatCard label="Banned Users" value={stats.users.banned} icon={UserX} color="red" />
              <StatCard
                label="Unverified"
                value={stats.users.unverified}
                icon={AlertTriangle}
                color="amber"
              />
            </div>
          </div>

          {/* Growth */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-400" />
              Growth
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="New Today" value={stats.users.newToday} icon={TrendingUp} color="cyan" />
              <StatCard label="This Week" value={stats.users.newThisWeek} icon={TrendingUp} color="blue" />
              <StatCard label="This Month" value={stats.users.newThisMonth} icon={TrendingUp} color="purple" />
            </div>
          </div>

          {/* Security */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-slate-400" />
              Security
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Failed Logins (24h)"
                value={stats.security.failedLogins24h}
                icon={ShieldAlert}
                color="red"
              />
              <StatCard
                label="Locked Accounts"
                value={stats.security.lockedAccounts}
                icon={Lock}
                color="amber"
              />
              <StatCard
                label="Suspicious Activity"
                value={stats.security.suspiciousActivities}
                icon={AlertTriangle}
                color="red"
              />
            </div>
          </div>

          {/* Sessions & System */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" />
              Sessions & System
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Active Sessions"
                value={stats.sessions.activeSessions}
                icon={Monitor}
                color="green"
              />
              <StatCard
                label="Avg Sessions/User"
                value={stats.sessions.averageSessionsPerUser.toFixed(1)}
                icon={Activity}
                color="blue"
              />
              {stats.system.version && (
                <StatCard
                  label="System Version"
                  value={stats.system.version}
                  icon={Monitor}
                  color="purple"
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
