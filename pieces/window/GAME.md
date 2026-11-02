# HYPERNORMALISATION

Outside My Bedroom Window is a ten-round shooting gallery. Both T (terrorist) and CT (counter-terrorist) targets score hits; neither is a protected/friendly target. Rounds randomize target types, timing and available slots, with increasing exposure difficulty. Targets hinge upright in 240 ms, then become shootable. Click or tap; keyboard users can Tab to a standing target and activate it. P pauses; hiding the tab pauses the game automatically.

Each hit earns 100–1000 points based on reaction time. Each escape subtracts 100 points from raw points, bounded at zero. Displayed/final score multiplies that result by hits / shots. The result screen shows aggregate hits, misses through accuracy, escapes and mean reaction time.

Replace `art/terrorist.svg` and `art/counter-terrorist.svg` with artwork, or update ARTWORK in game.js to point to PNG/WebP/SVG files. Target labels remain functional UI. The gallery background is intentionally blank; no final environmental artwork has been generated. The pixel crosshair is a temporary SVG in the shared cursors package; see cursors/REQUIREMENTS.md and PUBLISH-BLOCKED.md.

Core rules are in game-core.js; UI and animation are in game.js and game.css. The build-piece-pages script preserves this custom branch page. No external libraries, images, videos or fonts are needed.

## Landscape targets
Targets use the supplied `Game Assets/Terrorist.png` and `Game Assets/Counter Terrorist.png` artwork, preserving aspect ratio. Each target spawns at a continuous random ground position, hinges upright, and follows a bounded horizontal random walk. Speed and direction are reselected every 280–1130 ms, with eased velocity changes and reflection at the scenery edges. Later rounds increase speed and shorten exposure. Ground depth controls target size and overlap order. Pausing freezes the game clock and movement; ten-round scoring and coin rewards are unchanged.

## Round backgrounds
Each round selects a random map (excluding the previous map), then a random screenshot of that map. Twelve cached Valve CS:GO screenshots cover Dust II, Inferno and Nuke. Source URLs are in backgrounds.json. The next screenshot preloads during play; the game clock only begins after background selection. A five-second load timeout keeps failed downloads from blocking play and retains the previous background or landscape fallback. This does not make live Google Images requests.

Difficulty increases every round: target count rises by two (6 in round 1 to 24 in round 10), movement speed rises by 25% of the opening speed per round (3.25× by round 10), and base exposure drops from 3.6 seconds to 1.35 seconds. Spawn intervals also shorten from 800 to 350 ms, with small random variation. At most three targets are on screen at once.
