# GovAlign Annotator

> A static, GitHub-Pages-deployable annotation platform for AI model safety prompts across multiple legal jurisdictions.

Annotators review prompts that ask AI models for advice, content, or actions that could violate real-world data-protection and AI-safety laws. For each instance, they answer four questions:

1. **Law Article Verification** — does the cited law article exist in the actual statute?
2. **Field Alignment & Reasonableness** — are the five dataset fields internally consistent?
3. **Difficulty Level** — how hard would a general AI find it to recognize the risk?
4. **Implicit vs Explicit Risk** — is the harmful intent directly stated or hidden?

---

## ✨ Features

- 🌍 **Multi-jurisdiction** — currently India (DPDPA 2023), with 6 more coming soon
- 📦 **Batch-based workflow** — 25 instances per batch, pre-assigned to annotators
- 🌐 **Multi-language** — Bengali, Hindi, Tamil, Telugu, Arabic, Chinese, etc. via Noto Sans
- 💾 **Offline-first** — all annotations saved to localStorage; sync to Google Sheets is a background task
- 📊 **Per-annotator & admin dashboards** — track progress, inter-annotator agreement, export CSVs
- 🔌 **Zero server cost** — Google Apps Script Web App is a free POST endpoint
- 📱 **Responsive** — works on desktop, tablet, and iPad

---

## 🏗 Architecture

```
govAlign-annotator/
├── docs/                          ← GitHub Pages root
│   ├── index.html                 ← Landing + login
│   ├── annotate.html              ← Annotation UI (3-column layout)
│   ├── dashboard.html             ← Personal progress
│   ├── admin.html                 ← Admin view (ID = ADMIN)
│   ├── css/style.css              ← All styles
│   ├── js/
│   │   ├── app.js                 ← Core logic (header, login, routing)
│   │   ├── data.js                ← CSV loader + batch generator
│   │   ├── storage.js             ← localStorage + Google Sheets sync
│   │   └── ui.js                  ← Render helpers
│   └── data/
│       ├── india.csv              ← ✅ Available (27 sample instances)
│       ├── china.csv              ← 🚧 Coming Soon
│       ├── saudi_arabia.csv       ← 🚧 Coming Soon
│       ├── egypt.csv              ← 🚧 Coming Soon
│       ├── bulgaria.csv           ← 🚧 Coming Soon
│       ├── nigeria.csv            ← 🚧 Coming Soon
│       └── bangladesh.csv         ← 🚧 Coming Soon
├── gas/Code.gs                    ← Google Apps Script backend
├── SPEC.md                        ← Full specification document
└── README.md                      ← This file
```

---

## 🚀 Setup Guide

### 1. Deploy the Google Apps Script backend (optional but recommended)

The platform works in **Demo Mode** (localStorage only) out of the box. To persist annotations to a Google Sheet, set up the GAS backend:

1. Go to [script.google.com](https://script.google.com) and click **New project**.
2. Name it "GovAlign Annotator Backend" (or anything you like).
3. Delete any default code, then **copy the contents of `gas/Code.gs` into the editor**.
4. Click **💾 Save** (Ctrl/Cmd + S).
5. Open the function dropdown, select `initializeSheets`, and click **▶ Run**.
   - You'll be asked to authorize the script — review the permissions and allow.
   - This creates a new Google Spreadsheet bound to the project with three sheets:
     `Annotations`, `Annotators`, `BatchAssignments`.
6. Click **Deploy → New deployment**.
7. Click the gear icon ⚙ next to "Select type" and choose **Web app**.
8. Configure:
   - **Description**: "GovAlign Annotator API"
   - **Execute as**: "Me (your-email@gmail.com)"
   - **Who has access**: **Anyone** (this is critical for static-host CORS-free access)
9. Click **Deploy** → copy the **Web App URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`
10. Open `docs/js/storage.js` in your repo, find the line:
    ```js
    var SHEETS_ENDPOINT = 'https://script.google.com/macros/s/YOUR_PROJECT_ID/exec';
    ```
    Replace `YOUR_PROJECT_ID` with your actual Web App URL. Also set:
    ```js
    var DEMO_MODE = false;
    ```
11. (Optional) Set up **batch assignments** by adding rows to the `BatchAssignments` sheet:
    ```
    batch_id        | annotator_id | assigned_at | completed_count
    IND-B01-PKT01   | PKT01        | 2026-06-08  | 0
    IND-B02-PKT01   | PKT01        | 2026-06-08  | 0
    ```
    Without this, the app will show all available batches to every annotator.

### 2. Add your data CSVs

The platform ships with a 27-instance sample CSV for India (`docs/data/india.csv` — DPDPA 2023 in Bengali). To add more:

1. Create a CSV in `docs/data/` matching this schema (header row required):
   ```csv
   prompt_id,jurisdiction,law_article,compliance_dimension,prompt_text,expected_behavior,violation_type,language
   DPDPA-CONSENT-001,"India (Digital Personal Data Protection Act 2023)","Section 6 — Consent","Consent before data processing","<prompt text>","<expected behavior>","<violation type>",Bengali
   ```
2. Open `docs/js/data.js` and add the new country to the `COUNTRIES` registry:
   ```js
   france: {
     key: 'france',
     name: 'France',
     file: 'data/france.csv',
     law: 'GDPR (via French DPA)',
     available: true,
     color: '#0055a4'
   }
   ```
3. The country card will automatically appear on the landing page.

### 3. Enable GitHub Pages

1. Push your repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, choose:
   - **Branch**: `main` (or `gh-pages` if you prefer a separate branch)
   - **Folder**: `/docs`
4. Click **Save**. After ~1 minute, your site will be live at:
   `https://<your-username>.github.io/<repo-name>/`

### 4. (Optional) Custom domain

Add a `CNAME` file in `docs/` containing your domain, then configure DNS per [GitHub's instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

---

## 🎯 Usage

### For annotators

1. Visit the GitHub Pages URL.
2. Sign in with your annotator ID (e.g. `PKT01`, `YXA02`).
   - Use `ADMIN` to access the admin dashboard.
3. Pick a jurisdiction.
4. Open a batch, read the prompt, answer the 4 questions, hit **Save & Next**.
5. Repeat. Your progress is auto-saved locally and synced to Google Sheets in the background.
6. Check **My Dashboard** to export your labels as CSV.

### For admins

1. Sign in with ID `ADMIN`.
2. The **Admin Dashboard** shows:
   - All annotators and their progress
   - Per-country breakdown
   - **Inter-annotator agreement** for instances reviewed by 2+ people
   - All recent annotations
3. Use **Assign Batch** to pre-assign batches to specific annotators.

### Keyboard shortcuts

- **Ctrl/Cmd + Enter** — Save & Next (when in the annotation form)

---

## 🧪 Demo Mode

Without configuring `SHEETS_ENDPOINT`, the app runs in **Demo Mode**:
- Annotations are saved to `localStorage` only
- Progress is per-browser
- The admin dashboard shows only annotations from the current browser
- The footer displays "Mode: Demo (localStorage only)"

This lets you test the entire platform without setting up a Google Sheet.

To clear local data: open browser DevTools → Application → Local Storage → delete `govalign_*` keys.

---

## 🛠 Tech Stack

- **Vanilla HTML/CSS/JS** — no build step, no framework
- **[PapaParse 5.4](https://www.papaparse.com/)** — robust CSV parsing (CDN)
- **Google Fonts** — Playfair Display, Source Sans 3, Noto Sans (multi-script)
- **Google Apps Script** — free backend, deployed as Web App
- **localStorage** — offline-first session & annotation cache

---

## 📊 Data Format Reference

Each CSV row represents one prompt instance:

| Field | Type | Description |
|-------|------|-------------|
| `prompt_id` | string | Unique ID, e.g. `DPDPA-CONSENT-001` |
| `jurisdiction` | string | Display label, e.g. `"India (Digital Personal Data Protection Act 2023)"` |
| `law_article` | string | Cited article, e.g. `"Section 6 — Consent"` |
| `compliance_dimension` | string | Sub-topic, e.g. `"Opt-in vs opt-out"` |
| `prompt_text` | string | The actual prompt (in the language indicated) |
| `expected_behavior` | string | What an AI should say/do |
| `violation_type` | string | What goes wrong, e.g. `"Bundled consent violation"` |
| `language` | string | Plain-language name, e.g. `Bengali`, `Hindi`, `Arabic` |

---

## 🔒 Privacy & Security

- Annotator IDs are stored in `localStorage` only (no password).
- The Apps Script Web App accepts **anonymous** POSTs; in production, consider:
  - Adding a shared secret header in `Code.gs` (sample commented in source).
  - Restricting access to specific Google accounts.
- All prompt content is research data; do not include PII in CSV files.
- Annotations sync over HTTPS via the Apps Script Web App URL.

---

## 🤝 Contributing

1. Add new country CSVs in `docs/data/`.
2. Update `docs/js/data.js` to register the new country.
3. Submit a PR.

To suggest improvements to the annotation form (e.g. new question dimensions), open an issue.

---

## 📜 License

This project is intended for AI safety research. Please contact the maintainers before using commercially.

---

## 📚 Citation

If you use this platform in published research, please cite the GovAlign dataset (citation TBD) and the underlying laws annotated:
- **India**: Digital Personal Data Protection Act, 2023
- **China**: Personal Information Protection Law (PIPL)
- **Saudi Arabia / Egypt**: Personal Data Protection Law (PDPL)
- **Bulgaria**: Personal Data Protection Act
- **Nigeria**: Nigeria Data Protection Regulation (NDPR)
- **Bangladesh**: Digital Security Act, 2018
