import { apiGet } from '../utils/api.utils';
import { ACTIVITY_FEED_ENDPOINT } from '../config/api.config';
import { getAdminAccessToken } from '../utils/auth.utils';

function adminHeaders(): { headers: Record<string, string> } {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { headers };
}

export type FeedType = 'platform_event' | 'security_event';
export type FeedCategory = 'all' | 'platform' | 'security';
export type FeedSeverity = 'info' | 'action_required' | 'critical';

export interface ActivityFeedItem {
  id: string;
  feedType: FeedType;
  createdAt: string;
  title: string;
  message: string;

  // Platform event fields
  eventType?: string;
  severity?: FeedSeverity;
  actor?: { userId: string; username: string };
  entity?: { entityType: string; entityId: string };
  actionUrl?: string;
  isRead?: boolean;

  // Security event fields
  authEventType?: string;
  success?: boolean;
  userId?: string;
  username?: string;
  ipAddress?: string;
  isSuspicious?: boolean;
  riskScore?: number;
  failureReason?: string;
}

export interface ActivityFeedResult {
  items: ActivityFeedItem[];
  nextCursor: string | null;
  totalFetched: number;
}

function mapItem(raw: Record<string, unknown>): ActivityFeedItem {
  const actor = raw.actor as Record<string, unknown> | undefined;
  const entity = raw.entity as Record<string, unknown> | undefined;

  return {
    id: String(raw.id ?? raw._id ?? ''),
    feedType: (raw.feed_type ?? 'platform_event') as FeedType,
    createdAt: String(raw.created_at ?? ''),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),

    eventType: raw.event_type as string | undefined,
    severity: raw.severity as FeedSeverity | undefined,
    actor: actor
      ? { userId: String(actor.user_id ?? ''), username: String(actor.username ?? '') }
      : undefined,
    entity: entity
      ? { entityType: String(entity.entity_type ?? ''), entityId: String(entity.entity_id ?? '') }
      : undefined,
    actionUrl: raw.action_url as string | undefined,
    isRead: raw.is_read as boolean | undefined,

    authEventType: raw.auth_event_type as string | undefined,
    success: raw.success as boolean | undefined,
    userId: raw.user_id as string | undefined,
    username: raw.username as string | undefined,
    ipAddress: raw.ip_address as string | undefined,
    isSuspicious: raw.is_suspicious as boolean | undefined,
    riskScore: raw.risk_score as number | undefined,
    failureReason: raw.failure_reason as string | undefined,
  };
}

export const activityFeedService = {
  async getFeed(params?: {
    limit?: number;
    before?: string;
    category?: FeedCategory;
    severity?: FeedSeverity;
    suspiciousOnly?: boolean;
    eventType?: string;
  }): Promise<ActivityFeedResult> {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.before) search.set('before', params.before);
    if (params?.category && params.category !== 'all') search.set('category', params.category);
    if (params?.severity) search.set('severity', params.severity);
    if (params?.suspiciousOnly) search.set('suspicious_only', 'true');
    if (params?.eventType) search.set('event_type', params.eventType);

    const url = search.toString()
      ? `${ACTIVITY_FEED_ENDPOINT}?${search}`
      : ACTIVITY_FEED_ENDPOINT;

    const response = await apiGet(url, adminHeaders());
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to load activity feed');
    }

    const data = response.data as Record<string, unknown>;
    const rawItems = (data.items ?? []) as Record<string, unknown>[];

    return {
      items: rawItems.map(mapItem),
      nextCursor: (data.next_cursor ?? null) as string | null,
      totalFetched: Number(data.total_fetched ?? rawItems.length),
    };
  },
};
