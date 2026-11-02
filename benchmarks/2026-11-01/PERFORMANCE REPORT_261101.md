# Performance audit — 1 November 2026

The local preview now loads its main room in a median **1.587 seconds cold**, down from **23.225 seconds** (93% less time). Warm room startup fell from **22.610 to 1.268 seconds** (94%). The vape selector fell from **4.001 to 0.659 seconds cold** (84%) and **3.912 to 0.356 seconds warm** (91%). These are local measurements, not production CDN or mobile-network results.

## Method

Headless Google Chrome on this Mac, Metal rendering, 1280 × 900 viewport, no CPU/network throttling. Two independent browser contexts per page; each context runs a cold visit and then a warm visit. Values below are medians of the two samples. Browser caches are isolated per context; warm visits reuse the same context. Main room/vape readiness waits for the loading overlay to finish; Memory waits for the wallet label, and simple pages use DOM readiness. The shooting-gallery sample includes starting a round. `readyMs` uses wall-clock browser navigation timing. Different page types therefore have different readiness conditions.

Resource Timing transfer sizes are reported in MiB. They include completed resource requests during startup and the following observation period; cross-origin resources may not expose transfer sizes, and still-streaming video ranges may not be counted. They are useful comparisons, not a full wire-byte/network invoice. Random gallery backgrounds vary between runs, so image-byte totals for that page are not directly comparable. Three seconds of post-startup task duration measures main-thread work, not GPU utilization or FPS. Gallery measurements are during active gameplay; other pages are idle or playing their normal scene videos.

The main room's final samples were rerun after the final room-poster optimization. Other final samples use the same final code paths from the preceding complete run. No other benchmarks ran concurrently. Two samples give directional evidence, not tight confidence intervals. The lighter pages had small timing fluctuations; their results do not demonstrate a startup speedup.

## Before / after

| Page | Cache | Ready before | Ready after | Transfer before | Transfer after |
|---|---|---:|---:|---:|---:|
| Main room | cold | 23.225 s | 1.587 s | 264.246 MiB | 107.558 MiB |
| Main room | warm | 22.610 s | 1.268 s | 242.397 MiB | 70.615 MiB |
| Vape selector | cold | 4.001 s | 0.659 s | 232.751 MiB | 29.744 MiB |
| Vape selector | warm | 3.912 s | 0.355 s | 232.580 MiB | 0.044 MiB |
| Shooting gallery | cold | 0.210 s | 0.179 s | 1.012 MiB | 1.006 MiB |
| Shooting gallery | warm | 0.085 s | 0.076 s | 0.579 MiB | 1.019 MiB |
| Memory | cold | 0.075 s | 0.108 s | 6.774 MiB | 0.763 MiB |
| Memory | warm | 0.041 s | 0.046 s | 0.005 MiB | 0.005 MiB |
| American Spirit | cold | 0.053 s | 0.066 s | 0.921 MiB | 0.921 MiB |
| American Spirit | warm | 0.028 s | 0.034 s | 0.001 MiB | 0.001 MiB |

## What changed

- Added content-addressed runtime assets while preserving original GLBs, images, videos and download/catalog links. Reused compatible BETA encodes after checking geometry, and created missing runtime model/image variants. `optimized/models.json`, `media.json`, and `images.json` record source/runtime relationships.
- All 46 runtime GLBs preserve the source mesh definitions and every non-image binary buffer view byte for byte. Runtime textures are capped at 1024 pixels; poster images at 2048. This intentionally trades some close-up texture detail for lower download/GPU costs. Originals remain intact. Some reused encodes were already present in the published BETA; those savings primarily bring the local preview into line with it, rather than representing new improvements to the deployed site.
- Routed room, inventory previews, vapes, blind boxes, TV Dinner and bowling to those smaller runtime assets. Playback uses the existing BETA video encodes (about 27 MB total versus 4.8 GB of source videos). No deployment occurred.
- Replaced a repeated curved-screen scan/raycast calculation with its exact captured 2,535 local-space coordinates. The geometry remains unchanged. Recompute this fit if the underlying Trump model, screen dimensions, or authored transforms change.
- Reduced room-poster assets from 44.95 MB to 1.08 MB. One source poster alone decoded to over 163 million pixels; avoiding that runtime decode removed a large startup stall.
- Shared in-flight/briefly cached piece-catalog requests; callers receive independent Map instances. Reduced content/orientation polling from 1.5 seconds to 5 seconds. Local worksheet changes can take up to five seconds to appear in already-open pages.
- Stopped the vape selector from redrawing when definitions are unchanged. Its median main-thread work over the three-second observation window dropped from about 0.70–1.03 seconds to 0.001–0.003 seconds (over 99%).
- Shooting-gallery stats update only when values change; target movement now uses compositor transforms. Its measured active main-thread task time fell from about 191 ms to 89–95 ms per three seconds (about 50–53%). The animation loop also stops on ready/round-end screens and while paused or hidden.
- Inventory renderers resize their drawing buffers only when dimensions change, reuse temporary bounds objects, deduplicate disposal through the existing resource owner, and expose explicit disposal.
- Encoded the six photographic Memory slices as WebP while retaining their original PNG crops. Cold measured transfer fell from 6.774 to 0.763 MiB (89%). Its UI-ready measurement did not improve; the images load after the wallet label appears.
- Content-hashed runtime models/videos have immutable local cache headers. Editable code/catalogs retain revalidation. Missing runtime assets remain non-cacheable errors.
- Reduced the optional video-buffer startup wait from eight seconds to two. The room becomes interactive while media can continue buffering; the White TV's existing poster/recovery behavior remains. This is a deliberate readiness change, alongside the asset/CPU improvements.

## Validation

- 60 JavaScript tests passed, including catalog request sharing/retry, runtime routing/hashes, gameplay, scoring, wallet deductions/payouts, inventory layout, preview fitting and existing loading/resource tests.
- 20 Python tests passed, including byte ranges, conditional requests, immutable runtime caching, missing-file policy, file libraries and worksheet APIs.
- JavaScript syntax audit: 97 files passed before the final integrity-check script was added; that additional script also executed successfully.
- `npm run check:runtime` verified all 46 runtime GLBs against the source geometry and all six runtime video/poster assets against their content-addressed names.
- Browser checks passed for shooting targets/movement/pause/maps; Memory wager/reload/payout; photo pin placement/score/reset/keyboard; vape Buy badge/footer; 36 rotated vape views at three aspect ratios; selected hotbar item/drag; and affected Buddyologies, laptop, bowling and TV Dinner routes. No JavaScript errors were reported in these checks or benchmark samples.
- Corrected an outdated route test that assumed the new American Spirit and Memory game pages were still generic documentation templates.

## Remaining limits / follow-up

- The room still transfers about 108 MiB cold and contains large uncompressed geometry. Some large models exceeded Chrome's per-resource memory-cache behavior during this test; warm transfers still measured around 71 MiB. Geometry compression / simplification is the next major opportunity, but needs separate close-up visual review and decoder support.
- The room continues doing work for animated video textures. This audit did not establish GPU memory totals, sustained FPS, low-end phone performance, or a complete nested-laptop stress benchmark.
- Buddyologies still has a continuous animation/render path, and dynamic shadows may cost more than necessary when nothing moves. It was smoke-tested, not included in the five-page timing table.
- The legacy blackjack source files remain as inactive earlier work; the active Plate of Cheese route uses Memory. They are not downloaded by that page.
- The development repository includes original/source media and is much larger than a deployable BETA package. A future deploy must deduplicate existing BETA media against the new runtime variants and respect the hosting size limit; do not blindly upload the full source directory.
- Re-run `npm run check:runtime` after source model changes. It detects stale model derivatives; regenerate runtime variants and update their manifest before publishing. This audit did not change the GitHub Pages CDN configuration or publish any changes.

## Reproduce

Run `npm test`, `python3 -m unittest discover -s tests -p '*test*.py'`, and `npm run check:runtime` from the site directory. Start `python3 scripts/serve.py --port 8001`. With Playwright installed, run:

```sh
PLAYWRIGHT_PATH=/absolute/path/to/playwright CHROME_PATH=/absolute/path/to/Chrome node scripts/benchmark.cjs /tmp/benchmark.json
```

The script uses the local site at `127.0.0.1:8001`. Raw before/after samples, including resource URLs, are saved next to this report. Browser timing and cache behavior will vary by machine and network.
