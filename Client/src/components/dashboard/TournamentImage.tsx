import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import type { TournamentRegistration } from "../../services/dashboard.service";

type TournamentImageProps = {
  reg: TournamentRegistration;
  className?: string;
};

export default function TournamentImage({
  reg,
  className,
}: TournamentImageProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl =
    reg.tournamentThumbnailUrl ?? reg.tournamentBannerUrl ?? reg.gameLogoUrl;

  if (!imageUrl || hasImageError) {
    return (
      <div
        className={`bg-gradient-to-br from-cyan-950/60 via-slate-800 to-indigo-950/60 flex flex-col items-center justify-center gap-2 text-slate-500 ${className ?? "w-12 h-12 rounded-lg border border-slate-700"}`}
      >
        <Gamepad2 className="w-6 h-6 opacity-40" />
        <span className="text-[10px] font-medium text-slate-600 tracking-wide uppercase">
          No Image
        </span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={reg.tournamentTitle}
      className={`object-cover ${className ?? "w-12 h-12 rounded-lg border border-slate-700"}`}
      onError={() => setHasImageError(true)}
    />
  );
}
