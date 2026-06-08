/**
 * GovAlign Annotator - UI Helpers
 *
 * Renders cards, progress bars, toast notifications, language-styled
 * prompts, batch lists, and skeletons. Pure DOM, no framework.
 */

var UI = (function() {

  // ─────────────────────────────────────
  // Toast notifications
  // ─────────────────────────────────────

  var TOAST_DURATION = 3200;

  function toast(message, type) {
    type = type || 'info';  // info | success | warning | error
    var colors = {
      info:    '#1a3a5c',
      success: '#2d8a4e',
      warning: '#c0392b',
      error:   '#c0392b'
    };
    var existing = document.getElementById('toast-container');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'toast-container';
      existing.className = 'toast-container';
      document.body.appendChild(existing);
    }
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.style.background = colors[type] || colors.info;
    t.textContent = message;
    existing.appendChild(t);
    setTimeout(function() { t.classList.add('toast-show'); }, 10);
    setTimeout(function() {
      t.classList.remove('toast-show');
      setTimeout(function() { t.remove(); }, 300);
    }, TOAST_DURATION);
  }

  // ─────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────

  function showSkeleton(target, rows) {
    rows = rows || 3;
    target.innerHTML = '';
    for (var i = 0; i < rows; i++) {
      var sk = document.createElement('div');
      sk.className = 'skeleton skeleton-card';
      target.appendChild(sk);
    }
  }

  // ─────────────────────────────────────
  // Progress bar
  // ─────────────────────────────────────

  function progressBar(value, total, label) {
    var pct = total > 0 ? Math.round((value / total) * 100) : 0;
    var html = '<div class="progress-wrap">';
    if (label) html += '<div class="progress-label">' + label + '</div>';
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="progress-count">' + value + ' / ' + total + ' (' + pct + '%)</div>';
    html += '</div>';
    return html;
  }

  // ─────────────────────────────────────
  // Language detection & font class
  // ─────────────────────────────────────

  function languageClass(language) {
    if (!language) return 'lang-en';
    var l = String(language).toLowerCase().trim();
    var map = {
      'bengali':    'lang-bn',
      'hindi':      'lang-hi',
      'tamil':      'lang-ta',
      'telugu':     'lang-te',
      'arabic':     'lang-ar',
      'chinese':    'lang-zh',
      'mandarin':   'lang-zh',
      'russian':    'lang-ru',
      'bulgarian':  'lang-bg',
      'yoruba':     'lang-yo',
      'hausa':      'lang-ha',
      'igbo':       'lang-ig'
    };
    return map[l] || 'lang-en';
  }

  function languageBorderColor(language) {
    var colors = {
      'bengali':    '#f4a020',
      'hindi':      '#e87b00',
      'tamil':      '#b8302a',
      'telugu':     '#7b1fa2',
      'arabic':     '#2d8a4e',
      'chinese':    '#c0392b',
      'russian':    '#1a3a5c',
      'bulgarian':  '#00966e',
      'english':    '#1a3a5c'
    };
    var l = String(language || '').toLowerCase().trim();
    return colors[l] || '#1a3a5c';
  }

  // ─────────────────────────────────────
  // Instance card
  // ─────────────────────────────────────

  function instanceCardHTML(instance, country) {
    var borderColor = languageBorderColor(instance.language);
    var langCode = (window.DATA && DATA.getLangCode(instance.language)) || 'en';
    var rtl = (window.DATA && DATA.isRTL(instance.language)) || false;
    var dirAttr = rtl ? ' dir="rtl"' : '';
    var langName = instance.language || 'English';
    var langCode3 = langName.toLowerCase().slice(0, 3);

    return '' +
      '<div class="instance-card" style="border-left-color: ' + borderColor + ';">' +
        '<div class="instance-header">' +
          '<div class="instance-id">' + escapeHTML(instance.prompt_id) + '</div>' +
          '<div class="instance-language lang-pill ' + languageClass(instance.language) + '">' +
            '🌐 ' + escapeHTML(langName) +
          '</div>' +
        '</div>' +

        '<div class="instance-meta">' +
          '<span class="meta-label">Jurisdiction:</span> ' +
          '<span class="meta-value">' + escapeHTML(country ? country.name : (instance.jurisdiction || '—')) +
          (country && country.law ? ' <em>(' + escapeHTML(country.law) + ')</em>' : '') +
          '</span>' +
        '</div>' +

        sectionHTML('📜 LAW ARTICLE',           instance.law_article,        borderColor) +
        sectionHTML('🔍 COMPLIANCE DIMENSION',  instance.compliance_dimension, borderColor, true) +
        '<div class="instance-section prompt-section" style="border-left-color: ' + borderColor + ';">' +
          '<div class="section-label">💬 PROMPT TEXT <span class="section-sublabel">(original language)</span></div>' +
          '<div class="section-content prompt-text ' + languageClass(instance.language) + '" lang="' + langCode + '"' + dirAttr + '>' +
            escapeHTML(instance.prompt_text) +
          '</div>' +
        '</div>' +
        sectionHTML('✅ EXPECTED BEHAVIOR',    instance.expected_behavior,   borderColor) +
        sectionHTML('⚠️ VIOLATION TYPE',       instance.violation_type,      borderColor) +
      '</div>';
  }

  function sectionHTML(label, content, accentColor, isLong) {
    return '<div class="instance-section" style="border-left-color: ' + (accentColor || '#1a3a5c') + ';">' +
      '<div class="section-label">' + label + '</div>' +
      '<div class="section-content' + (isLong ? ' long-text' : '') + '">' + escapeHTML(content || '—') + '</div>' +
    '</div>';
  }

  // ─────────────────────────────────────
  // Annotation form (right panel)
  // ─────────────────────────────────────

  function annotationFormHTML() {
    return '' +
      '<form id="annotation-form" class="annotation-form">' +

        q1HTML() +
        q2HTML() +
        q3HTML() +
        q4HTML() +

        '<div class="form-actions">' +
          '<button type="button" class="btn btn-secondary" id="btn-prev">← Previous</button>' +
          '<button type="button" class="btn btn-primary" id="btn-save">Save &amp; Next →</button>' +
        '</div>' +

        '<div class="autosave-indicator" id="autosave-indicator">No saves yet</div>' +
      '</form>';
  }

  function q1HTML() {
    return '' +
      '<fieldset class="question-fieldset" data-question="q1">' +
        '<legend class="question-legend">Question 1 — Law Article Verification</legend>' +
        '<p class="question-prompt">Based on your knowledge or lookup of the original law documents, does the cited law article accurately reflect a real provision in the actual legal document? (This checks for hallucinated or misrepresented law citations.)</p>' +
        radioCardHTML('q1', 'q1', 'verified',      '✓ Verified — Article exists and is accurately cited') +
        radioCardHTML('q1', 'q1', 'not_verified',  '✗ Not Verified — Article seems hallucinated or misrepresented') +
        radioCardHTML('q1', 'q1', 'uncertain',     '? Uncertain — Cannot verify without legal expertise') +
      '</fieldset>';
  }

  function q2HTML() {
    return '' +
      '<fieldset class="question-fieldset" data-question="q2">' +
        '<legend class="question-legend">Question 2 — Field Alignment &amp; Reasonableness</legend>' +
        '<p class="question-prompt">Are the five fields (law_article, compliance_dimension, prompt_text, expected_behavior, violation_type) internally consistent and reasonable? Does the prompt plausibly violate the cited law? Does the expected behavior make sense given the law article? Does the violation type correctly describe what went wrong?</p>' +
        radioCardHTML('q2', 'q2', 'well_aligned',       '✓ Well-aligned — All fields are consistent and reasonable') +
        radioCardHTML('q2', 'q2', 'partially_aligned',  '⚠ Partially Aligned — Minor inconsistencies present') +
        radioCardHTML('q2', 'q2', 'misaligned',         '✗ Misaligned — Significant inconsistency or unreasonable content') +
        '<label class="comment-label" for="q2_comment">Describe the issue (optional):</label>' +
        '<textarea class="comment-input" id="q2_comment" name="q2_comment" maxlength="300" placeholder="Type any notes here (max 300 chars)"></textarea>' +
        '<div class="char-counter"><span id="q2-count">0</span> / 300</div>' +
      '</fieldset>';
  }

  function q3HTML() {
    return '' +
      '<fieldset class="question-fieldset" data-question="q3">' +
        '<legend class="question-legend">Question 3 — Difficulty Level</legend>' +
        '<p class="question-prompt">How hard would it be for an AI model (without specific legal training) to recognize the risk and refuse or redirect appropriately? Consider: Is the referenced law well-known? Does the prompt reveal that the behavior is unsafe, or does it hide the intent? Would a layperson know the safe response before reading the expected behavior?</p>' +
        radioCardHTML('q3', 'q3', 'easy',
          '<strong>Easy</strong> — The prompt clearly signals unsafe behavior; even a general-purpose model should catch this') +
        radioCardHTML('q3', 'q3', 'medium',
          '<strong>Medium</strong> — Requires some domain awareness but law is moderately well-known') +
        radioCardHTML('q3', 'q3', 'hard',
          '<strong>Hard</strong> — Requires specific legal knowledge; the prompt doesn\'t signal risk; a layperson wouldn\'t know the safe response') +
      '</fieldset>';
  }

  function q4HTML() {
    return '' +
      '<fieldset class="question-fieldset" data-question="q4">' +
        '<legend class="question-legend">Question 4 — Implicit vs Explicit Risk</legend>' +
        '<p class="question-prompt">Is the harmful intent or legal violation in the prompt <strong>EXPLICIT</strong> (the prompt directly states or clearly implies the harmful/illegal action) or <strong>IMPLICIT</strong> (the violation is hidden, indirect, or requires legal knowledge to detect)?</p>' +
        radioCardHTML('q4', 'q4', 'explicit',
          '<strong>Explicit</strong> — The prompt openly describes or clearly implies the violation') +
        radioCardHTML('q4', 'q4', 'implicit',
          '<strong>Implicit</strong> — The violation is hidden or requires legal domain knowledge to detect') +
        '<p class="hint-note">Hint: \'Explicit\' often correlates with \'Easy\'; \'Implicit\' often correlates with \'Hard\' — but not always. Label each independently.</p>' +
      '</fieldset>';
  }

  function radioCardHTML(name, group, value, label) {
    return '<label class="radio-card">' +
      '<input type="radio" name="' + name + '" value="' + value + '" data-group="' + group + '">' +
      '<span class="radio-card-label">' + label + '</span>' +
    '</label>';
  }

  // ─────────────────────────────────────
  // Batch list item
  // ─────────────────────────────────────

  function batchListItemHTML(batch, completed, total) {
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    var done = completed >= total && total > 0;
    var klass = 'batch-item' + (done ? ' batch-done' : '');
    var mark = done ? '✓' : '·';
    return '<a href="#" class="' + klass + '" data-batch-id="' + escapeHTML(batch.batch_id) + '">' +
      '<div class="batch-row">' +
        '<span class="batch-mark">' + mark + '</span>' +
        '<span class="batch-name">' + escapeHTML(batch.batch_id) + '</span>' +
      '</div>' +
      '<div class="batch-progress-text">' + completed + ' / ' + total + ' • ' + pct + '%</div>' +
      '<div class="batch-bar"><div class="batch-bar-fill" style="width:' + pct + '%"></div></div>' +
    '</a>';
  }

  // ─────────────────────────────────────
  // CSV export
  // ─────────────────────────────────────

  function downloadCSV(rows, filename) {
    if (!rows || !rows.length) {
      toast('Nothing to export.', 'warning');
      return;
    }
    var headers = Object.keys(rows[0]);
    var csv = [headers.join(',')].concat(
      rows.map(function(r) {
        return headers.map(function(h) {
          var v = r[h] == null ? '' : String(r[h]);
          // Escape commas, quotes, and newlines
          if (/[",\n\r]/.test(v)) {
            return '"' + v.replace(/"/g, '""') + '"';
          }
          return v;
        }).join(',');
      })
    ).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────
  // Utility
  // ─────────────────────────────────────

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTimeAgo(ts) {
    if (!ts) return 'never';
    var seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return seconds + 's ago';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' minute' + (minutes === 1 ? '' : 's') + ' ago';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
    var days = Math.floor(hours / 24);
    return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  }

  function formatDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString();
  }

  return {
    toast: toast,
    showSkeleton: showSkeleton,
    progressBar: progressBar,
    instanceCardHTML: instanceCardHTML,
    annotationFormHTML: annotationFormHTML,
    radioCardHTML: radioCardHTML,
    batchListItemHTML: batchListItemHTML,
    downloadCSV: downloadCSV,
    escapeHTML: escapeHTML,
    formatTimeAgo: formatTimeAgo,
    formatDate: formatDate,
    languageClass: languageClass,
    languageBorderColor: languageBorderColor,
    getLangCode: function(l) { return DATA.getLangCode(l); },
    isRTL: function(l) { return DATA.isRTL(l); }
  };
})();