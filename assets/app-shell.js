/* =================================================================
   Bayhaqy Apps — shared shell (header + footer + theme persistence).
   Inject the markup so every app stays in sync with one source file.
   Usage in any app:
     <script src="/apps/assets/app-shell.js" data-app-name="DNS Lookup"></script>
   ================================================================= */
(function () {
  'use strict';

  // Apply saved theme BEFORE paint to avoid flash.
  try {
    var t = localStorage.getItem('bayhaqy-apps-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    var script = document.currentScript;
    // The script tag may not be `currentScript` on DOMContentLoaded — read from data attr on body if set.
    var appName = (script && script.getAttribute('data-app-name')) || document.body.getAttribute('data-app-name') || 'App';
    var brandLabel = (script && script.getAttribute('data-brand-label')) || document.body.getAttribute('data-brand-label') || 'Apps';

    // Build header.
    var header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML =
      '<div class="app-header-inner">' +
        '<a class="app-brand" href="/apps/" aria-label="Bayhaqy Apps — Home">' +
          '<img src="/apps/icons/logo.png" alt="Bayhaqy" />' +
          '<span class="app-brand-text">' +
            '<span class="label">Bayhaqy</span>' +
            '<span class="sep">·</span>' +
            '<span class="app-name">' + escapeHtml(appName) + '</span>' +
          '</span>' +
        '</a>' +
        '<nav class="app-nav" aria-label="App">' +
          '<a class="back-link" href="/apps/" aria-label="Back to Apps">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
            '<span>All apps</span>' +
          '</a>' +
          '<button class="theme-toggle" type="button" aria-label="Toggle dark mode" id="themeToggle">' +
            '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
            '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="3.5"/><line x1="12" y1="20.5" x2="12" y2="22.5"/><line x1="4.22" y1="4.22" x2="5.64"  y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1.5" y1="12" x2="3.5" y2="12"/><line x1="20.5" y1="12" x2="22.5" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
          '</button>' +
        '</nav>' +
      '</div>';
    document.body.insertBefore(header, document.body.firstChild);

    // Build footer.
    var footer = document.createElement('footer');
    footer.className = 'app-footer';
    var year = new Date().getFullYear();
    footer.innerHTML =
      '<div class="app-footer-inner">' +
        '<span class="brand-mini">' +
          '<img src="/apps/icons/logo.png" alt="Bayhaqy" />' +
          '<span>Bayhaqy Apps</span>' +
        '</span>' +
        '<span class="copy">© ' + year + ' Achmad Bayhaqy · <a href="https://bayhaqy.my.id/">bayhaqy.my.id</a></span>' +
        '<span class="links">' +
          '<a href="https://bayhaqy.my.id/">Portfolio</a>' +
          '<a href="https://bayhaqy.my.id/games/">Games</a>' +
          '<a href="https://github.com/bayhaqy/apps">GitHub</a>' +
        '</span>' +
      '</div>';
    document.body.appendChild(footer);

    // Theme toggle.
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('bayhaqy-apps-theme', next); } catch (e) {}
        // Notify any listeners (e.g. charts that need to re-render with new colors).
        try {
          document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
        } catch (e) {}
      });
    }

    // Header scrolled state.
    var lastY = 0;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (y > 4 && lastY <= 4) header.classList.add('scrolled');
      else if (y <= 4 && lastY > 4) header.classList.remove('scrolled');
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Global toast helper.
    if (!window.showToast) {
      var toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
      var toastTimer = null;
      window.showToast = function (msg, ms) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1800);
      };
    }

    // Global copy helper.
    if (!window.copyText) {
      window.copyText = function (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(function () { return true; });
        }
        return new Promise(function (resolve) {
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            resolve(ok);
          } catch (e) { resolve(false); }
        });
      };
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }
})();
