/* =================================================================
   HTML Content Extractor — engine (Bayhaqy Apps)
   Multi-platform article extraction, 100% client-side.
   Pipeline: parse → strip junk → platform root (or Mozilla Readability
   fallback) → attribute whitelist + URL resolve → outputs
   (reader / Markdown via Turndown / plain text / clean HTML / metadata).
   ================================================================= */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };

  /* ---------------- status helper ---------------- */
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

  /* ---------------- platform presets ---------------- */
  var PLATFORMS = {
    medium:    { label: 'Medium',       roots: ['article', 'section', '.postArticle-content'] },
    wordpress: { label: 'WordPress',    roots: ['.entry-content', '.post-content', '.article-content', '.td-post-content', '.entry-body', 'article'] },
    blogger:   { label: 'Blogger',      roots: ['.post-body', '.post-content', 'article'] },
    substack:  { label: 'Substack',     roots: ['.available-content', '.body.markup', '.markup', 'article'] },
    devto:     { label: 'Dev.to',       roots: ['.crayons-article__body', '.crayons-article', 'article'] },
    hashnode:  { label: 'Hashnode',     roots: ['.post-content', '.blog-content', 'article'] },
    ghost:     { label: 'Ghost',        roots: ['.gh-content', '.post-content', '.content', 'article'] },
    news:      { label: 'News / Magz',  roots: ['[itemprop="articleBody"]', '.article-body', '.story-body', '.article__body', '.c-article-body', '.article-content', 'article'] },
    generic:   { label: 'Readability',  roots: [] }
  };
  var JUNK_STRUCTURAL =
    'script,noscript,style,link,meta,template,iframe,embed,object,form,input,button,select,textarea,' +
    'nav,aside,footer,header,dialog,svg,canvas,video,audio,picture>source,' +
    '[role="navigation"],[role="banner"],[role="complementary"],[role="dialog"],[role="contentinfo"]';
  var JUNK_CLASSES =
    'script,noscript,style,link,meta,template,iframe,embed,object,form,input,button,select,textarea,' +
    'nav,aside,footer,header,dialog,svg,canvas,video,audio,' +
    '[role="navigation"],[role="banner"],[role="complementary"],[role="dialog"],[role="contentinfo"],' +
    '[aria-hidden="true"],[hidden]';
  var JUNK_RE = /(^|[\s_-])(share|sharedaddy|social|socials|sidebar|widget|comment|comments|newsletter|subscrib\w*|related|recommend\w*|trending|promo|advert\w*|ads?|banner|cookie|consent|gdpr|popup|modal|paywall|donate|signup|login|breadcrumb|breadcrumbs|pagination|pager|byline|author-box|author-card|post-tags|tag-list|toc|table-of-contents|footer|topbar|navbar|menu|nav|tooltip|skip-link|screen-reader|visually-hidden|tracking|analytics)([\s_-]|$)/;
  var BLOCK = { P:1, DIV:1, H1:1, H2:1, H3:1, H4:1, H5:1, H6:1, UL:1, OL:1, TABLE:1, PRE:1, BLOCKQUOTE:1, FIGURE:1, HR:1, SECTION:1, ARTICLE:1 };
  var KEEP_ATTRS = { A: ['href', 'title'], IMG: ['src', 'alt', 'width', 'height', 'loading'], TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan'], ABBR: ['title'], TIME: ['datetime'] };

  /* ---------------- DOM helpers ---------------- */
  function parseHTML(html) { return new DOMParser().parseFromString(html, 'text/html'); }

  function removeAll(root, selector) {
    var els = root.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }

  function removeJunk(root, deep) {
    removeAll(root, deep ? JUNK_CLASSES : JUNK_STRUCTURAL);
    if (!deep) return;
    var all = root.querySelectorAll('*');
    for (var i = all.length - 1; i >= 0; i--) {
      var el = all[i];
      if (!el.parentNode) continue;
      var sig = ((el.className && typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '')).toLowerCase();
      if (sig && JUNK_RE.test(sig)) el.parentNode.removeChild(el);
    }
  }

  function textLen(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().length; }

  function stripComments(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null);
    var list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
  }

  function cleanAttrs(root) {
    var all = root.querySelectorAll('*'), i, el, keep, k;
    for (i = 0; i < all.length; i++) {
      el = all[i];
      keep = KEEP_ATTRS[el.tagName] || [];
      var attrs = Array.prototype.slice.call(el.attributes);
      for (var j = 0; j < attrs.length; j++) {
        var name = attrs[j].name.toLowerCase();
        if (keep.indexOf(name) === -1) el.removeAttribute(attrs[j].name);
      }
    }
    if (root.nodeType === 1) {
      keep = KEEP_ATTRS[root.tagName] || [];
      var rattrs = Array.prototype.slice.call(root.attributes);
      for (var r = 0; r < rattrs.length; r++) {
        if (keep.indexOf(rattrs[r].name.toLowerCase()) === -1) root.removeAttribute(rattrs[r].name);
      }
    }
  }

  function resolveUrls(root, base) {
    if (!base) return;
    var i, el, v;
    var imgs = root.querySelectorAll('img[src]');
    for (i = 0; i < imgs.length; i++) {
      el = imgs[i];
      try { v = new URL(el.getAttribute('src'), base).href; el.setAttribute('src', v); } catch (e) {}
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
    // div with only inline content → p ; remove empties
    var all = root.querySelectorAll('div,span,font'), i, el;
    for (i = 0; i < all.length; i++) {
      el = all[i];
      if (!el.parentNode) continue;
      var hasBlockChild = el.querySelector(Object.keys(BLOCK).map(function (t) { return t.toLowerCase(); }).join(','));
      if (!hasBlockChild) {
        var p = document.createElement('p');
        while (el.firstChild) p.appendChild(el.firstChild);
        el.parentNode.replaceChild(p, el);
      } else {
        var d = document.createElement('div');
        while (el.firstChild) d.appendChild(el.firstChild);
        el.parentNode.replaceChild(d, el);
      }
    }
    var empties = root.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,blockquote,li,figcaption,span');
    for (i = 0; i < empties.length; i++) {
      el = empties[i];
      if (el.parentNode && textLen(el) === 0 && !el.querySelector('img,table,pre,hr,iframe')) el.parentNode.removeChild(el);
    }
    var figs = root.querySelectorAll('figure');
    for (i = 0; i < figs.length; i++) {
      var f = figs[i];
      if (f.parentNode && !f.querySelector('img') && textLen(f) < 40) f.parentNode.removeChild(f);
    }
  }

  function applyOptions(root, opts) {
    if (!opts.images) removeAll(root, 'img');
    if (!opts.links) {
      var as = root.querySelectorAll('a');
      for (var i = as.length - 1; i >= 0; i--) {
        var a = as[i];
        var t = document.createTextNode(a.textContent);
        a.parentNode.replaceChild(t, a);
      }
    }
    if (!opts.tables) removeAll(root, 'table');
    if (opts.embeds) removeAll(root, 'iframe,embed,object,video,audio');
  }

  /* ---------------- platform detection ---------------- */
  function detectPlatform(doc, baseUrl) {
    var host = '';
    try { host = baseUrl ? new URL(baseUrl).hostname.toLowerCase() : (doc.location && doc.location.hostname) || ''; } catch (e) {}
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
        var sel = roots[i];
        if (sel === 'article') continue;
        try { if (doc.querySelector(sel) && textLen(doc.querySelector(sel)) > 250) return id; } catch (e) {}
      }
    }
    return 'generic';
  }

  /* ---------------- metadata harvest ---------------- */
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
        var data = JSON.parse(scripts[i].textContent);
        var flat = [];
        (function walk(x) {
          if (!x) return;
          if (Array.isArray(x)) { x.forEach(walk); return; }
          if (typeof x === 'object') { flat.push(x); if (x['@graph']) walk(x['@graph']); }
        })(data);
        flat.forEach(function (n) {
          var t = n['@type'];
          if (!t) return;
          var tl = Array.isArray(t) ? t.join(',').toLowerCase() : String(t).toLowerCase();
          if (tl.indexOf('article') !== -1 || tl.indexOf('blogposting') !== -1 || tl.indexOf('news') !== -1) {
            var au = n.author ? (typeof n.author === 'string' ? n.author : (n.author.name || '')) : '';
            var pb = n.publisher ? (typeof n.publisher === 'string' ? n.publisher : (n.publisher.name || '')) : '';
            meta.jsonld.push({ type: String(t), headline: n.headline || '', author: au, published: n.datePublished || '', modified: n.dateModified || '', publisher: pb });
            if (!meta.author && au) meta.author = au;
            if (!meta.published && n.datePublished) meta.published = n.datePublished;
            if (!meta.title && n.headline) meta.title = n.headline;
          }
        });
      } catch (e) {}
    }
    return meta;
  }

  /* ---------------- plain text serializer ---------------- */
  function toPlainText(root) {
    var out = [];
    function inline(node) {
      var s = '';
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) s += n.nodeValue;
        else if (n.nodeType === 1) {
          var t = n.tagName;
          if (t === 'BR') s += '\n';
          else if (t === 'PRE') { s += '\n' + (n.textContent || '') + '\n'; }
          else s += inline(n);
        }
      }
      return s;
    }
    function walk(el, depth) {
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
        else if (t === 'H3' || t === 'H4') out.push('\n\n' + inline(n).trim() + '\n');
        else if (t === 'H5' || t === 'H6') out.push('\n\n' + inline(n).trim() + '\n');
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
        else if (t === 'TABLE') out.push('\n\n' + tableText(n) + '\n');
        else if (t === 'HR') out.push('\n\n---\n');
        else if (t === 'IMG') out.push('\n[image: ' + (n.getAttribute('alt') || 'untitled') + ']\n');
        else if (BLOCK[t]) walk(n, depth + 1);
        else out.push(inline(n));
      }
    }
    function tableText(tbl) {
      var rows = [];
      for (var tr = tbl.rows ? 0 : 0, r = 0; r < (tbl.rows ? tbl.rows.length : 0); r++) {
        var cells = tbl.rows[r].cells, line = [];
        for (var c = 0; c < cells.length; c++) line.push(cells[c].textContent.replace(/\s+/g, ' ').trim());
        rows.push('| ' + line.join(' | ') + ' |');
        if (r === 0) rows.push('|' + line.map(function () { return ' --- '; }).join('|') + '|');
      }
      return rows.join('\n');
    }
    walk(root, 0);
    return out.join('').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------------- main extraction ---------------- */
  function extract(htmlString, baseUrl, platformId, opts) {
    var doc = parseHTML(htmlString);
    var meta = harvestMeta(doc);
    var detected = platformId === 'auto' ? detectPlatform(doc, baseUrl) : platformId;
    var conf = PLATFORMS[detected] || PLATFORMS.generic;

    // candidate 1: platform root on heavily cleaned clone
    var c1 = null, c1len = 0;
    var docA = parseHTML(htmlString);
    removeJunk(docA.body, true);
    if (conf.roots.length) {
      for (var i = 0; i < conf.roots.length; i++) {
        var el = null;
        try { el = docA.querySelector(conf.roots[i]); } catch (e) {}
        if (el && textLen(el) > c1len) { c1 = el; c1len = textLen(el); }
        if (c1len > 400) break;
      }
    }
    if (!c1) { ['article', '[role="main"]', 'main', '.post', '.entry'].forEach(function (sel) {
      var el = null; try { el = docA.querySelector(sel); } catch (e) {}
      if (el && textLen(el) > c1len) { c1 = el; c1len = textLen(el); }
    }); }

    // candidate 2: Readability on its own untouched parse
    var c2 = null, c2len = 0, rmeta = null;
    try {
      var docB = parseHTML(htmlString);
      var reader = new Readability(docB);
      var art = reader.parse();
      if (art && art.content) {
        var host2 = parseHTML('<div>' + art.content + '</div>');
        c2 = host2.body.firstElementChild || host2.body;
        c2len = textLen(c2);
        rmeta = { title: art.title || '', byline: art.byline || '', excerpt: art.excerpt || '', siteName: art.siteName || '', published: art.publishedTime || '' };
      }
    } catch (e) {}

    // pick winner
    var winner = null, winnerLen = 0, via = '';
    if (c1 && c1len >= c2len * 0.8) { winner = c1; winnerLen = c1len; via = conf.label; }
    else if (c2) { winner = c2; winnerLen = c2len; via = 'Readability'; }
    else if (c1) { winner = c1; winnerLen = c1len; via = conf.label; }
    else { winner = docA.body; winnerLen = textLen(docA.body); via = 'Body fallback'; }

    if (rmeta) {
      if (rmeta.title && (!meta.title || meta.title.length < 3)) meta.title = rmeta.title;
      if (rmeta.byline && !meta.author) meta.author = rmeta.byline;
      if (rmeta.published && !meta.published) meta.published = rmeta.published;
      if (rmeta.siteName && !meta.siteName) meta.siteName = rmeta.siteName;
      if (rmeta.excerpt && !meta.description) meta.description = rmeta.excerpt;
    }

    // final clean on a fresh clone of winner
    var out = parseHTML('<div id="hce-root"></div>');
    var outRoot = out.getElementById('hce-root');
    try { stripComments(winner); } catch (e) {}
    var clone = winner.cloneNode(true);
    while (clone.firstChild) outRoot.appendChild(clone.firstChild);
    stripComments(outRoot);
    cleanAttrs(outRoot);
    tidyBlocks(outRoot);
    resolveUrls(outRoot, baseUrl);
    // restore article headline if the junk-pass removed it (mirrors Readability behaviour)
    if (!outRoot.querySelector('h1') && meta.title) {
      var h1 = document.createElement('h1');
      h1.textContent = meta.title;
      outRoot.insertBefore(h1, outRoot.firstChild);
    }
    applyOptions(outRoot, opts);
    // drop javascript: hrefs
    var jsAs = outRoot.querySelectorAll('a[href]');
    for (var j = 0; j < jsAs.length; j++) {
      var href = (jsAs[j].getAttribute('href') || '').trim().toLowerCase();
      if (href.indexOf('javascript:') === 0) jsAs[j].removeAttribute('href');
    }

    return { root: outRoot, meta: meta, platform: detected, via: via, len: textLen(outRoot) };
  }

  /* ---------------- markdown ---------------- */
  var turndownReady = typeof TurndownService === 'function';
  var td = null;
  function mdOf(el) {
    if (!turndownReady) return '(Turndown failed to load — check lib/turndown.js)';
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

  /* ---------------- sample page ---------------- */
  var SAMPLE = [
    '<!DOCTYPE html><html lang="en"><head><title>How We Built a Swiss Army Knife of Web Tools - Example Daily</title>',
    '<meta name="author" content="Dina Prakasa">',
    '<meta property="article:published_time" content="2026-07-14T08:00:00Z">',
    '<meta property="og:site_name" content="Example Daily">',
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"How We Built a Swiss Army Knife of Web Tools","author":{"@type":"Person","name":"Dina Prakasa"},"datePublished":"2026-07-14T08:00:00Z","publisher":{"@type":"Organization","name":"Example Daily"}}</scr' + 'ipt></head><body>',
    '<nav class="main-nav"><a href="/">Home</a><a href="/tech">Tech</a><a href="/about">About</a></nav>',
    '<div class="cookie-consent-banner">We use cookies! <button>Accept</button></div>',
    '<div class="page"><aside class="sidebar"><div class="widget">Popular posts</div><div class="widget newsletter-box">Subscribe to our newsletter <input placeholder="email"></aside>',
    '<main><article class="post entry-content">',
    '<header class="post-header"><h1>How We Built a Swiss Army Knife of Web Tools</h1>',
    '<div class="byline">By Dina Prakasa · July 14, 2026 · <span class="share-buttons">Share on Twitter Share on Facebook</span></div></header>',
    '<div class="advert-banner">ADVERTISEMENT — buy stuff!</div>',
    '<p>Everyone told us a browser toolbox was overkill. <b>Fifty-four tools later</b>, the collection handles everything from <a href="https://example.com/dns">DNS lookups</a> to PDF redaction — with zero uploads and no accounts.</p>',
    '<p>This post walks through the architecture, the mistakes, and the numbers behind the launch.</p>',
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

  /* ---------------- render ---------------- */
  var state = { result: null, md: '', text: '', html: '', meta: [], images: [], links: [] };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
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

    var m = r.meta;
    $('#rTitle').textContent = m.title || '(untitled page)';
    $('#rPlatform').textContent = r.via;

    var words = (r.root.textContent.match(/\S+/g) || []).length;
    var paras = r.root.querySelectorAll('p').length;
    var chips = [
      chip('Words', words.toLocaleString('en-US')),
      chip('Read', Math.max(1, Math.round(words / 220)) + ' min'),
      chip('Chars', r.len.toLocaleString('en-US')),
      chip('Site', m.siteName || (function () { try { return state.baseUrl ? new URL(state.baseUrl).hostname : ''; } catch (e) { return ''; } })()),
      chip('Author', m.author),
      chip('Published', fmtDate(m.published)),
      chip('Lang', m.lang),
      chip('Paragraphs', paras)
    ].join('');
    $('#rChips').innerHTML = chips;

    // outputs
    var readerClone = r.root.cloneNode(true);
    $('#readerView').innerHTML = '';
    while (readerClone.firstChild) $('#readerView').appendChild(readerClone.firstChild);

    state.md = mdOf(r.root);
    state.text = toPlainText(r.root);
    state.html = r.root.innerHTML.trim() ? r.root.outerHTML : '';
    $('#mdOut').textContent = state.md;
    $('#textOut').textContent = state.text;
    $('#htmlOut').textContent = state.html;

    // metadata table
    var rows = [
      ['Title', m.title], ['Description', m.description], ['Author', m.author],
      ['Published', m.published], ['Modified', m.modified], ['Site name', m.siteName],
      ['Canonical', m.canonical], ['Language', m.lang], ['OG image', m.ogImage],
      ['Engine', r.via + (r.platform !== 'generic' ? ' (' + r.platform + ' preset)' : '')]
    ];
    m.jsonld.slice(0, 3).forEach(function (j, i) {
      rows.push(['JSON-LD #' + (i + 1), (j.type || '') + (j.headline ? ' — ' + j.headline : '') + (j.published ? ' · ' + j.published : '') + (j.publisher ? ' · ' + j.publisher : '')]);
    });
    $('#metaTable').innerHTML = rows.map(function (row) {
      if (!row[1]) return '';
      var v = row[0] === 'Canonical' || row[0] === 'OG image'
        ? '<a href="' + esc(row[1]) + '" target="_blank" rel="noopener">' + esc(row[1]) + '</a>'
        : esc(row[1]);
      return '<tr><th>' + esc(row[0]) + '</th><td>' + v + '</td></tr>';
    }).join('');

    // images + links
    state.images = [];
    var imgs = r.root.querySelectorAll('img[src]');
    for (var i = 0; i < imgs.length; i++) {
      state.images.push({ src: imgs[i].getAttribute('src'), alt: imgs[i].getAttribute('alt') || '' });
    }
    $('#nImgs').textContent = state.images.length ? '(' + state.images.length + ')' : '';
    $('#imgList').innerHTML = state.images.length ? state.images.map(function (im, ix) {
      return '<div class="hce-item"><img loading="lazy" src="' + esc(im.src) + '" alt="" onerror="this.style.visibility=\'hidden\'" />' +
        '<span class="u"><a href="' + esc(im.src) + '" target="_blank" rel="noopener">' + esc(im.src) + '</a>' +
        (im.alt ? '<span class="alt">' + esc(im.alt) + '</span>' : '') + '</span>' +
        '<button type="button" class="cp" data-copy-url="' + ix + '" title="Copy URL"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>';
    }).join('') : '<p class="hce-hint">No images in the extracted content (or "Include images" is off).</p>';

    state.links = [];
    var seen = {};
    var as = r.root.querySelectorAll('a[href]');
    for (var k = 0; k < as.length; k++) {
      var href = as[k].getAttribute('href');
      if (!href || seen[href]) continue;
      seen[href] = 1;
      state.links.push({ href: href, text: (as[k].textContent || '').replace(/\s+/g, ' ').trim() });
    }
    $('#nLinks').textContent = state.links.length ? '(' + state.links.length + ')' : '';
    $('#linkList').innerHTML = state.links.length ? state.links.map(function (l, ix) {
      return '<div class="hce-item"><span class="u"><a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.href) + '</a>' +
        (l.text ? '<span class="alt">' + esc(l.text) + '</span>' : '') + '</span>' +
        '<button type="button" class="cp" data-copy-link="' + ix + '" title="Copy URL"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>';
    }).join('') : '<p class="hce-hint">No links in the extracted content (or "Keep links" is off).</p>';
  }

  /* ---------------- inputs ---------------- */
  function doExtract(html, baseUrl) {
    var opts = {
      images: $('#optImages').checked,
      links: $('#optLinks').checked,
      tables: $('#optTables').checked,
      embeds: $('#optEmbeds').checked
    };
    try { localStorage.setItem('hce-opts', JSON.stringify(opts)); } catch (e) {}
    state.baseUrl = baseUrl || '';
    try {
      var t0 = Date.now();
      state.result = extract(html, baseUrl, $('#platformSel').value, opts);
      var ms = Date.now() - t0;
      render();
      status('Extracted ' + state.result.len.toLocaleString('en-US') + ' chars via ' + state.result.via + ' in ' + ms + ' ms.');
    } catch (e) {
      status('Extraction failed: ' + (e && e.message ? e.message : e), true, true);
    }
  }

  /* ---------------- URL fetch via CORS relays ---------------- */
  var RELAYS = [
    { name: 'allorigins', make: function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); } },
    { name: 'codetabs', make: function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); } }
  ];
  function fetchViaRelays(url) {
    var i = 0;
    function attempt() {
      if (i >= RELAYS.length) {
        status('All relays failed for this URL (site may block proxies or require JavaScript rendering). Open the page, press Ctrl+U, copy the source and use Paste HTML — it always works.', true, true);
        $('#btnFetch').disabled = false;
        return;
      }
      var relay = RELAYS[i++];
      status('Fetching via relay ' + i + '/' + RELAYS.length + ' (' + relay.name + ') …', false, true);
      var ctrl = new AbortController();
      var to = setTimeout(function () { ctrl.abort(); }, 25000);
      fetch(relay.make(url), { signal: ctrl.signal })
        .then(function (r) {
          clearTimeout(to);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (t) {
          if (!t || t.length < 400 || t.indexOf('<') === -1) throw new Error('relay returned no usable HTML');
          status('Fetched ' + t.length.toLocaleString('en-US') + ' chars via ' + relay.name + ' — extracting…', false, true);
          doExtract(t, url);
          $('#btnFetch').disabled = false;
        })
        .catch(function (err) {
          clearTimeout(to);
          status(relay.name + ': ' + (err && err.name === 'AbortError' ? 'timeout (25 s)' : (err && err.message) || 'failed') + ' — trying next…', false, true);
          attempt();
        });
    }
    attempt();
  }

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
    // options persistence
    try {
      var saved = JSON.parse(localStorage.getItem('hce-opts') || 'null');
      if (saved) {
        $('#optImages').checked = !!saved.images;
        $('#optLinks').checked = !!saved.links;
        $('#optTables').checked = !!saved.tables;
        $('#optEmbeds').checked = !!saved.embeds;
      }
    } catch (e) {}

    document.querySelectorAll('.hce-tabs [data-src]').forEach(function (b) {
      b.addEventListener('click', function () { switchInputTab(b.getAttribute('data-src')); });
    });
    document.querySelectorAll('#outTabs [data-out]').forEach(function (b) {
      b.addEventListener('click', function () { switchOutputTab(b.getAttribute('data-out')); });
    });

    $('#btnParse').addEventListener('click', function () {
      var html = $('#htmlInput').value;
      if (!html.trim()) { status('Paste some HTML first — or hit "Try a sample messy page".', true); return; }
      statusHide();
      doExtract(html, '');
    });
    $('#btnFetch').addEventListener('click', function () {
      var url = $('#urlInput').value.trim();
      if (!/^https?:\/\//i.test(url)) { status('Enter a valid http(s) URL first.', true); return; }
      $('#btnFetch').disabled = true;
      fetchViaRelays(url);
    });
    $('#urlInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#btnFetch').click(); });

    // file input
    var drop = $('#dropZone'), fi = $('#fileInput');
    function loadFile(f) {
      if (!f) return;
      status('Reading ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' KB)…', false, true);
      var fr = new FileReader();
      fr.onload = function () { statusHide(); doExtract(String(fr.result), ''); };
      fr.onerror = function () { status('Could not read the file.', true, true); };
      fr.readAsText(f);
    }
    drop.addEventListener('click', function () { fi.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') fi.click(); });
    fi.addEventListener('change', function () { loadFile(fi.files && fi.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) { loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });

    // sample
    $('#btnSample').addEventListener('click', function () {
      switchInputTab('html');
      $('#htmlInput').value = SAMPLE;
      statusHide();
      doExtract(SAMPLE, 'https://example-daily.example/tech/swiss-army-web-tools');
    });

    // copy / download actions (use shell helpers when available)
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
    var base = function () { return slugify(state.result && state.result.meta.title); };
    $('#copyMd').addEventListener('click', function (e) { copy(state.md, e.currentTarget); });
    $('#copyText2').addEventListener('click', function (e) { copy(state.text, e.currentTarget); });
    $('#copyHtml').addEventListener('click', function (e) { copy(state.html, e.currentTarget); });
    $('#dlMd').addEventListener('click', function () { dl(base() + '.md', state.md, 'text/markdown;charset=utf-8'); });
    $('#dlText').addEventListener('click', function () { dl(base() + '.txt', state.text, 'text/plain;charset=utf-8'); });
    $('#dlHtml').addEventListener('click', function () { dl(base() + '.html', '<!DOCTYPE html>\n<meta charset="utf-8">\n' + state.html, 'text/html;charset=utf-8'); });

    // per-row copy buttons (images / links)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy-url],[data-copy-link]');
      if (!btn) return;
      var ix = btn.getAttribute('data-copy-url');
      var url = ix !== null ? state.images[+ix] && state.images[+ix].src : (state.links[+btn.getAttribute('data-copy-link')] || {}).href;
      if (url) copy(url, btn);
    });
  });
})();
