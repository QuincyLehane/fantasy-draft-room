import type { Position } from "./players";

export type RosterCounts = Record<Position, number>;

export function rosterGuardrails(position: Position, counts: RosterCounts, rosterSize: number, round: number) {
  const reasons: string[] = [];
  let adjustment = 0;

  const requiredOpen =
    Number(counts.QB < 1) +
    Math.max(0, 2 - counts.RB) +
    Math.max(0, 2 - counts.WR) +
    Number(counts.TE < 1) +
    Number(counts.DST < 1) +
    Number(counts.K < 1);
  const fillsRequired =
    (position === "QB" && counts.QB < 1) ||
    (position === "RB" && counts.RB < 2) ||
    (position === "WR" && counts.WR < 2) ||
    (position === "TE" && counts.TE < 1) ||
    (position === "DST" && counts.DST < 1) ||
    (position === "K" && counts.K < 1);
  const rosterSpotsRemaining = Math.max(0, 16 - rosterSize);

  if (!fillsRequired && rosterSpotsRemaining - 1 < requiredOpen) {
    adjustment -= 180;
    reasons.push("would leave a required roster slot unfilled");
  }

  if (position === "QB") {
    if (counts.QB >= 2) {
      adjustment -= 180;
      reasons.push("would create an unnecessary third quarterback");
    } else if (counts.QB === 1) {
      adjustment -= requiredOpen > 0 || round < 13 ? 36 : 12;
      reasons.push("is a lower priority than completing the lineup");
    }
  }

  if (position === "TE" && counts.TE >= 2) {
    adjustment -= 70;
    reasons.push("would create a third tight end in a one-flex league");
  }

  if ((position === "DST" || position === "K") && counts[position] > 0) {
    adjustment -= 180;
    reasons.push(`would duplicate your ${position === "DST" ? "defense" : "kicker"}`);
  }

  if ((position === "DST" || position === "K") && counts[position] === 0) {
    if (rosterSpotsRemaining <= Math.max(2, requiredOpen)) adjustment += 120;
    else if (round >= 15) adjustment += 60;
    else if (round >= 14) adjustment += 30;
    if (round >= 14 || rosterSpotsRemaining <= Math.max(2, requiredOpen)) {
      reasons.push(`secures your required ${position === "DST" ? "defense" : "kicker"} slot`);
    }
  }

  return { adjustment, reasons, requiredOpen, fillsRequired };
}
