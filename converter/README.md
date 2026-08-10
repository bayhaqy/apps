# Unit & Currency Converter with Offline Cache

A free, private, offline-friendly converter for everyday units (length, mass, temperature, volume, area, speed, time, digital storage, shoe size) and 20 world currencies. Currency rates are fetched once from a free public API and cached in your browser, so conversions keep working when you go offline. Everything runs 100% client-side — no tracking, no uploads.

**Live:** <https://bayhaqy.my.id/apps/converter/>

---

## Features

### Units
- **9 categories** — Length, Mass, Temperature, Volume, Area, Speed, Time, Digital Storage, and Shoe Size (EU / US / UK).
- **Live conversion** with the formula or conversion factor shown beneath the result (e.g. `1 m × 3.28084 = 3.28084 ft`).
- **Temperature** uses exact C/F/K formulas, not linear factors, so `100 °C → 212 °F` and `300 K → 80.33 °F` are correct.
- **Digital storage** distinguishes decimal (KB = 1000 B) and binary (KiB = 1024 B) units.
- **Shoe sizes** use an adult conversion table anchored on `EU 38 ≈ US 6 ≈ UK 5`; half-sizes interpolate linearly.
- **Swap button** exchanges the two units and carries the result back into the input field.

### Currency
- **20 currencies** — USD, IDR, EUR, GBP, JPY, SGD, AUD, CNY, MYR, INR, CAD, CHF, HKD, NZD, SEK, KRW, THB, AED, BRL, ZAR.
- **Live rates** fetched from `https://api.exchangerate.host/latest?base=USD` with a fallback to `https://open.er-api.com/v6/latest/USD`. Both are free, keyless, public APIs.
- **Offline cache** — on a successful fetch, the rates object and a timestamp are stored in `localStorage` under the key `currency-rates`. If a later refresh fails (or you are offline), the converter falls back to the cached rates and shows how old they are (e.g. “cached 5 hours ago”).
- **Rate display** — the exact rate used is shown both directions: `1 USD = 15,234 IDR` and `1 IDR = 0.0000657 USD`.
- **Locale-aware formatting** — IDR and JPY show no decimals; other currencies use 2 decimals with the right locale grouping.

### Shared
- **Session history** — the last 10 conversions are listed at the bottom for the current tab. This is in-memory only and is not persisted; closing the tab clears it.
- **Load sample** — one click fills `1 m → ft` on the Units tab, or `100 USD → IDR` on the Currency tab.
- **Dark mode** with a toggle persisted in `localStorage` under `apps-theme`.

## How to use

1. **Pick a tab** — *Units* or *Currency*.
2. **Units:** choose a category, type a value, and select the *from* and *to* units. The result and the conversion factor update live. Use the circular arrow to swap.
3. **Currency:** press **Refresh rates** once to fetch live exchange rates. The rates and a timestamp are cached in your browser so the converter keeps working offline.
4. **Offline:** if a refresh fails, the converter falls back to the last cached rates and shows how old they are.
5. **History** at the bottom keeps your last 10 conversions for the current session. It is not saved — close the tab and it clears.

## Offline cache strategy

```
                ┌─────────────────────────────────────────────┐
                │            Refresh rates button             │
                └────────────────────┬────────────────────────┘
                                     ▼
                   fetch exchangerate.host/latest?base=USD
                                     │
                          success?   ├── yes ──► store {rates, ts} in
                                     │             localStorage["currency-rates"]
                                     │             status: "Rates cached N ago"
                                     │
                                     no (network/HTTP error)
                                     ▼
                   fetch open.er-api.com/v6/latest/USD  (fallback)
                                     │
                          success?   ├── yes ──► (same as above)
                                     │
                                     no
                                     ▼
                   use existing localStorage cache (if any)
                   status: "Using cached rates (N hours ago)"
                                     │
                          no cache?  ├──► status: "Offline and no cached rates"
```

On first visit with no cache, the app attempts a silent background fetch so the user does not have to press *Refresh* manually. The cache is keyed `currency-rates` and stores `{base:"USD", rates:{...}, ts:<epoch ms>}`. Rates older than 24 hours are flagged as “may be outdated”.

## Running locally

The app is a single self-contained HTML file — all CSS and JavaScript are inline, with no external dependencies (rates are fetched at runtime from public APIs).

**Option 1 — open the file**

Double-click `index.html`. It runs via `file://`. Currency fetch requires network access; offline mode uses the cache.

**Option 2 — local server**

```bash
cd converter
python3 -m http.server 8080
# open http://localhost:8080/
```

**Option 3 — static host**

Drop the `index.html` file onto any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). No backend required.

## Project structure

```
converter/
├── index.html     # single self-contained app (HTML + CSS + JS inline)
└── README.md      # this file
```

## Sample API call

The currency rates come from a free, keyless public API. A direct `curl` looks like:

```bash
curl 'https://open.er-api.com/v6/latest/USD'
```

Response (truncated):

```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_update_utc": "Sat, 10 Jan 2026 00:00:01 +0000",
  "rates": {
    "USD": 1,
    "IDR": 15234.0,
    "EUR": 0.9123,
    "JPY": 142.5,
    "...": "..."
  }
}
```

The converter stores this object verbatim (with a timestamp) in `localStorage["currency-rates"]`. To convert an amount `X` from currency `A` to currency `B`:

```js
// rates are USD-based: 1 USD = rates[A] units of A
var usdAmount = X / rates[A];
var result    = usdAmount * rates[B];
```

## Tech stack

- **Vanilla JavaScript** (IIFE, no framework, no bundler, no transpilation).
- **Fetch API** for currency rates, with sequential URL fallback.
- **localStorage** for the offline rate cache and the theme preference.
- **Intl.NumberFormat** for locale-aware currency formatting.
- **Inline SVG** for the swap icon — no icon library.
- **CSS custom properties** for light/dark theming.

No npm dependencies. No build step. The only network requests are to the two public exchange-rate APIs.

## Privacy

- **No uploads.** All conversion math runs on your device.
- **No tracking.** No analytics, no third-party scripts beyond the two rate APIs.
- **Minimal persistence.** Only two `localStorage` keys: `apps-theme` (light/dark) and `currency-rates` (cached rates + timestamp). Your conversion inputs and history are not saved.
- **Cache inspection.** Open DevTools → Application → Local Storage to see exactly what is stored; you can clear it any time.

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| Unit conversion | ✅ | ✅ | ✅ | ✅ |
| Currency fetch (Fetch API) | ✅ | ✅ | ✅ | ✅ |
| Offline cache (localStorage) | ✅ | ✅ | ✅ | ✅ |
| Currency formatting (Intl) | ✅ | ✅ | ✅ | ✅ |
| Light/dark theme | ✅ | ✅ | ✅ | ✅ |

Recommended: the latest version of Chrome, Edge, or Firefox. Internet Explorer is not supported. Currency fetch requires a network connection on first use; thereafter the cache works offline.

## Limitations

- **Exchange-rate accuracy.** Public free APIs update once per day; rates are indicative, not for trading. Always confirm with your bank or broker for actual transactions.
- **Shoe sizes are approximate.** Sizing varies by manufacturer and by men’s/women’s/children’s lasts; the converter uses a single adult table.
- **Storage units.** Decimal (KB/MB/GB) and binary (KiB/MiB/GiB) units are kept separate on purpose; mixing them (e.g. `1 MB → MiB`) yields `0.95367` rather than `1`, which is correct.
- **Session-only history.** The recent-conversions list is in-memory and clears on reload. This is intentional (privacy: nothing is stored about what you converted).
- **No custom currencies.** The 20 supported codes are fixed. Adding more requires editing the `CURRENCIES` array in the source.

## License

MIT License. See [LICENSE](https://github.com/bayhaqy/apps/blob/main/LICENSE) for details.

## Credits

Built by **Achmad Bayhaqy** — [portfolio](https://bayhaqy.my.id/), [GitHub](https://github.com/bayhaqy). Exchange rates from [exchangerate.host](https://exchangerate.host/) and [open.er-api.com](https://www.exchangerate-api.com/). Part of the [Bayhaqy Apps](https://bayhaqy.my.id/apps/) collection.
