# Bulk Image Optimizer & WebP Converter

A 100% client-side tool that compresses and converts many JPG, PNG, WebP, GIF, and BMP images to modern WebP (or optimized JPEG/PNG) in parallel, right in your browser. Output is bundled as a ZIP. No uploads, no sign-up, no tracking — your images never leave your device.

**Live:** <https://bayhaqy.my.id/apps/image-optimizer/>

---

## Why use this instead of an online converter?

| Concern | Online converter | Bulk Image Optimizer |
|---|---|---|
| **Privacy** | Images uploaded to a server, often stored or used for training | 100% local — images never leave your browser |
| **Speed** | Upload + queue + download round-trip | Instant — processes in parallel on your device |
| **Limits** | Usually capped at 10–50 images or a few MB | No artificial limit — bound only by your device's memory |
| **Sign-up** | Often required for >N images or larger files | Never required |
| **Watermark** | Some free tiers add a watermark | None, ever |
| **Cost** | Free tiers limited; paid for bulk | Free forever, MIT licensed |
| **Offline** | Requires internet | Works offline after first load (CDN libs cached) |

---

## Features

1. **Bulk convert** — Drop dozens or hundreds of images at once. Supports JPG, JPEG, PNG, WebP, GIF, and BMP input.
2. **Modern WebP output** — WebP produces files 25–35% smaller than JPEG at equivalent quality, with transparency support. JPEG and PNG output are also available.
3. **Parallel processing** — Up to 4 images processed simultaneously via the Canvas API, with a live progress bar and per-file status updates.
4. **Quality & resize control** — Quality slider (1–100) for lossy formats, optional max-dimension resize that preserves aspect ratio.
5. **ZIP or individual download** — Bundle everything as a single `.zip` (preserving folder structure if you dropped a folder), download files one-by-one, or use the per-file button.
6. **Savings dashboard** — Per-file savings percentages are color-coded (green >30%, amber 10–30%, gray <10%, red if the output is bigger than the input). A summary banner shows total savings.

---

## How to use

1. **Add images** — Click the dropzone to browse, or drag-and-drop multiple files (or an entire folder) onto it. JPG, PNG, WebP, GIF, and BMP are accepted.
2. **Choose settings** — On the right, pick an output format (WebP, JPEG, PNG), set a quality level, optional max dimension, and whether to convert filename extensions.
3. **Click "Optimize all"** — Files are processed in parallel (up to 4 at once). Each row updates live with new size and a color-coded savings badge.
4. **Download results** — Grab everything as a single `.zip`, download files individually (browser may prompt to allow multiple downloads), or use the per-file download button on each row.

---

## Running locally

Because the app loads JSZip and browser-image-compression from a CDN, you need an internet connection on first load (after that, the browser cache usually lets you work offline). Any of these work:

```bash
# Option 1: just open the file
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows

# Option 2: serve it (needed if your browser blocks file:// CDN requests)
python3 -m http.server 8000
# then visit http://localhost:8000/

# Option 3: any static file server (nginx, Caddy, serve, http-server, etc.)
npx http-server -p 8000
```

---

## Project structure

```
image-optimizer/
├── index.html     # Single self-contained file (all CSS + JS inline)
└── README.md      # This file
```

External CDN dependencies (loaded with `crossorigin="anonymous"`):

- **JSZip** 3.10.1 — <https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js>
- **browser-image-compression** 2.0.2 — <https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.min.js>

If either library fails to load (e.g., you are offline on first visit), a banner is shown at the top of the page and ZIP download is disabled. The core canvas-based compression still works for JPEG and PNG output.

---

## How it works

The app uses the **HTML Canvas API** as its compression engine:

1. **Read file** — `URL.createObjectURL(file)` creates a blob URL, which is loaded into an `Image` element. `naturalWidth` / `naturalHeight` give the original dimensions.
2. **Resize** — If a max dimension is set, the target width/height are computed by scaling the larger side down to `maxDim`, preserving aspect ratio.
3. **Draw** — The image is drawn onto a `<canvas>` of the (possibly resized) target dimensions. For JPEG output, the canvas is first filled white so transparent PNGs don't get a black background.
4. **Encode** — `canvas.toBlob(callback, mimeType, quality)` re-encodes the canvas as WebP, JPEG, or PNG. For PNG (lossless), the quality argument is omitted. For WebP/JPEG, quality is `sliderValue / 100`.
5. **Compute savings** — `savings = (1 - newSize / originalSize) × 100`. Files where the output is larger than the input get a red "bigger" badge.
6. **Parallelize** — A concurrency-limited worker pool (4 workers max) processes the queue using `Promise.all` of N runner functions, each pulling the next file off the queue.
7. **Thumbnail** — A 52×52 cover-fit thumbnail is generated via a second canvas and shown next to each file.
8. **ZIP** — JSZip bundles all processed blobs into a single `.zip`. Folder structure from dropped folders is preserved by reading `webkitRelativePath` (or a `WeakMap` side-channel for entries collected via `FileSystemEntry` traversal).
9. **WebP support check** — A 1×1 canvas is encoded as WebP via `toDataURL('image/webp')`; if the result does not start with `data:image/webp`, WebP encoding is unsupported and a banner is shown. WebP output then falls back to PNG so the user still gets a usable file.

---

## Browser support

| Browser | WebP encoding | JPEG encoding | PNG encoding | Folder drop |
|---|---|---|---|---|
| Chrome 17+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 96+ | ✅ | ✅ | ✅ | ✅ |
| Edge 79+ (Chromium) | ✅ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ | ✅ | ✅ |
| Safari 13 and earlier | ❌ (falls back to PNG) | ✅ | ✅ | ✅ |
| Opera 18+ | ✅ | ✅ | ✅ | ✅ |
| iOS Safari 14+ | ✅ | ✅ | ✅ | ⚠️ (no folder pick) |
| Android Chrome | ✅ | ✅ | ✅ | ⚠️ (no folder pick) |
| Internet Explorer | ❌ | ❌ (no `toBlob`) | ❌ | ❌ |

WebP *decoding* (displaying WebP images) is supported in all modern browsers. WebP *encoding* (creating WebP files via canvas) is the feature that requires a modern browser.

---

## Limitations

- **EXIF metadata is stripped.** Canvas-based processing removes EXIF metadata (camera model, GPS, timestamps, orientation) by design — this is a privacy feature, not a bug. The "Keep EXIF metadata" checkbox is reserved for a future worker-based pipeline that re-injects metadata. If you need to preserve EXIF, use a desktop tool like ImageMagick (`-strip` to remove) or `exiftool`.
- **GIF animation is not preserved.** Animated GIFs are flattened to a single still frame (the first frame) when converted. For animated output, keep the original `.gif` or use a dedicated GIF optimizer.
- **PNG output may be larger than the input.** Converting a lossy JPEG to PNG produces a larger lossless file. The app shows a red "bigger" badge so you can spot this; lower the quality slider or stick with the original format to avoid it.
- **No color profile preservation.** ICC color profiles are stripped by canvas. Output is in the browser's default sRGB colorspace.
- **Memory bound.** There is no artificial limit on file count or size, but very large images (over ~50 megapixels) or hundreds of files at once may slow down or fail on low-memory devices. The app processes at most 4 files in parallel to bound memory usage.
- **Multiple individual downloads may be blocked.** Browsers usually prompt or block when many downloads start at once. Use the ZIP option for a single clean download.

---

## Privacy

- **No uploads.** Images are decoded, resized, and re-encoded entirely in your browser using the Canvas API. They never touch any server. Verify it yourself: open DevTools → Network tab and watch that no image data is sent anywhere while you optimize.
- **No tracking.** No analytics, no fingerprints, no cookies. The only `localStorage` key is `imgopt-theme` (stores your light/dark preference).
- **No server.** The page is a single static HTML file hosted on GitHub Pages. The only network requests are for the CDN libraries (JSZip and browser-image-compression) on first load — and the browser caches them after that.

---

## Tech stack

- **Vanilla JavaScript** (no framework, no build step) — the entire app is one self-contained `index.html` file.
- **HTML Canvas API** — image decoding, resizing, and re-encoding via `canvas.toBlob(mime, quality)`.
- **JSZip** 3.10.1 — bundling processed images into a single `.zip` archive.
- **browser-image-compression** 2.0.2 — loaded as a CDN dependency for extensibility and as a fallback engine if direct canvas encoding fails.
- **FileSystemEntry API** (`webkitGetAsEntry`) — recursive folder traversal on drag-and-drop, with `webkitRelativePath` + `WeakMap` fallback for preserving folder structure in the ZIP.
- **CSS custom properties** — light/dark theming with `localStorage` persistence and an inline head script to prevent theme flash on load.

---

## License

MIT License — see [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) in the source repository.

## Credits

Built by **[Achmad Bayhaqy](https://bayhaqy.my.id/)**.

Powered by:
- [JSZip](https://stuk.github.io/jszip/) by Stuart Knightley (MIT)
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) by Donaldcwl (MIT)

Source code: <https://github.com/bayhaqy/apps/tree/main/image-optimizer>
