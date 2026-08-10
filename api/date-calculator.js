/**
 * Bayhaqy Apps API — Date Calculator module
 * Public, no-token, client-side JavaScript.
 *
 * Usage:
 *   import { dateDifference, addDays, calculateAge, workdayCalculator } from '/apps/api/date-calculator.js';
 *   const r = dateDifference({ from: '2025-01-01', to: '2025-12-31', excludeWeekends: true });
 */

// Indonesian public holidays (fixed-date subset for 2025-2026)
var ID_HOLIDAYS = {
  '2025-01-01': 'New Year',
  '2025-01-29': 'Chinese New Year',
  '2025-03-31': 'Eid al-Fitr',
  '2025-04-01': 'Eid al-Fitr',
  '2025-04-18': 'Good Friday',
  '2025-05-01': 'Labour Day',
  '2025-05-29': 'Ascension Day',
  '2025-06-01': 'Pancasila Day',
  '2025-06-02': 'Eid al-Adha',
  '2025-08-17': 'Independence Day',
  '2025-12-25': 'Christmas',
  '2026-01-01': 'New Year',
  '2026-02-17': 'Chinese New Year',
  '2026-03-20': 'Eid al-Fitr',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Labour Day',
  '2026-05-14': 'Ascension Day',
  '2026-06-01': 'Pancasila Day',
  '2026-05-27': 'Eid al-Adha',
  '2026-08-17': 'Independence Day',
  '2026-12-25': 'Christmas'
};

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function parse(s) {
  var parts = s.split('-').map(Number);
  return new Date(parts[0], parts[1]-1, parts[2]);
}
function isWeekend(d) { var day = d.getDay(); return day === 0 || day === 6; }
function isHoliday(d) { return !!ID_HOLIDAYS[fmt(d)]; }

/**
 * Compute difference between two dates.
 * @param {Object} params
 * @param {string} params.from - YYYY-MM-DD
 * @param {string} params.to - YYYY-MM-DD
 * @param {boolean} [params.excludeWeekends]
 * @param {boolean} [params.excludeHolidays]
 * @returns {Object} { years, months, days, totalDays, totalWeeks, totalHours, totalMinutes, workdays }
 */
function dateDifference(params) {
  var a = parse(params.from);
  var b = parse(params.to);
  if (b < a) { var tmp = a; a = b; b = tmp; }
  // Calendar diff
  var years = b.getFullYear() - a.getFullYear();
  var months = b.getMonth() - a.getMonth();
  var days = b.getDate() - a.getDate();
  if (days < 0) { months--; var prevMonth = new Date(b.getFullYear(), b.getMonth(), 0); days += prevMonth.getDate(); }
  if (months < 0) { years--; months += 12; }
  var totalMs = b - a;
  var totalDays = Math.floor(totalMs / 86400000);
  var totalWeeks = Math.floor(totalDays / 7);
  var totalHours = Math.floor(totalMs / 3600000);
  var totalMinutes = Math.floor(totalMs / 60000);
  // Workdays
  var workdays = 0;
  if (params.excludeWeekends || params.excludeHolidays) {
    var cur = new Date(a);
    while (cur <= b) {
      var skip = false;
      if (params.excludeWeekends && isWeekend(cur)) skip = true;
      if (params.excludeHolidays && isHoliday(cur)) skip = true;
      if (!skip) workdays++;
      cur.setDate(cur.getDate() + 1);
    }
  }
  return { years: years, months: months, days: days, totalDays: totalDays, totalWeeks: totalWeeks, totalHours: totalHours, totalMinutes: totalMinutes, workdays: workdays };
}

/**
 * Add (or subtract) days/weeks/months/years to a date.
 * @param {Object} params
 * @param {string} params.date - YYYY-MM-DD
 * @param {number} params.amount - positive or negative
 * @param {string} params.unit - days | weeks | months | years
 * @returns {Object} { date: 'YYYY-MM-DD', dayOfWeek: 'Monday' }
 */
function addDays(params) {
  var d = parse(params.date);
  var n = params.amount || 0;
  var unit = params.unit || 'days';
  if (unit === 'days') d.setDate(d.getDate() + n);
  else if (unit === 'weeks') d.setDate(d.getDate() + n * 7);
  else if (unit === 'months') d.setMonth(d.getMonth() + n);
  else if (unit === 'years') d.setFullYear(d.getFullYear() + n);
  return { date: fmt(d), dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()] };
}

/**
 * Calculate age from birth date.
 * @param {Object} params
 * @param {string} params.birthDate - YYYY-MM-DD
 * @param {string} [params.asOf] - YYYY-MM-DD (default: today)
 * @returns {Object} { years, months, days, totalDays, totalHours, nextBirthday: 'YYYY-MM-DD', daysToNextBirthday, dayOfWeekBorn }
 */
function calculateAge(params) {
  var birth = parse(params.birthDate);
  var asOf = params.asOf ? parse(params.asOf) : new Date();
  asOf.setHours(0,0,0,0);
  var diff = dateDifference({ from: params.birthDate, to: fmt(asOf) });
  // Next birthday
  var nextBday = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBday < asOf) nextBday = new Date(asOf.getFullYear() + 1, birth.getMonth(), birth.getDate());
  var daysToNext = Math.floor((nextBday - asOf) / 86400000);
  return {
    years: diff.years,
    months: diff.months,
    days: diff.days,
    totalDays: diff.totalDays,
    totalHours: diff.totalHours,
    nextBirthday: fmt(nextBday),
    daysToNextBirthday: daysToNext,
    dayOfWeekBorn: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][birth.getDay()]
  };
}

/**
 * Compute end date after adding N workdays.
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {number} params.workdays
 * @param {boolean} [params.excludeHolidays]
 * @returns {Object} { endDate: 'YYYY-MM-DD', dayOfWeek, calendarDays }
 */
function workdayCalculator(params) {
  var cur = parse(params.startDate);
  var start = new Date(cur);
  var remaining = params.workdays;
  while (remaining > 0) {
    cur.setDate(cur.getDate() + 1);
    var skip = false;
    if (isWeekend(cur)) skip = true;
    if (params.excludeHolidays && isHoliday(cur)) skip = true;
    if (!skip) remaining--;
  }
  return {
    endDate: fmt(cur),
    dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][cur.getDay()],
    calendarDays: Math.floor((cur - start) / 86400000)
  };
}

export { dateDifference, addDays, calculateAge, workdayCalculator, ID_HOLIDAYS };
if (typeof module !== 'undefined' && module.exports) module.exports = { dateDifference, addDays, calculateAge, workdayCalculator, ID_HOLIDAYS };
