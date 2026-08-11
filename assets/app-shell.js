/* =================================================================
   Bayhaqy Apps — shared shell (header + footer + theme persistence)
   v2 — Logo-only header (matches portfolio), copy/download/kbd helpers,
        visibility-based auto-clear for sensitive apps.
   Usage in any app:
     <script src="/apps/assets/app-shell.js"
             data-app-name="DNS Lookup"
             data-sensitive="true"></script>
   ================================================================= */
(function () {
  'use strict';

  /* ---------- 1. Apply saved theme BEFORE paint ---------- */
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

  /* ---------- 2. Build header + footer ---------- */
  ready(function () {
    var script = document.currentScript;
    var appName = (script && script.getAttribute('data-app-name')) ||
                  document.body.getAttribute('data-app-name') || 'App';

    // Header: logo only (no text label — matches bayhaqy.github.io portfolio).
    var header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML =
      '<div class="app-header-inner">' +
        '<a class="app-brand" href="/apps/" aria-label="Bayhaqy — Back to apps">' +
          '<img src="/apps/icons/logo.png" alt="Bayhaqy" />' +
        '</a>' +
        '<nav class="app-nav" aria-label="App">' +
          '<a class="back-link" href="/apps/" aria-label="Back to all apps">' +
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

    // Footer: logo + copyright (no "Bayhaqy Apps" text).
    var footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML =
      '<div class="app-footer-inner">' +
        '<a class="brand-mini" href="/apps/" aria-label="Bayhaqy — Apps home">' +
          '<img src="/apps/icons/logo.png" alt="Bayhaqy" />' +
        '</a>' +
        '<span class="copy">© 2026 Achmad Bayhaqy. All rights reserved.</span>' +
        '<span class="links">' +
          '<a href="https://bayhaqy.my.id/">Portfolio</a>' +
          '<a href="https://bayhaqy.my.id/kids/">Kids</a>' +
          '<a href="https://bayhaqy.my.id/games/">Games</a>' +
          '<a href="https://github.com/bayhaqy/apps">GitHub</a>' +
        '</span>' +
      '</div>';
    document.body.appendChild(footer);

    // Set document title if app name provided.
    if (appName && appName !== 'App' && document.title.indexOf(appName) === -1) {
      document.title = appName + ' · Bayhaqy Apps';
    }

    // Theme toggle.
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('bayhaqy-apps-theme', next); } catch (e) {}
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

    initHelpers();
    initSensitiveAutoClear();
    initKeyboardShortcuts();
  });

  /* ---------- 3. Global helpers: toast, copy (with feedback), download ---------- */
  function initHelpers() {
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

    // copyText(text, btn?) — copies and shows visual feedback on the button.
    if (!window.copyText) {
      window.copyText = function (text, btn) {
        var done = function () {
          if (btn) {
            var original = btn.innerHTML;
            var originalCls = btn.className;
            btn.classList.add('copied');
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1em;height:1em;vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            setTimeout(function () {
              btn.innerHTML = original;
              btn.className = originalCls;
            }, 1500);
          }
          window.showToast('Copied to clipboard');
          return true;
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(done).catch(function () { return legacyCopy(text, done); });
        }
        return Promise.resolve(legacyCopy(text, done));
      };
    }

    function legacyCopy(text, done) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done();
        return ok;
      } catch (e) { return false; }
    }

    // downloadText(filename, text, mime) — saves a physical file.
    if (!window.downloadText) {
      window.downloadText = function (filename, text, mime) {
        mime = mime || 'text/plain;charset=utf-8';
        var blob = new Blob([text], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        window.showToast('Downloaded ' + filename);
      };
    }

    // downloadBlob(filename, blob) — saves a Blob/Binary file.
    if (!window.downloadBlob) {
      window.downloadBlob = function (filename, blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        window.showToast('Downloaded ' + filename);
      };
    }

    // Wire up any element with [data-copy-target] — clicks copy the target's text/value.
    document.querySelectorAll('[data-copy-target]').forEach(function (btn) {
      if (btn._bayhaqyCopyBound) return;
      btn._bayhaqyCopyBound = true;
      btn.addEventListener('click', function () {
        var sel = btn.getAttribute('data-copy-target');
        var el = document.querySelector(sel);
        if (!el) return;
        var text = el.value !== undefined ? el.value : el.textContent;
        window.copyText(text, btn);
      });
    });

    // Wire up [data-download-target] — clicks download the target's text/value as a file.
    document.querySelectorAll('[data-download-target]').forEach(function (btn) {
      if (btn._bayhaqyDownloadBound) return;
      btn._bayhaqyDownloadBound = true;
      btn.addEventListener('click', function () {
        var sel = btn.getAttribute('data-download-target');
        var el = document.querySelector(sel);
        if (!el) return;
        var text = el.value !== undefined ? el.value : el.textContent;
        var ext = btn.getAttribute('data-download-ext') || 'txt';
        var mime = btn.getAttribute('data-download-mime') || 'text/plain;charset=utf-8';
        var name = btn.getAttribute('data-download-name') || ('bayhaqy-' + Date.now() + '.' + ext);
        window.downloadText(name, text, mime);
      });
    });
  }

  /* ---------- 4. Sensitive-app auto-clear on visibility change ---------- */
  function initSensitiveAutoClear() {
    var isSensitive = document.body.hasAttribute('data-sensitive') ||
                      (document.currentScript && document.currentScript.getAttribute('data-sensitive') === 'true');
    if (!isSensitive) return;

    var inputs = [];
    function collectInputs() {
      inputs = Array.prototype.slice.call(
        document.querySelectorAll('textarea, input[type="text"], input[type="password"], input[type="search"], [contenteditable="true"]')
      );
    }
    collectInputs();
    // Re-collect when DOM changes (e.g. dynamic elements).
    var observer = new MutationObserver(function () { collectInputs(); });
    observer.observe(document.body, { childList: true, subtree: true });

    function clearAll() {
      inputs.forEach(function (el) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.value = '';
        } else if (el.hasAttribute('contenteditable')) {
          el.textContent = '';
        }
      });
      // Also clear any output containers marked [data-auto-clear].
      document.querySelectorAll('[data-auto-clear]').forEach(function (el) {
        if (el.value !== undefined) el.value = '';
        else el.textContent = '';
      });
      window.showToast('Cleared for your privacy');
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') clearAll();
    });
    window.addEventListener('blur', function () { clearAll(); });
  }

  /* ---------- 5. Global keyboard shortcuts ---------- */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      // Esc — clear all primary inputs (textareas, search inputs).
      if (e.key === 'Escape') {
        var target = e.target;
        if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
          target.value = '';
          target.focus();
          window.showToast('Cleared');
          return;
        }
        // Otherwise clear the first primary textarea/input on the page.
        var primary = document.querySelector('textarea[data-primary], input[data-primary]');
        if (primary) {
          primary.value = '';
          primary.focus();
          window.showToast('Cleared');
        }
      }

      // Ctrl/Cmd + Enter — click the primary action button.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.keyCode === 13)) {
        var btn = document.querySelector('button[data-primary], input[type="submit"][data-primary]');
        if (btn) {
          e.preventDefault();
          btn.click();
        }
      }
    });
  }
})();
