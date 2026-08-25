# Loan, Mortgage & Interest Calculator

A free, private, offline loan calculator that computes the monthly payment, total interest, effective annual rate and a full amortization schedule for three common interest types: **flat**, **effective annuity** (equal payments) and **effective descending** (fixed principal). Includes an inline SVG chart and CSV/print export. Everything runs 100% in your browser — no uploads, no tracking.

**Live:** <https://bayhaqy.my.id/apps/loan-calculator/>

---

## Features

- **Three interest models** — Effective (Annuity), Effective (Descending) and Flat, each with the correct payment formula and amortization.
- **Multi-currency** — IDR (default), USD, EUR, GBP, JPY, SGD, or a custom no-symbol mode. Amounts are formatted with the right locale and decimal places.
- **Flexible term** — enter the term in years or months via a segmented toggle.
- **Summary panel** — monthly payment (prominent), total interest, total payment, payoff date and the **effective annual rate** computed from the actual payment cash-flow stream (so flat-rate loans show their true cost).
- **Inline SVG chart** — stacked bars of principal vs interest per month, sampled to ~60 bars for readability. No external chart library.
- **Amortization schedule** — scrollable table with three views: first 12 months, yearly summary, and all rows. Sticky header.
- **Export** — download the full schedule as CSV, or print a paper-friendly version (the form, chart and toggles are hidden in print mode).
- **Sample data** — one click loads Rp 500,000,000 at 8.5% for 10 years (annuity) so you can see it work instantly.

## How to use

1. **Enter the loan amount** and pick a currency. The amount field accepts plain numbers (e.g. `500000000`); a formatted preview appears below it.
2. **Set the annual interest rate** as a percentage (e.g. `8.5` for 8.5%) and the loan term in years or months.
3. **Choose the interest type.** Annuity = equal payments (standard mortgage). Descending = fixed principal each month. Flat = interest on the original principal for the whole term.
4. **Press Calculate** to see the monthly payment, totals, payoff date, effective annual rate, a chart and the full amortization table. Toggle the table between first 12, yearly summary, and all rows.
5. **Export** the schedule as CSV for spreadsheets, or press *Print* for a paper copy.

Press **Load sample** at any time to fill the form with the example above.

## Formulas

With `r = annualRate / 12` (monthly rate) and `n = total months`:

- **Annuity**: `M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1)`. Each payment splits into interest on the remaining balance and principal; the split shifts from interest-heavy to principal-heavy over time.
- **Descending**: `principal = P / n` (fixed), `interest = remaining_balance · r`. Payments start high and decrease.
- **Flat**: `M = P/n + P · r`. Interest is charged on the *original* principal every month, so total interest is fixed regardless of how much has been repaid.
- **Effective annual rate (EAR)**: `(1 + IRR_monthly)¹² − 1`, where `IRR_monthly` is solved numerically (bisection) from the payment cash-flow stream `[+P, −M₁, −M₂, …, −Mₙ]`. For annuity and descending loans this equals the nominal compounded rate; for flat loans it is noticeably higher, which is why flat-rate advertising can be misleading.

## Running locally

The app is a single self-contained HTML file — all CSS and JavaScript are inline, with no external dependencies.

**Option 1 — open the file**

Double-click `index.html`. It runs via `file://`.

**Option 2 — local server**

```bash
cd loan-calculator
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — static host**

Drop the `index.html` file onto any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). No backend required.

## Project structure

```
loan-calculator/
├── index.html     # single self-contained app (HTML + CSS + JS inline)
└── README.md      # this file
```

## Sample API call (programmatic use)

The calculation logic lives in the inline `compute()` function. If you want to call the same math from your own script, the core annuity formula is:

```js
// P = principal, annualRate = percent, months = term in months
function annuityPayment(P, annualRate, months) {
  var r = annualRate / 100 / 12;
  if (r === 0) return P / months;
  return P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

annuityPayment(500000000, 8.5, 120);
// => 6199284.44  (≈ Rp 6,199,284 / month)
```

For a full schedule, copy the `compute()` IIFE from the page source — it returns `{schedule, monthly, totalInterest, totalPayment, payoffDate, ear, n, itype}`.

## Tech stack

- **Vanilla JavaScript** (IIFE, no framework, no bundler, no transpilation).
- **Inline SVG** for the principal-vs-interest chart — no Chart.js, keeps the file under 35 KB.
- **Intl.NumberFormat** for locale-aware currency formatting.
- **Blob + URL.createObjectURL** for CSV download.
- **CSS custom properties** for light/dark theming; preference persisted in `localStorage` under `apps-theme`.

No npm dependencies. No build step. No network requests.

## Privacy

- **No uploads.** All math runs on your device.
- **No tracking.** No analytics, no third-party scripts.
- **No persistence.** The only `localStorage` key used is `apps-theme` (light/dark preference). Your loan inputs are not saved.

## Browser support

Works in the latest Chrome, Edge, Firefox and Safari. Internet Explorer is not supported. The CSV download, date picker and `Intl.NumberFormat` currency formatting all require a modern browser.

## Limitations

- **No fees or insurance.** Real mortgages often include administrative fees, insurance and taxes — this calculator models interest only.
- **Fixed rate only.** Variable-rate / floating loans are not supported; re-run the calculation if your rate changes.
- **Month-aligned dates.** Payment dates advance by calendar month from the start date, ignoring day-count conventions (30/360, actual/365, etc.).
- **Max 1,200 months (100 years).** Beyond that the UI refuses to compute to keep the table and chart responsive.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy). Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection.
