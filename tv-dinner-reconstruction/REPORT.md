# TV Dinner — eight-second reconstruction study

This is a working, freely navigable, **approximate 3D reconstruction**, not a successful photorealistic capture. It demonstrates a local workflow for timing, scene layout, motion-guided animation, browser playback, and comparison. The performer remains a procedural surrogate. The source camera comparisons show substantial appearance and calibration errors. This prototype does **not** establish that the recordings support a convincing photorealistic free-viewpoint result.

## What was inspected

The actual project was found at `/Users/benmichalsky/Desktop/3D Room`, rather than the stale task workspace path. The originals are `.mov`, not `.mp4`:

| Source | Resolution / frame rate | Duration | Coverage observed |
|---|---|---|---|
| Front view.mov | 1920×1080 / 29.970 | 28:22.20 | Close view of arms, food, lap, toilet; face cropped |
| Profile view.mov | 1920×1080 / 29.970 | 28:43.22 | Most useful full-body silhouette; far-side joints occluded |
| Rear view.mov | 1920×1080 / 29.970 | 24:04.44 | Back, head, CRT and tripod; hands and face hidden |
| Top view.mov | 1280×720 / 23.976 | 22:57.09 | Tray layout and lateral hand placement; hair hides face |
| TV Dinner.mp4 | 1920×1080 / 23.976 | 16:10.18 | Primary editorial timing reference; cuts/crops and mixed sound |

Six widely spaced frames from each source, reference photographs, the floor plan, and 33 frames per camera from the selected segment were inspected/extracted. This was a sampled assessment, not an exhaustive review of every frame. All original files were read only. Reference photos were used for room and equipment placement; unrelated studio equipment was omitted.

## Timing evidence

Selected segment: **finished edit 03:00.00–03:08.00**, drinking from the cup, lowering it, and returning it to the tray.

Local mapping is `source time = edit time + offset`:

| Camera | Offset | Source interval | 10-second audio-envelope correlation at edit 180 s |
|---|---:|---|---:|
| Front | +440.90 s | 10:20.90–10:28.90 | 0.893 |
| Profile | +450.97 s | 10:30.97–10:38.97 | 0.941 |
| Rear | +192.42 s | 06:12.42–06:20.42 | 0.911 |
| Top | −6.95 s | 02:53.05–03:01.05 | 0.879 |

Audio was decoded locally to mono 8 kHz PCM, filtered to 180–2800 Hz, and compared as 100 Hz RMS envelopes with normalized cross-correlation. An independent window at edit 190 s supports the same local offsets within 0.02 s. Matched frames confirm cup lift/tilt, return, and hand motion in all cameras. This is not a genlocked or formally frame-accurate calibration; allow roughly 0.1 s uncertainty pending event-by-event refinement. Decoding returns the frame at or just before the requested timestamp.

Do not use these offsets blindly for the whole film. Windows at 170 s and 300 s produce inconsistent global audio matches; edit sound may differ from the camera microphones, and repeated playback audio produces false peaks. Later reliable windows differ by roughly 0.05–0.10 s. Full extension needs shot-aware visual matching and drift checks. See `evidence/sync-audio.json`, `media-metadata.json`, and `alignment-contact-sheet.jpg`.

## What is recovered, reused, or inferred

- **Room:** measured footprint from the supplied drawing, approximately 5.556 × 6.744 m. Height (3.25 m), fixture layout, door details, subject position, and lighting are inferred from photographs. The model is a simplified room shell, not a surveyed architectural reconstruction. Floor material is a sampled texture with visible repetition.
- **Objects:** the existing project toilet scan was reused and its texture maps reduced to 1024 px. Its surface quality differs from the footage. The tray is new solid geometry with a rectified, empty-front-view graphic and source-derived edging. The CRT, tripod, cup, food packaging, plinth, and cable are manually modeled. Food labels and dimensions are approximate. The existing room and its TV Dinner video are unchanged.
- **Cameras:** manually estimated positions, aim, and field of view, saved in meters in `assets/scene.json`. The floor plan supplies scale, but lens intrinsics, distortion, and camera extrinsics were not solved from calibration targets. These are comparison presets, not validated recovered camera poses. No reprojection-error claim is made.
- **Movement:** Apple Vision produced body-pose observations on all 33 profile frames. A test on the overhead frame produced no body pose; the cropped front frame had incomplete joints. Reliable profile points were smoothed and mapped into an approximate sagittal plane. Lateral separation, hidden joints, leg positions, and body shape were assigned manually. This is **not multi-view triangulation or volumetric motion capture**. The cup uses nine manually estimated keyframes, checked against overhead and front views. Hands/fingers are simplified; contacts, cloth, hair, and face are not physically reconstructed.
- **Textures:** source-derived tray, floor, clothing/skin swatches and toilet textures; small patches repeat or stretch. There is no recovered full-body texture atlas. The CRT plays a synchronized 4 fps texture atlas cropped from the actual rear-view screen; this is an appropriate screen surface, not a substitute for solid scene geometry.
- **Animation:** one shared eight-second clock drives pose, cup, CRT atlas and reference images. References are 4 fps stills; the 3D movement is interpolated. Audio is not included. The loop restarts at the first pose and is not seamless.

## Browser and editable assets

Open `index.html` through a local HTTP server. The implementation uses the same **Three.js 0.152.2** ES-module architecture as the existing website, with local vendor modules and no build dependency. All required browser assets are local; no runtime CDN connection is needed.

Controls: orbit/pan/zoom; first-person WASD, Q/E vertical movement, Shift speed; mouse look with pointer lock, or drag-to-look when pointer lock is denied. Movement is bounded to the room, but object collisions are not implemented. Mobile orbit and camera presets work; first-person keyboard navigation is intended for desktop.

Editable deliverables:

- `app.js`: procedural geometry, materials, movement evaluation, lighting, navigation, playback and export.
- `assets/scene.json`: room dimensions, camera estimates and timeline offsets.
- `assets/motion.json`: 33 editable pose samples, cup keyframes, and provenance.
- `assets/toilet.glb` and texture JPEGs: reusable local assets.
- `assets/tv-dinner-8s.glb`: baked scene and standard transform animation, suitable for loading with GLTFLoader or opening in a 3D editor. It uses transform tracks rather than a skinned character rig. CRT texture animation is browser-only; GLB preserves its first frame.
- `export-asset.js`: GLB export implementation. The UI also exports editable Three.js scene/pose JSON.
- `evidence/pose-profile.json`: original normalized 2D joint observations/confidences, retained for revision.
- `tools/`: local Objective-C media/pose utilities and processing/test scripts. They record the machine-specific workflow and need path adjustment before rerunning elsewhere. `build_assets.py` records the initial construction pass; the final editable JSONs include later manual camera and depth corrections.

The source recordings are not bundled or duplicated. No paid service, remote inference, footage upload, or model-weight download was used. Only small Three.js modules matching the project version were downloaded. The prototype is a separate directory and does not change the existing room's entry point or current TV Dinner video.

## Verification and performance

See `evidence/browser-validation.json` for the recorded run. The 6.1 MB GLB was reloaded through GLTFLoader: one eight-second clip, 36 reloaded transform tracks (45 exported channels), with moving nodes verified at four seconds (`evidence/glb-validation.json`). On this MacBook Pro (M1 Pro, 16 GB RAM, 16-core GPU), headless Chrome 153 used **ANGLE Metal / Apple M1 Pro**:

- 1140 × 570 drawing buffer, pixel ratio 1, page viewport 1440 × 1100.
- Approximately **60.0 fps** over 590 measured animation frames after warm-up; median 16.7 ms and p95 16.8 ms.
- Approximately **62.5k rendered triangles, 119 draw calls, 11 textures** in the initial orbit view. Counts vary by view/culling.
- Source-reference frames reduced to 640×360 JPEG; selected full-resolution frames retained separately. Pixel ratio is capped at 1.5; shadows use a 1024-pixel map; hair geometry is merged.
- Playback endpoints, all four camera presets, orbit drag, first-person movement and fallback look, joint/camera toggles, and a 390-pixel mobile layout were checked. No browser page errors or failed asset requests in the final run. Native pointer lock was unavailable in headless Chrome; fallback mouse look was verified. A normal interactive-browser pointer-lock test remains unverified.

This is a local headless benchmark, not a claim about phones, embedded webviews, high-DPI rendering, or production network performance. Startup timing in the JSON is localhost-only. Performance is adequate for the prototype; realism is the limiting factor.

## Comparison and decision on full-sequence extension

`evidence/camera-comparison.jpg` places the original and reconstructed camera views side by side. `evidence/browser-overview.png` shows the actual browser result. The differences are material: silhouette, facial appearance, hair, clothing folds, toilet surface, lighting, object contacts, lens framing and hidden surfaces are approximate. The proof of concept does not meet a photorealistic quality bar.

Extending the **approximate animated scene** is practical but labor-intensive. The browser load would stay modest because the same geometry can be reused. The expensive part is preparing and validating pose/prop tracks across changing actions, occlusions, and edit boundaries. The current eight-second samples must not simply be stretched across the whole performance.

Extending this to a **convincing realistic human reconstruction** is not established by this test. The specific missing inputs are a complete performer surface/texture model, calibrated camera intrinsics/extrinsics, reliable multi-view joint correspondences, and coverage of the obscured face/hands/body. No dynamic neural reconstruction was trained or evaluated, and no claim is made that purchasing GPU time would solve those coverage gaps.

The most useful next step is to improve this same segment before committing to the full film: calibrate the four lenses against shared measured landmarks, obtain or manually build a proper clothed performer mesh/rig, fit the pose and cup jointly across views, and validate held-out frame landmarks/contact points. Additional neutral performer/reference photographs or a short static scan would help body/face appearance much more than extending this surrogate animation. If a GPU-heavy reconstruction experiment is desired afterward, define a quality target and a small trial first; obtain approval before any upload, paid processing, or substantial download.
