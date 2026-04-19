import { useEffect, useState } from "react";
import {
  Users, Loader2, Plus, Pencil, Trash2, Check, X,
  ChevronDown, ChevronUp, UserCircle, Search,
} from "lucide-react";
import { teamService, type Team, type RecruitmentPost } from "../../services/team.service";
import { useAuth } from "../../lib/auth-context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:   "bg-emerald-500/15 text-emerald-400",
    closed: "bg-slate-700/50 text-slate-400",
    filled: "bg-amber-500/15 text-amber-400",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${map[status] ?? "bg-slate-700/50 text-slate-400"}`}>
      {status}
    </span>
  );
}

// ─── Recruitment post form (create/edit inline) ───────────────────────────────

interface PostDraft {
  title: string;
  description: string;
  requirements: string;
  positions: string;
  status: string;
}

const EMPTY_DRAFT: PostDraft = { title: "", description: "", requirements: "", positions: "", status: "open" };

function RecruitmentForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: PostDraft;
  onSave: (d: PostDraft) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<PostDraft>(initial ?? EMPTY_DRAFT);
  const set = <K extends keyof PostDraft>(k: K, v: PostDraft[K]) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  const inputCls =
    "w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <div className="space-y-3 p-4 rounded-xl border border-slate-700 bg-slate-900/60">
      <div>
        <label className="text-[11px] font-medium text-slate-400 block mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Looking for a support player"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1">Positions</label>
          <input
            type="number"
            min="1"
            value={draft.positions}
            onChange={(e) => set("positions", e.target.value)}
            placeholder="e.g. 2"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1">Status</label>
          <select
            value={draft.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputCls}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="filled">Filled</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-slate-400 block mb-1">Description</label>
        <textarea
          rows={2}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Brief overview of what you're looking for..."
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-slate-400 block mb-1">Requirements</label>
        <textarea
          rows={2}
          value={draft.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          placeholder="Skill level, experience, availability..."
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          disabled={saving || !draft.title.trim()}
          className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Recruitment posts section (captain view) ─────────────────────────────────

function RecruitmentSection({ teamId }: { teamId: string }) {
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teamService.getRecruitmentPosts(teamId)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleCreate = async (draft: PostDraft) => {
    setSaving(true);
    setError(null);
    try {
      const post = await teamService.createRecruitmentPost(teamId, {
        title: draft.title,
        description: draft.description || undefined,
        requirements: draft.requirements || undefined,
        positions: draft.positions ? Number(draft.positions) : undefined,
      });
      setPosts((prev) => [post, ...prev]);
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create post.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (postId: string, draft: PostDraft) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await teamService.updateRecruitmentPost(postId, {
        title: draft.title,
        description: draft.description || undefined,
        requirements: draft.requirements || undefined,
        positions: draft.positions ? Number(draft.positions) : undefined,
        status: draft.status,
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
    setError(null);
    try {
      await teamService.deleteRecruitmentPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Recruitment Posts
        </h3>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Post
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {showCreate && (
        <RecruitmentForm
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          saving={saving}
        />
      )}

      {posts.length === 0 && !showCreate && (
        <p className="text-xs text-slate-500 text-center py-4">No recruitment posts yet.</p>
      )}

      {posts.map((post) =>
        editingId === post.id ? (
          <RecruitmentForm
            key={post.id}
            initial={{
              title: post.title,
              description: post.description ?? "",
              requirements: post.requirements ?? "",
              positions: post.positions ? String(post.positions) : "",
              status: post.status,
            }}
            onSave={(d) => void handleEdit(post.id, d)}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        ) : (
          <div
            key={post.id}
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                  <StatusBadge status={post.status} />
                </div>
                {post.description && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{post.description}</p>
                )}
                {post.requirements && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    Requirements: {post.requirements}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                  {post.positions && <span>{post.positions} position{post.positions !== 1 ? "s" : ""}</span>}
                  <span>{post.applicantCount} applicant{post.applicantCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => { setEditingId(post.id); setShowCreate(false); }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => void handleDelete(post.id)}
                  disabled={deletingId === post.id}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  title="Delete"
                >
                  {deletingId === post.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

// ─── Team card (browse view, with apply to open recruitment) ─────────────────

function BrowseTeamCard({ team, currentUserId }: { team: Team; currentUserId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (!expanded && posts.length === 0) {
      setLoadingPosts(true);
      teamService.getRecruitmentPosts(team.id)
        .then(setPosts)
        .catch(() => setPosts([]))
        .finally(() => setLoadingPosts(false));
    }
    setExpanded((v) => !v);
  };

  const applyTo = async (postId: string) => {
    setApplyingId(postId);
    setError(null);
    try {
      await teamService.applyToRecruitment(postId, applyMsg || undefined);
      setAppliedIds((prev) => new Set([...prev, postId]));
      setApplying(null);
      setApplyMsg("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply.");
    } finally {
      setApplyingId(null);
    }
  };

  const isMember = currentUserId
    ? team.captainId === currentUserId || team.members.some((m) => m.userId === currentUserId)
    : false;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => void toggle()}
      >
        <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-800 to-violet-800 flex items-center justify-center text-white font-bold text-sm border border-slate-700 shrink-0">
          {team.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{team.name}</p>
            {team.tag && <span className="text-[10px] text-slate-500 font-mono">[{team.tag}]</span>}
            {!team.isOpen && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 font-semibold">Closed</span>
            )}
            {isMember && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold">
                {team.captainId === currentUserId ? "Captain" : "Member"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
            {team.gameName ? ` · ${team.gameName}` : ""}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          {team.description && (
            <p className="text-xs text-slate-400">{team.description}</p>
          )}
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Open Positions</div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {loadingPosts ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : posts.filter((p) => p.status === "open").length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No open recruitment posts.</p>
          ) : (
            posts.filter((p) => p.status === "open").map((post) => (
              <div key={post.id} className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{post.title}</p>
                    {post.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{post.description}</p>
                    )}
                    {post.requirements && (
                      <p className="text-[11px] text-slate-500 mt-0.5">Requirements: {post.requirements}</p>
                    )}
                    {post.positions && (
                      <p className="text-[11px] text-slate-500">{post.positions} position{post.positions !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  {!isMember && !appliedIds.has(post.id) && (
                    <button
                      onClick={() => setApplying(applying === post.id ? null : post.id)}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                  {appliedIds.has(post.id) && (
                    <span className="shrink-0 text-[11px] text-emerald-400 font-semibold">Applied!</span>
                  )}
                </div>

                {applying === post.id && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={applyMsg}
                      onChange={(e) => setApplyMsg(e.target.value)}
                      placeholder="Optional message to the team captain..."
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setApplying(null); setApplyMsg(""); }}
                        className="flex-1 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void applyTo(post.id)}
                        disabled={applyingId === post.id}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {applyingId === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "browse" | "my-teams";

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("browse");

  // Browse state
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [search, setSearch] = useState("");

  // My Teams state
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [myTeamsFetched, setMyTeamsFetched] = useState(false);

  useEffect(() => {
    teamService.getTeams({ limit: 50 })
      .then(({ teams }) => setAllTeams(teams))
      .catch(() => setAllTeams([]))
      .finally(() => setLoadingAll(false));
  }, []);

  const loadMyTeams = () => {
    if (myTeamsFetched) return;
    setLoadingMine(true);
    setMyTeamsFetched(true);
    // Fetch all teams and filter by captain
    teamService.getTeams({ limit: 100 })
      .then(({ teams }) => {
        setMyTeams(teams.filter((t) => t.captainId === user?.id));
      })
      .catch(() => setMyTeams([]))
      .finally(() => setLoadingMine(false));
  };

  useEffect(() => {
    if (tab === "my-teams") loadMyTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = search.trim()
    ? allTeams.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.gameName?.toLowerCase().includes(search.toLowerCase()),
      )
    : allTeams;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-cyan-400" /> Teams
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Find teams to join or manage your own team recruitment.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
        {(["browse", "my-teams"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "my-teams" ? "My Teams" : "Browse"}
          </button>
        ))}
      </div>

      {/* ── Browse tab ─────────────────────────────────────────────────────── */}
      {tab === "browse" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams by name or game..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loadingAll ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-slate-800 bg-slate-900/40">
              <UserCircle className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                {search ? "No teams match your search." : "No teams found."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((team) => (
                <BrowseTeamCard
                  key={team.id}
                  team={team}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My Teams tab ───────────────────────────────────────────────────── */}
      {tab === "my-teams" && (
        <div className="space-y-4">
          {loadingMine ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : myTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-slate-800 bg-slate-900/40 text-center">
              <Users className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">You're not captaining any teams.</p>
              <p className="text-xs text-slate-500 mt-1">
                Browse teams to join one, or create a team from the tournament page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTeams.map((team) => (
                <div key={team.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  {/* Team header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-800/30 transition-colors"
                    onClick={() =>
                      setExpandedTeamId(
                        expandedTeamId === team.id ? null : team.id,
                      )
                    }
                  >
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-cyan-800 to-indigo-800 flex items-center justify-center text-white font-bold text-sm border border-slate-700 shrink-0">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                        {team.tag && (
                          <span className="text-[10px] text-slate-500 font-mono">[{team.tag}]</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold">
                          Captain
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                        {team.gameName ? ` · ${team.gameName}` : ""}
                      </p>
                    </div>
                    {expandedTeamId === team.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>

                  {/* Recruitment posts */}
                  {expandedTeamId === team.id && (
                    <div className="border-t border-slate-800 px-4 py-4">
                      <RecruitmentSection teamId={team.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
