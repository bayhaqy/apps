/**
 * Cloudflare Worker template — Bayhaqy Apps REST API
 *
 * Deploy this to Cloudflare Workers (free tier: 100k requests/day) to expose
 * all Bayhaqy Apps as a public, no-auth REST API with rate limiting.
 *
 * Deploy steps:
 *   1. npm create cloudflare@latest bayhaqy-api
 *   2. Paste this file as src/index.js
 *   3. Run `npm run deploy` (wrangler will guide you)
 *   4. Your API base URL will be https://bayhaqy-api.<your-subdomain>.workers.dev
 *
 * Rate limit: 60 req/min per IP (configurable via RATE_LIMIT env var)
 *
 * Example calls:
 *   GET  https://your-worker.workers.dev/api/code-formatter?language=sql&code=select+*+from+users&keywordCase=upper
 *   POST https://your-worker.workers.dev/api/text-diff  {"original":"...","modified":"...","mode":"word"}
 *   GET  https://your-worker.workers.dev/api/timezone/convert?from=Asia/Jakarta&hour=14&to=America/New_York
 *   GET  https://your-worker.workers.dev/api/loan?principal=500000000&annualRate=8.5&termMonths=120&type=annuity
 *   GET  https://your-worker.workers.dev/api/date-diff?from=2025-01-01&to=2025-12-31&excludeWeekends=true
 *   GET  https://your-worker.workers.dev/api/convert?value=1&from=m&to=ft&category=length
 */

// === Paste the contents of each api/*.js file below (without the export lines) ===
// For brevity, only the formatter + diff + date + timezone + loan + converter + qr modules are inlined.
// In production, bundle them with esbuild or webpack.

import { formatCode } from './code-formatter.js';
import { diffText, cleanText } from './text-diff.js';
import { dateDifference, addDays, calculateAge, workdayCalculator } from './date-calculator.js';
import { convertTimezone, listTimezones, findMeetingTime } from './timezone-slider.js';
import { calculateLoan } from './loan-calculator.js';
import { convertUnit, convertTemperature, convertShoeSize, fetchCurrencyRates, convertCurrency } from './converter.js';
import { formatWifi, formatEmail, formatSms, formatPhone, formatVCard } from './qr-studio.js';

// === Rate limiter (token bucket per IP, stored in Cloudflare KV or Durable Object) ===
// Simple in-memory version (per-worker-instance, resets on cold start). For production
// accuracy, use Cloudflare KV or Durable Objects.

const RATE_LIMIT_PER_MIN = 60;
const buckets = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;
  if (!buckets.has(ip)) buckets.set(ip, []);
  const hits = buckets.get(ip).filter(t => now - t < windowMs);
  if (hits.length >= RATE_LIMIT_PER_MIN) return false;
  hits.push(now);
  buckets.set(ip, hits);
  return true;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-RateLimit-Limit': RATE_LIMIT_PER_MIN,
      'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_PER_MIN - (buckets.get(getIpFromRequest) || []).length)
    }
  });
}

function getIpFromRequest(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

function parseQuery(url) {
  const params = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  return params;
}

async function handleRequest(request) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });

  const ip = getIpFromRequest(request);
  if (!checkRateLimit(ip)) {
    return json({ error: 'Rate limit exceeded', message: 'Maximum ' + RATE_LIMIT_PER_MIN + ' requests per minute. Try again shortly.' }, 429);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const query = parseQuery(url);
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch(e) { return json({ error: 'Invalid JSON body' }, 400); }
  }

  try {
    switch (path) {
      case 'code-formatter':
        return json(formatCode(request.method === 'POST' ? body : query));
      case 'text-diff':
        return json(diffText(request.method === 'POST' ? body : query));
      case 'text-clean':
        return json({ result: cleanText(request.method === 'POST' ? body : query) });
      case 'date-diff':
        return json(dateDifference(request.method === 'POST' ? body : query));
      case 'date-add':
        return json(addDays(request.method === 'POST' ? body : query));
      case 'age':
        return json(calculateAge(request.method === 'POST' ? body : query));
      case 'workday':
        return json(workdayCalculator(request.method === 'POST' ? body : query));
      case 'timezone/convert':
        return json(convertTimezone(request.method === 'POST' ? body : query));
      case 'timezone/list':
        return json({ timezones: listTimezones() });
      case 'timezone/meeting':
        return json(findMeetingTime(request.method === 'POST' ? body : query));
      case 'loan':
        return json(calculateLoan(request.method === 'POST' ? body : query));
      case 'convert': {
        const params = request.method === 'POST' ? body : query;
        if (params.category === 'temperature') return json(convertTemperature(params));
        if (params.category === 'shoe') return json(convertShoeSize(params));
        return json(convertUnit(params));
      }
      case 'currency/rates':
        return json(await fetchCurrencyRates(request.method === 'POST' ? body : query));
      case 'currency/convert':
        return json(convertCurrency(request.method === 'POST' ? body : query));
      case 'qr/wifi':
        return json({ text: formatWifi(request.method === 'POST' ? body : query) });
      case 'qr/email':
        return json({ text: formatEmail(request.method === 'POST' ? body : query) });
      case 'qr/sms':
        return json({ text: formatSms(request.method === 'POST' ? body : query) });
      case 'qr/phone':
        return json({ text: formatPhone(request.method === 'POST' ? body : query) });
      case 'qr/vcard':
        return json({ text: formatVCard(request.method === 'POST' ? body : query) });
      case '':
        return json({
          name: 'Bayhaqy Apps API',
          version: '1.0.0',
          endpoints: [
            'GET/POST /api/code-formatter',
            'GET/POST /api/text-diff',
            'GET/POST /api/text-clean',
            'GET/POST /api/date-diff',
            'GET/POST /api/date-add',
            'GET/POST /api/age',
            'GET/POST /api/workday',
            'GET /api/timezone/list',
            'GET/POST /api/timezone/convert',
            'GET/POST /api/timezone/meeting',
            'GET/POST /api/loan',
            'GET/POST /api/convert',
            'GET /api/currency/rates',
            'GET/POST /api/currency/convert',
            'GET/POST /api/qr/wifi',
            'GET/POST /api/qr/email',
            'GET/POST /api/qr/sms',
            'GET/POST /api/qr/phone',
            'GET/POST /api/qr/vcard'
          ],
          rateLimit: RATE_LIMIT_PER_MIN + ' requests per minute per IP',
          docs: 'https://bayhaqy.my.id/apps/api/'
        });
      default:
        return json({ error: 'Not found', path: path }, 404);
    }
  } catch (e) {
    return json({ error: e.name || 'Error', message: e.message }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};
