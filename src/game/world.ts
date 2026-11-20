import { TILE } from "../config";
import { Level, type Checkpoint, type Entity, type Point, type Props, type Tile } from "./level";
import { parseAbilities, type Ability } from "./progress";

/**
 * Loads a chapter made in Tiled: a .world file placing rooms (.tmj maps) side by side.
 * Rooms touching each other are connected: walking off an edge leads into the neighbour.
 *
 * Tiled conventions (see assets/levels/README.md):
 *   - tile layer "terrain" using the "terrain" tileset (ids: 0 ground, 1 platform, 2 spikes, 3 plate, 4 door)
 *   - object layer "objects" with point objects of class:
 *       spawn, checkpoint, shrine, shard, note, page, moment, npc
 *   - optional map property "echoes" (int): max echoes in the room
 *   - first room only: "abilities" (string, e.g. "doubleJump, wallJump") and "echoSlots" (int)
 *     = what Iris starts the chapter with
 */

const WORLD_FILES = import.meta.glob("../../assets/levels/*.world", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const MAP_FILES = import.meta.glob("../../assets/levels/*.tmj", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const TILE_BY_ID: Tile[] = ["#", "-", "^", "b", "D"];
const FLIP_MASK = 0x1fffffff;

interface TiledProperty {
  name: string;
  value: unknown;
}
interface TiledObject {
  id: number;
  type?: string;
  properties?: TiledProperty[];
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
}
interface TiledLayer {
  name: string;
  type: string;
  width?: number;
  data?: number[];
  objects?: TiledObject[];
}
interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  infinite?: boolean;
  properties?: TiledProperty[];
  tilesets: { firstgid: number; source?: string }[];
  layers: TiledLayer[];
}
interface TiledWorld {
  maps: { fileName: string; x: number; y: number; width: number; height: number }[];
}

export interface RoomDef {
  name: string;
  level: Level;
  /** world position in pixels */
  x: number;
  y: number;
  maxEchoes: number;
}

const DEFAULT_ECHOES = 3;
const COLLECTIBLES = ["shard", "note", "page", "moment"] as const;

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function props(list?: TiledProperty[]): Props {
  const out: Props = {};
  for (const p of list ?? []) out[p.name] = p.value as Props[string];
  return out;
}

interface ParsedMap {
  level: Level;
  maxEchoes: number;
  props: Props;
}

function parseMap(name: string, json: string): ParsedMap {
  const map = JSON.parse(json) as TiledMap;
  if (map.infinite) throw new Error(`${name}: infinite maps are not supported (Map > Map Properties > Infinite off)`);
  if (map.tilewidth !== TILE) throw new Error(`${name}: tiles must be ${TILE}x${TILE}`);
  const terrain = map.layers.find((l) => l.type === "tilelayer" && l.name === "terrain");
  if (!terrain?.data) throw new Error(`${name}: missing a tile layer named "terrain"`);
  const firstgid = map.tilesets[0]?.firstgid ?? 1;

  const rows: string[] = [];
  for (let ty = 0; ty < map.height; ty++) {
    let row = "";
    for (let tx = 0; tx < map.width; tx++) {
      const gid = terrain.data[ty * map.width + tx] & FLIP_MASK;
      row += gid === 0 ? "." : (TILE_BY_ID[gid - firstgid] ?? ".");
    }
    rows.push(row);
  }

  const spawns: Point[] = [];
  const checkpoints: (Point & { kind: Checkpoint["kind"] })[] = [];
  const entities: Entity[] = [];
  for (const layer of map.layers) {
    if (layer.type !== "objectgroup") continue;
    for (const o of layer.objects ?? []) {
      const kind = o.type || o.class;
      // points mark feet; for rectangles, use their bottom-centre
      const p = { x: o.x + (o.width ?? 0) / 2, y: o.y + (o.height ?? 0) };
      if (kind === "spawn") spawns.push(p);
      else if (kind === "checkpoint") checkpoints.push({ ...p, kind: "crystal" });
      else if (kind === "shrine") checkpoints.push({ ...p, kind: "shrine" });
      else if (kind === "npc" || (COLLECTIBLES as readonly string[]).includes(kind ?? ""))
        entities.push({ ...p, key: `${name}:${o.id}`, kind: kind as Entity["kind"], props: props(o.properties) });
      else if (kind) console.warn(`${name}: unknown object class "${kind}"`);
    }
  }
  const mapProps = props(map.properties);
  return {
    level: new Level(rows, { name, spawns, checkpoints, entities }),
    maxEchoes: typeof mapProps.echoes === "number" ? mapProps.echoes : DEFAULT_ECHOES,
    props: mapProps,
  };
}

export class World {
  readonly rooms: RoomDef[];
  /** abilities and echo slots Iris starts this chapter with (first room's properties) */
  readonly startAbilities: Ability[] = [];
  startEchoSlots = 0;

  constructor(worldName: string) {
    const worldPath = Object.keys(WORLD_FILES).find((p) => fileName(p) === `${worldName}.world`);
    if (!worldPath) throw new Error(`World "${worldName}" not found in assets/levels/`);
    const world = JSON.parse(WORLD_FILES[worldPath]) as TiledWorld;
    this.rooms = world.maps.map((m) => {
      const mapPath = Object.keys(MAP_FILES).find((p) => fileName(p) === fileName(m.fileName));
      if (!mapPath) throw new Error(`Room "${m.fileName}" listed in ${worldName}.world was not found`);
      const name = fileName(m.fileName).replace(/\.tmj$/, "");
      const { level, maxEchoes, props: roomProps } = parseMap(name, MAP_FILES[mapPath]);
      if (world.maps.indexOf(m) === 0) {
        this.startAbilities.push(...parseAbilities(String(roomProps.abilities ?? "")));
        this.startEchoSlots = typeof roomProps.echoSlots === "number" ? roomProps.echoSlots : 0;
      }
      if (level.width < 320 || level.height < 180) console.warn(`Room ${name} is smaller than the screen (min 20x12 tiles)`);
      return { name, level, x: m.x, y: m.y, maxEchoes };
    });
    // edges look into the neighbouring rooms
    for (const room of this.rooms) {
      room.level.outside = (tx, ty) => {
        const wx = room.x + tx * TILE + TILE / 2;
        const wy = room.y + ty * TILE + TILE / 2;
        const other = this.roomAt(wx, wy, room);
        if (!other) return null;
        return other.level.ownTile(Math.floor((wx - other.x) / TILE), Math.floor((wy - other.y) / TILE));
      };
    }
  }

  /** The room containing a world point (optionally ignoring one room). */
  roomAt(wx: number, wy: number, except?: RoomDef): RoomDef | null {
    return (
      this.rooms.find(
        (r) => r !== except && wx >= r.x && wx < r.x + r.level.width && wy >= r.y && wy < r.y + r.level.height,
      ) ?? null
    );
  }

  /** The room holding the first spawn: where a new run starts. */
  get startRoom(): RoomDef {
    return this.rooms[0];
  }
}
