# spawner

A tiny browser game: control a character with mouse clicks (LoL-style click-to-move) and collect randomly spawned items (food, water, wood).

- Left click (or right click) anywhere to move your character toward that point.
- Walk into items to collect them.
- Items spawn over time at random positions.
- Simple particle and target indicators for feedback.

## Run locally

Just open `index.html` in your browser.

Tip: If your browser restricts local file scripting, you can use a simple static server:

- Python 3: `python3 -m http.server 8080`
- Node (serve): `npx serve -p 8080`

Then navigate to `http://localhost:8080/`

## Files

- `index.html` — main HTML page with canvas and UI overlays
- `styles.css` — styling for UI and overall presentation
- `src/game.js` — the game loop, click-to-move controls, item spawner, and rendering

## Controls

- Left click or right click: set a move target.
- Your character slows down as it reaches the target.
- Collect items by walking over them.

Enjoy!