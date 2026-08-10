# CSS Grid & Flexbox Playground

A small, dependency-free workbench for the two layout systems you actually use: CSS Grid and Flexbox. Move the controls, watch the boxes rearrange, and copy the generated CSS straight into your project.

**Live:** https://bayhaqy.my.id/apps/css-playground/

## What it does

- Toggle between **Grid** and **Flexbox** modes via a segmented control.
- Adjust the layout with plain HTML inputs — no custom UI library, no inline `style=""` guessing.
- See a live preview of 1–20 numbered child boxes that respond to every property change.
- Read the **generated CSS** in a syntax-highlighted panel and copy it with one click.
- In Flexbox mode, click any child to apply a custom `flex` shorthand to just that item.

### Controls — Grid mode

- `grid-template-columns`, `grid-template-rows`
- `gap` (with px / rem / em unit selector)
- `justify-items`, `align-items`
- `justify-content`, `align-content`

### Controls — Flexbox mode

- `flex-direction`, `flex-wrap`
- `justify-content`, `align-items`
- `gap` (with unit selector)
- Per-child `flex` shorthand — apply to all children, or to a single selected child (click a box to select it)

### Sample layouts

- **Grid sample:** 6 children, `repeat(3, 1fr)` columns, `space-between` justification — a 3-column card grid.
- **Flexbox sample:** 4 children, row direction, `space-between` justification, `center` alignment — a navbar pattern.

## How to use

1. Pick a layout mode at the top — **Grid** for 2D row/column layouts, **Flexbox** for 1D distributions.
2. Drag the **Children** slider to add or remove numbered boxes. In Flexbox mode, click a box to select it for per-child styling.
3. Adjust properties in the right panel. The preview updates instantly and the generated CSS at the bottom reflects every change.
4. Hit **Load sample** to try a preset layout.
5. Use **Copy** to grab the CSS. **Reset** clears everything back to defaults.

## Tech

- Pure HTML, CSS, vanilla JS — no build step, no runtime dependencies.
- Single file (`index.html`), ~36 KB.
- Dark mode via `data-theme` attribute, persisted to `localStorage` under key `apps-theme`.
- System font stack throughout; `ui-monospace` for code.
- Works offline (no network requests).

## Exported layout config

The current layout can be represented as a plain JS object — useful if you want to save presets or restore a layout later. The shape mirrors the in-app state:

```js
// Example: 3-column card grid
const layout = {
  mode: "grid",
  childCount: 6,
  grid: {
    "grid-template-columns": "repeat(3, 1fr)",
    "grid-template-rows": "auto",
    "gap": "12px",
    "justify-items": "stretch",
    "align-items": "stretch",
    "justify-content": "space-between",
    "align-content": "start"
  }
};

// Apply it to an element:
const el = document.querySelector(".container");
Object.entries(layout.grid).forEach(([prop, val]) => {
  el.style.setProperty(prop, val);
});
```

## License

MIT — built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Source on [GitHub](https://github.com/bayhaqy/apps).
