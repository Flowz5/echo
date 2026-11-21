/**
 * Echo — reachability solver for level design.
 *
 * Best-first search over 4-frame input macros (left/right/none × jump held or not, plus the
 * 8 dash directions) using the game's real Player physics and room colliders, so a "reached"
 * answer is a real input sequence. Crystals refill the dash and double jump like in the game.
 *
 * "Not reached" means the search found nothing within its budget (nodes / seconds): strong
 * evidence, not a proof. Long routes are best checked as segments.
 *
 * Run it through `npm run solve` (see tools/solver/cases.solve.ts); replay a path on an
 * ASCII map with `npm run solve:replay`.
 */
import { Level, type Rect } from "../../src/game/level";
import { Effects } from "../../src/game/particles";
import { Player } from "../../src/game/player";
import type { Ability } from "../../src/game/progress";
import { World } from "../../src/game/world";
import { DT, FakeInput } from "../../src/game/test-helpers";

export type Goal =
  | { kind: "exit"; side: "left" | "right" | "top"; rows?: [number, number]; cols?: [number, number] }
  | { kind: "entity"; entity: "page" | "shard" | "note" | "moment"; index?: number }
  | { kind: "tile"; rect: [number, number, number, number] }; // tx0, ty0, tx1, ty1: hitbox inside

const MACRO = 4;
type Act = { h: -1 | 0 | 1; v: -1 | 0 | 1; jump: boolean; dash: boolean };
const ACTS: Act[] = [];
for (const h of [-1, 0, 1] as const) for (const jump of [false, true]) ACTS.push({ h, v: 0, jump, dash: false });
for (const h of [-1, 0, 1] as const) for (const v of [-1, 0, 1] as const) if (h || v) ACTS.push({ h, v, jump: false, dash: true });

const world = new World(process.env.SOLVE_WORLD ?? "chapter0");
export function room(name: string) {
  const r = world.rooms.find((x) => x.name === name);
  if (!r) throw new Error("no room " + name);
  return r;
}

function clone(p: Player): Player {
  return Object.assign(Object.create(Object.getPrototypeOf(p)), p);
}

function goalHit(level: Level, p: Player, g: Goal, ents: Rect[]): boolean {
  const hb = p.hitbox;
  if (g.kind === "exit") {
    const row = Math.floor((hb.y + hb.h / 2) / 16), col = Math.floor((hb.x + hb.w / 2) / 16);
    const inRows = !g.rows || (row >= g.rows[0] && row <= g.rows[1]);
    const inCols = !g.cols || (col >= g.cols[0] && col <= g.cols[1]);
    if (g.side === "right") return hb.x + hb.w > level.width && inRows;
    if (g.side === "left") return hb.x < 0 && inRows;
    return hb.y < 0 && inCols;
  }
  if (g.kind === "entity") return ents.some((e) => e.x < hb.x + hb.w && e.x + e.w > hb.x && e.y < hb.y + hb.h && e.y + e.h > hb.y);
  const [x0, y0, x1, y1] = g.rect;
  return hb.x >= x0 * 16 && hb.x + hb.w <= (x1 + 1) * 16 && hb.y >= y0 * 16 && hb.y + hb.h <= (y1 + 1) * 16;
}

export interface SolveResult {
  reached: boolean;
  nodes: number;
  /** the input macros, e.g. "R RJ DRU L" (D = dash, J = jump held, d = down) */
  path?: string;
  /** where Iris was when the goal was hit (tiles) */
  end?: { x: number; y: number };
  /** why the search stopped without reaching the goal */
  stopped?: "budget hit" | "exhausted";
}

/**
 * @param from spawn index in the room, or tile feet position [tx, ty] (feet on top of row ty)
 */
export function solve(roomName: string, from: number | [number, number], goal: Goal, abilities: Ability[], maxNodes = 400_000, timeLimit = 60, avoid: string[] = []): SolveResult {
  const t0 = Date.now();
  const def = room(roomName);
  const level = def.level;
  const can = (a: Ability) => abilities.includes(a);
  const player = new Player(level, new Effects(), () => {}, can);
  const feet = typeof from === "number" ? level.spawns[from] : { x: from[0] * 16 + 8, y: from[1] * 16 };
  player.respawnAt(feet);
  const ents: Rect[] = goal.kind === "entity"
    ? level.entities.filter((e) => e.kind === goal.entity).filter((_, i) => goal.index === undefined || i === goal.index).map((e) => ({ x: e.x - 6, y: e.y - 15, w: 12, h: 12 }))
    : [];
  const checkpoints = level.checkpoints.map((c) => Level.checkpointRect(c));
  /** entities that must not be touched (e.g. a shard that would grant the missing ability) */
  const avoidRects: Rect[] = level.entities.filter((e) => avoid.includes(e.kind)).map((e) => ({ x: e.x - 6, y: e.y - 15, w: 12, h: 12 }));
  const input = new FakeInput();
  // settle
  for (let i = 0; i < 5; i++) { player.update(DT, input.asInput); }
  type Node = { p: Player; held: boolean; parent: number; act: number; depth: number };
  const nodes: Node[] = [{ p: player, held: false, parent: -1, act: -1, depth: 0 }];
  // goal point for the heuristic
  let gx = 0, gy = 0;
  if (goal.kind === "exit") {
    const r0 = goal.rows ? (goal.rows[0] + goal.rows[1]) / 2 : level.height / 32;
    const c0 = goal.cols ? (goal.cols[0] + goal.cols[1]) / 2 : level.width / 32;
    gx = goal.side === "right" ? level.width : goal.side === "left" ? 0 : c0 * 16;
    gy = goal.side === "top" ? 0 : r0 * 16;
  } else if (goal.kind === "entity") { gx = ents[0].x + 6; gy = ents[0].y + 6; }
  else { gx = (goal.rect[0] + goal.rect[2] + 1) * 8; gy = (goal.rect[1] + goal.rect[3] + 1) * 8; }
  const prio = (n: Node) => Math.hypot(n.p.x - gx, (n.p.y - gy) * 1.5) + n.depth * 0.5;
  // binary heap of node indices
  const heap: number[] = [0];
  const pr: number[] = [prio(nodes[0])];
  const push = (i: number) => {
    heap.push(i); pr.push(prio(nodes[i]));
    let k = heap.length - 1;
    while (k > 0) { const up = (k - 1) >> 1; if (pr[up] <= pr[k]) break; [heap[up], heap[k]] = [heap[k], heap[up]]; [pr[up], pr[k]] = [pr[k], pr[up]]; k = up; }
  };
  const pop = (): number => {
    const top = heap[0];
    const lh = heap.pop()!, lp = pr.pop()!;
    if (heap.length) {
      heap[0] = lh; pr[0] = lp;
      let k = 0;
      for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && pr[a] < pr[m]) m = a; if (b < heap.length && pr[b] < pr[m]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [pr[m], pr[k]] = [pr[k], pr[m]]; k = m; }
    }
    return top;
  };
  const seen = new Set<string>();
  const key = (p: Player, held: boolean) => {
    const a = p as unknown as Record<string, number | boolean>;
    return `${Math.round(p.x / 4)},${Math.round(p.y / 4)},${Math.round(p.vx / 40)},${Math.round(p.vy / 40)},${+p.canDash}${+p.canDoubleJump}${+p.dashing}${+held}${+((a.dashJumpTimer as number) > 0 || (p.dashing && a.dashGrounded === true))}${+((a.wallChain as number) > 0)}${+((a.forceMoveTimer as number) > 0)}`;
  };
  while (heap.length && nodes.length < maxNodes && (Date.now() - t0) / 1000 < timeLimit) {
    const cur = pop();
    const n = nodes[cur];
    for (let ai = 0; ai < ACTS.length; ai++) {
      const act = ACTS[ai];
      if (act.dash && (!can("dash") || !n.p.canDash)) continue;
      const p = clone(n.p);
      const inp = new FakeInput();
      let held = n.held;
      if (held) inp.press("jump"), inp.endFrame();
      let dead = false, hit = false;
      for (let f = 0; f < MACRO; f++) {
        if (act.h > 0) inp.press("right"); else inp.release("right");
        if (act.h < 0) inp.press("left"); else inp.release("left");
        if (act.v < 0) inp.press("up"); else inp.release("up");
        if (act.v > 0) inp.press("down"); else inp.release("down");
        if (act.jump) inp.press("jump"); else inp.release("jump");
        if (act.dash && f === 0) inp.press("dash"); else inp.release("dash");
        p.update(DT, inp.asInput);
        inp.endFrame();
        if (p.dead || p.y > level.height) { dead = true; break; }
        const hb = p.hitbox;
        if (avoidRects.some((c) => c.x < hb.x + hb.w && c.x + c.w > hb.x && c.y < hb.y + hb.h && c.y + c.h > hb.y)) { dead = true; break; }
        if (checkpoints.some((c) => c.x < hb.x + hb.w && c.x + c.w > hb.x && c.y < hb.y + hb.h && c.y + c.h > hb.y)) p.refill();
        if (goalHit(level, p, goal, ents)) { hit = true; break; }
        if (hb.x + hb.w > level.width + 2 || hb.x < -2 || hb.y < -2) { dead = true; break; } // left by another exit
      }
      held = act.jump;
      if (hit) {
        const acts: number[] = [ai];
        for (let k = cur; k > 0; k = nodes[k].parent) acts.push(nodes[k].act);
        const names = acts.reverse().map((i) => { const a = ACTS[i]; return (a.dash ? "D" : "") + (a.h < 0 ? "L" : a.h > 0 ? "R" : "") + (a.v < 0 ? "U" : a.v > 0 ? "d" : "") + (a.jump ? "J" : "") || "."; });
        return { reached: true, nodes: nodes.length, path: names.join(" "), end: { x: +(p.x / 16).toFixed(1), y: +(p.y / 16).toFixed(1) } };
      }
      if (dead) continue;
      const k = key(p, held);
      if (seen.has(k)) continue;
      seen.add(k);
      nodes.push({ p, held, parent: cur, act: ai, depth: n.depth + 1 });
      push(nodes.length - 1);
    }
  }
  return { reached: false, nodes: nodes.length, stopped: heap.length ? "budget hit" : "exhausted" };
}

/** Re-simulates a path from scratch with the exact macro procedure; returns the end state. */
export function simulate(roomName: string, from: [number, number], abilities: Ability[], path: string) {
  const level = room(roomName).level;
  const can = (a: Ability) => abilities.includes(a);
  const p = new Player(level, new Effects(), () => {}, can);
  p.respawnAt({ x: from[0] * 16 + 8, y: from[1] * 16 });
  const input = new FakeInput();
  for (let i = 0; i < 5; i++) p.update(DT, input.asInput);
  let held = false;
  const trace: string[] = [];
  for (const t of path.split(" ")) {
    const act = { h: t.includes("L") ? -1 : t.includes("R") ? 1 : 0, v: t.includes("U") ? -1 : t.includes("d") ? 1 : 0, jump: t.includes("J"), dash: t.startsWith("D") };
    const inp = new FakeInput();
    if (held) inp.press("jump"), inp.endFrame();
    for (let f = 0; f < MACRO; f++) {
      if (act.h > 0) inp.press("right"); else inp.release("right");
      if (act.h < 0) inp.press("left"); else inp.release("left");
      if (act.v < 0) inp.press("up"); else inp.release("up");
      if (act.v > 0) inp.press("down"); else inp.release("down");
      if (act.jump) inp.press("jump"); else inp.release("jump");
      if (act.dash && f === 0) inp.press("dash"); else inp.release("dash");
      p.update(DT, inp.asInput);
      inp.endFrame();
    }
    held = act.jump;
    trace.push(`${t}:${(p.x / 16).toFixed(1)},${(p.y / 16).toFixed(1)}`);
  }
  return trace;
}

/** Like simulate(), but returns the cells visited (letter per macro) and the end state, for replays. */
export function simulateTrace(roomName: string, from: [number, number], abilities: Ability[], path: string) {
  const level = room(roomName).level;
  const can = (a: Ability) => abilities.includes(a);
  const p = new Player(level, new Effects(), () => {}, can);
  p.respawnAt({ x: from[0] * 16 + 8, y: from[1] * 16 });
  const settle = new FakeInput();
  for (let i = 0; i < 5; i++) p.update(DT, settle.asInput);
  const marks = new Map<string, string>();
  let held = false;
  path.split(" ").forEach((t, step) => {
    if (p.dead) return;
    const act = { h: t.includes("L") ? -1 : t.includes("R") ? 1 : 0, v: t.includes("U") ? -1 : t.includes("d") ? 1 : 0, jump: t.includes("J"), dash: t.startsWith("D") };
    const inp = new FakeInput();
    if (held) inp.press("jump"), inp.endFrame();
    for (let f = 0; f < MACRO && !p.dead; f++) {
      if (act.h > 0) inp.press("right"); else inp.release("right");
      if (act.h < 0) inp.press("left"); else inp.release("left");
      if (act.v < 0) inp.press("up"); else inp.release("up");
      if (act.v > 0) inp.press("down"); else inp.release("down");
      if (act.jump) inp.press("jump"); else inp.release("jump");
      if (act.dash && f === 0) inp.press("dash"); else inp.release("dash");
      p.update(DT, inp.asInput);
      inp.endFrame();
    }
    held = act.jump;
    marks.set(`${Math.floor((p.x + 4) / 16)},${Math.floor((p.y + 6) / 16)}`, String.fromCharCode(97 + (step % 26)));
  });
  return { marks, end: { x: +(p.x / 16).toFixed(1), y: +(p.y / 16).toFixed(1), grounded: p.grounded, dead: p.dead } };
}
