/**
 * Bayhaqy Apps API — Timezone Slider module
 * Public, no-token, client-side JavaScript.
 *
 * Usage:
 *   import { convertTimezone, listTimezones, findMeetingTime } from '/apps/api/timezone-slider.js';
 *   const r = convertTimezone({ fromCity: 'Asia/Jakarta', hour: 14, targetCity: 'America/New_York' });
 */

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function listTimezones() {
  if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
    try { return Intl.supportedValuesOf('timeZone'); } catch(e) {}
  }
  return [
    'Africa/Cairo','Africa/Johannesburg','America/Anchorage','America/Argentina/Buenos_Aires',
    'America/Chicago','America/Denver','America/Los_Angeles','America/Mexico_City','America/New_York',
    'America/Sao_Paulo','America/Toronto','Asia/Bangkok','Asia/Dubai','Asia/Hong_Kong','Asia/Jakarta',
    'Asia/Jerusalem','Asia/Kolkata','Asia/Seoul','Asia/Shanghai','Asia/Singapore','Asia/Tokyo',
    'Australia/Sydney','Europe/Amsterdam','Europe/Berlin','Europe/London','Europe/Moscow','Europe/Paris',
    'Pacific/Auckland','Pacific/Honolulu'
  ];
}

/**
 * Convert a reference hour in one timezone to the corresponding hour in a target timezone.
 * @param {Object} params
 * @param {string} params.fromCity - IANA timezone (e.g., 'Asia/Jakarta')
 * @param {number} params.hour - 0-23
 * @param {string} params.targetCity - IANA timezone
 * @returns {Object} { hour, dayOffset, dayLabel, time12h, isBusinessHours }
 */
function convertTimezone(params) {
  var fromTz = params.fromCity;
  var targetTz = params.targetCity;
  var hour = params.hour;
  // Construct a reference date today at the given hour in fromTz
  var today = new Date();
  var refIso = today.getFullYear() + '-' + pad(today.getMonth()+1) + '-' + pad(today.getDate()) + 'T' + pad(hour) + ':00:00';
  // Use Intl to figure out offset difference
  var fromFmt = new Intl.DateTimeFormat('en-US', { timeZone: fromTz, hour12: false, hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
  var tgtFmt = new Intl.DateTimeFormat('en-US', { timeZone: targetTz, hour12: false, hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
  // Build a UTC date that represents "hour in fromTz"
  // Get fromTz offset for today
  var fromParts = fromFmt.formatToParts(new Date(refIso));
  var fp = {};
  fromParts.forEach(function(p){ fp[p.type] = p.value; });
  // We want the UTC instant where fromTz shows hour:00 today
  // Brute-force: try refIso as UTC, then adjust
  var testDate = new Date(refIso + 'Z');
  var fromHourAtTest = parseInt(fromFmt.formatToParts(testDate).find(function(p){ return p.type === 'hour'; }).value, 10);
  var offsetHours = hour - fromHourAtTest;
  // If fromHourAtTest is 23 and we want 0, offset is -23 (or +1) — handle wrap
  if (offsetHours > 12) offsetHours -= 24;
  if (offsetHours < -12) offsetHours += 24;
  var utcInstant = new Date(testDate.getTime() + offsetHours * 3600000);
  // Now get target time
  var tgtParts = tgtFmt.formatToParts(utcInstant);
  var tp = {};
  tgtParts.forEach(function(p){ tp[p.type] = p.value; });
  var tgtHour = parseInt(tp.hour, 10);
  // Day offset: compare target date with fromTz date
  var fromDay = parseInt(fp.day, 10);
  var tgtDay = parseInt(tp.day, 10);
  var dayOffset = 0;
  if (tgtDay > fromDay) dayOffset = 1;
  else if (tgtDay < fromDay) dayOffset = -1;
  // 12h format
  var h12 = tgtHour % 12;
  if (h12 === 0) h12 = 12;
  var meridian = tgtHour < 12 ? 'AM' : 'PM';
  var isBusinessHours = tgtHour >= 9 && tgtHour < 18;
  return {
    hour: tgtHour,
    dayOffset: dayOffset,
    dayLabel: dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : 'Yesterday',
    time12h: h12 + ':00 ' + meridian,
    isBusinessHours: isBusinessHours
  };
}

/**
 * Find the best meeting hour (within business hours 9-18) for a set of cities.
 * @param {Object} params
 * @param {string} params.fromCity
 * @param {string[]} params.targetCities
 * @returns {Object} { bestHour, results: [{ city, hour, dayOffset, isBusinessHours }] }
 */
function findMeetingTime(params) {
  var fromTz = params.fromCity;
  var cities = params.targetCities;
  var bestHour = -1;
  var bestScore = -1;
  for (var h = 0; h < 24; h++) {
    var score = 0;
    cities.forEach(function(c){
      var r = convertTimezone({ fromCity: fromTz, hour: h, targetCity: c });
      if (r.isBusinessHours) score++;
    });
    if (score > bestScore) { bestScore = score; bestHour = h; }
  }
  var results = cities.map(function(c){
    return Object.assign({ city: c }, convertTimezone({ fromCity: fromTz, hour: bestHour, targetCity: c }));
  });
  return { bestHour: bestHour, businessHoursCovered: bestScore, totalCities: cities.length, results: results };
}

export { convertTimezone, listTimezones, findMeetingTime };
if (typeof module !== 'undefined' && module.exports) module.exports = { convertTimezone, listTimezones, findMeetingTime };
