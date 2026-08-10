/**
 * Bayhaqy Apps API — Loan Calculator module
 * Public, no-token, client-side JavaScript.
 *
 * Usage:
 *   import { calculateLoan } from '/apps/api/loan-calculator.js';
 *   const r = calculateLoan({
 *     principal: 500000000,
 *     annualRate: 8.5,
 *     termMonths: 120,
 *     interestType: 'annuity', // 'flat' | 'annuity' | 'descending'
 *     startDate: '2026-01-01'
 *   });
 */

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function addMonths(date, months) {
  var d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Calculate loan amortization schedule.
 * @param {Object} params
 * @param {number} params.principal - loan amount
 * @param {number} params.annualRate - annual interest rate (percent, e.g., 8.5 for 8.5%)
 * @param {number} params.termMonths - term in months
 * @param {string} params.interestType - 'flat' | 'annuity' | 'descending'
 * @param {string} [params.startDate] - YYYY-MM-DD (default: today)
 * @returns {Object} { monthlyPayment, totalInterest, totalPayment, payoffDate, effectiveAnnualRate, schedule: [...] }
 */
function calculateLoan(params) {
  var P = params.principal;
  var r = (params.annualRate || 0) / 100 / 12;
  var n = params.termMonths;
  var type = params.interestType || 'annuity';
  var start = params.startDate ? new Date(params.startDate) : new Date();

  var schedule = [];
  var monthlyPayment, totalInterest, totalPayment;

  if (type === 'flat') {
    // Interest charged on original principal throughout
    var monthlyPrincipal = P / n;
    var monthlyInterest = P * r;
    monthlyPayment = monthlyPrincipal + monthlyInterest;
    var remaining = P;
    for (var i = 1; i <= n; i++) {
      var interestPortion = monthlyInterest;
      var principalPortion = monthlyPrincipal;
      remaining -= principalPortion;
      if (remaining < 0.01) remaining = 0;
      schedule.push({
        month: i,
        date: addMonths(start, i).toISOString().slice(0,10),
        payment: monthlyPayment,
        principal: principalPortion,
        interest: interestPortion,
        balance: remaining
      });
    }
    totalInterest = monthlyInterest * n;
  } else if (type === 'annuity') {
    // M = P * [r(1+r)^n] / [(1+r)^n - 1]
    if (r === 0) {
      monthlyPayment = P / n;
    } else {
      monthlyPayment = P * (r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
    }
    remaining = P;
    for (var j = 1; j <= n; j++) {
      var intPortion = remaining * r;
      var prinPortion = monthlyPayment - intPortion;
      remaining -= prinPortion;
      if (remaining < 0.01) remaining = 0;
      schedule.push({
        month: j,
        date: addMonths(start, j).toISOString().slice(0,10),
        payment: monthlyPayment,
        principal: prinPortion,
        interest: intPortion,
        balance: remaining
      });
    }
    totalInterest = monthlyPayment * n - P;
  } else if (type === 'descending') {
    // Equal principal payments, interest on remaining balance
    monthlyPrincipal = P / n;
    remaining = P;
    for (var k = 1; k <= n; k++) {
      var intP = remaining * r;
      var pay = monthlyPrincipal + intP;
      remaining -= monthlyPrincipal;
      if (remaining < 0.01) remaining = 0;
      schedule.push({
        month: k,
        date: addMonths(start, k).toISOString().slice(0,10),
        payment: pay,
        principal: monthlyPrincipal,
        interest: intP,
        balance: remaining
      });
    }
    totalInterest = schedule.reduce(function(s, row){ return s + row.interest; }, 0);
    monthlyPayment = schedule[0].payment; // first payment (highest)
  } else {
    throw new Error('Unknown interestType: ' + type + '. Use flat, annuity, or descending.');
  }

  totalPayment = P + totalInterest;
  var payoffDate = schedule.length ? schedule[schedule.length - 1].date : null;
  // Effective annual rate (EAR) from APR: (1 + r)^12 - 1
  var effectiveAnnualRate = (Math.pow(1 + r, 12) - 1) * 100;

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    payoffDate: payoffDate,
    effectiveAnnualRate: Math.round(effectiveAnnualRate * 100) / 100,
    scheduleCount: schedule.length,
    schedule: schedule
  };
}

export { calculateLoan };
if (typeof module !== 'undefined' && module.exports) module.exports = { calculateLoan };
