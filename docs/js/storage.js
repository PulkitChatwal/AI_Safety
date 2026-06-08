/**
 * GovAlign Annotator - Storage Layer
 *
 * Handles:
 * - localStorage for session persistence and offline annotation caching
 * - Google Sheets sync via Apps Script Web App
 *
 * ==========================================
 * SETUP: Replace SHEETS_ENDPOINT below with your deployed Google Apps Script URL
 * ==========================================
 *
 * TODO: Replace this placeholder with your actual deployed Web App URL
 * Example: 'https://script.google.com/macros/s/YOUR_PROJECT_ID/exec'
 *
 * To deploy:
 * 1. Go to https://script.google.com and open your GovAlign project
 * 2. Deploy → New deployment → Web app
 * 3. Set "Who has access" to "Anyone" (anonymous)
 * 4. Copy the deployment URL and paste it below
 */
var SHEETS_ENDPOINT = 'https://script.google.com/macros/s/YOUR_PROJECT_ID/exec';

// For demo mode (localStorage only, works without Google Sheet backend):
// Set to any truthy value, or just comment out SHEETS_ENDPOINT above
var DEMO_MODE = true;  // ← Set to false once you configure SHEETS_ENDPOINT

var STORAGE = (function() {
  var ANNOTATOR_KEY = 'govalign_annotator_id';
  var ANNOTATIONS_KEY = 'govalign_annotations';
  var LAST_SYNC_KEY = 'govalign_last_sync';

  // ─────────────────────────────────────
  // Session management
  // ─────────────────────────────────────

  function getAnnotatorId() {
    return localStorage.getItem(ANNOTATOR_KEY);
  }

  function setAnnotatorId(id) {
    if (!id || !id.trim()) {
      return false;
    }
    localStorage.setItem(ANNOTATOR_KEY, id.trim().toUpperCase());
    return true;
  }

  function logout() {
    localStorage.removeItem(ANNOTATOR_KEY);
  }

  function isLoggedIn() {
    return !!getAnnotatorId();
  }

  function isAdmin() {
    return getAnnotatorId() === 'ADMIN';
  }

  // ─────────────────────────────────────
  // Annotation storage (local)
  // ─────────────────────────────────────

  function getLocalAnnotations(annotatorId) {
    var data = localStorage.getItem(ANNOTATIONS_KEY);
    var all = data ? JSON.parse(data) : {};
    if (annotatorId) {
      return all[annotatorId] || [];
    }
    return all;
  }

  function saveLocalAnnotation(annotation) {
    var aid = annotation.annotator_id || getAnnotatorId();
    if (!aid) return false;
    var all = getLocalAnnotations();
    if (!all[aid]) all[aid] = [];
    all[aid].push(Object.assign({
      saved_at: Date.now()
    }, annotation));
    localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
    return true;
  }

  function getLocalAnnotationCount(annotatorId) {
    var list = getLocalAnnotations(annotatorId);
    return list.length;
  }

  // ─────────────────────────────────────
  // Google Sheets sync
  // ─────────────────────────────────────

  function getLastSync() {
    var ts = localStorage.getItem(LAST_SYNC_KEY);
    return ts ? parseInt(ts, 10) : null;
  }

  function setLastSync() {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  }

  /**
   * Sync a single annotation to the backend.
   * Returns a Promise that resolves to { ok: true } on success.
   */
  function syncAnnotation(annotation) {
    if (DEMO_MODE || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('YOUR_PROJECT_ID')) {
      console.log('[Demo] Would sync annotation:', annotation);
      return Promise.resolve({ ok: true, demo: true });
    }
    return fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: 'save_annotation' }, annotation))
    })
    .then(function(r) { return r.json(); })
    .catch(function(e) {
      console.error('Sync failed:', e);
      return { ok: false, error: String(e) };
    });
  }

  /**
   * Register a new annotator in the backend.
   */
  function registerAnnotator(annotatorId) {
    if (DEMO_MODE || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('YOUR_PROJECT_ID')) {
      console.log('[Demo] Would register annotator:', annotatorId);
      return Promise.resolve({ ok: true, demo: true });
    }
    return fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register_user', annotator_id: annotatorId })
    })
    .then(function(r) { return r.json(); })
    .catch(function(e) {
      console.error('Registration failed:', e);
      return { ok: false, error: String(e) };
    });
  }

  /**
   * Get progress for an annotator from the backend.
   */
  function getProgress(annotatorId) {
    if (DEMO_MODE || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('YOUR_PROJECT_ID')) {
      var local = getLocalAnnotations(annotatorId);
      return Promise.resolve({
        ok: true, demo: true,
        total: local.length,
        per_batch: computeBatchCounts_(local)
      });
    }
    return fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_progress', annotator_id: annotatorId })
    })
    .then(function(r) { return r.json(); })
    .catch(function(e) {
      console.error('Get progress failed:', e);
      return { ok: false, error: String(e), total: 0 };
    });
  }

  /**
   * Get all annotators' progress from the backend (admin only).
   */
  function getAllProgress() {
    if (DEMO_MODE || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('YOUR_PROJECT_ID')) {
      var all = getLocalAnnotations();
      var out = [];
      Object.keys(all).forEach(function(aid) {
        out.push({
          annotator_id: aid,
          total: all[aid].length,
          per_batch: computeBatchCounts_(all[aid])
        });
      });
      return Promise.resolve({ ok: true, demo: true, annotators: out });
    }
    return fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_all_progress' })
    })
    .then(function(r) { return r.json(); })
    .catch(function(e) {
      console.error('Get all progress failed:', e);
      return { ok: false, error: String(e), annotators: [] };
    });
  }

  /**
   * Assign a batch to an annotator.
   */
  function assignBatch(annotatorId, batchId) {
    if (DEMO_MODE || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('YOUR_PROJECT_ID')) {
      console.log('[Demo] Would assign batch:', batchId, 'to', annotatorId);
      return Promise.resolve({ ok: true, demo: true });
    }
    return fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_batch',
        annotator_id: annotatorId,
        batch_id: batchId
      })
    })
    .then(function(r) { return r.json(); })
    .catch(function(e) {
      console.error('Assign batch failed:', e);
      return { ok: false, error: String(e) };
    });
  }

  /**
   * Get all annotations (for export).
   */
  function getAllAnnotations(annotatorId) {
    if (DEMO_MODE || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('YOUR_PROJECT_ID')) {
      return Promise.resolve({
        ok: true, demo: true,
        annotations: getLocalAnnotations(annotatorId)
      });
    }
    var payload = annotatorId
      ? { action: 'get_annotations', annotator_id: annotatorId }
      : { action: 'get_all_annotations' };
    return fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .catch(function(e) {
      console.error('Get annotations failed:', e);
      return { ok: false, error: String(e), annotations: [] };
    });
  }

  // ─────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────

  function computeBatchCounts_(list) {
    var counts = {};
    list.forEach(function(a) {
      var b = a.batch_id;
      if (b) counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  }

  // Public API
  return {
    getAnnotatorId: getAnnotatorId,
    setAnnotatorId: setAnnotatorId,
    logout: logout,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    getLocalAnnotations: getLocalAnnotations,
    saveLocalAnnotation: saveLocalAnnotation,
    getLocalAnnotationCount: getLocalAnnotationCount,
    getLastSync: getLastSync,
    setLastSync: setLastSync,
    syncAnnotation: syncAnnotation,
    registerAnnotator: registerAnnotator,
    getProgress: getProgress,
    getAllProgress: getAllProgress,
    assignBatch: assignBatch,
    getAllAnnotations: getAllAnnotations
  };
})();