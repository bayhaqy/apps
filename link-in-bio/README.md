# Link-in-Bio Builder

Link-in-Bio Builder is a free, private, 100% client-side visual builder for personal link-in-bio pages. You customize your profile, links, and theme in a live editor, then download a single self-contained HTML file you can host anywhere — GitHub Pages, Netlify, Vercel, or your own server. A Linktree alternative that runs entirely in your browser.

**Live:** <https://bayhaqy.my.id/apps/link-in-bio/>

---

## Why use it (vs. Linktree)

Linktree is convenient, but you rent a URL, you accept their tracking, and you live inside their feature limits. Link-in-Bio Builder gives you a file you own.

| Linktree | Link-in-Bio Builder |
| --- | --- |
| Hosted on `linktr.ee/yourname` — you rent the URL | You host the HTML file on your own domain |
| Free tier limited to ~7 theme options and basic buttons | 6 themes + full control of colors, background, button shape, animation, font |
| Tracks every click and visitor by default | Zero analytics, zero cookies, zero third-party scripts in the export |
| Need an account and a login | No account, no sign-up, no email |
| Monthly subscription for custom themes / removal of Linktree branding | One-time export, no recurring cost, attribution toggle is a single checkbox |
| Your page disappears if Linktree changes their terms or bans you | Your HTML file keeps working forever — it is just a static file |
| Cannot edit the raw HTML | Export is clean, readable, fully editable HTML |

## Features

- **Visual editor with live preview** — two-column layout: edit on the left, see a phone mockup (375×667) update in real time on the right. Switch to a desktop preview with one click.
- **Six built-in themes** — Minimal Mono, Sunset Gradient, Dark Neon, Ocean Breeze, Forest, and Cyberpunk. Tap a swatch to load a full preset, then tweak anything.
- **Full customization** — solid color, gradient (2 stops + angle), or uploaded image background; text color; pill / square / underline button styles; none / scale / lift / glow hover animations; Inter / System / Poppins / Playfair Display fonts.
- **Up to 20 links** — each with a label, URL, emoji icon, and active toggle. Reorder by drag-and-drop or up/down arrows. Inactive links stay in your list but are hidden from the export.
- **Avatar & background image upload** — images are read with the File API and embedded into the exported HTML as base64 data URLs. No external image hosting needed.
- **Social icons row** — optional row of Instagram, Twitter/X, LinkedIn, GitHub, and YouTube icon links at the bottom of your page.
- **Self-contained HTML export** — one `.html` file with all CSS and JS inline, all images embedded, only Google Fonts loaded from CDN. Download, copy to clipboard, or open in a new tab.
- **100% client-side** — the builder runs entirely in your browser. No uploads, no tracking, no server, no sign-up. Your content never leaves your device until you hit export.

## How to use

1. **Customize your profile.** Upload an avatar (optional), type your display name (required), write a short bio (max 200 characters), and add your pronouns. The preview updates live as you type.
2. **Add your links.** Click **Add link** to build your list. Give each link a label, a URL (must start with `http://`, `https://`, `mailto:`, or `tel:`), and pick an emoji icon. Drag the `⠿` handle to reorder, toggle links on/off, delete the ones you don't need. Up to 20 links.
3. **Pick a theme and customize.** Tap one of the 6 theme swatches to load a preset. Then tweak the background (solid / gradient / image), button style (pill / square / underline), hover animation (none / scale / lift / glow), and font family.
4. **Download the HTML.** Click **Download HTML** to save `link-in-bio-{timestamp}.html`. All CSS, JS, and images are inlined. You can also **Copy HTML** to the clipboard or **Open in new tab** to preview the standalone file.
5. **Deploy to GitHub Pages.** Create a new public repository (e.g. `link-in-bio`). Upload your exported HTML file and rename it to `index.html`. Commit. Then go to **Settings → Pages → Source → Deploy from a branch**, select the `main` branch and `/ (root)` folder, and save. In about a minute your bio page is live at `https://<your-username>.github.io/link-in-bio/`. You can also use a custom domain by adding a `CNAME` file.

## Running locally

Link-in-Bio Builder is a single self-contained HTML file with all CSS and JavaScript inline. There are no build steps and no dependencies.

**Option 1 — just open the file**

Double-click `index.html`. It runs via the `file://` protocol and works fully offline. The Clipboard API prefers a secure context, so if "Copy HTML" fails over `file://`, use option 2 or 3, or just use "Download HTML" / "Open in new tab".

**Option 2 — Python HTTP server**

```bash
cd link-in-bio
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — self-host**

Drop the `index.html` file onto any static host: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own nginx/Apache server. No server-side code required.

## Project structure

```
link-in-bio/
├── index.html     # single self-contained builder app (HTML + CSS + JS inline)
└── README.md      # this file
```

That's it. One file does everything. The exported bio pages are also single self-contained HTML files.

## How it works

### Live preview

The right pane contains a phone mockup (rounded rectangle frame with a notch) wrapping an `<iframe>` sized to 375×667 pixels — a standard mobile viewport. Every time you change any field in the editor, the builder regenerates the complete bio page HTML and assigns it to the iframe's `srcdoc` property (debounced to ~80 ms to avoid lag). The same generator function is used for both the preview and the export, so what you see in the preview is exactly what you get in the downloaded file.

The "Desktop preview" checkbox swaps the phone frame for a wider 760×600 iframe with square corners, so you can see how your page looks on a larger screen. The exported page itself is fully responsive — it adapts to any screen size via a `max-width: 560px` wrapper and mobile media queries.

### HTML template generation

The `generateBioHTML(forExport)` function builds a complete HTML document from the current state:

1. **Head** — charset, viewport, title, meta description, Open Graph + Twitter card tags, an inline SVG favicon (a red square with the first letter of your name), and a Google Fonts `@import` (only if a hosted font is selected).
2. **Styles** — all CSS is generated inline from the current state: a font stack, a background rule (solid / `linear-gradient(angle, c1, c2)` / `url("data:...")`), button colors derived from the text color with `rgba()` translucency, button border-radius based on style, and a hover rule for the chosen animation.
3. **Body** — avatar (uploaded image or a placeholder showing your initial), name, pronouns, bio, then the list of active links as `<a>` tags with `target="_blank" rel="noopener noreferrer"`, then the optional socials row, then the optional attribution footer.

When `forExport` is true, the function wraps everything in `<!DOCTYPE html>` / `<html>` / `<head>` / `<body>` so the output is a valid standalone document. When false (for preview), only the `<style>` and body markup is emitted, which the iframe renders via `srcdoc`.

### Image embedding

Avatar and background images are read with `FileReader.readAsDataURL()` and stored in state as base64 data URLs. When the HTML is generated, these data URLs are written directly into `src="..."` attributes and `background:url(...)` rules. The exported file therefore has no external image dependencies — it will render correctly even when opened from a local disk with no internet connection (fonts aside).

### Export mechanics

- **Download HTML** — wraps the generated string in a `Blob` with `type: text/html`, creates an object URL, attaches it to a temporary `<a download="link-in-bio-{timestamp}.html">`, and clicks it. The filename uses a `YYYYMMDD-HHMMSS` timestamp.
- **Copy HTML** — uses `navigator.clipboard.writeText()` when available, with a `document.execCommand('copy')` fallback for older browsers and `file://` contexts.
- **Open in new tab** — creates a Blob URL and calls `window.open(url, '_blank')`. The URL is revoked after 30 seconds so the tab keeps working but memory is freed.

### Validation

Before any export, the builder runs `validate()`:

- Display name must be non-empty (shows an inline error under the name field).
- At least one active link must exist (shows an inline error above the links list).
- Every active link's URL must start with `http://`, `https://`, `mailto:`, or `tel:` (invalid URLs are listed in the toast).

If any check fails, the first error is shown as a toast and the export is aborted. Inline error messages appear next to the relevant fields.

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| Builder UI | ✅ 90+ | ✅ 90+ | ✅ 88+ | ✅ 14+ |
| File API (image upload) | ✅ | ✅ | ✅ | ✅ |
| Clipboard API (copy HTML) | ✅ | ✅ | ✅ | ✅ (HTTPS only) |
| `iframe srcdoc` live preview | ✅ | ✅ | ✅ | ✅ |
| Drag-and-drop reorder | ✅ | ✅ | ✅ | ✅ |
| Blob downloads | ✅ | ✅ | ✅ | ✅ |
| **Exported bio page** | ✅ all versions | ✅ all versions | ✅ all versions | ✅ all versions |

The builder requires a modern browser (released in the last few years). Internet Explorer is not supported. The **exported** bio page, however, is plain HTML + CSS with a tiny progressive-enhancement script, so it works on essentially every browser including older mobile browsers.

## Limitations

- **No analytics in the exported page.** By design — your visitors' privacy is respected. If you want analytics, paste your own snippet (Plausible, Umami, GA) into the exported HTML by hand.
- **No dynamic content.** The exported page is a static HTML file. It cannot read a database, fetch new links at runtime, or show live data. To add or remove a link, re-open the builder (or edit the HTML by hand) and re-export.
- **Avatar and background image size.** Avatars are capped at 4 MB and background images at 6 MB to keep the exported HTML file size reasonable. Base64 encoding inflates the file by ~33%, so a 4 MB avatar adds ~5.3 MB to the export.
- **Google Fonts dependency.** Inter, Poppins, and Playfair Display are loaded from the Google Fonts CDN. If the CDN is unreachable, the page falls back to the system font stack. The "System" font option has no external dependency.
- **No persistence in the builder.** Your work is not auto-saved — refresh the page and you start over. This is intentional (privacy: nothing about your content is stored). Download the HTML to save your progress, or keep the tab open.
- **20 link limit.** Beyond 20 links a link-in-bio page becomes unusable on mobile. Toggle links off instead of deleting them to keep a library.
- **No undo / redo.** Use the up/down arrows and delete buttons to manage your list.

## Privacy

Link-in-Bio Builder is private by design:

- **No uploads.** Your avatar, background image, and link list are all processed in your browser. They never leave your device until you choose to export. Verify this in DevTools → Network tab.
- **No tracking.** No analytics, no fingerprinting, no third-party scripts in the builder UI.
- **No cookies.** The only `localStorage` key used is `linkbio-theme` to remember your light/dark preference for the builder UI (not the exported page).
- **No server.** This is a static page. There is no backend to log anything.

The exported bio page is equally private: zero analytics, zero cookies, zero third-party scripts (except the Google Fonts CDN if you pick Inter / Poppins / Playfair).

## Tech stack

- **Vanilla JavaScript** (ES5-compatible IIFE) — no framework, no bundler, no transpilation.
- **File API** (`FileReader.readAsDataURL`) — for embedding avatar and background images.
- **Clipboard API** (`navigator.clipboard.writeText`) — for copying the HTML, with `execCommand` fallback.
- **Blob + URL.createObjectURL** — for downloads and "open in new tab".
- **`iframe srcdoc`** — for the live preview sandbox.
- **HTML5 Drag and Drop API** — for reordering links.
- **CSS custom properties** — for the builder's light/dark theming.
- **Google Fonts CDN** — Inter, Poppins, and Playfair Display (loaded only when selected).

No npm dependencies. No build step. No CDN for the builder itself. The entire builder app is one HTML file.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy).

Inspired by the desire to own your link-in-bio page instead of renting it. Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection alongside [BayMerge](https://bayhaqy.my.id/apps/baymerge/) (offline PDF merger) and [AI Context Packer](https://bayhaqy.my.id/apps/ai-context-packer/) (project-to-markdown packer).
