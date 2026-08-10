/**
 * Bayhaqy Apps API — Text Diff module
 * Public, no-token, client-side JavaScript.
 *
 * Usage:
 *   import { diffText, cleanText } from '/apps/api/text-diff.js';
 *   const result = diffText({ original: 'hello world', modified: 'hello there world', mode: 'word' });
 *   // result = { ops: [...], stats: { added: 1, removed: 0, similarity: 0.83 }, html: '...' }
 *
 *   const cleaned = cleanText({ text: '  hello   world  \n\n\n  ', rules: { trimLines: true, collapseSpaces: true, removeEmptyLines: true } });
 */

// Lightweight diff implementation (Myers-like via LCS DP for small inputs)
function diffChars(a, b) {
  var n = a.length, m = b.length;
  var dp = [];
  for (var i = 0; i <= n; i++) { dp.push(new Array(m+1).fill(0)); }
  for (i = n-1; i >= 0; i--) {
    for (var j = m-1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i+1][j+1] + 1;
      else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  var ops = [];
  i = 0; j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: 'equal', value: a[i] }); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { ops.push({ type: 'delete', value: a[i] }); i++; }
    else { ops.push({ type: 'insert', value: b[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'delete', value: a[i++] }); }
  while (j < m) { ops.push({ type: 'insert', value: b[j++] }); }
  return ops;
}

function diffWords(a, b, ignoreCase, ignoreWhitespace) {
  function tokenize(s) {
    var tokens = [];
    var re = /(\s+|\w+|[^\s\w]+)/g;
    var m;
    while ((m = re.exec(s)) !== null) tokens.push(m[0]);
    return tokens;
  }
  var atoks = tokenize(a);
  var btoks = tokenize(b);
  if (ignoreCase) { atoks = atoks.map(function(t){ return t.toLowerCase(); }); btoks = btoks.map(function(t){ return t.toLowerCase(); }); }
  if (ignoreWhitespace) { atoks = atoks.filter(function(t){ return !/^\s+$/.test(t); }); btoks = btoks.filter(function(t){ return !/^\s+$/.test(t); }); }
  var ops = diffChars(atoks.join('\u0001'), btoks.join('\u0001'));
  // Re-tokenize back
  return ops.map(function(op){
    var parts = op.value.split('\u0001').filter(function(p){ return p !== ''; });
    return { type: op.type, value: parts.join('') };
  }).filter(function(op){ return op.value !== ''; });
}

function diffLines(a, b) {
  var al = a.split('\n');
  var bl = b.split('\n');
  var ops = diffChars(al.join('\u0001'), bl.join('\u0001'));
  return ops.map(function(op){
    var parts = op.value.split('\u0001').filter(function(p){ return p !== ''; });
    return { type: op.type, value: parts.join('\n') };
  }).filter(function(op){ return op.value !== ''; });
}

function computeStats(ops) {
  var added = 0, removed = 0, equal = 0;
  ops.forEach(function(op){
    var len = op.value.length;
    if (op.type === 'insert') added += len;
    else if (op.type === 'delete') removed += len;
    else equal += len;
  });
  var total = added + removed + equal;
  var similarity = total === 0 ? 1 : equal / total;
  return { added: added, removed: removed, equal: equal, similarity: Math.round(similarity * 1000) / 1000 };
}

function opsToHtml(ops) {
  var html = '';
  ops.forEach(function(op){
    var escaped = op.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (op.type === 'equal') html += '<span class="eq">' + escaped + '</span>';
    else if (op.type === 'insert') html += '<span class="ins">' + escaped + '</span>';
    else if (op.type === 'delete') html += '<span class="del">' + escaped + '</span>';
  });
  return html;
}

/**
 * Compute diff between two texts.
 * @param {Object} params
 * @param {string} params.original
 * @param {string} params.modified
 * @param {string} [params.mode] - 'word' | 'line' | 'char' (default: 'word')
 * @param {boolean} [params.ignoreCase]
 * @param {boolean} [params.ignoreWhitespace]
 * @returns {{ ops: Array, stats: Object, html: string }}
 */
function diffText(params) {
  var a = params.original || '';
  var b = params.modified || '';
  var mode = params.mode || 'word';
  var ops;
  if (mode === 'char') ops = diffChars(a, b);
  else if (mode === 'line') ops = diffLines(a, b);
  else ops = diffWords(a, b, params.ignoreCase, params.ignoreWhitespace);
  return { ops: ops, stats: computeStats(ops), html: opsToHtml(ops) };
}

/**
 * Clean text per specified rules.
 * @param {Object} params
 * @param {string} params.text
 * @param {Object} params.rules
 * @param {boolean} [params.rules.trimLines]
 * @param {boolean} [params.rules.collapseSpaces]
 * @param {boolean} [params.rules.removeEmptyLines]
 * @param {boolean} [params.rules.normalizeLineEndings]
 * @param {boolean} [params.rules.stripSmartQuotes]
 * @param {boolean} [params.rules.removeDuplicatePunctuation]
 * @returns {string}
 */
function cleanText(params) {
  var text = params.text || '';
  var r = params.rules || {};
  if (r.normalizeLineEndings) text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (r.stripSmartQuotes) text = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2013/g, '-').replace(/\u2014/g, '--');
  if (r.removeDuplicatePunctuation) text = text.replace(/([,!?.;:])\1+/g, '$1');
  var lines = text.split('\n');
  lines = lines.map(function(line){
    if (r.trimLines) line = line.replace(/^\s+|\s+$/g, '');
    if (r.collapseSpaces) line = line.replace(/[ \t]+/g, ' ');
    return line;
  });
  if (r.removeEmptyLines) lines = lines.filter(function(l){ return l.length > 0; });
  return lines.join('\n');
}

export { diffText, cleanText, diffChars, diffWords, diffLines };
if (typeof module !== 'undefined' && module.exports) module.exports = { diffText, cleanText, diffChars, diffWords, diffLines };
