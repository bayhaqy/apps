# Apps by Achmad Bayhaqy

> A growing collection of focused, privacy-first web tools. No tracking, no uploads, no nonsense — just useful tools that run entirely in your browser.

**Live site:** <https://bayhaqy.my.id/apps/>

---

## Why this exists

Most online "tools" are bloated with ads, require sign-up, upload your files to unknown servers, or break the moment you lose internet. This project is the opposite:

- **100% client-side** — every byte of your input stays on your device. No server, no upload, no log.
- **Works offline** — installable as a PWA. After first load, every tool works without internet.
- **No accounts, no cookies, no analytics** — your browser is the only runtime.
- **Open source** — every line is in this repo. Audit it, fork it, self-host it.

## Tools (21 and counting)

### File utilities

| | Tool | What it does |
|---|---|---|
| 1 | [BayMerge](https://bayhaqy.my.id/apps/baymerge/) | Merge multiple PDFs into one — locally, no upload. |
| 2 | [PDF Anonymizer](https://bayhaqy.my.id/apps/pdf-anonymizer/) | Auto-detect & redact emails, NIK, phone, NPWP, credit cards in PDFs. |
| 3 | [CSV Formatter](https://bayhaqy.my.id/apps/csv-formatter/) | Clean messy spreadsheets — trim, dedupe, normalize, export to CSV/JSON/XLSX. |

### AI workflow & data

| | Tool | What it does |
|---|---|---|
| 4 | [AI Context Packer](https://bayhaqy.my.id/apps/ai-context-packer/) | Combine project files into one Markdown file ready to paste into ChatGPT/Claude. |
| 5 | [Anti-AI Text Humanizer](https://bayhaqy.my.id/apps/text-humanizer/) | Detect AI cliché phrases (ID + EN) and replace with natural alternatives. |
| 6 | [AI Prompt Formatter](https://bayhaqy.my.id/apps/prompt-formatter/) | Build mega-prompts using CARE, PREP, RACE, STAR, CRISPE frameworks. |
| 7 | [Local OCR Extractor](https://bayhaqy.my.id/apps/ocr-extractor/) | Extract text from images with Tesseract.js — fully offline. |

### Image & media

| | Tool | What it does |
|---|---|---|
| 8 | [Bulk Image Optimizer](https://bayhaqy.my.id/apps/image-optimizer/) | Compress & convert JPG/PNG to WebP in parallel. ZIP download. No file limits. |
| 9 | [Carousel Generator](https://bayhaqy.my.id/apps/carousel-generator/) | Turn Markdown bullets into polished social media carousel slides. |
| 10 | [Waveform Maker](https://bayhaqy.my.id/apps/waveform-maker/) | Create animated waveform videos from audio for TikTok, Reels, Shorts. |

### Personal branding

| | Tool | What it does |
|---|---|---|
| 11 | [Link-in-Bio Builder](https://bayhaqy.my.id/apps/link-in-bio/) | Build a custom Linktree alternative, export as single HTML file. |

### Developer tools

| | Tool | What it does |
|---|---|---|
| 12 | [Code Formatter](https://bayhaqy.my.id/apps/code-formatter/) | Beautify SQL, Python, HTML, CSS, JS. Tab/spaces, case conversion, instant copy. |
| 13 | [Text Diff Checker](https://bayhaqy.my.id/apps/text-diff/) | Split-screen diff with word/line highlighting + text cleanup utility. |
| 14 | [CSS Playground](https://bayhaqy.my.id/apps/css-playground/) | Visual Grid & Flexbox editor — drag, align, copy generated CSS. |

### Time & productivity

| | Tool | What it does |
|---|---|---|
| 15 | [Timezone Slider](https://bayhaqy.my.id/apps/timezone-slider/) | Drag one slider, see time across world cities simultaneously. |
| 16 | [Date & Age Calculator](https://bayhaqy.my.id/apps/date-calculator/) | Date diff, add/subtract days, workday exclusion, age in y/m/d. |
| 17 | [Pomodoro Studio](https://bayhaqy.my.id/apps/pomodoro/) | Focus timer + mixable ambient sounds (rain, cafe, waves, white noise). |

### Math & finance

| | Tool | What it does |
|---|---|---|
| 18 | [Loan Calculator](https://bayhaqy.my.id/apps/loan-calculator/) | KPR, vehicle loan, flat vs effective interest, amortization table. |
| 19 | [Unit & Currency Converter](https://bayhaqy.my.id/apps/converter/) | Length, weight, temp, shoe size + offline-cached currency rates. |

### Security & utilities

| | Tool | What it does |
|---|---|---|
| 20 | [Password Vault](https://bayhaqy.my.id/apps/password-vault/) | AES-256 encrypted local password manager + strong generator. |
| 21 | [QR Code Studio](https://bayhaqy.my.id/apps/qr-studio/) | Generate QR for text/URL/Wi-Fi with custom colors + camera scanner. |

## Using the tools as an API

Every tool's core logic is also exposed as a standalone JavaScript module under [`/apps/api/`](./api/). Import the function, call it with input, get the output — no credentials, no token, no server round-trip.

```javascript
// Example: format SQL from any webpage
import { formatSql } from 'https://bayhaqy.my.id/apps/api/code-formatter.js';

const formatted = formatSql('select * from users where id=1', {
  language: 'sql',
  indent: '  ',
  keywordCase: 'upper'
});
console.log(formatted);
// → "SELECT\n    *\nFROM\n    users\nWHERE\n    id = 1"
```

See the [API documentation](./api/README.md) for the full list of endpoints, parameters, and usage examples.

### Rate limiting

The API runs entirely in your browser (it's just JavaScript), so there's no server-side rate limit. For shared deployments (e.g., wrapping the modules in a Cloudflare Worker), a token-bucket limiter template is provided in [`api/worker-template.js`](./api/worker-template.js).

## Install as a mobile app (PWA)

This site is a Progressive Web App — you can install it on your phone and it works offline.

**Android (Chrome / Edge):**
1. Open <https://bayhaqy.my.id/apps/> in Chrome or Edge.
2. Tap the **three-dot menu** → **Install app**.
3. Confirm — the app installs and works offline.

**iOS (Safari):**
1. Open <https://bayhaqy.my.id/apps/> in Safari.
2. Tap the **Share** button → **Add to Home Screen**.
3. Tap **Add** — the icon appears on your home screen.

## Build a native Android APK (optional)

If you need a real `.apk` file (e.g., for sideloading on devices without Play Store), follow [`APK_BUILD_GUIDE.md`](./APK_BUILD_GUIDE.md) to wrap the static site with Capacitor. The build process takes ~10 minutes on a machine with Android Studio installed.

## Tech stack

- **HTML, CSS, vanilla JavaScript** — no build step, no framework, no transpilation.
- **WebAssembly** for heavy lifting: Tesseract.js (OCR), FFmpeg (video/audio), sql-formatter.
- **Web Crypto API** for AES-256 encryption (Password Vault).
- **Service Worker** for offline caching (PWA).
- **GitHub Pages** for hosting. Cloudflare in front for CDN and SSL.

## Self-hosting

```bash
git clone https://github.com/bayhaqy/apps.git
cd apps
# Serve with any static file server, e.g.:
python3 -m http.server 8080
# Open http://localhost:8080/
```

No environment variables, no API keys, no database. Just static files.

## Contributing

Found a bug? Have an idea for a new tool? Open an issue with the `tool-request` label:

👉 <https://github.com/bayhaqy/apps/issues/new?labels=tool-request&template=tool-request.md>

## License

MIT — see [`LICENSE`](./LICENSE). Use it, fork it, sell it, just don't blame me.

## Author

**Achmad Bayhaqy**
- Portfolio: <https://bayhaqy.my.id/>
- GitHub: [@bayhaqy](https://github.com/bayhaqy)
- Google Scholar: [profile](https://scholar.google.com/)

---

Built with care, not with tracking pixels.
