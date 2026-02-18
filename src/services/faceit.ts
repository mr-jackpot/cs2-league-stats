import { matchStatsCache, playerHistoryCache, playerSeasonsCache } from "./cache";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

// Known organizer IDs
export const ORGANIZERS = {
  ESEA: "08b06cfc-74d0-454b-9a51-feda4b6b18da",
} as const;

// Pagination constants
const FACEIT_MAX_LIMIT = 100;
const DEFAULT_MAX_MATCHES = parseInt(process.env.FACEIT_MAX_MATCHES || "200", 10);

// API helpers
const getApiKey = (): string => {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    throw new Error("FACEIT_API_KEY environment variable is not set. Please set FACEIT_API_KEY in your environment (for example, in a .env file).");
  }
  return apiKey;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const FACEIT_RETRY_MAX_ATTEMPTS = 3;
const FACEIT_RETRY_BASE_DELAY_MS = 1000;

const faceitFetch = async <T>(endpoint: string, attempt = 1): Promise<T> => {
  const response = await fetch(`${FACEIT_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
  });

  if (response.status === 429) {
    if (attempt >= FACEIT_RETRY_MAX_ATTEMPTS) {
      const error = await response.text();
      throw new Error(`FACEIT API error (429): Rate limit exceeded after ${attempt} attempts: ${error}`);
    }
    const retryAfterHeader = response.headers.get("Retry-After");
    const delayMs = retryAfterHeader
      ? parseInt(retryAfterHeader, 10) * 1000
      : FACEIT_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    await sleep(delayMs);
    return faceitFetch<T>(endpoint, attempt + 1);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FACEIT API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
};

// Types
interface MatchHistoryItem {
  match_id: string;
  competition_id: string;
  competition_name: string;
  competition_type: string;
  organizer_id: string;
  finished_at: number;
}

interface MatchHistoryResponse {
  items: MatchHistoryItem[];
}

interface PlayerMatchStats {
  player_id: string;
  player_stats: Record<string, string>;
}

interface MatchStatsResponse {
  rounds: Array<{
    teams: Array<{
      players: PlayerMatchStats[];
    }>;
  }>;
}

export interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  cover_image: string;
  platforms: Record<string, string>;
  games: Record<string, {
    region: string;
    game_player_id: string;
    skill_level: number;
    faceit_elo: number;
    game_player_name: string;
    skill_level_label: string;
    game_profile_id: string;
  }>;
  settings: {
    language: string;
  };
  friends_ids: string[];
  new_steam_id: string;
  steam_id_64: string;
  steam_nickname: string;
  memberships: string[];
  faceit_url: string;
  membership_type: string;
  cover_featured_image: string;
  verified: boolean;
  activated_at: string;
}

export interface CompetitionInfo {
  competition_id: string;
  competition_name: string;
  competition_type: string;
  organizer_id: string;
  match_count: number;
}

export interface PlayerSeasonStats {
  player_id: string;
  competition_id: string;
  competition_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  kills: number;
  deaths: number;
  assists: number;
  kd_ratio: number;
  adr: number;
  headshot_pct: number;
  mvps: number;
  multi_kills: {
    triples: number;
    quads: number;
    aces: number;
  };
}

// Internal API calls
const getPlayerHistoryPaginated = async (
  playerId: string,
  game: string,
  maxMatches: number = DEFAULT_MAX_MATCHES
): Promise<MatchHistoryResponse> => {
  const cacheKey = `history:${playerId}:${game}:${maxMatches}`;
  const cached = playerHistoryCache.get<MatchHistoryResponse>(cacheKey);
  if (cached !== undefined) return cached;

  const allItems: MatchHistoryItem[] = [];
  let offset = 0;

  while (allItems.length < maxMatches) {
    const limit = Math.min(FACEIT_MAX_LIMIT, maxMatches - allItems.length);

    const params = new URLSearchParams({
      game,
      offset: offset.toString(),
      limit: limit.toString(),
    });

    const response = await faceitFetch<MatchHistoryResponse>(
      `/players/${playerId}/history?${params}`
    );

    allItems.push(...response.items);

    // Stop if we've exhausted available data
    if (response.items.length < limit) {
      break;
    }

    offset += limit;
  }

  const result = { items: allItems };
  playerHistoryCache.set(cacheKey, result);
  return result;
};

const getMatchStats = async (matchId: string): Promise<MatchStatsResponse> => {
  const cacheKey = `match:${matchId}`;
  const cached = matchStatsCache.get<MatchStatsResponse>(cacheKey);
  if (cached !== undefined) return cached;
  const result = await faceitFetch<MatchStatsResponse>(`/matches/${matchId}/stats`);
  matchStatsCache.set(cacheKey, result);
  return result;
};

// Public API
export const getPlayerById = async (playerId: string): Promise<FaceitPlayer> => {
  return faceitFetch<FaceitPlayer>(`/players/${playerId}`);
};

export const searchPlayers = async (
  nickname: string,
  game = "cs2",
  limit = 10
): Promise<{
  items: Array<{ player_id: string; nickname: string; avatar: string; country: string }>;
}> => {
  const params = new URLSearchParams({
    nickname,
    game,
    offset: "0",
    limit: limit.toString(),
  });
  return faceitFetch(`/search/players?${params}`);
};

export const getPlayerEseaSeasons = async (
  playerId: string,
  game = "cs2"
): Promise<CompetitionInfo[]> => {
  const cacheKey = `seasons:${playerId}:${game}`;
  const cached = playerSeasonsCache.get<CompetitionInfo[]>(cacheKey);
  if (cached !== undefined) return cached;

  const history = await getPlayerHistoryPaginated(playerId, game);
  const competitions = new Map<string, CompetitionInfo>();

  for (const match of history.items) {
    if (
      match.organizer_id !== ORGANIZERS.ESEA ||
      match.competition_type !== "championship"
    ) {
      continue;
    }

    if (competitions.has(match.competition_id)) {
      competitions.get(match.competition_id)!.match_count++;
    } else {
      competitions.set(match.competition_id, {
        competition_id: match.competition_id,
        competition_name: match.competition_name,
        competition_type: match.competition_type,
        organizer_id: match.organizer_id,
        match_count: 1,
      });
    }
  }

  const result = Array.from(competitions.values());
  playerSeasonsCache.set(cacheKey, result);
  return result;
};

export const getPlayerStatsForCompetition = async (
  playerId: string,
  competitionId: string,
  game = "cs2"
): Promise<PlayerSeasonStats> => {
  const history = await getPlayerHistoryPaginated(playerId, game);

  const competitionMatches = history.items.filter(
    (match) => match.competition_id === competitionId
  );

  if (competitionMatches.length === 0) {
    return {
      player_id: playerId,
      competition_id: competitionId,
      competition_name: "",
      matches_played: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      kd_ratio: 0,
      adr: 0,
      headshot_pct: 0,
      mvps: 0,
      multi_kills: { triples: 0, quads: 0, aces: 0 },
    };
  }

  const competitionName = competitionMatches[0].competition_name;

  const matchResults = await Promise.all(
    competitionMatches.map(async (match) => {
      try {
        const stats = await getMatchStats(match.match_id);
        const round = stats.rounds[0];
        if (!round) return null;

        for (const team of round.teams) {
          const player = team.players.find((p) => p.player_id === playerId);
          if (player) {
            return {
              won: player.player_stats["Result"] === "1",
              stats: player.player_stats,
            };
          }
        }
        return null;
      } catch {
        return null;
      }
    })
  );

  const validMatches = matchResults.filter(
    (m): m is NonNullable<typeof m> => m !== null
  );

  const sum = (key: string): number =>
    validMatches.reduce((acc, m) => acc + parseFloat(m.stats[key] || "0"), 0);

  const avg = (key: string): number => {
    const values = validMatches.map((m) => parseFloat(m.stats[key] || "0"));
    return values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
          100
      : 0;
  };

  const wins = validMatches.filter((m) => m.won).length;
  const losses = validMatches.length - wins;

  return {
    player_id: playerId,
    competition_id: competitionId,
    competition_name: competitionName,
    matches_played: validMatches.length,
    wins,
    losses,
    win_rate:
      validMatches.length > 0
        ? Math.round((wins / validMatches.length) * 100)
        : 0,
    kills: sum("Kills"),
    deaths: sum("Deaths"),
    assists: sum("Assists"),
    kd_ratio: avg("K/D Ratio"),
    adr: avg("ADR"),
    headshot_pct: avg("Headshots %"),
    mvps: sum("MVPs"),
    multi_kills: {
      triples: sum("Triple Kills"),
      quads: sum("Quadro Kills"),
      aces: sum("Penta Kills"),
    },
  };
};
