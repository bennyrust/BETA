# BETA — GitHub-ready copy

Start with [GITHUB-SETUP.md](GITHUB-SETUP.md). Media has been compressed for static hosting; source downloads are lossless ZIP archives. The original project is unchanged. The cursor requirement is waived only for this beta; see [CURSOR-BETA-EXCEPTION.md](CURSOR-BETA-EXCEPTION.md).

# 3D room viewer

A static Three.js viewer. No build step or npm dependencies. Three.js remains pinned to 0.152.2 through the import map; an internet connection is required to load that library.

## Run

From this directory, run `npm run serve` (requires Python 3), then open http://localhost:8000. ES modules require HTTP; opening index.html directly with file:// is unsupported. Deploy the entire directory, including `js/` and `styles.css`, alongside the assets. When deploying edits, revalidate HTML and JavaScript instead of caching them indefinitely.

## Structure

- `index.html`, `styles.css`: accessible page shell, error banner, object dialog.
- `js/config.js`: model paths, authored room transforms, image placement, selection list.
- `js/bootstrap.js`, `js/errors.js`: startup and asset failure reporting, independent of Three.js.
- `js/app.js`: lifecycle and interaction coordination.
- `js/assets.js`: sequential GLB/image loading and registration. Failures are reported and do not stop later assets.
- `js/cameras.js`: orbit overview, bounded room camera, framing and input state.
- `js/lighting.js`: existing authored light rig and lamp positioning.
- `js/rendering.js`: shared color-correct rendering pipeline with an optional hover outline.
- `js/menu.js`: object previews, centered rotation, fitting and focus handling.
- `js/preview-config.js`, `js/preview.js`: visually reviewed per-object front orientations and ±15° preview drag limits. Preview poses are absolute and independent of the player camera and room pose. Three.js uses Y as vertical.
- `js/media.js`: video loading and muted autoplay at model spawn, placement and visibility handling.
- `js/resources.js`: ownership and deduplicated GPU resource disposal.
- `js/core.js`: independently testable queue, render scheduling and geometry calculations.

`app.js` owns the lifetime. Abortable event listeners are released on page teardown, media stops, renderers are disposed, and shared assets are disposed exactly once. Menu clones borrow main-scene geometry/materials/textures and own only their cloned skeletons. A separate preview renderer is created only on first use.

The room renders when input, loading or resizing changes the scene; it continues rendering during video playback and stops when hidden. Hover picking updates only when the pointer, camera or scene changes. Shadow maps update only when the scene changes. Hovering toggles only the outline pass; tone mapping and output color conversion remain the same.

## Piece descriptions and documentation

`pieces/pieces.json` is the shared catalog for preview descriptions and individual documentation pages. Its 26 stable IDs identify all distinct room objects; the GTA preview model is an alias of the GTA model with a stand. Every preview links to `pieces/<id>/`. The checked-in pages are empty shells with a title and return link, ready for later content.

Open `/content-editor.html` on the local server for the live Piece notebook. Expand a piece and edit its preview description, creation date, documentation, sources, working notes, and status. Fields autosave after typing pauses or focus changes; open room previews and documentation pages refresh within two seconds. Save errors and conflicts are shown beside the piece; unsaved changes trigger a navigation warning. The original spreadsheet remains an offline copy and does not sync.

The same-origin `/api/pieces` endpoint validates allowed fields, creation dates and statuses, prevents stale field overwrites, and atomically updates `pieces/pieces.json`. IDs, names, aliases and asset paths remain fixed. Static hosting displays this JSON but editing requires the local server. Deploy the updated catalog along with the site. `npm run build:pages` can refresh fallback static page content before deployment. Notes and status are editorial fields, omitted from the room and documentation views.

## Preview orientation editor

Open `/orientation-editor.html` using `python3 scripts/serve.py --port 8001`. The grid shows all 26 objects using the preview lighting, front pose and framing. The GTA card edits the no-stand model used by its menu. Drag to turn/tilt, Shift-drag to roll, or use the X/Y/Z ±30° buttons (screen-space axes). Arrow keys on a focused thumbnail also rotate by 30°. Undo restores the previous edit; Reset restores the original authored pose.

Changes autosave on release or button clicks to `pieces/preview-orientations.json`. Open room previews refresh within two seconds; ordinary visitor dragging still has its ±15° limit. Save failures remain visible on the affected card, with Retry save, and unsaved changes trigger a navigation warning. The editor uses one WebGL renderer and disposes thumbnail resources after each render, retaining only the selected model. Video screens display their model texture in the editor; the room retains video playback.

The local server accepts same-origin PUT requests only at `/api/preview-orientations`, validates names and finite angles, and atomically updates the catalog. Static hosting can display the saved poses but cannot accept edits; use the local server to edit, then deploy the updated JSON. Run `python3 -m unittest discover -s tests -p 'test_*.py'` for persistence, validation and simultaneous-save checks.

## Visitor controls

Space switches overview/room cameras. In room view, left drag looks around, the player position is fixed and right drag has no effect, left/right arrows turn 45 degrees, and R resets the camera. Click an object without dragging to open its preview. Drag inside the preview to rotate up to 15° horizontally or vertically from its fixed front pose; Escape, the close button or the backdrop closes it. Videos load and attempt muted playback at spawn. If the browser blocks autoplay, the next room interaction retries playback.

## Verification

Run `npm test` for path, queue, error-continuation, scheduler, fit and click-threshold regressions. Open `/tests/browser.html` on the local server for real Three.js camera, menu, resource and missing-file checks. The browser test deliberately requests `intentionally-missing.glb`; a 404 and an error banner are expected there.

Manual smoke checks: load the full scene; switch cameras; click and drag objects; close a preview after dragging; reset the room camera; verify videos update in both the room and preview; resize; hide and restore the tab.

## Review and remaining constraints

The refactor fixes stale click targets, menus opening on drag, duplicate orientation correction, videos not updating in static previews, late-loaded video objects missing attachments, camera controls acting behind dialogs, cumulative body-orbit movement, empty-scene framing, and completion framing before images arrive. Missing assets remain visible in the page and console. Deprecated rendering/texture settings were updated without changing the pinned Three.js release.

Authored model positions and lighting values are preserved, including objects positioned outside the room. Assets are unchanged. The original source videos exceed 2 GB each; BETA contains compressed full-duration versions and resized images/model textures. Source downloads are ZIP archives. See MEDIA-COMPRESSION.json for actual sizes. Safari/iOS performance still needs a device smoke test. Production hosting should support HTTP byte-range requests for video. The included local server supports video byte ranges and disables caching to make source edits visible after reload; it is for local preview only.

The original standalone page is saved outside this deployable directory at `../.backups/index.before-refactor.html`.

Validated during this refactor: nine Node regressions and nine browser regressions passed; the full room, object picking, preview dragging, Escape after dragging, camera dragging/reset, and upright TV preview were checked in the in-app browser. All 24 model paths and room transforms were compared against the saved original. Full video playback and Safari/iOS performance were not verified. CSGO.mp4 stores its `moov` metadata after the media payload, making byte-range support particularly important for startup; both MP4s contain AVC video and AAC audio.

Preview orientation review: `/tests/preview-gallery.html` renders the actual GLBs using their fixed preview poses, sequentially with one renderer. The no-stand GTA model has its own front pose, and the window and wall graphics face +Z in preview space. The toilet uses its room yaw plus a vertical half-turn; Trump discards its room X/Z rotations. Gold/GTA TVs have their scanned faceplates stood upright and leveled. Figurines face forward; tins have a small tilt to show their lids; the laptop exposes its screen. Room transforms are unchanged.

Object previews use an imageboard post header: Anonymous, the piece name, and its creation date formatted as MM/DD/YY(day). Each authored description line starts with `>`; the close hint follows the text. Preview headers include decorative random times and eight-digit post numbers, stable for each piece while the room remains open.

## Loading screen and cursors

The room opens in player view after every model/image is loaded, video screens have a first frame, and the player view has rendered. The segmented loading bar tracks completed objects; failed assets leave a retry screen and the existing error list visible. Space still toggles the admin camera after loading. Piece pages use the same loader until their content is fetched.

The preview server exposes `/api/loading-text`, a fixed proxy for 4chan’s `/g/` catalog. Short plain-text excerpts are cached for ten minutes, fetched with a four-second timeout and conditional requests, and displayed with links to their original posts. Feed failures never block the scene. A static-only host must implement this endpoint to show live excerpts; otherwise the neutral loading message is used.

Classic cursor files are stored locally in `cursors/`; source attribution and the downloaded license notice are included there.

## Piece file libraries

Each piece page includes a file library. Upload from the local page using Add files → Upload files (2 GB maximum per file). Files are streamed to `pieces/<piece-id>/` with a `files.json` manifest. Original filenames are retained in the manifest; unique storage names prevent overwrites. Images, compatible video and audio have inline previews; 3D files and other documents can be downloaded. Zip multi-file models with their textures and dependencies.

Back up the entire `pieces` folder along with `pieces/pieces.json`. Renaming a piece leaves its library attached to the stable piece ID. Published static copies can display/download files; uploads require this local server. Public hosting would need an authenticated upload backend before enabling editing. No video hosting provider has been connected or content migrated.

## Unified piece folders

Each `pieces/<piece-id>/` folder contains its branch page (`index.html`), models, videos, images, source variants, uploads, and `files.json` library manifest. Both the room scene and branch page load the same assets directly from that folder. Uploads save there too.

Shared editable metadata lives in `pieces/pieces.json`; saved preview rotations live in `pieces/preview-orientations.json`. Back up the entire `pieces` folder. Existing branch-page URLs remain unchanged. There is no separate content directory.
