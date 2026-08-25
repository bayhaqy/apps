# Anti-AI Text Humanizer

A 100% client-side, offline-first tool that detects AI cliché phrases in Indonesian and English writing, highlights them by severity, and lets you swap them for natural human wording with one click. No uploads, no tracking, no dependencies — just one HTML file.

**Live:** <https://bayhaqy.my.id/apps/text-humanizer/>

---

## Why use it

Large language models (ChatGPT, Claude, Gemini, etc.) tend to overuse a small set of phrases — "delve into", "leverage", "menyelami", "di era digital ini", and dozens more. These phrases are the easiest tell that a piece of text was machine-written. Anti-AI Text Humanizer flags them in your text and offers quick human replacements, so your writing reads like you wrote it.

It is **not** an AI detector (those use statistical models and are unreliable). It is a focused editing aid — a highlighter for the most obvious AI-style wording.

| Manual copy-paste editing             | Anti-AI Text Humanizer                    |
| ------------------------------------- | ----------------------------------------- |
| Re-read every paragraph yourself      | Clichés are highlighted automatically     |
| Guess which phrases sound "AI"        | 70+ curated entries, severity-coded       |
| Find-and-replace one phrase at a time | One-click "replace all" for one or many   |
| No way to track progress              | Live humanized score + counts by severity |
| Online tools upload your text         | 100% local — nothing leaves your browser  |

---

## Features

1. **Real-time highlighting** — clichés are flagged as you type, debounced at 300 ms so it stays smooth on long documents.
2. **One-click replace** — each cliché has a primary suggestion plus alternatives; replace one phrase everywhere or sweep all high-severity clichés in bulk.
3. **Bilingual coverage** — 70+ entries split across Indonesian and English, including classic GPT-isms like "delve into", "leverage", "menyelami", and "di era digital ini".
4. **Severity-coded highlights** — red = high (strong AI signal), amber = medium (formal filler), soft-green = low (minor over-usage). Hover any highlight for a tooltip with the suggested replacement.
5. **Tunable matching** — toggle language scope (Auto / Indonesian only / English only), whole-word matching, and case sensitivity.
6. **Truly private** — your text never leaves your device. No server, no API, no analytics. Save the page and run it from disk with no internet.

Bonus: live humanized score (100 − 10 × cliché count), word/char counts, copy-to-clipboard, download as `.txt`, and a "Reset to original" button that restores the text you typed before any bulk replace.

---

## How to use

1. **Paste your text** into the left pane — an essay, blog post, email, or article draft. Or click **Load sample** to try a demo paragraph.
2. **Review highlights** in the right pane — clichés are colored by severity. Hover any highlighted phrase to see a suggested human replacement.
3. **Replace one or many** — use the detection panel to swap a specific cliché everywhere (with an alternative from the dropdown if you prefer), or hit **Replace all (high)** / **Replace all (all severities)** in the toolbar for bulk fixes.
4. **Copy or download** — once the humanized score looks good, click **Copy humanized text** or **Download .txt**. Use **Reset to original** anytime to undo all replacements.

---

## Running locally

Because the app is a single self-contained HTML file, you have three options:

**Option A — just open it.** Double-click `index.html`. It works directly from `file://` in any modern browser. No server needed.

**Option B — Python's built-in server** (if you want a clean URL or test on mobile over LAN):

```bash
cd text-humanizer
python3 -m http.server 8080
# open http://localhost:8080/ on desktop, or http://<your-lan-ip>:8080/ on your phone
```

**Option C — any static file server** (nginx, Caddy, `npx serve`, etc.). The app has zero runtime dependencies.

To run offline permanently: open the page once in your browser, then Ctrl+S → "Webpage, Complete" to save a local copy. The saved file works with no internet.

---

## Project structure

```
text-humanizer/
├── index.html   # Single self-contained app — all CSS + JS inline, 70+ cliché entries embedded
└── README.md    # This file
```

That's it. No `node_modules`, no build step, no external libraries, no CDN.

---

## How it works

1. **Cliché database.** A JavaScript array of ~75 entries, each shaped as:

   ```js
   { pattern: "delve into", replacement: "explore", alternatives: ["dig into", "examine"], severity: "high", lang: "en" }
   ```

   `pattern` is a plain string (regex meta-characters are auto-escaped). `severity` is `high`, `medium`, or `low`. `lang` is `id` or `en`.

2. **Regex matching.** For each entry, a `RegExp` is built on the fly:

   - `pattern` is escaped via `pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`.
   - If **whole-word** is on, the pattern is wrapped in `\b … \b`.
   - If **case-sensitive** is off, the `i` flag is added. The `g` and `u` flags are always set.

3. **Debounced analysis.** The `input` event on the textarea fires `scheduleAnalysis()`, which waits 300 ms before calling `runAnalysis()`. This keeps the UI smooth on long documents.

4. **Non-overlapping matches.** All matches across all clichés are collected, sorted by start position (longest-first on ties), then filtered so no two highlights overlap. This prevents nested highlights when one cliché contains another (e.g. "leverage" vs "leveraged").

5. **Highlight rendering.** The preview pane is rebuilt by escaping the text and wrapping each match in a `<mark class="hl hl-{severity}" data-tip="…">` element. A CSS `::after` pseudo-element on `[data-tip]` shows the suggested replacement on hover.

6. **Replace-all.** For a single cliché, `String.prototype.replace(regex, replacement)` swaps every match. For bulk actions, the same loop runs over every unique cliché type (optionally filtered by severity).

7. **Original-text tracking.** `state.originalText` is updated only when the user types, pastes, loads a sample, or clears. Replace operations modify `state.currentText` and the textarea value, but **not** `originalText`. "Reset to original" restores `originalText`. This means reset always undoes the most recent batch of replacements without losing your manual edits.

---

## Browser support

| Browser            | Supported | Notes                                    |
| ------------------ | --------- | ---------------------------------------- |
| Chrome / Edge 90+  | ✅        | Full support                             |
| Firefox 88+        | ✅        | Full support                             |
| Safari 14+         | ✅        | Full support                             |
| Mobile Chrome/Safari | ✅      | Responsive layout, touch-friendly        |
| Internet Explorer  | ❌        | Not supported (uses ES2017+ and `u` flag regex) |

The app uses only standard browser APIs: `RegExp`, `textarea` events, `Blob` + `URL.createObjectURL` for downloads, and `navigator.clipboard` (with `execCommand` fallback) for copy.

---

## Limitations

- **False positives are possible.** Common words like "however", "therefore", and "namun" are flagged as medium severity because AI uses them very frequently — but human writers use them too. Treat the severity colors as guidance, not a verdict.
- **Not a plagiarism detector.** The tool only checks for specific cliché phrases. It cannot tell you whether text was copied from elsewhere or whether it was written by an AI.
- **Not a guarantee of passing AI detectors.** AI detectors (GPTZero, Originality.ai, Turnitin, etc.) use statistical models, not phrase matching. Removing clichés reduces the most obvious AI-style wording but does not guarantee any detector will classify the text as human.
- **Replacements are verbatim.** Sentence-initial capitalization is not preserved automatically — after a bulk replace, scan the result and fix capitalization at the start of sentences.
- **Matching is regex-based.** Multi-word phrases with hyphens, smart quotes, or accented characters may behave slightly differently across browsers due to regex engine variations. The `u` (Unicode) flag is used to minimize this.
- **No semantic understanding.** The tool cannot tell whether a cliché is actually appropriate in context (e.g. "tapestry" in an article about weaving). Use your judgement.
- **No persistence.** Refreshing the page clears the textarea. If you want to keep your work, use Download .txt before closing the tab.

---

## Privacy

- **No uploads.** Your text is processed entirely in your browser. Open DevTools → Network and you'll see zero requests while you type.
- **No tracking.** No Google Analytics, no Sentry, no fingerprinting, no cookies.
- **One localStorage key.** `humanizer-theme` stores your light/dark preference. That's the only thing this app ever writes to disk.
- **No external resources.** The HTML file has no `<script src>`, no `<link rel="stylesheet">`, no fonts, no images beyond an inline SVG favicon. Once loaded, it works fully offline.

---

## Tech stack

- **Vanilla JavaScript (ES2017+).** No framework, no transpiler, no bundler.
- **`RegExp` with `g`, `i`, `u` flags** for cliché matching.
- **`Blob` + `URL.createObjectURL`** for `.txt` downloads.
- **`navigator.clipboard.writeText`** with `execCommand("copy")` fallback for clipboard.
- **CSS custom properties** for the light/dark theme (single `data-theme` attribute on `<html>`).
- **Inline SVG** for icons and favicon — no icon font, no image requests.

---

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) in the source repository.

## Credits

Built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Cliché list curated from publicly observed AI writing patterns. Design system matches the [BayMerge](https://bayhaqy.my.id/apps/baymerge/) app for visual consistency across the apps collection.
