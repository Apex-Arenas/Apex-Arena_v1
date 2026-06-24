import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import {
  organizerService,
  type CreateTournamentPayload,
} from "../../../services/organizer.service";
import { apiGet } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import {
  LimitedEditForm,
  FullTournamentForm,
  type GameOption,
  type GameDetails,
  isTeamFormat,
  inferTeamSize,
  toIsoString,
  toDateTimeLocalValue,
} from "../../../components/create-tournament";

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [defaultBestOf, setDefaultBestOf] = useState("2");
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
        setDefaultBestOf(String(rulesData.default_best_of ?? 2));
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

  // Set default schedule dates on create (not edit)
  useEffect(() => {
    if (isEditMode) return;
    const now = new Date();
    const regOpen  = new Date(now.getTime() + 5  * 60_000);
    const regClose = new Date(now.getTime() + 10 * 60_000);
    const tourStart = new Date(now.getTime() + 15 * 60_000);
    setRegistrationStart(toDateTimeLocalValue(regOpen.toISOString()));
    setRegistrationEnd(toDateTimeLocalValue(regClose.toISOString()));
    setTournamentStart(toDateTimeLocalValue(tourStart.toISOString()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-set check-in between tournament start and end; clear if no end
  useEffect(() => {
    if (isEditMode) return;
    if (!tournamentStart || !tournamentEnd) {
      setCheckInStart("");
      setCheckInEnd("");
      return;
    }
    const start = new Date(tournamentStart);
    if (isNaN(start.getTime())) return;
    const checkInS = new Date(start.getTime() - 30 * 60_000);
    setCheckInStart(toDateTimeLocalValue(checkInS.toISOString()));
    setCheckInEnd(tournamentStart);
  }, [tournamentStart, tournamentEnd, isEditMode]);

  // Enforce type-specific defaults when tournament type changes
  useEffect(() => {
    if (tournamentType === 'double_elimination') {
      setMinParticipants(prev => (Number(prev) < 4 ? '4' : prev));
      setDefaultBestOf('2'); // always two legs, no choice
      // Snap max participants to nearest valid power of 2 (min 4)
      const DE_SIZES = [4, 8, 16, 32, 64];
      setMaxParticipants(prev => {
        const n = Number(prev);
        if (DE_SIZES.includes(n)) return prev;
        const snapped = DE_SIZES.find(s => s >= n) ?? DE_SIZES[DE_SIZES.length - 1];
        return String(snapped);
      });
    } else if (tournamentType === 'single_elimination') {
      setDefaultBestOf('1'); // always single match, no choice
    }
  }, [tournamentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDescription = description.trim();
    const trimmedTitle = title.trim();
    const trimmedRules = rules.trim();
    const trimmedContactEmail = contactEmail.trim();
    const trimmedRegion = region.trim();
    const mapPoolValues = mapPool
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const allowedRegionValues = allowedRegions
      .split(",")
      .map((item) => item.trim())
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
      if (trimmedContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContactEmail)) {
        setError("Contact email is invalid.");
        return;
      }
      if (trimmedDescription.length > 2000) {
        setError("Description must be 2000 characters or less.");
        return;
      }

      const st = normalizedTournamentStatus;
      const canEditSchedule   = ["draft","awaiting_deposit","published","open","locked"].includes(st);
      const canEditCapacity   = ["draft","awaiting_deposit","published","open"].includes(st);
      const canEditTitle      = ["draft","awaiting_deposit","published"].includes(st);
      const canEditRules      = ["draft","awaiting_deposit","published","open"].includes(st);
      const canEditVisibility = ["draft","awaiting_deposit","published"].includes(st);

      setIsSubmitting(true);
      try {
        const limitedUpdates: Partial<CreateTournamentPayload> = {
          description: trimmedDescription,
          contactEmail: trimmedContactEmail,
          ...(canEditThumbnailAfterPublish ? { thumbnailUrl: thumbnailUrl.trim() } : {}),
          ...(canEditTitle && title.trim() ? { title: title.trim() } : {}),
          ...(canEditVisibility ? { visibility } : {}),
          region,
          ...(canEditRules ? { rules: trimmedRules, mapPool: mapPool.trim() ? mapPool.trim().split(",").map((s) => s.trim()).filter(Boolean) : undefined } : {}),
          ...(canEditSchedule ? {
            registrationEnd:  toIsoString(registrationEnd)  ?? undefined,
            tournamentStart:  toIsoString(tournamentStart)  ?? undefined,
            tournamentEnd:    toIsoString(tournamentEnd)     ?? undefined,
            checkInStart:     toIsoString(checkInStart)      ?? undefined,
            checkInEnd:       toIsoString(checkInEnd)        ?? undefined,
            ...(["draft","awaiting_deposit","published"].includes(st)
              ? { registrationStart: toIsoString(registrationStart) ?? undefined }
              : {}),
          } : {}),
          ...(canEditCapacity ? {
            maxParticipants: Number(maxParticipants),
            waitlistEnabled,
            ...(["draft","awaiting_deposit","published"].includes(st)
              ? { minParticipants: Number(minParticipants) }
              : {}),
          } : {}),
        };

        const updated = await organizerService.updateTournament(tournamentId, limitedUpdates);
        navigate(`/auth/organizer/tournaments/${updated.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tournament.");
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
    const minAllowed = tournamentType === 'double_elimination' ? 4 : 2;
    if (!Number.isFinite(minParticipantsValue) || minParticipantsValue < minAllowed) {
      setError(`Minimum participants must be at least ${minAllowed}${tournamentType === 'double_elimination' ? ' for double elimination' : ''}.`);
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
          trimmedRegion === 'GLOBAL'
            ? []
            : allowedRegionValues.length > 0
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
    <div className="max-w-7xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 px-4 py-4 sm:px-8 sm:py-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/auth/organizer/tournaments")}
            className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800/60 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
              {isEditMode ? "Edit Tournament" : "Create Tournament"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 leading-snug">
              {isEditMode
                ? "Update your tournament details before it goes live."
                : "Fill in the details below to publish your tournament."}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
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
        <LimitedEditForm
          status={normalizedTournamentStatus}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/auth/organizer/tournaments")}
          isSubmitting={isSubmitting}
          canEditThumbnailAfterPublish={canEditThumbnailAfterPublish}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          visibility={visibility}
          setVisibility={setVisibility}
          region={region}
          setRegion={setRegion}
          thumbnailUrl={thumbnailUrl}
          setThumbnailUrl={setThumbnailUrl}
          rules={rules}
          setRules={setRules}
          mapPool={mapPool}
          setMapPool={setMapPool}
          registrationStart={registrationStart}
          setRegistrationStart={setRegistrationStart}
          registrationEnd={registrationEnd}
          setRegistrationEnd={setRegistrationEnd}
          tournamentStart={tournamentStart}
          setTournamentStart={setTournamentStart}
          tournamentEnd={tournamentEnd}
          setTournamentEnd={setTournamentEnd}
          checkInStart={checkInStart}
          setCheckInStart={setCheckInStart}
          checkInEnd={checkInEnd}
          setCheckInEnd={setCheckInEnd}
          maxParticipants={maxParticipants}
          setMaxParticipants={setMaxParticipants}
          minParticipants={minParticipants}
          setMinParticipants={setMinParticipants}
          waitlistEnabled={waitlistEnabled}
          setWaitlistEnabled={setWaitlistEnabled}
        />
      )}

      {/* ── Full create / edit form ────────────────────────────────── */}
      {!isLoadingTournament && !isLimitedEditMode && (
        <FullTournamentForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/auth/organizer/tournaments")}
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
          error={error}
          games={games}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          gameId={gameId}
          setGameId={setGameId}
          format={format}
          setFormat={setFormat}
          tournamentType={tournamentType}
          setTournamentType={setTournamentType}
          leagueLegs={leagueLegs}
          setLeagueLegs={setLeagueLegs}
          visibility={visibility}
          setVisibility={setVisibility}
          region={region}
          setRegion={setRegion}
          timezone={timezone}
          setTimezone={setTimezone}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          thumbnailUrl={thumbnailUrl}
          setThumbnailUrl={setThumbnailUrl}
          registrationStart={registrationStart}
          setRegistrationStart={setRegistrationStart}
          registrationEnd={registrationEnd}
          setRegistrationEnd={setRegistrationEnd}
          tournamentStart={tournamentStart}
          setTournamentStart={setTournamentStart}
          tournamentEnd={tournamentEnd}
          setTournamentEnd={setTournamentEnd}
          checkInStart={checkInStart}
          setCheckInStart={setCheckInStart}
          checkInEnd={checkInEnd}
          setCheckInEnd={setCheckInEnd}
          waitlistEnabled={waitlistEnabled}
          setWaitlistEnabled={setWaitlistEnabled}
          maxParticipants={maxParticipants}
          setMaxParticipants={setMaxParticipants}
          minParticipants={minParticipants}
          setMinParticipants={setMinParticipants}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          isFree={isFree}
          setIsFree={setIsFree}
          entryFee={entryFee}
          setEntryFee={setEntryFee}
          prizePool={prizePool}
          setPrizePool={setPrizePool}
          firstPrizePercentage={firstPrizePercentage}
          setFirstPrizePercentage={setFirstPrizePercentage}
          secondPrizePercentage={secondPrizePercentage}
          setSecondPrizePercentage={setSecondPrizePercentage}
          thirdPrizePercentage={thirdPrizePercentage}
          setThirdPrizePercentage={setThirdPrizePercentage}
          rules={rules}
          setRules={setRules}
        />
      )}
      </div>
    </div>
  );
};

export default CreateTournament;
