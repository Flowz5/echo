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

Gameplay keys (jump, dash, rewind, pause) can be rebound in **Settings → Controls**.

## Project layout

```
assets/        art bible (SCRIPT.md), palette, sprites, UI, backgrounds
public/        favicon
src/
  engine/      renderer (320x180, integer scaling), fixed-step loop, input, assets, drawing, audio
  scenes/      main menu, settings, controls, credits, game placeholder
  ui/          reusable option list (keyboard + mouse)
  settings.ts  persisted settings (localStorage)
tools/         sprite generator
```

See [`assets/SCRIPT.md`](assets/SCRIPT.md) for the story, mechanics and art direction.
