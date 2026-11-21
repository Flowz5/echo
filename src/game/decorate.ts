import { TILE } from "../config";
import type { Decor, Level, Tile } from "./level";
import type { Look } from "./chapters";

/**
 * Procedural dressing: grass, flowers, rocks and mushrooms on every ground top (moss,
 * starblooms, roses and rubble in the ruins), vines under planks (climbing roses in the
 * ruins), cobwebs and stalactites indoors. Deterministic (seeded by
 * the room name), so a room always looks the same.
 */
function hash(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) & 0xffff) / 65535;
}

function seedOf(name: string): number {
  let s = 7;
  for (const c of name) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return s % 100000;
}

const isSolid = (t: Tile) => t === "#";
const isAir = (t: Tile) => t === ".";

export function decorate(level: Level, indoor: boolean, look: Look = "vale"): Decor[] {
  const ruins = look === "ruins";
  const out: Decor[] = [];
  const seed = seedOf(level.name);
  // keep the ground clear around checkpoints, collectibles, NPCs and spawns
  const busy = new Set<string>();
  for (const p of [...level.checkpoints, ...level.entities, ...level.spawns]) {
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - 1) / TILE) + 1; // the ground tile under the point
    for (const dx of [-1, 0, 1]) busy.add(`${tx + dx},${ty}`);
  }
  for (let ty = 0; ty < level.rows; ty++) {
    for (let tx = 0; tx < level.cols; tx++) {
      const t = level.ownTile(tx, ty);
      const r = hash(tx, ty, seed);
      const r2 = hash(tx, ty, seed + 1);
      const x = tx * TILE + 2 + Math.floor(r2 * 12);
      const top = ty * TILE;

      if (isSolid(t) && ty > 0 && isAir(level.tile(tx, ty - 1)) && !busy.has(`${tx},${ty}`)) {
        // a ground top
        if (!indoor && ruins) {
          if (r < 0.38) out.push({ sprite: `moss${Math.floor(r2 * 3)}`, x, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          else if (r < 0.43) out.push({ sprite: "starbloom", x, y: top + 1, layer: "mid", flip: false });
          else if (r < 0.46) out.push({ sprite: "flower_rose", x, y: top + 1, layer: "mid", flip: false });
          else if (r < 0.53) out.push({ sprite: "rubble_s", x, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          else if (r < 0.56 && isSolid(level.tile(tx + 1, ty)) && isAir(level.tile(tx + 1, ty - 1))) out.push({ sprite: "rubble_m", x: tx * TILE + 16, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          if (hash(tx, ty, seed + 2) < 0.06) out.push({ sprite: `moss${Math.floor(r * 3)}`, x: tx * TILE + 8, y: top + 3, layer: "front", flip: true });
        } else if (!indoor) {
          if (r < 0.42) out.push({ sprite: `grass${Math.floor(r2 * 3)}`, x, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          else if (r < 0.5) out.push({ sprite: ["flower_rose", "flower_bone", "flower_lilac"][Math.floor(r2 * 3)], x, y: top + 1, layer: "mid", flip: false });
          else if (r < 0.55) out.push({ sprite: "rock_s", x, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          else if (r < 0.58) out.push({ sprite: "mushroom", x, y: top + 1, layer: "mid", flip: false });
          else if (r < 0.6 && isSolid(level.tile(tx + 1, ty)) && isAir(level.tile(tx + 1, ty - 1))) out.push({ sprite: "rock_m", x: tx * TILE + 16, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          // now and then a tuft in front of Iris, for depth
          if (hash(tx, ty, seed + 2) < 0.07) out.push({ sprite: `grass${Math.floor(r * 3)}`, x: tx * TILE + 8, y: top + 3, layer: "front", flip: true });
        } else {
          if (r < 0.1) out.push({ sprite: "rock_s", x, y: top + 1, layer: "mid", flip: r2 > 0.5 });
          else if (r < 0.13) out.push({ sprite: "crate", x, y: top + 1, layer: "mid", flip: false });
          else if (r < 0.15) out.push({ sprite: "barrel", x, y: top + 1, layer: "mid", flip: false });
        }
      }
      // under a solid ceiling
      if (isSolid(t) && ty < level.rows - 1 && isAir(level.tile(tx, ty + 1))) {
        const below = (ty + 1) * TILE;
        if (indoor) {
          const cornerL = isSolid(level.tile(tx - 1, ty + 1));
          const cornerR = isSolid(level.tile(tx + 1, ty + 1));
          if ((cornerL || cornerR) && r < 0.6) out.push({ sprite: "cobweb", x: tx * TILE + (cornerL ? 6 : 10), y: below + 12, layer: "back", flip: cornerR && !cornerL });
          else if (r < 0.12) out.push({ sprite: "stalactite", x: tx * TILE + 8, y: below + 9, layer: "back", flip: false });
        } else if (ruins && r < 0.1) {
          out.push({ sprite: "rose_vine", x: tx * TILE + 8, y: below + 30, layer: "back", flip: r2 > 0.5 });
        } else if (r < 0.08) {
          out.push({ sprite: "vine", x: tx * TILE + 8, y: below + 18, layer: "back", flip: false });
        }
      }
      // vines hanging under one-way planks
      if (t === "-" && r < 0.2) out.push({ sprite: r < 0.07 ? "vine_long" : "vine", x: tx * TILE + 8, y: top + 4 + (r < 0.07 ? 28 : 18), layer: "back", flip: false });
    }
  }
  return out;
}
