# AI Context Packer

AI Context Packer is a free, private, offline web tool that combines many project files — code, notes, configs — into a single Markdown file ready to paste into ChatGPT, Claude, or DeepSeek. Everything runs 100% in your browser. No uploads, no tracking, no sign-up.

**Live:** <https://bayhaqy.my.id/apps/ai-context-packer/>

---

## Why use it

Pasting files into an AI chat one by one is tedious, breaks the conversation flow, and loses the folder structure the model needs to understand your project.

| Manual copy-paste | AI Context Packer |
| --- | --- |
| Open each file, select all, copy, paste, repeat | Drag-drop the whole folder once |
| Folder structure is lost — the model has no idea where files live | Relative paths preserved + auto-generated file tree |
| No idea how many tokens you are about to send | Live token counter (≈ chars ÷ 4) |
| Binary files (images, PDFs) accidentally pasted as garbage | Binary files auto-detected and skipped |
| Output formatting is inconsistent every time | Three consistent templates (Standard / Compact / XML-tagged) |
| Mix of file types jumbled together | Filter by code / docs / configs |

## Features

- **Multi-file & folder drop** — drag-drop individual files or an entire project folder. Folder structure is preserved in the output paths and the file tree.
- **Three output templates** — Standard Markdown (with header + tree + fenced code), Compact (just headings + code, for tight token budgets), and XML-tagged (`<file path="…">` tags that Claude parses well).
- **Live token counter** — a lightweight chars ÷ 4 heuristic gives an instant estimate of context size. No external tokenizer library, no API calls.
- **Binary auto-skip** — images, PDFs, Office docs, archives, executables, and media files are detected by extension and MIME type and skipped automatically.
- **Reorder & filter** — drag the handle to reorder files, filter the list by code / docs / configs, remove files individually.
- **Configurable** — toggle the file tree, line numbers, and code fences; set a max file size (default 100 KB); add a custom header prompt.
- **100% client-side** — runs entirely in your browser. No uploads, no tracking, no cookies. Works offline after the first load.
- **Copy or download** — copy straight to the clipboard, or download as `.md` / `.txt`.

## How to use

1. **Add files.** Drag-drop files or a folder onto the dropzone, or click **browse files** / **browse folder**. Binary files are skipped automatically with a "skipped" badge.
2. **Reorder & filter.** Drag the `⠿` handle (or use the ↑/↓ buttons on mobile) to reorder. Use the filter chips to show only code, docs, or configs.
3. **Configure output.** Click **Output configuration** to pick a template, toggle the file tree / line numbers / code fences, set max file size, and add an optional custom header.
4. **Copy or download.** The preview updates live. Click **Copy to clipboard** to paste into your AI chat, or **Download .md** / **Download .txt** for later.

## Running locally

AI Context Packer is a single self-contained HTML file with all CSS and JavaScript inline. There are no build steps and no dependencies.

**Option 1 — just open the file**

Double-click `index.html`. It runs via the `file://` protocol. (Note: the Clipboard API prefers a secure context, so if copy-to-clipboard fails over `file://`, use option 2 or 3.)

**Option 2 — Python HTTP server**

```bash
cd ai-context-packer
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — self-host**

Drop the `index.html` file onto any static host: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own nginx/Apache server. No server-side code required.

## Project structure

```
ai-context-packer/
├── index.html     # single self-contained app (HTML + CSS + JS inline)
└── README.md      # this file
```

That's it. One file does everything.

## How it works (technical)

AI Context Packer relies on three browser APIs to read files without uploading them:

### 1. `<input type="file" multiple>` — individual files

The standard file input lets the user pick one or more files. Each selected `File` object exposes `.name`, `.size`, `.type`, and a `.text()` method that returns a Promise resolving to the file's UTF-8 text content. No network request is made.

### 2. `<input type="file" webkitdirectory>` — folder picker

Adding the `webkitdirectory` attribute turns the file picker into a folder picker. When a folder is selected, every file inside it (recursively) is returned. Crucially, each `File` object also exposes a `webkitRelativePath` property (e.g. `my-project/src/main.js`) which preserves the folder structure. AI Context Packer uses this path for both the output file path and the file tree.

Support: Chrome, Edge, Firefox, and Safari 11.1+.

### 3. `DataTransferItem.webkitGetAsEntry()` — folder drag-drop

When a user drags a folder from their operating system onto the dropzone, the `drop` event's `DataTransferItemList` exposes each dragged item. Calling `webkitGetAsEntry()` on a file-kind item returns a `FileSystemEntry` — either a `FileSystemFileEntry` or a `FileSystemDirectoryEntry`. Directories are read recursively with `createReader().readEntries()`, which returns entries in batches (you call it repeatedly until it returns an empty array). This lets AI Context Packer walk an entire dropped folder tree and preserve relative paths.

Support: Chrome, Edge, Firefox. Safari has partial support.

### Output generation

Once files are read into memory as strings, generation is pure string manipulation:

1. The file tree is built by splitting each path on `/`, nesting into a trie, then rendering with `├──` / `└──` / `│   ` box-drawing characters.
2. Each file is wrapped according to the chosen template (Standard: `--- File: path ---` + fenced code; Compact: `### path` + fenced code; XML: `<file path="…">` tags).
3. Files larger than the max size (default 100 KB) are truncated with a `<!-- FILE TRUNCATED -->` note so the model knows it is seeing a partial file.
4. The token count is `Math.ceil(charCount / 4)` — a well-known heuristic for English text and code.

The Clipboard API (`navigator.clipboard.writeText`) handles copying, with a `document.execCommand('copy')` fallback for older browsers. Downloads use `Blob` + `URL.createObjectURL` + a temporary `<a download>` click.

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| Basic file input | ✅ | ✅ | ✅ | ✅ |
| `webkitdirectory` folder picker | ✅ | ✅ | ✅ | ✅ (11.1+) |
| Folder drag-drop (`webkitGetAsEntry`) | ✅ | ✅ | ✅ | ⚠️ partial |
| Clipboard API | ✅ | ✅ | ✅ | ✅ (HTTPS only) |
| `File.text()` | ✅ | ✅ | ✅ | ✅ |

Recommended: the latest version of Chrome, Edge, or Firefox. Internet Explorer is not supported. The Clipboard API requires a secure context (HTTPS or `localhost`) — if you open the file directly via `file://`, copying may fall back to the legacy method or fail silently; downloading always works.

## Limitations

- **Binary files are skipped.** Images, PDFs, Office documents, archives, executables, fonts, and media files cannot be represented as text and are automatically excluded.
- **Hard cap at 100 MB per file.** Files larger than 100 MB are skipped entirely to avoid crashing the browser. Files between the max-size setting (default 100 KB) and 100 MB are read fully into memory and truncated in the output.
- **Token count is an estimate.** The chars ÷ 4 heuristic is accurate to roughly ±10–20% compared to real tokenizers (tiktoken, Claude's tokenizer). Use it as a budgeting guide, not a guarantee.
- **No nested archive extraction.** If you drop a `.zip`, it is skipped. Extract it first, then drop the extracted folder.
- **Memory.** All file contents live in browser memory until you clear the list or close the tab. Packing hundreds of megabytes of text at once may slow down or crash low-memory devices.
- **No persistence.** The file list is not saved — refresh the page and you start over. This is intentional (privacy: nothing is stored).

## Privacy

AI Context Packer is private by design:

- **No uploads.** Files are read with the File API and never leave your device. You can verify this in your browser's DevTools → Network tab.
- **No tracking.** No analytics, no fingerprinting, no third-party scripts.
- **No cookies.** The only `localStorage` key used is `ctxpacker-theme` to remember your light/dark preference.
- **No server.** This is a static page. There is no backend to log anything.

## Tech stack

- **Vanilla JavaScript** (ES2015+) — no framework, no bundler, no transpilation.
- **File System Access / Entry API** (`webkitGetAsEntry`, `webkitdirectory`) — for folder reading.
- **Clipboard API** (`navigator.clipboard.writeText`) — for copying.
- **Blob + URL.createObjectURL** — for downloads.
- **CSS custom properties** — for light/dark theming.

No npm dependencies. No build step. No CDN. The entire app is one HTML file.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy).

Inspired by the need to stop manually copy-pasting files into ChatGPT. Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection alongside [BayMerge](https://bayhaqy.my.id/apps/baymerge/) (offline PDF merger).
