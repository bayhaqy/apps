# Code Formatter & Beautifier

Code Formatter is a free, private, in-browser tool that beautifies messy SQL, Python, HTML, CSS, and JavaScript. It runs [Prettier](https://prettier.io/) and [sql-formatter](https://github.com/sql-formatter-org/sql-formatter) entirely in your browser — no paste is uploaded, no API key is required, and it works offline after the first load.

**Live:** <https://bayhaqy.my.id/apps/code-formatter/>

---

## Why use it

Code copied from chat replies, scraped from minified bundles, or pasted from a colleague's editor often arrives as a single line or with inconsistent indentation. Online formatters that fix this usually send your code to a server. Code Formatter ships Prettier and sql-formatter to your browser and runs them locally with a 300 ms debounced auto-format.

| Pasted snippet | Code Formatter |
| --- | --- |
| `select u.id,u.name,o.total from users u join orders o on u.id=o.user_id where o.total>100` | Multi-line SQL with `UPPERCASE` keywords and aligned `JOIN`/`WHERE` |
| `const sum=arr=>arr.reduce((a,b)=>a+b,0);` | Multi-line arrow function with 2-space indent and single quotes |
| Minified `<html><head>...` one-liner | Pretty-printed HTML with one tag per line and aligned attributes |
| Python with mixed tabs and 6-space indents | Stack-based re-indent to your chosen indent style |

## Features

- **Five languages** — SQL, Python, HTML, CSS, and JavaScript. The options panel adapts: SQL gets a keyword-case selector (UPPER / lower / preserve); the others hide it.
- **Indent style** — Tabs, 2 spaces, or 4 spaces. Prettier and the Python indenter both honor the choice via `useTabs` and `tabWidth`.
- **Line width** — Configurable print width from 40 to 200 columns (default 80). Prettier breaks long lines at this boundary.
- **Auto-format with debounce** — The Output pane updates 300 ms after you stop typing. Press the explicit **Format** button to force a re-run.
- **Load sample** — Each language has a realistic messy sample (a minified SQL query, a Python function with bad indentation, a compressed CSS rule, etc.). One click fills the input and triggers a format.
- **Copy and download** — Copy output to clipboard (with `execCommand('copy')` fallback for `file://`), or download as `.sql` / `.py` / `.html` / `.css` / `.js` with the correct extension.
- **Live stats** — Input and output panes each show line and character counts; option pills show the active language, indent style, and column width.

## How to use

1. **Pick a language** — SQL, Python, HTML, CSS, or JavaScript. The options panel adapts; SQL gets a keyword-case selector.
2. **Set indent and width** — choose tabs, 2 spaces, or 4 spaces, and a print width between 40 and 200. Defaults are 2 spaces / 80 columns.
3. **Paste or load sample** — drop your messy code into the Input pane on the left, or press *Load sample* to see a realistic example formatted immediately.
4. **Auto-format** — the Output pane updates 300 ms after you stop typing. Press *Format* to force a re-run, or *Clear* to reset both panes.
5. **Copy or download** — press *Copy output* to copy to clipboard, or *Download* to save with the correct file extension.

## Running locally

Code Formatter is a single self-contained HTML file. The only external dependencies are Prettier and sql-formatter, loaded as ES modules from `esm.run` on first visit.

**Option 1 — just open the file**

Double-click `index.html`. It runs via the `file://` protocol. ES module imports work from `file://` in modern Chromium and Firefox.

**Option 2 — Python HTTP server**

```bash
cd code-formatter
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — self-host**

Drop the `index.html` file onto any static host: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own nginx/Apache server. No server-side code required.

## Project structure

```
code-formatter/
├── index.html     # single self-contained app (HTML + CSS + JS inline)
└── README.md      # this file
```

## How it works (technical)

### 1. Library loading

Prettier 3.x ships as ES modules only. The app uses a top-level `<script type="module">` block that imports Prettier Standalone and its plugins (Babel, Estree, PostCSS, HTML) plus `sql-formatter` from `esm.run` (jsDelivr's ESM endpoint). The modules are then attached to `window.prettier`, `window.prettierPlugins`, and `window.sqlFormatter` so the classic `<script>` block can call them. A `fmt-ready` custom event fires when loading completes; if it does not fire within ~10 seconds, a banner displays a friendly network error.

### 2. SQL formatting

```js
sqlFormatter.format(sql, {
  language: 'sql',
  keywordCase: 'upper' | 'lower' | 'preserve',
  tabWidth: 2,
  useTabs: false,
  linesBetweenQueries: 2
});
```

sql-formatter handles keyword case, JOIN alignment, subquery nesting, and IN-list wrapping.

### 3. Python heuristic indenter

Python has no mature JavaScript formatter (Black, Ruff, and autopep8 are all CPython-bound). Code Formatter uses a stack-based heuristic:

- Each non-blank line's effective indent is computed (tab = 4 spaces, space = 1).
- A stack of `{indent, depth}` pairs tracks the nesting level. The sentinel `{indent:0, depth:0}` is always at the bottom.
- For each line: pop the stack while the top's indent is greater than the current line's; if the current line's indent is greater than the top's *and* the previous non-blank line ended with a colon, push a new level.
- Multi-line constructs inside unclosed parens are detected via paren-balance counting (with strings and comments stripped) and emitted at `topDepth + 1`.

This produces clean output for typical Python (function/class definitions, `if`/`else`/`elif` chains, `try`/`except`, `for`/`while` blocks). It does not reformat line lengths or wrap long calls.

### 4. Prettier wrapping

HTML, CSS, and JavaScript all go through Prettier Standalone with the appropriate parser and plugin:

- HTML → `parser: 'html'`, `htmlWhitespaceSensitivity: 'css'`, plus the HTML plugin
- CSS → `parser: 'css'`, plus the PostCSS plugin
- JavaScript → `parser: 'babel'`, plus the Babel and Estree plugins (Estree is required because Babel emits an AST that needs the Estree printer)

Common options: `useTabs`, `tabWidth`, `printWidth`, `singleQuote: true`, `trailingComma: 'none'`.

### 5. Debounced auto-format

The `input` event on the input textarea calls `scheduleFormat()` which clears a timer and sets a new one for 300 ms. The explicit Format button calls `format()` immediately. Changing the language, indent, case, or width selectors also calls `format()` synchronously (no debounce) so the output reflects the new options instantly.

## Sample API call (programmatic use)

Code Formatter is a UI tool — it does not expose a REST API. To format code programmatically with the same libraries, install them locally:

```bash
npm install prettier sql-formatter
```

```js
// format-sql.mjs
import { format } from 'sql-formatter';

const sql = "select u.id,u.name,o.total from users u join orders o on u.id=o.user_id where o.total>100";
console.log(format(sql, { language: 'sql', keywordCase: 'upper', tabWidth: 2 }));
```

```js
// format-js.mjs
import * as prettier from 'prettier/standalone';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';

const js = 'const sum=arr=>arr.reduce((a,b)=>a+b,0)';
console.log(await prettier.format(js, {
  parser: 'babel', plugins: [babel, estree], semi: true, singleQuote: true, tabWidth: 2, printWidth: 80
}));
```

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| ES module imports from CDN | ✅ | ✅ | ✅ | ✅ |
| Prettier 3.x Standalone | ✅ | ✅ | ✅ | ✅ |
| sql-formatter 13.x | ✅ | ✅ | ✅ | ✅ |
| Clipboard API | ✅ | ✅ | ✅ | ✅ (HTTPS only) |
| Blob downloads | ✅ | ✅ | ✅ | ✅ |
| Light/dark theme | ✅ | ✅ | ✅ | ✅ |

Recommended: the latest version of Chrome, Edge, Firefox, or Safari. Internet Explorer is not supported (it has no ES module support).

## Limitations

- **Python formatting is heuristic.** Stack-based indentation handles common cases (functions, classes, `if/else`, `try/except`, `for/while`). It does not wrap long lines, normalize string quotes, sort imports, or split long call chains. Use [Black](https://github.com/psf/black) or [Ruff](https://docs.astral.sh/ruff/) for production Python.
- **First-visit CDN load.** On the first visit, ~600 KB of Prettier plugins and ~80 KB of sql-formatter are fetched from `esm.run`. Subsequent visits are served from the browser cache.
- **Single file at a time.** There is no project-tree mode. Paste one snippet, get one formatted output.
- **No AST inspection.** Syntax errors in CSS or JavaScript will throw from Prettier; the app shows a red banner with the error message instead of partial output.

## Privacy

Code Formatter is private by design:

- **No uploads.** Your code is processed by JavaScript running in your browser. Verify this in DevTools → Network tab — no code body is sent anywhere.
- **No tracking.** No analytics, no fingerprinting. The only third-party requests are to `esm.run` (jsDelivr) for the library bundles.
- **No cookies.** The only `localStorage` key used is `apps-theme` to remember your light/dark preference.
- **No server.** This is a static page. There is no backend to log anything.

## Tech stack

- **Vanilla JavaScript** (ES5-compatible IIFE for app code; ES module block for library imports).
- **[Prettier 3.3.3 Standalone](https://prettier.io/)** — HTML, CSS, JavaScript formatting.
- **[Prettier plugins](https://prettier.io/)** — `babel`, `estree`, `postcss`, `html`.
- **[sql-formatter 13.0.1](https://github.com/sql-formatter-org/sql-formatter)** — SQL formatting.
- **Clipboard API** (`navigator.clipboard.writeText`) with `execCommand('copy')` fallback.
- **Blob + URL.createObjectURL** — for downloads.
- **CSS custom properties** — for light/dark theming.

No npm dependencies for the app itself. No build step. The entire app is one HTML file plus four CDN library bundles.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy).

Powered by [Prettier](https://prettier.io/) and [sql-formatter](https://github.com/sql-formatter-org/sql-formatter). Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection.
