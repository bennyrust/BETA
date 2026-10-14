# TV Dinner reconstruction prototype

Separate eight-second study; the existing website and video are preserved.

Run from this directory:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Open http://127.0.0.1:8766/ in a browser. No installation or build step is needed. The initial view is an approximate articulated reconstruction, **not photorealistic capture**.

Read [the assessment](REPORT.md), inspect [the camera comparison](evidence/camera-comparison.jpg), or edit `assets/scene.json`, `assets/motion.json`, and `app.js`. Load `assets/tv-dinner-8s.glb` in a 3D editor for the baked scene/animation.

The directory can be hosted beside the existing room as its own page. It imports the same Three.js 0.152.2 version. It does not add itself to, or replace anything in, the existing room.
