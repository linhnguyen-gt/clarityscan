import assert from "node:assert/strict";
import test from "node:test";
import { ClarityScanApp } from "../app.js";
import { askByokQuestion } from "../byok-client.js";
import { SAMPLE_DOCUMENTS } from "../core/sample-documents.js";

test("ClarityScanApp scans all four sample documents and generates counter-drafts", () => {
  const app = new ClarityScanApp();
  for (const sample of SAMPLE_DOCUMENTS) {
    const res = app.loadSample(sample.id);
    assert.equal(res.ok, true);
    assert.equal(res.docType, sample.docType);
    assert.ok(res.findings.length >= 4);
    assert.ok(res.riskScore >= 40 && res.riskScore <= 100);
    assert.ok(app.lastDraft?.ok);
    assert.ok(app.lastDraft.body.length > 40);
    assert.match(app.lastDraft.disclaimer, /not legal or medical advice/i);
  }
});

test("ClarityScanApp rejects empty input and unknown samples cleanly", () => {
  const app = new ClarityScanApp();
  const emptyRes = app.scanText("   ", "auto");
  assert.equal(emptyRes.ok, false);
  const badSample = app.loadSample("does-not-exist");
  assert.equal(badSample.ok, false);
  const earlyDraft = app.regenerateDraft("Jordan", "Landlord");
  assert.equal(earlyDraft.ok, false);
});

test("ClarityScanApp regenerates counter-draft with custom names", () => {
  const app = new ClarityScanApp();
  app.loadSample("hospital-invoice");
  const draft = app.regenerateDraft("Minh Nguyen", "Hospital Billing Office");
  assert.equal(draft.ok, true);
  assert.match(draft.body, /Minh Nguyen/);
  assert.match(draft.body, /Hospital Billing Office/);
});

test("askByokQuestion validates missing API key, empty question, and non-HTTPS URLs", async () => {
  const noKey = await askByokQuestion({ apiKey: "", question: "Summarize" });
  assert.equal(noKey.ok, false);
  const noQ = await askByokQuestion({ apiKey: "sk-test", question: "  " });
  assert.equal(noQ.ok, false);
  const httpUrl = await askByokQuestion({
    apiKey: "sk-test",
    baseUrl: "http://evil.example.com/v1",
    question: "What does this say?",
  });
  assert.equal(httpUrl.ok, false);
  assert.match(httpUrl.reason, /HTTPS/);
});
