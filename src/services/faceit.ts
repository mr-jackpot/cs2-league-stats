const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

interface FaceitTeam {
  team_id: string;
  name: string;
  nickname: string;
  avatar: string;
  game: string;
  faceit_url: string;
  members: FaceitTeamMember[];
}

interface FaceitTeamMember {
  user_id: string;
  nickname: string;
  avatar: string;
  faceit_url: string;
  membership_type: string;
}

interface FaceitSearchResult {
  items: FaceitTeamSearchItem[];
  start: number;
  end: number;
}

interface FaceitTeamSearchItem {
  team_id: string;
  name: string;
  verified: boolean;
  avatar: string;
  game: string;
  faceit_url: string;
}

const getApiKey = (): string => {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    throw new Error("FACEIT_API_KEY environment variable is not set");
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

export const getTeamById = async (teamId: string): Promise<FaceitTeam> => {
  return faceitFetch<FaceitTeam>(`/teams/${teamId}`);
};

export const searchTeams = async (
  name: string,
  limit = 10
): Promise<FaceitSearchResult> => {
  const params = new URLSearchParams({
    nickname: name,
    offset: "0",
    limit: limit.toString(),
  });
  return faceitFetch<FaceitSearchResult>(`/search/teams?${params}`);
};

// Player history types
interface MatchHistoryPlayer {
  player_id: string;
  nickname: string;
  avatar: string;
  skill_level: number;
  game_player_id: string;
  game_player_name: string;
  faceit_url: string;
}

interface MatchHistoryTeam {
  team_id: string;
  nickname: string;
  avatar: string;
  type: string;
  players: MatchHistoryPlayer[];
}

interface MatchHistoryItem {
  match_id: string;
  game_id: string;
  region: string;
  match_type: string;
  game_mode: string;
  max_players: number;
  teams_size: number;
  teams: {
    faction1: MatchHistoryTeam;
    faction2: MatchHistoryTeam;
  };
  playing_players: string[];
  competition_id: string;
  competition_name: string;
  competition_type: string;
  organizer_id: string;
  status: string;
  started_at: number;
  finished_at: number;
  results: {
    winner: string;
    score: {
      faction1: number;
      faction2: number;
    };
  };
  faceit_url: string;
}

interface MatchHistoryResponse {
  items: MatchHistoryItem[];
  start: number;
  end: number;
  from: number;
  to: number;
}

// Match stats types
interface PlayerMatchStats {
  player_id: string;
  nickname: string;
  player_stats: Record<string, string>;
}

interface TeamMatchStats {
  team_id: string;
  premade: boolean;
  team_stats: Record<string, string>;
  players: PlayerMatchStats[];
}

interface MatchRoundStats {
  best_of: string;
  competition_id: string;
  game_id: string;
  game_mode: string;
  match_id: string;
  match_round: string;
  played: string;
  round_stats: Record<string, string>;
  teams: TeamMatchStats[];
}

interface MatchStatsResponse {
  rounds: MatchRoundStats[];
}

export const getPlayerHistory = async (
  playerId: string,
  game = "cs2",
  limit = 100
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

export const getMatchStats = async (
  matchId: string
): Promise<MatchStatsResponse> => {
  return faceitFetch<MatchStatsResponse>(`/matches/${matchId}/stats`);
};

export const getPlayerStatsForTeam = async (
  playerId: string,
  teamId: string,
  game = "cs2"
): Promise<{
  player_id: string;
  team_id: string;
  matches_played: number;
  matches: Array<{
    match_id: string;
    date: string;
    result: "win" | "loss";
    score: string;
    stats: Record<string, string>;
  }>;
  aggregated: Record<string, number>;
}> => {
  // Get player's match history
  const history = await getPlayerHistory(playerId, game, 100);

  // Filter matches where player was on the specified team
  const teamMatches = history.items.filter((match) => {
    const faction1HasPlayer = match.teams.faction1.players.some(
      (p) => p.player_id === playerId
    );
    const faction2HasPlayer = match.teams.faction2.players.some(
      (p) => p.player_id === playerId
    );

    if (faction1HasPlayer) {
      return match.teams.faction1.team_id === teamId;
    }
    if (faction2HasPlayer) {
      return match.teams.faction2.team_id === teamId;
    }
    return false;
  });

  // Fetch stats for each match
  const matchesWithStats = await Promise.all(
    teamMatches.map(async (match) => {
      const stats = await getMatchStats(match.match_id);
      const round = stats.rounds[0];

      // Find which team/faction the player was on
      let playerStats: Record<string, string> = {};
      let won = false;

      for (const team of round.teams) {
        const player = team.players.find((p) => p.player_id === playerId);
        if (player) {
          playerStats = player.player_stats;
          won = playerStats["Result"] === "1";
          break;
        }
      }

      const score = `${match.results.score.faction1}-${match.results.score.faction2}`;

      return {
        match_id: match.match_id,
        date: new Date(match.finished_at * 1000).toISOString(),
        result: won ? ("win" as const) : ("loss" as const),
        score,
        stats: playerStats,
      };
    })
  );

  // Aggregate stats
  const aggregated: Record<string, number> = {};
  const numericStats = [
    "Kills",
    "Deaths",
    "Assists",
    "Headshots",
    "MVPs",
    "ADR",
    "K/D Ratio",
    "K/R Ratio",
    "Headshots %",
    "Triple Kills",
    "Quadro Kills",
    "Penta Kills",
  ];

  for (const stat of numericStats) {
    const values = matchesWithStats
      .map((m) => parseFloat(m.stats[stat] || "0"))
      .filter((v) => !isNaN(v));

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      aggregated[stat] =
        stat === "Kills" ||
        stat === "Deaths" ||
        stat === "Assists" ||
        stat === "Headshots" ||
        stat === "MVPs" ||
        stat === "Triple Kills" ||
        stat === "Quadro Kills" ||
        stat === "Penta Kills"
          ? sum
          : Math.round((sum / values.length) * 100) / 100;
    }
  }

  aggregated["Wins"] = matchesWithStats.filter((m) => m.result === "win").length;
  aggregated["Losses"] = matchesWithStats.filter(
    (m) => m.result === "loss"
  ).length;

  return {
    player_id: playerId,
    team_id: teamId,
    matches_played: matchesWithStats.length,
    matches: matchesWithStats,
    aggregated,
  };
};

export const searchPlayers = async (
  nickname: string,
  game = "cs2",
  limit = 10
): Promise<{ items: Array<{ player_id: string; nickname: string; avatar: string; country: string }> }> => {
  const params = new URLSearchParams({
    nickname,
    game,
    offset: "0",
    limit: limit.toString(),
  });
  return faceitFetch(`/search/players?${params}`);
};

// Known organizer IDs
export const ORGANIZERS = {
  ESEA: "08b06cfc-74d0-454b-9a51-feda4b6b18da",
} as const;

interface CompetitionInfo {
  competition_id: string;
  competition_name: string;
  competition_type: string;
  organizer_id: string;
  match_count: number;
}

export const getPlayerCompetitions = async (
  playerId: string,
  game = "cs2",
  options?: { organizerId?: string; type?: string }
): Promise<CompetitionInfo[]> => {
  const history = await getPlayerHistory(playerId, game, 100);
  const competitions = new Map<string, CompetitionInfo>();

  for (const match of history.items) {
    // Filter by organizer if specified
    if (options?.organizerId && match.organizer_id !== options.organizerId) {
      continue;
    }
    // Filter by type if specified
    if (options?.type && match.competition_type !== options.type) {
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

export const getPlayerEseaSeasons = async (
  playerId: string,
  game = "cs2"
): Promise<CompetitionInfo[]> => {
  return getPlayerCompetitions(playerId, game, {
    organizerId: ORGANIZERS.ESEA,
    type: "championship",
  });
};

export const getPlayerStatsForCompetition = async (
  playerId: string,
  competitionId: string,
  game = "cs2"
): Promise<{
  player_id: string;
  competition_id: string;
  competition_name: string;
  matches_played: number;
  matches: Array<{
    match_id: string;
    date: string;
    map: string;
    result: "win" | "loss";
    score: string;
    stats: Record<string, string>;
  }>;
  aggregated: Record<string, number>;
}> => {
  // Get player's match history
  const history = await getPlayerHistory(playerId, game, 100);

  // Filter matches by competition_id
  const competitionMatches = history.items.filter(
    (match) => match.competition_id === competitionId
  );

  if (competitionMatches.length === 0) {
    return {
      player_id: playerId,
      competition_id: competitionId,
      competition_name: "",
      matches_played: 0,
      matches: [],
      aggregated: { Wins: 0, Losses: 0 },
    };
  }

  const competitionName = competitionMatches[0].competition_name;

  // Fetch stats for each match (with error handling)
  const matchResults = await Promise.all(
    competitionMatches.map(async (match) => {
      try {
        const stats = await getMatchStats(match.match_id);
        const round = stats.rounds[0];

        if (!round) {
          return null;
        }

        // Find the player's stats
        let playerStats: Record<string, string> = {};
        let won = false;

        for (const team of round.teams) {
          const player = team.players.find((p) => p.player_id === playerId);
          if (player) {
            playerStats = player.player_stats;
            won = playerStats["Result"] === "1";
            break;
          }
        }

        const score = `${match.results.score.faction1}-${match.results.score.faction2}`;
        const map = round.round_stats?.["Map"] || "Unknown";

        return {
          match_id: match.match_id,
          date: new Date(match.finished_at * 1000).toISOString(),
          map,
          result: won ? ("win" as const) : ("loss" as const),
          score,
          stats: playerStats,
        };
      } catch {
        // Skip matches where stats aren't available
        return null;
      }
    })
  );

  const matchesWithStats = matchResults.filter(
    (m): m is NonNullable<typeof m> => m !== null
  );

  // Aggregate stats
  const aggregated: Record<string, number> = {};
  const sumStats = [
    "Kills",
    "Deaths",
    "Assists",
    "Headshots",
    "MVPs",
    "Triple Kills",
    "Quadro Kills",
    "Penta Kills",
  ];
  const avgStats = ["ADR", "K/D Ratio", "K/R Ratio", "Headshots %"];

  for (const stat of sumStats) {
    const values = matchesWithStats
      .map((m) => parseFloat(m.stats[stat] || "0"))
      .filter((v) => !isNaN(v));
    if (values.length > 0) {
      aggregated[stat] = values.reduce((a, b) => a + b, 0);
    }
  }

  for (const stat of avgStats) {
    const values = matchesWithStats
      .map((m) => parseFloat(m.stats[stat] || "0"))
      .filter((v) => !isNaN(v));
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      aggregated[stat] = Math.round(avg * 100) / 100;
    }
  }

  aggregated["Wins"] = matchesWithStats.filter((m) => m.result === "win").length;
  aggregated["Losses"] = matchesWithStats.filter((m) => m.result === "loss").length;
  aggregated["Win Rate"] = Math.round(
    (aggregated["Wins"] / matchesWithStats.length) * 100
  );

  return {
    player_id: playerId,
    competition_id: competitionId,
    competition_name: competitionName,
    matches_played: matchesWithStats.length,
    matches: matchesWithStats,
    aggregated,
  };
};

export type {
  FaceitTeam,
  FaceitTeamMember,
  FaceitTeamSearchItem,
  MatchHistoryItem,
  PlayerMatchStats,
};
