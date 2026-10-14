# Vape variants

Current base: `Breeze good.glb`. Preserve its geometry. The twelve exports replace only the printed flavor area using the PNG artwork and new UVs. Original casing material and scan detail remain. An object transform centers and sizes each instance to 12 cm for the room; mesh coordinates and topology are unchanged.

Run Blender with `--background --factory-startup --python rebuild-vapes.py`. The script verifies mesh coordinates and face indices before saving. Earlier source models are retained for reference only.
