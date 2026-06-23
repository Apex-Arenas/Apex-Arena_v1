import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { getOrCreateAdminSocket } from '../../lib/socket';
import {
  tournamentChatService,
  mapChatMessage,
  type TournamentChatMessage,
  type ChatRosterMember,
} from '../../services/tournament-chat.service';

interface UseTournamentChatResult {
  messages: TournamentChatMessage[];
  roster: ChatRosterMember[];
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
  accessDenied: boolean;
  error: string | null;
  loadOlder: () => void;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

function tombstone(message: TournamentChatMessage): TournamentChatMessage {
  return { ...message, isDeleted: true, content: '' };
}

export function useTournamentChat(tournamentId: string): UseTournamentChatResult {
  const { tokens, admin } = useAdminAuth();

  const [messages, setMessages] = useState<TournamentChatMessage[]>([]);
  const [roster, setRoster] = useState<ChatRosterMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bootedRef = useRef<string | null>(null);

  const loadPage = useCallback(async (tid: string, pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await tournamentChatService.getMessages(tid, { page: pageNum, limit: 20 });
      const chronological = [...result.messages].reverse();
      setMessages((prev) => (pageNum === 1 ? chronological : [...chronological, ...prev]));
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial history + roster load, and mark-as-read — once per tournament
  useEffect(() => {
    if (!tournamentId || bootedRef.current === tournamentId) return;
    bootedRef.current = tournamentId;
    setPage(1);
    setMessages([]);
    setAccessDenied(false);
    loadPage(tournamentId, 1);
    tournamentChatService.getRoster(tournamentId).then(setRoster).catch(() => {});
    tournamentChatService.markRead(tournamentId).catch(() => {});
  }, [tournamentId, loadPage]);

  const loadOlder = useCallback(() => {
    if (isLoading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadPage(tournamentId, next);
  }, [tournamentId, isLoading, hasMore, page, loadPage]);

  // Socket: join the tournament's chat room while this panel is mounted
  useEffect(() => {
    const token = tokens?.accessToken;
    if (!tournamentId || !token || !admin) return;

    const socket = getOrCreateAdminSocket(token);

    const handleMessage = (payload: Record<string, unknown>) => {
      const incoming = mapChatMessage(payload);
      if (incoming.tournamentId && incoming.tournamentId !== tournamentId) return;
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      tournamentChatService.markRead(tournamentId).catch(() => {});
    };

    const handleDeleted = (payload: { tournament_id?: string; message_id?: string } | undefined) => {
      if (!payload?.message_id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.message_id ? tombstone(m) : m)),
      );
    };

    const handleEdited = (
      payload: { tournament_id?: string; message_id?: string; content?: string } | undefined,
    ) => {
      if (!payload?.message_id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.message_id ? { ...m, content: payload.content ?? m.content, isEdited: true } : m,
        ),
      );
    };

    const handleJoinError = (payload: { error?: string; message?: string } | undefined) => {
      setAccessDenied(true);
      setError(
        payload?.message ??
          (payload?.error === 'NOT_TOURNAMENT_CHAT_MEMBER'
            ? 'You need to be registered in this tournament to use its chat.'
            : 'You do not have access to this tournament chat.'),
      );
    };

    socket.emit('join:tournament_chat', tournamentId);
    socket.on('tournament_chat:message', handleMessage);
    socket.on('tournament_chat:message_deleted', handleDeleted);
    socket.on('tournament_chat:message_edited', handleEdited);
    socket.on('tournament_chat:join_error', handleJoinError);

    return () => {
      socket.emit('leave:tournament_chat', tournamentId);
      socket.off('tournament_chat:message', handleMessage);
      socket.off('tournament_chat:message_deleted', handleDeleted);
      socket.off('tournament_chat:message_edited', handleEdited);
      socket.off('tournament_chat:join_error', handleJoinError);
    };
  }, [tournamentId, tokens?.accessToken, admin]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!tournamentId || !trimmed) return;
      setIsSending(true);
      setError(null);
      try {
        const sent = await tournamentChatService.sendMessage(tournamentId, trimmed);
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [tournamentId],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      try {
        const updated = await tournamentChatService.editMessage(tournamentId, messageId, trimmed);
        setMessages((prev) => (prev.map((m) => (m.id === messageId ? updated : m))));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to edit message');
        throw err;
      }
    },
    [tournamentId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await tournamentChatService.deleteMessage(tournamentId, messageId);
        setMessages((prev) => prev.map((m) => (m.id === messageId ? tombstone(m) : m)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete message');
        throw err;
      }
    },
    [tournamentId],
  );

  return {
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
  };
}
