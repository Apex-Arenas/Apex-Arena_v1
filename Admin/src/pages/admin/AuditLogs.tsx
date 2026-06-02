import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, ShieldAlert, AlertTriangle, AlertCircle,
  CheckCircle, XCircle, RefreshCw, ChevronDown, User,
  Zap, Wallet, Trophy, UserCheck, Shield, Globe,
} from 'lucide-react';
import {
  activityFeedService,
  type ActivityFeedItem,
  type FeedCategory,
  type FeedSeverity,
} from '../../services/activity-feed.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleString();
}

const PLATFORM_EVENT_ICONS: Record<string, React.ElementType> = {
  organizer_request_submitted:   UserCheck,
  organizer_request_resubmitted: UserCheck,
  dispute_flagged:               ShieldAlert,
  payout_pending_review:         Wallet,
  payout_anomaly:                AlertCircle,
  game_request_submitted:        Zap,
  winner_verification_failed:    Trophy,
  tournament_escrow_flagged:     AlertCircle,
  tournament_completed:          Trophy,
  system_alert:                  AlertTriangle,
};

const AUTH_EVENT_ICONS: Record<string, React.ElementType> = {
  login_success:      CheckCircle,
  login_failed:       XCircle,
  logout:             Shield,
  password_change:    ShieldAlert,
  suspicious_activity: AlertCircle,
  new_device_login:   Globe,
  brute_force_detected: AlertCircle,
  account_locked:     AlertCircle,
  '2fa_enabled':      Shield,
  '2fa_disabled':     ShieldAlert,
};

function getItemIcon(item: ActivityFeedItem): React.ElementType {
  if (item.feedType === 'platform_event') {
    return PLATFORM_EVENT_ICONS[item.eventType ?? ''] ?? Activity;
  }
  return AUTH_EVENT_ICONS[item.authEventType ?? ''] ?? User;
}

// ── Row ───────────────────────────────────────────────────────────────────────

function FeedRow({ item }: { item: ActivityFeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getItemIcon(item);
  const isPlatform = item.feedType === 'platform_event';

  const sevColor = isPlatform
    ? item.severity === 'critical'     ? 'text-red-400 bg-red-500/10'
    : item.severity === 'action_required' ? 'text-amber-400 bg-amber-500/10'
    : 'text-blue-400 bg-blue-500/10'
    : item.isSuspicious
    ? 'text-red-400 bg-red-500/10'
    : item.success === false
    ? 'text-amber-400 bg-amber-500/10'
    : 'text-green-400 bg-green-500/10';

  const sevBadge = isPlatform
    ? item.severity === 'critical'     ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : item.severity === 'action_required' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    : item.isSuspicious
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : item.success === false
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-green-500/15 text-green-400 border-green-500/30';

  const badgeLabel = isPlatform
    ? (item.severity ?? 'info').replace('_', ' ')
    : item.isSuspicious ? 'suspicious'
    : item.success === false ? 'failed'
    : 'success';

  const hasDetails = !!(item.actor || item.ipAddress || item.username || item.failureReason || item.riskScore);

  return (
    <div className="border-b border-slate-800/50">
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Type indicator */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${sevColor}`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${sevBadge}`}>
                {badgeLabel}
              </span>
              {!isPlatform && item.authEventType && (
                <span className="text-[10px] text-slate-600 font-mono">
                  {item.authEventType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <span className="flex-shrink-0 text-[11px] text-slate-500 whitespace-nowrap">
              {relativeTime(item.createdAt)}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.message}</p>

          {/* Quick context */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
            {item.actor && (
              <span className="text-[11px] text-slate-500">
                Actor: <span className="text-slate-300">@{item.actor.username}</span>
              </span>
            )}
            {item.username && !item.actor && (
              <span className="text-[11px] text-slate-500">
                User: <span className="text-slate-300">@{item.username}</span>
              </span>
            )}
            {item.ipAddress && (
              <span className="text-[11px] text-slate-500">
                IP: <span className="text-slate-300 font-mono">{item.ipAddress}</span>
              </span>
            )}
            {item.riskScore != null && item.riskScore > 0 && (
              <span className="text-[11px] text-slate-500">
                Risk: <span className="text-red-400 font-semibold">{item.riskScore}/100</span>
              </span>
            )}
          </div>

          {/* Expand for more details */}
          {hasDetails && item.failureReason && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}

          {expanded && item.failureReason && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400">
              <span className="text-slate-500 mr-2">Reason:</span>{item.failureReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const LIMIT = 30;

const categoryTabs: { key: FeedCategory; label: string }[] = [
  { key: 'all',      label: 'All Activity' },
  { key: 'platform', label: 'Platform Events' },
  { key: 'security', label: 'Security Events' },
];

const severityOptions: { value: '' | FeedSeverity; label: string }[] = [
  { value: '',                label: 'All severities' },
  { value: 'critical',        label: 'Critical' },
  { value: 'action_required', label: 'Action Required' },
  { value: 'info',            label: 'Info' },
];

export default function AuditLogs() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [category, setCategory] = useState<FeedCategory>('all');
  const [severity, setSeverity] = useState<'' | FeedSeverity>('');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);

  const loadingRef = useRef(false);

  const load = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const result = await activityFeedService.getFeed({
        limit: LIMIT,
        before: reset ? undefined : cursor ?? undefined,
        category,
        severity: severity || undefined,
        suspiciousOnly: suspiciousOnly || undefined,
      });

      setItems((prev) => reset ? result.items : [...prev, ...result.items]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity feed');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [cursor, category, severity, suspiciousOnly]);

  // Reset and reload when filters change
  useEffect(() => {
    setCursor(null);
    setItems([]);
    setHasMore(false);
    void activityFeedService.getFeed({
      limit: LIMIT,
      category,
      severity: severity || undefined,
      suspiciousOnly: suspiciousOnly || undefined,
    }).then((result) => {
      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load activity feed');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, severity, suspiciousOnly]);

  const refresh = () => {
    setCursor(null);
    setItems([]);
    void load(true);
  };

  const loadMore = () => void load(false);

  const platformCount = items.filter((i) => i.feedType === 'platform_event').length;
  const securityCount = items.filter((i) => i.feedType === 'security_event').length;
  const suspiciousCount = items.filter((i) => i.isSuspicious).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-amber-400" />
            Activity Feed
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform events and security activity across Apex Arenas.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-slate-600 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      {items.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">
            <span className="text-white font-semibold">{platformCount}</span> platform
          </span>
          <span className="text-slate-400">
            <span className="text-white font-semibold">{securityCount}</span> security
          </span>
          {suspiciousCount > 0 && (
            <span className="text-red-400 font-semibold">
              ⚠ {suspiciousCount} suspicious
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
          {categoryTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                category === key
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Severity filter (platform only) */}
        {(category === 'all' || category === 'platform') && (
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as '' | FeedSeverity)}
            className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition-colors"
          >
            {severityOptions.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}

        {/* Suspicious only (security only) */}
        {(category === 'all' || category === 'security') && (
          <button
            onClick={() => setSuspiciousOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              suspiciousOnly
                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Suspicious only
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
        {error && (
          <div className="py-8 px-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={refresh} className="mt-3 text-xs text-amber-400 hover:underline">Retry</button>
          </div>
        )}

        {!error && items.length === 0 && !loading && (
          <div className="py-16 px-6 text-center">
            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No activity yet</p>
            <p className="text-xs text-slate-600 mt-1">Events will appear here as they happen.</p>
          </div>
        )}

        {items.map((item) => (
          <FeedRow key={item.id} item={item} />
        ))}

        {loading && (
          <div className="py-6 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          </div>
        )}

        {!loading && hasMore && (
          <div className="px-4 py-4 text-center">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
