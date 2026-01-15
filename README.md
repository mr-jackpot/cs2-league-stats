# CS2 League Stats API

API to provide statistics for CS2 teams on ESEA/FACEIT. Inspired by hltv.org but for amateur teams competing in ESEA leagues.

## Features

- Search for players by nickname
- Get all ESEA seasons a player has participated in
- Get aggregated player stats for any ESEA season (kills, deaths, K/D, ADR, etc.)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your FACEIT API key to .env

# Start development server
npm run dev
```

Server runs at `http://localhost:3000`

## API Documentation

Interactive API docs available at:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/openapi.json
- **OpenAPI YAML**: http://localhost:3000/openapi.yaml

## Configuration

Get a FACEIT API key from the [FACEIT Developer Portal](https://developers.faceit.com/):

1. Create an account/log in
2. Go to App Studio
3. Create a new app
4. Generate a Client-side API key

Add it to your `.env` file:

```
FACEIT_API_KEY=your_api_key_here
```

## API Endpoints

### Health Check

```
GET /health
```

### Search Players

```
GET /players/search?nickname=MR-JACKPOT
```

Response:
```json
{
  "items": [
    {
      "player_id": "6204e106-724d-4814-a605-943767d61366",
      "nickname": "MR-JACKPOT",
      "avatar": "https://...",
      "country": "GB"
    }
  ]
}
```

### Get Player's ESEA Seasons

```
GET /players/:playerId/esea
```

Response:
```json
{
  "player_id": "6204e106-724d-4814-a605-943767d61366",
  "seasons": [
    {
      "competition_id": "ad2c5d0b-b6ff-4851-b3ac-b328dbb6d6c7",
      "competition_name": "ESEA S55 EU Open10 Central - Regular Season",
      "match_count": 13
    }
  ]
}
```

### Get Player Stats for a Season

```
GET /players/:playerId/competitions/:competitionId/stats
```

Response:
```json
{
  "player_id": "6204e106-724d-4814-a605-943767d61366",
  "competition_id": "ad2c5d0b-b6ff-4851-b3ac-b328dbb6d6c7",
  "competition_name": "ESEA S55 EU Open10 Central - Regular Season",
  "matches_played": 11,
  "wins": 8,
  "losses": 3,
  "win_rate": 73,
  "kills": 188,
  "deaths": 143,
  "assists": 63,
  "kd_ratio": 1.43,
  "adr": 89.71,
  "headshot_pct": 50.82,
  "mvps": 26,
  "multi_kills": {
    "triples": 11,
    "quads": 3,
    "aces": 1
  }
}
```

## Example Flow

```bash
# 1. Find a player
curl "http://localhost:3000/players/search?nickname=MR-JACKPOT"

# 2. Get their ESEA seasons
curl "http://localhost:3000/players/6204e106-724d-4814-a605-943767d61366/esea"

# 3. Get stats for a specific season
curl "http://localhost:3000/players/6204e106-724d-4814-a605-943767d61366/competitions/ad2c5d0b-b6ff-4851-b3ac-b328dbb6d6c7/stats"
```

## Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript
npm start        # Run production build
npm test         # Run tests in watch mode
npm run test:run # Run tests once
npm run lint     # Run ESLint
```

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Koa
- **Testing**: Vitest
- **Docs**: Swagger UI / OpenAPI 3.0
- **Data Source**: [FACEIT Data API](https://docs.faceit.com/docs/data-api/)

## License

MIT
