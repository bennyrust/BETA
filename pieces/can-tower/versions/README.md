# Totem Pole versions

V1: original 5 percentage point steps, 100% → 5% → 100% remaining height, ten cycles (381 cans). Its original page, renderer and sequence are archived in V1/.

V2: 0.2 percentage point steps, 100% → one CSS pixel tall, once (499 cans; the final step is clamped to exactly one pixel). No reversal or loop. The same scanned surface and rendering are used.

On the local Totem Pole page, select V1 or V2 to preview, then click Make live. This saves `liveVersion` in pieces/pieces.json, so it applies to all visitors and persists across restarts. Publish that catalog with the site. `?version=V1` and `?version=V2` preview either version without changing the live selection.

V3: photographic can keyframes derived from the high-resolution reference photos, using V2’s 499-can progression and one-pixel endpoint. Assets, renderer snapshot, provenance and prompts are in V3/. Select V3 using the same live selector.
