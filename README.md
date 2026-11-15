# Undampori Bash

A browser-based slicing game with Kerala snacks. Swipe to slice pazhampori,
parippuvada, unniyappam and friends — but don't touch the undampori!

Built with React (menus/HUD), TypeScript, HTML5 Canvas (gameplay) and Vite.
See [PLAN.md](PLAN.md) for the design.

## Scripts

```sh
npm install
npm run dev        # start dev server
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run lint       # eslint
npm test           # unit tests (vitest)
```

## Art and sound

Everything is optional — missing files fall back to drawn shapes / synthesised sounds.

**Images** (PNG, square, transparent background, snack filling the frame, ~256×256):

- `public/assets/snacks/pazhampori.png`
- `public/assets/snacks/parippuvada.png`
- `public/assets/snacks/unniyappam.png`
- `public/assets/snacks/achappam.png`
- `public/assets/snacks/uzhunnuvada.png`
- `public/assets/undampori/undampori.png` — the "bomb"

**Sounds** (MP3, short):

- `public/assets/sounds/slice.mp3`, `combo.mp3`, `miss.mp3`, `undampori.mp3`

Snack names, sizes and fallback colours live in `src/game/utils/constants.ts`
(`SNACK_TYPES`, `SNACK_LOOKS`).

## Controls

Swipe (mouse / touch / pen) to slice · **Esc** / **P** pause · **M** mute
