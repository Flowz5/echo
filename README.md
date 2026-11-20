# Echo

A fast, precise 2D pixel-art platformer where you rewind time and use your own frozen echoes to survive.

Built with TypeScript and a plain `<canvas>`, no game engine.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build in dist/
npm run sprites    # regenerate placeholder sprites (python3, no deps)
```

## Controls (menus)

| Action | Keys |
|---|---|
| Navigate | Arrows / WASD, mouse |
| Select | Enter / Space / click |
| Change value | Left / Right |
| Back | Esc / Backspace |

## Controls (game)

| Action | Default |
|---|---|
| Move | WASD (ZQSD on AZERTY) / arrows |
| Jump / double jump | Space |
| Dash (8 directions) | Left Shift |
| Wall slide / wall jump | Push into a wall / Jump against a wall |
| Rewind (leave a solid echo) | R |
| Fast fall / drop through platform | Down / Down + Jump |
| Pause | Esc |
| Debug overlay | F3 |

Every key can be rebound in **Settings → Controls**. Movement tuning lives in `TUNING` at the top of `src/game/player.ts`.

## Project layout

```
assets/        art bible (SCRIPT.md), palette, sprites, UI, backgrounds, levels (Tiled)
public/        favicon
src/
  engine/      renderer (320x180, integer scaling), fixed-step loop, input, assets, drawing, audio
  game/        world & rooms (Tiled loader), level, player, echoes, scarf, particles
  scenes/      main menu, settings, controls, credits, game (camera, pause)
  audio/       chiptune synth, music sequencer and the original tracks
  ui/          reusable option list (keyboard + mouse)
  settings.ts  persisted settings (localStorage)
tools/         sprite generator, ASCII → Tiled room drafter
```

Music is composed in code (`src/audio/tracks.ts`) and played by a tiny Web Audio sequencer; no audio files.

Levels are made in [Tiled](https://www.mapeditor.org/): see [`assets/levels/README.md`](assets/levels/README.md).

See [`assets/SCRIPT.md`](assets/SCRIPT.md) for the story, mechanics and art direction.
