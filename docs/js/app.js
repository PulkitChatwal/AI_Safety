/**
 * GovAlign Annotator - Core App Logic
 *
 * Shared utilities used across all pages (login, annotate, dashboard, admin).
 * - Header/footer rendering
 * - Login redirect
 * - Logout
 * - Welcome screen
 * - Common initialization
 */

var APP = (function() {

  // ─────────────────────────────────────
  // Header
  // ─────────────────────────────────────

  function renderHeader(activePage) {
    var aid = STORAGE.getAnnotatorId();
    var isAdmin = STORAGE.isAdmin();

    var navLinks = '';
    if (aid) {
      navLinks += '<a href="annotate.html" class="nav-link ' + (activePage === 'annotate' ? 'active' : '') + '">Annotate</a>';
      navLinks += '<a href="dashboard.html" class="nav-link ' + (activePage === 'dashboard' ? 'active' : '') + '">Dashboard</a>';
      if (isAdmin) {
        navLinks += '<a href="admin.html" class="nav-link ' + (activePage === 'admin' ? 'active' : '') + '">Admin</a>';
      }
    }

    return '<header class="app-header">' +
      '<div class="header-inner">' +
        '<a href="index.html" class="brand">' +
          '<span class="brand-mark">⚖</span>' +
          '<span class="brand-text">' +
            '<span class="brand-name">GovAlign</span>' +
            '<span class="brand-sub">Annotator</span>' +
          '</span>' +
        '</a>' +
        '<nav class="main-nav">' + navLinks + '</nav>' +
        '<div class="user-chip">' +
          (aid
            ? '<span class="user-id">' + UI.escapeHTML(aid) + (isAdmin ? ' <span class="admin-badge">ADMIN</span>' : '') + '</span>' +
              '<button class="btn-link" id="btn-logout">Logout</button>'
            : '<a class="btn-link" href="index.html">Sign in</a>') +
        '</div>' +
      '</div>' +
    '</header>';
  }

  // ─────────────────────────────────────
  // Footer
  // ─────────────────────────────────────

  function renderFooter() {
    var mode = (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) ? 'Demo (localStorage only)' : 'Live (Google Sheets)';
    return '<footer class="app-footer">' +
      '<div class="footer-inner">' +
        '<span>GovAlign Annotator · v1.0</span>' +
        '<span>Mode: <strong>' + mode + '</strong></span>' +
        '<span>AI Safety Research</span>' +
      '</div>' +
    '</footer>';
  }

  // ─────────────────────────────────────
  // Auth helpers
  // ─────────────────────────────────────

  function requireLogin() {
    if (!STORAGE.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  function requireAdmin() {
    if (!STORAGE.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    if (!STORAGE.isAdmin()) {
      UI.toast('Admin access only.', 'error');
      setTimeout(function() { window.location.href = 'dashboard.html'; }, 800);
      return false;
    }
    return true;
  }

  function bindLogout() {
    var btn = document.getElementById('btn-logout');
    if (btn) {
      btn.addEventListener('click', function() {
        STORAGE.logout();
        window.location.href = 'index.html';
      });
    }
  }

  // ─────────────────────────────────────
  // Welcome / login flow
  // ─────────────────────────────────────

  /**
   * Try to log the user in. If new, register them in the backend.
   * Resolves to { ok, annotator_id, isNew }.
   */
  function login(annotatorId) {
    if (!annotatorId || !annotatorId.trim()) {
      return Promise.resolve({ ok: false, error: 'Annotator ID required.' });
    }
    var id = annotatorId.trim().toUpperCase();
    var isNew = !STORAGE.getAnnotatorId() || STORAGE.getAnnotatorId() !== id;
    STORAGE.setAnnotatorId(id);

    // For non-admin, register on first login.
    if (id !== 'ADMIN') {
      return STORAGE.registerAnnotator(id).then(function(r) {
        return { ok: r.ok, annotator_id: id, isNew: isNew, demo: r.demo };
      });
    }
    return Promise.resolve({ ok: true, annotator_id: id, isNew: isNew, isAdmin: true });
  }

  // ─────────────────────────────────────
  // Routing for index.html
  // ─────────────────────────────────────

  function routeAfterLogin(annotatorId) {
    if (annotatorId === 'ADMIN') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'annotate.html';
    }
  }

  // ─────────────────────────────────────
  // Country list (landing page)
  // ─────────────────────────────────────

  function renderCountryGrid(targetEl) {
    var countries = DATA.getCountries();
    var html = '<div class="country-grid">';
    countries.forEach(function(c) {
      var klass = 'country-card' + (c.available ? '' : ' country-disabled');
      var badge = c.available
        ? '<span class="badge badge-available">Available</span>'
        : '<span class="badge badge-coming">Coming Soon</span>';
      var action = c.available
        ? '<a class="btn btn-primary" href="annotate.html?country=' + c.key + '">Start Annotating →</a>'
        : '<span class="btn btn-secondary btn-disabled">Notify Me</span>';
      html += '<div class="' + klass + '" data-country="' + c.key + '">' +
        '<div class="country-card-top" style="background:' + c.color + '"></div>' +
        '<div class="country-card-body">' +
          '<div class="country-name">' + UI.escapeHTML(c.name) + '</div>' +
          '<div class="country-law">' + UI.escapeHTML(c.law) + '</div>' +
          '<div class="country-badge-row">' + badge + '</div>' +
          '<div class="country-action">' + action + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    targetEl.innerHTML = html;
  }

  // ─────────────────────────────────────
  // Init: header, footer, logout
  // ─────────────────────────────────────

  function init(activePage) {
    var headerSlot = document.getElementById('app-header');
    var footerSlot = document.getElementById('app-footer');
    if (headerSlot) headerSlot.outerHTML = renderHeader(activePage);
    if (footerSlot) footerSlot.outerHTML = renderFooter();
    bindLogout();
  }

  return {
    init: init,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    requireLogin: requireLogin,
    requireAdmin: requireAdmin,
    login: login,
    routeAfterLogin: routeAfterLogin,
    renderCountryGrid: renderCountryGrid,
    bindLogout: bindLogout
  };
})();