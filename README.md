# Half Point Draft Room

A live fantasy football draft board tailored to a 10-team, half-PPR snake league drafting from slot 10.

## What it does

- tracks all 160 picks and recognizes the turn at 1.10/2.01, 3.10/4.01, and later rounds
- ranks available players using half-PPR value, roster need, tier scarcity, and turn risk
- fills a 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 D/ST, 1 K, 7 bench roster
- supports player search, position filters, undo, reset, and draft import/export
- saves the draft automatically in browser storage
- starts with a 2026 rankings baseline refreshed August 17, 2026

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run build
npx tsc --noEmit
node --test tests/rendered-html.test.mjs
```

## Ranking model

The recommendation score begins with the player's 2026 half-PPR rank, then adjusts for:

- open starting positions and flex depth
- the drop to the next available player at the same position
- whether a player is likely to survive the long wait between turns
- round-aware quarterback, defense, and kicker timing

The baseline links to the public [FantasyPros 2026 half-PPR cheat sheet](https://www.fantasypros.com/nfl/cheatsheets/top-half-ppr-players.php). Player situations and rankings can change, so refresh the data before draft day.

## Stack

React 19, TypeScript, Tailwind CSS, vinext, Vite, and Cloudflare Workers via Codex Sites.
