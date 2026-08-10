# Bayhaqy Apps API

Public, no-token JavaScript API for every tool on [bayhaqy.my.id/apps/](https://bayhaqy.my.id/apps/).

**Live docs & playground:** <https://bayhaqy.my.id/apps/api/>

---

## Two ways to use it

### Option 1 — ES module import (browser or Node 18+)

Every tool's core logic is a standalone `.js` file under this folder. Import it, call the function, get the result. No token, no server, no rate limit.

```javascript
import { formatCode } from 'https://bayhaqy.my.id/apps/api/code-formatter.js';

const out = formatCode({
  language: 'sql',
  code: 'select * from users where id=1',
  keywordCase: 'upper'
});
// → "SELECT\n    *\nFROM\n    users\nWHERE\n    id = 1"
```

Works in `<script type="module">`, in Node with `--experimental-vm-modules`, in Deno, and in Bun.

### Option 2 — REST API via Cloudflare Worker

For non-browser clients (Python, Go, curl, mobile apps), deploy `worker-template.js` to Cloudflare Workers (free tier, 100k req/day). It exposes every function as an HTTPS endpoint with built-in rate limiting.

```bash
# Deploy
npm install -g wrangler
git clone https://github.com/bayhaqy/apps.git
cd apps/api
wrangler deploy

# Call it from anywhere
curl "https://your-worker.workers.dev/api/code-formatter?language=sql&code=select+*+from+users&keywordCase=upper"
```

Response:
```json
"SELECT\n    *\nFROM\n    users\nWHERE\n    id = 1"
```

## Available modules

| Module | Functions | Description |
|---|---|---|
| `code-formatter.js` | `formatCode`, `formatSql`, `formatPython`, `formatHtml`, `formatCss`, `formatJs` | Beautify SQL, Python, HTML, CSS, JS |
| `text-diff.js` | `diffText`, `cleanText`, `diffChars`, `diffWords`, `diffLines` | Word/line/char diff + text cleanup |
| `date-calculator.js` | `dateDifference`, `addDays`, `calculateAge`, `workdayCalculator` | Date math with weekend/holiday exclusion |
| `timezone-slider.js` | `convertTimezone`, `listTimezones`, `findMeetingTime` | IANA timezone conversion via `Intl.DateTimeFormat` |
| `loan-calculator.js` | `calculateLoan` | Flat / annuity / descending interest amortization |
| `converter.js` | `convertUnit`, `convertTemperature`, `convertShoeSize`, `fetchCurrencyRates`, `convertCurrency` | 9 unit categories + live currency |
| `qr-studio.js` | `formatWifi`, `formatEmail`, `formatSms`, `formatPhone`, `formatVCard`, `generateQrDataUrl` | QR content formatters + image generation |
| `worker-template.js` | — | Cloudflare Worker exposing all the above as REST endpoints |

## REST endpoints (Option 2)

Every endpoint accepts both `GET` (query params) and `POST` (JSON body). Response is always JSON.

| Endpoint | Parameters | Returns |
|---|---|---|
| `GET /api/code-formatter` | `language`, `code`, `indent`, `keywordCase` | formatted string |
| `POST /api/text-diff` | `original`, `modified`, `mode`, `ignoreCase`, `ignoreWhitespace` | `{ ops, stats, html }` |
| `POST /api/text-clean` | `text`, `rules{trimLines, collapseSpaces, ...}` | `{ result }` |
| `GET /api/date-diff` | `from`, `to` (YYYY-MM-DD), `excludeWeekends`, `excludeHolidays` | `{ years, months, days, totalDays, workdays, ... }` |
| `GET /api/date-add` | `date`, `amount`, `unit` | `{ date, dayOfWeek }` |
| `GET /api/age` | `birthDate`, `asOf` | `{ years, months, days, nextBirthday, ... }` |
| `GET /api/workday` | `startDate`, `workdays`, `excludeHolidays` | `{ endDate, calendarDays }` |
| `GET /api/timezone/list` | — | `{ timezones: [...] }` |
| `GET /api/timezone/convert` | `fromCity`, `hour`, `targetCity` | `{ hour, dayOffset, time12h, isBusinessHours }` |
| `POST /api/timezone/meeting` | `fromCity`, `targetCities[]` | `{ bestHour, results: [...] }` |
| `GET /api/loan` | `principal`, `annualRate`, `termMonths`, `interestType`, `startDate` | `{ monthlyPayment, totalInterest, schedule: [...] }` |
| `GET /api/convert` | `value`, `from`, `to`, `category` | `{ result, factor }` |
| `GET /api/currency/rates` | `base`, `apiSource` | `{ base, date, rates, source }` |
| `POST /api/currency/convert` | `amount`, `from`, `to`, `rates`, `base` | `{ result, rate }` |
| `GET /api/qr/wifi` | `ssid`, `password`, `encryption`, `hidden` | `{ text: "WIFI:T:WPA;S:...;P:...;;" }` |
| `GET /api/qr/vcard` | `name`, `phone`, `email`, `org`, `url` | `{ text: "BEGIN:VCARD..." }` |

## Rate limiting

- **Option 1 (browser module):** No limit. Runs in your browser.
- **Option 2 (REST API):** Default `60 requests/minute per IP`, configurable via the `RATE_LIMIT_PER_MIN` constant in `worker-template.js`. Uses a token-bucket algorithm. The bucket lives in-memory per Worker instance — for distributed accuracy, swap in Cloudflare KV or Durable Objects.

## Examples

### Python

```python
import requests

resp = requests.get('https://your-worker.workers.dev/api/loan', params={
    'principal': 500000000,
    'annualRate': 8.5,
    'termMonths': 120,
    'interestType': 'annuity',
    'startDate': '2026-01-01'
})
data = resp.json()
print(f"Monthly payment: Rp {data['monthlyPayment']:,.0f}")
print(f"Total interest:  Rp {data['totalInterest']:,.0f}")
print(f"Payoff date:      {data['payoffDate']}")
```

### Node.js (REST)

```javascript
const url = new URL('https://your-worker.workers.dev/api/timezone/convert');
url.searchParams.set('fromCity', 'Asia/Jakarta');
url.searchParams.set('hour', '14');
url.searchParams.set('targetCity', 'America/New_York');
const r = await fetch(url);
const data = await r.json();
console.log(`14:00 in Jakarta = ${data.time12h} in New York (${data.dayLabel})`);
```

### Browser (ES module)

```html
<script type="module">
  import { calculateAge } from 'https://bayhaqy.my.id/apps/api/date-calculator.js';
  const age = calculateAge({ birthDate: '1995-06-15' });
  console.log(`You are ${age.years} years, ${age.months} months, ${age.days} days old.`);
  console.log(`Next birthday in ${age.daysToNextBirthday} days.`);
</script>
```

## License

MIT. Use it, fork it, deploy it, sell it — no attribution required (but appreciated).

## Issues & feature requests

<https://github.com/bayhaqy/apps/issues>
