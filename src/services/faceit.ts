const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

// Known organizer IDs
export const ORGANIZERS = {
  ESEA: "08b06cfc-74d0-454b-9a51-feda4b6b18da",
} as const;

// API helpers
const getApiKey = (): string => {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    throw new Error("FACEIT_API_KEY environment variable is not set. Please set FACEIT_API_KEY in your environment (for example, in a .env file).");
  }
  return apiKey;
};

const faceitFetch = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${FACEIT_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
  });

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
const getPlayerHistory = async (
  playerId: string,
  game: string,
  limit: number
): Promise<MatchHistoryResponse> => {
  const params = new URLSearchParams({
    game,
    offset: "0",
    limit: limit.toString(),
  });
  return faceitFetch<MatchHistoryResponse>(
    `/players/${playerId}/history?${params}`
  );
};

const getMatchStats = async (matchId: string): Promise<MatchStatsResponse> => {
  return faceitFetch<MatchStatsResponse>(`/matches/${matchId}/stats`);
};

// Public API
export const getPlayerById = async (
  playerId: string
): Promise<{ player_id: string; nickname: string; avatar: string; country: string }> => {
  return faceitFetch(`/players/${playerId}`);
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
  const history = await getPlayerHistory(playerId, game, 100);
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

  return Array.from(competitions.values());
};

export const getPlayerStatsForCompetition = async (
  playerId: string,
  competitionId: string,
  game = "cs2"
): Promise<PlayerSeasonStats> => {
  const history = await getPlayerHistory(playerId, game, 100);

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
