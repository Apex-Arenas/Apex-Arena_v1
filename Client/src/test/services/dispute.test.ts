import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { apiGet, apiPost, clearApiCache } from '../../utils/api.utils';
import { TOURNAMENT_ENDPOINTS } from '../../config/api.config';

// ── Mock auth ────────────────────────────────────────────────────────────────

vi.mock('../../utils/auth.utils', () => ({
  getAccessToken: vi.fn(() => 'organizer-access-token'),
  getRefreshToken: vi.fn(() => 'organizer-refresh-token'),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

beforeEach(() => {
  clearApiCache();
});

// ── URLs ─────────────────────────────────────────────────────────────────────

const DISPUTES_URL  = TOURNAMENT_ENDPOINTS.MATCH_ORGANIZER_DISPUTES;
const RESOLVE_URL   = (matchId: string) =>
  `${TOURNAMENT_ENDPOINTS.MATCH_DISPUTE_RESOLVE}/${matchId}/dispute/resolve`;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockDispute = {
  _id: 'match-abc',
  tournament_id: { _id: 'tourn-1', title: 'Test Cup' },
  status: 'disputed',
  participants: [
    { role: 'player', user_id: { _id: 'user-1', username: 'PlayerOne' }, result: { score: 2 } },
    { role: 'player', user_id: { _id: 'user-2', username: 'PlayerTwo' }, result: { score: 1 } },
  ],
  dispute: {
    is_disputed: true,
    disputed_by: 'user-2',
    dispute_reason: 'Score was recorded incorrectly',
    disputed_at: new Date().toISOString(),
    evidence: ['https://example.com/screenshot.png'],
    resolved: false,
  },
};

// ── GET /organizer/disputes ───────────────────────────────────────────────────

describe('GET /organizer/disputes', () => {
  it('returns disputes list and total on success', async () => {
    server.use(
      http.get(DISPUTES_URL, () =>
        HttpResponse.json({
          success: true,
          data: { disputes: [mockDispute], total: 1, limit: 20, skip: 0 },
        }),
      ),
    );

    const result = await apiGet(DISPUTES_URL);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { disputes: typeof mockDispute[]; total: number };
      expect(data.total).toBe(1);
      expect(data.disputes).toHaveLength(1);
      expect(data.disputes[0]._id).toBe('match-abc');
      expect(data.disputes[0].status).toBe('disputed');
      expect(data.disputes[0].dispute.resolved).toBe(false);
    }
  });

  it('returns empty list when organizer has no disputes', async () => {
    server.use(
      http.get(DISPUTES_URL, () =>
        HttpResponse.json({
          success: true,
          data: { disputes: [], total: 0, limit: 20, skip: 0 },
        }),
      ),
    );

    const result = await apiGet(DISPUTES_URL);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { disputes: unknown[]; total: number };
      expect(data.disputes).toHaveLength(0);
      expect(data.total).toBe(0);
    }
  });

  it('passes limit and skip as query params', async () => {
    let capturedUrl = '';

    server.use(
      http.get(DISPUTES_URL, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          success: true,
          data: { disputes: [], total: 0, limit: 5, skip: 10 },
        });
      }),
    );

    await apiGet(`${DISPUTES_URL}?limit=5&skip=10`);

    expect(capturedUrl).toContain('limit=5');
    expect(capturedUrl).toContain('skip=10');
  });

  it('attaches Authorization header', async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.get(DISPUTES_URL, ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json({
          success: true,
          data: { disputes: [], total: 0, limit: 20, skip: 0 },
        });
      }),
    );

    await apiGet(DISPUTES_URL);

    expect(capturedAuth).toBe('Bearer organizer-access-token');
  });

  it('returns error when unauthorized', async () => {
    server.use(
      http.get(DISPUTES_URL, () =>
        HttpResponse.json(
          { success: false, error_code: 'AUTH_REQUIRED', message: 'Organizer privileges required' },
          { status: 401 },
        ),
      ),
    );

    const result = await apiGet(DISPUTES_URL);

    expect(result.success).toBe(false);
  });

  it('handles dispute with evidence correctly', async () => {
    const disputeWithEvidence = {
      ...mockDispute,
      dispute: { ...mockDispute.dispute, evidence: ['https://evidence1.com', 'https://evidence2.com'] },
    };

    server.use(
      http.get(DISPUTES_URL, () =>
        HttpResponse.json({
          success: true,
          data: { disputes: [disputeWithEvidence], total: 1, limit: 20, skip: 0 },
        }),
      ),
    );

    const result = await apiGet(DISPUTES_URL);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { disputes: typeof disputeWithEvidence[] };
      expect(data.disputes[0].dispute.evidence).toHaveLength(2);
    }
  });
});

// ── POST /:matchId/dispute/resolve ────────────────────────────────────────────

describe('POST /:matchId/dispute/resolve', () => {
  const matchId  = 'match-abc';
  const winnerId = 'user-1';
  const note     = 'Original score confirmed by video evidence provided by Player One.';

  it('resolves dispute and returns updated match', async () => {
    let capturedBody: Record<string, unknown> = {};

    server.use(
      http.post(RESOLVE_URL(matchId), async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          data: {
            ...mockDispute,
            status: 'completed',
            dispute: { ...mockDispute.dispute, resolved: true, resolution: note },
          },
          message: 'Dispute resolved successfully',
        });
      }),
    );

    const result = await apiPost(RESOLVE_URL(matchId), { winnerId, resolution: note });

    expect(result.success).toBe(true);
    expect(capturedBody.winnerId).toBe(winnerId);
    expect(capturedBody.resolution).toBe(note);
    if (result.success) {
      const match = result.data as { status: string; dispute: { resolved: boolean } };
      expect(match.status).toBe('completed');
      expect(match.dispute.resolved).toBe(true);
    }
  });

  it('attaches Authorization header on resolve', async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.post(RESOLVE_URL(matchId), ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await apiPost(RESOLVE_URL(matchId), { winnerId, resolution: note });

    expect(capturedAuth).toBe('Bearer organizer-access-token');
  });

  it('returns error when match is not disputed', async () => {
    server.use(
      http.post(RESOLVE_URL(matchId), () =>
        HttpResponse.json(
          { success: false, error_code: 'MATCH_NOT_DISPUTED', message: 'Match is not in disputed state' },
          { status: 400 },
        ),
      ),
    );

    const result = await apiPost(RESOLVE_URL(matchId), { winnerId, resolution: note });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('MATCH_NOT_DISPUTED');
  });

  it('returns error when organizer does not own the tournament', async () => {
    server.use(
      http.post(RESOLVE_URL(matchId), () =>
        HttpResponse.json(
          { success: false, error_code: 'UNAUTHORIZED', message: 'You do not own this tournament' },
          { status: 403 },
        ),
      ),
    );

    const result = await apiPost(RESOLVE_URL(matchId), { winnerId, resolution: note });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe('You do not own this tournament');
  });

  it('returns error when winnerId is not a participant', async () => {
    server.use(
      http.post(RESOLVE_URL(matchId), () =>
        HttpResponse.json(
          { success: false, error_code: 'INVALID_WINNER', message: 'Winner must be a match participant' },
          { status: 400 },
        ),
      ),
    );

    const result = await apiPost(RESOLVE_URL(matchId), { winnerId: 'not-a-participant', resolution: note });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_WINNER');
  });

  it('sends an idempotency key on resolve POST', async () => {
    let capturedKey: string | null = null;

    server.use(
      http.post(RESOLVE_URL(matchId), ({ request }) => {
        capturedKey = request.headers.get('X-Idempotency-Key');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await apiPost(RESOLVE_URL(matchId), { winnerId, resolution: note });

    expect(capturedKey).toBeTruthy();
    expect(typeof capturedKey).toBe('string');
  });
});
