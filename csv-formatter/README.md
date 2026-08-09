# CSV / Excel Formatter & JSON Converter

CSV Formatter is a free, private, offline web tool that cleans messy spreadsheets — trims whitespace, fixes capitalization, splits name columns, removes duplicates — and exports to clean CSV, JSON, nested JSON, or formatted XLSX. Everything runs 100% in your browser. No uploads, no tracking, no sign-up.

**Live:** <https://bayhaqy.my.id/apps/csv-formatter/>

---

## Why use it

Real-world spreadsheets exported from forms, CRMs, or copy-pasted from emails are messy: extra spaces, mixed-case emails, duplicate rows, inconsistent dates. Cleaning them by hand in Excel is slow and error-prone, and uploading them to a random online "CSV cleaner" means handing your data to a stranger.

| Manual Excel cleanup | CSV Formatter |
| --- | --- |
| Find-and-replace trim formulas, drag-down, repeat per column | One click cleans every column at once |
| Duplicate rows caught only if you spot them | Exact-duplicate detection across all columns |
| `"JOhn smIth"` → `"John Smith"` by hand | Auto title-case on detected name columns |
| `15/03/2020` vs `2020-03-15` mixed formats | Standardize dates to ISO `YYYY-MM-DD` |
| Full Name in one cell, need First/Last split | Auto-split `"Full Name"` / `"Nama Lengkap"` column |
| Export to CSV loses Unicode in Excel | UTF-8 with BOM — opens cleanly in Excel |
| Upload to an online tool = your data on a server | 100% client-side — nothing leaves your device |

## Features

- **Auto-clean in one click** — trim leading/trailing whitespace, collapse multiple spaces, remove empty rows and exact duplicate rows. All on by default, all toggleable.
- **Smart column detection** — each column is typed (text, number, date, email, boolean) so cleaning rules apply only where they make sense. The "Issues found" panel shows exactly what is messy before you touch anything.
- **Name & email normalization** — title-case name columns (`JOhn smIth` → `John Smith`), lowercase and trim email columns, and optionally split a `"Full Name"` / `"Nama Lengkap"` column into `First Name` + `Last Name`.
- **Date standardization** — detects `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`, and Indonesian formats like `12 Januari 2020`, then converts to ISO `YYYY-MM-DD`. Ambiguous dates (e.g. `05/06/2020`) are left untouched on purpose.
- **Multi-format export** — download clean CSV (UTF-8 with BOM for Excel), JSON (array of objects), nested JSON (name split into `{name:{first,last}}`), or a formatted `.xlsx` via SheetJS. Or copy the table as Markdown / JSON for docs and chat.
- **Live preview with provenance** — scroll through up to 100 rows with a sticky header. Every cell that was modified is highlighted yellow — click it to see its original value in a tooltip. Before/after stats show rows removed and cells modified.

## How to use

1. **Drop your file.** Drag a `.csv`, `.xlsx`, `.xls`, `.tsv`, or `.txt` file onto the dropzone, or click to browse. Only one file at a time — dropping a new one replaces the previous.
2. **Review the summary.** CSV Formatter inspects every column, detects types, and lists issues like empty rows, duplicates, extra whitespace, mixed-case emails, non-ISO dates, and non-printable characters.
3. **Tune & apply cleaning.** Toggle the cleaning options you want (all sensible defaults are pre-checked), then click **Apply cleaning**. The preview re-renders from the original data and shows before/after stats. Re-toggle and re-apply any time — cleaning always starts from the raw file.
4. **Export.** Download clean `.csv`, `.json`, `.json` (nested), or `.xlsx` — or copy the table as Markdown / JSON to your clipboard.

## Running locally

CSV Formatter is a single self-contained HTML file with all CSS and JavaScript inline. The only external dependencies are SheetJS and PapaParse, loaded from a CDN on first visit.

**Option 1 — just open the file**

Double-click `index.html`. It runs via the `file://` protocol. (Note: the Clipboard API prefers a secure context, so if copy-to-clipboard fails over `file://`, use option 2 or 3.)

**Option 2 — Python HTTP server**

```bash
cd csv-formatter
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — self-host**

Drop the `index.html` file onto any static host: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own nginx/Apache server. No server-side code required.

## Project structure

```
csv-formatter/
├── index.html     # single self-contained app (HTML + CSS + JS inline)
└── README.md      # this file
```

That's it. One file does everything. SheetJS and PapaParse are loaded from `cdnjs.cloudflare.com` at runtime.

## How it works (technical)

CSV Formatter relies on two battle-tested open-source parsers and a layer of pure-JavaScript cleaning logic:

### 1. PapaParse — CSV / TSV / TXT parsing

[PapaParse](https://www.papaparse.com/) handles the messy reality of delimited text: quoted fields, embedded commas, escaped quotes, different delimiters, and blank lines. The app calls:

```js
Papa.parse(file, { header: false, skipEmptyLines: false, delimiter: '' });
```

`header:false` returns a raw array-of-arrays (the first row is treated as the header manually so we control type detection). `delimiter:''` lets PapaParse auto-detect (comma, tab, semicolon, pipe). For `.tsv` files the delimiter is forced to `\t`. On export, `Papa.unparse()` serializes the cleaned data back to CSV, prefixed with a `\uFEFF` BOM so Excel opens UTF-8 correctly.

### 2. SheetJS — XLSX / XLS reading & writing

[SheetJS](https://sheetjs.com/) (Community Edition) reads binary Excel workbooks via `XLSX.read(arrayBuffer, {type:'array'})`, then converts the first worksheet to an array-of-arrays with `XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''})`. `raw:true` returns native cell types (numbers stay numbers, dates stay Date objects) which are then stringified for uniform cleaning. On export, `XLSX.utils.aoa_to_sheet()` builds a new worksheet and `XLSX.write()` produces a binary `.xlsx` Blob.

### 3. Type detection & cleaning

Each column is sampled: if ≥80% of its non-empty cells match a number, date, email, or boolean pattern, the column is typed accordingly (header keywords like `email` force the type). Cleaning then runs in a fixed order — strip non-printables → trim → collapse spaces → normalize emails → title-case names → standardize dates → split name column → empty-to-null → remove empty rows → remove duplicates — always starting from the original raw data so toggling an option and re-applying never compounds changes. Every modified cell records its original value in a parallel metadata array, which drives the yellow highlight and click-to-see-original tooltip.

### 4. Date parsing

The date parser tries five patterns in order: Indonesian (`12 Januari 2020`), ISO (`YYYY-MM-DD`), slash (`DD/MM/YYYY` or `MM/DD/YYYY`), and dash (`DD-MM-YYYY` or `MM-DD-YYYY`). For slash/dash formats where both components are ≤12 (e.g. `05/06/2020`), the day/month order is ambiguous so the value is left untouched rather than guessed wrong.

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| File input & drag-drop | ✅ | ✅ | ✅ | ✅ |
| CSV parsing (PapaParse) | ✅ | ✅ | ✅ | ✅ |
| XLSX reading (SheetJS) | ✅ | ✅ | ✅ | ✅ |
| Clipboard API | ✅ | ✅ | ✅ | ✅ (HTTPS only) |
| Blob downloads | ✅ | ✅ | ✅ | ✅ |
| Light/dark theme | ✅ | ✅ | ✅ | ✅ |

Recommended: the latest version of Chrome, Edge, or Firefox. Internet Explorer is not supported. The Clipboard API requires a secure context (HTTPS or `localhost`) — if you open the file directly via `file://`, copying may fall back to the legacy `execCommand` method; downloading always works.

## Limitations

- **No formula preservation from XLSX.** SheetJS reads cached cell values, not live formulas. If a cell contains `=SUM(A1:A5)`, you get its last computed result, not the formula. Cell formatting (colors, fonts, number formats) is also not preserved on re-export — the focus is clean data, not faithful spreadsheet cloning.
- **Max ~50K rows smoothly.** The app handles roughly 50,000 rows without noticeable lag on a typical laptop. Beyond that, parsing and the preview table (capped at 100 visible rows) take longer. There is no hard limit — the only constraint is your device's memory.
- **Single file at a time.** Drop a new file and it replaces the previous one. For batch processing, re-run the tool per file.
- **First column only for type detection.** Type detection samples the whole column but applies cleaning rules per detected type; a column flagged "text" with a few stray numbers will not have those numbers reformatted.
- **Ambiguous dates left as-is.** `05/06/2020` could be May 6 or June 5 — the app refuses to guess and leaves the value unchanged. Use ISO `YYYY-MM-DD` input if you need deterministic conversion.
- **No persistence.** The loaded file and cleaning state are not saved — refresh the page and you start over. This is intentional (privacy: nothing is stored).

## Privacy

CSV Formatter is private by design:

- **No uploads.** Your file is read with the File API and never leaves your device. You can verify this in your browser's DevTools → Network tab — no spreadsheet data is sent anywhere.
- **No tracking.** No analytics, no fingerprinting, no third-party scripts beyond the two parser CDNs (cdnjs.cloudflare.com, which serves SheetJS and PapaParse).
- **No cookies.** The only `localStorage` key used is `csvfmt-theme` to remember your light/dark preference.
- **No server.** This is a static page. There is no backend to log anything.

## Tech stack

- **Vanilla JavaScript** (ES5-compatible IIFE) — no framework, no bundler, no transpilation.
- **[PapaParse 5.4.1](https://www.papaparse.com/)** — robust CSV / TSV parsing and unparsing.
- **[SheetJS 0.18.5](https://sheetjs.com/)** (Community Edition) — XLSX / XLS reading and writing.
- **Clipboard API** (`navigator.clipboard.writeText`) — for copying, with `execCommand('copy')` fallback.
- **Blob + URL.createObjectURL** — for downloads.
- **CSS custom properties** — for light/dark theming.

No npm dependencies. No build step. The entire app is one HTML file plus two CDN libraries.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy).

Powered by [PapaParse](https://www.papaparse.com/) and [SheetJS](https://sheetjs.com/). Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection alongside [BayMerge](https://bayhaqy.my.id/apps/baymerge/) (offline PDF merger) and [AI Context Packer](https://bayhaqy.my.id/apps/ai-context-packer/) (project-to-Markdown packer).
