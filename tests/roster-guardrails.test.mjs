import assert from "node:assert/strict";
import test from "node:test";

import { pprRankingFor } from "../app/ppr-rankings.ts";
import { rosterGuardrails } from "../app/roster-guardrails.ts";
import { LEAGUE_CONFIGS } from "../app/league-config.ts";
import { nextTeamPick } from "../app/draft-order.ts";

const completeSkillRoster = { QB: 2, RB: 4, WR: 4, TE: 2, DST: 0, K: 0 };

test("full-PPR rankings use the dedicated PPR board", () => {
  assert.equal(pprRankingFor("Ja'Marr Chase", 99, 9, "CIN", 6).rank, 1);
  assert.equal(pprRankingFor("Jahmyr Gibbs", 99, 9, "DET", 6).rank, 2);
});

test("the PPR league uses two flexes, five bench spots, and 15 rounds", () => {
  assert.deepEqual(LEAGUE_CONFIGS.ppr, { draftSlot: 2, rounds: 15, rosterSize: 15, flexSlots: 2, benchSlots: 5 });
});

test("the PPR snake draft follows team 2's turn sequence", () => {
  assert.equal(nextTeamPick(1, 150, 2, 10), 2);
  assert.equal(nextTeamPick(3, 150, 2, 10), 19);
  assert.equal(nextTeamPick(20, 150, 2, 10), 22);
});

test("both PPR flex positions count as required starters", () => {
  const counts = { QB: 1, RB: 2, WR: 2, TE: 1, DST: 1, K: 1 };
  const rules = { rosterLimit: 15, flexSlots: 2, totalRounds: 15 };
  const skillPlayer = rosterGuardrails("WR", counts, 8, 8, rules);
  const extraQuarterback = rosterGuardrails("QB", counts, 8, 8, rules);
  assert.equal(skillPlayer.requiredOpen, 2);
  assert.equal(skillPlayer.fillsRequired, true);
  assert.ok(extraQuarterback.adjustment <= -36);
});

test("a third quarterback is never a recommendation", () => {
  const result = rosterGuardrails("QB", completeSkillRoster, 14, 15);
  assert.ok(result.adjustment <= -180);
  assert.match(result.reasons.join(" "), /third quarterback/);
});

test("the final two roster spots are reserved for defense and kicker", () => {
  const defense = rosterGuardrails("DST", completeSkillRoster, 14, 15);
  const kicker = rosterGuardrails("K", completeSkillRoster, 14, 15);
  const runningBack = rosterGuardrails("RB", completeSkillRoster, 14, 15);
  assert.ok(defense.adjustment >= 120);
  assert.ok(kicker.adjustment >= 120);
  assert.ok(runningBack.adjustment <= -180);
});

test("duplicate defense and kicker picks are suppressed", () => {
  const filled = { ...completeSkillRoster, DST: 1, K: 1 };
  assert.ok(rosterGuardrails("DST", filled, 16, 16).adjustment <= -180);
  assert.ok(rosterGuardrails("K", filled, 16, 16).adjustment <= -180);
});
