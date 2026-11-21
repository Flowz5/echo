/**
 * Runs a list of reachability checks and reports OK / FAIL for each.
 *
 *   npm run solve                                  # tools/solver/chapter0.cases.json
 *   SOLVE_CASES=path/to/cases.json npm run solve   # another list
 *   SOLVE_WORLD=mechanics SOLVE_CASES=tools/solver/mechanics.cases.json SOLVE_TIME=180 npm run solve
 *
 * A case: [label, room, [tileX, feetRow], goal, abilities, expectedReached, avoid?]
 *   goal: {"kind":"tile","rect":[x0,y0,x1,y1]}  (hitbox inside those tiles)
 *         {"kind":"exit","side":"right"|"left"|"top","rows":[a,b] | "cols":[a,b]}
 *         {"kind":"entity","entity":"page"|"shard"|"note"|"moment"}
 *   avoid: entity kinds that must not be touched (e.g. ["shard"] to forbid grabbing the dash)
 * Results also go to solve-results.txt (git-ignored).
 * Note: the 0-9 island page WITH the dash is checked by replay, not here (the search runs
 * out of budget on it): from the hilltop, "R R DR RJ RJ RJ RJ R R RJ RJ RJ DRU R R R".
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { Ability } from "../../src/game/progress";
import { solve, type Goal } from "./solver";

type Case = [string, string, [number, number], Goal, Ability[], boolean, string[]?];
const file = process.env.SOLVE_CASES ?? "tools/solver/chapter0.cases.json";
const out = process.env.SOLVE_OUT ?? "solve-results.txt";
/** seconds of search per case (SOLVE_TIME=180 for hard rooms) */
const TIME = Number(process.env.SOLVE_TIME ?? 60);
const cases = JSON.parse(readFileSync(file, "utf8")) as Case[];

it(`reachability: ${file}`, () => {
  writeFileSync(out, "");
  const failed: string[] = [];
  for (const [label, roomName, from, goal, abilities, expected, avoid] of cases) {
    const t = Date.now();
    const r = solve(roomName, from, goal, abilities, 2_000_000, TIME, avoid ?? []);
    const ok = r.reached === expected;
    if (!ok) failed.push(label);
    const detail = r.reached ? `end ${r.end?.x},${r.end?.y}  ${r.path}` : r.stopped;
    const line = `${ok ? "OK  " : "FAIL"} ${label}: reached=${r.reached} (want ${expected}) ${r.nodes} nodes ${((Date.now() - t) / 1000).toFixed(0)}s  ${detail}`;
    console.log(line);
    appendFileSync(out, line + "\n");
  }
  expect(failed).toEqual([]);
});
