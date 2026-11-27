// Main UI controller for ClarityScan plain-language risk & negotiation studio.
import { DOC_TYPES, DOC_TYPE_LABELS } from "./core/clause-rules.js";
import { analyzeDocument } from "./core/document-analyzer.js";
import { generateNegotiationDraft } from "./core/counter-draft.js";
import { SAMPLE_DOCUMENTS, getSampleById } from "./core/sample-documents.js";
import { askByokQuestion } from "./byok-client.js";

export class ClarityScanApp {
  constructor() {
    this.docType = "auto";
    this.lastAnalysis = null;
    this.lastDraft = null;
    this.recognition = null;
    this.listening = false;
    this.bindUi();
    this.renderAll();
  }

  loadSample(sampleId) {
    const sample = getSampleById(sampleId);
    if (!sample) {
      return { ok: false, reason: `Unknown sample "${sampleId}".` };
    }
    if (typeof document !== "undefined") {
      const textarea = document.querySelector("#doc-text-input");
      if (textarea) textarea.value = sample.text;
      const select = document.querySelector("#doc-type-select");
      if (select) select.value = "auto";
    }
    this.docType = "auto";
    return this.scanText(sample.text, "auto");
  }

  scanText(text, docType = this.docType) {
    const result = analyzeDocument(text, docType);
    if (!result.ok) {
      this.setStatus(result.reason);
      return result;
    }
    this.docType = docType;
    this.lastAnalysis = result;
    this.lastDraft = generateNegotiationDraft({
      docType: result.docType,
      recipientRole: this.recipientLabel(result.docType),
      senderName: "Alex",
      findings: result.findings,
    });
    this.renderAll();
    this.setStatus(result.plainSummary);
    return result;
  }

  recipientLabel(docType) {
    const labels = {
      lease: "Leasing Office",
      employment: "Hiring Team",
      "medical-bill": "Billing Department",
      terms: "Support Team",
    };
    return labels[docType] || "Counterparty";
  }

  regenerateDraft(senderName, recipientRole) {
    if (!this.lastAnalysis) {
      return { ok: false, reason: "Scan a document first before generating a counter-email." };
    }
    const draft = generateNegotiationDraft({
      docType: this.lastAnalysis.docType,
      recipientRole: recipientRole || this.recipientLabel(this.lastAnalysis.docType),
      senderName: senderName || "Alex",
      findings: this.lastAnalysis.findings,
    });
    if (draft.ok) {
      this.lastDraft = draft;
      this.renderDraft();
      this.setStatus("Updated negotiation draft.");
    }
    return draft;
  }

  speakSummary() {
    const text = this.lastAnalysis?.plainSummary
      || "ClarityScan is ready. Load a sample document or paste text to check hidden risks.";
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.setStatus(text);
      return false;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.96;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
    return true;
  }

  stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  toggleVoiceQuestion() {
    if (typeof window === "undefined") return false;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      this.setStatus("Speech recognition is unavailable in this browser. Type your question or paste text.");
      return false;
    }
    if (this.listening) {
      this.listening = false;
      try { this.recognition?.stop(); } catch {}
      this.renderVoiceButton(false);
      return false;
    }
    if (!this.recognition) {
      this.recognition = new Ctor();
      this.recognition.lang = "en-US";
      this.recognition.onresult = (event) => {
        if (!this.listening) return;
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (!transcript) return;
        const qInput = document.querySelector("#byok-question-input");
        if (qInput) qInput.value = transcript;
        this.setStatus(`Dictated question: "${transcript}".`);
      };
      this.recognition.onerror = () => {
        this.listening = false;
        this.renderVoiceButton(false);
      };
      this.recognition.onend = () => {
        this.listening = false;
        this.renderVoiceButton(false);
      };
    }
    try {
      this.recognition.start();
      this.listening = true;
      this.renderVoiceButton(true);
      this.setStatus("Listening for your question...");
      return true;
    } catch {
      this.listening = false;
      this.renderVoiceButton(false);
      return false;
    }
  }

  bindUi() {
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return;
    const scanForm = document.querySelector("#scan-form");
    if (!scanForm) return;

    const select = document.querySelector("#doc-type-select");
    if (select) {
      select.replaceChildren();
      const autoOpt = document.createElement("option");
      autoOpt.value = "auto";
      autoOpt.textContent = "Auto-Detect Category";
      select.appendChild(autoOpt);
      for (const dt of DOC_TYPES) {
        const opt = document.createElement("option");
        opt.value = dt;
        opt.textContent = DOC_TYPE_LABELS[dt] || dt;
        select.appendChild(opt);
      }
      select.value = "auto";
    }

    for (const btn of document.querySelectorAll("[data-sample-id]")) {
      btn.addEventListener("click", () => {
        this.loadSample(btn.getAttribute("data-sample-id"));
      });
    }

    scanForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = document.querySelector("#doc-text-input")?.value || "";
      const type = document.querySelector("#doc-type-select")?.value || "auto";
      this.scanText(text, type);
    });

    document.querySelector("#doc-file-input")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const content = await file.text();
      const textarea = document.querySelector("#doc-text-input");
      if (textarea) textarea.value = content;
      this.scanText(content, document.querySelector("#doc-type-select")?.value || "auto");
    });

    document.querySelector("#btn-speak-summary")?.addEventListener("click", () => this.speakSummary());
    document.querySelector("#btn-stop-speech")?.addEventListener("click", () => this.stopSpeaking());
    document.querySelector("#btn-voice-question")?.addEventListener("click", () => this.toggleVoiceQuestion());

    document.querySelector("#draft-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const sender = document.querySelector("#draft-sender-input")?.value || "Alex";
      const recipient = document.querySelector("#draft-recipient-input")?.value || "";
      this.regenerateDraft(sender, recipient);
    });

    document.querySelector("#btn-copy-draft")?.addEventListener("click", async () => {
      if (!this.lastDraft?.ok) return;
      const full = `Subject: ${this.lastDraft.subject}\n\n${this.lastDraft.body}\n\n${this.lastDraft.disclaimer}`;
      try {
        await navigator.clipboard?.writeText(full);
        this.setStatus("Counter-email copied to clipboard.");
      } catch {
        this.setStatus("Copy directly from the draft text box below.");
      }
    });

    document.querySelector("#byok-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const outEl = document.querySelector("#byok-answer");
      if (outEl) outEl.textContent = "Calling your configured BYOK provider...";
      const res = await askByokQuestion({
        apiKey: document.querySelector("#byok-key-input")?.value || "",
        baseUrl: document.querySelector("#byok-url-input")?.value || "",
        model: document.querySelector("#byok-model-input")?.value || "",
        documentText: document.querySelector("#doc-text-input")?.value || "",
        findings: this.lastAnalysis?.findings || [],
        question: document.querySelector("#byok-question-input")?.value || "",
      });
      if (outEl) {
        outEl.textContent = res.ok ? res.answer : res.reason;
      }
    });
  }

  setStatus(msg) {
    if (typeof document === "undefined") return;
    const el = document.querySelector("#clarity-status");
    if (el) el.textContent = msg;
  }

  renderVoiceButton(on) {
    if (typeof document === "undefined") return;
    const btn = document.querySelector("#btn-voice-question");
    if (btn) {
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Listening..." : "Dictate Question";
    }
  }

  renderAll() {
    this.renderAnalysis();
    this.renderDraft();
  }

  renderAnalysis() {
    if (typeof document === "undefined") return;
    const metricsEl = document.querySelector("#risk-metrics");
    const findingsEl = document.querySelector("#findings-list");
    const svg = document.querySelector("#risk-chart");
    if (!metricsEl || !findingsEl) return;

    if (!this.lastAnalysis) {
      metricsEl.replaceChildren();
      findingsEl.textContent = "Load one of the 4 sample documents above or paste your own lease, job offer, medical bill, or terms of service.";
      if (svg?.replaceChildren) svg.replaceChildren();
      return;
    }

    const a = this.lastAnalysis;
    metricsEl.replaceChildren();
    for (const [label, val] of [
      ["Document Type", a.docTypeLabel],
      ["Risk Score", `${a.riskScore}/100 (${a.riskGrade})`],
      ["Red Flags", String(a.findings.length)],
      ["Readability", `Grade ${a.readabilityGrade}`],
      ["Unflagged Clauses", String(a.safeClausesCount)],
    ]) {
      const card = document.createElement("div");
      card.className = "metric-card";
      const s = document.createElement("span");
      s.textContent = label;
      const b = document.createElement("strong");
      b.textContent = val;
      card.append(s, b);
      metricsEl.appendChild(card);
    }

    if (svg?.replaceChildren) {
      const NS = "http://www.w3.org/2000/svg";
      svg.replaceChildren();
      const rows = [
        { label: "Critical", count: a.severityCounts.critical, color: "#b91c1c" },
        { label: "High", count: a.severityCounts.high, color: "#b45309" },
        { label: "Medium", count: a.severityCounts.medium, color: "#1d4ed8" },
      ];
      const max = Math.max(1, ...rows.map((r) => r.count));
      rows.forEach((r, idx) => {
        const y = 12 + idx * 30;
        const text = document.createElementNS(NS, "text");
        text.setAttribute("x", "4");
        text.setAttribute("y", String(y + 14));
        text.setAttribute("font-size", "12");
        text.setAttribute("fill", "#132238");
        text.textContent = `${r.label}: ${r.count}`;
        const bg = document.createElementNS(NS, "rect");
        bg.setAttribute("x", "92");
        bg.setAttribute("y", String(y));
        bg.setAttribute("width", "300");
        bg.setAttribute("height", "18");
        bg.setAttribute("rx", "5");
        bg.setAttribute("fill", "#e5e7eb");
        const fg = document.createElementNS(NS, "rect");
        fg.setAttribute("x", "92");
        fg.setAttribute("y", String(y));
        fg.setAttribute("width", String(Math.round((r.count / max) * 300)));
        fg.setAttribute("height", "18");
        fg.setAttribute("rx", "5");
        fg.setAttribute("fill", r.color);
        svg.append(text, bg, fg);
      });
    }

    findingsEl.replaceChildren();
    if (!a.findings.length) {
      findingsEl.textContent = "No high-risk clauses matched in this excerpt. Always read numeric terms and deadlines carefully.";
      return;
    }
    for (const f of a.findings) {
      const card = document.createElement("article");
      card.className = `finding-card sev-${f.severity}`;
      const h3 = document.createElement("h3");
      h3.textContent = `[${f.severity.toUpperCase()}] ${f.title}`;
      const snippet = document.createElement("blockquote");
      snippet.textContent = f.snippet;
      const plain = document.createElement("p");
      plain.textContent = `Plain English: ${f.plainExplanation}`;
      const tip = document.createElement("p");
      tip.className = "finding-tip";
      tip.textContent = `What to ask: ${f.actionTip}`;
      card.append(h3, snippet, plain, tip);
      findingsEl.appendChild(card);
    }
  }

  renderDraft() {
    if (typeof document === "undefined") return;
    const subj = document.querySelector("#draft-subject");
    const body = document.querySelector("#draft-body");
    const disc = document.querySelector("#draft-disclaimer");
    if (!subj || !body || !disc) return;
    if (!this.lastDraft?.ok) {
      subj.textContent = "No draft generated yet";
      body.value = "";
      disc.textContent = "Informational aid only, not legal or medical advice.";
      return;
    }
    subj.textContent = `Subject: ${this.lastDraft.subject}`;
    body.value = this.lastDraft.body;
    disc.textContent = this.lastDraft.disclaimer;
  }
}

export const clarityScanApp = typeof window !== "undefined" ? new ClarityScanApp() : null;
if (typeof window !== "undefined") {
  window.ClarityScanApp = clarityScanApp;
}
