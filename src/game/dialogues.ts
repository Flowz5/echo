/** Chapter 0 conversations (assets/SCRIPT.md §6.1 and §6.4), uppercase as shown in game. */
import { COLORS } from "../config";
import type { Line, Speaker } from "./dialogue";

const TAMSIN: Speaker = { name: "TAMSIN", color: COLORS.A, voice: "tamsin", portrait: 0 };
const QUILL: Speaker = { name: "QUILL", color: COLORS.n, voice: "quill", portrait: 1 };
const SYSTEM: Speaker = { name: "", color: COLORS.e, voice: "system", portrait: null };
const LINGERING: Speaker = { name: "LINGERING", color: COLORS.g, voice: "lingering", portrait: null };

const say = (speaker: Speaker, ...texts: string[]): Line[] => texts.map((text) => ({ speaker, text }));

export function tamsinFirst(): Line[] {
  return [
    ...say(TAMSIN, "UP, UP. STARS ARE OUT.", "...STARS ARE ALWAYS OUT. UP ANYWAY."),
    ...say(TAMSIN, "TODAY YOU ARE OLD ENOUGH TO CLIMB. I SAID SO A HUNDRED TIMES. TODAY I MEAN IT."),
    ...say(TAMSIN, "SEE THAT TOWER? TOP OF THE VALLEY. THAT'S AUREL. THE GREAT BELL."),
    ...say(TAMSIN, "IT'S BROKEN, CHILD. HAS BEEN SINCE BEFORE YOU. SINCE BEFORE ME, ALMOST."),
    {
      speaker: TAMSIN,
      text: "THAT EYE OF YOURS IS A PIECE OF IT. IT WANTS TO GO HOME.",
      choices: [
        { label: "NOD", reply: say(TAMSIN, "GOOD. STUBBORN LIKE ME.") },
        { label: "TILT HEAD", reply: say(TAMSIN, "DON'T LOOK AT ME LIKE THAT. I DON'T KNOW EVERYTHING. JUST MOST THINGS.") },
      ],
    },
    ...say(TAMSIN, "GO EAST. JUMP WHEN THE ROAD ENDS. JUMP AGAIN IN THE AIR IF YOUR LEGS ARE BRAVE."),
    ...say(TAMSIN, "AND COME BACK FOR TEA. MOSS WORRIES."),
  ];
}

export const tamsinRepeat = (): Line[] => say(TAMSIN, "EAST, CHILD. THE TOWER WON'T CLIMB ITSELF.");

export function quillFirst(): Line[] {
  return [
    ...say(QUILL, "AH! CAREFUL! YOU NEARLY STEPPED ON THE VALE. I MEAN, MY MAP OF THE VALE."),
    ...say(QUILL, "QUILL. CARTOGRAPHER. FORMER ROYAL ASSISTANT SUB-CARTOGRAPHER, TECHNICALLY."),
    {
      speaker: QUILL,
      text: "I'M MAPPING EVERYTHING. FOR WHEN THE SUN COMES BACK. PEOPLE WILL WANT TO KNOW WHERE THINGS ARE.",
      choices: [
        {
          label: "WILL IT COME BACK?",
          reply: say(QUILL, "...OF COURSE IT WILL. PROBABLY. MAPS DON'T CARE EITHER WAY. THAT'S WHAT I LIKE ABOUT THEM."),
        },
        {
          label: "SHOW ME THE MAP",
          reply: [
            ...say(QUILL, "HERE. EVERYTHING I'VE DRAWN SO FAR. IF YOU FIND ANY LOOSE PAGES LYING ABOUT, BRING THEM. PAPER IS PRECIOUS."),
            ...say(SYSTEM, "MAP UPDATED."),
          ],
        },
      ],
    },
  ];
}

export const quillRepeat = (): Line[] => say(QUILL, "THE MILL'S ON THE MAP NOW. THE MILL IS ALWAYS ON THE MAP.");

export const lingeringLine = (text: string): Line[] => say(LINGERING, text);

/** First and repeat conversations by NPC name (Tiled "name" property). */
export const NPC_DIALOGUES: Record<string, { first: () => Line[]; repeat: () => Line[] }> = {
  TAMSIN: { first: tamsinFirst, repeat: tamsinRepeat },
  QUILL: { first: quillFirst, repeat: quillRepeat },
};
