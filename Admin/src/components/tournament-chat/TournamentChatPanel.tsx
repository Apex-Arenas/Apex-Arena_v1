import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Check, ChevronUp, Loader2, MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { useTournamentChat } from './useTournamentChat';
import type { ChatRosterMember, TournamentChatMessage } from '../../services/tournament-chat.service';

const MAX_MESSAGE_LENGTH = 1000;
const EVERYONE_MENTION: ChatRosterMember = { userId: '__all__', displayName: 'Everyone', role: 'organizer' };

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

/** Finds the `@token` immediately before the cursor, if any — drives the mention dropdown. */
function findActiveMentionToken(value: string, cursor: number): { query: string; anchor: number } | null {
  const beforeCursor = value.slice(0, cursor);
  const match = /@([^\s@]*)$/.exec(beforeCursor);
  if (!match) return null;
  return { query: match[1], anchor: match.index };
}

/** Cosmetic only — highlights `@<roster display name>` and `@all`/`@everyone` occurrences in rendered content. */
function renderContentWithMentions(content: string, roster: ChatRosterMember[]): ReactNode {
  const names = [...roster.map((m) => m.displayName), 'all', 'everyone'].filter(Boolean);
  if (names.length === 0) return content;

  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const parts: Array<string | { mention: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push({ mention: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts.map((part, i) =>
    typeof part === 'string' ? (
      part
    ) : (
      <span key={i} className="text-orange-400 font-semibold">
        {part.mention}
      </span>
    ),
  );
}

interface TournamentChatPanelProps {
  tournamentId: string;
  /** Admins are always privileged for @all — defaults to true since every Admin-app caller is an admin. */
  viewerCanMentionAll?: boolean;
}

export function TournamentChatPanel({ tournamentId, viewerCanMentionAll = true }: TournamentChatPanelProps) {
  const { admin } = useAdminAuth();
  const {
    messages,
    roster,
    isLoading,
    isSending,
    hasMore,
    accessDenied,
    error,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useTournamentChat(tournamentId);

  const [draft, setDraft] = useState('');
  const [mention, setMention] = useState<{ query: string; anchor: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const mentionSuggestions = (() => {
    if (!mention) return [];
    const query = mention.query.toLowerCase();
    const candidates = viewerCanMentionAll ? [EVERYONE_MENTION, ...roster] : roster;
    return candidates
      .filter((m) => m.userId !== admin?.id && m.displayName.toLowerCase().includes(query))
      .slice(0, 6);
  })();

  const handleDraftChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_MESSAGE_LENGTH);
    setDraft(value);
    const cursor = e.target.selectionStart ?? value.length;
    setMention(findActiveMentionToken(value, cursor));
  };

  const insertMention = (member: ChatRosterMember) => {
    if (!mention) return;
    const insertText = member.userId === '__all__' ? 'all' : member.displayName;
    const cursor = inputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, mention.anchor);
    const after = draft.slice(cursor);
    const next = `${before}@${insertText} ${after}`;
    setDraft(next.slice(0, MAX_MESSAGE_LENGTH));
    setMention(null);
    requestAnimationFrame(() => {
      const pos = before.length + insertText.length + 2;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    try {
      await sendMessage(trimmed);
      setDraft('');
      setMention(null);
    } catch {
      // error surfaced via the hook's `error` state below
    }
  };

  const startEdit = (message: TournamentChatMessage) => {
    setEditingId(message.id);
    setEditDraft(message.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!editingId || !trimmed) return;
    try {
      await editMessage(editingId, trimmed);
      cancelEdit();
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
                  const isEditing = editingId === message.id;
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
                          {message.isEdited && !message.isDeleted && (
                            <span className="text-[10px] text-slate-600">(edited)</span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="text"
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit();
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void saveEdit();
                                }
                              }}
                              autoFocus
                              maxLength={MAX_MESSAGE_LENGTH}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-orange-500/50"
                            />
                            <button
                              type="button"
                              onClick={() => void saveEdit()}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                              aria-label="Save edit"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors shrink-0"
                              aria-label="Cancel edit"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : message.isDeleted ? (
                          message.content ? (
                            <div className="mt-0.5">
                              <p className="text-[10px] text-slate-500 italic">deleted message</p>
                              <p className="text-sm text-slate-500 line-through break-words">{message.content}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic mt-0.5">
                              {message.senderDisplayName} deleted a message
                            </p>
                          )
                        ) : (
                          <p className="text-sm text-slate-200 break-words mt-0.5">
                            {renderContentWithMentions(message.content, roster)}
                          </p>
                        )}
                      </div>
                      {isMine && !message.isDeleted && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(message)}
                            className="text-slate-500 hover:text-orange-400"
                            aria-label="Edit message"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMessage(message.id)}
                            className="text-slate-500 hover:text-red-400"
                            aria-label="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

            <div className="relative flex items-center gap-2 pt-2 border-t border-slate-800/60">
              {mention && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
                  {mentionSuggestions.map((member) => (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => insertMention(member)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/60 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/30 border border-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-orange-300">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-white truncate">{member.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMention(null);
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Message this tournament's chat… (@ to mention)"
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
