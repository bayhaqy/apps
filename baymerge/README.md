# BayMerge — Offline PDF Merger

A privacy-first, fully client-side PDF merger. Combine multiple PDF files into a single document **directly in your browser** — no uploads, no servers, no tracking, no internet connection required after the first load.

🔗 **Live app:** <https://bayhaqy.my.id/apps/baymerge/>

---

## Why BayMerge?

Most "free" online PDF mergers upload your files to a server, process them remotely, and then delete them — hopefully. BayMerge takes a different approach: the entire merge happens in your browser using JavaScript and the open-source [pdf-lib](https://pdf-lib.js.org/) library. Your files never leave your device.

| | BayMerge | Typical online merger |
|---|---|---|
| File upload | ❌ Never | ✅ Yes |
| Works offline | ✅ Yes (after first load) | ❌ No |
| Sign-up | ❌ Not needed | ✅ Often required |
| File limits | ❌ Only your device's RAM | ✅ Artificial caps |
| Watermark | ❌ None | ✅ Often added |
| Tracking | ❌ None | ✅ Analytics, ads |

---

## Features

- **100% private** — files are processed locally, never uploaded
- **Works offline** — `pdf-lib` is bundled locally, no CDN dependency
- **Drag-and-drop** — drop files anywhere on the dropzone, reorder by dragging
- **Reorderable list** — drag handle, or up/down arrow buttons
- **Live page counter** — each file's page count is shown as it loads
- **Progress bar** — real-time merge progress
- **No watermarks** — clean output, no branding added
- **Cross-platform** — Chrome, Firefox, Safari, Edge, modern mobile browsers
- **Light/dark theme** — toggle in the header, persisted to `localStorage`
- **Tiny footprint** — single HTML file + one bundled JS library (~525 KB)

---

## How to use

1. **Add PDF files** — click the dropzone to browse, or drag-and-drop multiple PDFs at once. You can keep adding more files later.
2. **Reorder pages** — drag a file by its handle (⠿) to reorder, or use the up/down arrows. The numbers on the left show the final merge order.
3. **Click "Merge PDFs"** — BayMerge combines every file in the chosen order using `pdf-lib`. A progress bar shows real-time status.
4. **Download the result** — once the merge completes, click "Download merged PDF" to save the combined file. The filename includes a timestamp, e.g. `merged-20260809-1530.pdf`.

> 💡 **Tip:** To verify BayMerge is truly offline, open your browser's DevTools → Network tab and watch the traffic while you merge. You will see no PDF data leaving your device.

---

## Running locally

BayMerge has zero build step. You can run it in three ways:

### Option A — Open the file directly

```bash
git clone https://github.com/bayhaqy/apps.git
cd apps/baymerge
# Just open index.html in any modern browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Option B — Serve it locally (recommended)

```bash
cd apps/baymerge
python3 -m http.server 8080
# Then visit http://localhost:8080/
```

### Option C — Self-host

Copy the entire `baymerge/` folder to any static web host (GitHub Pages, Netlify, Cloudflare Pages, nginx, Apache, S3, etc.). No server-side code is required.

---

## Project structure

```
baymerge/
├── index.html          # The entire app (HTML + CSS + JS in one file)
├── lib/
│   └── pdf-lib.min.js  # Bundled pdf-lib library (v1.17.1) — no CDN
└── README.md           # This file
```

---

## How it works (technical)

1. The user selects or drops PDF files into the dropzone.
2. Each file is read with `File.arrayBuffer()` and parsed with `PDFDocument.load()` from `pdf-lib`.
3. Page counts are extracted and displayed live as each file is parsed.
4. On "Merge PDFs" click, a new `PDFDocument` is created and `copyPages()` is called for each source PDF in order, then `addPage()` is called for each copied page.
5. The merged document is serialized with `outPdf.save()` to a `Uint8Array`, wrapped in a `Blob` of type `application/pdf`, and an object URL is created with `URL.createObjectURL()`.
6. The user clicks the download button, which creates an `<a download>` element pointing at the object URL and triggers a click.

No network requests are made at any point during the merge. The bundled `pdf-lib.min.js` is loaded once from the same origin as the page.

---

## Browser support

| Browser | Minimum version |
|---|---|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari (desktop & iOS) | 14+ |
| Samsung Internet | 14+ |

Internet Explorer is **not** supported.

---

## Limitations

- **Password-protected PDFs cannot be merged.** `pdf-lib` does not decrypt them. Remove the password first (e.g. open in Adobe Acrobat → File → Print → "Save as PDF") and merge the unprotected copy.
- **No page-level reordering within a single PDF.** BayMerge merges whole files in the order you specify. For page-level manipulation, use a tool like PDFtk.
- **Memory-bounded.** The only limit is your device's available RAM. Merging dozens of files totalling a few hundred MB works on most laptops/desktops; mobile devices may struggle with very large inputs.
- **No PDF form flattening.** Interactive form fields are preserved as-is in the merged output.

---

## Privacy

BayMerge does **not**:

- Upload your files anywhere
- Send any telemetry, analytics, or tracking pixels
- Set any cookies (only `localStorage` for theme preference)
- Make any third-party network requests

You can verify all of the above by inspecting the source code in this repo or by watching the Network tab in your browser's DevTools while using the app.

---

## Tech stack

- **[pdf-lib](https://github.com/Hopding/pdf-lib)** v1.17.1 — pure-JS PDF creation and manipulation (bundled locally, MIT license)
- **Vanilla HTML/CSS/JS** — no framework, no build step, no dependencies
- **CSS custom properties** for theming
- **Drag-and-drop API** for file reordering

---

## License

The source code in this repository is released under the **MIT License**. The bundled `pdf-lib.min.js` retains its own MIT license (see the file header).

---

## Credits

Built by **Achmad Bayhaqy** — <https://bayhaqy.my.id/>

PDF manipulation powered by the excellent [pdf-lib](https://pdf-lib.js.org/) project by Andrew Dillon.
