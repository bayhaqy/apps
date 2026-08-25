# Local OCR Text Extractor

A 100% client-side tool that extracts text from images (receipts, book pages, notes, screenshots) using **Tesseract.js** running fully in your browser via WebAssembly. Supports Indonesian and English, multi-image batch processing, word-level confidence scores, and flexible export (plain text, bounding boxes, hOCR, .zip). No uploads, no API keys, no server — your images never leave your device.

**Live:** <https://bayhaqy.my.id/apps/ocr-extractor/>

---

## Why use this instead of an online OCR service?

| Concern | Online OCR service | Local OCR Extractor |
|---|---|---|
| **Privacy** | Images uploaded to a server, often stored or logged | 100% local — images never leave your browser |
| **Cost** | Free tiers usually capped (5–20 images/day); paid above that | Free forever, no limits |
| **Sign-up** | Almost always required | Never required |
| **Offline** | Requires internet | Works offline after first run (language data cached) |
| **Transparency** | Closed-source black box | Built on open-source Tesseract.js — fully auditable |
| **Customisation** | Limited or none | Confidence threshold, output modes, multi-language |
| **Bulk export** | One image at a time on free tiers | Batch queue with .zip download of all results |

---

## Features

1. **Indonesian & English** — Run Indonesian (`ind`), English (`eng`), or both together (`eng+ind`) for mixed-language documents like Indonesian receipts with English brand names. First use of each language downloads ~10–15 MB of trained data; subsequent runs use the browser-cached copy.
2. **Multi-image queue** — Drag-and-drop or browse to add many images at once. Each gets a thumbnail, live status (pending → processing → done/error), and a remove button. Click an image to jump to its result.
3. **Three output modes** — Plain text (reads naturally), bounding boxes (each word with pixel coordinates for overlay/indexing), or hOCR (open HTML-based OCR standard for ingestion by other tools).
4. **Word-level confidence** — Every word Tesseract returns has a confidence score (0–100). Set a threshold (default 60) and ambiguous words are highlighted in amber and underlined in the extracted text. A collapsible per-word confidence table shows every word with a color-coded bar.
5. **Flexible export** — Copy text per image, download a single `.txt`, copy all text concatenated (with filename headers), or download a `.zip` containing every result plus a combined `all-text.txt`.
6. **Smart preprocessing** — Large images (over 2000px) are automatically downscaled on the longest side before OCR, which improves speed and reduces memory usage without sacrificing accuracy on printed text.

---

## How to use

1. **Add images** — Drag-and-drop one or more images onto the dropzone, or click to browse. Supports JPG, PNG, WebP, BMP, and GIF. Receipts, scanned pages, notes, and screenshots all work well.
2. **Choose settings** — Pick languages (Indonesian, English, or both), select an output mode (plain text / bounding boxes / hOCR), and set a confidence threshold for low-confidence highlighting.
3. **Click "Extract text"** — OCR Extractor runs Tesseract.js on each image sequentially. The first run downloads language data (~10–15 MB per language); subsequent runs use the cached copy and are much faster. A per-image and overall progress bar tracks the work.
4. **Review & download** — Each image gets a result card with the extracted text (low-confidence words underlined in amber), a collapsible word-confidence table, and copy/download buttons. Use "Copy all text" or "Download all as .zip" for the full batch.

---

## Running locally

Because the app loads Tesseract.js and JSZip from a CDN (and Tesseract fetches its trained language data on first run), you need an internet connection on first use. After that, the browser cache usually lets you work offline. Any of these work:

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

For guaranteed offline use, save the page (Ctrl+S → "Webpage, Complete") and run it from disk — the cached language data will still be used.

---

## Project structure

```
ocr-extractor/
├── index.html     # Single self-contained file (all CSS + JS inline)
└── README.md      # This file
```

External CDN dependencies (loaded with `crossorigin="anonymous"`):

- **Tesseract.js** 5.0.4 — <https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js>
- **JSZip** 3.10.1 — <https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js>

Tesseract.js additionally fetches its **trained language data** (eng ~15 MB, ind ~10 MB) from `https://tessdata.projectnaptha.com/` on first use. These files are cached by the browser via HTTP cache, so subsequent runs — even offline — do not need to re-download them.

If the Tesseract.js library fails to load (e.g., you are offline on first visit), a toast is shown and the "Extract text" button is disabled.

---

## How it works

The app uses **Tesseract.js** — a WebAssembly port of the Tesseract OCR engine — as its recognition core:

1. **Read file** — `URL.createObjectURL(file)` creates a blob URL for each image, loaded into an `Image` element. `naturalWidth` / `naturalHeight` give the original dimensions, shown in the queue thumbnail.
2. **Downscale (if needed)** — If the longest side of the image exceeds 2000px, the image is drawn onto a `<canvas>` at a reduced size (preserving aspect ratio, using high-quality image smoothing). This reduces memory usage in the WASM engine and improves speed without hurting accuracy on printed text.
3. **Recognize** — `Tesseract.recognize(canvas, 'eng+ind', { logger })` runs the OCR engine. The `logger` callback fires with status updates (`loading language traineddata`, `initializing api`, `recognizing text`); the `recognizing text` progress (0–1) drives the per-image progress bar.
4. **Aggregate** — The result object exposes `data.text` (full text), `data.words` (array of `{ text, confidence, bbox }` with pixel coordinates), and `data.hocr` (structured HTML output). These are stored per image.
5. **Highlight low-confidence** — In plain-text mode, the text is split on whitespace and each token is matched to the next word with non-empty text; tokens whose confidence is below the threshold are wrapped in `<span class="low-conf">` (amber + dotted underline) with a tooltip showing the score.
6. **Confidence table** — Each result card has a collapsible table listing every word with its confidence and a color-coded bar (green ≥ 80%, red 60–80%, amber < threshold). Capped at 300 rows for performance.
7. **Export** — Plain text mode exports the raw `data.text`. Bounding-boxes mode exports one line per word with `text\tconf=N.N\tbbox=x0,y0,x1,y1`. hOCR mode exports the full `data.hocr` HTML. The "Copy all" / ".zip" options concatenate every processed image with `===== filename.txt =====` headers.
8. **ZIP** — JSZip bundles per-image `.txt` files (with collision-safe filenames) plus a combined `all-text.txt` into a single DEFLATE-compressed `.zip`.

---

## Browser support

| Browser | Tesseract.js (WASM) | Notes |
|---|---|---|
| Chrome 57+ | ✅ | Recommended — fastest WASM execution |
| Firefox 53+ | ✅ | Full support |
| Edge 79+ (Chromium) | ✅ | Full support |
| Safari 11+ | ✅ | Works; slightly slower than Chrome |
| Opera 44+ | ✅ | Full support |
| iOS Safari 11+ | ✅ | Works but memory-limited on older devices |
| Android Chrome | ✅ | Works; large images may fail on low-RAM phones |
| Internet Explorer | ❌ | Not supported (no WebAssembly) |

**WebAssembly is required.** For best performance on large images (scanned book pages, high-res photos), a device with at least **2 GB of free RAM** available to the browser is recommended. Very large images are auto-downscaled to 2000px before OCR to bound memory usage.

---

## Limitations

- **Handwriting is poorly recognised.** Tesseract is trained primarily on printed text. Cursive or messy handwriting will produce poor results. For handwritten notes, consider a specialised handwriting-OCR service or manually transcribe.
- **Low-contrast images produce errors.** Dim photos, washed-out scans, or text on noisy backgrounds increase recognition errors. Use well-lit, high-contrast images for best results. The confidence highlighting helps you spot which words to proofread.
- **First-run downloads ~15–30 MB.** On first use of each language, Tesseract downloads trained data (~15 MB for English, ~10 MB for Indonesian). This is cached by the browser afterwards — subsequent runs work offline. Plan accordingly on metered connections.
- **Skewed or rotated text.** Tesseract does some deskewing internally, but heavily rotated text (>10°) or perspective-distorted text (e.g., photos taken at an angle) will produce errors. Pre-straighten the image for best results.
- **Decorative typefaces.** Highly stylised fonts, all-caps display type, and very small text (<8px equivalent) are recognised poorly. Standard sans-serif and serif body text works best.
- **Memory bound.** There is no artificial limit on file count or size, but very large images or hundreds of files at once may exhaust browser memory. The app processes images sequentially (not in parallel) to bound memory usage, and auto-downscales images over 2000px.
- **Not a translation tool.** This extracts text in the language(s) you select — it does not translate. Use a separate translator on the extracted text if needed.

---

## Privacy

- **No uploads.** Images are decoded, preprocessed, and recognised entirely in your browser using Tesseract.js (WebAssembly). They never touch any server. Verify it yourself: open DevTools → Network tab and watch that no image data is sent anywhere while OCR runs.
- **No tracking.** No analytics, no fingerprints, no cookies. The only `localStorage` key is `ocrextractor-theme` (stores your light/dark preference).
- **No server.** The page is a single static HTML file hosted on GitHub Pages. The only network requests are:
  1. Tesseract.js library (CDN, on first page load — cached afterwards)
  2. JSZip library (CDN, on first page load — cached afterwards)
  3. Trained language data (fetched from `tessdata.projectnaptha.com` on first OCR run with each language — cached afterwards)

  After the first successful OCR run, the app works **100% offline**.

---

## Tech stack

- **Vanilla JavaScript** (no framework, no build step) — the entire app is one self-contained `index.html` file.
- **Tesseract.js** 5.0.4 — WebAssembly port of the Tesseract OCR engine, loaded from `cdn.jsdelivr.net`. Language data fetched on demand from `tessdata.projectnaptha.com` and cached by the browser.
- **JSZip** 3.10.1 — bundling extracted text files into a single `.zip` archive, loaded from `cdnjs.cloudflare.com`.
- **HTML Canvas API** — image preprocessing (auto-downscale to 2000px max) and thumbnail generation.
- **Clipboard API** (with `execCommand` fallback) — copy text to clipboard.
- **Blob + `URL.createObjectURL`** — single-file `.txt` downloads.
- **CSS custom properties** — light/dark theming with `localStorage` persistence and an inline head script to prevent theme flash on load.

---

## License

MIT License — see [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) in the source repository.

## Credits

Built by **[Achmad Bayhaqy](https://bayhaqy.my.id/)**.

Powered by:
- [Tesseract.js](https://tesseract.projectnaptha.com/) — WebAssembly OCR engine (Apache 2.0)
- [JSZip](https://stuk.github.io/jszip/) by Stuart Knightley (MIT)

Source code: <https://github.com/bayhaqy/apps/tree/main/ocr-extractor>
