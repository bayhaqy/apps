/* =================================================================
   HTML Content Extractor — Medium Paywall Bypass engine (Bayhaqy Apps)
   Purpose: read full Medium articles (incl. member-only) without login,
   inspired by bayhaqy/HTML-Content-Extractor (Google-Cache method, now
   retired — Google removed web cache in 2024).
   Source chain (auto, first sufficient result wins):
     Wave 1 (race, fastest sufficient result wins):
       1a. Medium JSON API     medium.com/p/{id}?format=json  (raw CORS relays)
       1b. Freedium mirror     freedium-mirror.cfd/{url} via r.jina.ai
           JS-render transport — freedium-mirror is a SvelteKit CSR app:
           raw relays return empty skeletons, only a rendering transport
           sees the full article. jina sends CORS headers (preflight allows
           the x-respond-with header), so the browser can call it directly.
     Wave 2 (sequential):
       2. Medium page HTML  Apollo/__NEXT_DATA__ state scan (all transports)
       3. Medium RSS feed   medium.com/feed/{pub|@user}     (raw CORS relays)
       4. Freedium mirror   via raw relays (works again if mirror restores
           SSR) + legacy freedium.cfd via render transport
       5. Wayback Machine   archive.org availability API    (direct + relay)
       6. r.jina.ai reader  r.jina.ai/{url} markdown        (direct, CORS)
       7. External panel    Freedium mirror / archive.today / Wayback (1-click)
   Plus: paste-HTML / file mode with the generic multi-platform engine
   (platform presets + Mozilla Readability fallback).
   ================================================================= */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };

  /* ---------------- status + log helpers ---------------- */
  var statusEl = $('#status'), statusTimer = null;
  function status(msg, isErr, sticky) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.add('show');
    statusEl.classList.toggle('err', !!isErr);
    clearTimeout(statusTimer);
    if (!sticky && !isErr) statusTimer = setTimeout(function () { statusEl.classList.remove('show'); }, 4000);
  }
  function statusHide() { statusEl.classList.remove('show'); statusEl.classList.remove('err'); }

  var logEl = null;
  // logStart returns done(okMsg, errMsg): one call per source attempt
  function logStart(label) {
    if (!logEl) return function () {};
    var li = document.createElement('li');
    li.innerHTML = '<span class="lbl">' + esc(label) + '</span><span class="res">…</span>';
    logEl.appendChild(li);
    logEl.hidden = false;
    var res = li.querySelector('.res');
    return function done(okMsg, errMsg) {
      if (errMsg) { li.classList.add('fail'); res.textContent = errMsg; }
      else { li.classList.add('ok'); res.textContent = okMsg || 'ok'; }
    };
  }
  function logReset() { if (logEl) { logEl.innerHTML = ''; logEl.hidden = false; } var p = $('#extPanel'); if (p) p.hidden = true; }

  /* ---------------- generic utils ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function parseHTML(html) { return new DOMParser().parseFromString(html, 'text/html'); }
  function textLen(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().length; }
  function wordCount(el) { return ((el.textContent || '').match(/\S+/g) || []).length; }

  /* =============== [A] GENERIC EXTRACTION ENGINE =============== */
  var PLATFORMS = {
    medium:    { label: 'Medium',       roots: ['article', 'section', '.postArticle-content'] },
    wordpress: { label: 'WordPress',    roots: ['.entry-content', '.post-content', '.article-content', '.td-post-content', '.entry-body', 'article'] },
    blogger:   { label: 'Blogger',      roots: ['.post-body', '.post-content', 'article'] },
    substack:  { label: 'Substack',     roots: ['.available-content', '.body.markup', '.markup', 'article'] },
    devto:     { label: 'Dev.to',       roots: ['.crayons-article__body', '.crayons-article', 'article'] },
    hashnode:  { label: 'Hashnode',     roots: ['.post-content', '.blog-content', 'article'] },
    ghost:     { label: 'Ghost',        roots: ['.gh-content', '.post-content', '.content', 'article'] },
    news:      { label: 'News / Magz',  roots: ['[itemprop="articleBody"]', '.article-body', '.story-body', '.article__body', '.c-article-body', '.article-content', 'article'] },
    freedium:  { label: 'Freedium',     roots: ['.article-page-container', 'main', 'article'] },
    generic:   { label: 'Readability',  roots: [] }
  };
  var JUNK_STRUCTURAL =
    'script,noscript,style,link,meta,template,iframe,embed,object,form,input,button,select,textarea,' +
    'nav,aside,footer,header,dialog,svg,canvas,video,audio,picture>source,' +
    '[role="navigation"],[role="banner"],[role="complementary"],[role="dialog"],[role="contentinfo"]';
  var JUNK_RE = /(^|[\s_-])(share|sharedaddy|social|socials|sidebar|widget|comment|comments|newsletter|subscrib\w*|related|recommend\w*|trending|promo|advert\w*|ads?|banner|cookie|consent|gdpr|popup|modal|paywall|donate|signup|login|breadcrumb|breadcrumbs|pagination|pager|byline|author-box|author-card|post-tags|tag-list|toc|table-of-contents|footer|topbar|navbar|menu|nav|tooltip|skip-link|screen-reader|visually-hidden|tracking|analytics)([\s_-]|$)/;
  var BLOCK = { P:1, DIV:1, H1:1, H2:1, H3:1, H4:1, H5:1, H6:1, UL:1, OL:1, TABLE:1, PRE:1, BLOCKQUOTE:1, FIGURE:1, HR:1, SECTION:1, ARTICLE:1 };
  var KEEP_ATTRS = { A: ['href', 'title'], IMG: ['src', 'alt', 'width', 'height', 'loading'], TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan'], ABBR: ['title'], TIME: ['datetime'], IFRAME: ['src', 'allow', 'allowfullscreen', 'frameborder', 'loading'] };

  function removeAll(root, selector) {
    var els = root.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) if (els[i].parentNode) els[i].parentNode.removeChild(els[i]);
  }
  function removeJunk(root, deep) {
    removeAll(root, JUNK_STRUCTURAL);
    if (!deep) return;
    var all = root.querySelectorAll('*');
    for (var i = all.length - 1; i >= 0; i--) {
      var el = all[i];
      if (!el.parentNode) continue;
      var sig = ((el.className && typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '')).toLowerCase();
      if (sig && JUNK_RE.test(sig)) el.parentNode.removeChild(el);
    }
  }
  function stripComments(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null), list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
  }
  function cleanAttrs(root) {
    var all = root.querySelectorAll('*'), i, el, keep;
    for (i = 0; i < all.length; i++) {
      el = all[i];
      keep = KEEP_ATTRS[el.tagName] || [];
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (keep.indexOf(a.name.toLowerCase()) === -1) el.removeAttribute(a.name);
      });
    }
    if (root.nodeType === 1) {
      keep = KEEP_ATTRS[root.tagName] || [];
      Array.prototype.slice.call(root.attributes).forEach(function (a) {
        if (keep.indexOf(a.name.toLowerCase()) === -1) root.removeAttribute(a.name);
      });
    }
  }
  function resolveUrls(root, base) {
    if (!base) return;
    var i, el;
    var imgs = root.querySelectorAll('img[src]');
    for (i = 0; i < imgs.length; i++) {
      el = imgs[i];
      try { el.setAttribute('src', new URL(el.getAttribute('src'), base).href); } catch (e) {}
      el.setAttribute('loading', 'lazy');
    }
    var as = root.querySelectorAll('a[href]');
    for (i = 0; i < as.length; i++) {
      el = as[i];
      try {
        var abs = new URL(el.getAttribute('href'), base).href;
        try {
          var u = new URL(abs);
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach(function (p) { u.searchParams.delete(p); });
          abs = u.href;
        } catch (e2) {}
        el.setAttribute('href', abs);
      } catch (e) {}
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    }
  }
  function tidyBlocks(root) {
    var all = root.querySelectorAll('div,span,font'), i, el;
    for (i = 0; i < all.length; i++) {
      el = all[i];
      if (!el.parentNode) continue;
      var hasBlockChild = el.querySelector(Object.keys(BLOCK).map(function (t) { return t.toLowerCase(); }).join(','));
      var repl = document.createElement(hasBlockChild ? 'div' : 'p');
      while (el.firstChild) repl.appendChild(el.firstChild);
      el.parentNode.replaceChild(repl, el);
    }
    var empties = root.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,blockquote,li,figcaption,span');
    for (i = 0; i < empties.length; i++) {
      el = empties[i];
      if (el.parentNode && textLen(el) === 0 && !el.querySelector('img,table,pre,hr,iframe')) el.parentNode.removeChild(el);
    }
  }
  function applyOptions(root, opts) {
    if (!opts.images) removeAll(root, 'img');
    if (!opts.links) {
      var as = root.querySelectorAll('a');
      for (var i = as.length - 1; i >= 0; i--) {
        var a = as[i], t = document.createTextNode(a.textContent);
        a.parentNode.replaceChild(t, a);
      }
    }
    if (!opts.tables) removeAll(root, 'table');
    if (opts.embeds) removeAll(root, 'iframe,embed,object,video,audio');
  }
  function detectPlatform(doc, baseUrl) {
    var host = '';
    try { host = baseUrl ? new URL(baseUrl).hostname.toLowerCase() : ''; } catch (e) {}
    var gen = '';
    var gm = doc.querySelector('meta[name="generator"]');
    if (gm) gen = (gm.getAttribute('content') || '').toLowerCase();
    if (/medium\./.test(host) || doc.querySelector('.postArticle-content, [data-testid="articleContent"]')) return 'medium';
    if (/(^|\.)substack\.com$/.test(host) || doc.querySelector('.available-content')) return 'substack';
    if (/(^|\.)dev\.to$/.test(host) || doc.querySelector('.crayons-article__body')) return 'devto';
    if (/blogspot\./.test(host) || gen.indexOf('blogger') !== -1 || doc.querySelector('.post-body')) return 'blogger';
    if (gen.indexOf('wordpress') !== -1 || host.indexOf('wordpress.com') !== -1 || doc.querySelector('.wp-block, .entry-content')) return 'wordpress';
    if (/hashnode\./.test(host) || gen.indexOf('hashnode') !== -1) return 'hashnode';
    if (gen.indexOf('ghost') !== -1 || doc.querySelector('.gh-content')) return 'ghost';
    for (var id in PLATFORMS) {
      if (id === 'generic') continue;
      var roots = PLATFORMS[id].roots;
      for (var i = 0; i < roots.length; i++) {
        if (roots[i] === 'article') continue;
        try { var el = doc.querySelector(roots[i]); if (el && textLen(el) > 250) return id; } catch (e) {}
      }
    }
    return 'generic';
  }
  function harvestMeta(doc) {
    var m = function (sel) { var el = doc.querySelector(sel); return el ? (el.getAttribute('content') || '').trim() : ''; };
    var meta = {
      title: (doc.title || '').trim() || m('meta[property="og:title"]'),
      description: m('meta[name="description"]') || m('meta[property="og:description"]'),
      author: m('meta[name="author"]') || m('meta[property="article:author"]') || m('meta[name="twitter:creator"]'),
      published: m('meta[property="article:published_time"]') || m('meta[name="date"]') || m('meta[name="pubdate"]'),
      modified: m('meta[property="article:modified_time"]'),
      siteName: m('meta[property="og:site_name"]'),
      ogImage: m('meta[property="og:image"]') || m('meta[name="twitter:image"]'),
      canonical: '', lang: (doc.documentElement.getAttribute('lang') || '').trim(), jsonld: []
    };
    var can = doc.querySelector('link[rel="canonical"]');
    if (can) meta.canonical = can.getAttribute('href') || '';
    var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        var flat = [];
        (function walk(x) {
          if (!x) return;
          if (Array.isArray(x)) { x.forEach(walk); return; }
          if (typeof x === 'object') { flat.push(x); if (x['@graph']) walk(x['@graph']); }
        })(JSON.parse(scripts[i].textContent));
        flat.forEach(function (n) {
          var t = n['@type'];
          if (!t) return;
          var tl = Array.isArray(t) ? t.join(',').toLowerCase() : String(t).toLowerCase();
          if (tl.indexOf('article') !== -1 || tl.indexOf('blogposting') !== -1) {
            var au = n.author ? (typeof n.author === 'string' ? n.author : (n.author.name || '')) : '';
            meta.jsonld.push({ type: String(t), headline: n.headline || '', author: au, published: n.datePublished || '' });
            if (!meta.author && au) meta.author = au;
            if (!meta.published && n.datePublished) meta.published = n.datePublished;
            if (!meta.title && n.headline) meta.title = n.headline;
          }
        });
      } catch (e) {}
    }
    return meta;
  }
  function toPlainText(root) {
    var out = [];
    function inline(node) {
      var s = '';
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) s += n.nodeValue;
        else if (n.nodeType === 1) {
          if (n.tagName === 'BR') s += '\n';
          else if (n.tagName === 'PRE') s += '\n' + (n.textContent || '') + '\n';
          else s += inline(n);
        }
      }
      return s;
    }
    function walk(el) {
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          var tx = n.nodeValue.replace(/\s+/g, ' ');
          if (tx.trim()) out.push(tx);
          continue;
        }
        if (n.nodeType !== 1) continue;
        var t = n.tagName;
        if (t === 'H1') out.push('\n\n# ' + inline(n).trim() + '\n');
        else if (t === 'H2') out.push('\n\n## ' + inline(n).trim() + '\n');
        else if (t === 'H3' || t === 'H4' || t === 'H5' || t === 'H6') out.push('\n\n' + inline(n).trim() + '\n');
        else if (t === 'P' || t === 'FIGCAPTION') out.push('\n\n' + inline(n).trim());
        else if (t === 'BLOCKQUOTE') out.push('\n\n' + inline(n).trim().split('\n').map(function (l) { return '> ' + l; }).join('\n'));
        else if (t === 'PRE') out.push('\n\n' + (n.textContent || '').replace(/\n+$/, ''));
        else if (t === 'UL' || t === 'OL') {
          var idx = 0;
          for (var li = n.firstElementChild; li; li = li.nextElementSibling) {
            if (li.tagName !== 'LI') continue;
            idx++;
            out.push('\n' + (t === 'OL' ? idx + '. ' : '- ') + inline(li).replace(/\s+/g, ' ').trim());
          }
          out.push('\n');
        }
        else if (t === 'TABLE') out.push('\n\n' + (function (tbl) {
          var rows = [];
          for (var r = 0; r < tbl.rows.length; r++) {
            var line = [];
            for (var c = 0; c < tbl.rows[r].cells.length; c++) line.push(tbl.rows[r].cells[c].textContent.replace(/\s+/g, ' ').trim());
            rows.push('| ' + line.join(' | ') + ' |');
            if (r === 0) rows.push('|' + line.map(function () { return ' --- '; }).join('|') + '|');
          }
          return rows.join('\n');
        })(n) + '\n');
        else if (t === 'HR') out.push('\n\n---\n');
        else if (t === 'IMG') out.push('\n[image: ' + (n.getAttribute('alt') || 'untitled') + ']\n');
        else if (BLOCK[t]) walk(n);
        else out.push(inline(n));
      }
    }
    walk(root);
    return out.join('').replace(/\n{3,}/g, '\n\n').trim();
  }

  function extract(htmlString, baseUrl, platformId, opts) {
    var doc = parseHTML(htmlString);
    var meta = harvestMeta(doc);
    var detected = platformId === 'auto' ? detectPlatform(doc, baseUrl) : platformId;
    var conf = PLATFORMS[detected] || PLATFORMS.generic;

    var c1 = null, c1len = 0;
    var docA = parseHTML(htmlString);
    removeJunk(docA.body, true);
    var sel = conf.roots.concat(['article', '[role="main"]', 'main', '.post', '.entry']);
    for (var i = 0; i < sel.length; i++) {
      var el = null;
      try { el = docA.querySelector(sel[i]); } catch (e) {}
      if (el && textLen(el) > c1len) { c1 = el; c1len = textLen(el); }
      if (c1len > 400) break;
    }
    var c2 = null, c2len = 0, rmeta = null;
    try {
      var art = new Readability(parseHTML(htmlString)).parse();
      if (art && art.content) {
        var host2 = parseHTML('<div>' + art.content + '</div>');
        c2 = host2.body.firstElementChild || host2.body;
        c2len = textLen(c2);
        rmeta = { title: art.title || '', byline: art.byline || '', excerpt: art.excerpt || '', siteName: art.siteName || '', published: art.publishedTime || '' };
      }
    } catch (e) {}

    var winner, via;
    if (c1 && c1len >= c2len * 0.8) { winner = c1; via = conf.label; }
    else if (c2) { winner = c2; via = 'Readability'; }
    else if (c1) { winner = c1; via = conf.label; }
    else { winner = docA.body; via = 'Body fallback'; }
    if (rmeta) {
      if (rmeta.title && (!meta.title || meta.title.length < 3)) meta.title = rmeta.title;
      if (rmeta.byline && !meta.author) meta.author = rmeta.byline;
      if (rmeta.published && !meta.published) meta.published = rmeta.published;
      if (rmeta.siteName && !meta.siteName) meta.siteName = rmeta.siteName;
      if (rmeta.excerpt && !meta.description) meta.description = rmeta.excerpt;
    }
    var out = parseHTML('<div id="hce-root"></div>');
    var outRoot = out.getElementById('hce-root');
    var clone = winner.cloneNode(true);
    while (clone.firstChild) outRoot.appendChild(clone.firstChild);
    stripComments(outRoot);
    cleanAttrs(outRoot);
    tidyBlocks(outRoot);
    resolveUrls(outRoot, baseUrl);
    if (!outRoot.querySelector('h1') && meta.title) {
      var h1 = document.createElement('h1');
      h1.textContent = meta.title;
      outRoot.insertBefore(h1, outRoot.firstChild);
    }
    applyOptions(outRoot, opts);
    var jsAs = outRoot.querySelectorAll('a[href]');
    for (var j = 0; j < jsAs.length; j++) {
      var href = (jsAs[j].getAttribute('href') || '').trim().toLowerCase();
      if (href.indexOf('javascript:') === 0) jsAs[j].removeAttribute('href');
    }
    return { root: outRoot, meta: meta, platform: detected, via: via, len: textLen(outRoot) };
  }

  /* ---------------- markdown (Turndown) ---------------- */
  var td = null;
  function mdOf(el) {
    if (typeof TurndownService !== 'function') return '(Turndown failed to load — check lib/turndown.js)';
    if (!td) {
      td = new TurndownService({ headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '_' });
      if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) td.use(turndownPluginGfm.gfm);
      td.addRule('removeEmptyLinks', {
        filter: function (node) { return node.nodeName === 'A' && !node.getAttribute('href'); },
        replacement: function (content) { return content; }
      });
    }
    return td.turndown(el).replace(/\n{3,}/g, '\n\n').trim();
  }
  function mdToHtml(md) {
    // minimal markdown → HTML for reader-proxy output (r.jina.ai)
    var lines = String(md || '').split('\n'), out = [], inCode = false, listType = null, buf = [];
    function flushList() {
      if (!listType) return;
      out.push('<' + listType + '>' + buf.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</' + listType + '>');
      buf = []; listType = null;
    }
    function inline(s) {
      return esc(s)
        .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/(^|\W)\*([^*\n]+)\*/g, '$1<i>$2</i>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    }
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (/^```/.test(L)) {
        if (inCode) { out.push('</code></pre>'); inCode = false; }
        else { flushList(); out.push('<pre><code>'); inCode = true; }
        continue;
      }
      if (inCode) { out.push(esc(L)); continue; }
      var h = L.match(/^(#{1,4})\s+(.*)/);
      if (h) { flushList(); out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); continue; }
      if (/^>\s?/.test(L)) { flushList(); out.push('<blockquote>' + inline(L.replace(/^>\s?/, '')) + '</blockquote>'); continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(L)) { flushList(); out.push('<hr />'); continue; }
      var li = L.match(/^\s*[-*]\s+(.*)/);
      if (li) { if (listType !== 'ul') { flushList(); listType = 'ul'; } buf.push(inline(li[1])); continue; }
      var oli = L.match(/^\s*\d+\.\s+(.*)/);
      if (oli) { if (listType !== 'ol') { flushList(); listType = 'ol'; } buf.push(inline(oli[1])); continue; }
      if (!L.trim()) { flushList(); continue; }
      flushList();
      out.push('<p>' + inline(L) + '</p>');
    }
    flushList();
    if (inCode) out.push('</code></pre>');
    return out.join('\n');
  }

  /* =============== [B] MEDIUM BYPASS CHAIN =============== */
  var MEDIUM_HOST_RE = /(^|\.)(medium\.com|miro\.medium\.com)$/;
  var RESERVED_SEG = ['p', 'm', 'me', 'tag', 'feed', 'about', 'jobs', 'stories', 'new-story', 'plan', 'topics', 'archive'];
  /* Transport pool (free public CORS transports, tried in order):
     - jina           r.jina.ai/{url} + x-respond-with: html → JS-rendered full
                      HTML with native CORS (preflight allows the header).
                      The ONLY transport that executes client-side JS —
                      freedium-mirror is SvelteKit CSR (raw relays get empty
                      skeleton shells).
     - allorigins     raw passthrough proxy
     - allorigins-get same service, JSON-wrapped endpoint (separate rate bucket)
     - codetabs       raw passthrough proxy
     - corslol        raw passthrough proxy                              */
  var RELAYS = [
    { name: 'jina',           make: function (u) { return 'https://r.jina.ai/' + u; }, headers: function () { return { 'x-respond-with': 'html' }; }, timeout: 45000 },
    { name: 'allorigins',     make: function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); }, timeout: 20000 },
    { name: 'allorigins-get', make: function (u) { return 'https://api.allorigins.win/get?url=' + encodeURIComponent(u); }, unwrap: true, timeout: 20000 },
    { name: 'codetabs',       make: function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); }, timeout: 20000 },
    { name: 'corslol',        make: function (u) { return 'https://api.cors.lol/?url=' + encodeURIComponent(u); }, timeout: 20000 }
  ];

  function relayFetch(url, timeout, opts) {
    // try each transport in order; resolve with {text, relay}
    opts = opts || {};
    var pool = RELAYS.filter(function (r) {
      if (opts.noJina && r.name === 'jina') return false;
      if (opts.onlyJina && r.name !== 'jina') return false;
      return true;
    });
    var idx = 0, lastErr = '';
    return new Promise(function (resolve, reject) {
      function attempt() {
        if (idx >= pool.length) { reject(new Error('semua relay gagal (' + lastErr + ')')); return; }
        var relay = pool[idx++];
        var t = timeout || relay.timeout || 25000;
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, t);
        fetch(relay.make(url), { signal: ctrl.signal, headers: relay.headers ? relay.headers() : {} })
          .then(function (r) {
            if (!r.ok) {
              var m = 'HTTP ' + r.status;
              if (r.status === 429) m += ' (batas rate relay)';
              throw new Error(m);
            }
            return r.text();
          })
          .then(function (raw) {
            var text = raw || '';
            if (relay.unwrap) {
              try { text = JSON.parse(text).contents || ''; } catch (e2) { throw new Error('unwrap JSON gagal'); }
            }
            if (!text) throw new Error('respons kosong');
            clearTimeout(to);
            resolve({ text: text, relay: relay.name });
          })
          .catch(function (err) {
            clearTimeout(to);
            var m = err && err.name === 'AbortError' ? 'timeout ' + (t / 1000) + 's' : (err && err.message) || 'gagal';
            lastErr = relay.name + ': ' + m;
            attempt();
          });
      }
      attempt();
    });
  }

  function parseMediumUrl(rawUrl) {
    var u;
    try { u = new URL(rawUrl); } catch (e) { return null; }
    var seg = u.pathname.split('/').filter(Boolean);
    var out = { url: u.origin + u.pathname, host: u.hostname, postId: null, slug: '', feedUrl: null, isMedium: false };
    if (MEDIUM_HOST_RE.test(u.hostname)) out.isMedium = true;
    if (seg[0] === 'p' && seg[1]) { out.postId = seg[1]; }
    else if (seg.length) {
      var last = seg[seg.length - 1] || '';
      var m = last.match(/-([0-9a-f]{8,})$/i);
      if (m) { out.postId = m[1]; out.slug = last.slice(0, m.index); }
      else out.slug = last;
    }
    if (out.isMedium && seg.length >= 1 && RESERVED_SEG.indexOf(seg[0]) === -1) {
      out.feedUrl = seg[0].charAt(0) === '@'
        ? 'https://medium.com/feed/' + seg[0]
        : 'https://medium.com/feed/' + seg[0];
    }
    return out;
  }

  /* ---- Medium JSON → article HTML ---- */
  function applyMarkups(text, markups) {
    text = text || '';
    if (!markups || !markups.length) return esc(text);
    var pts = [0, text.length];
    markups.forEach(function (m) {
      if (typeof m.start === 'number' && typeof m.end === 'number') {
        pts.push(Math.max(0, Math.min(m.start, text.length)));
        pts.push(Math.max(0, Math.min(m.end, text.length)));
      }
    });
    pts = pts.sort(function (a, b) { return a - b; }).filter(function (v, i, a) { return !i || v !== a[i - 1]; });
    var out = '';
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if (a === b) continue;
      var seg = esc(text.slice(a, b));
      var pre = '', post = '';
      markups.forEach(function (m) {
        if (m.start <= a && b <= m.end) {
          if (m.type === 1) { pre += '<b>'; post = '</b>' + post; }
          else if (m.type === 2) { pre += '<i>'; post = '</i>' + post; }
          else if (m.type === 3 && m.href) { pre += '<a href="' + esc(m.href) + '" target="_blank" rel="noopener">'; post = '</a>' + post; }
          else if (m.type === 10) { pre += '<code>'; post = '</code>' + post; }
        }
      });
      out += pre + seg + post;
    }
    return out;
  }

  function jsonToArticle(value, refs) {
    refs = refs || {};
    var bm = (value && value.content && value.content.bodyModel) || (value && value.bodyModel);
    if (!bm || !bm.paragraphs || !bm.paragraphs.length) throw new Error('bodyModel tidak ditemukan');
    var paras = bm.paragraphs;
    var users = refs.User || {};
    var images = refs.Image || {};
    var iframes = refs.IframeMedia || {};
    var creator = users[value.creatorId] || {};

    function imgOf(p) {
      var id = p && p.metadata && p.metadata.id;
      var im = images[id] || {};
      var src = im.originalUrl || im.focusImageUrl || (id ? 'https://miro.medium.com/max/1400/' + id : '');
      return src;
    }
    var html = '', listType = null;
    function closeList() { if (listType) { html += '</' + listType + '>'; listType = null; } }
    for (var i = 0; i < paras.length; i++) {
      var p = paras[i], t = p.type, text = p.text || '';
      if (t === 'UL' || t === 'OL') {
        if (listType !== t.toLowerCase()) { closeList(); listType = t.toLowerCase(); html += '<' + listType + '>'; }
        html += '<li>' + applyMarkups(text, p.markups) + '</li>';
        continue;
      }
      closeList();
      if (t === 'P') html += '<p>' + applyMarkups(text, p.markups) + '</p>';
      else if (t === 'H3') html += '<h2>' + applyMarkups(text, p.markups) + '</h2>';
      else if (t === 'H4') html += '<h3>' + applyMarkups(text, p.markups) + '</h3>';
      else if (t === 'BQ' || t === 'PQ') html += '<blockquote>' + applyMarkups(text, p.markups) + '</blockquote>';
      else if (t === 'CODE_BLOCK') html += '<pre><code>' + esc(text) + '</code></pre>';
      else if (t === 'IMG') {
        var src = imgOf(p);
        if (src) html += '<figure><img src="' + esc(src) + '" alt="' + esc(text) + '" loading="lazy" />' + (text ? '<figcaption>' + esc(text) + '</figcaption>' : '') + '</figure>';
      }
      else if (t === 'IFRAME') {
        var fid = p.iframe && p.iframe.mediaId;
        var fr = iframes[fid] || {};
        if (fr.src) html += '<p><a href="' + esc(fr.src) + '" target="_blank" rel="noopener">▶ Embedded media: ' + esc(fr.src) + '</a></p>';
      }
      else if (text) html += '<p>' + applyMarkups(text, p.markups) + '</p>';
    }
    closeList();

    var tags = [];
    if (Array.isArray(value.tags)) value.tags.forEach(function (tg) { tags.push(typeof tg === 'string' ? tg : (tg && (tg.name || tg.slug)) || ''); });

    return {
      title: value.title || '',
      author: creator.name || '',
      authorUrl: creator.username ? 'https://medium.com/@' + creator.username : '',
      published: value.firstPublishedAt ? new Date(value.firstPublishedAt).toISOString() : (value.latestPublishedAt ? new Date(value.latestPublishedAt).toISOString() : ''),
      readingTime: value.readingTime || 0,
      tags: tags.filter(Boolean),
      html: html
    };
  }

  function stripJsonPrefix(t) {
    // Medium prefixes: '])}while(1);</x>' or ')]}while(1);</x>' (varies); tolerate both + bare ])} / )]}
    t = String(t || '');
    var i = t.indexOf('</x>');
    if (i !== -1) return t.slice(i + 4).trim();
    return t.replace(/^[\]\)\s]+\}/, '').trim();
  }

  function deepScanJson(root) {
    // walk any parsed JSON, find {paragraphs:[...]} bodyModel + references maps
    var found = { bodyModel: null, refs: {} };
    var seen = new Set();
    (function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 40 || seen.size > 4000) return;
      if (seen.has(node)) return;
      seen.add(node);
      if (!found.bodyModel && node.bodyModel && Array.isArray(node.bodyModel.paragraphs) && node.bodyModel.paragraphs.length) found.bodyModel = node.bodyModel;
      if (node.references && typeof node.references === 'object') {
        ['User', 'Image', 'IframeMedia'].forEach(function (k) { if (!found.refs[k] && node.references[k]) found.refs[k] = node.references[k]; });
      }
      for (var k in node) { if (Object.prototype.hasOwnProperty.call(node, k)) walk(node[k], depth + 1); if (seen.size > 4000) return; }
    })(root, 0);
    return found;
  }

  function jsonFromScriptTags(html) {
    var doc = parseHTML(html);
    var scripts = doc.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      var type = (s.getAttribute('type') || '').toLowerCase();
      if (s.id !== '__NEXT_DATA__' && type.indexOf('json') === -1) continue;
      if (!s.textContent || s.textContent.length < 200) continue;
      try {
        var j = JSON.parse(s.textContent);
        var f = deepScanJson(j);
        if (f.bodyModel) return f;
      } catch (e) {}
    }
    return null;
  }

  /* ---- result assembly ---- */
  function finish(src) {
    // src: {html, meta:{title,author,published,siteName,description}, via, viaUrl}
    var host = parseHTML('<div id="r"></div>');
    var root = host.getElementById('r');
    root.innerHTML = src.html;
    removeJunk(root, true);
    cleanAttrs(root);
    resolveUrls(root, src.viaUrl || '');
    if (!root.querySelector('h1') && src.meta.title) {
      var h1 = document.createElement('h1');
      h1.textContent = src.meta.title;
      root.insertBefore(h1, root.firstChild);
    }
    var opts = readOpts();
    applyOptions(root, opts);
    // drop empty paragraphs left by source conversion
    var empties = root.querySelectorAll('p,h2,h3,blockquote');
    for (var i = empties.length - 1; i >= 0; i--) {
      if (textLen(empties[i]) === 0 && !empties[i].querySelector('img,a')) empties[i].parentNode.removeChild(empties[i]);
    }
    var len = textLen(root), words = wordCount(root);
    if (words < 120) throw new Error('konten terlalu pendek (' + words + ' kata) — dianggap gagal');
    return { root: root, meta: src.meta, platform: 'medium', via: src.via, viaUrl: src.viaUrl, len: len, words: words };
  }

  /* ---- sources ---- */
  function srcJsonApi(postId) {
    return relayFetch('https://medium.com/p/' + postId + '?format=json', 12000, { noJina: true })
      .then(function (r) {
        var j = JSON.parse(stripJsonPrefix(r.text));
        var payload = j && j.payload;
        if (!payload || !payload.value) throw new Error('payload.value kosong');
        var art = jsonToArticle(payload.value, payload.references);
        return finish({
          html: art.html,
          meta: { title: art.title, author: art.author, authorUrl: art.authorUrl, published: art.published, siteName: 'Medium', description: '', tags: art.tags, readingTime: art.readingTime },
          via: 'Medium JSON API',
          viaUrl: 'https://medium.com/p/' + postId
        });
      });
  }

  function srcPageState(articleUrl) {
    return relayFetch(articleUrl, 35000).then(function (r) {
      if (!r.text || r.text.length < 500) throw new Error('HTML kosong');
      var f = jsonFromScriptTags(r.text);
      if (f && f.bodyModel) {
        var art = jsonToArticle({ content: { bodyModel: f.bodyModel } }, f.refs);
        var hmeta = harvestMeta(parseHTML(r.text));
        return finish({
          html: art.html,
          meta: { title: art.title || hmeta.title, author: art.author || hmeta.author, published: art.published || hmeta.published, siteName: 'Medium', description: hmeta.description, tags: art.tags },
          via: 'Medium page state (' + r.relay + ')',
          viaUrl: articleUrl
        });
      }
      var ex = extract(r.text, articleUrl, 'medium', readOpts());
      if (wordCount(ex.root) < 120) throw new Error('HTML terbaca tapi konten pendek (kemungkinan JS-rendered)');
      ex.via = 'Medium page HTML (' + r.relay + ')';
      ex.viaUrl = articleUrl;
      return ex;
    });
  }

  function srcFeed(articleUrl, pm) {
    if (!pm.feedUrl) return Promise.reject(new Error('tidak ada kandidat feed (custom domain / URL tak dikenal)'));
    return relayFetch(pm.feedUrl, 20000, { noJina: true }).then(function (r) {
      var doc = new DOMParser().parseFromString(r.text, 'text/xml');
      if (doc.querySelector('parsererror')) throw new Error('feed tidak valid');
      var items = doc.getElementsByTagName('item');
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var link = '';
        var lns = it.getElementsByTagName('link');
        if (lns.length) link = (lns[0].textContent || '').trim();
        var hit = (pm.postId && link.indexOf(pm.postId) !== -1) || (!pm.postId && pm.slug && link.indexOf(pm.slug) !== -1);
        if (!hit) continue;
        var ce = it.getElementsByTagName('content:encoded');
        var content = ce && ce.length ? ce[0].textContent : '';
        if (!content || content.length < 600) throw new Error('feed hanya snippet — artikel member-only tidak disertakan Medium di RSS');
        var title = '', author = '', pubDate = '';
        var tEls = it.getElementsByTagName('title'); if (tEls.length) title = tEls[0].textContent;
        var aEls = it.getElementsByTagName('dc:creator'); if (aEls.length) author = aEls[0].textContent;
        var pEls = it.getElementsByTagName('pubDate'); if (pEls.length) pubDate = pEls[0].textContent;
        var d = pubDate ? new Date(pubDate) : null;
        return finish({
          html: content,
          meta: { title: title, author: author, published: d && !isNaN(d) ? d.toISOString() : '', siteName: 'Medium RSS', description: '' },
          via: 'Medium RSS feed (' + r.relay + ')',
          viaUrl: articleUrl
        });
      }
      throw new Error('artikel tidak ada di 10 entri terakhir feed');
    });
  }

  function freediumExtract(pageUrl, text, articleUrl, viaLabel) {
    // pre-clean: freedium-mirror (SvelteKit) renders skeleton placeholders
    var pre = parseHTML(text);
    var sk = pre.querySelectorAll('[data-slot="skeleton"]');
    for (var i = 0; i < sk.length; i++) if (sk[i].parentNode) sk[i].parentNode.removeChild(sk[i]);
    // IMPORTANT: base = freedium page URL (images are relative /img/medium/...)
    var ex = extract(pre.documentElement.outerHTML, pageUrl, 'freedium', readOpts());
    var words = wordCount(ex.root);
    if (words < 120) throw new Error('konten pendek (' + words + ' kata) — mirror belum merender');
    // harvest title/author/date from the freedium article header (generic
    // junk-removal drops <header> from the extracted root)
    var h1 = pre.querySelector('article h1, main h1, h1');
    if (h1 && h1.textContent.trim()) ex.meta.title = h1.textContent.trim();
    var aHead = pre.querySelector('article header, main header');
    if (aHead) {
      var ps = aHead.querySelectorAll('p');
      for (var j = 0; j < ps.length; j++) {
        var tx = (ps[j].textContent || '').trim();
        if (/^By\s+/i.test(tx) && !ex.meta.author) ex.meta.author = tx.replace(/^By\s+/i, '').trim();
        else if (!ex.meta.published && /\d{4}/.test(tx) && tx.length < 40) ex.meta.published = tx;
      }
    }
    if (!ex.meta.title) {
      var m = text.match(/<title>([^<]+)<\/title>/i);
      if (m) ex.meta.title = m[1].trim();
    }
    if (ex.meta.title) ex.meta.title = ex.meta.title.replace(/\s*[-|]\s*Freedium.*$/i, '').trim();
    // extract() may have inserted an H1 from the raw <title> before cleanup
    var rootH1 = ex.root.querySelector('h1');
    if (rootH1 && ex.meta.title) rootH1.textContent = ex.meta.title;
    ex.via = 'Freedium (' + viaLabel + ')';
    ex.viaUrl = articleUrl;
    return ex;
  }

  var FREEDIUM_MIRROR = 'https://freedium-mirror.cfd/';
  var FREEDIUM_LEGACY = 'https://freedium.cfd/';

  function srcFreedium(articleUrl) {
    // Wave-1 fast path: alive mirror × JS-render transport (the only one
    // that sees freedium-mirror's client-rendered content)
    var pageUrl = FREEDIUM_MIRROR + articleUrl;
    return relayFetch(pageUrl, null, { onlyJina: true }).then(function (r) {
      return freediumExtract(pageUrl, r.text, articleUrl, 'mirror · render relay ' + r.relay);
    });
  }

  function srcFreediumRaw(articleUrl) {
    // Wave-2 backup: raw relays on the mirror (wins only if the mirror
    // restores server-side rendering) + legacy freedium.cfd via render relay
    var attempts = [
      { host: FREEDIUM_MIRROR, opts: {} },
      { host: FREEDIUM_LEGACY, opts: { onlyJina: true } }
    ];
    var idx = 0, lastErr = '';
    return new Promise(function (resolve, reject) {
      function attempt() {
        if (idx >= attempts.length) { reject(new Error(lastErr || 'Freedium tidak tersedia')); return; }
        var a = attempts[idx++];
        var pageUrl = a.host + articleUrl;
        relayFetch(pageUrl, null, a.opts)
          .then(function (r) {
            var label = (a.host === FREEDIUM_MIRROR ? 'mirror · ' : 'legacy · ') + r.relay;
            return freediumExtract(pageUrl, r.text, articleUrl, label);
          })
          .then(resolve)
          .catch(function (err) {
            lastErr = (a.host === FREEDIUM_MIRROR ? 'mirror' : 'legacy') + ': ' + ((err && err.message) || 'gagal');
            attempt();
          });
      }
      attempt();
    });
  }

  function srcWayback(articleUrl) {
    var av = 'https://archive.org/wayback/available?url=' + encodeURIComponent(articleUrl);
    var getAvail = function () {
      return fetch(av).then(function (r) { return r.json(); })
        .catch(function () { // availability API sometimes lacks CORS — retry via raw relay
          return relayFetch(av, 15000, { noJina: true }).then(function (r) { return JSON.parse(r.text); });
        });
    };
    return getAvail().then(function (j) {
      var snap = j && j.archived_snapshots && j.archived_snapshots.closest;
      if (!snap || !snap.url || String(snap.status) !== '200') throw new Error('tidak ada snapshot Wayback');
      var snapUrl = snap.url.replace(/^http:/, 'https:');
      return relayFetch(snapUrl, 40000).then(function (r) {
        if (!r.text || r.text.length < 1000) throw new Error('snapshot kosong');
        var html = r.text;
        var ex = extract(html, snapUrl, 'auto', readOpts());
        // wayback toolbar ids
        ['wm-ipp', 'wm-ipp-base', 'donato'].forEach(function (id) {
          var el = ex.root.querySelector('#' + id);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        if (wordCount(ex.root) < 120) throw new Error('snapshot terbaca tapi konten pendek');
        if (!ex.meta.title) {
          var m = html.match(/<title>([^<]+)<\/title>/i);
          if (m) ex.meta.title = m[1].replace(/\s+::\s*Wayback Machine\s*$/i, '').trim();
        }
        ex.via = 'Wayback Machine';
        ex.viaUrl = snapUrl;
        return ex;
      });
    });
  }

  function srcJina(articleUrl) {
    return fetch('https://r.jina.ai/' + articleUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: (function () { var c = new AbortController(); setTimeout(function () { c.abort(); }, 45000); return c.signal; })()
    }).then(function (r) {
      if (!r.ok) {
        var m = 'HTTP ' + r.status;
        if (r.status === 429) m += ' (batas rate)';
        throw new Error(m);
      }
      return r.text();
    }).then(function (md) {
      if (!md || md.length < 500 || md.indexOf('###') === -1 && md.indexOf('\n') === -1) throw new Error('jina tidak memberi markdown');
      var t1 = md.match(/^Title:\s*(.+)$/m);
      var body = md.replace(/^Title:.*$/m, '').replace(/^URL Source:.*$/m, '').replace(/^Markdown Content:\s*/m, '');
      var words = body.split(/\s+/).filter(Boolean).length;
      if (words < 120) throw new Error('jina konten pendek (' + words + ' kata)');
      return finish({
        html: mdToHtml(body),
        meta: { title: t1 ? t1[1].trim() : '', author: '', published: '', siteName: 'Medium (via r.jina.ai)', description: '' },
        via: 'r.jina.ai reader',
        viaUrl: articleUrl
      });
    });
  }

  function srcCanonical(url) {
    // custom-domain Medium blog: resolve canonical → medium.com post
    return relayFetch(url, 35000).then(function (r) {
      var doc = parseHTML(r.text);
      var can = doc.querySelector('link[rel="canonical"]');
      var cand = can ? can.getAttribute('href') : '';
      if (!cand) {
        var og = doc.querySelector('meta[property="og:url"]');
        cand = og ? og.getAttribute('content') : '';
      }
      if (!cand || !/medium\.com/.test(cand)) throw new Error('canonical bukan Medium');
      return cand;
    });
  }

  /* ---- orchestrator ---- */
  function runChain(url) {
    var pm = parseMediumUrl(url);
    if (!pm) { status('URL tidak valid.', true, true); return; }
    logReset();
    status('', false, true);

    var promise;
    if (!pm.isMedium && !pm.postId) {
      // custom domain → resolve canonical first
      var l1 = logStart('Custom domain — cari canonical Medium');
      promise = srcCanonical(url).then(function (mediumUrl) {
        l1('→ ' + mediumUrl);
        return chainFor(parseMediumUrl(mediumUrl) || pm, mediumUrl);
      });
    } else {
      promise = chainFor(pm, pm.url);
    }
    promise
      .then(function (res) {
        state.result = res;
        state.baseUrl = url;
        render();
        status('Berhasil: ' + res.via + ' — ' + (res.words || 0).toLocaleString('en-US') + ' kata.', false, true);
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err);
        if (/batas rate|429/i.test(msg)) msg += ' — layanan publik gratis sedang limit, tunggu ±1 menit lalu coba lagi.';
        status('Semua sumber otomatis gagal: ' + msg, true, true);
        showExtPanel(url);
      })
      .then(function () { $('#btnFetch').disabled = false; });
  }

  function chainFor(pm, originalUrl) {
    var wrap = function (label, fn) {
      var done = logStart(label);
      return fn().then(function (res) {
        done((res.words || wordCount(res.root)).toLocaleString('en-US') + ' kata');
        return res;
      }, function (err) {
        done(null, (err && err.message ? err.message : 'gagal').slice(0, 90));
        throw err;
      });
    };
    // Wave 1 (race): first sufficient result wins
    var w1 = [];
    if (pm.postId) w1.push(wrap('1a Medium JSON API (' + pm.postId + ')', function () { return srcJsonApi(pm.postId); }));
    w1.push(wrap(pm.postId ? '1b Freedium mirror (render relay)' : '1 Freedium mirror (render relay)', function () { return srcFreedium(originalUrl); }));
    // Wave 2 (sequential fallbacks)
    var rest = [
      function () { return wrap('2 Medium page HTML + state scan', function () { return srcPageState(pm.url); }); },
      function () { return wrap('3 Medium RSS feed', function () { return srcFeed(originalUrl, pm); }); },
      function () { return wrap('4 Freedium (raw relays / legacy)', function () { return srcFreediumRaw(originalUrl); }); },
      function () { return wrap('5 Wayback Machine', function () { return srcWayback(originalUrl); }); },
      function () { return wrap('6 r.jina.ai reader', function () { return srcJina(originalUrl); }); }
    ];
    return raceSufficient(w1).catch(function () {
      var p = Promise.reject();
      rest.forEach(function (s) { p = p.catch(function () { return s(); }); });
      return p;
    });
  }

  function raceSufficient(list) {
    // resolve with the FIRST fulfilled promise; reject only when all fail
    return new Promise(function (resolve, reject) {
      var left = list.length, fails = [];
      if (!left) { reject(new Error('tidak ada kandidat sumber')); return; }
      list.forEach(function (it) {
        it.then(function (v) {
          if (left > 0) { left = 0; resolve(v); }
        }, function (e) {
          if (left <= 0) return;
          fails.push((e && e.message) || 'gagal');
          if (fails.length === list.length) { left = 0; reject(new Error(fails.join(' | '))); }
        });
      });
    });
  }

  function showExtPanel(url) {
    var p = $('#extPanel');
    if (!p) return;
    p.hidden = false;
    var enc = encodeURIComponent(url);
    var links = [
      ['Freedium mirror', 'https://freedium-mirror.cfd/' + url],
      ['Freedium legacy', 'https://freedium.cfd/' + url],
      ['archive.today', 'https://archive.ph/newest/' + enc],
      ['Wayback Machine', 'https://web.archive.org/web/2/' + enc],
      ['r.jina.ai', 'https://r.jina.ai/' + url]
    ];
    var box = p.querySelector('.hce-extbtns');
    box.innerHTML = links.map(function (l) {
      return '<a class="hce-extbtn" href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) +
        ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>';
    }).join('');
  }

  /* =============== [C] STATE, RENDER, UI =============== */
  var state = { result: null, md: '', text: '', html: '', baseUrl: '' };

  function readOpts() {
    return {
      images: $('#optImages').checked,
      links: $('#optLinks').checked,
      tables: $('#optTables').checked,
      embeds: $('#optEmbeds').checked
    };
  }
  function saveOpts() { try { localStorage.setItem('hce-opts', JSON.stringify(readOpts())); } catch (e) {} }

  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function chip(label, val, icon) {
    if (!val) return '';
    return '<span class="hce-chip">' + (icon || '') + label + ': <b>' + esc(val) + '</b></span>';
  }
  function slugify(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'extracted-content';
  }

  function render() {
    var r = state.result;
    if (!r) return;
    $('#emptyState').hidden = true;
    $('#resultCard').hidden = false;
    $('#lowWarn').hidden = !(r.len < 200);

    var m = r.meta || {};
    $('#rTitle').textContent = m.title || '(untitled page)';
    $('#rPlatform').textContent = r.via;
    var host = '';
    try { host = state.baseUrl ? new URL(state.baseUrl).hostname : ''; } catch (e) {}

    var words = wordCount(r.root);
    var paras = r.root.querySelectorAll('p').length;
    var chips = [
      chip('Words', words.toLocaleString('en-US')),
      chip('Read', m.readingTime ? m.readingTime + ' min' : Math.max(1, Math.round(words / 220)) + ' min'),
      chip('Source', host || 'pasted HTML'),
      chip('Author', m.author),
      chip('Published', fmtDate(m.published)),
      chip('Paragraphs', paras)
    ].join('');
    $('#rChips').innerHTML = chips;

    var readerClone = r.root.cloneNode(true);
    $('#readerView').innerHTML = '';
    while (readerClone.firstChild) $('#readerView').appendChild(readerClone.firstChild);

    state.md = mdOf(r.root);
    state.text = toPlainText(r.root);
    state.html = r.root.innerHTML.trim() ? r.root.outerHTML : '';
    $('#mdOut').textContent = state.md;
    $('#textOut').textContent = state.text;
    $('#htmlOut').textContent = state.html;

    var rows = [
      ['Title', m.title], ['Description', m.description], ['Author', m.author],
      ['Published', m.published], ['Site name', m.siteName],
      ['Source page', state.baseUrl], ['Fetched via', r.via + (r.viaUrl && r.viaUrl !== state.baseUrl ? ' — ' + r.viaUrl : '')],
      ['Reading time', m.readingTime ? m.readingTime + ' min' : ''],
      ['Tags', (m.tags || []).join(', ')]
    ];
    $('#metaTable').innerHTML = rows.map(function (row) {
      if (!row[1]) return '';
      var v = esc(row[1]);
      if (row[0] === 'Source page' || row[0] === 'Fetched via') {
        var urlPart = row[1].match(/https?:\/\/\S+/);
        if (urlPart) v = esc(row[1].replace(urlPart[0], '')) + ' <a href="' + esc(urlPart[0]) + '" target="_blank" rel="noopener">' + esc(urlPart[0]) + '</a>';
      }
      return '<tr><th>' + esc(row[0]) + '</th><td>' + v + '</td></tr>';
    }).join('');

    var imgs = r.root.querySelectorAll('img[src]');
    var imgList = [];
    for (var i = 0; i < imgs.length; i++) imgList.push({ src: imgs[i].getAttribute('src'), alt: imgs[i].getAttribute('alt') || '' });
    state.images = imgList;
    $('#nImgs').textContent = imgList.length ? '(' + imgList.length + ')' : '';
    $('#imgList').innerHTML = imgList.length ? imgList.map(function (im, ix) {
      return '<div class="hce-item"><img loading="lazy" src="' + esc(im.src) + '" alt="" onerror="this.style.visibility=\'hidden\'" />' +
        '<span class="u"><a href="' + esc(im.src) + '" target="_blank" rel="noopener">' + esc(im.src) + '</a>' +
        (im.alt ? '<span class="alt">' + esc(im.alt) + '</span>' : '') + '</span>' +
        '<button type="button" class="cp" data-copy-url="' + ix + '" title="Copy URL"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>';
    }).join('') : '<p class="hce-hint">No images in the extracted content (or "Include images" is off).</p>';

    var seen = {}, linkList = [];
    var as = r.root.querySelectorAll('a[href]');
    for (var k = 0; k < as.length; k++) {
      var href = as[k].getAttribute('href');
      if (!href || seen[href]) continue;
      seen[href] = 1;
      linkList.push({ href: href, text: (as[k].textContent || '').replace(/\s+/g, ' ').trim() });
    }
    state.links = linkList;
    $('#nLinks').textContent = linkList.length ? '(' + linkList.length + ')' : '';
    $('#linkList').innerHTML = linkList.length ? linkList.map(function (l, ix) {
      return '<div class="hce-item"><span class="u"><a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.href) + '</a>' +
        (l.text ? '<span class="alt">' + esc(l.text) + '</span>' : '') + '</span>' +
        '<button type="button" class="cp" data-copy-link="' + ix + '" title="Copy URL"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>';
    }).join('') : '<p class="hce-hint">No links in the extracted content (or "Keep links" is off).</p>';
  }

  /* ---------------- generic mode (non-Medium URL) ---------------- */
  function runGeneric(url) {
    var done = logStart('Generic fetch via CORS relay');
    relayFetch(url, 30000).then(function (r) {
      if (!r.text || r.text.length < 400 || r.text.indexOf('<') === -1) throw new Error('relay tidak mengembalikan HTML');
      done((r.text.length / 1024).toFixed(0) + ' KB via ' + r.relay);
      state.result = extract(r.text, url, $('#platformSel').value, readOpts());
      state.baseUrl = url;
      render();
      status('Extracted ' + state.result.len.toLocaleString('en-US') + ' chars via ' + state.result.via + '.');
    }).catch(function (err) {
      done(null, (err && err.message ? err.message : 'gagal').slice(0, 90));
      status('Fetch gagal: ' + (err && err.message ? err.message : err) + ' — buka halamannya, Ctrl+U, salin semua lalu pakai tab Tempel HTML.', true, true);
    }).then(function () { $('#btnFetch').disabled = false; });
  }

  /* ---------------- sample page (paste mode) ---------------- */
  var SAMPLE = [
    '<!DOCTYPE html><html lang="en"><head><title>How We Built a Swiss Army Knife of Web Tools - Example Daily</title>',
    '<meta name="author" content="Dina Prakasa">',
    '<meta property="article:published_time" content="2026-07-14T08:00:00Z">',
    '<meta property="og:site_name" content="Example Daily">',
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"How We Built a Swiss Army Knife of Web Tools","author":{"@type":"Person","name":"Dina Prakasa"},"datePublished":"2026-07-14T08:00:00Z"}</scr' + 'ipt></head><body>',
    '<nav class="main-nav"><a href="/">Home</a><a href="/tech">Tech</a><a href="/about">About</a></nav>',
    '<div class="cookie-consent-banner">We use cookies! <button>Accept</button></div>',
    '<div class="page"><aside class="sidebar"><div class="widget">Popular posts</div><div class="widget newsletter-box">Subscribe to our newsletter <input placeholder="email"></aside>',
    '<main><article class="post entry-content">',
    '<header class="post-header"><h1>How We Built a Swiss Army Knife of Web Tools</h1>',
    '<div class="byline">By Dina Prakasa · July 14, 2026 · <span class="share-buttons">Share on Twitter</span></div></header>',
    '<div class="advert-banner">ADVERTISEMENT — buy stuff!</div>',
    '<p>Everyone told us a browser toolbox was overkill. <b>Fifty-four tools later</b>, the collection handles everything from <a href="https://example.com/dns">DNS lookups</a> to PDF redaction — with zero uploads and no accounts.</p>',
    '<p>This post walks through the architecture, the mistakes, and the numbers behind the launch. The Medium paywall bypass engine in this tool follows the same philosophy: fetch, clean, read.</p>',
    '<h2>Why one toolbox?</h2>',
    '<p>People juggle a dozen sketchy single-purpose websites. We wanted one address, one design language, and one privacy promise: <em>your data never leaves the tab</em>.</p>',
    '<ul><li>Instant load, no install</li><li>Works offline via service worker</li><li>Bilingual UI (EN/ID)</li></ul>',
    '<blockquote>The best tool is the one you already have open. — ancient proverb, probably</blockquote>',
    '<h3>Stack in one table</h3>',
    '<table><tr><th>Layer</th><th>Choice</th></tr><tr><td>Markup</td><td>Vanilla HTML</td></tr><tr><td>Styling</td><td>One shared CSS theme</td></tr><tr><td>Hosting</td><td>GitHub Pages</td></tr></table>',
    '<pre><code>$ git commit -m "ship it"\n$ git push origin main</code></pre>',
    '<figure><img src="/img/launch-day.jpg" alt="Launch day confetti" width="600"><figcaption>Launch day, 08:00 sharp.</figcaption></figure>',
    '<p>Read the <a href="/follow-up?utm_source=rss&amp;utm_medium=feed">follow-up analysis</a> for the sequel.</p>',
    '</article></main>',
    '<footer class="site-footer"><a href="/privacy">Privacy</a> · © 2026 Example Daily</footer>',
    '<div class="related-posts">Related: <a href="/p1">Post one</a>, <a href="/p2">Post two</a></div>',
    '</div></body></html>'
  ].join('');

  /* ---------------- wiring ---------------- */
  function switchInputTab(name) {
    document.querySelectorAll('.hce-tabs [data-src]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-src') === name); });
    ['url', 'html', 'file'].forEach(function (n) { $('#src-' + n).hidden = (n !== name); });
  }
  function switchOutputTab(name) {
    document.querySelectorAll('#outTabs [data-out]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-out') === name); });
    ['reader', 'md', 'text', 'html', 'meta', 'imgs', 'links'].forEach(function (n) { $('#p-' + n).hidden = (n !== name); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    logEl = $('#hceLog');
    try {
      var saved = JSON.parse(localStorage.getItem('hce-opts') || 'null');
      if (saved) {
        $('#optImages').checked = !!saved.images;
        $('#optLinks').checked = !!saved.links;
        $('#optTables').checked = !!saved.tables;
        $('#optEmbeds').checked = !!saved.embeds;
      }
    } catch (e) {}
    ['#optImages', '#optLinks', '#optTables', '#optEmbeds'].forEach(function (s) {
      $(s).addEventListener('change', saveOpts);
    });

    document.querySelectorAll('.hce-tabs [data-src]').forEach(function (b) {
      b.addEventListener('click', function () { switchInputTab(b.getAttribute('data-src')); });
    });
    document.querySelectorAll('#outTabs [data-out]').forEach(function (b) {
      b.addEventListener('click', function () { switchOutputTab(b.getAttribute('data-out')); });
    });

    $('#btnParse').addEventListener('click', function () {
      var html = $('#htmlInput').value;
      if (!html.trim()) { status('Tempel dulu HTML halaman — atau klik contoh halaman berantakan.', true); return; }
      logReset();
      statusHide();
      try {
        state.result = extract(html, '', $('#platformSel').value, readOpts());
        state.baseUrl = '';
        render();
        status('Diekstrak ' + state.result.len.toLocaleString('en-US') + ' karakter via ' + state.result.via + '.');
      } catch (e) { status('Ekstraksi gagal: ' + (e && e.message ? e.message : e), true, true); }
    });

    $('#btnFetch').addEventListener('click', function () {
      var url = $('#urlInput').value.trim();
      if (!/^https?:\/\//i.test(url)) { status('Masukkan URL http(s) yang valid dulu.', true); return; }
      $('#btnFetch').disabled = true;
      saveOpts();
      var mode = $('#modeSel').value;
      var isMed = (function () { try { return MEDIUM_HOST_RE.test(new URL(url).hostname); } catch (e) { return false; } })();
      if (mode === 'medium' || (mode === 'auto' && isMed)) runChain(url);
      else runGeneric(url);
    });
    $('#urlInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#btnFetch').click(); });

    $('#btnSampleUrl').addEventListener('click', function () {
      switchInputTab('url');
      $('#urlInput').value = SAMPLE_MEDIUM_URL;
      $('#modeSel').value = 'medium';
      statusHide();
      logReset();
      $('#btnFetch').click();
    });

    var drop = $('#dropZone'), fi = $('#fileInput');
    function loadFile(f) {
      if (!f) return;
      status('Membaca ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' KB)…', false, true);
      var fr = new FileReader();
      fr.onload = function () { logReset(); statusHide(); state.result = extract(String(fr.result), '', $('#platformSel').value, readOpts()); state.baseUrl = ''; render(); status('Diekstrak dari file via ' + state.result.via + '.'); };
      fr.onerror = function () { status('File tidak bisa dibaca.', true, true); };
      fr.readAsText(f);
    }
    drop.addEventListener('click', function () { fi.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') fi.click(); });
    fi.addEventListener('change', function () { loadFile(fi.files && fi.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });

    $('#btnSample').addEventListener('click', function () {
      switchInputTab('html');
      $('#htmlInput').value = SAMPLE;
      statusHide();
      logReset();
      state.result = extract(SAMPLE, 'https://example-daily.example/tech/swiss-army-web-tools', $('#platformSel').value, readOpts());
      state.baseUrl = '';
      render();
      status('Contoh halaman berantakan diekstrak via ' + state.result.via + '.');
    });

    function copy(txt, btn) {
      if (window.copyText) window.copyText(txt, btn);
      else { try { navigator.clipboard.writeText(txt); } catch (e) {} if (window.showToast) window.showToast('Copied to clipboard'); }
    }
    function dl(name, txt, mime) {
      if (window.downloadText) window.downloadText(name, txt, mime);
      else {
        var b = new Blob([txt], { type: mime }); var u = URL.createObjectURL(b);
        var a = document.createElement('a'); a.href = u; a.download = name; a.click();
        setTimeout(function () { URL.revokeObjectURL(u); }, 200);
      }
    }
    var base = function () { return slugify(state.result && state.result.meta && state.result.meta.title); };
    $('#copyMd').addEventListener('click', function (e) { copy(state.md, e.currentTarget); });
    $('#copyText2').addEventListener('click', function (e) { copy(state.text, e.currentTarget); });
    $('#copyHtml').addEventListener('click', function (e) { copy(state.html, e.currentTarget); });
    $('#dlMd').addEventListener('click', function () { dl(base() + '.md', state.md, 'text/markdown;charset=utf-8'); });
    $('#dlText').addEventListener('click', function () { dl(base() + '.txt', state.text, 'text/plain;charset=utf-8'); });
    $('#dlHtml').addEventListener('click', function () { dl(base() + '.html', '<!DOCTYPE html>\n<meta charset="utf-8">\n' + state.html, 'text/html;charset=utf-8'); });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy-url],[data-copy-link]');
      if (!btn) return;
      var ix = btn.getAttribute('data-copy-url');
      var url = ix !== null ? (state.images && state.images[+ix] ? state.images[+ix].src : '') : (state.links && state.links[+btn.getAttribute('data-copy-link')] ? state.links[+btn.getAttribute('data-copy-link')].href : '');
      if (url) copy(url, btn);
    });
  });

  var SAMPLE_MEDIUM_URL = 'https://medium.com/data-science/diy-ai-how-to-build-a-linear-regression-model-from-scratch-7b4cc0efd235';
})();
