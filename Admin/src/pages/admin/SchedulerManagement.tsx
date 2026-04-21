import { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { adminService, type SchedulerStatus } from '../../services/admin.service';

type SchedulerJob = 'auto-lock' | 'auto-start' | 'check-in-reminders' | 'disqualify-no-shows' | 'auto-forfeit' | 'match-ready-checks';

const JOBS: { id: SchedulerJob; label: string; description: string }[] = [
  { id: 'auto-lock', label: 'Auto Lock', description: 'Lock registrations for tournaments whose registration window has closed' },
  { id: 'auto-start', label: 'Auto Start', description: 'Automatically start tournaments that are scheduled to begin' },
  { id: 'check-in-reminders', label: 'Check-in Reminders', description: 'Send check-in reminder notifications to registered players' },
  { id: 'disqualify-no-shows', label: 'Disqualify No-Shows', description: 'Remove players who did not check in from upcoming tournaments' },
  { id: 'auto-forfeit', label: 'Auto Forfeit', description: 'Forfeit matches where a player has not responded in time' },
  { id: 'match-ready-checks', label: 'Match Ready Checks', description: 'Process ready-check expirations and advance matches' },
];

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function SchedulerManagement() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningJob, setRunningJob] = useState<SchedulerJob | null>(null);
  const [jobMsg, setJobMsg] = useState('');
  const [jobError, setJobError] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getSchedulerStatus();
      setStatus(data);
    } catch {
      setError('Failed to load scheduler status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleRunJob = async (job: SchedulerJob) => {
    setRunningJob(job);
    setJobMsg('');
    setJobError('');
    const ok = await adminService.runSchedulerJob(job);
    setRunningJob(null);
    if (ok) setJobMsg(`"${JOBS.find(j => j.id === job)?.label}" completed successfully.`);
    else setJobError(`Failed to run "${job}".`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-display font-bold text-white">Scheduler</h1>
                  {/* Running status indicator */}
                  {!loading && status && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                      <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span className={`text-xs font-medium ${status.isRunning ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {status.isRunning ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">Monitor and manually trigger background jobs.</p>
              </div>
            </div>
            <button
              onClick={loadStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Job feedback */}
        {jobMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {jobMsg}
          </div>
        )}
        {jobError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {jobError}
          </div>
        )}

        {/* Status card */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : status && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${status.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-sm font-medium text-white">
                Scheduler is {status.isRunning ? 'running' : 'stopped'}
              </span>
            </div>

            {(status.lastRun || status.nextRun) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {status.lastRun && (
                  <div>
                    <p className="text-slate-500 text-xs mb-2.5 font-semibold uppercase tracking-wider">Last Run</p>
                    <div className="space-y-1.5">
                      {Object.entries(status.lastRun).map(([job, time]) => (
                        <div key={job} className="flex justify-between gap-4">
                          <span className="text-slate-400 capitalize text-sm">{job.replace(/-/g, ' ')}</span>
                          <span className="text-white text-sm font-mono">{formatDate(time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {status.nextRun && (
                  <div>
                    <p className="text-slate-500 text-xs mb-2.5 font-semibold uppercase tracking-wider">Next Run</p>
                    <div className="space-y-1.5">
                      {Object.entries(status.nextRun).map(([job, time]) => (
                        <div key={job} className="flex justify-between gap-4">
                          <span className="text-slate-400 capitalize text-sm">{job.replace(/-/g, ' ')}</span>
                          <span className="text-white text-sm font-mono">{formatDate(time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Jobs */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Manual Triggers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {JOBS.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">{job.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{job.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRunJob(job.id)}
                  disabled={runningJob !== null}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {runningJob === job.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
