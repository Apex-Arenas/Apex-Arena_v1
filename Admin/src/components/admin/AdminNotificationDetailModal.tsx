import { X } from "lucide-react";
import type { AdminNotificationItem } from "../../services/admin-notification.service";

const SEVERITY_LABEL: Record<AdminNotificationItem["severity"], string> = {
  critical: "Critical",
  action_required: "Action Required",
  info: "Info",
};

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

interface AdminNotificationDetailModalProps {
  notification: AdminNotificationItem;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export function AdminNotificationDetailModal({
  notification,
  onClose,
  onNavigate,
}: AdminNotificationDetailModalProps) {
  const hasMetadata = !!(notification.metadata && Object.keys(notification.metadata).length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-base font-bold text-white leading-snug">{notification.title}</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/40">
                {SEVERITY_LABEL[notification.severity]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{formatFullDate(notification.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{notification.message}</p>

          <p className="text-[10px] text-slate-600 font-mono">{notification.eventType.replace(/_/g, " ")}</p>

          {hasMetadata && (
            <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-3 space-y-1.5">
              {Object.entries(notification.metadata!).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 text-slate-500 font-mono w-28 truncate">{k}</span>
                  <span className="text-slate-300 break-all">{String(v)}</span>
                </div>
              ))}
            </div>
          )}

          {notification.readBy.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {notification.readBy.map((r) => (
                <span
                  key={r.adminId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-[10px] text-slate-400"
                >
                  @{r.username}
                  {r.readAt && <span className="text-slate-600">· {formatFullDate(r.readAt)}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {notification.actionUrl && (
          <div className="flex gap-3 px-5 pb-5">
            <button
              onClick={() => onNavigate(notification.actionUrl!)}
              className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-600 transition-colors"
            >
              View
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
