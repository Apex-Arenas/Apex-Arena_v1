import { apiGet, apiPatch, apiPost } from '../utils/api.utils';
import { NOTIFICATION_ENDPOINTS } from '../config/api.config';

export interface NotificationItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  actionUrl?: string;
  imageUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt?: string;
  relatedTo?: {
    entityType?: string;
    entityId?: string;
  };
}

export interface NotificationsResult {
  notifications: NotificationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

function mapNotification(raw: Record<string, unknown>): NotificationItem {
  const related = (raw.related_to ?? {}) as Record<string, unknown>;

  return {
    id: String(raw.id ?? raw._id ?? ''),
    type: String(raw.type ?? 'system_announcement'),
    priority: String(raw.priority ?? 'normal'),
    title: String(raw.title ?? 'Notification'),
    message: String(raw.message ?? ''),
    actionUrl: (raw.action_url ?? raw.actionUrl) as string | undefined,
    imageUrl: (raw.image_url ?? raw.imageUrl) as string | undefined,
    isRead: Boolean(raw.is_read ?? raw.isRead ?? false),
    readAt: (raw.read_at ?? raw.readAt) as string | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined,
    relatedTo: {
      entityType: related.entity_type as string | undefined,
      entityId: related.entity_id ? String(related.entity_id) : undefined,
    },
  };
}

export const notificationService = {
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResult> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.unreadOnly) search.set('unread_only', 'true');

    const url = search.toString()
      ? `${NOTIFICATION_ENDPOINTS.LIST}?${search.toString()}`
      : NOTIFICATION_ENDPOINTS.LIST;

    const response = await apiGet(url);
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to load notifications');
    }

    const data = response.data as Record<string, unknown>;
    const list = (data.notifications ?? []) as Record<string, unknown>[];
    const pagination = (data.pagination ?? {}) as Record<string, unknown>;

    return {
      notifications: list.map((item) => mapNotification(item)),
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
      const response = await apiGet(NOTIFICATION_ENDPOINTS.UNREAD_COUNT);
      if (!response.success) return 0;
      const data = response.data as Record<string, unknown>;
      return Number(data.unread_count ?? data.count ?? 0);
    } catch {
      return 0;
    }
  },

  async markRead(notificationId: string): Promise<void> {
    const response = await apiPatch(
      `${NOTIFICATION_ENDPOINTS.MARK_READ}/${notificationId}/read`,
      {},
    );

    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to mark notification as read');
    }
  },

  async markAllRead(): Promise<void> {
    const response = await apiPost(NOTIFICATION_ENDPOINTS.MARK_ALL_READ, {});
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to mark all notifications as read');
    }
  },
};
