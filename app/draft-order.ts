export function draftCoordinates(overall: number, teamCount: number) {
  const round = Math.ceil(overall / teamCount);
  const column = ((overall - 1) % teamCount) + 1;
  const team = round % 2 === 1 ? column : teamCount + 1 - column;
  return { round, team, pick: column };
}

export function isTeamPick(overall: number, draftSlot: number, teamCount: number) {
  return draftCoordinates(overall, teamCount).team === draftSlot;
}

export function nextTeamPick(from: number, maxOverall: number, draftSlot: number, teamCount: number) {
  for (let pick = from; pick <= maxOverall; pick += 1) {
    if (isTeamPick(pick, draftSlot, teamCount)) return pick;
  }
  return maxOverall;
}

export function pickLabel(overall: number, teamCount: number) {
  const { round, pick } = draftCoordinates(overall, teamCount);
  return `${round}.${String(pick).padStart(2, "0")}`;
}
