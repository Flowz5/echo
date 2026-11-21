/**
 * Replays an input path and draws where Iris went on the room's ASCII map
 * (one letter per 4-frame macro: a, b, c…).
 *
 *   REPLAY='{"room":"the_rise","from":[2,13],"abilities":["doubleJump","wallJump","dash"],"path":"R R DR RJ"}' npm run solve:replay
 */
import { it } from "vitest";
import type { Ability } from "../../src/game/progress";
import { room, simulateTrace } from "./solver";

it("replay", () => {
  const { room: name, from, abilities, path } = JSON.parse(process.env.REPLAY ?? "{}") as {
    room: string;
    from: [number, number];
    abilities: Ability[];
    path: string;
  };
  const level = room(name).level;
  const { marks, end } = simulateTrace(name, from, abilities, path);
  const lines = [`end x=${end.x} y=${end.y} grounded=${end.grounded} dead=${end.dead}`];
  for (let y = 0; y < level.rows; y++) {
    let row = "";
    for (let x = 0; x < level.cols; x++) row += marks.get(`${x},${y}`) ?? level.tile(x, y);
    lines.push(`${String(y).padStart(2)} ${row}`);
  }
  console.log(lines.join("\n"));
});
