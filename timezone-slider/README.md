# Timezone & Meeting Slider

A small, dependency-free tool for finding a meeting time that works across timezones. Drag an hour slider at a reference city, see every other city's local clock, day shift, and a business-hours badge that tells you at a glance whether the slot is workable.

**Live:** https://bayhaqy.my.id/apps/timezone-slider/

## What it does

- A **reference city** dropdown (defaults to your browser's local timezone, detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`).
- An **hour slider** (0–23) that sets the wall-clock time at the reference city.
- A **grid of city cards** showing, for the current slider position:
  - City name and country flag emoji.
  - Local time at that city (12-hour, AM/PM).
  - Day shift relative to the reference — `Today`, `Tomorrow`, `Yesterday`, or `±N days`.
  - A business-hours badge: **green** (9am–6pm), **amber** (7–9am or 6–8pm), **gray** (otherwise).
- **Add city** — type a city name (e.g. `Bangkok`) or an IANA zone (e.g. `Asia/Bangkok`) and press Add. The dropdown is backed by `Intl.supportedValuesOf('timeZone')` when available (418 zones in modern browsers), with a curated fallback.
- **Copy meeting time** — copies a plain-text summary like `Monday 2:00 PM Jakarta / Monday 3:00 AM New York / Monday 8:00 AM London` to the clipboard.
- **Load sample** — if the city list is empty, adds 5 preset cities (Jakarta, Tokyo, London, New York, Sydney). If the list already has cities, adds any missing presets.
- No data is stored. No localStorage. No network requests. Pure computation.

## How DST is handled

All timezone math goes through `Intl.DateTimeFormat` with the `timeZone` option. The browser's timezone database (ICANN tzdata, updated with each browser release) handles DST transitions, historical offsets, and regional rules. **No offsets are hardcoded anywhere in the source.**

The only non-trivial piece is converting a *wall-clock* time at a reference zone into a UTC instant — needed because the slider expresses "14:00 in Jakarta", not "14:00 UTC". The conversion uses an iterative offset correction that converges in 3–4 iterations even across DST boundaries:

```js
function wallToUtc(zone, year, month0, day, hour, minute) {
  const wallAsUTC = Date.UTC(year, month0, day, hour, minute, 0);
  let t = wallAsUTC;
  for (let i = 0; i < 4; i++) {
    const offset = getOffsetMs(zone, new Date(t)); // via Intl.formatToParts
    t = wallAsUTC - offset;
  }
  return new Date(t);
}
```

## How to use

1. Drag the **Hour** slider to set the wall-clock time at your reference city. The reference defaults to your browser's local timezone.
2. Each city card shows the local time at that hour, the day shift relative to the reference, and a business-hours badge.
3. Green badge = working hours (9am–6pm). Amber = early/late edge (7–9am or 6–8pm). Gray = outside working hours. Use it to spot a slot that works for everyone.
4. Add more cities by typing a city name or IANA timezone (e.g. `Bangkok` or `Asia/Bangkok`) and pressing **Add**. Remove a city with the × on its card.
5. Click **Copy meeting time** to copy a plain-text summary to your clipboard.

## Tech

- Pure HTML, CSS, vanilla JS — no build step, no runtime dependencies.
- Single file (`index.html`), ~35 KB.
- All timezone math via `Intl.DateTimeFormat` / `Intl.supportedValuesOf`.
- Dark mode via `data-theme` attribute, persisted to `localStorage` under key `apps-theme`.
- System font stack throughout; `ui-monospace` for times and zone names.
- Country flags rendered from ISO 3166-1 alpha-2 codes via regional indicator symbol emoji.

## Sample API call (programmatic usage)

The core function converts a wall-clock time at any IANA zone into a UTC `Date`. You can use it standalone:

```js
// What UTC instant corresponds to 14:00 local in Jakarta on 2026-08-10?
const utc = wallToUtc("Asia/Jakarta", 2026, 7, 10, 14, 0);
// → Date (Mon Aug 10 2026 07:00:00 GMT+0000)

// Now format that instant in any other zone:
new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit", minute: "2-digit", hour12: true
}).format(utc);
// → "03:00 AM"
```

See `index.html` source for the full implementation of `wallToUtc`, `getOffsetMs`, `partsInTZ`, and `todayInTZ`.

## License

MIT — built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Source on [GitHub](https://github.com/bayhaqy/apps).
