import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { toast } from 'react-toastify';
import { useAdminAuth } from './admin-auth-context';
import {
  adminNotificationService,
  type AdminNotificationItem,
} from '../services/admin-notification.service';
import { getOrCreateAdminSocket, disconnectAdminSocket } from './socket';

interface AdminNotificationContextValue {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextValue | undefined>(
  undefined,
);

export function useAdminNotifications(): AdminNotificationContextValue {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) throw new Error('useAdminNotifications must be used within AdminNotificationProvider');
  return ctx;
}

export function AdminNotificationProvider({ children }: PropsWithChildren) {
  const { tokens, admin } = useAdminAuth();

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const bootedRef = useRef(false);

  const loadPage = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const result = await adminNotificationService.getNotifications({
        page: pageNum,
        limit: 20,
      });
      setNotifications((prev) =>
        pageNum === 1 ? result.notifications : [...prev, ...result.notifications],
      );
      setHasMore(result.pagination.page < result.pagination.pages);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    adminNotificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
    loadPage(1);
  }, [loadPage]);

  const fetchMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadPage(next);
  }, [isLoading, hasMore, page, loadPage]);

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadPage(1);
    adminNotificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
  }, [loadPage]);

  // Socket: connect on auth, disconnect on logout
  useEffect(() => {
    const token = tokens?.accessToken;
    if (!token || !admin) {
      disconnectAdminSocket();
      return;
    }

    const socket = getOrCreateAdminSocket(token);

    const handleNew = (payload: {
      notification_id: string;
      event_type: string;
      severity: 'info' | 'action_required' | 'critical';
      title: string;
      message: string;
      action_url?: string;
      created_at: string;
    }) => {
      const item: AdminNotificationItem = {
        id: payload.notification_id,
        eventType: payload.event_type,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.action_url,
        isRead: false,
        createdAt: payload.created_at,
      };

      setNotifications((prev) => [item, ...prev]);
      setUnreadCount((n) => n + 1);

      // Severity-aware toast
      const toastFn =
        payload.severity === 'critical'
          ? toast.error
          : payload.severity === 'action_required'
          ? toast.warning
          : toast.info;

      toastFn(
        <div>
          <p className="font-semibold text-sm">{payload.title}</p>
          <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{payload.message}</p>
        </div>,
        { autoClose: payload.severity === 'critical' ? false : 6000 },
      );
    };

    socket.on('admin_notification:new', handleNew);

    return () => {
      socket.off('admin_notification:new', handleNew);
    };
  }, [tokens?.accessToken, admin]);

  const markRead = useCallback(async (id: string) => {
    await adminNotificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((n) => Math.max(0, n - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await adminNotificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return (
    <AdminNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        fetchMore,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
}
