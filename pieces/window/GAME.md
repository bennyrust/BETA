# HYPERNORMALISATION

Outside My Bedroom Window is a ten-round shooting gallery. Both T (terrorist) and CT (counter-terrorist) targets score hits; neither is a protected/friendly target. Rounds randomize target types, timing and available slots, with increasing exposure difficulty. Targets hinge upright in 240 ms, then become shootable. Click or tap; keyboard users can Tab to a standing target and activate it. P pauses; hiding the tab pauses the game automatically.

Each hit earns 100–1000 points based on reaction time. Each escape subtracts 100 points from raw points, bounded at zero. Displayed/final score multiplies that result by hits / shots. The result screen shows aggregate hits, misses through accuracy, escapes and mean reaction time.

Replace `art/terrorist.svg` and `art/counter-terrorist.svg` with artwork, or update ARTWORK in game.js to point to PNG/WebP/SVG files. Target labels remain functional UI. The gallery background is intentionally blank; no final environmental artwork has been generated. The pixel crosshair is a temporary SVG in the shared cursors package; see cursors/REQUIREMENTS.md and PUBLISH-BLOCKED.md.

Core rules are in game-core.js; UI and animation are in game.js and game.css. The build-piece-pages script preserves this custom branch page. No external libraries, images, videos or fonts are needed.
