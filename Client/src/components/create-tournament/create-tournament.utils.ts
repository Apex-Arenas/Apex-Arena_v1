// ─── Countries List (ISO 3166-1 alpha-2 codes) ────────────────────────────────

export const COUNTRIES = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" },
  { code: "RW", name: "Rwanda" },
  { code: "CM", name: "Cameroon" },
  { code: "ET", name: "Ethiopia" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "BW", name: "Botswana" },
  { code: "NA", name: "Namibia" },
  { code: "MU", name: "Mauritius" },
  { code: "SC", name: "Seychelles" },
  { code: "AO", name: "Angola" },
  { code: "BJ", name: "Benin" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "DJ", name: "Djibouti" },
  { code: "EG", name: "Egypt" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "SZ", name: "Eswatini" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MR", name: "Mauritania" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "NE", name: "Niger" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SO", name: "Somalia" },
  { code: "SS", name: "South Sudan" },
  { code: "SD", name: "Sudan" },
  { code: "TG", name: "Togo" },
  { code: "TN", name: "Tunisia" },
  { code: "EH", name: "Western Sahara" },
];

// ─── Shared input styles ──────────────────────────────────────────────────────

export const inputCls =
  "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";

export const selectCls =
  "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GameOption {
  id: string;
  name: string;
  raw: Record<string, unknown>;
}

export interface GameDetails {
  id: string;
  name: string;
  category?: string;
  platform?: string;
}

// ─── Pure helpers ──────────────────────────────────────────────────────────────

const TEAM_FORMAT_REGEX = /^(\d+)v\1$/;

export function isTeamFormat(value: string): boolean {
  return value !== "1v1" && value !== "solo";
}

export function inferTeamSize(value: string): number | null {
  const match = value.match(TEAM_FORMAT_REGEX);
  if (!match) return null;
  const size = Number.parseInt(match[1], 10);
  return Number.isNaN(size) ? null : size;
}

export function toIsoString(dateTimeLocal: string): string | null {
  if (!dateTimeLocal) return null;
  const parsed = new Date(dateTimeLocal);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
