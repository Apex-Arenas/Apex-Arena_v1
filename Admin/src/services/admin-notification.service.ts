import { apiGet, apiPatch } from '../utils/api.utils';
import { ADMIN_NOTIFICATION_ENDPOINTS } from '../config/api.config';
import { getAdminAccessToken } from '../utils/auth.utils';

function adminHeaders(): { headers: Record<string, string> } {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { headers };
}

export type AdminNotifSeverity = 'info' | 'action_required' | 'critical';

export interface AdminNotificationItem {
  id: string;
  eventType: string;
  severity: AdminNotifSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AdminNotificationsResult {
  notifications: AdminNotificationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

function mapNotification(raw: Record<string, unknown>): AdminNotificationItem {
  // per-admin read status is injected by the service as is_read / read_at
  return {
    id: String(raw._id ?? raw.id ?? ''),
    eventType: String(raw.event_type ?? raw.eventType ?? 'system_alert'),
    severity: (raw.severity ?? 'info') as AdminNotifSeverity,
    title: String(raw.title ?? 'Notification'),
    message: String(raw.message ?? ''),
    actionUrl: (raw.action_url ?? raw.actionUrl) as string | undefined,
    isRead: Boolean(raw.is_read ?? raw.isRead ?? false),
    readAt: (raw.read_at ?? raw.readAt) as string | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    metadata: raw.metadata as Record<string, unknown> | undefined,
  };
}

export const adminNotificationService = {
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    severity?: AdminNotifSeverity;
    eventType?: string;
  }): Promise<AdminNotificationsResult> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.unreadOnly) search.set('unread_only', 'true');
    if (params?.severity) search.set('severity', params.severity);
    if (params?.eventType) search.set('event_type', params.eventType);

    const url = search.toString()
      ? `${ADMIN_NOTIFICATION_ENDPOINTS.LIST}?${search}`
      : ADMIN_NOTIFICATION_ENDPOINTS.LIST;

    const response = await apiGet(url, adminHeaders());
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to load notifications');
    }

    const data = response.data as Record<string, unknown>;
    const list = (data.notifications ?? []) as Record<string, unknown>[];
    const pagination = (data.pagination ?? {}) as Record<string, unknown>;

    return {
      notifications: list.map(mapNotification),
      pagination: {
        total: Number(pagination.total ?? list.length),
        page: Number(pagination.page ?? 1),
        limit: Number(pagination.limit ?? 20),
        pages: Number(pagination.pages ?? 1),
      },
    };
  },

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiGet(ADMIN_NOTIFICATION_ENDPOINTS.UNREAD_COUNT, adminHeaders());
      if (!response.success) return 0;
      const data = response.data as Record<string, unknown>;
      return Number(data.unread_count ?? data.count ?? 0);
    } catch {
      return 0;
    }
  },

  async markRead(notificationId: string): Promise<void> {
    const response = await apiPatch(
      `${ADMIN_NOTIFICATION_ENDPOINTS.MARK_READ}/${notificationId}/read`,
      {},
      adminHeaders(),
    );
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to mark notification as read');
    }
  },

  async markAllRead(): Promise<void> {
    const response = await apiPatch(
      ADMIN_NOTIFICATION_ENDPOINTS.MARK_ALL_READ,
      {},
      adminHeaders(),
    );
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to mark all notifications as read');
    }
  },
};
