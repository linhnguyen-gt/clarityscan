import assert from "node:assert/strict";
import { test } from "node:test";
import { CLAUSE_RULES, DOC_TYPES, DOC_TYPE_LABELS, getRuleById } from "../core/clause-rules.js";
import { generateNegotiationDraft } from "../core/counter-draft.js";
import { analyzeDocument, detectDocType } from "../core/document-analyzer.js";
import { getSampleById, SAMPLE_DOCUMENTS } from "../core/sample-documents.js";

const ruleExamples = [
  ["lease", "lease-auto-renewal", "This lease automatically renews for another year."],
  ["lease", "lease-nonrefundable-deposit", "The $800 security deposit is non-refundable."],
  ["lease", "lease-entry-no-notice", "The landlord may enter the unit\n without prior notice."],
  ["lease", "lease-unilateral-fee", "The landlord may impose new fees at its sole discretion."],
  ["lease", "lease-landlord-waiver", "The tenant waives all claims against the landlord for negligence."],
  ["lease", "lease-early-termination-penalty", "The early termination fee is $1,450.75."],
  ["employment", "emp-broad-noncompete", "For 24 months after leaving, you may not work for any competitor worldwide."],
  ["employment", "emp-personal-ip-capture", "You assign all inventions, including work created on your own time."],
  ["employment", "emp-mandatory-arbitration", "All disputes must be resolved by binding arbitration."],
  ["employment", "emp-clawback-trap", "You must repay the full signing bonus if you resign."],
  ["employment", "emp-bonus-forfeiture", "You must be employed on the payment date to receive your earned bonus."],
  ["employment", "emp-unpaid-overtime-waiver", "Employees waive any right to overtime pay."],
  ["medical-bill", "med-facility-fee", "An outpatient facility fee of $275.00 was added."],
  ["medical-bill", "med-out-of-network-surprise", "An out-of-network anesthesiologist billed you the balance."],
  ["medical-bill", "med-duplicate-line-item", "A duplicate charge for the blood draw appears on the statement."],
  ["medical-bill", "med-upcoding-indicator", "A high-complexity visit was billed for a routine follow-up."],
  ["medical-bill", "med-short-dispute-window", "Billing disputes must be submitted within seven calendar days."],
  ["medical-bill", "med-collection-threat", "Unpaid balances will be sent to collections."],
  ["terms", "tos-class-action-waiver", "You waive your right to participate in a class action."],
  ["terms", "tos-unilateral-price-hike", "At renewal the subscription price can be changed without notice."],
  ["terms", "tos-irrevocable-content-license", "You grant us an irrevocable, perpetual license to your uploaded content."],
  ["terms", "tos-broad-data-sale", "We may sell your personal data to our advertising partners."],
  ["terms", "tos-silent-terms-change", "We may modify these terms at any time without notice."],
  ["terms", "tos-no-refund-auto-charge", "Your subscription renews automatically and all charges are nonrefundable."],
];

test("catalog covers all document types with complete, unique rules", () => {
  assert.deepEqual(DOC_TYPES, ["lease", "employment", "medical-bill", "terms"]);
  assert.deepEqual(Object.keys(DOC_TYPE_LABELS).sort(), [...DOC_TYPES].sort());
  assert.ok(Object.values(DOC_TYPE_LABELS).every((label) => label.trim().length > 0));
  assert.ok(CLAUSE_RULES.length >= 24);
  assert.equal(new Set(CLAUSE_RULES.map(({ id }) => id)).size, CLAUSE_RULES.length);
  for (const rule of CLAUSE_RULES) {
    assert.equal(getRuleById(rule.id), rule);
    assert.ok(rule.docTypes.length > 0 && rule.docTypes.every((type) => DOC_TYPES.includes(type)), rule.id);
    assert.ok(["critical", "high", "medium"].includes(rule.severity), rule.id);
    assert.ok(Number.isInteger(rule.weight) && rule.weight >= 6 && rule.weight <= 22, rule.id);
    assert.ok(rule.patterns.length > 0 && rule.patterns.every((pattern) => pattern instanceof RegExp), rule.id);
    assert.ok([rule.title, rule.plainExplanation, rule.actionTip, rule.counterClause].every((value) => value.trim()), rule.id);
  }
  assert.equal(getRuleById("unknown-rule"), undefined);
});

test("each named detector finds its own clause and preserves the matched wording", () => {
  for (const [docType, ruleId, snippet] of ruleExamples) {
    assert.ok(getRuleById(ruleId)?.docTypes.includes(docType), ruleId);
    const result = analyzeDocument(`Terms are listed below. ${snippet} Please review the document.`, docType);
    assert.equal(result.ok, true, ruleId);
    const finding = result.findings.find((entry) => entry.ruleId === ruleId);
    assert.ok(finding, ruleId);
    assert.equal(finding.snippet, snippet, ruleId);
    assert.equal(finding.clauseIndex, 1, ruleId);
    assert.equal(finding.counterClause, getRuleById(ruleId).counterClause, ruleId);
  }
});

test("empty and unsupported inputs return field-specific validation errors", () => {
  for (const text of [undefined, null, 42, [], {}, "", " \t\n"]) {
    assert.deepEqual(analyzeDocument(text), {
      ok: false, reason: "Paste or load a document before scanning.", field: "text",
    });
  }
  for (const docType of [null, "", "invoice", "Lease", 42]) {
    assert.deepEqual(analyzeDocument("A valid document.", docType), {
      ok: false, reason: "Unsupported document type.", field: "docType",
    });
  }
  assert.equal(detectDocType("A valid document."), "terms");
  assert.equal(detectDocType("Terms of Use\nThe tenant pays rent to the landlord under the lease."), "terms");
  assert.equal(analyzeDocument("Apartment lease for the listed tenant.", "terms").docType, "terms");
});

test("sample lookup and auto-detection cover all four documents", () => {
  const sampleTypes = new Map([
    ["apartment-lease", "lease"], ["startup-job-offer", "employment"],
    ["hospital-invoice", "medical-bill"], ["saas-terms", "terms"],
  ]);
  assert.equal(SAMPLE_DOCUMENTS.length, sampleTypes.size);
  for (const [id, docType] of sampleTypes) {
    const sample = getSampleById(id);
    assert.ok(SAMPLE_DOCUMENTS.includes(sample), id);
    assert.equal(detectDocType(sample.text), docType, id);
    const result = analyzeDocument(sample.text);
    assert.equal(result.docType, docType, id);
    assert.equal(result.docTypeLabel, DOC_TYPE_LABELS[docType], id);
    const catalogMatches = result.findings.filter(({ ruleId }) => getRuleById(ruleId));
    assert.ok(new Set(catalogMatches.map(({ ruleId }) => ruleId)).size >= 4, id);
    assert.match(result.plainSummary, new RegExp(DOC_TYPE_LABELS[docType]));
    assert.ok(result.plainSummary.includes(`${result.riskScore} out of 100`), id);
    assert.ok(result.plainSummary.includes(result.findings[0].title), id);
  }
});

test("findings sort by severity and weight, and risk and readability stay in range", () => {
  const result = analyzeDocument(getSampleById("apartment-lease").text);
  const severityOrder = ["critical", "high", "medium"];
  for (const severity of severityOrder) {
    const count = result.findings.filter((finding) => finding.severity === severity).length;
    assert.ok(count > 0);
    assert.equal(result.severityCounts[severity], count);
  }
  assert.deepEqual(result.findings, [...result.findings].sort((a, b) =>
    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) || b.weight - a.weight));
  assert.equal(result.riskScore, 100);
  assert.equal(result.riskGrade, "High");
  assert.ok(Number.isFinite(result.readabilityGrade) && result.readabilityGrade > 0);
  assert.equal(result.safeClausesCount, Math.max(0, result.clauses.length - result.findings.length));
  const crowded = analyzeDocument("The landlord may enter without notice and impose new fees at its sole discretion.", "lease");
  assert.ok(crowded.findings.length > crowded.clauses.length);
  assert.equal(crowded.safeClausesCount, 0);
  const safe = analyzeDocument("Please keep a copy of this document.");
  assert.equal(safe.riskScore, 0);
  assert.equal(safe.riskGrade, "Low");
  assert.equal(safe.safeClausesCount, 1);
  assert.match(safe.plainSummary, /no red flags/i);
  const moderate = analyzeDocument(ruleExamples[6][2], "employment");
  assert.equal(moderate.riskGrade, "Moderate");
  const elevated = analyzeDocument(ruleExamples[6][2] + " " + ruleExamples[8][2], "employment");
  assert.equal(elevated.riskScore, 40);
  assert.equal(elevated.riskGrade, "Elevated");
  const repeated = analyzeDocument((ruleExamples[8][2] + " ").repeat(3), "employment");
  assert.equal(repeated.findings.length, 3);
  assert.equal(repeated.riskScore, 18);
  assert.equal(repeated.riskGrade, "Low");
});

test("cross-category findings and repeated billing rows retain clause positions", () => {
  const clause = "All disputes must be resolved by binding arbitration;";
  const result = analyzeDocument(`See Sec. 2. ${clause} We may impose new fees at any time.`, "terms");
  assert.deepEqual(result.clauses, ["See Sec. 2.", clause, "We may impose new fees at any time."]);
  assert.ok(result.findings.some((finding) => finding.ruleId === "emp-mandatory-arbitration" && finding.snippet === clause));
  assert.ok(result.findings.some((finding) => finding.ruleId === "lease-unilateral-fee" && finding.clauseIndex === 2));
  assert.ok(!analyzeDocument("The security deposit is non-refundable.", "terms").findings.length);
  const line = "Blood draw (36415)  $28.00";
  const rows = ["Patient statement", "Date of service: October 2", line, "Date of service: October 3", "Blood draw (36415) $28", line];
  const bill = analyzeDocument(rows.join("\r\n"), "medical-bill");
  const duplicates = bill.findings.filter(({ ruleId }) => ruleId === "med-duplicate-line-item");
  assert.deepEqual(duplicates.map(({ clauseIndex, snippet }) => ({ clauseIndex, snippet })), [{ clauseIndex: 5, snippet: line }]);
});

test("numeric checks include threshold values and ignore ordinary prices and longer deadlines", () => {
  const trapped = analyzeDocument("The cancellation penalty is $1,000. A minimum 24-month commitment applies. You must file a dispute in 7 days.", "terms");
  assert.deepEqual(trapped.findings.map(({ title }) => title).sort(),
    ["Large penalty", "Long lock-in", "Short deadline"]);
  const below = "The cancellation penalty is $999.99. A minimum 23-month commitment applies. You must respond within 8 days.";
  assert.deepEqual(analyzeDocument(below, "terms").findings, []);
  assert.deepEqual(analyzeDocument("The subscription price is $1,500.00. Standard delivery takes 7 days.", "terms").findings, []);
  assert.deepEqual(analyzeDocument("The cancellation penalty is waived and monthly rent is $1,500.", "terms").findings, []);
  const penalties = analyzeDocument("A penalty may apply, and the cancellation fee is $1,000. You owe a $1,500 early termination penalty.", "terms").findings;
  assert.equal(penalties.filter(({ title }) => title === "Large penalty").length, 2);
  assert.ok(analyzeDocument("The statement lists a one-day appeal deadline.", "medical-bill")
    .findings.some(({ ruleId }) => ruleId === "med-short-dispute-window"));
  assert.ok(analyzeDocument("A 2-year contract cannot be cancelled.", "terms").findings.some(({ title }) => title === "Long lock-in"));
});

test("clear exclusions and optional arbitration do not trigger their red flags", () => {
  const examples = {
    lease: "The landlord may not enter without prior notice. The tenant does not waive claims against the landlord. You may terminate the lease early without a fee.",
    employment: "No non-compete is required. Either party may elect binding arbitration by mutual agreement. Employees do not waive their right to overtime pay.",
    "medical-bill": "We respond to billing disputes within 5 business days. Any disputed balance will not be sent to collections.",
    terms: "We will not change these terms without notice. There is no penalty of $1,000 or more. You get a 24-month warranty with no minimum commitment. We will respond within 2 days.",
  };
  for (const [docType, text] of Object.entries(examples)) assert.deepEqual(analyzeDocument(text, docType).findings, [], docType);
});

test("draft picks the five highest-ranked edits and quotes the source clauses", () => {
  const findings = analyzeDocument(getSampleById("apartment-lease").text).findings;
  assert.ok(findings.length > 5);
  const draft = generateNegotiationDraft({ recipientRole: "Leasing Office", senderName: "Sam", findings: [...findings].reverse() });
  assert.equal(draft.ok, true);
  assert.match(draft.subject, /lease/i);
  assert.match(draft.body, /^Hello Leasing Office,/);
  assert.match(draft.body, /\nSam$/);
  for (const { title, snippet, counterClause } of findings.slice(0, 5)) {
    for (const phrase of [title, snippet, counterClause]) assert.ok(draft.body.includes(phrase), title);
  }
  assert.ok(!draft.body.includes(findings[5].counterClause));
  assert.equal(draft.disclaimer, "Informational aid only, not legal or medical advice.");
});

test("medical draft requests itemized verification and handles missing or invalid findings", () => {
  const findings = analyzeDocument(getSampleById("hospital-invoice").text).findings;
  const draft = generateNegotiationDraft({ docType: "medical-bill", findings });
  assert.match(draft.subject, /billing/i);
  for (const phrase of [/itemized/i, /billing codes/i, /units/i, /insurance/i, /duplicate/i]) {
    assert.match(draft.body, phrase);
  }
  assert.match(generateNegotiationDraft().body, /^Hello Counterparty,/);
  assert.deepEqual(generateNegotiationDraft({ findings: null }), {
    ok: false, reason: "Findings must be an array.", field: "findings",
  });
});
