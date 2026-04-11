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
        className={`rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-1.5 text-slate-600 ${className ?? "w-12 h-12"}`}
      >
        <Gamepad2 className="w-5 h-5" />
        <span className="text-[10px] font-medium text-slate-600 hidden [.h-28_&]:block">
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
