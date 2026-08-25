# Text Diff Checker & Text Clean Utility

Text Diff is a free, private, in-browser tool that compares two pieces of text and shows inline word, line, or character differences, then normalizes whitespace, line endings, and punctuation with a bundled text cleaner. It runs [diff-match-patch](https://github.com/google/diff-match-patch) entirely in your browser — no paste is uploaded, no API key is required, and it works offline after the first load.

**Live:** <https://bayhaqy.my.id/apps/text-diff/>

---

## Why use it

Diffing two paragraphs by eye is slow and error-prone. Sending them to an online diff service means handing your content to a stranger. Text Diff ships Google's diff-match-patch library to your browser and runs all comparison logic locally with a 300 ms debounced auto-run.

| Manual proofreading | Text Diff |
| --- | --- |
| Read both paragraphs side by side, miss small word swaps | Inline green additions and red strikethrough deletions |
| Count words added / removed by hand | Live stats: words added, words removed, similarity % |
| One space vs two spaces, mixed CRLF / LF | Toggle "Ignore whitespace" and "Ignore case" |
| Copy-paste from a Word doc with curly quotes | Text Clean tab strips smart quotes and dedupes punctuation |

## Features

### Diff Checker tab

- **Three diff modes** — Word diff (token-level, best for prose), Line diff (one block per line with full-line backgrounds, best for logs), Character diff (raw, best for spotting single-char edits).
- **Inline highlighting** — additions get a green background, deletions get red background with strikethrough, unchanged text is gray. The legend at the top of the diff view reminds you which is which.
- **Ignore whitespace** — collapses all whitespace runs to a single canonical space before diffing. Useful when comparing reformatted text.
- **Ignore case** — lowercases both inputs before diffing. Useful when only capitalization changed.
- **Swap left & right** — one click flips the Original and Modified panes, so you can reverse the diff direction without re-pasting.
- **Auto-run with debounce** — the diff updates 300 ms after you stop typing. Press the explicit **Run diff** button to force a re-run.
- **Live stats** — words added, words removed, equal words, and a similarity percentage (equal characters / max length × 100).
- **Copy diff** — copies the diff as plain text with `+` / `-` line markers (line mode) or `[+...]` / `[-...]` inline markers (word / char mode).

### Text Clean tab

Six toggleable normalization rules, applied in a fixed order:

1. **Trim leading / trailing whitespace per line** — strips spaces and tabs from both ends of each line.
2. **Collapse multiple spaces to single** — `hello    world` → `hello world`. Tabs are also collapsed.
3. **Remove empty lines** — drops lines that contain only whitespace.
4. **Normalize line endings to LF** — CRLF (`\r\n`) and lone CR (`\r`) both become `\n`.
5. **Remove duplicate trailing punctuation** — `Hello,,,` → `Hello`, `yes!!` → `yes`. Only collapses runs of the same character.
6. **Strip smart quotes** — curly quotes (`'` `'` `"` `"`), single low-9 quote (`,`), en-dash (`–`), and em-dash (`—`) all become their ASCII equivalents.

## How to use

1. **Choose a tab** — Diff Checker for comparing two texts, Text Clean for normalizing one text.
2. **Load sample or paste** — press *Load sample* to fill both panes (Diff) or the input pane (Clean) with realistic example data.
3. **Pick options** — in Diff: mode (word / line / character), ignore whitespace, ignore case; in Clean: toggle the six normalization rules.
4. **Run** — Diff auto-runs 300 ms after you stop typing; press *Swap left & right* to flip original and modified. Clean runs on button click.
5. **Copy** — press *Copy diff* to copy the highlighted diff as plain text with `+` / `-` markers, or *Copy output* for the cleaned text.

## Running locally

Text Diff is a single self-contained HTML file. The only external dependency is diff-match-patch, loaded as a classic script from jsDelivr on first visit.

**Option 1 — just open the file**

Double-click `index.html`. It runs via the `file://` protocol. The classic `<script src>` tag for diff-match-patch works over `file://` in all modern browsers.

**Option 2 — Python HTTP server**

```bash
cd text-diff
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — self-host**

Drop the `index.html` file onto any static host: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own nginx/Apache server. No server-side code required.

## Project structure

```
text-diff/
├── index.html     # single self-contained app (HTML + CSS + JS inline)
└── README.md      # this file
```

## How it works (technical)

### 1. Library loading

[diff-match-patch 1.0.5](https://github.com/google/diff-match-patch) is loaded as a classic `<script src>` from `cdn.jsdelivr.net`. The library exposes a global `diff_match_patch` constructor and three constants (`DIFF_DELETE = -1`, `DIFF_INSERT = 1`, `DIFF_EQUAL = 0`). A polling `checkReady()` function tests for the global every 250 ms and shows a friendly banner if it has not loaded after ~10 seconds.

### 2. Word-level diff

Direct character-level diffing on prose produces noisy, fragmented output (every space and punctuation mark becomes a separate diff hunk). To get clean word-level diffs:

1. Both texts are tokenized into alternating whitespace and non-whitespace runs via `/\s+|\S+/g`.
2. Each unique token is mapped to a single Unicode character starting at `\u0002` (whitespace is always mapped to the sentinel `\u0001`).
3. The encoded strings are passed to `dmp.diff_main()`, then `dmp.diff_cleanupSemantic()` is called to merge adjacent same-operation hunks.
4. The encoded diff is mapped back to original tokens, and consecutive same-op tokens are merged.

When "Ignore whitespace" is checked, pure-whitespace insertions and deletions are filtered out of the final result.

### 3. Line-level diff

The same encoding trick is applied at the line level: each unique line becomes one character, `diff_main` runs on the encoded strings, and the result is mapped back to lines. Lines are rendered as blocks with full-line green/red backgrounds and line numbers (or `+` / `-` markers for changed lines).

### 4. Character-level diff

`dmp.diff_main(a, b)` is called directly on the raw text. `diff_cleanupSemantic()` merges character-level edits into more readable hunks. Best for spotting single-character edits inside words.

### 5. Similarity score

The similarity percentage is computed as `equalChars / max(len(a), len(b)) × 100`, where `equalChars` is the total length of `DIFF_EQUAL` hunks from a raw character diff. This is independent of the selected diff mode (so word diff and char diff show the same similarity number).

### 6. Text cleaner

The six rules apply in a fixed order: line-ending normalization → smart quote stripping → space collapsing → punctuation dedup → per-line trim → empty-line removal. Order matters: collapsing spaces before trimming means the trim is reliable; stripping quotes before collapsing prevents curly-quote runs from being preserved by mistake.

## Sample API call (programmatic use)

Text Diff is a UI tool — it does not expose a REST API. To diff text programmatically with the same library:

```bash
npm install diff-match-patch
```

```js
// diff.mjs
import { diff_match_patch } from 'diff-match-patch';

const dmp = new diff_match_patch();
const a = 'The quick brown fox jumps over the lazy dog.';
const b = 'The quick brown fox leaps over the lazy dog.';
const diffs = dmp.diff_main(a, b);
dmp.diff_cleanupSemantic(diffs);

let added = 0, removed = 0;
for (const [op, text] of diffs) {
  if (op === 1) added += text.length;
  if (op === -1) removed += text.length;
  const marker = op === 1 ? '[+]' : op === -1 ? '[-]' : '[=]';
  console.log(marker, JSON.stringify(text));
}
console.log(`Added: ${added} chars, Removed: ${removed} chars`);
```

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| Classic script CDN load | ✅ | ✅ | ✅ | ✅ |
| diff-match-patch 1.0.5 | ✅ | ✅ | ✅ | ✅ |
| Clipboard API | ✅ | ✅ | ✅ | ✅ (HTTPS only) |
| CSS custom properties | ✅ | ✅ | ✅ | ✅ |
| Light/dark theme | ✅ | ✅ | ✅ | ✅ |

Recommended: the latest version of Chrome, Edge, Firefox, or Safari. Internet Explorer is not supported.

## Limitations

- **No file upload.** Paste text directly into the textareas. There is no drag-drop file target — keep the tool focused on quick text comparison.
- **No merge or three-way diff.** This is a read-only visualizer. For three-way merge, use `git mergetool` or a dedicated merge editor.
- **Diff body capped at 520 px height** with internal scroll. Very large inputs (e.g. 100 KB+) still diff but you scroll inside the panel.
- **Character diff on long inputs is O(n²) in the worst case.** diff-match-patch is fast for typical prose, but multi-megabyte inputs may take a few seconds. The 300 ms debounce keeps the UI responsive.
- **No persistence.** Refresh the page and both panes clear. This is intentional (privacy: nothing is stored beyond the theme preference).

## Privacy

Text Diff is private by design:

- **No uploads.** Your text is processed by JavaScript running in your browser. Verify this in DevTools → Network tab — no text body is sent anywhere.
- **No tracking.** No analytics, no fingerprinting. The only third-party request is to `cdn.jsdelivr.net` for the diff-match-patch library bundle.
- **No cookies.** The only `localStorage` key used is `apps-theme` to remember your light/dark preference.
- **No server.** This is a static page. There is no backend to log anything.

## Tech stack

- **Vanilla JavaScript** (ES5-compatible IIFE).
- **[diff-match-patch 1.0.5](https://github.com/google/diff-match-patch)** — Google's diff, match, and patch library. Used only for `diff_main`, `diff_cleanupSemantic`, and `diff_levenshtein`.
- **Clipboard API** (`navigator.clipboard.writeText`) with `execCommand('copy')` fallback.
- **CSS custom properties** — for light/dark theming.

No npm dependencies for the app itself. No build step. The entire app is one HTML file plus one CDN library bundle.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy).

Powered by [diff-match-patch](https://github.com/google/diff-match-patch). Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection.
