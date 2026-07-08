# Chinese President

An online multiplayer implementation of Chinese President (a President/Daifugō/Tycoon-family
shedding card game), with real-time rooms, simple AI bots, and custom SVG card graphics.

## Stack

- `shared/` — game rules engine (combo validation, deck, rank comparison), shared TypeScript types
- `server/` — Node + Express + Socket.IO, authoritative game state (rooms live in memory)
- `client/` — React + Vite, connects over Socket.IO

## Local development

```bash
npm install
npm run dev:server   # terminal 1 — http://localhost:3001
npm run dev:client   # terminal 2 — http://localhost:5173
```

Open `http://localhost:5173` in two browser windows to simulate two players.

## Tests

```bash
npm run test:shared   # combo engine unit tests (Vitest)
npm run typecheck     # tsc --noEmit across all packages
```

## Production build

```bash
npm run build   # builds the client to client/dist
npm start       # server serves the built client + Socket.IO on one port (see PORT env var)
```

Deploys as a single web service — see `render.yaml`.
