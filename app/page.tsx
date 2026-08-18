"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Player, Position, players } from "./players";

type DraftPick = { playerId: string; mine: boolean; at: number };
type BoardView = "available" | "drafted";
type Filter = "ALL" | Position;

const STORAGE_KEY = "half-point-draft-room-v1";
const TEAM_COUNT = 10;
const ROUNDS = 16;
const DRAFT_SLOT = 10;
const POSITIONS: Filter[] = ["ALL", "RB", "WR", "QB", "TE", "DST", "K"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function draftCoordinates(overall: number) {
  const round = Math.ceil(overall / TEAM_COUNT);
  const column = ((overall - 1) % TEAM_COUNT) + 1;
  const team = round % 2 === 1 ? column : TEAM_COUNT + 1 - column;
  const pick = column;
  return { round, team, pick };
}

function isOurPick(overall: number) {
  return draftCoordinates(overall).team === DRAFT_SLOT;
}

function nextOurPick(from: number) {
  for (let pick = from; pick <= TEAM_COUNT * ROUNDS; pick += 1) {
    if (isOurPick(pick)) return pick;
  }
  return TEAM_COUNT * ROUNDS;
}

function pickLabel(overall: number) {
  const { round, pick } = draftCoordinates(overall);
  return `${round}.${String(pick).padStart(2, "0")}`;
}

function positionCounts(roster: Player[]) {
  return roster.reduce<Record<Position, number>>(
    (acc, player) => ({ ...acc, [player.pos]: acc[player.pos] + 1 }),
    { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 },
  );
}

function recommendationFor(player: Player, available: Player[], roster: Player[], overall: number) {
  const round = Math.ceil(overall / TEAM_COUNT);
  const counts = positionCounts(roster);
  const skillCount = counts.RB + counts.WR + counts.TE;
  const nextAt = nextOurPick(overall + 1);
  const samePosition = available.filter((candidate) => candidate.pos === player.pos && candidate.rank > player.rank);
  const nextAtPosition = samePosition[0];
  const tierCliff = nextAtPosition ? Math.max(0, nextAtPosition.tier - player.tier) : 1;
  const reasons: string[] = [];
  let score = 118 - player.rank * 0.38;
  let need = 0;

  if (player.pos === "RB" || player.pos === "WR") {
    const count = counts[player.pos];
    if (count < 2) {
      need += 13 - count * 2;
      reasons.push(`fills your ${player.pos}${count + 1} starter`);
    } else if (skillCount < 6) {
      need += 6;
      reasons.push("strengthens the flex race");
    } else if (count < 4) {
      need += 2;
      reasons.push("adds high-value depth");
    } else {
      need -= 4;
    }
  }

  if (player.pos === "TE") {
    if (counts.TE === 0) {
      need += round >= 3 ? 10 : 4;
      reasons.push("solves your starting tight end slot");
    } else if (skillCount < 6 && player.tier <= 3) {
      need += 1;
      reasons.push("can create a flex edge");
    } else {
      need -= 9;
    }
  }

  if (player.pos === "QB") {
    if (counts.QB === 0) {
      need += round >= 5 ? 11 : player.tier <= 3 ? 3 : -7;
      reasons.push(round >= 5 ? "fills your open quarterback slot" : "offers an elite quarterback edge");
    } else {
      need -= round < 13 ? 18 : 4;
    }
  }

  if (player.pos === "DST" || player.pos === "K") {
    const alreadyFilled = counts[player.pos] > 0;
    need += alreadyFilled ? -30 : round >= 14 ? 14 : -48;
    reasons.push(round >= 14 ? `fills your ${player.pos === "DST" ? "defense" : "kicker"} slot` : "is best saved for the final rounds");
  }

  const scarcity = clamp(tierCliff * 5 + (nextAtPosition ? nextAtPosition.rank - player.rank : 4) * 0.35, 0, 10);
  if (scarcity >= 5) reasons.push(`sits near the end of ${player.pos} tier ${player.tier}`);
  const likelyGone = player.rank <= nextAt + 3;
  const turnUrgency = likelyGone ? clamp((nextAt - overall) * 0.28, 2, 8) : 0;
  if (turnUrgency >= 4) reasons.push("is unlikely to make it back through the turn");

  score += need + scarcity + turnUrgency;
  const fit = clamp(Math.round(78 + need * 0.65 + scarcity * 0.45 - Math.max(0, player.rank - overall) * 0.04), 48, 99);
  const explanation = reasons.length
    ? `${player.name} ${reasons.slice(0, 2).join(" and ")}.`
    : `${player.name} is the strongest half-PPR value left on the board.`;
  return { player, score, fit, explanation };
}

function assignRosterSlots(roster: Player[]) {
  const slots = [
    { key: "QB", label: "QB", accepts: ["QB"] },
    { key: "RB1", label: "RB", accepts: ["RB"] },
    { key: "RB2", label: "RB", accepts: ["RB"] },
    { key: "WR1", label: "WR", accepts: ["WR"] },
    { key: "WR2", label: "WR", accepts: ["WR"] },
    { key: "TE", label: "TE", accepts: ["TE"] },
    { key: "FLEX", label: "FLEX", accepts: ["RB", "WR", "TE"] },
    { key: "DST", label: "D/ST", accepts: ["DST"] },
    { key: "K", label: "K", accepts: ["K"] },
    ...Array.from({ length: 7 }, (_, index) => ({ key: `BN${index + 1}`, label: "BN", accepts: ["QB", "RB", "WR", "TE", "DST", "K"] })),
    { key: "IR", label: "IR", accepts: [] as string[] },
  ];
  const assigned = new Map<string, Player>();

  roster.forEach((player) => {
    const primary = slots.find((slot) => !assigned.has(slot.key) && slot.key !== "FLEX" && !slot.key.startsWith("BN") && slot.accepts.includes(player.pos));
    if (primary) {
      assigned.set(primary.key, player);
      return;
    }
    const flex = slots.find((slot) => slot.key === "FLEX" && !assigned.has(slot.key) && slot.accepts.includes(player.pos));
    if (flex) {
      assigned.set(flex.key, player);
      return;
    }
    const bench = slots.find((slot) => slot.key.startsWith("BN") && !assigned.has(slot.key));
    if (bench) assigned.set(bench.key, player);
  });
  return slots.map((slot) => ({ ...slot, player: assigned.get(slot.key) }));
}

export default function Home() {
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [view, setView] = useState<BoardView>("available");
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setPicks(JSON.parse(saved));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  }, [picks, hydrated]);

  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), []);
  const draftedIds = useMemo(() => new Set(picks.map((pick) => pick.playerId)), [picks]);
  const available = useMemo(() => players.filter((player) => !draftedIds.has(player.id)).sort((a, b) => a.rank - b.rank), [draftedIds]);
  const roster = useMemo(() => picks.filter((pick) => pick.mine).map((pick) => playerMap.get(pick.playerId)).filter((player): player is Player => Boolean(player)), [picks, playerMap]);
  const overall = Math.min(picks.length + 1, TEAM_COUNT * ROUNDS);
  const current = draftCoordinates(overall);
  const ourTurn = isOurPick(overall);
  const upcomingOurPick = nextOurPick(overall);
  const afterThat = nextOurPick(upcomingOurPick + 1);
  const recommendations = useMemo(
    () => available.map((player) => recommendationFor(player, available, roster, overall)).sort((a, b) => b.score - a.score).slice(0, 8),
    [available, roster, overall],
  );
  const featured = recommendations[0];
  const rosterSlots = assignRosterSlots(roster);

  const shownPlayers = useMemo(() => {
    const source = view === "available"
      ? available
      : [...picks].reverse().map((pick) => playerMap.get(pick.playerId)).filter((player): player is Player => Boolean(player));
    return source.filter((player) => {
      const matchesPosition = filter === "ALL" || player.pos === filter;
      const needle = query.trim().toLowerCase();
      return matchesPosition && (!needle || `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(needle));
    });
  }, [available, filter, picks, playerMap, query, view]);

  function recordPick(player: Player, mine: boolean) {
    if (draftedIds.has(player.id) || picks.length >= TEAM_COUNT * ROUNDS) return;
    setPicks((currentPicks) => [...currentPicks, { playerId: player.id, mine, at: currentPicks.length + 1 }]);
    setQuery("");
  }

  function undoPick() { setPicks((currentPicks) => currentPicks.slice(0, -1)); }
  function resetDraft() {
    if (window.confirm("Reset the entire draft? This removes every logged pick.")) setPicks([]);
  }

  function exportDraft() {
    const payload = JSON.stringify({ league: "10-team half-PPR, pick 10", picks }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "half-point-draft.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importDraft(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = Array.isArray(parsed) ? parsed : parsed.picks;
        if (!Array.isArray(incoming)) throw new Error("Invalid draft file");
        setPicks(incoming.filter((pick) => typeof pick.playerId === "string" && playerMap.has(pick.playerId)).slice(0, TEAM_COUNT * ROUNDS));
      } catch {
        window.alert("That file is not a valid Half Point draft export.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <main>
      <header className="topbar">
        <div className="brandMark">H</div>
        <div className="brandCopy"><p className="eyebrow">HALF POINT</p><h1>Draft Room</h1></div>
        <div className="leaguePill"><span /> 10-team · Pick 10 · Snake</div>
        <div className="headerActions">
          <button className="quietButton" onClick={undoPick} disabled={!picks.length}>Undo</button>
          <button className="quietButton" onClick={exportDraft}>Export</button>
          <button className="quietButton" onClick={() => importRef.current?.click()}>Import</button>
          <input ref={importRef} className="visuallyHidden" type="file" accept="application/json" onChange={importDraft} />
        </div>
      </header>

      <section className="draftStatus">
        <div className="statusIntro">
          <p className="eyebrow">{ourTurn ? "YOU’RE ON THE CLOCK" : `PICK ${overall} OF ${TEAM_COUNT * ROUNDS}`}</p>
          <h2>{ourTurn ? "Make the turn count." : "Track the room."}</h2>
          <p>{ourTurn ? `You pick now at ${pickLabel(overall)}${afterThat === overall + 1 ? ` and again at ${pickLabel(afterThat)}` : ""}.` : `Team ${current.team} is picking. You’re up at ${pickLabel(upcomingOurPick)} in ${upcomingOurPick - overall} picks.`}</p>
        </div>
        <div className={`clockCard ${ourTurn ? "active" : ""}`}><span>{ourTurn ? "YOUR PICK" : "ON THE CLOCK"}</span><strong>{pickLabel(overall)}</strong><small>ROUND {current.round} · OVERALL {overall}</small></div>
        <div className="turnPlan"><p className="eyebrow">NEXT TURN</p><div><strong>{pickLabel(upcomingOurPick)}</strong><span>overall {upcomingOurPick}</span></div><div><strong>{pickLabel(afterThat)}</strong><span>overall {afterThat}</span></div></div>
      </section>

      <section className="recommendationStrip">
        <div className="recommendationLead">
          <p className="eyebrow">BEST FIT RIGHT NOW</p>
          {featured ? <>
            <div className="featuredName"><span className={`posBadge ${featured.player.pos.toLowerCase()}`}>{featured.player.pos}</span><h3>{featured.player.name}</h3></div>
            <p>{featured.explanation}</p>
            <div className="featuredMeta"><span>{featured.player.team}</span><span>Bye {featured.player.bye}</span><span>Half-PPR #{featured.player.rank}</span><span>Tier {featured.player.tier}</span></div>
            <div className="featuredActions"><button className="primaryButton" onClick={() => recordPick(featured.player, true)}>Draft for me</button><button className="secondaryButton dark" onClick={() => recordPick(featured.player, false)}>Taken by another team</button></div>
          </> : <h3>Draft complete</h3>}
        </div>
        <div className="fitGauge"><strong>{featured?.fit ?? "—"}</strong><span>FIT SCORE</span><div className="gaugeTrack"><i style={{ width: `${featured?.fit ?? 0}%` }} /></div><small>Value + need + scarcity + turn risk</small></div>
        <div className="alternatives"><p className="eyebrow">NEXT BEST</p>{recommendations.slice(1, 5).map((item, index) => <button key={item.player.id} onClick={() => recordPick(item.player, ourTurn)}><span>{index + 2}</span><div><strong>{item.player.name}</strong><small>{item.player.pos} · {item.player.team} · fit {item.fit}</small></div><b>＋</b></button>)}</div>
      </section>

      <div className="workspace">
        <section className="boardPanel">
          <div className="panelHeading"><div><p className="eyebrow">LIVE PLAYER POOL</p><h3>Draft board</h3></div><div className="viewToggle"><button className={view === "available" ? "selected" : ""} onClick={() => setView("available")}>Available <span>{available.length}</span></button><button className={view === "drafted" ? "selected" : ""} onClick={() => setView("drafted")}>Drafted <span>{picks.length}</span></button></div></div>
          <label className="searchBox"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a player, team, or position…" /></label>
          <div className="positionFilters">{POSITIONS.map((position) => <button key={position} className={filter === position ? "selected" : ""} onClick={() => setFilter(position)}>{position === "DST" ? "D/ST" : position}</button>)}</div>
          <div className="boardHeader"><span>RK</span><span>PLAYER</span><span>TIER</span><span>FIT</span><span>ACTION</span></div>
          <div className="playerList">
            {shownPlayers.map((player) => {
              const item = recommendationFor(player, available, roster, overall);
              const pick = picks.find((candidate) => candidate.playerId === player.id);
              return <article className="playerRow" key={player.id}>
                <span className="rank">{String(player.rank).padStart(3, "0")}</span>
                <div className="playerIdentity"><span className={`posBadge ${player.pos.toLowerCase()}`}>{player.pos === "DST" ? "D" : player.pos}</span><div><strong>{player.name}</strong><small>{player.team} · Bye {player.bye}</small></div></div>
                <span className="tier">T{player.tier}</span><span className="rowFit">{view === "available" ? item.fit : "—"}</span>
                {view === "available" ? <div className="rowActions"><button onClick={() => recordPick(player, false)} title="Taken by another team">Out</button><button className="mine" onClick={() => recordPick(player, true)} title="Add to my roster">Mine</button></div> : <span className={`draftedBy ${pick?.mine ? "mine" : ""}`}>{pick?.mine ? "MY ROSTER" : `PICK ${pick?.at}`}</span>}
              </article>;
            })}
            {!shownPlayers.length && <div className="emptyState">No players match those filters.</div>}
          </div>
        </section>

        <aside className="rosterPanel">
          <div className="panelHeading"><div><p className="eyebrow">TEAM 10</p><h3>Your roster</h3></div><span className="rosterCount">{roster.length}/16</span></div>
          <div className="rosterSlots">{rosterSlots.map((slot) => <div className={`rosterSlot ${slot.player ? "filled" : ""}`} key={slot.key}><span>{slot.label}</span>{slot.player ? <div><strong>{slot.player.name}</strong><small>{slot.player.pos} · {slot.player.team} · Bye {slot.player.bye}</small></div> : <em>Open slot</em>}</div>)}</div>
          <div className="rosterNote"><strong>Roster logic</strong><p>The board prioritizes value early, then increases lineup-need pressure as your open starting slots become urgent.</p></div>
        </aside>
      </div>

      <footer>
        <div><strong>Half Point Draft Room</strong><span>Built for a 10-team, half-PPR snake draft from slot 10.</span></div>
        <div className="footerLinks"><a href="https://www.fantasypros.com/nfl/cheatsheets/top-half-ppr-players.php" target="_blank" rel="noreferrer">2026 rankings baseline ↗</a><button onClick={resetDraft}>Reset draft</button></div>
        <p>Rankings baseline refreshed August 17, 2026. Recommendations are decision support, not a guarantee of player availability or performance.</p>
      </footer>
    </main>
  );
}
