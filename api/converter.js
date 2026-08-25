/**
 * Bayhaqy Apps API — Unit & Currency Converter module
 * Public, no-token, client-side JavaScript.
 *
 * Usage:
 *   import { convertUnit, fetchCurrencyRates, convertCurrency } from '/apps/api/converter.js';
 *   const r = convertUnit({ value: 1, from: 'm', to: 'ft', category: 'length' });
 *   const rates = await fetchCurrencyRates({ base: 'USD', apiSource: 'exchangerate.host' });
 */

// Unit conversion factors to base unit per category
var UNIT_FACTORS = {
  length: { base: 'm', units: { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, yd:0.9144, ft:0.3048, in:0.0254, nmi:1852 } },
  mass: { base: 'kg', units: { kg:1, g:0.001, mg:0.000001, t:1000, lb:0.45359237, oz:0.028349523125, st:6.35029318 } },
  volume: { base: 'l', units: { l:1, ml:0.001, m3:1000, gal_us:3.785411784, gal_uk:4.54609, qt:0.946352946, pt:0.473176473, cup:0.2365882365, floz:0.0295735296, tbsp:0.0147867648, tsp:0.00492892159 } },
  area: { base: 'm2', units: { m2:1, km2:1000000, cm2:0.0001, ha:10000, acre:4046.8564224, ft2:0.09290304, in2:0.00064516, mi2:2589988.110336 } },
  speed: { base: 'mps', units: { mps:1, kph:0.277778, mph:0.44704, fps:0.3048, knot:0.514444 } },
  time: { base: 's', units: { s:1, ms:0.001, min:60, h:3600, day:86400, week:604800, month:2629800, year:31557600 } },
  storage: { base: 'B', units: { B:1, KB:1024, MB:1048576, GB:1073741824, TB:1099511627776, KiB:1024, MiB:1048576, GiB:1073741824, TiB:1099511627776, bit:0.125, Kbit:125, Mbit:125000, Gbit:125000000 } }
};

// Shoe size conversion (EU as canonical)
var SHOE_SIZES = {
  EU: [38, 39, 40, 41, 42, 43, 44, 45, 46],
  US_M: [6, 7, 7.5, 8, 9, 10, 11, 12, 13],
  US_F: [7, 8, 8.5, 9, 10, 11, 12, 13, 14],
  UK: [5, 6, 6.5, 7, 8, 9, 10, 11, 12],
  CM: [24, 25, 25.5, 26, 27, 28, 29, 30, 31]
};

/**
 * Convert a value between units of the same category.
 * For temperature, use convertTemperature instead.
 * @param {Object} params
 * @param {number} params.value
 * @param {string} params.from - unit key
 * @param {string} params.to - unit key
 * @param {string} params.category - length | mass | volume | area | speed | time | storage | shoe
 * @returns {Object} { result, factor }
 */
function convertUnit(params) {
  var value = parseFloat(params.value);
  var from = params.from;
  var to = params.to;
  var cat = params.category;
  if (cat === 'temperature') return convertTemperature({ value: value, from: from, to: to });
  if (cat === 'shoe') return convertShoeSize({ value: value, from: from, to: to });
  var table = UNIT_FACTORS[cat];
  if (!table) throw new Error('Unknown category: ' + cat);
  if (!table.units[from]) throw new Error('Unknown source unit: ' + from);
  if (!table.units[to]) throw new Error('Unknown target unit: ' + to);
  // Convert to base, then to target
  var baseValue = value * table.units[from];
  var result = baseValue / table.units[to];
  var factor = table.units[from] / table.units[to];
  return { result: result, factor: factor };
}

/**
 * Convert temperature.
 * @param {Object} params - { value, from: 'C'|'F'|'K', to: 'C'|'F'|'K' }
 */
function convertTemperature(params) {
  var v = parseFloat(params.value);
  var from = params.from, to = params.to;
  var celsius;
  if (from === 'C') celsius = v;
  else if (from === 'F') celsius = (v - 32) * 5/9;
  else if (from === 'K') celsius = v - 273.15;
  else throw new Error('Unknown temperature unit: ' + from);
  var result;
  if (to === 'C') result = celsius;
  else if (to === 'F') result = celsius * 9/5 + 32;
  else if (to === 'K') result = celsius + 273.15;
  else throw new Error('Unknown temperature unit: ' + to);
  return { result: result, factor: null };
}

/**
 * Convert shoe size. Uses EU as the canonical index.
 * @param {Object} params - { value, from: 'EU'|'US_M'|'US_F'|'UK'|'CM', to: same }
 */
function convertShoeSize(params) {
  var v = parseFloat(params.value);
  var fromArr = SHOE_SIZES[params.from];
  var toArr = SHOE_SIZES[params.to];
  if (!fromArr || !toArr) throw new Error('Unknown shoe size system: ' + params.from + ' or ' + params.to);
  // Find closest index in source
  var closestIdx = 0, closestDiff = Infinity;
  for (var i = 0; i < fromArr.length; i++) {
    var diff = Math.abs(fromArr[i] - v);
    if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
  }
  return { result: toArr[closestIdx], factor: null, note: 'Approximate — shoe sizes vary by manufacturer' };
}

/**
 * Fetch latest currency rates from a free public API.
 * @param {Object} params
 * @param {string} [params.base] - base currency ISO code (default 'USD')
 * @param {string} [params.apiSource] - 'exchangerate.host' | 'open.er-api.com' (default 'exchangerate.host')
 * @returns {Promise<Object>} { base, date, rates: { EUR: 0.92, IDR: 15700, ... }, source }
 */
async function fetchCurrencyRates(params) {
  params = params || {};
  var base = params.base || 'USD';
  var source = params.apiSource || 'exchangerate.host';
  var url;
  if (source === 'open.er-api.com') url = 'https://open.er-api.com/v6/latest/' + base;
  else url = 'https://api.exchangerate.host/latest?base=' + base;
  var resp = await fetch(url);
  var data = await resp.json();
  var rates, date;
  if (source === 'open.er-api.com') { rates = data.rates; date = data.time_last_update_utc; }
  else { rates = data.rates; date = data.date; }
  return { base: base, date: date, rates: rates, source: source };
}

/**
 * Convert an amount from one currency to another using a rates object.
 * @param {Object} params
 * @param {number} params.amount
 * @param {string} params.from - ISO code (must be in rates or equal base)
 * @param {string} params.to - ISO code
 * @param {Object} params.rates - rates object from fetchCurrencyRates
 * @param {string} params.base - base currency the rates object uses
 */
function convertCurrency(params) {
  var amount = parseFloat(params.amount);
  var rates = params.rates;
  var base = params.base;
  var fromRate = params.from === base ? 1 : rates[params.from];
  var toRate = params.to === base ? 1 : rates[params.to];
  if (!fromRate) throw new Error('No rate for source currency: ' + params.from);
  if (!toRate) throw new Error('No rate for target currency: ' + params.to);
  var baseValue = amount / fromRate;
  return { result: baseValue * toRate, rate: toRate / fromRate };
}

export { convertUnit, convertTemperature, convertShoeSize, fetchCurrencyRates, convertCurrency, UNIT_FACTORS, SHOE_SIZES };
if (typeof module !== 'undefined' && module.exports) module.exports = { convertUnit, convertTemperature, convertShoeSize, fetchCurrencyRates, convertCurrency, UNIT_FACTORS, SHOE_SIZES };
