import { useState } from "react";
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
} from "lucide-react";
import { useAdminAuth } from "../../lib/admin-auth-context";
import { apiPost, apiPut } from "../../utils/api.utils";
import { AUTH_ENDPOINTS } from "../../config/api.config";
import { getAdminAccessToken } from "../../utils/auth.utils";

const inputCls =
  "w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors";

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
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
      </label>
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
      className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm border ${
        type === "success"
          ? "bg-green-500/10 border-green-500/30 text-green-300"
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

  const displayName =
    `${firstName} ${lastName}`.trim() || admin?.username || "Admin";
  const initials =
    (firstName?.[0] ?? admin?.firstName?.[0] ?? "A").toUpperCase() +
    (lastName?.[0] ?? admin?.lastName?.[0] ?? "").toUpperCase();

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-500/30 flex items-center justify-center text-xl font-bold text-amber-300">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Camera className="w-3 h-3 text-slate-400" />
          </div>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {displayName}
          </h1>
          <p className="text-sm text-slate-400">
            @{admin?.username}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs capitalize border border-amber-500/30">
              {admin?.role?.replace("_", " ")}
            </span>
          </p>
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          msg={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Personal Info */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" />
          Personal Info
        </h2>

        <div className="grid grid-cols-2 gap-4">
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
            className={`${inputCls} opacity-50`}
          />
        </Field>

        <Field label="Avatar URL">
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
            className={inputCls}
          />
        </Field>

        <div className="flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          Change Password
        </h2>

        {pwAlert && (
          <Alert
            type={pwAlert.type}
            msg={pwAlert.msg}
            onClose={() => setPwAlert(null)}
          />
        )}

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

        <div className="flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={isSavingPw}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 disabled:opacity-60 transition-colors"
          >
            {isSavingPw ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
            {isSavingPw ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
