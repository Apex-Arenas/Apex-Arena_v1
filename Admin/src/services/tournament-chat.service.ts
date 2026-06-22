import { apiGet, apiPost, apiDelete } from '../utils/api.utils';
import { TOURNAMENT_CHAT_ENDPOINTS } from '../config/api.config';
import { getAdminAccessToken } from '../utils/auth.utils';

function adminHeaders(): { headers: Record<string, string> } {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { headers };
}

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
      adminHeaders(),
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
      adminHeaders(),
    );

    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to send message');
    }

    const data = response.data as Record<string, unknown>;
    const raw = (data.message ?? data) as Record<string, unknown>;
    return mapChatMessage(raw);
  },

  async deleteMessage(tournamentId: string, messageId: string): Promise<void> {
    const response = await apiDelete(
      `${TOURNAMENT_CHAT_ENDPOINTS.BASE}/${tournamentId}/chat/messages/${messageId}`,
      adminHeaders(),
    );

    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to delete message');
    }
  },
};
