# PDF Anonymizer & Redactor

> Scan PDFs for emails, phone numbers, NIK, NPWP, bank accounts and credit cards, then apply permanent black redaction boxes — 100% client-side, no uploads.

**Live:** <https://bayhaqy.my.id/apps/pdf-anonymizer/>

## Why

When you share a PDF — a contract, a payslip, an ID scan, a customer form — it often carries more personal data than you intend to expose: email addresses, phone numbers, Indonesian NIK, NPWP, bank account numbers, even credit card numbers. Most "free" online redaction tools upload your file to a server, which is the last thing you want for a sensitive document.

PDF Anonymizer runs entirely in your browser. Your PDF is read into memory on your own device, scanned for the most common Indonesian PII patterns, and redacted with opaque black rectangles. Nothing is ever uploaded. After the first load the app works offline, because both `pdf-lib` and `pdfjs-dist` are bundled locally.

## Features

1. **Smart auto-detect** — Regex-based scanners for **email**, **Indonesian phone** (`08xx`, `+62xx`, `02x` landlines), **NIK** (16-digit), **NPWP** (`XX.XXX.XXX.X-XXX.XXX`), **bank account** (10–15 digits near "rekening"/"account" keywords), **credit card** (13–19 digits verified with the Luhn algorithm), and **date of birth** (`DD/MM/YYYY` near "lahir"/"DOB").
2. **Manual redaction boxes** — Click-drag anywhere on the rendered page to drop a black box. Useful for signatures, photos, home addresses, or anything the auto-detect missed.
3. **Permanent black rectangles** — Exported PDFs have opaque black rectangles drawn over the redaction areas using `pdf-lib`'s `drawRectangle` with `rgb(0,0,0)`.
4. **Page-by-page control** — Prev / next / jump-to-page navigation, zoom in and out (50%–400%), per-page detection list, per-page clear button, and a global redaction list showing every box across the whole document.
5. **Truly private & offline** — Your PDF is processed entirely in your browser; it is never uploaded, never stored, never logged. After the first load you can disconnect from the internet and keep redacting.
6. **Detector toggles** — Turn individual detectors on or off (e.g. disable NIK if your document legitimately contains 16-digit reference numbers). Re-scan the current page or auto-redact all included detections with one click.

## How to use

1. **Load your PDF** — Drop a PDF on the dropzone, or click to browse. The file is read into memory on your device — nothing is uploaded. The first page renders in the center viewer.
2. **Review auto-detected items** — The auto-detect panel scans every page for emails, Indonesian phone numbers, NIK, NPWP, bank accounts, credit cards and dates of birth. Toggle detectors on or off, and uncheck any item you want to keep visible.
3. **Add manual redactions** — Click-drag on the page to draw a black box over anything the auto-detect missed — signatures, photos, addresses, anything. Each rectangle is listed in the right panel and can be deleted individually.
4. **Apply & export** — Click "Apply redaction & export". `pdf-lib` draws filled black rectangles over every redaction area on every page and produces a new PDF — `redacted-YYYYMMDD-HHMMSS.pdf` — ready to download.
5. **Flatten for max security** — For highest security, open the exported PDF and use your browser's *"Print to PDF"* option. This flattens the layers so the underlying text cannot be recovered via OCR or copy/paste. Recommended for sensitive documents like ID cards, payslips or medical records.

## Running locally

The app is a single static HTML file with three local library files. No build step, no server required.

**Option A — Open the file directly:**

```bash
# Just open index.html in your browser
xdg-open index.html      # Linux
open index.html          # macOS
start index.html         # Windows
```

**Option B — Serve with Python:**

```bash
cd pdf-anonymizer
python3 -m http.server 8000
# Visit http://localhost:8000/
```

**Option C — Self-host on any static host** (GitHub Pages, Netlify, Cloudflare Pages, nginx, Apache, Caddy, …):

Upload the whole `pdf-anonymizer/` directory preserving the `lib/` subfolder.

## Project structure

```
pdf-anonymizer/
├── index.html              # Single self-contained app (all CSS + JS inline)
├── README.md               # This file
└── lib/
    ├── pdf-lib.min.js      # pdf-lib (PDF read/write, drawRectangle for redaction)
    ├── pdfjs.min.js        # pdf.js viewer (PDF parse + page render)
    └── pdfjs-worker.min.js # pdf.js worker (off-main-thread parsing)
```

## How it works

### Rendering pipeline

1. **Load** — The user drops a PDF. `File.arrayBuffer()` reads the file into memory. `pdfjsLib.getDocument({ data: uint8Array })` parses it (off-main-thread via the worker). The original `ArrayBuffer` is kept separately for export.
2. **Render** — `pdf.getPage(n).getViewport({ scale })` computes the canvas dimensions. `page.render({ canvasContext, viewport })` rasterises the page to a `<canvas>` at the chosen scale (default 1.5×).
3. **Overlay** — A `<div class="pdf-overlay">` sits absolutely on top of the canvas with `pointer-events: auto` and `cursor: crosshair`. Existing redaction boxes are rendered as black `<div class="redact-box">` children, positioned by converting PDF coordinates → canvas pixels.
4. **Draw** — `mousedown` / `mousemove` / `mouseup` (and touch equivalents) on the overlay track a click-drag rectangle. On `mouseup`, canvas-pixel coordinates are converted to PDF units: `x_pdf = x_canvas / scale`, `y_pdf = pageHeight − (y_top_canvas / scale) − h_pdf` (because `pdf-lib`'s y-axis is bottom-up while the canvas y-axis is top-down).

### Auto-detect pipeline

1. **Text extraction** — `page.getTextContent()` returns text items with their `transform` matrix `[a,b,c,d,e,f]` and `width`/`height`. Each item's bounding box in PDF units is computed as `[e, f, e + width, f + |height|]`.
2. **Concatenation** — Items are concatenated into a single string with per-item character offsets tracked, so a regex match can be mapped back to the underlying text items.
3. **Detection** — Each enabled detector's regex runs against the concatenated text. For each match, the overlapping text items are found and their bboxes merged (with a 1.5-unit padding so the black box fully covers the text).
4. **Context** — Bank-account matches require the keyword `rekening`/`account`/`norek` to appear in a text item on the **same line** (vertical bbox overlap, horizontal within 350 PDF units). DOB matches require `lahir`/`DOB`/`born` within 40 characters in the concatenated text.
5. **Luhn** — Credit-card candidates (13–19 digit runs) are filtered through the Luhn algorithm. 16-digit Luhn-valid runs are classified as credit cards, not NIKs. A consumed-range set prevents the same text being claimed by multiple detectors.

### Export pipeline

1. `PDFDocument.load(originalBytes, { ignoreEncryption: true })` re-loads the original PDF.
2. For each page that has redactions, `page.drawRectangle({ x, y, width, height, color: rgb(0,0,0) })` draws a filled black rectangle. Because redaction coordinates are stored in PDF units (bottom-up y), no conversion is needed at export time.
3. `pdfDoc.save()` serialises the modified PDF. A `Blob` is created and offered as a download with the filename `redacted-YYYYMMDD-HHMMSS.pdf`.

### Coordinate systems

| System            | Origin        | y-axis     | Used by                         |
|-------------------|---------------|------------|---------------------------------|
| Canvas pixels     | top-left      | downward   | Mouse events, overlay rendering |
| PDF units (points)| bottom-left   | upward     | pdf-lib `drawRectangle`, stored redactions |

Conversions (scale = render scale, typically 1.5):

```
canvas_x = pdf_x * scale
canvas_y_top = (pageHeight − pdf_y_top) * scale
pdf_x = canvas_x / scale
pdf_y = pageHeight − (canvas_y_top / scale) − pdf_h
```

## Browser support

| Feature                | Chrome 90+ | Firefox 88+ | Safari 14+ | Edge 90+ |
|------------------------|:----------:|:-----------:|:----------:|:--------:|
| PDF rendering          |     ✓      |      ✓      |     ✓      |    ✓     |
| Auto-detect            |     ✓      |      ✓      |     ✓      |    ✓     |
| Manual click-drag      |     ✓      |      ✓      |     ✓      |    ✓     |
| Touch drawing (mobile) |     ✓      |      ✓      |     ✓      |    ✓     |
| Export & download      |     ✓      |      ✓      |     ✓      |    ✓     |
| Lookbehind regex       |     ✓      |      ✓      |     ✓      |    ✓     |

Internet Explorer is **not** supported (uses ES2018+ lookbehind, ES2020+ optional chaining, etc.).

## Limitations

- **Draw-over, not burn-in.** The exported PDF has opaque black rectangles *on top of* the redacted text. Visually the content is fully covered, but the underlying text is still present in the PDF data stream and may be extractable via OCR or copy/paste in some viewers. **For maximum security, after exporting, open the file and use your browser's "Print to PDF" option to flatten the layers** — this burns the black boxes permanently into the page and makes the underlying text unrecoverable.
- **No OCR.** Auto-detect relies on the PDF's text layer. It will not find sensitive data in pure-image scanned PDFs. Use the manual click-drag redaction for those.
- **No name / address detection.** Auto-detect covers structured patterns (emails, phone, NIK, NPWP, bank, card, DOB) but not free-form names or home addresses. Use manual redaction for those.
- **Detector overlap.** A 16-digit number that happens to pass the Luhn check (rare for real NIKs) will be classified as a credit card, not a NIK. Toggle the credit-card detector off if you need to redact all 16-digit numbers as NIKs.
- **No persistence.** Redactions live in memory only. Refresh the page and they're gone. Export before you reload.
- **Memory-bound.** Both pdfjs (rendering) and pdf-lib (export) keep the document in RAM. PDFs up to a few hundred MB and a few thousand pages work fine on most devices; very large files may slow down on low-memory devices.
- **Encrypted PDFs.** If a PDF requires a password to open, the app cannot read it. Remove the password first (e.g. "Print to PDF" without the password) and load the unprotected copy. Owner-password-restricted PDFs (no open password) usually work.

## Privacy

- **No uploads.** Your PDF is read into browser memory with `File.arrayBuffer()` and processed locally with JavaScript. It is never sent to any server. Verify it yourself in your browser's DevTools → Network tab.
- **No tracking.** No analytics, no fingerprinting, no cookies. The only `localStorage` key is `pdfanon-theme` (stores your light/dark theme preference).
- **No service worker.** The page is fully functional offline after first load because both `pdf-lib` and `pdfjs-dist` are bundled in `lib/`. You can also save the page locally (`Ctrl+S` → "Webpage, Complete") and run it from disk.
- **No external requests at runtime.** The only network requests are the initial HTML + the three local library files. No CDN, no fonts, no telemetry.

## Tech stack

- **[pdf-lib](https://pdf-lib.js.org/)** — Read/modify/save PDF documents in the browser. Used to re-load the original PDF and draw filled black rectangles over the redaction areas.
- **[pdf.js](https://mozilla.github.io/pdf.js/)** (pdfjs-dist 3.11.174) — Mozilla's PDF renderer. Used to parse the PDF, extract text items with their bounding boxes (for auto-detect), and rasterise each page to a `<canvas>` for display and manual redaction.
- **Vanilla JavaScript** — No framework, no bundler. All app logic is inline in `index.html`.
- **CSS custom properties** — Light/dark theme via `--bg`, `--fg`, `--accent` variables. Theme toggle persists to `localStorage["pdfanon-theme"]`.
- **Canvas overlay** — A `<div>` positioned absolutely over the render `<canvas>` captures mouse/touch events for click-drag redaction and displays committed redaction boxes as black `<div>`s.

## License

MIT License — see source header. Free for personal and commercial use.

## Credits

Built by **[Achmad Bayhaqy](https://bayhaqy.my.id/)**.

Powered by:
- [pdf-lib](https://github.com/Hopding/pdf-lib) — Hopding
- [pdf.js](https://github.com/mozilla/pdf.js) — Mozilla Foundation

See also: [BayMerge](https://bayhaqy.my.id/apps/baymerge/) (offline PDF merger) and other apps at <https://bayhaqy.my.id/apps/>.
