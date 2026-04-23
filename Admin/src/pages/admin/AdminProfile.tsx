import { useEffect, useMemo, useState } from "react";
import {
  User,
  Camera,
  Save,
  Lock,
  Edit3,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Shield,
  Mail,
  CalendarDays,
  KeyRound,
} from "lucide-react";
import { useAdminAuth } from "../../lib/admin-auth-context";
import ImageUploadDropzone from "../../components/ImageUploadDropzone";
import { apiPost, apiPut, apiGet } from "../../utils/api.utils";
import { AUTH_ENDPOINTS } from "../../config/api.config";
import { getAdminAccessToken } from "../../utils/auth.utils";

const inputCls =
  "w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70 focus:bg-slate-900 disabled:opacity-50 transition-colors";

function adminOpts(): { headers: Record<string, string> } {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { headers };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <h2 className="font-display text-sm font-bold text-white uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Alert({
  type,
  msg,
  onClose,
}: {
  type: "success" | "error";
  msg: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
        type === "success"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-red-500/10 border-red-500/30 text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose}>
        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}

const AdminProfile = () => {
  const { admin, setSession, tokens } = useAdminAuth();

  const [firstName, setFirstName] = useState(admin?.firstName ?? "");
  const [lastName, setLastName] = useState(admin?.lastName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(admin?.avatarUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [pwAlert, setPwAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [fetchedCreatedAt, setFetchedCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!admin?.id) return;
    apiGet(`${AUTH_ENDPOINTS.ADMIN_GET_USER_DETAILS}/${admin.id}`, adminOpts())
      .then((res) => {
        if (!res.success) return;
        const raw = res.data as Record<string, unknown>;
        const val = (raw.created_at ?? raw.createdAt) as string | undefined;
        if (val) setFetchedCreatedAt(val);
      })
      .catch(() => {});
  }, [admin?.id]);

  const displayName =
    `${firstName} ${lastName}`.trim() || admin?.username || "Admin";

  const memberSince = useMemo(() => {
    const raw = fetchedCreatedAt ?? admin?.createdAt;
    if (!raw) return null;
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [fetchedCreatedAt, admin?.createdAt]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setAlert(null);
    try {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl || undefined,
      };
      const response = await apiPut(
        AUTH_ENDPOINTS.UPDATE_PROFILE,
        body,
        adminOpts(),
      );
      if (!response.success) {
        const msg =
          (response as { error?: { message?: string } }).error?.message ??
          "Failed to save profile.";
        setAlert({ type: "error", msg });
        return;
      }
      // Update session with new name
      if (admin && tokens) {
        setSession(tokens, {
          ...admin,
          firstName,
          lastName,
          avatarUrl: avatarUrl || admin.avatarUrl,
        });
      }
      setAlert({ type: "success", msg: "Profile updated successfully." });
    } catch (err) {
      setAlert({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to save.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) {
      setPwAlert({ type: "error", msg: "Fill in all password fields." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwAlert({ type: "error", msg: "New passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwAlert({
        type: "error",
        msg: "Password must be at least 8 characters.",
      });
      return;
    }

    setIsSavingPw(true);
    setPwAlert(null);
    try {
      const response = await apiPost(
        AUTH_ENDPOINTS.PASSWORD_CHANGE,
        {
          current_password: currentPw,
          new_password: newPw,
        },
        adminOpts(),
      );
      if (!response.success) {
        const msg =
          (response as { error?: { message?: string } }).error?.message ??
          "Failed to change password.";
        setPwAlert({ type: "error", msg });
        return;
      }
      setPwAlert({ type: "success", msg: "Password changed successfully." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwAlert({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setIsSavingPw(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-800/50">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 60% at 100% 0%, rgba(245,158,11,0.14), transparent)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 48% 55% at 0% 100%, rgba(14,165,233,0.1), transparent)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-amber-500/20 via-cyan-500/15 to-slate-900 border-2 border-slate-700 flex items-center justify-center text-white shadow-xl">
                  <User className="w-10 h-10 text-slate-100/90" />
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl font-bold text-white truncate">
                {displayName}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-slate-400 text-sm">
                  @{admin?.username}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {admin?.role?.replace("_", " ") ?? "admin"}
                </span>
                {memberSince && (
                  <span className="text-xs text-slate-500">
                    Member since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-xl overflow-hidden">
            {[
              {
                label: "Role",
                value: admin?.role?.replace("_", " ") ?? "Admin",
                color: "text-amber-300",
              },
              {
                label: "2FA",
                value: admin?.is2FAEnabled ? "Enabled" : "Disabled",
                color: admin?.is2FAEnabled
                  ? "text-emerald-300"
                  : "text-slate-300",
              },
              {
                label: "Access",
                value: "Admin Panel",
                color: "text-cyan-300",
              },
              {
                label: "Status",
                value: "Active",
                color: "text-indigo-300",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-900/70 px-4 py-3 text-center"
              >
                <p
                  className={`font-display text-lg sm:text-xl font-bold capitalize ${item.color}`}
                >
                  {item.value}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            {alert && (
              <Alert
                type={alert.type}
                msg={alert.msg}
                onClose={() => setAlert(null)}
              />
            )}

            <SectionCard icon={User} title="Personal Info">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Email">
                  <input
                    type="text"
                    value={admin?.email ?? ""}
                    disabled
                    className={inputCls}
                  />
                </Field>

                <Field label="Username">
                  <input
                    type="text"
                    value={admin?.username ?? ""}
                    disabled
                    className={inputCls}
                  />
                </Field>
              </div>
            </SectionCard>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-linear-to-r from-amber-500 to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:from-amber-400 hover:to-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>

            <SectionCard icon={Lock} title="Change Password">
              {pwAlert && (
                <div className="mb-4">
                  <Alert
                    type={pwAlert.type}
                    msg={pwAlert.msg}
                    onClose={() => setPwAlert(null)}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Field label="Current Password">
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Current password"
                    className={inputCls}
                  />
                </Field>
                <Field label="New Password">
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputCls}
                  />
                </Field>
                <Field label="Confirm New Password">
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password"
                    className={inputCls}
                  />
                </Field>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={isSavingPw}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold hover:bg-slate-700 hover:border-slate-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {isSavingPw ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </SectionCard>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SectionCard icon={Camera} title="Profile Photo">
              <ImageUploadDropzone
                value={avatarUrl}
                onChange={setAvatarUrl}
                folder="apex-arenas/admin/avatars"
              />
              <p className="text-xs text-slate-500 mt-3 text-center">
                Upload a square image for best results
              </p>
            </SectionCard>

            <SectionCard icon={Shield} title="Account Snapshot">
              <div className="space-y-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-sm text-white truncate">
                      {admin?.email ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                      Two-factor auth
                    </p>
                    <p
                      className={`text-sm ${admin?.is2FAEnabled ? "text-emerald-300" : "text-amber-300"}`}
                    >
                      {admin?.is2FAEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>

                {memberSince && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                        Member Since
                      </p>
                      <p className="text-sm text-white">{memberSince}</p>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
