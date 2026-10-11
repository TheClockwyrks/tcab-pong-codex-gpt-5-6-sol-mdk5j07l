# Carom

Carom is a fast top-down paddle duel for the browser. Curve the ball by moving
through a paddle strike, then use two swaying, rotating obstacles to build
unpredictable bank shots. Play alone against the reactive Circuit opponent or
share the keyboard for a local versus match. The first player to 11 wins by two.

## Run locally

Install the pinned dependencies and start Vite:

```sh
npm ci
npm run dev
```

Open the address Vite prints. To create the self-contained static site, run
`npm run build`; the result is written to `dist/` and can be served from the
root of any static host. `npm run preview` serves that production build locally.

## Controls

- Player one: `W` / `S`
- Player two: `↑` / `↓`
- Menu: either player's movement keys, then `Enter` or `Space`
- Pause or resume: `P` or `Escape`
- Back: `Escape`
- Mute: `M`

Mouse and touch also operate every menu. Touchscreen play uses the on-screen
dual-paddle controls supplied by the game runtime.
