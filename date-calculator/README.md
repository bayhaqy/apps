# Advanced Date & Age Calculator

A focused, privacy-first date math tool. Four tabs cover the most common date arithmetic tasks: differences between two dates, adding or subtracting time, age and birthday computation, and workday projection with weekend and Indonesian holiday exclusions. All calculations use the native JavaScript `Date` object — no date libraries, no network requests.

**Live:** <https://bayhaqy.my.id/apps/date-calculator/>

## Features

- **Date Difference** — years, months, days, total days, total weeks, total hours and total minutes between two dates. Optional exclusion of weekends (Mon–Fri only) and Indonesian public holidays.
- **Add / Subtract** — project any date forward or backward by days, weeks, months or years. Month-end clamping handles edge cases (e.g. Jan 31 + 1 month → Feb 28).
- **Age Calculator** — exact age in years/months/days, day of week born, total days and hours lived, and next-birthday countdown.
- **Workday Projector** — add N business days to a start date, skipping weekends and the bundled Indonesian holiday list.
- **Load sample** button per tab — instantly fills realistic example data (e.g. birth date 1995-06-15).
- **Copy results** — plain-text summary copied to clipboard for pasting anywhere.
- **Dark mode** — persisted in `localStorage` under the key `apps-theme`.
- **Offline & private** — single HTML file, no external requests, no tracking.

## Indonesian public holidays

The holiday list is a small hardcoded set of fixed-date holidays for 2025 and 2026:

- New Year's Day — January 1
- Independence Day — August 17
- Christmas Day — December 25

Religious holidays (Eid al-Fitr, Nyepi, Vesak, Eid al-Adha, Ascension Day, Prophet's Birthday, Isra Mi'raj, Chinese New Year, Good Friday, etc.) are intentionally omitted because they follow lunar calendars and shift each year. A static list would quickly go stale. For those, use the manual date picker in the Age or Add/Subtract tab.

## How to use

1. Pick a tab — Date Difference, Add / Subtract, Age Calculator or Workday Projector.
2. Fill the date inputs (or click **Load sample** to pre-fill realistic example data).
3. Toggle exclusions like weekends or Indonesian holidays if the tab supports them.
4. Press **Calculate**. Results render in a grid with the high-value number highlighted in red.
5. Click **Copy results** to copy a plain-text summary to your clipboard.

## Tech

- Single static HTML file with inline CSS and JS — ~40 KB total, no build step.
- Native `Date` object for all math; no libraries.
- CSS custom properties drive a dark-mode theme via `[data-theme="dark"]`.
- System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`) for body, `ui-monospace` for code.
- Mobile-responsive grid layouts.

## Sample "API" call

This is a static page with no HTTP API. Internally the difference calculation can be called from the browser console as:

```js
// Compute difference between two dates, excluding weekends and holidays
document.querySelector('#diffFrom').value  = '2025-01-01';
document.querySelector('#diffTo').value    = '2025-12-31';
document.querySelector('#diffSkipHolidays').checked = true;
document.querySelector('#diffCalc').click();
// → reads the rendered grid from #diffOut
```

For programmatic use in your own project, the core algorithm is straightforward:

```js
function daysBetween(a, b) {
  const MS = 86400000;
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((b0 - a0) / MS);
}
```

## Author

Built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Source on [GitHub](https://github.com/bayhaqy/apps).
