# Markdown to Carousel Generator

Turn Markdown bullet points into polished social media carousel slides — right in your browser. Pick a theme, choose an aspect ratio, export PNGs, and post. No design skills, no uploads, no sign-up.

**Live:** <https://bayhaqy.my.id/apps/carousel-generator/>

---

## Why this exists

Designing carousel slides in Canva or Figma is slow: you drag text boxes, fiddle with colors, export each slide one by one, and rename files. If you already have your ideas in Markdown (a meeting note, a tweet thread, a blog outline), you should not have to manually re-design them.

| | Manual (Canva/Figma) | This tool |
|---|---|---|
| Input | Drag-and-drop text boxes | Paste Markdown |
| Time per carousel | 20–60 minutes | 30 seconds |
| Theme consistency | Manual (copy-paste) | Built-in, one click |
| Export | One slide at a time | All at once, or ZIP |
| Cost | Free tier limited | 100% free, no account |
| Privacy | Uploaded to cloud | Never leaves your browser |
| Works offline | No | Yes (after first load) |
| Batch rename | Manual | Auto `slide-01-title.png` |

---

## Features

1. **Markdown-native parsing** — `#`/`##` headings start slides, `-` bullets, `1.` numbered lists, `>` blockquotes, `**bold**`, `*italic*`, and `---` slide breaks all work out of the box.
2. **Six designer themes** — Minimal Light, Bold Dark, Sunset, Ocean, Forest, and Cyberpunk. Each tuned for mobile-feed readability.
3. **Four aspect ratios** — 1:1 Instagram square, 4:5 portrait, 9:16 Story/Reels, 16:9 LinkedIn landscape. Switch with one click.
4. **Four web fonts** — Inter, Plus Jakarta Sans, Poppins, and Playfair Display (loaded from Google Fonts for the live preview).
5. **Full-resolution PNG export** — Every slide exports at 1080-base pixels (1080×1080, 1080×1350, 1080×1920, or 1920×1080). Download individually, all-at-once, or as a ZIP.
6. **Live preview + zoom** — Slides update as you type. Click any slide to open a fullscreen preview with arrow-key navigation.

---

## How to use

1. **Write or paste Markdown** in the left textarea. Use `#` or `##` for slide titles, `-` for bullets, `1.` for numbered lists, `>` for callouts, `---` for a forced slide break. Or click **Load sample** to see a 5-slide example.
2. **Pick a theme and ratio** from the settings panel. Choose one of six themes, set the aspect ratio for your target platform, and select a font.
3. **Preview live** — slides render instantly on the right. Click any slide to zoom in. Adjust the accent color, slide-number position, and author handle as needed.
4. **Export PNGs** — click **Download PNG** under a single slide, **Download all individually** for separate files, or **Download all as ZIP** for a single archive. Filenames follow `slide-01-your-title.png`.
5. **Post and engage** — upload the PNGs to LinkedIn, Instagram, or X as a carousel post. Add a caption, tag your audience, and publish.

---

## Running locally

This is a single HTML file with no build step. Pick any option:

```bash
# Option 1: just open the file
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows

# Option 2: serve locally (recommended — avoids file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000/

# Option 3: self-host
# Copy index.html to any static host (GitHub Pages, Netlify, Cloudflare Pages, nginx).
```

---

## Project structure

```
carousel-generator/
├── index.html     # Single self-contained file (all CSS + JS inline)
└── README.md      # This file
```

External CDN dependencies (loaded at runtime):
- [marked.js 12.0.0](https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js) — Markdown parser
- [JSZip 3.10.1](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js) — ZIP archive creation
- [Google Fonts](https://fonts.googleapis.com/) — Inter, Plus Jakarta Sans, Poppins, Playfair Display (preview only)

---

## How it works

### 1. Markdown parsing

The app splits raw Markdown into slide groups by scanning for three markers:
- `# Title` or `## Section` → starts a new slide with that title
- `---` (horizontal rule) → forces a slide break (new empty slide)
- Everything else → body content of the current slide

Each slide's body is then parsed by **marked.js** into HTML (lists, blockquotes, bold, italic, code). The parsed HTML is walked with a DOM serializer that applies **inline styles** to every element (foreignObject requires inline styles — no external CSS is accessible inside the SVG image context).

### 2. SVG `foreignObject` rendering

To turn an HTML slide into a raster PNG without external libraries, the app uses the modern **SVG `foreignObject` + canvas** technique:

1. Build the slide as a self-contained HTML string with all styles inline on every element (no external stylesheets, no `@font-face`).
2. Wrap it in an SVG with a `<foreignObject>`:
   ```xml
   <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
     <foreignObject width="100%" height="100%">
       <div xmlns="http://www.w3.org/1999/xhtml" style="...inline styles...">
         ...slide content...
       </div>
     </foreignObject>
   </svg>
   ```
3. Serialize the SVG to a **data URL** (`data:image/svg+xml;charset=utf-8,...`). Using a data URL instead of a blob URL is critical — blob URLs cause canvas tainting ("Tainted canvases may not be exported") when the SVG contains a `foreignObject`.
4. Load the data URL into an `Image()`.
5. Draw the image onto a `<canvas>` at full resolution.
6. Call `canvas.toBlob()` to produce a PNG `Blob`.
7. Trigger a download via a temporary `<a download>` link.

### 3. ZIP export

For bulk download, all slides are rasterized sequentially (via the same pipeline above), then each PNG `Blob` is added to a **JSZip** instance. The archive is compressed with DEFLATE level 6 and saved as `carousel-YYYYMMDD-HHMMSS.zip`.

### 4. Live preview

The same `generateSlideHTML()` function powers both the preview and the export, guaranteeing WYSIWYG. For the preview, the slide HTML is injected into the DOM and scaled down with `transform: scale()` to fit a 380px-wide card. For export, the same HTML (with `xmlns` attributes added for XML compliance) is placed inside the SVG `foreignObject`.

---

## Browser support

| Feature | Chrome 90+ | Firefox 88+ | Safari 14+ | Edge 90+ |
|---|---|---|---|---|
| Page loads & preview | ✅ | ✅ | ✅ | ✅ |
| SVG `foreignObject` | ✅ | ✅ | ✅ | ✅ |
| Canvas `toBlob` PNG export | ✅ | ✅ | ✅ | ✅ |
| ZIP download (JSZip) | ✅ | ✅ | ✅ | ✅ |
| Individual multi-download | ⚠️ may prompt | ✅ | ⚠️ may prompt | ⚠️ may prompt |
| Theme toggle + localStorage | ✅ | ✅ | ✅ | ✅ |

**Minimum requirement:** a browser that supports SVG `foreignObject` and canvas `toBlob`. Internet Explorer and browsers older than ~2020 are not supported.

---

## Limitations

- **No embedded web fonts in PNG export.** The SVG `foreignObject` image context cannot access fonts loaded by the parent document via `@font-face`/Google Fonts. The live preview uses the real Google Font; the exported PNG falls back to a similar system font (sans-serif or serif). Layout, colors, and structure are identical — only the exact font glyphs differ.
- **No tables, images, or complex Markdown.** This is a slide generator, not a full document renderer. Supported: headings, bullets, numbered lists, blockquotes, bold, italic, and inline `code`. Tables, images, and deeply nested structures are not rendered.
- **No auto-fit text scaling.** If a slide has too much content, it will overflow and be clipped (`overflow: hidden`). Keep each slide to ~5–7 bullets for best results.
- **No undo/history.** Your Markdown is in the textarea — use Ctrl+Z for text undo. Settings (theme, ratio, font) are not persisted across sessions except the dark/light theme toggle.
- **Multi-download limits.** Browsers may block or prompt when downloading many files at once. Use "Download all as ZIP" for reliable bulk export.
- **Large carousels.** 20+ slides work, but the ZIP export rasterizes slides sequentially and may take 10–20 seconds for 30+ slides.
- **No SVG/vector export.** Only PNG is supported. If you need editable slides, keep your Markdown source.

---

## Privacy

**100% client-side. Your Markdown never leaves your browser.**

- No uploads — all parsing, rendering, and PNG generation happen in your browser's JavaScript.
- No tracking — no analytics, no cookies, no fingerprinting.
- No server — there is no backend. The page is static HTML.
- The only `localStorage` key used is `carousel-theme` (stores your light/dark preference).

You can verify all of this by opening DevTools → Network tab and watching that no data is sent anywhere while you type and export.

---

## Tech stack

- **Vanilla JavaScript** (no framework, no build step) — all logic in a single IIFE.
- **marked.js 12.0.0** — Markdown → HTML parsing.
- **JSZip 3.10.1** — ZIP archive creation for bulk download.
- **SVG `foreignObject` + Canvas API** — HTML-to-PNG rasterization without external libraries.
- **CSS custom properties** — light/dark theming matching the BayMerge design system.
- **Google Fonts** — Inter, Plus Jakarta Sans, Poppins, Playfair Display (preview rendering).

---

## License

MIT License — free to use, modify, and distribute.

## Credits

Built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Powered by [marked.js](https://marked.js.org/) and [JSZip](https://stuk.github.io/jszip/). Design system matched to [BayMerge](https://bayhaqy.my.id/apps/baymerge/).

Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection — see also [AI Context Packer](https://bayhaqy.my.id/apps/ai-context-packer/), [Image Optimizer](https://bayhaqy.my.id/apps/image-optimizer/), and [Link-in-Bio Builder](https://bayhaqy.my.id/apps/link-in-bio/).
