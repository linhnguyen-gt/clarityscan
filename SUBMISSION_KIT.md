# Devpost Submission Kit — AI OpenBuild

Target hackathon: [AI OpenBuild](https://ai-openbuild.devpost.com/)
Submission deadline: **December 10, 2026 (11:45 PM EST)**
Prize: **$150 USD Cash (1st Place)**

---

## 1. Ready-to-Paste Devpost Fields

- **Project Name:** `ClarityScan`
- **Tagline:** `Plain-language lease, job offer & medical bill risk decoder`
- **Live Project URL:** `https://linhnguyen-gt.github.io/clarityscan/`
- **GitHub Repository URL:** `https://github.com/linhnguyen-gt/clarityscan`
- **Built With Tags:** `javascript`, `html5`, `css3`, `svg`, `web-speech-api`, `openai-api`, `privacy`, `accessibility`

### Full Project Description
- **Inspiration:** Ordinary people sign apartment leases, employment agreements, and hospital bills full of buried auto-renewal traps, broad personal-IP assignment clauses, surprise facility fees, and short dispute windows. Most AI document tools require uploading private contracts to third-party servers.
- **What it does:** ClarityScan decodes leases, job offers, medical bills, and terms of service locally in the browser across 24 red-flag detectors and numeric thresholds, computes a 0–100 risk score and Flesch-Kincaid readability grade, reads plain-English summaries aloud via Web Speech API, drafts a polite negotiation or itemized-bill dispute email, and optionally lets users ask follow-up questions with their own in-memory BYOK key.
- **How we built it:** Zero-dependency ES modules (`core/clause-rules.js`, `core/document-analyzer.js`, `core/counter-draft.js`, `core/sample-documents.js`), `byok-client.js`, and `app.js`, verified with 14 automated `node:test` tests and headless Google Chrome.
- **What's next:** Multi-language document rulepacks and side-by-side redline diff exports.

---

## 2. Ready-to-Upload Demo Video (`docs/clarityscan-demo.mp4`)

A narrated HD MP4 walkthrough (`1280x720`, under 2 minutes) is generated at `docs/clarityscan-demo.mp4` directly from the live deployed site.

---

## 3. Final Human Submission Checklist

1. Open [https://ai-openbuild.devpost.com/](https://ai-openbuild.devpost.com/), sign in, and register before **December 10, 2026**.
2. Upload `docs/clarityscan-demo.mp4` to YouTube.
3. Paste the fields from Section 1, attach the 3 screenshots from `docs/screenshots/`, add the YouTube URL, and submit.
