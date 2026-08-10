/**
 * Bayhaqy Apps API — Code Formatter module
 * Public, no-token, client-side JavaScript.
 *
 * Usage:
 *   import { formatCode } from '/apps/api/code-formatter.js';
 *   const out = formatCode({
 *     language: 'sql',
 *     code: 'select * from users where id=1',
 *     indent: '  ',
 *     keywordCase: 'upper'
 *   });
 *
 * Supported languages: sql, python, html, css, javascript
 * Note: For full-featured SQL/HTML/CSS/JS formatting with all options,
 *       use the interactive app at /apps/code-formatter/ which loads
 *       sql-formatter and prettier from CDN. This module provides
 *       lightweight formatting suitable for API use.
 */

function repeatStr(str, n) { return new Array(n + 1).join(str); }

function formatSql(code, opts) {
  var indent = opts.indent || '  ';
  var kwCase = opts.keywordCase || 'upper'; // upper | lower | preserve
  var keywords = ['SELECT','FROM','WHERE','JOIN','INNER','LEFT','RIGHT','OUTER','ON','AND','OR','NOT','IN','LIKE','BETWEEN','IS','NULL','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','INDEX','VIEW','DISTINCT','UNION','ALL','AS','CASE','WHEN','THEN','ELSE','END','EXISTS','IN'];
  var kwSet = {};
  keywords.forEach(function(k){ kwSet[k.toUpperCase()] = true; });

  // Normalize whitespace
  var text = code.replace(/\s+/g, ' ').trim();

  // Pad keywords with newlines
  Object.keys(kwSet).forEach(function(kw){
    var re = new RegExp('\\b' + kw + '\\b', 'gi');
    text = text.replace(re, function(m){
      if (kwCase === 'upper') return '\n' + kw;
      if (kwCase === 'lower') return '\n' + kw.toLowerCase();
      return '\n' + m;
    });
  });

  // Indent
  var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var depth = 0;
  return lines.map(function(line){
    if (/^(CASE|WHEN)/i.test(line)) { var s = repeatStr(indent, depth) + line; if (/^CASE/i.test(line)) depth++; return s; }
    if (/^END/i.test(line)) { depth = Math.max(0, depth - 1); return repeatStr(indent, depth) + line; }
    if (/^(FROM|WHERE|ORDER|GROUP|HAVING|LIMIT|VALUES|SET)/i.test(line)) { depth = 1; }
    if (/^(JOIN|INNER|LEFT|RIGHT|OUTER|ON|AND|OR)/i.test(line)) { return repeatStr(indent, 2) + line; }
    return repeatStr(indent, depth) + line;
  }).join('\n');
}

function formatPython(code, opts) {
  var indent = opts.indent || '    ';
  var lines = code.replace(/\t/g, indent).split('\n');
  var stack = [0];
  var out = [];
  lines.forEach(function(raw){
    var stripped = raw.replace(/^\s+/, '');
    if (!stripped || stripped.startsWith('#')) { out.push(stripped); return; }
    var curIndent = stripped === '' ? 0 : (raw.length - raw.replace(/^\s+/, '').length);
    while (stack.length > 1 && curIndent < stack[stack.length-1]) stack.pop();
    var depth = stack.length - 1;
    out.push(repeatStr(indent, depth) + stripped);
    if (/:\s*$/.test(stripped)) stack.push((depth + 1) * indent.length);
  });
  return out.join('\n');
}

function formatHtml(code, opts) {
  var indent = opts.indent || '  ';
  var tokens = code.replace(/></g, '>\n<').split('\n');
  var depth = 0;
  var voidTags = {'meta':1,'link':1,'img':1,'br':1,'hr':1,'input':1,'source':1,'area':1,'col':1,'wbr':1};
  return tokens.map(function(tok){
    tok = tok.trim();
    if (!tok) return '';
    if (tok.startsWith('</')) depth = Math.max(0, depth - 1);
    var line = repeatStr(indent, depth) + tok;
    var tagName = (tok.match(/^<\/?(\w+)/) || [])[1] || '';
    tagName = tagName.toLowerCase();
    if (!tok.startsWith('</') && !voidTags[tagName] && !/\/>$/.test(tok) && tok.startsWith('<')) depth++;
    return line;
  }).filter(Boolean).join('\n');
}

function formatCss(code, opts) {
  var indent = opts.indent || '  ';
  var text = code.replace(/\s*([{};:,])\s*/g, '$1').replace(/}/g, '\n}\n').replace(/{/g, ' {\n').replace(/;/g, ';\n');
  var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var depth = 0;
  return lines.map(function(line){
    if (line === '}') { depth = Math.max(0, depth - 1); return repeatStr(indent, depth) + '}'; }
    if (line.endsWith('{')) { var s = repeatStr(indent, depth) + line; depth++; return s; }
    return repeatStr(indent, depth) + line;
  }).join('\n');
}

function formatJs(code, opts) {
  var indent = opts.indent || '  ';
  // Very lightweight: balance braces/parens, add newlines after ; and {
  var out = '';
  var depth = 0;
  var inString = null;
  for (var i = 0; i < code.length; i++) {
    var ch = code[i];
    if (inString) {
      out += ch;
      if (ch === inString && code[i-1] !== '\\') inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; out += ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth++; out += ch; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { depth = Math.max(0, depth-1); out += ch; continue; }
    if (ch === ';') { out += ';\n' + repeatStr(indent, depth); continue; }
    if (ch === '{') { out += '{\n' + repeatStr(indent, depth); continue; }
    out += ch;
  }
  return out.replace(/\n\s*\n/g, '\n').trim();
}

/**
 * Format code.
 * @param {Object} params
 * @param {string} params.language - sql | python | html | css | javascript
 * @param {string} params.code - source code to format
 * @param {string} [params.indent] - indent string (default '  ')
 * @param {string} [params.keywordCase] - for SQL: upper | lower | preserve
 * @returns {string} formatted code
 */
function formatCode(params) {
  var lang = (params.language || 'sql').toLowerCase();
  var code = params.code || '';
  var opts = { indent: params.indent || '  ', keywordCase: params.keywordCase || 'upper' };
  switch (lang) {
    case 'sql': return formatSql(code, opts);
    case 'python': return formatPython(code, opts);
    case 'html': return formatHtml(code, opts);
    case 'css': return formatCss(code, opts);
    case 'js':
    case 'javascript': return formatJs(code, opts);
    default: throw new Error('Unsupported language: ' + lang + '. Supported: sql, python, html, css, javascript');
  }
}

// ES module export
export { formatCode, formatSql, formatPython, formatHtml, formatCss, formatJs };
// CommonJS compat for Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatCode, formatSql, formatPython, formatHtml, formatCss, formatJs };
}
