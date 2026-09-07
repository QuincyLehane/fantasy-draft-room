"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Player, Position, ScoringMode, playersForScoring } from "./players";
import { PLAYER_PROFILES_REFRESHED, profileFor } from "./player-profiles";
import { RANKINGS_REFRESHED } from "./current-rankings";
import { PPR_RANKINGS_REFRESHED } from "./ppr-rankings";
import { rosterGuardrails } from "./roster-guardrails";
import { LEAGUE_CONFIGS, LeagueConfig } from "./league-config";
import { draftCoordinates, isTeamPick, nextTeamPick, pickLabel } from "./draft-order";
import { mapSleeperPicks, SLEEPER_PICKS_URL } from "./sleeper-sync";

type DraftPick = { playerId: string; mine: boolean; at: number };
type BoardView = "available" | "drafted";
type Filter = "ALL" | Position;
type SleeperSyncState = { status: "connecting" | "live" | "error"; lastUpdated?: Date; unmatched: number };

const STORAGE_KEYS: Record<ScoringMode, string> = {
  half: "half-point-draft-room-v1",
  ppr: "full-ppr-draft-room-v1",
};
const POSITIONS: Filter[] = ["ALL", "RB", "WR", "QB", "TE", "DST", "K"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function positionCounts(roster: Player[]) {
  return roster.reduce<Record<Position, number>>(
    (acc, player) => ({ ...acc, [player.pos]: acc[player.pos] + 1 }),
    { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 },
  );
}

function youthScore(player: Player, age: number) {
  if (!age || player.pos === "DST" || player.pos === "K") return 5;
  if (player.pos === "RB") return age <= 23 ? 10 : age === 24 ? 9 : age === 25 ? 7.5 : age === 26 ? 6 : age === 27 ? 4 : age === 28 ? 2 : 0.5;
  if (player.pos === "WR") return age <= 24 ? 10 : age <= 26 ? 8 : age <= 28 ? 5.5 : age <= 30 ? 2.5 : 1;
  if (player.pos === "QB") return age <= 26 ? 9 : age <= 31 ? 7 : age <= 34 ? 4.5 : 1.5;
  return age <= 25 ? 9 : age <= 28 ? 7 : age <= 30 ? 4.5 : 2;
}

function upsideScore(player: Player, age: number, yearsExp: number) {
  if (player.pos === "DST" || player.pos === "K") return 5;
  const careerStage = yearsExp === 0 ? 10 : yearsExp === 1 ? 9.5 : yearsExp === 2 ? 8.5 : yearsExp === 3 ? 7.5 : yearsExp === 4 ? 6 : yearsExp <= 6 ? 4.5 : 3;
  const prospectBoost = player.tier <= 3 && age > 0 && youthScore(player, age) >= 8 ? 0.75 : 0;
  return clamp(Math.round((careerStage + prospectBoost) * 10) / 10, 1, 10);
}

function availabilityScore(player: Player, age: number, status: string | undefined, recurringRisk: number) {
  if (player.pos === "DST" || player.pos === "K") return 7;
  const normalized = status?.toLowerCase() ?? "";
  const statusPenalty = normalized.includes("ir") || normalized.includes("out")
    ? 7
    : normalized.includes("pup") || normalized.includes("doubt")
      ? 5
      : normalized.includes("question")
        ? 2
        : 0;
  const agePenalty = player.pos === "RB" && age >= 29
    ? 2
    : player.pos === "RB" && age >= 27
      ? 1
      : player.pos === "WR" && age >= 31
        ? 1.5
        : (player.pos === "TE" && age >= 32) || (player.pos === "QB" && age >= 35)
          ? 1
          : 0;
  return clamp(Math.round((9 - statusPenalty - recurringRisk - agePenalty) * 10) / 10, 1, 10);
}

function strategyScores(player: Player) {
  const profile = profileFor(player.name);
  const youth = youthScore(player, profile.age);
  const upside = upsideScore(player, profile.age, profile.yearsExp);
  const availability = availabilityScore(player, profile.age, profile.injuryStatus, profile.recurringRisk ?? 0);
  return { ...profile, youth, upside, availability };
}

function recommendationFor(player: Player, available: Player[], roster: Player[], overall: number, scoring: ScoringMode, config: LeagueConfig) {
  const round = Math.ceil(overall / config.teamCount);
  const counts = positionCounts(roster);
  const skillCount = counts.RB + counts.WR + counts.TE;
  const nextAt = nextTeamPick(overall + 1, config.teamCount * config.rounds, config.draftSlot, config.teamCount);
  const samePosition = available.filter((candidate) => candidate.pos === player.pos && candidate.rank > player.rank);
  const nextAtPosition = samePosition[0];
  const tierCliff = nextAtPosition ? Math.max(0, nextAtPosition.tier - player.tier) : 1;
  const lineupReasons: string[] = [];
  const marketReasons: string[] = [];
  const strategyReasons: string[] = [];
  const strategy = strategyScores(player);
  let score = 118 - player.rank * 0.38;
  let need = 0;

  if (player.pos === "RB" || player.pos === "WR") {
    const count = counts[player.pos];
    if (count < 2) {
      need += 13 - count * 2;
      lineupReasons.push(`fills your ${player.pos}${count + 1} starter`);
    } else if (skillCount < 6) {
      need += 6;
      lineupReasons.push("strengthens the flex race");
    } else if (count < 4) {
      need += 2;
      lineupReasons.push("adds high-value depth");
    } else {
      need -= 4;
    }
  }

  if (player.pos === "TE") {
    if (counts.TE === 0) {
      need += round >= 3 ? 10 : 4;
      lineupReasons.push("solves your starting tight end slot");
    } else if (skillCount < 6 && player.tier <= 3) {
      need += 1;
      lineupReasons.push("can create a flex edge");
    } else {
      need -= 9;
    }
  }

  if (player.pos === "QB") {
    if (counts.QB === 0) {
      need += round >= 5 ? 11 : player.tier <= 3 ? 3 : -7;
      lineupReasons.push(round >= 5 ? "fills your open quarterback slot" : "offers an elite quarterback edge");
    }
  }

  if (player.pos === "DST" || player.pos === "K") {
    const alreadyFilled = counts[player.pos] > 0;
    need += alreadyFilled ? -30 : round >= 14 ? 14 : -48;
    lineupReasons.push(round >= 14 ? `fills your ${player.pos === "DST" ? "defense" : "kicker"} slot` : "is best saved for the final rounds");
  }

  const guardrail = rosterGuardrails(player.pos, counts, roster.length, round, {
    rosterLimit: config.rosterSize,
    flexSlots: config.flexSlots,
    totalRounds: config.rounds,
  });
  need += guardrail.adjustment;

  const scarcity = clamp(tierCliff * 5 + (nextAtPosition ? nextAtPosition.rank - player.rank : 4) * 0.35, 0, 10);
  if (scarcity >= 5) marketReasons.push(`sits near the end of ${player.pos} tier ${player.tier}`);
  const likelyGone = player.rank <= nextAt + 3;
  const turnUrgency = likelyGone ? clamp((nextAt - overall) * 0.28, 2, 8) : 0;
  if (turnUrgency >= 4) marketReasons.push("is unlikely to make it back through the turn");
  const reachPenalty = turnUrgency >= 4 ? 0 : clamp((player.rank - overall - 4) * 1.5, 0, 12);
  if (reachPenalty >= 4) marketReasons.push("can likely be taken later than this pick");

  if (strategy.upside >= 8) strategyReasons.push("brings the high ceiling you asked for");
  else if (strategy.youth >= 8) strategyReasons.push("fits your youth-first build");
  if (strategy.availability >= 8 && !strategyReasons.length) strategyReasons.push("has a strong availability profile");
  if (strategy.availability <= 4) strategyReasons.push("carries a meaningful availability penalty");

  const preferenceAdjustment = (strategy.youth - 5) * 1.15 + (strategy.availability - 7.5) * 1.6 + (strategy.upside - 5) * 1.6;
  score += need + scarcity + turnUrgency + preferenceAdjustment - reachPenalty;
  const fit = clamp(Math.round(score * 0.63), 48, 99);
  const reasons = [...guardrail.reasons.slice(0, 1), ...lineupReasons.slice(0, 1), ...strategyReasons.slice(0, 1), ...marketReasons.slice(0, 1)];
  const explanation = reasons.length
    ? `${player.name} ${reasons.slice(0, 2).join(" and ")}.`
    : `${player.name} is the strongest ${scoring === "ppr" ? "full-PPR" : "half-PPR"} value left on the board.`;
  return { player, score, fit, explanation, strategy };
}

function assignRosterSlots(roster: Player[], config: LeagueConfig) {
  const slots = [
    { key: "QB", label: "QB", accepts: ["QB"] },
    { key: "RB1", label: "RB", accepts: ["RB"] },
    { key: "RB2", label: "RB", accepts: ["RB"] },
    { key: "WR1", label: "WR", accepts: ["WR"] },
    { key: "WR2", label: "WR", accepts: ["WR"] },
    { key: "TE", label: "TE", accepts: ["TE"] },
    ...Array.from({ length: config.flexSlots }, (_, index) => ({ key: `FLEX${index + 1}`, label: config.flexSlots > 1 ? "W/R/T" : "FLEX", accepts: ["RB", "WR", "TE"] })),
    ...(config.flexSlots > 1
      ? [{ key: "K", label: "K", accepts: ["K"] }, { key: "DST", label: "DEF", accepts: ["DST"] }]
      : [{ key: "DST", label: "D/ST", accepts: ["DST"] }, { key: "K", label: "K", accepts: ["K"] }]),
    ...Array.from({ length: config.benchSlots }, (_, index) => ({ key: `BN${index + 1}`, label: "BN", accepts: ["QB", "RB", "WR", "TE", "DST", "K"] })),
    { key: "IR", label: "IR", accepts: [] as string[] },
  ];
  const assigned = new Map<string, Player>();

  roster.forEach((player) => {
    const primary = slots.find((slot) => !assigned.has(slot.key) && !slot.key.startsWith("FLEX") && !slot.key.startsWith("BN") && slot.accepts.includes(player.pos));
    if (primary) {
      assigned.set(primary.key, player);
      return;
    }
    const flex = slots.find((slot) => slot.key.startsWith("FLEX") && !assigned.has(slot.key) && slot.accepts.includes(player.pos));
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
  const [scoring, setScoring] = useState<ScoringMode>("half");
  const [drafts, setDrafts] = useState<Record<ScoringMode, DraftPick[]>>({ half: [], ppr: [] });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [view, setView] = useState<BoardView>("available");
  const [hydrated, setHydrated] = useState(false);
  const [sleeperSync, setSleeperSync] = useState<SleeperSyncState>({ status: "connecting", unmatched: 0 });
  const importRef = useRef<HTMLInputElement>(null);
  const pprPlayers = useMemo(() => playersForScoring("ppr"), []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const half = window.localStorage.getItem(STORAGE_KEYS.half);
        const ppr = window.localStorage.getItem(STORAGE_KEYS.ppr);
        setDrafts({
          half: half ? JSON.parse(half) : [],
          ppr: ppr ? JSON.parse(ppr) : [],
        });
      } catch {
        window.localStorage.removeItem(STORAGE_KEYS.half);
        window.localStorage.removeItem(STORAGE_KEYS.ppr);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEYS.half, JSON.stringify(drafts.half));
    window.localStorage.setItem(STORAGE_KEYS.ppr, JSON.stringify(drafts.ppr));
  }, [drafts, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let disposed = false;
    let syncing = false;

    async function syncSleeperPicks() {
      if (syncing) return;
      syncing = true;
      try {
        const response = await fetch(`${SLEEPER_PICKS_URL}?live=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Sleeper returned ${response.status}`);
        const result = mapSleeperPicks(await response.json(), pprPlayers);
        if (disposed) return;
        setDrafts((currentDrafts) => {
          const current = currentDrafts.ppr;
          const unchanged = current.length === result.picks.length && current.every((pick, index) => {
            const next = result.picks[index];
            return pick.playerId === next.playerId && pick.mine === next.mine && pick.at === next.at;
          });
          return unchanged ? currentDrafts : { ...currentDrafts, ppr: result.picks };
        });
        setSleeperSync({ status: "live", lastUpdated: new Date(), unmatched: result.unmatched });
      } catch {
        if (!disposed) setSleeperSync((current) => ({ ...current, status: "error" }));
      } finally {
        syncing = false;
      }
    }

    void syncSleeperPicks();
    const interval = window.setInterval(syncSleeperPicks, 3000);
    const syncWhenVisible = () => { if (document.visibilityState === "visible") void syncSleeperPicks(); };
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [hydrated, pprPlayers]);

  const picks = drafts[scoring];
  const config = LEAGUE_CONFIGS[scoring];
  const draftLimit = config.teamCount * config.rounds;
  const scoringPlayers = useMemo(() => playersForScoring(scoring), [scoring]);
  const playerMap = useMemo(() => new Map(scoringPlayers.map((player) => [player.id, player])), [scoringPlayers]);
  const draftedIds = useMemo(() => new Set(picks.map((pick) => pick.playerId)), [picks]);
  const available = useMemo(() => scoringPlayers.filter((player) => !draftedIds.has(player.id)).sort((a, b) => a.rank - b.rank), [draftedIds, scoringPlayers]);
  const roster = useMemo(() => picks.filter((pick) => pick.mine).map((pick) => playerMap.get(pick.playerId)).filter((player): player is Player => Boolean(player)), [picks, playerMap]);
  const overall = Math.min(picks.length + 1, draftLimit);
  const current = draftCoordinates(overall, config.teamCount);
  const ourTurn = isTeamPick(overall, config.draftSlot, config.teamCount);
  const upcomingOurPick = nextTeamPick(overall, draftLimit, config.draftSlot, config.teamCount);
  const afterThat = nextTeamPick(upcomingOurPick + 1, draftLimit, config.draftSlot, config.teamCount);
  const recommendations = useMemo(
    () => available.map((player) => recommendationFor(player, available, roster, overall, scoring, config)).sort((a, b) => b.score - a.score).slice(0, 8),
    [available, roster, overall, scoring, config],
  );
  const featured = recommendations[0];
  const rosterSlots = assignRosterSlots(roster, config);
  const sleeperControlled = scoring === "ppr";

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
    if (sleeperControlled || draftedIds.has(player.id) || picks.length >= draftLimit) return;
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [scoring]: [...currentDrafts[scoring], { playerId: player.id, mine, at: currentDrafts[scoring].length + 1 }],
    }));
    setQuery("");
  }

  function undoPick() {
    if (sleeperControlled) return;
    setDrafts((currentDrafts) => ({ ...currentDrafts, [scoring]: currentDrafts[scoring].slice(0, -1) }));
  }
  function resetDraft() {
    if (sleeperControlled) return;
    if (window.confirm("Reset the entire half-PPR draft? This removes every logged pick in this tab.")) {
      setDrafts((currentDrafts) => ({ ...currentDrafts, [scoring]: [] }));
    }
  }

  function exportDraft() {
    const format = scoring === "ppr" ? "full-PPR" : "half-PPR";
    const payload = JSON.stringify({ league: `${config.teamCount}-team ${format}, pick ${config.draftSlot}`, picks }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scoring === "ppr" ? "full-ppr" : "half-point"}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importDraft(event: ChangeEvent<HTMLInputElement>) {
    if (sleeperControlled) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = Array.isArray(parsed) ? parsed : parsed.picks;
        if (!Array.isArray(incoming)) throw new Error("Invalid draft file");
        const imported = incoming.filter((pick) => typeof pick.playerId === "string" && playerMap.has(pick.playerId)).slice(0, draftLimit);
        setDrafts((currentDrafts) => ({ ...currentDrafts, [scoring]: imported }));
      } catch {
        window.alert("That file is not a valid half-PPR draft export.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function changeScoring(next: ScoringMode) {
    setScoring(next);
    setQuery("");
    setFilter("ALL");
    setView("available");
  }

  return (
    <main>
      <header className="topbar">
        <div className="brandMark">{scoring === "ppr" ? "P" : "H"}</div>
        <div className="brandCopy"><p className="eyebrow">{scoring === "ppr" ? "FULL PPR" : "HALF POINT"}</p><h1>Draft Room</h1></div>
        <fieldset className="scoringTabs">
          <legend className="visuallyHidden">Scoring format</legend>
          <button type="button" aria-pressed={scoring === "half"} className={scoring === "half" ? "selected" : ""} onClick={() => changeScoring("half")}>Half PPR</button>
          <button type="button" aria-pressed={scoring === "ppr"} className={scoring === "ppr" ? "selected" : ""} onClick={() => changeScoring("ppr")}>Full PPR</button>
        </fieldset>
        <div className="leaguePill"><span />{` ${config.teamCount}-team · Pick ${config.draftSlot} · ${scoring === "ppr" ? "2 W/R/T · 5 BN" : "1 FLEX · 7 BN"} · Snake`}</div>
        {scoring === "ppr" && <div className={`sleeperPill ${sleeperSync.status}`} title={sleeperSync.lastUpdated ? `Last synced ${sleeperSync.lastUpdated.toLocaleTimeString()}` : "Connecting to Sleeper"}><span />SLEEPER {sleeperSync.status === "live" ? `LIVE · ${picks.length} PICKS` : sleeperSync.status === "error" ? "RETRYING" : "CONNECTING"}</div>}
        <div className="strategyPill">UPSIDE-FIRST</div>
        <div className="headerActions">
          <button className="quietButton" onClick={undoPick} disabled={sleeperControlled || !picks.length}>Undo</button>
          <button className="quietButton" onClick={exportDraft}>Export</button>
          <button className="quietButton" onClick={() => importRef.current?.click()} disabled={sleeperControlled}>Import</button>
          <input ref={importRef} className="visuallyHidden" type="file" accept="application/json" onChange={importDraft} />
        </div>
      </header>

      <section className="draftStatus">
        <div className="statusIntro">
          <p className="eyebrow">{ourTurn ? "YOU’RE ON THE CLOCK" : `PICK ${overall} OF ${draftLimit}`}</p>
          <h2>{ourTurn ? "Make the turn count." : "Track the room."}</h2>
          <p>{ourTurn ? `You pick now at ${pickLabel(overall, config.teamCount)}${afterThat === overall + 1 ? ` and again at ${pickLabel(afterThat, config.teamCount)}` : ""}.` : `Team ${current.team} is picking. You’re up at ${pickLabel(upcomingOurPick, config.teamCount)} in ${upcomingOurPick - overall} picks.`}</p>
        </div>
        <div className={`clockCard ${ourTurn ? "active" : ""}`}><span>{ourTurn ? "YOUR PICK" : "ON THE CLOCK"}</span><strong>{pickLabel(overall, config.teamCount)}</strong><small>ROUND {current.round} · OVERALL {overall}</small></div>
        <div className="turnPlan"><p className="eyebrow">NEXT TURN</p><div><strong>{pickLabel(upcomingOurPick, config.teamCount)}</strong><span>overall {upcomingOurPick}</span></div><div><strong>{pickLabel(afterThat, config.teamCount)}</strong><span>overall {afterThat}</span></div></div>
      </section>

      <section className="recommendationStrip">
        <div className="recommendationLead">
          <p className="eyebrow">BEST FIT RIGHT NOW</p>
          {featured ? <>
            <div className="featuredName"><span className={`posBadge ${featured.player.pos.toLowerCase()}`}>{featured.player.pos}</span><h3>{featured.player.name}</h3></div>
            <p>{featured.explanation}</p>
            <div className="featuredMeta"><span>{featured.player.team}</span><span>Bye {featured.player.bye}</span><span>{scoring === "ppr" ? "Full-PPR" : "Half-PPR"} #{featured.player.rank}</span><span>Age {featured.strategy.age || "—"}</span><span>Upside {featured.strategy.upside}/10</span><span>Availability {featured.strategy.availability}/10</span><span>{featured.strategy.injuryStatus ?? "No current designation"}</span></div>
            <div className="featuredActions">{sleeperControlled ? <><button className="primaryButton" disabled>Make pick in Sleeper</button><button className="secondaryButton dark" disabled>{sleeperSync.status === "live" ? "Picks update automatically" : "Waiting for Sleeper"}</button></> : <><button className="primaryButton" onClick={() => recordPick(featured.player, true)}>Draft for me</button><button className="secondaryButton dark" onClick={() => recordPick(featured.player, false)}>Taken by another team</button></>}</div>
          </> : <h3>Draft complete</h3>}
        </div>
        <div className="fitGauge"><strong>{featured?.fit ?? "—"}</strong><span>FIT SCORE</span><div className="gaugeTrack"><i style={{ width: `${featured?.fit ?? 0}%` }} /></div><small>Value + need + youth + availability + ceiling</small></div>
        <div className="alternatives"><p className="eyebrow">NEXT BEST</p>{recommendations.slice(1, 5).map((item, index) => <button key={item.player.id} onClick={() => recordPick(item.player, ourTurn)} disabled={sleeperControlled}><span>{index + 2}</span><div><strong>{item.player.name}</strong><small>{item.player.pos} · {item.player.team} · U{item.strategy.upside} · A{item.strategy.availability} · fit {item.fit}</small></div><b>{sleeperControlled ? "•" : "＋"}</b></button>)}</div>
      </section>

      <div className="workspace">
        <section className="boardPanel">
          <div className="panelHeading"><div><p className="eyebrow">LIVE PLAYER POOL</p><h3>Draft board</h3></div><div className="viewToggle"><button className={view === "available" ? "selected" : ""} onClick={() => setView("available")}>Available <span>{available.length}</span></button><button className={view === "drafted" ? "selected" : ""} onClick={() => setView("drafted")}>Drafted <span>{picks.length}</span></button></div></div>
          <label className="searchBox"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a player, team, or position…" /></label>
          <div className="positionFilters">{POSITIONS.map((position) => <button key={position} className={filter === position ? "selected" : ""} onClick={() => setFilter(position)}>{position === "DST" ? "D/ST" : position}</button>)}</div>
          <div className="boardHeader"><span>RK</span><span>PLAYER</span><span>TIER</span><span>FIT</span><span>ACTION</span></div>
          <div className="playerList">
            {shownPlayers.map((player) => {
              const item = recommendationFor(player, available, roster, overall, scoring, config);
              const pick = picks.find((candidate) => candidate.playerId === player.id);
              return <article className="playerRow" key={player.id}>
                <span className="rank">{String(player.rank).padStart(3, "0")}</span>
                <div className="playerIdentity"><span className={`posBadge ${player.pos.toLowerCase()}`}>{player.pos === "DST" ? "D" : player.pos}</span><div><strong>{player.name}</strong><small>{player.team} · Bye {player.bye}{item.strategy.age ? ` · Age ${item.strategy.age}` : ""} · U{item.strategy.upside} · A{item.strategy.availability}{item.strategy.injuryStatus ? ` · ${item.strategy.injuryStatus}` : ""}</small></div></div>
                <span className="tier">T{player.tier}</span><span className="rowFit">{view === "available" ? item.fit : "—"}</span>
                {view === "available" ? sleeperControlled ? <span className="liveSynced">SLEEPER</span> : <div className="rowActions"><button onClick={() => recordPick(player, false)} title="Taken by another team">Out</button><button className="mine" onClick={() => recordPick(player, true)} title="Add to my roster">Mine</button></div> : <span className={`draftedBy ${pick?.mine ? "mine" : ""}`}>{pick?.mine ? "MY ROSTER" : `PICK ${pick?.at}`}</span>}
              </article>;
            })}
            {!shownPlayers.length && <div className="emptyState">No players match those filters.</div>}
          </div>
        </section>

        <aside className="rosterPanel">
          <div className="panelHeading"><div><p className="eyebrow">TEAM {config.draftSlot}</p><h3>Your roster</h3></div><span className="rosterCount">{roster.length}/{config.rosterSize}</span></div>
          <div className="rosterSlots">{rosterSlots.map((slot) => <div className={`rosterSlot ${slot.player ? "filled" : ""}`} key={slot.key}><span>{slot.label}</span>{slot.player ? <div><strong>{slot.player.name}</strong><small>{slot.player.pos} · {slot.player.team} · Bye {slot.player.bye}</small></div> : <em>Open slot</em>}</div>)}</div>
          <div className="rosterNote"><strong>Upside-first, roster-aware</strong><p>Ceiling and availability carry the strongest weight (1.6×), followed by youth (1.15×). The board avoids a third QB, reserves room for every required starter, and forces D/ST and kicker into the closing rounds when still open.</p></div>
        </aside>
      </div>

      <footer>
        <div><strong>Fantasy Draft Room</strong><span>10-team Half PPR from slot 10 · 12-team Full PPR from slot 2.</span></div>
        <div className="footerLinks"><a href={scoring === "ppr" ? "https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php" : "https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php"} target="_blank" rel="noreferrer">2026 {scoring === "ppr" ? "full-PPR" : "half-PPR"} rankings ↗</a><a href="https://docs.sleeper.com/" target="_blank" rel="noreferrer">Player profile data ↗</a><button onClick={resetDraft} disabled={sleeperControlled}>{sleeperControlled ? "Sleeper controls picks" : "Reset this tab"}</button></div>
        <p>{scoring === "ppr" ? "Full-PPR" : "Half-PPR"} rankings refreshed {scoring === "ppr" ? PPR_RANKINGS_REFRESHED : RANKINGS_REFRESHED}; player status refreshed {PLAYER_PROFILES_REFRESHED}. Availability scores include a small manually reviewed recurring-risk adjustment. Recommendations are decision support, not medical advice or a guarantee of performance.</p>
      </footer>
    </main>
  );
}
