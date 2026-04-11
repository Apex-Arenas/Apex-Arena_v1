import { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 p-2.5 rounded-xl">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Scheduler</h1>
            <p className="text-sm text-slate-400">Monitor and manually trigger background jobs</p>
          </div>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Job feedback */}
      {jobMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {jobMsg}
        </div>
      )}
      {jobError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {jobError}
        </div>
      )}

      {/* Status card */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : status && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status.isRunning ? 'bg-green-400' : 'bg-slate-500'}`} />
            <span className="text-sm font-medium text-white">
              Scheduler is {status.isRunning ? 'running' : 'stopped'}
            </span>
          </div>

          {(status.lastRun || status.nextRun) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {status.lastRun && (
                <div>
                  <p className="text-slate-500 text-xs mb-2 font-medium uppercase tracking-wide">Last Run</p>
                  <div className="space-y-1.5">
                    {Object.entries(status.lastRun).map(([job, time]) => (
                      <div key={job} className="flex justify-between">
                        <span className="text-slate-400 capitalize">{job.replace(/-/g, ' ')}</span>
                        <span className="text-white">{formatDate(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {status.nextRun && (
                <div>
                  <p className="text-slate-500 text-xs mb-2 font-medium uppercase tracking-wide">Next Run</p>
                  <div className="space-y-1.5">
                    {Object.entries(status.nextRun).map(([job, time]) => (
                      <div key={job} className="flex justify-between">
                        <span className="text-slate-400 capitalize">{job.replace(/-/g, ' ')}</span>
                        <span className="text-white">{formatDate(time)}</span>
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
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Manual Triggers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {JOBS.map((job) => (
            <div
              key={job.id}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">{job.label}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{job.description}</p>
              </div>
              <button
                onClick={() => handleRunJob(job.id)}
                disabled={runningJob !== null}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
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
  );
}
