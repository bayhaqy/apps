# AI Prompt Formatter — Build Professional Mega-Prompts

A privacy-first, fully client-side prompt builder. Fill in a few simple fields (topic, audience, tone, length, format) and the app assembles a structured "mega-prompt" using a proven prompt-engineering framework. Copy it into ChatGPT, Claude, Gemini, Mistral, Llama, or any chat-based LLM. **100% client-side — no uploads, no servers, no tracking.**

🔗 **Live app:** <https://bayhaqy.my.id/apps/prompt-formatter/>

---

## Why use it?

Writing a great LLM prompt usually means remembering a structure, phrasing the persona, listing constraints, and formatting it all consistently. The AI Prompt Formatter turns that into four form fields: pick a framework, pick a persona, fill in the task, and copy the result. The output is a clean, section-structured mega-prompt that gives the model context, role, action, requirements, and examples — every time.

| | AI Prompt Formatter | Hand-writing prompts |
|---|---|---|
| Consistent structure | ✅ Always | ❌ Varies by mood |
| Persona library | ✅ 10 presets + custom | ❌ You write it each time |
| Token estimate | ✅ Live chars/4 | ❌ Guesswork |
| Save & reuse | ✅ Favorites in localStorage | ❌ Lost in chat history |
| Privacy | ✅ 100% local | ✅ Local |
| Cost | ✅ Free | ✅ Free |

---

## The 5 frameworks

Each framework is a proven structure for organising a prompt. Pick the one whose flow matches your task.

### 1. CARE — Context · Action · Result · Example
Gives the model the **Context** it needs, specifies the **Action** to take, defines the **Result** (requirements) you expect, and anchors quality with an **Example**. Best for everyday task-driven requests — blog posts, explanations, code generation, emails.

### 2. PREP — Point · Reason · Example · Point
Leads with the **Point**, backs it with a **Reason**, illustrates with an **Example**, then restates the **Point** as requirements. Best for persuasive writing, summaries, executive briefs, and any output that should land a clear takeaway.

### 3. RACE — Role · Action · Context · Expectation
Assigns a **Role**, defines the **Action**, provides **Context**, and sets clear **Expectations** for the deliverable. Best for role-and-context tasks with measurable acceptance criteria — specs, reports, analyses.

### 4. STAR — Situation · Task · Action · Result
Frames the prompt as a **Situation**, names the **Task**, describes the **Action** to take, and defines the desired **Result**. Best for scenario-based, behavioural, and case-driven prompts — interviews, case studies, troubleshooting guides.

### 5. CRISPE — Capacity · Role · Insight · Statement · Personality · Experiment
The most structured framework: **Capacity & Role**, **Insight** (context), **Statement** (the task), **Personality** (style requirements), and **Experiment** (examples to try). Best for complex, high-stakes prompts where you want maximum control over tone and exploration.

---

## Features

- **5 prompt frameworks** — CARE, PREP, RACE, STAR, CRISPE, each with its own section structure
- **10 preset personas + custom** — senior software engineer, marketing copywriter, data scientist, academic researcher, UX designer, financial analyst, product manager, patient teacher, DevOps engineer, or type your own
- **Live preview** — the mega-prompt assembles in real time as you type (debounced 200 ms)
- **Token estimate** — live chars/4 heuristic so you can stay under your model's context limit
- **7 tones, 7 output formats, 5 length presets** — professional/casual/persuasive/academic/friendly/authoritative/humorous; paragraph/bullet list/numbered steps/markdown article/JSON/table/code with comments; short/medium/long/detailed/no limit
- **Audience autocomplete** — beginners, experts, executives, students, general public (or type your own)
- **Chain-of-thought toggle** — adds "Think step by step before answering." when you want explicit reasoning
- **Copy / Download / Save** — copy to clipboard, download as `.txt`, or save to favorites
- **Favorites library** — save unlimited prompts (capped at 50 for storage safety) with name, framework badge, and timestamp; load, copy, or delete each one
- **Load sample** — one click pre-fills a realistic Kubernetes-for-beginners blog post example
- **Light/dark theme** — toggle in the header, persisted to `localStorage`
- **100% client-side** — no uploads, no tracking, no sign-up, works offline after first load
- **Mobile responsive** — two-column layout on desktop, stacked on mobile

---

## How to use

1. **Pick a framework & persona** — choose a prompt-engineering structure (CARE, PREP, RACE, STAR, or CRISPE) and a persona that matches the expertise you need. The persona preview shows the exact role line that will be injected.
2. **Fill in the fields** — type your topic (required), audience, tone, output format, and length. Add examples, constraints, or additional context to sharpen the output. Toggle chain-of-thought on if you want step-by-step reasoning.
3. **Watch the live preview** — the mega-prompt assembles itself in real time on the right, with a token estimate (chars ÷ 4) so you can stay under your model's limit.
4. **Copy, download, or save** — copy the prompt to your clipboard, download it as a `.txt` file, or save it to favorites for later reuse. Everything is stored locally in your browser.

> 💡 **Tip:** Use the "Load sample" button to see a fully filled-in example (a Kubernetes blog post for beginners, using CARE + patient teacher persona), then modify it to fit your own task.

---

## Running locally

The AI Prompt Formatter has zero build step and zero dependencies. You can run it in three ways:

### Option A — Open the file directly

```bash
git clone https://github.com/bayhaqy/apps.git
cd apps/prompt-formatter
# Just open index.html in any modern browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Option B — Serve it locally (recommended)

```bash
cd apps/prompt-formatter
python3 -m http.server 8080
# Then visit http://localhost:8080/
```

### Option C — Self-host

Copy the entire `prompt-formatter/` folder to any static web host (GitHub Pages, Netlify, Cloudflare Pages, nginx, Apache, S3, etc.). No server-side code is required.

---

## Project structure

```
prompt-formatter/
├── index.html          # The entire app (HTML + CSS + JS in one file, ~64 KB)
└── README.md           # This file
```

No external libraries, no CDN, no build step. The whole app is a single self-contained HTML file.

---

## How it works (technical)

The app is built around three simple mechanisms:

### 1. Form binding
Every input, select, textarea, and checkbox is bound to a `state` object via a single `bindField()` helper. On `input`/`change`, the helper writes the new value into `state[key]` and schedules a debounced re-render (200 ms). This means typing into the topic field updates the preview within 200 ms of the last keystroke — fast enough to feel instant, slow enough to avoid jank on long prompts.

### 2. Template engine
Each of the 5 frameworks has its own builder function (`buildCARE`, `buildPREP`, `buildRACE`, `buildSTAR`, `buildCRISPE`). A central `buildPrompt()` dispatcher picks the right one based on `state.framework`. Each builder:
- Reads the persona line (auto-wrapped as "You are a {description}." unless the description already starts with "You are" / "Act as"),
- Composes a context block (additional context + audience + tone, only the non-empty parts),
- Composes a requirements block (output format + length + constraints + optional chain-of-thought line),
- Stitches the sections together with `# Heading` markers, skipping empty optional sections.

If the topic field is empty, `buildPrompt()` returns an empty string and the preview shows a placeholder, disabling the copy/download/save buttons.

### 3. localStorage persistence
Two keys are used:
- `promptfmt-theme` — stores `"light"` or `"dark"`. An inline `<head>` script reads it **before** the body renders to prevent a theme flash on reload.
- `promptfmt-favorites` — a JSON array of favorite objects. Each favorite stores the **full form state** (framework, persona, all fields, CoT flag) plus the generated prompt text, a name, and a timestamp. This lets the "Load" button restore the form exactly as it was. Favorites are capped at 50 entries to avoid overflowing the ~5 MB localStorage quota.

The Clipboard API (`navigator.clipboard.writeText`) is used for copying, with a `document.execCommand('copy')` fallback for older browsers. Downloads use `Blob` + `URL.createObjectURL` + a synthetic `<a download>` click, with the object URL revoked after 1 second.

---

## Browser support

| Browser | Minimum version |
|---|---|
| Chrome / Edge | 105+ (for `:has()` selector) |
| Firefox | 121+ (for `:has()` selector) |
| Safari (desktop & iOS) | 15.4+ (for `:has()` selector) |
| Samsung Internet | 20+ |

Internet Explorer is **not** supported. The framework radio cards use the modern CSS `:has()` selector for the selected-state styling; on older browsers the cards still work (clicking selects the framework) but the highlighted border may not appear. The core prompt-building logic, clipboard, download, and favorites all work on any browser released in the last few years.

---

## Limitations

- **Token estimate is a heuristic.** The "tokens" count uses the common approximation of 4 characters per token (`Math.ceil(chars / 4)`). Actual token counts vary by tokenizer — GPT-4o, Claude 3.5, Gemini 1.5, and Llama 3 all tokenize differently, and non-English text typically uses more tokens per character. Treat the number as a ballpark, not an exact figure.
- **Favorites are device-bound.** They live in `localStorage` on the browser you saved them in. They are not synced across devices, and clearing your browser's site data will erase them. Export important prompts by downloading them as `.txt` files.
- **No prompt history/undo.** The app does not keep a history of every prompt you generate — only the ones you explicitly save. Use favorites or download for persistence.
- **Favorites cap.** To avoid hitting localStorage quota limits, favorites are capped at 50 entries. Delete old ones to make room.
- **No streaming or model calls.** This app builds prompts; it does not send them to any LLM. Paste the generated prompt into your model of choice yourself.

---

## Privacy

The AI Prompt Formatter does **not**:

- Upload your inputs or generated prompts anywhere
- Send any telemetry, analytics, or tracking pixels
- Set any cookies
- Make any network requests after the page loads (you can verify this in DevTools → Network)

The only things stored on your device are:
- `promptfmt-theme` — your light/dark preference
- `promptfmt-favorites` — your saved prompts (only if you click "Save to favorites")

Everything is visible in your browser's DevTools → Application → Local Storage. Clear it any time.

---

## Tech stack

- **Vanilla HTML/CSS/JS** — no framework, no build step, no dependencies, no external libraries
- **CSS custom properties** for light/dark theming
- **Web Storage API** (`localStorage`) for theme and favorites persistence
- **Clipboard API** (`navigator.clipboard`) for copy-to-clipboard, with `execCommand` fallback
- **Blob + URL.createObjectURL** for `.txt` downloads
- **`:has()` selector** for framework radio-card selected styling
- **Debounced input** (200 ms) for live preview updates

---

## License

Released under the **MIT License**. See the source code in this repository.

---

## Credits

Built by **Achmad Bayhaqy** — <https://bayhaqy.my.id/>

The five frameworks (CARE, PREP, RACE, STAR, CRISPE) are well-known prompt-engineering structures from the broader AI community. This app is an opinionated implementation of them — not affiliated with any specific LLM vendor.
