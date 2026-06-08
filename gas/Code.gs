/**
 * GovAlign Annotator - Google Apps Script Backend
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Google Drive → New → Google Apps Script
 * 2. Copy-paste this entire file into the editor (Code.gs)
 * 3. Save the project (e.g., name it "GovAlign Annotator Backend")
 * 4. Run the `initializeSheets()` function once to set up the three sheets:
 *    - "Annotations"  : log of every annotation
 *    - "Annotators"   : registered annotator IDs
 *    - "BatchAssignments" : which annotator owns which batch
 * 5. Click "Deploy" → "New deployment"
 * 6. Type: "Web app", Execute as: "Me", Who has access: "Anyone"
 * 7. Click "Deploy" → copy the Web App URL
 * 8. Paste that URL into docs/js/storage.js as SHEETS_ENDPOINT
 *
 * API CONTRACT (all requests are POST with JSON body):
 *
 *   { action: "save_annotation",
 *     annotator_id: "PKT01",
 *     batch_id:     "IND-B01-PKT01",
 *     prompt_id:    "DPDPA-CONSENT-001",
 *     jurisdiction: "India (DPDPA 2023)",
 *     q1:           "verified" | "not_verified" | "uncertain",
 *     q2:           "well_aligned" | "partially_aligned" | "misaligned",
 *     q2_comment:   "optional free text (max 300 chars)",
 *     q3:           "easy" | "medium" | "hard",
 *     q4:           "explicit" | "implicit" }
 *
 *   { action: "register_user",    annotator_id: "PKT01" }
 *   { action: "get_progress",     annotator_id: "PKT01" }
 *   { action: "get_all_progress" }                       (admin only)
 *   { action: "assign_batch",     batch_id: "IND-B01",  annotator_id: "PKT01" }
 *
 * RESPONSES are JSON: { ok: true, ... } on success, { ok: false, error: "..." } on failure.
 */

var SHEET_ANNOTATIONS  = "Annotations";
var SHEET_ANNOTATORS   = "Annotators";
var SHEET_ASSIGNMENTS  = "BatchAssignments";

var HEADER_ANNOTATIONS = [
  "timestamp", "annotator_id", "batch_id", "prompt_id", "jurisdiction",
  "q1_law_verified", "q2_alignment", "q2_comment", "q3_difficulty", "q4_implicit_explicit"
];
var HEADER_ANNOTATORS = [
  "annotator_id", "registered_at", "last_active", "total_annotated"
];
var HEADER_ASSIGNMENTS = [
  "batch_id", "annotator_id", "assigned_at", "completed_count"
];

/**
 * Run this ONCE after creating the spreadsheet so the three required sheets
 * exist with the right headers. Safe to run again — it only adds missing sheets
 * and missing headers.
 */
function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_ANNOTATIONS,  HEADER_ANNOTATIONS);
  ensureSheet_(ss, SHEET_ANNOTATORS,   HEADER_ANNOTATORS);
  ensureSheet_(ss, SHEET_ASSIGNMENTS,  HEADER_ASSIGNMENTS);
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
}

/**
 * Web App entry point. POST a JSON body; this writes/reads the sheets.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;
    var result;

    switch (action) {
      case "save_annotation":   result = saveAnnotation_(payload);   break;
      case "register_user":     result = registerUser_(payload);     break;
      case "get_progress":      result = getProgress_(payload);      break;
      case "get_all_progress":  result = getAllProgress_();          break;
      case "assign_batch":      result = assignBatch_(payload);      break;
      case "get_annotations":   result = getAnnotations_(payload);   break;
      case "get_all_annotations": result = getAllAnnotations_();     break;
      default:
        result = { ok: false, error: "Unknown action: " + action };
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/**
 * Handle GET requests (e.g. a simple health check from a browser).
 * Use ?action=get_all_progress to fetch admin data without a POST.
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  if (action === "ping")              return jsonResponse_({ ok: true, msg: "GovAlign backend is live." });
  if (action === "get_all_progress")  return jsonResponse_(getAllProgress_());
  if (action === "get_all_annotations") return jsonResponse_(getAllAnnotations_());
  return jsonResponse_({ ok: false, error: "Unknown GET action: " + action });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ *
 *  Action handlers
 * ------------------------------------------------------------------ */

function saveAnnotation_(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATIONS);
  if (!sh) { initializeSheets(); sh = ss.getSheetByName(SHEET_ANNOTATIONS); }

  var row = [
    new Date(),
    String(p.annotator_id || "").trim(),
    String(p.batch_id     || "").trim(),
    String(p.prompt_id    || "").trim(),
    String(p.jurisdiction || "").trim(),
    String(p.q1 || ""),
    String(p.q2 || ""),
    String(p.q2_comment || "").slice(0, 300),
    String(p.q3 || ""),
    String(p.q4 || "")
  ];
  sh.appendRow(row);

  // Update annotator's last_active + total
  bumpAnnotator_(p.annotator_id);

  return { ok: true, saved: true };
}

function registerUser_(p) {
  var id = String(p.annotator_id || "").trim();
  if (!id) return { ok: false, error: "annotator_id required" };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATORS);
  if (!sh) { initializeSheets(); sh = ss.getSheetByName(SHEET_ANNOTATORS); }

  var existing = findRow_(sh, 1, id);
  if (existing < 0) {
    sh.appendRow([id, new Date(), new Date(), 0]);
  } else {
    sh.getRange(existing, 3).setValue(new Date());
  }
  return { ok: true, registered: true };
}

function getProgress_(p) {
  var id = String(p.annotator_id || "").trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATIONS);
  if (!sh) return { ok: true, total: 0 };
  var data = sh.getDataRange().getValues();
  var total = 0, batches = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === id) {
      total++;
      var b = data[i][2];
      batches[b] = (batches[b] || 0) + 1;
    }
  }
  return { ok: true, annotator_id: id, total: total, per_batch: batches };
}

function getAllProgress_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATIONS);
  if (!sh) return { ok: true, annotators: [] };

  var ann = {};
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var id = data[i][1];
    if (!id) continue;
    if (!ann[id]) ann[id] = { annotator_id: id, total: 0, batches: {}, last_active: "" };
    ann[id].total++;
    ann[id].batches[data[i][2]] = (ann[id].batches[data[i][2]] || 0) + 1;
    var ts = data[i][0];
    if (ts && String(ts) > String(ann[id].last_active || "")) ann[id].last_active = ts;
  }
  return { ok: true, annotators: Object.keys(ann).map(function(k){ return ann[k]; }) };
}

function assignBatch_(p) {
  var batch = String(p.batch_id || "").trim();
  var id    = String(p.annotator_id || "").trim();
  if (!batch || !id) return { ok: false, error: "batch_id and annotator_id required" };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ASSIGNMENTS);
  if (!sh) { initializeSheets(); sh = ss.getSheetByName(SHEET_ASSIGNMENTS); }

  var existing = findRow_(sh, 1, batch);
  if (existing > 0) {
    sh.getRange(existing, 2, 1, 3).setValues([[id, new Date(), 0]]);
  } else {
    sh.appendRow([batch, id, new Date(), 0]);
  }
  return { ok: true, assigned: true };
}

function getAnnotations_(p) {
  var id = String(p.annotator_id || "").trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATIONS);
  if (!sh) return { ok: true, annotations: [] };
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (id === "" || data[i][1] === id) {
      out.push(rowToAnnotation_(data[i]));
    }
  }
  return { ok: true, annotations: out };
}

function getAllAnnotations_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATIONS);
  if (!sh) return { ok: true, annotations: [] };
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) out.push(rowToAnnotation_(data[i]));
  }
  return { ok: true, annotations: out };
}

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */

function findRow_(sh, col, value) {
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][col - 1] === value) return i + 1;  // 1-based sheet row
  }
  return -1;
}

function bumpAnnotator_(id) {
  if (!id) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_ANNOTATORS);
  if (!sh) return;
  var existing = findRow_(sh, 1, id);
  if (existing < 0) {
    sh.appendRow([id, new Date(), new Date(), 1]);
  } else {
    sh.getRange(existing, 3).setValue(new Date());
    var total = sh.getRange(existing, 4).getValue() || 0;
    sh.getRange(existing, 4).setValue(Number(total) + 1);
  }
}

function rowToAnnotation_(row) {
  return {
    timestamp:  row[0],
    annotator_id: row[1],
    batch_id:     row[2],
    prompt_id:    row[3],
    jurisdiction: row[4],
    q1: row[5], q2: row[6], q2_comment: row[7],
    q3: row[8], q4: row[9]
  };
}
