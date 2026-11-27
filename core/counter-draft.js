import { compareFindingPriority, DOC_TYPE_LABELS } from "./clause-rules.js";

const disclaimer = "Informational aid only, not legal or medical advice.";

const medicalQuestions = [
  "Please send an itemized statement and confirm the following in writing.",
  "1. What are the service date, provider, billing codes, units, and charge per unit for each line?",
  "2. What did insurance allow, pay, or adjust, and how did you calculate the remaining patient balance?",
  "3. Do repeated entries represent distinct services? If so, what date, units, or records distinguish them?",
  "4. What is the dispute deadline, and can you pause collections on the disputed amount during review?",
].join("\n");

export function generateNegotiationDraft({
  docType = "lease",
  recipientRole = "Counterparty",
  senderName = "Alex",
  findings = [],
} = {}) {
  if (!Array.isArray(findings)) {
    return { ok: false, reason: "Findings must be an array.", field: "findings" };
  }

  const isMedicalBill = docType === "medical-bill";
  const label = Object.hasOwn(DOC_TYPE_LABELS, docType) ? DOC_TYPE_LABELS[docType] : "Agreement";
  const subject = isMedicalBill ? "Request for itemized billing review" : "Requested revisions to the " + label;
  const topFindings = findings
    .filter((finding) => typeof finding?.counterClause === "string" && finding.counterClause.trim())
    .sort(compareFindingPriority)
    .slice(0, 5);

  const paragraphs = [
    "Hello " + recipientRole + ",",
    isMedicalBill
      ? "Thank you for sending the statement. I am requesting a review of the charges and would appreciate a written response."
      : "Thank you for sending the agreement. I would like to resolve the items below before moving forward.",
  ];

  if (topFindings.length) {
    const items = topFindings.map(({ title, snippet, counterClause }, index) => [
      (index + 1) + ". " + (title || "Requested clarification"),
      snippet && "   The document says “" + snippet + "”",
      "   " + (isMedicalBill ? "Requested action" : "Proposed wording") + "\n   " + counterClause,
    ].filter(Boolean).join("\n"));
    paragraphs.push(items.join("\n\n"));
  } else if (!isMedicalBill) {
    paragraphs[1] = "Thank you for sending the agreement. Please confirm in writing whether any fees, deadlines, or obligations apply beyond those stated in the agreement.";
  }

  if (isMedicalBill) paragraphs.push(medicalQuestions);
  paragraphs.push(
    isMedicalBill
      ? "If the review changes the balance, please send a corrected statement."
      : "Please let me know which changes you can accept and send an updated copy for review.",
    "Thank you,\n" + senderName,
  );

  return { ok: true, subject, body: paragraphs.join("\n\n"), disclaimer };
}
