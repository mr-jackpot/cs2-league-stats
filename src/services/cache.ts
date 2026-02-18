import NodeCache from "node-cache";

// Match stats are immutable once a match is played — cache for 24 hours
export const matchStatsCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// Player match history and derived season list — 5 minutes (fresh enough for active players)
export const playerHistoryCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
export const playerSeasonsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
