# Shape Defender

A browser-based action game built with vanilla JavaScript and the HTML5 Canvas API. The player defends against incoming geometric enemies by drawing matching shapes on screen in real time.

No frameworks. No build step. Just a game loop, a canvas, and a gesture classifier.

---

## Gameplay

Geometric shapes spawn at the edges of the screen and move toward the player at the center. To destroy an enemy, the player draws its matching shape — a circle, a vertical line, or a V — directly on the canvas using touch or mouse. A correct match removes the enemy and scores points. A collision costs a life. The game ends when all five lives are gone.

Difficulty scales continuously over 120 seconds: spawn rate and movement speed both increase as time passes.

---

## Technical Overview

### Game Loop

The main loop runs via `requestAnimationFrame`, receiving a high-resolution timestamp on every frame. Delta time is computed manually and used to drive spawn timing independently of frame rate. The loop handles input state, shape movement, collision detection, drawing, and HUD updates in a single pass.

```
requestAnimationFrame(loop)
  delta = now - lastTime
  handleSpawn(delta)
  for each shape: move -> checkCollision -> draw
  drawStroke / drawPlayer / drawHearts / updateHUD
```

### Canvas Rendering

The canvas is scaled to match `window.devicePixelRatio` to avoid blur on high-DPI and Retina displays. All draw calls use logical pixel coordinates via a CSS transform applied to the rendering context. The canvas resizes on every `orientationchange` and `resize` event.

```javascript
canvas.width  = rect.width  * dpr;
canvas.height = rect.height * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

### Gesture Recognition

Player input is captured via the Pointer Events API, which unifies mouse and touch into a single event model. As the pointer moves, sampled points are accumulated into a stroke buffer with a minimum distance threshold to reduce noise.

When the pointer is released, the stroke is classified using three geometric algorithms:

- **Line** — ratio between path length and the straight-line distance between endpoints. Values below 1.15 indicate a line.
- **V shape** — checks that the midpoint of the stroke is lower (in screen Y) than both endpoints by at least 20% of the stroke height, and that the start and end points are not too close (ruling out circles).
- **Circle** — normalizes the stroke into a unit bounding box, computes a centroid, then measures variance in the distance from each point to that centroid. Low variance means circular.

Classification order matters: V is tested on raw coordinates before normalization, which preserves the directional constraint.

### Collision Detection

Each enemy has a `size` property. The player has a hit radius derived dynamically from the rendered sprite height (`drawH * 0.25`). Collision is a simple Euclidean distance check between the shape position and the canvas center:

```javascript
Math.hypot(shape.x - CENTER.x(), shape.y - CENTER.y()) < playerHitRadius + shape.size * 0.8
```

### Difficulty Scaling

A single `getDifficulty()` function returns a value from 0 to 1 based on elapsed time divided by a 120-second cap. This scalar drives both spawn interval (2000ms down to 700ms) and shape speed (min to max), creating a smooth and predictable difficulty curve.

### Sprite Animation

The player character is a horizontal sprite sheet with four frames: idle, action1, action2, and dead. Frame selection is driven by state transitions triggered on stroke input and on game over. Action frames reset to idle via a 150ms timeout unless the player has already died.

---

## Architecture

The project is organized as a collection of plain script files, each with a single responsibility, loaded in dependency order.

```
js/
  config.js        Game constants (speeds, sizes, shape types, frame indices)
  canvas.js        Canvas setup, DPR scaling, resize handler, CENTER helper
  audio.js         Audio asset declarations
  player.js        Sprite drawing, hit radius, collision check, frame transitions
  shapes.js        Spawn logic, movement, shape drawing, difficulty curve
  stroke.js        Pointer event capture, stroke buffer, gesture classification
  supabase.js      Supabase client initialization with credential validation
  score-local.js   Offline score persistence using localStorage
  score-manager.js Save and load scores — online via Supabase, offline via local storage
  ui.js            DOM event handlers, HUD drawing, game start/restart flow
  game.js          Main game loop, screen shake, flash effect, game over trigger

css/
  base.css         CSS custom properties, reset, canvas, orientation media query
  components.css   Reusable UI: overlay, popup, buttons, form, message, ranking list
  screens.css      Screen-specific styles: HUD, start screen, game over screen
```

All variables are shared via the global scope across script files, which keeps the architecture flat and removes the need for a module bundler.

---

## Offline-First Design

The game is fully playable without a server connection. Supabase credentials are injected at deploy time via environment variable substitution. If the credentials are missing or the connection fails, the game falls back automatically:

- Player identity is stored in `localStorage` under `offline_player_name`
- Scores are persisted in `offline_scores` as a sorted JSON array (capped at 20 entries)
- The leaderboard on the game over screen displays local scores instead of the online ranking
- Any network error during an online session triggers the same fallback silently

This means the game works in local development, on slow connections, and in fully offline environments without any code changes.

---

## Stack

- **Rendering** — HTML5 Canvas 2D API
- **Input** — Pointer Events API (mouse + touch unified)
- **Game Loop** — `requestAnimationFrame` with manual delta time
- **Backend** — Supabase (PostgreSQL + REST API via `@supabase/supabase-js`)
- **Persistence** — localStorage for offline mode
- **Styling** — Vanilla CSS with custom properties, no preprocessor
- **Runtime** — Vanilla JavaScript, no frameworks, no build tools

---

## Running Locally

Serve the project root with any static file server.

```bash
npx serve .
# or
python -m http.server 8000
```

For online features, set `SUPABASE_URL` and `SUPABASE_KEY` in `js/supabase.js` before serving. Without them, the game runs in offline mode automatically.

The expected database table:

```sql
create table scores (
  id            uuid primary key default gen_random_uuid(),
  player_name   text unique not null,
  score         integer not null default 0,
  created_at    timestamptz default now()
);
```
