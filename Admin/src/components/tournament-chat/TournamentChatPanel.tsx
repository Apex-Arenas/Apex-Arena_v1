import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { useTournamentChat } from './useTournamentChat';
import type { TournamentChatMessage } from '../../services/tournament-chat.service';

const MAX_MESSAGE_LENGTH = 1000;

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function RoleBadge({ role }: { role: TournamentChatMessage['senderRole'] }) {
  if (role === 'admin') {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-500/15 border border-cyan-500/25 text-cyan-300">
        Admin
      </span>
    );
  }
  if (role === 'organizer') {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-500/15 border border-violet-500/25 text-violet-300">
        Organizer
      </span>
    );
  }
  return null;
}

interface TournamentChatPanelProps {
  tournamentId: string;
}

export function TournamentChatPanel({ tournamentId }: TournamentChatPanelProps) {
  const { admin } = useAdminAuth();
  const {
    messages,
    isLoading,
    isSending,
    hasMore,
    accessDenied,
    error,
    loadOlder,
    sendMessage,
    deleteMessage,
  } = useTournamentChat(tournamentId);

  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    try {
      await sendMessage(trimmed);
      setDraft('');
    } catch {
      // error surfaced via the hook's `error` state below
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800/60 bg-slate-950/20">
        <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4 text-orange-400" />
        </div>
        <h2 className="font-display text-sm font-bold text-white flex-1 text-left">Tournament Chat</h2>
      </div>

      <div className="p-4 space-y-3">
        {accessDenied ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            {error ?? 'You no longer have access to this chat.'}
          </p>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {hasMore && (
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors py-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                  Load older messages
                </button>
              )}

              {messages.length === 0 && !isLoading ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No messages yet.
                </p>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderId === admin?.id;
                  return (
                    <div key={message.id} className="group flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-300">
                            {message.senderDisplayName}
                          </span>
                          <RoleBadge role={message.senderRole} />
                          <span className="text-[10px] text-slate-600">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 break-words mt-0.5">{message.content}</p>
                      </div>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 shrink-0"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {error && !accessDenied && (
              <p className="text-[11px] text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Message this tournament's chat…"
                maxLength={MAX_MESSAGE_LENGTH}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 px-3 py-2 focus:outline-none focus:border-orange-500/50"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || draft.trim().length === 0}
                className="p-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 disabled:opacity-40 transition-opacity"
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
