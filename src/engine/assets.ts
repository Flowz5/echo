import { manifest } from "../config";
import playerUrl from "../../assets/sprites/player.png";
import echoUrl from "../../assets/sprites/echo.png";
import tilesUrl from "../../assets/sprites/tiles.png";
import propsUrl from "../../assets/sprites/props.png";
import doorUrl from "../../assets/sprites/door.png";
import collectiblesUrl from "../../assets/sprites/collectibles.png";
import shrineUrl from "../../assets/sprites/shrine.png";
import npcUrl from "../../assets/sprites/npc.png";
import portraitsUrl from "../../assets/sprites/portraits.png";
import lumiUrl from "../../assets/sprites/lumi.png";
import decorUrl from "../../assets/sprites/decor.png";
import uiUrl from "../../assets/ui/ui.png";
import fontUrl from "../../assets/ui/font.png";
import titleUrl from "../../assets/ui/title.png";
import skyUrl from "../../assets/backgrounds/sky.png";
import mountainsUrl from "../../assets/backgrounds/mountains.png";
import hillsUrl from "../../assets/backgrounds/hills.png";

const URLS = {
  player: playerUrl,
  echo: echoUrl,
  tiles: tilesUrl,
  props: propsUrl,
  door: doorUrl,
  collectibles: collectiblesUrl,
  shrine: shrineUrl,
  npc: npcUrl,
  portraits: portraitsUrl,
  lumi: lumiUrl,
  decor: decorUrl,
  ui: uiUrl,
  font: fontUrl,
  title: titleUrl,
  sky: skyUrl,
  mountains: mountainsUrl,
  hills: hillsUrl,
};

export type Images = Record<keyof typeof URLS, HTMLImageElement>;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

export async function loadImages(): Promise<Images> {
  const entries = await Promise.all(
    Object.entries(URLS).map(async ([k, url]) => [k, await loadImage(url)] as const),
  );
  return Object.fromEntries(entries) as Images;
}

export type UiRect = { x: number; y: number; w: number; h: number };
export type UiName = keyof typeof manifest.ui.rects;
export const uiRect = (name: UiName): UiRect => manifest.ui.rects[name];
