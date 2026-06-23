import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils';
import { TOURNAMENT_CHAT_ENDPOINTS } from '../config/api.config';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChatSenderRole = 'player' | 'organizer' | 'admin';
export type ChatMessageType = 'text' | 'system';

export interface TournamentChatMessage {
  id: string;
  tournamentId: string;
  senderId: string;
  senderDisplayName: string;
  senderRole: ChatSenderRole;
  content: string;
  messageType: ChatMessageType;
  createdAt: string;
  isDeleted: boolean;
  isEdited: boolean;
}

export interface ChatRosterMember {
  userId: string;
  displayName: string;
  role: ChatSenderRole;
}

export interface ChatMessagesResult {
  messages: TournamentChatMessage[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export function mapChatMessage(raw: Record<string, unknown>): TournamentChatMessage {
  return {
    id: String(raw._id ?? raw.id ?? raw.message_id ?? ''),
    tournamentId: String(raw.tournament_id ?? raw.tournamentId ?? ''),
    senderId: String(raw.sender_id ?? raw.senderId ?? ''),
    senderDisplayName: String(raw.sender_display_name ?? raw.senderDisplayName ?? ''),
    senderRole: (raw.sender_role ?? raw.senderRole ?? 'player') as ChatSenderRole,
    content: String(raw.content ?? ''),
    messageType: (raw.message_type ?? raw.messageType ?? 'text') as ChatMessageType,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    isDeleted: Boolean(raw.is_deleted ?? raw.isDeleted ?? false),
    isEdited: Boolean(raw.is_edited ?? raw.isEdited ?? false),
  };
}

function mapRosterMember(raw: Record<string, unknown>): ChatRosterMember {
  return {
    userId: String(raw.user_id ?? raw.userId ?? ''),
    displayName: String(raw.display_name ?? raw.displayName ?? ''),
    role: (raw.role ?? 'player') as ChatSenderRole,
  };
}

// ─── Service ────────────────────────────────────────────────────────────────

export const tournamentChatService = {
  async getMessages(
    tournamentId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ChatMessagesResult> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('limit', String(limit));

    const response = await apiGet(
      `${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/messages?${query}`,
      { skipCache: true },
    );
    if (!response.success) return { messages: [], page, limit, total: 0, hasMore: false };

    const data = response.data as Record<string, unknown>;
    const list = Array.isArray(data) ? data : ((data.messages ?? data.data ?? []) as Record<string, unknown>[]);
    const total = Number(data.total ?? list.length);
    const resolvedPage = Number(data.page ?? page);
    const resolvedLimit = Number(data.limit ?? limit);

    return {
      messages: list.map((m) => mapChatMessage(m as Record<string, unknown>)),
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      hasMore: resolvedPage * resolvedLimit < total,
    };
  },

  async sendMessage(tournamentId: string, content: string): Promise<TournamentChatMessage> {
    const response = await apiPost(
      `${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/messages`,
      { content },
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to send message';
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.message ?? data) as Record<string, unknown>;
    return mapChatMessage(raw);
  },

  async editMessage(tournamentId: string, messageId: string, content: string): Promise<TournamentChatMessage> {
    const response = await apiPatch(
      `${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/messages/${messageId}`,
      { content },
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to edit message';
      throw new Error(msg);
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.message ?? data) as Record<string, unknown>;
    return mapChatMessage(raw);
  },

  async deleteMessage(tournamentId: string, messageId: string): Promise<void> {
    const response = await apiDelete(
      `${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/messages/${messageId}`,
    );

    if (!response.success) {
      const msg = response.error?.message ?? 'Failed to delete message';
      throw new Error(msg);
    }
  },

  async getRoster(tournamentId: string): Promise<ChatRosterMember[]> {
    const response = await apiGet(`${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/members`);
    if (!response.success) return [];

    const data = response.data as unknown;
    const list = Array.isArray(data) ? data : [];
    return list.map((m) => mapRosterMember(m as Record<string, unknown>));
  },

  async markRead(tournamentId: string): Promise<void> {
    await apiPost(`${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/read`, {});
  },

  async getUnreadStatus(tournamentId: string): Promise<boolean> {
    const response = await apiGet(`${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/unread`);
    if (!response.success) return false;
    const data = response.data as Record<string, unknown>;
    return Boolean(data.unread);
  },
};
