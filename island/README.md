# Zombie Island

A single-player 3D first-person zombie survival game set on a tropical island at night.

Built with **Three.js** + **Vite** so it runs instantly in the browser — great for demos and exhibitions without installing the Unity Editor.

## Play online

**https://sarthak-2210.github.io/cosmos/island/**

Deployed via the monorepo GitHub Pages workflow in `.github/workflows/deploy.yml`
(same pattern as Cosmos).

## Play locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173/cosmos/island/** (path matches the Pages base).

## Controls

| Input | Action |
|-------|--------|
| W A S D | Move |
| Mouse | Look |
| Left click | Shoot |
| R | Reload |
| Shift | Sprint |
| Space | Jump |

## Features

- Procedural island terrain, palms, rocks, campfire, and moonlit ocean
- Wave-based zombie horde with scaling difficulty
- Hitscan combat, headshots, muzzle flash, tracers, blood FX
- Health, ammo, kill feed, wave banners
- Procedural sound effects (no audio files required)

## Build for static hosting

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, etc.).
