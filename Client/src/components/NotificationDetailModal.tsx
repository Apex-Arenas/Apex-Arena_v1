import { X } from "lucide-react";
import type { NotificationItem } from "../services/notification.service";

function resolveNotifUrl(url: string): string {
  if (url.startsWith("/auth") || url.startsWith("http")) return url;
  return `/auth${url}`;
}

function formatFullDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface NotificationDetailModalProps {
  notification: NotificationItem;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export function NotificationDetailModal({ notification, onClose, onNavigate }: NotificationDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white leading-snug">{notification.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{formatFullDate(notification.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
        </div>

        {notification.actionUrl && (
          <div className="flex gap-3 px-5 pb-5">
            <button
              onClick={() => onNavigate(resolveNotifUrl(notification.actionUrl!))}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors"
            >
              View
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
