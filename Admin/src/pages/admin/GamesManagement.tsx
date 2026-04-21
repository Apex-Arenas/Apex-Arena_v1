import { useCallback, useEffect, useRef, useState } from "react";
import {
  Gamepad2,
  Plus,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Star,
  StarOff,
  RefreshCw,
} from "lucide-react";
import {
  adminService,
  type AdminGame,
  type CreateGamePayload,
} from "../../services/admin.service";
import ImageUploadDropzone from "../../components/ImageUploadDropzone";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "fps",
  "moba",
  "sports",
  "fighting",
  "battle_royale",
  "card",
  "racing",
  "other",
];
const PLATFORMS = [
  "pc",
  "ps4",
  "ps5",
  "xbox",
  "nintendo",
  "mobile",
  "cross_platform",
];
const FORMATS = ["1v1", "2v2", "3v3", "4v4", "5v5", "solo", "squad"];

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors";
const selectCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter((v) => v !== val)
        : [...selected, val],
    );
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            selected.includes(opt)
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Game Form Modal ──────────────────────────────────────────────────────────

interface GameFormProps {
  game?: AdminGame;
  onClose: () => void;
  onSaved: () => void;
}

function GameFormModal({ game, onClose, onSaved }: GameFormProps) {
  const isEdit = !!game;
  const [name, setName] = useState(game?.name ?? "");
  const [slug, setSlug] = useState(game?.slug ?? "");
  const [category, setCategory] = useState(game?.category ?? "");
  const [platform, setPlatform] = useState<string[]>(game?.platform ?? []);
  const [formats, setFormats] = useState<string[]>(
    game?.supportedFormats ?? [],
  );
  const [inGameIdLabel, setInGameIdLabel] = useState(game?.inGameIdLabel ?? "");
  const [inGameIdExample, setInGameIdExample] = useState(
    game?.inGameIdExample ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(game?.logoUrl ?? "");
  const [publisher, setPublisher] = useState(game?.publisher ?? "");
  const [isFeatured, setIsFeatured] = useState(game?.isFeatured ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Game name is required.");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }
    if (!category) {
      setError("Category is required.");
      return;
    }
    if (platform.length === 0) {
      setError("Select at least one platform.");
      return;
    }
    if (formats.length === 0) {
      setError("Select at least one format.");
      return;
    }
    if (!inGameIdLabel.trim()) {
      setError("In-game ID label is required.");
      return;
    }
    if (!inGameIdExample.trim()) {
      setError("In-game ID example is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateGamePayload = {
        name: name.trim(),
        slug: slug.trim(),
        category,
        platform,
        supportedFormats: formats,
        inGameIdLabel: inGameIdLabel.trim(),
        inGameIdExample: inGameIdExample.trim(),
        logoUrl: logoUrl.trim() || undefined,
        publisher: publisher.trim() || undefined,
        isFeatured,
      };
      if (isEdit && game) {
        await adminService.updateGame(game.id, payload);
      } else {
        await adminService.createGame(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save game.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-display text-base font-bold text-white">
              {isEdit ? "Edit Game" : "Add Game"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-800/20 p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Basic Info</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Game Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!isEdit) setSlug(autoSlug(e.target.value));
                  }}
                  placeholder="e.g. Mobile Legends"
                  className={inputCls}
                />
              </Field>
              <Field label="Slug" required>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. mobile-legends"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Publisher">
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. Riot Games"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/20 p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platforms & Formats</p>
            <Field label="Platforms" required>
              <CheckGroup
                options={PLATFORMS}
                selected={platform}
                onChange={setPlatform}
              />
            </Field>

            <Field label="Supported Formats" required>
              <CheckGroup
                options={FORMATS}
                selected={formats}
                onChange={setFormats}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/20 p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In-Game ID</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="In-Game ID Label" required>
                <input
                  type="text"
                  value={inGameIdLabel}
                  onChange={(e) => setInGameIdLabel(e.target.value)}
                  placeholder='e.g. "Riot ID" or "IGN"'
                  className={inputCls}
                />
              </Field>
              <Field label="In-Game ID Example" required>
                <input
                  type="text"
                  value={inGameIdExample}
                  onChange={(e) => setInGameIdExample(e.target.value)}
                  placeholder='e.g. "ProPlayer#1234"'
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <Field label="Logo Image">
            <ImageUploadDropzone
              value={logoUrl}
              onChange={setLogoUrl}
              folder="apex-arenas/games/logos"
            />
          </Field>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFeatured(!isFeatured)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                isFeatured
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {isFeatured ? (
                <Star className="w-4 h-4" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
              {isFeatured ? "Featured" : "Not Featured"}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Add Game"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const GamesManagement = () => {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editGame, setEditGame] = useState<AdminGame | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGame | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setGames(await adminService.fetchGames());
    } catch {
      showToast("error", "Failed to load games.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void load();
  }, [load]);

  const handleToggle = async (game: AdminGame) => {
    setActionLoading(game.id);
    try {
      await adminService.toggleGameActive(game.id);
      setGames((prev) =>
        prev.map((g) =>
          g.id === game.id ? { ...g, isActive: !g.isActive } : g,
        ),
      );
      showToast(
        "success",
        `${game.name} ${game.isActive ? "deactivated" : "activated"}.`,
      );
    } catch {
      showToast("error", "Failed to toggle game status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await adminService.deleteGame(deleteTarget.id);
      setGames((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      showToast("success", `${deleteTarget.name} deleted.`);
    } catch {
      showToast("error", "Failed to delete game.");
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Full-bleed Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-white">Games</h1>
                  {!isLoading && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                      {games.length} games
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">Manage available games for tournaments.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void load()}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setEditGame(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Games Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-slate-800 rounded" />
                    <div className="h-3 w-16 bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Gamepad2 className="w-7 h-7 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-white mb-2">No Games Yet</h2>
            <p className="text-sm text-slate-400 mb-5 max-w-xs">
              Add games so organizers can create tournaments for them.
            </p>
            <button
              onClick={() => {
                setEditGame(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all group overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {game.logoUrl ? (
                        <img
                          src={game.logoUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          <Gamepad2 className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">
                            {game.name}
                          </p>
                          {game.isFeatured && (
                            <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 capitalize">
                          {game.category.replace("_", " ")}
                          {game.publisher ? ` · ${game.publisher}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                        game.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-700/50 text-slate-400"
                      }`}
                    >
                      {game.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Platform tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {game.platform.slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/50"
                      >
                        {p}
                      </span>
                    ))}
                    {game.platform.length > 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-500">
                        +{game.platform.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-800/60">
                    <span>{game.tournamentCount ?? 0} tournaments</span>
                    <span>{game.playerCount ?? 0} players</span>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-1 px-4 py-3 border-t border-slate-800 bg-slate-900/40">
                  <button
                    onClick={() => handleToggle(game)}
                    disabled={actionLoading === game.id}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50 px-2 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    {actionLoading === game.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : game.isActive ? (
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {game.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setEditGame(game);
                      setShowForm(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-amber-500/5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(game)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Game Form Modal */}
      {showForm && (
        <GameFormModal
          game={editGame ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditGame(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditGame(null);
            void load();
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Delete Game?
              </h3>
            </div>
            <p className="text-sm text-slate-400">
              Delete <strong className="text-white">{deleteTarget.name}</strong>
              ? This cannot be undone and may affect existing tournaments.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === deleteTarget.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-60 transition-colors"
              >
                {actionLoading === deleteTarget.id && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesManagement;
