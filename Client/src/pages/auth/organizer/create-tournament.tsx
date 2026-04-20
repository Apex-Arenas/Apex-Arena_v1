import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  CalendarDays,
  DollarSign,
  Users,
  Globe,
  AlertCircle,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import {
  organizerService,
  type CreateTournamentPayload,
} from "../../../services/organizer.service";
import { apiGet } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import ImageUploadDropzone from "../../../components/ImageUploadDropzone";
import { DateTimePicker } from "../../../components/DateTimePicker";

// ─── Small UI helpers ────────────────────────────────────────────────────────

function SectionCard({
  step,
  title,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/25 shrink-0">
          <span className="font-display text-sm font-bold text-orange-400">{step}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-orange-400 shrink-0" />
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

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
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        {label}
        {required
          ? <span className="text-orange-400 normal-case font-normal tracking-normal">*</span>
          : <span className="text-slate-600 text-[10px] font-normal normal-case tracking-normal">optional</span>
        }
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";

const selectCls =
  "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";

// ─── Component ───────────────────────────────────────────────────────────────

interface GameOption {
  id: string;
  name: string;
  raw: Record<string, unknown>;
}

interface GameDetails {
  id: string;
  name: string;
  category?: string;
  platform?: string;
}

const TEAM_FORMAT_REGEX = /^(\d+)v\1$/;

function isTeamFormat(value: string): boolean {
  return value !== "1v1" && value !== "solo";
}

function inferTeamSize(value: string): number | null {
  const match = value.match(TEAM_FORMAT_REGEX);
  if (!match) return null;
  const size = Number.parseInt(match[1], 10);
  return Number.isNaN(size) ? null : size;
}

function toIsoString(dateTimeLocal: string): string | null {
  if (!dateTimeLocal) return null;
  const parsed = new Date(dateTimeLocal);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toDateTimeLocalValue(iso?: string): string {
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

const CreateTournament = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const isEditMode = Boolean(tournamentId);
  const navigate = useNavigate();
  const hasFetchedGames = useRef(false);
  const hasHydratedTournament = useRef(false);

  const [games, setGames] = useState<GameOption[]>([]);
  const [, setSelectedGameDetails] = useState<GameDetails | null>(null);
  const [, setIsLoadingSelectedGame] = useState(false);
  const [isLoadingTournament, setIsLoadingTournament] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tournamentStatus, setTournamentStatus] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameId, setGameId] = useState("");
  const [tournamentType, setTournamentType] = useState("single_elimination");
  const [leagueLegs, setLeagueLegs] = useState<"1" | "2">("1");
  const [format, setFormat] = useState("1v1");
  const [maxParticipants, setMaxParticipants] = useState("16");
  const [minParticipants, setMinParticipants] = useState("4");
  const [teamSize, setTeamSize] = useState("2");
  const [isFree, setIsFree] = useState(true);
  const [entryFee, setEntryFee] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [registrationStart, setRegistrationStart] = useState("");
  const [registrationEnd, setRegistrationEnd] = useState("");
  const [tournamentStart, setTournamentStart] = useState("");
  const [tournamentEnd, setTournamentEnd] = useState("");
  const [checkInStart, setCheckInStart] = useState("");
  const [checkInEnd, setCheckInEnd] = useState("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra",
  );
  const [region, setRegion] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [contactEmail, setContactEmail] = useState("");
  const [rules, setRules] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [firstPrizePercentage, setFirstPrizePercentage] = useState("60");
  const [secondPrizePercentage, setSecondPrizePercentage] = useState("30");
  const [thirdPrizePercentage, setThirdPrizePercentage] = useState("10");
  const [mapPool, setMapPool] = useState("");
  const [antiCheatRequired, setAntiCheatRequired] = useState(true);
  const [streamRequired, setStreamRequired] = useState(false);
  const [defaultBestOf, setDefaultBestOf] = useState("3");
  const [inGameIdRequired, setInGameIdRequired] = useState(true);
  const [allowedRegions, setAllowedRegions] = useState("");
  const [verifiedEmailRequired, setVerifiedEmailRequired] = useState(true);
  const [matchDeadline, setMatchDeadline] = useState<'none' | '24h' | '48h' | '168h' | 'custom'>('none');
  const [matchDeadlineCustomDate, setMatchDeadlineCustomDate] = useState('');

  const normalizedTournamentStatus = (tournamentStatus ?? "").toLowerCase();
  const isLimitedEditMode =
    isEditMode &&
    ["awaiting_deposit", "open", "locked", "published"].includes(
      normalizedTournamentStatus,
    );
  const canEditThumbnailAfterPublish = [
    "awaiting_deposit",
    "open",
    "published",
  ].includes(normalizedTournamentStatus);

  useEffect(() => {
    if (hasFetchedGames.current) return;
    hasFetchedGames.current = true;

    apiGet(TOURNAMENT_ENDPOINTS.GAMES)
      .then((res) => {
        if (!res.success) return;
        const raw = res.data as Record<string, unknown>;
        const list = Array.isArray(raw)
          ? raw
          : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]);
        setGames(
          list
            .map((g) => {
              const game = g as Record<string, unknown>;
              const id = String(game._id ?? game.id ?? "");
              const name = String(game.name ?? "");

              if (!id || !name) return null;

              return {
                id,
                name,
                raw: game,
              };
            })
            .filter((game): game is GameOption => game !== null),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!gameId) {
      setSelectedGameDetails(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingSelectedGame(true);

    apiGet(`${TOURNAMENT_ENDPOINTS.GAMES}/${gameId}`, { skipCache: true })
      .then((res) => {
        if (isCancelled) return;
        if (!res.success) {
          setSelectedGameDetails(null);
          return;
        }

        const payload = res.data as Record<string, unknown>;
        const game =
          ((payload.game ?? payload.data ?? payload) as Record<
            string,
            unknown
          >) ?? payload;

        setSelectedGameDetails({
          id: String(game._id ?? game.id ?? gameId),
          name: String(game.name ?? ""),
          category: (game.category as string | undefined) ?? undefined,
          platform: (game.platform as string | undefined) ?? undefined,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setSelectedGameDetails(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingSelectedGame(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    if (!isEditMode || !tournamentId || hasHydratedTournament.current) {
      if (!isEditMode) setIsLoadingTournament(false);
      return;
    }

    hasHydratedTournament.current = true;
    setIsLoadingTournament(true);
    setError(null);

    apiGet(`${TOURNAMENT_ENDPOINTS.TOURNAMENT_DETAIL}/${tournamentId}`)
      .then((res) => {
        if (!res.success) {
          throw new Error(
            (res as { error?: { message?: string } }).error?.message ??
              "Failed to load tournament.",
          );
        }

        const raw = res.data as Record<string, unknown> as Record<
          string,
          unknown
        >;
        const tournament =
          ((raw.tournament ?? raw) as Record<string, unknown>) ?? raw;

        const gameIdValue =
          typeof tournament.game_id === "string"
            ? tournament.game_id
            : String(
                ((tournament.game_id as Record<string, unknown> | undefined)
                  ?._id as string | undefined) ?? "",
              );

        const schedule =
          (tournament.schedule as Record<string, unknown> | undefined) ?? {};
        const capacity =
          (tournament.capacity as Record<string, unknown> | undefined) ?? {};
        const prize =
          (tournament.prize_structure as Record<string, unknown> | undefined) ??
          {};
        const rulesData =
          (tournament.rules as Record<string, unknown> | undefined) ?? {};
        const requirements =
          (tournament.requirements as Record<string, unknown> | undefined) ??
          {};
        const communication =
          (tournament.communication as Record<string, unknown> | undefined) ??
          {};

        setTournamentStatus(String(tournament.status ?? "draft"));

        const entryFeePesewas = Number(tournament.entry_fee ?? 0);
        const isFreeValue = Boolean(tournament.is_free ?? entryFeePesewas <= 0);
        const organizerGrossDeposit = Number(
          prize.organizer_gross_deposit ?? 0,
        );

        const distribution = Array.isArray(prize.distribution)
          ? (prize.distribution as Array<Record<string, unknown>>)
          : [];
        const byPosition = new Map<number, number>();
        distribution.forEach((item) => {
          const position = Number(item.position ?? 0);
          const percentage = Number(item.percentage ?? 0);
          if (position > 0) {
            byPosition.set(position, percentage);
          }
        });

        const allowedRegionList = Array.isArray(requirements.allowed_regions)
          ? (requirements.allowed_regions as string[])
          : [];
        const mapPoolList = Array.isArray(rulesData.map_pool)
          ? (rulesData.map_pool as string[])
          : [];

        setTitle(String(tournament.title ?? ""));
        setDescription(String(tournament.description ?? ""));
        setGameId(gameIdValue);
        setTournamentType(
          String(tournament.tournament_type ?? "single_elimination"),
        );
        setFormat(String(tournament.format ?? "1v1"));
        setMaxParticipants(String(capacity.max_participants ?? 16));
        setMinParticipants(String(capacity.min_participants ?? 4));
        setTeamSize(
          String(
            requirements.team_size ??
              inferTeamSize(String(tournament.format ?? "1v1")) ??
              2,
          ),
        );
        setIsFree(isFreeValue);
        setEntryFee(
          !isFreeValue && entryFeePesewas > 0
            ? (entryFeePesewas / 100).toFixed(2)
            : "",
        );
        setPrizePool(
          !isFreeValue && organizerGrossDeposit > 0
            ? (organizerGrossDeposit / 100).toFixed(2)
            : "",
        );

        setRegistrationStart(
          toDateTimeLocalValue(
            schedule.registration_start as string | undefined,
          ),
        );
        setRegistrationEnd(
          toDateTimeLocalValue(schedule.registration_end as string | undefined),
        );
        setTournamentStart(
          toDateTimeLocalValue(schedule.tournament_start as string | undefined),
        );
        setTournamentEnd(
          toDateTimeLocalValue(schedule.tournament_end as string | undefined),
        );
        setCheckInStart(
          toDateTimeLocalValue(schedule.check_in_start as string | undefined),
        );
        setCheckInEnd(
          toDateTimeLocalValue(schedule.check_in_end as string | undefined),
        );

        setTimezone(String(tournament.timezone ?? "Africa/Accra"));
        setRegion(String(tournament.region ?? ""));
        setVisibility(String(tournament.visibility ?? "public"));
        setContactEmail(String(communication.contact_email ?? ""));
        setRules(String(rulesData.description ?? ""));
        setThumbnailUrl(String(tournament.thumbnail_url ?? ""));
        setWaitlistEnabled(Boolean(capacity.waitlist_enabled ?? true));

        setFirstPrizePercentage(String(byPosition.get(1) ?? 60));
        setSecondPrizePercentage(String(byPosition.get(2) ?? 30));
        setThirdPrizePercentage(String(byPosition.get(3) ?? 10));

        setMapPool(mapPoolList.join(", "));
        setAntiCheatRequired(Boolean(rulesData.anti_cheat_required ?? true));
        setStreamRequired(Boolean(rulesData.stream_required ?? false));
        setDefaultBestOf(String(rulesData.default_best_of ?? 3));
        setInGameIdRequired(Boolean(rulesData.in_game_id_required ?? true));
        setAllowedRegions(allowedRegionList.join(", "));
        setVerifiedEmailRequired(
          Boolean(requirements.verified_email_required ?? true),
        );

        const timeoutsData =
          (tournament.timeouts as Record<string, unknown> | undefined) ?? {};
        const deadlineHours = timeoutsData.match_deadline_hours as number | null | undefined;
        const deadlineDate = timeoutsData.match_deadline_date as string | null | undefined;
        if (deadlineDate) {
          setMatchDeadline('custom');
          setMatchDeadlineCustomDate(toDateTimeLocalValue(deadlineDate));
        } else if (deadlineHours === 24) {
          setMatchDeadline('24h');
        } else if (deadlineHours === 48) {
          setMatchDeadline('48h');
        } else if (deadlineHours === 168) {
          setMatchDeadline('168h');
        } else {
          setMatchDeadline('none');
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load tournament for editing.",
        );
      })
      .finally(() => {
        setIsLoadingTournament(false);
      });
  }, [isEditMode, tournamentId]);

  useEffect(() => {
    const inferred = inferTeamSize(format);
    if (inferred !== null) {
      setTeamSize(String(inferred));
      return;
    }

    if (!isTeamFormat(format)) {
      setTeamSize("");
    }
  }, [format]);

  useEffect(() => {
    if (isFree) {
      setEntryFee("");
      setPrizePool("");
    }
  }, [isFree]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDescription = description.trim();
    const trimmedTitle = title.trim();
    const trimmedRules = rules.trim();
    const trimmedContactEmail = contactEmail.trim();
    const trimmedRegion = region.trim().toUpperCase();
    const mapPoolValues = mapPool
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const allowedRegionValues = allowedRegions
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const timezoneValue = timezone.trim() || "Africa/Accra";

    const maxParticipantsValue = Number.parseInt(maxParticipants, 10);
    const minParticipantsValue = Number.parseInt(minParticipants, 10);
    const teamSizeValue = Number.parseInt(teamSize, 10);
    const inferredTeamSize = inferTeamSize(format);

    const registrationStartIso = toIsoString(registrationStart);
    const registrationEndIso = toIsoString(registrationEnd);
    const tournamentStartIso = toIsoString(tournamentStart);
    const tournamentEndIso = toIsoString(tournamentEnd);
    const checkInStartIso = toIsoString(checkInStart);
    const checkInEndIso = toIsoString(checkInEnd);

    if (isEditMode && tournamentId && isLimitedEditMode) {
      if (
        trimmedContactEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContactEmail)
      ) {
        setError("Contact email is invalid.");
        return;
      }

      if (trimmedDescription.length > 2000) {
        setError("Description must be 2000 characters or less.");
        return;
      }

      setIsSubmitting(true);
      try {
        const limitedUpdates: Partial<CreateTournamentPayload> = {
          description: trimmedDescription,
          contactEmail: trimmedContactEmail,
          ...(canEditThumbnailAfterPublish
            ? { thumbnailUrl: thumbnailUrl.trim() }
            : {}),
        };

        const updated = await organizerService.updateTournament(
          tournamentId,
          limitedUpdates,
        );
        navigate(`/auth/organizer/tournaments/${updated.id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update tournament.",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!trimmedTitle) {
      setError("Tournament title is required.");
      return;
    }
    if (trimmedTitle.length > 100) {
      setError("Tournament title must be 100 characters or less.");
      return;
    }
    if (!gameId) {
      setError("Please select a game.");
      return;
    }
    if (!tournamentType) {
      setError("Tournament type is required.");
      return;
    }
    if (!format) {
      setError("Tournament format is required.");
      return;
    }

    if (!Number.isFinite(maxParticipantsValue) || maxParticipantsValue < 2) {
      setError("Maximum participants must be at least 2.");
      return;
    }
    if (!Number.isFinite(minParticipantsValue) || minParticipantsValue < 2) {
      setError("Minimum participants must be at least 2.");
      return;
    }
    if (minParticipantsValue > maxParticipantsValue) {
      setError("Minimum participants cannot exceed maximum participants.");
      return;
    }

    if (!registrationStartIso || !registrationEndIso || !tournamentStartIso) {
      setError(
        "Registration start, registration end, and tournament start dates are required.",
      );
      return;
    }

    const regStartDate = new Date(registrationStartIso);
    const regEndDate = new Date(registrationEndIso);
    const tournamentStartDate = new Date(tournamentStartIso);

    if (regStartDate >= regEndDate) {
      setError("Registration start must be before registration end.");
      return;
    }
    if (regEndDate >= tournamentStartDate) {
      setError("Registration end must be before tournament start.");
      return;
    }
    if (regStartDate <= new Date()) {
      setError("Registration start must be in the future.");
      return;
    }

    if (tournamentEnd && !tournamentEndIso) {
      setError("Tournament end date is invalid.");
      return;
    }
    if (tournamentEndIso) {
      const tournamentEndDate = new Date(tournamentEndIso);
      if (tournamentStartDate >= tournamentEndDate) {
        setError("Tournament start must be before tournament end.");
        return;
      }
    }

    if ((checkInStart && !checkInEnd) || (!checkInStart && checkInEnd)) {
      setError(
        "Provide both check-in start and check-in end, or leave both empty.",
      );
      return;
    }
    if (checkInStart && checkInEnd) {
      if (!checkInStartIso || !checkInEndIso) {
        setError("Check-in schedule is invalid.");
        return;
      }

      const checkInStartDate = new Date(checkInStartIso);
      const checkInEndDate = new Date(checkInEndIso);

      if (checkInStartDate >= checkInEndDate) {
        setError("Check-in start must be before check-in end.");
        return;
      }
      if (checkInStartDate >= tournamentStartDate) {
        setError("Check-in start must be before tournament start.");
        return;
      }
      if (checkInEndDate > tournamentStartDate) {
        setError("Check-in end must be on or before tournament start.");
        return;
      }
    }

    if (isTeamFormat(format)) {
      if (
        !Number.isFinite(teamSizeValue) ||
        teamSizeValue < 1 ||
        teamSizeValue > 100
      ) {
        setError("Team size must be between 1 and 100 for team formats.");
        return;
      }
      if (inferredTeamSize !== null && teamSizeValue !== inferredTeamSize) {
        setError(`Team size for ${format} must be ${inferredTeamSize}.`);
        return;
      }
    }

    const entryFeeValue = Number.parseFloat(entryFee);
    const prizePoolValue = Number.parseFloat(prizePool);
    const firstPrizeValue = Number.parseFloat(firstPrizePercentage);
    const secondPrizeValue = Number.parseFloat(secondPrizePercentage);
    const thirdPrizeValue = Number.parseFloat(thirdPrizePercentage);
    const defaultBestOfValue = Number.parseInt(defaultBestOf, 10);

    if (!isFree && (!Number.isFinite(entryFeeValue) || entryFeeValue <= 0)) {
      setError("Entry fee must be greater than 0 for paid tournaments.");
      return;
    }
    if (!isFree && (!Number.isFinite(prizePoolValue) || prizePoolValue <= 0)) {
      setError(
        "Prize pool deposit must be greater than 0 for paid tournaments.",
      );
      return;
    }

    if (!Number.isFinite(defaultBestOfValue) || defaultBestOfValue < 1) {
      setError("Default best-of must be at least 1.");
      return;
    }

    if (!isFree) {
      if (
        !Number.isFinite(firstPrizeValue) ||
        !Number.isFinite(secondPrizeValue) ||
        !Number.isFinite(thirdPrizeValue) ||
        firstPrizeValue <= 0 ||
        secondPrizeValue <= 0 ||
        thirdPrizeValue <= 0
      ) {
        setError("Prize distribution percentages must be positive numbers.");
        return;
      }

      const percentageTotal =
        firstPrizeValue + secondPrizeValue + thirdPrizeValue;
      if (Math.abs(percentageTotal - 100) > 0.001) {
        setError("Prize distribution percentages must add up to 100.");
        return;
      }
    }

    if (trimmedRules.length > 5000) {
      setError("Rules description must be 5000 characters or less.");
      return;
    }

    if (
      trimmedContactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContactEmail)
    ) {
      setError("Contact email is invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTournamentPayload = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        gameId,
        tournamentType,
        format,
        isFree,
        entryFee: !isFree ? Math.round(entryFeeValue * 100) : undefined,
        currency: "GHS",
        maxParticipants: maxParticipantsValue,
        minParticipants: minParticipantsValue,
        teamSize: isTeamFormat(format) ? teamSizeValue : undefined,
        registrationStart: registrationStartIso,
        registrationEnd: registrationEndIso,
        tournamentStart: tournamentStartIso,
        tournamentEnd: tournamentEndIso || undefined,
        checkInStart: checkInStartIso || undefined,
        checkInEnd: checkInEndIso || undefined,
        timezone: timezoneValue,
        prizePool: !isFree ? Math.round(prizePoolValue * 100) : undefined,
        waitlistEnabled,
        prizeDistribution: !isFree
          ? [
              { position: 1, percentage: firstPrizeValue },
              { position: 2, percentage: secondPrizeValue },
              { position: 3, percentage: thirdPrizeValue },
            ]
          : undefined,
        rules: trimmedRules || undefined,
        mapPool: mapPoolValues.length > 0 ? mapPoolValues : undefined,
        antiCheatRequired,
        streamRequired,
        defaultBestOf: defaultBestOfValue,
        inGameIdRequired,
        region: trimmedRegion || undefined,
        visibility,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        contactEmail: trimmedContactEmail || undefined,
        allowedRegions:
          allowedRegionValues.length > 0
            ? allowedRegionValues
            : trimmedRegion
              ? [trimmedRegion]
              : undefined,
        verifiedEmailRequired,
        leagueSettings: tournamentType === 'league'
          ? { legs: Number(leagueLegs) }
          : undefined,
        matchDeadlineHours:
          matchDeadline === '24h' ? 24 :
          matchDeadline === '48h' ? 48 :
          matchDeadline === '168h' ? 168 :
          null,
        matchDeadlineDate:
          matchDeadline === 'custom' && matchDeadlineCustomDate
            ? toIsoString(matchDeadlineCustomDate)
            : null,
      };

      if (isEditMode && tournamentId) {
        const updated = await organizerService.updateTournament(
          tournamentId,
          payload,
        );
        navigate(`/auth/organizer/tournaments/${updated.id}`);
      } else {
        const created = await organizerService.createTournament(payload);

        // Auto-publish immediately after creation
        const published = await organizerService.publishTournament(created.id);

        if (!payload.isFree && prizePoolValue > 0 && published.status === "awaiting_deposit") {
          // Paid tournament: initiate escrow deposit and redirect to payment
          const depositResult = await organizerService.initiateEscrowDeposit(
            created.id,
            prizePoolValue,
          );
          if (depositResult.authorizationUrl) {
            window.location.href = depositResult.authorizationUrl;
            return;
          }
        }

        // Free tournament or no payment URL: go to tournaments list
        navigate("/auth/organizer/tournaments");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Failed to update tournament."
            : "Failed to create tournament.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 px-6 py-6 sm:px-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />
        <div className="relative flex items-center gap-3">
          <button
            onClick={() => navigate("/auth/organizer/tournaments")}
            className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800/60 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {isEditMode ? "Edit Tournament" : "Create Tournament"}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isEditMode
                ? "Update your tournament details before it goes live."
                : "Fill in the details below to publish your tournament."}
            </p>
          </div>
        </div>
      </div>

      {isLoadingTournament && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}

      {error && !isLoadingTournament && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Limited edit (post-publish) ───────────────────────────── */}
      {!isLoadingTournament && isLimitedEditMode && (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Tournament is already published. You can still update organizer-facing details.
            {canEditThumbnailAfterPublish
              ? " Editable now: description, contact email, and thumbnail image."
              : " Editable now: description and contact email."}
          </div>

          <SectionCard step={1} title="Post-Publish Edits" icon={Trophy}>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Update organizer notes, rules summary, or event details"
                rows={4} maxLength={2000} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Contact Email">
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                placeholder="organizer@example.com" className={inputCls} />
            </Field>
            {canEditThumbnailAfterPublish && (
              <Field label="Thumbnail Image">
                <ImageUploadDropzone value={thumbnailUrl} onChange={setThumbnailUrl}
                  folder="apex-arenas/tournaments/thumbnails" />
              </Field>
            )}
          </SectionCard>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/auth/organizer/tournaments")}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Trophy className="w-4 h-4" />Save Changes</>}
            </button>
          </div>
        </form>
      )}

      {/* ── Full create / edit form ────────────────────────────────── */}
      {!isLoadingTournament && !isLimitedEditMode && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ── LEFT column ─────────────────────────────────────── */}
            <div className="space-y-5">

              {/* 1 · Basic Info */}
              <SectionCard step={1} title="Basic Info" icon={Trophy}>
                <Field label="Tournament Title" required>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Apex Arenas Season 1" maxLength={100} className={inputCls} />
                </Field>

                <Field label="Description">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your tournament…" rows={3} maxLength={2000}
                    className={`${inputCls} resize-none`} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Game" required>
                    <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={selectCls}>
                      <option value="">Select a game</option>
                      {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Format" required>
                    <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectCls}>
                      {["1v1", "2v2", "3v3", "4v4", "5v5", "solo", "squad"].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tournament Type" required>
                    <select value={tournamentType} onChange={(e) => setTournamentType(e.target.value)} className={selectCls}>
                      <option value="single_elimination">Single Elimination</option>
                      <option value="double_elimination">Double Elimination</option>
                      <option value="round_robin">Round Robin</option>
                      <option value="swiss">Swiss</option>
                      <option value="battle_royale">Battle Royale</option>
                      <option value="league">League (Premier League style)</option>
                    </select>
                  </Field>
                  {tournamentType === "league" ? (
                    <Field label="League Legs" required>
                      <select value={leagueLegs} onChange={(e) => setLeagueLegs(e.target.value as "1" | "2")} className={selectCls}>
                        <option value="1">Single Leg (home only)</option>
                        <option value="2">Double Leg (home &amp; away)</option>
                      </select>
                    </Field>
                  ) : (
                    <Field label="Visibility">
                      <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={selectCls}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="invite_only">Invite Only</option>
                      </select>
                    </Field>
                  )}
                  {tournamentType === "league" && (
                    <Field label="Visibility">
                      <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={selectCls}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="invite_only">Invite Only</option>
                      </select>
                    </Field>
                  )}
                  <Field label="Region">
                    <input type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. Ghana, Global" className={inputCls} />
                  </Field>
                  <Field label="Timezone">
                    <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                      placeholder="Africa/Accra" className={inputCls} />
                  </Field>
                  <Field label="Contact Email">
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="organizer@example.com" className={inputCls} />
                  </Field>
                </div>

                <Field label="Thumbnail Image">
                  <ImageUploadDropzone value={thumbnailUrl} onChange={setThumbnailUrl}
                    folder="apex-arenas/tournaments/thumbnails" />
                </Field>
              </SectionCard>

              {/* 3 · Schedule */}
              <SectionCard step={3} title="Schedule" icon={CalendarDays}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Registration Opens" required>
                    <DateTimePicker value={registrationStart} onChange={setRegistrationStart} placeholder="Pick date & time" />
                  </Field>
                  <Field label="Registration Closes" required>
                    <DateTimePicker value={registrationEnd} onChange={setRegistrationEnd} placeholder="Pick date & time"
                      minDate={registrationStart ? new Date(registrationStart) : undefined} />
                  </Field>
                  <Field label="Tournament Starts" required>
                    <DateTimePicker value={tournamentStart} onChange={setTournamentStart} placeholder="Pick date & time"
                      minDate={registrationEnd ? new Date(registrationEnd) : undefined} />
                  </Field>
                  <Field label="Tournament Ends">
                    <DateTimePicker value={tournamentEnd} onChange={setTournamentEnd} placeholder="Pick date & time"
                      minDate={tournamentStart ? new Date(tournamentStart) : undefined} />
                  </Field>
                  <Field label="Check-In Opens">
                    <DateTimePicker value={checkInStart} onChange={setCheckInStart} placeholder="Pick date & time"
                      minDate={registrationEnd ? new Date(registrationEnd) : undefined} />
                  </Field>
                  <Field label="Check-In Closes">
                    <DateTimePicker value={checkInEnd} onChange={setCheckInEnd} placeholder="Pick date & time"
                      minDate={checkInStart ? new Date(checkInStart) : undefined} />
                  </Field>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={waitlistEnabled} onChange={(e) => setWaitlistEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500" />
                  Enable waitlist when tournament is full
                </label>

                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <Field label="Match Play Deadline">
                    <select value={matchDeadline} onChange={(e) => { setMatchDeadline(e.target.value as typeof matchDeadline); setMatchDeadlineCustomDate(''); }} className={selectCls}>
                      <option value="none">No Deadline</option>
                      <option value="24h">24 Hours</option>
                      <option value="48h">2 Days</option>
                      <option value="168h">1 Week</option>
                      <option value="custom">Custom Date</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {matchDeadline === 'none' ? 'Players can play their match at any time.'
                        : matchDeadline === 'custom' ? 'All matches must be played before the chosen date.'
                        : `Each match must be played within ${matchDeadline === '24h' ? '24 hours' : matchDeadline === '48h' ? '2 days' : '1 week'} of its scheduled time.`}
                    </p>
                  </Field>
                  {matchDeadline === 'custom' && (
                    <Field label="Deadline Date & Time" required>
                      <DateTimePicker value={matchDeadlineCustomDate} onChange={setMatchDeadlineCustomDate}
                        placeholder="Pick deadline date & time"
                        minDate={tournamentStart ? new Date(tournamentStart) : undefined} />
                    </Field>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* ── RIGHT column ─────────────────────────────────────── */}
            <div className="space-y-5 lg:sticky lg:top-6">

              {/* 2 · Participants */}
              <SectionCard step={2} title="Participants" icon={Users}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Max Players" required>
                    <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)}
                      min={2} max={1024} className={inputCls} />
                  </Field>
                  <Field label="Min Players" required>
                    <input type="number" value={minParticipants} onChange={(e) => setMinParticipants(e.target.value)}
                      min={2} className={inputCls} />
                  </Field>
                </div>
                {isTeamFormat(format) && (
                  <Field label="Team Size" required>
                    <input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}
                      min={1} max={100} readOnly={inferTeamSize(format) !== null} className={inputCls} />
                  </Field>
                )}
              </SectionCard>

              {/* 4 · Entry & Prize */}
              <SectionCard step={4} title="Entry Fee & Prize" icon={DollarSign}>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsFree(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      isFree ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}>
                    Free
                  </button>
                  <button type="button" onClick={() => setIsFree(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      !isFree ? "bg-orange-500/15 text-orange-300 border-orange-500/40" : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}>
                    Paid
                  </button>
                </div>

                {!isFree && (
                  <div className="space-y-4">
                    <Field label="Entry Fee (GHS)" required>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₵</span>
                        <input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)}
                          placeholder="0.00" min={0} step={0.01} className={`${inputCls} pl-8`} />
                      </div>
                    </Field>
                    <Field label="Prize Pool (GHS)" required>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₵</span>
                        <input type="number" value={prizePool} onChange={(e) => setPrizePool(e.target.value)}
                          placeholder="0.00" min={0} step={0.01} className={`${inputCls} pl-8`} />
                      </div>
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="1st %" required>
                        <input type="number" value={firstPrizePercentage} onChange={(e) => setFirstPrizePercentage(e.target.value)}
                          min={0} step={0.01} className={inputCls} />
                      </Field>
                      <Field label="2nd %" required>
                        <input type="number" value={secondPrizePercentage} onChange={(e) => setSecondPrizePercentage(e.target.value)}
                          min={0} step={0.01} className={inputCls} />
                      </Field>
                      <Field label="3rd %" required>
                        <input type="number" value={thirdPrizePercentage} onChange={(e) => setThirdPrizePercentage(e.target.value)}
                          min={0} step={0.01} className={inputCls} />
                      </Field>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* 5 · Rules */}
              <SectionCard step={5} title="Rules & Info" icon={Globe}>
                <Field label="Rules">
                  <textarea value={rules} onChange={(e) => setRules(e.target.value)}
                    placeholder="Tournament rules, code of conduct, etc."
                    rows={5} maxLength={5000} className={`${inputCls} resize-none`} />
                </Field>
              </SectionCard>

              {/* Submit */}
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900 px-5 py-4 space-y-3">
                {error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}
                <button type="submit" disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{isEditMode ? "Saving…" : !isFree ? "Redirecting to payment…" : "Publishing…"}</>
                  ) : (
                    <><Trophy className="w-4 h-4" />{isEditMode ? "Save Changes" : !isFree ? "Create & Pay Prize Pool" : "Create & Publish"}</>
                  )}
                </button>
                <button type="button" onClick={() => navigate("/auth/organizer/tournaments")}
                  className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateTournament;
