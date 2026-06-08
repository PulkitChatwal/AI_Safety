# GovAlign Annotator - Platform Specification

## Project Overview
- **Name:** GovAlign Annotator
- **Type:** Static annotation platform for AI model safety prompts
- **Deployment:** GitHub Pages (static, no server)
- **Storage:** Google Sheets via Google Apps Script + localStorage
- **Reference:** https://hasaniqbal777.github.io/medfactcheck/

## Tech Stack
- Vanilla HTML + CSS + JavaScript (SPA, no bundler)
- Google Apps Script Web App (REST backend)
- PapaParse for CSV parsing
- Google Fonts: Playfair Display, Source Sans 3, Noto Sans (multilingual)
- All data committed to repo, fetched at runtime

## Data Structure

### CSV Format (per jurisdiction)
```
prompt_id, jurisdiction, law_article, compliance_dimension, prompt_text, expected_behavior, violation_type, language
```

**Example:**
```
DPDPA-CONSENT-001, "India (Digital Personal Data Protection Act 2023)", "Section 6 — Consent", "Consent before data processing — opt-in vs opt-out", "<Bengali text>", "<expected behavior>", "<violation type>", Bengali
```

### Supported Jurisdictions
| Status | Country | File |
|--------|---------|------|
| ✓ Available | India | data/india.csv |
| Coming Soon | China | data/china.csv |
| Coming Soon | Saudi Arabia | data/saudi_arabia.csv |
| Coming Soon | Egypt | data/egypt.csv |
| Coming Soon | Bulgaria | data/bulgaria.csv |
| Coming Soon | Nigeria | data/nigeria.csv |
| Coming Soon | Bangladesh | data/bangladesh.csv |

## Batch System
- **Batch size:** 25 instances
- **Naming:** `{COUNTRY}-B{NUMBER}-{ANNOTATOR_ID}` (e.g., `IND-B01-PKT01`)
- **Assignment:** Via Google Sheet "BatchAssignments" tab
- **Display:** Show batch ID, completion count, assigned annotator

## User System
- **Login:** Annotator ID only (no passwords)
- **Session:** localStorage stores annotator_id
- **Admin ID:** Hardcoded as `ADMIN`
- **Registration:** Auto-register on first login to Google Sheet

## Annotation Interface

### Layout
- Left sidebar: Batch list + progress bars
- Main panel: Instance display (one at a time)
- Right panel: Annotation form (sticky)

### Instance Display (Main Panel)
Displayed in styled card format:
- Instance ID + Language badge
- Jurisdiction with law act name
- Law article (styled as "📜 LAW ARTICLE")
- Compliance dimension (styled as "🔍 COMPLIANCE DIMENSION")
- Prompt text (styled as "💬 PROMPT TEXT", right-to-left for Arabic)
- Expected behavior (styled as "✅ EXPECTED BEHAVIOR")
- Violation type (styled as "⚠️ VIOLATION TYPE")

### Annotation Questions (Right Panel)

**Q1 - Law Article Verification**
> "Based on your knowledge or lookup, does the cited law article accurately reflect a real provision?"

Options:
- `✓ Verified — Article exists and is accurately cited`
- `✗ Not Verified — Article seems hallucinated or misrepresented`
- `? Uncertain — Cannot verify without legal expertise`

**Q2 - Field Alignment & Reasonableness**
> "Are the five fields internally consistent and reasonable?"

Options:
- `✓ Well-aligned — All fields are consistent`
- `⚠ Partially Aligned — Minor inconsistencies`
- `✗ Misaligned — Significant inconsistencies`

Free-text: "Describe issue (optional):" [max 300 chars]

**Q3 - Difficulty Level**
> "How hard for AI model to recognize risk?"

Options:
- `Easy` — Prompt clearly signals unsafe
- `Medium` — Requires domain awareness
- `Hard` — Requires specific legal knowledge

**Q4 - Implicit vs Explicit Risk**
> "Is the harmful intent EXPLICIT or IMPLICIT?"

Options:
- `Explicit` — Prompt openly describes violation
- `Implicit` — Violation hidden/requires legal knowledge

### Navigation
- "Save & Next →" button
- "← Previous" button
- Auto-save indicator: "Last saved: X minutes ago"
- Progress bar: "X / 25 annotated"
- Unsaved changes: Browser confirm dialog

## Dashboard Pages

### Personal Dashboard (dashboard.html)
- Total annotated / assigned
- Per-batch progress bars
- Table of annotated instances
- "Export My Annotations" → CSV download

### Admin Dashboard (admin.html)
- Accessible only with ID = `ADMIN`
- Table: Annotator ID, batches, completed count, %, last active
- Per-country breakdown
- Inter-annotator agreement summary
- "Export All Annotations" → CSV download
- "Assign Batch" form

## Google Apps Script API

### doPost(e) Endpoint
Actions:
- `save_annotation` → Write to "Annotations" sheet
- `register_user` → Add to "Annotators" sheet
- `get_progress` → Return annotation counts
- `assign_batch` → Write to "BatchAssignments" sheet

### Sheet Structure

**"Annotations":**
```
timestamp, annotator_id, batch_id, prompt_id, jurisdiction, q1_law_verified, q2_alignment, q2_comment, q3_difficulty, q4_implicit_explicit
```

**"Annotators":**
```
annotator_id, registered_at, last_active, total_annotated
```

**"BatchAssignments":**
```
batch_id, annotator_id, assigned_at, completed_count
```

## Design & Aesthetics

### Color Palette
- Primary: `#1a3a5c` (deep navy)
- Accent: `#e8a020` (academic gold)
- Success: `#2d8a4e`
- Warning: `#c0392b`
- Background: `#f4f6f9`
- Sidebar: `#1a2535`

### Typography
- Headings: "Playfair Display"
- Body: "Source Sans 3"
- Multi-language: "Noto Sans" for Bengali, Hindi, Arabic, etc.

### UI Components
- Card shadows: `0 2px 8px rgba(0,0,0,0.08)`
- Left-border color coding by language
- Radio cards: Large clickable, gold highlight on select
- Batch list with ✓ completion markers
- Toast notifications
- Loading skeletons
- Dark sidebar, white content area

## Implementation Notes

1. **CSV Parsing:** PapaParse (CDN)
2. **Multi-language:** Set `lang` attribute, use Noto Sans font stack
3. **Offline:** localStorage first, sync background, warn on failure
4. **Batch Generation:** Split CSV into 25-row batches on load
5. **No jQuery:** Pure vanilla JS
6. **Responsive:** Works on tablets
7. **Demo Mode:** PLACEHOLDER_ENDPOINT with TODO comment

## File Structure
```
govAlign-annotator/
├── docs/
│   ├── index.html
│   ├── annotate.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── data.js
│   │   ├── storage.js
│   │   └── ui.js
│   └── data/
│       └── india.csv
├── gas/Code.gs
└── README.md
```

## Deliverables
1. docs/index.html - Landing + login
2. docs/annotate.html - Annotation UI
3. docs/dashboard.html - Personal progress
4. docs/admin.html - Admin view
5. docs/css/style.css - All styles
6. docs/js/app.js - Core logic
7. docs/js/data.js - CSV + batch handler
8. docs/js/storage.js - Storage + sync
9. docs/js/ui.js - Render helpers
10. gas/Code.gs - GAS backend
11. README.md - Setup guide
12. docs/data/india.csv - Sample data