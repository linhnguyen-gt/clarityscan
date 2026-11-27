import { CLAUSE_RULES, DOC_TYPES, DOC_TYPE_LABELS, compareFindingPriority } from "./clause-rules.js";

const docTypeSignals = {
  lease: [/\b(?:lease agreement|rental agreement|residential lease)\b/i, /\blease\b/i,
    /\blandlord\b/i, /\btenant\b/i, /\b(?:rent|rental unit|security deposit|apartment|leased premises)\b/i],
  employment: [/\b(?:job offer|offer of employment|employment agreement)\b/i, /\bemployment\b/i,
    /\b(?:employee|employer)\b/i, /\b(?:salary|signing bonus|payroll|non[- ]?compete|overtime pay)\b/i],
  "medical-bill": [/\b(?:medical bill|billing statement|hospital invoice|patient statement)\b/i, /\bpatient\b/i,
    /\b(?:hospital|clinic|medical|outpatient|physician)\b/i,
    /\b(?:itemized|date of service|facility fee|insurance adjustment|explanation of benefits|CPT|HCPCS)\b/i],
  terms: [/\b(?:terms of (?:service|use)|user agreement)\b/i, /\b(?:subscription|subscriber)\b/i,
    /\b(?:platform|software|account)\b/i, /\b(?:user content|personal data|acceptable use)\b/i],
};

export function detectDocType(text) {
  if (typeof text !== "string") return "terms";
  const heading = text.trimStart().split(/[\r\n.!?;]/, 1)[0];
  let bestType = "terms";
  let bestScore = 0;
  for (const docType of DOC_TYPES) {
    const [documentName, ...signals] = docTypeSignals[docType];
    if (documentName.test(heading)) return docType;
    const score = signals.reduce((sum, signal) => sum + Number(signal.test(text)), documentName.test(text) ? 4 : 0);
    if (score > bestScore) {
      bestType = docType;
      bestScore = score;
    }
  }
  return bestType;
}

function splitClauses(text) {
  const clauses = [];
  const abbreviation = /(?:\b(?:Mr|Mrs|Ms|Dr|No|Sec|Art|vs|e\.g|i\.e)|\b[A-Z](?:\.[A-Z])+)\.$/i;
  let start = 0;
  for (const { 0: delimiter, index } of text.matchAll(/[.!?;]+["'”’)\]]*(?=\s|$)|\r\n?|\n/g)) {
    const end = index + delimiter.length;
    const snippet = text.slice(start, end).trim();
    if (delimiter === "." && (abbreviation.test(snippet) || /^\d{1,3}\.$/.test(snippet))) continue;
    if (snippet && /[\r\n]/.test(delimiter) && !dollarAtEnd.test(snippet)
      && /^[ \t]*(?:and|or|without|within|with|unless|until|before|after|to|of|for)\b/.test(text.slice(end))) continue;
    if (/[\p{L}\p{N}]/u.test(snippet)) clauses.push(snippet);
    start = end;
  }
  const remainder = text.slice(start).trim();
  if (/[\p{L}\p{N}]/u.test(remainder)) clauses.push(remainder);
  return clauses;
}

function estimateReadability(text, clauses) {
  const words = text.toLowerCase().match(/\p{L}+(?:['’]\p{L}+)*/gu) ?? [];
  if (!words.length) return 1;
  const syllables = words.reduce((total, word) => {
    const stem = word.length > 2 && !/[^aeiouy]le$/.test(word) ? word.replace(/e$/, "") : word;
    return total + Math.max(1, stem.match(/[aeiouy]+/g)?.length ?? 0);
  }, 0);
  const sentences = clauses.filter((clause) => !clause.endsWith(";")).length;
  const grade = 0.39 * (words.length / Math.max(1, sentences)) + 11.8 * (syllables / words.length) - 15.59;
  return Math.max(1, Math.round(grade * 10) / 10);
}

const dollarAtEnd = /\$\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)$/;
const penaltyName = /\b(?:penalt(?:y|ies)|(?:early termination|cancellation|exit) (?:penalt(?:y|ies)|charges?|fees?)|liquidated damages|late fees?)\b/i;
const penaltyBeforeAmount = new RegExp(penaltyName.source
  + "\\s*(?:(?:of|is|will be|shall be|totals?|amounts? to|equal to)\\s+)?(?:(?:up to|at least|a (?:maximum|minimum) of)\\s+)?$", "i");
const penaltyAfterAmount = new RegExp("^\\s*(?:(?:as|for|in)\\s+)?(?:an?\\s+)?" + penaltyName.source, "i");
const excludesPenalty = /\b(?:no |without (?:paying )?)(?:(?:any|an?) )?(?:(?:early termination|cancellation|exit) )?$/i;

function hasLargePenalty(text) {
  for (const amount of text.matchAll(/(?:\$|\bUSD)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi)) {
    if (Number(amount[1].replaceAll(",", "")) < 1000) continue;
    const before = text.slice(Math.max(0, amount.index - 80), amount.index);
    const after = text.slice(amount.index + amount[0].length);
    const penalty = before.match(penaltyBeforeAmount);
    if (penalty && !excludesPenalty.test(before.slice(0, penalty.index))) return true;
    if (penaltyAfterAmount.test(after) && !excludesPenalty.test(before)) return true;
  }
  return false;
}

function hasLongLockIn(text) {
  const context = text.replace(/\b(?:no |without (?:an? )?)(?:minimum )?(?:lock[- ]?in|commitment|term)\b/gi, "");
  if (!/\b(?:lock[- ]?in|minimum (?:term|commitment)|minimum\b.*\b(?:months?|years?)|commitment|(?:initial|fixed) term|non[- ]?cancel(?:l)?able|(?:cannot|can't|may not) be cancel(?:l)?ed|early termination|non[- ]?compet(?:e|ition))\b/i.test(context)) {
    return false;
  }
  return [...text.matchAll(/\b(\d+(?:\.\d+)?|two)[ -]+(months?|years?)\b/gi)].some(([, value, unit]) =>
    (value.toLowerCase() === "two" ? 2 : Number(value)) * (/^year/i.test(unit) ? 12 : 1) >= 24);
}

const shortDays = "\\b(?:[0-7]|one|two|three|four|five|six|seven)[ -]+(?:(?:calendar|business)[ -]+)?days?\\b";
const shortPeriod = new RegExp("\\b(?:within|in|no later than|at most)\\s+" + shortDays, "i");
const shortDeadline = new RegExp(shortDays + "\\s+(?:(?:\\w+ )?deadline|to (?:dispute|appeal|respond|object|cancel|file|report|submit|pay))\\b", "i");

function hasShortDeadline(text) {
  const deadlineContext = /\b(?:deadlines?|disput\w*|appeals?|respond|responses?|cancel\w*|file|object\w*|report|submit|notify|(?:give|provide|send) notice|must pay|payment (?:is )?due)\b/i;
  const obligation = /\b(?:must|shall|required|deadline|due|you (?:have|need to)|no later than|at most)\b|^(?:please )?(?:dispute|appeal|respond|object|cancel|file|report|submit|pay)\b/i;
  return shortDeadline.test(text) || (shortPeriod.test(text) && obligation.test(text) && deadlineContext.test(text));
}

const numericChecks = [
  {
    id: "numeric-large-penalty", title: "Large penalty", severity: "high", weight: 15, matches: hasLargePenalty,
    plainExplanation: "This clause names a penalty of at least $1,000.",
    actionTip: "Ask when it applies and how the amount was calculated.",
    counterClause: "Any penalty is limited to reasonable, documented costs and a cap agreed in writing.",
  },
  {
    id: "numeric-long-lock-in", title: "Long lock-in", severity: "high", weight: 14, matches: hasLongLockIn,
    plainExplanation: "This clause specifies a commitment or restriction of at least two years.",
    actionTip: "Ask for a shorter term and a clear way to end it early.",
    counterClause: "The initial restriction or commitment lasts no more than 12 months, with any extension subject to written agreement.",
  },
  {
    id: "numeric-short-deadline", title: "Short deadline", severity: "medium", weight: 10, matches: hasShortDeadline,
    plainExplanation: "The clause gives seven days or fewer to act.",
    actionTip: "Ask when the deadline starts and whether it can be extended.",
    counterClause: "The response period runs for 30 days from confirmed receipt of written notice.",
  },
];

function isRepeatedCharge(text, serviceDate, seenCharges) {
  const entry = text.replace(/[.;]$/, "").toLowerCase();
  const amount = entry.match(dollarAtEnd);
  if (!amount || !/\p{L}/u.test(entry)) return false;
  const key = [serviceDate, entry.slice(0, amount.index).trimEnd(), Number(amount[1].replaceAll(",", ""))].join("\t");
  const repeated = seenCharges.has(key);
  seenCharges.add(key);
  return repeated;
}

function addFinding(findings, details, snippet, clauseIndex) {
  findings.push({ ...details, ruleId: details.id, snippet, clauseIndex });
}

function getRiskGrade(score) {
  if (score >= 65) return "High";
  if (score >= 40) return "Elevated";
  if (score >= 20) return "Moderate";
  return "Low";
}

export function analyzeDocument(text, docType = "auto") {
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, reason: "Paste or load a document before scanning.", field: "text" };
  }
  if (docType !== "auto" && !DOC_TYPES.includes(docType)) {
    return { ok: false, reason: "Unsupported document type.", field: "docType" };
  }

  const resolvedDocType = docType === "auto" ? detectDocType(text) : docType;
  const docTypeLabel = DOC_TYPE_LABELS[resolvedDocType];
  const clauses = splitClauses(text);
  const applicableRules = CLAUSE_RULES.filter((rule) => rule.docTypes.includes(resolvedDocType));
  const findings = [];
  const seenCharges = new Set();
  let serviceDate = "";
  clauses.forEach((snippet, clauseIndex) => {
    const matchText = snippet.replace(/[’‘]/g, "'").replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ");
    if (resolvedDocType === "medical-bill") {
      const dateHeading = matchText.match(/^(?:date of service|service date):?\s+(.+)$/i);
      if (dateHeading) serviceDate = dateHeading[1].replace(/\.$/, "").toLowerCase();
    }
    const repeatedCharge = resolvedDocType === "medical-bill" && isRepeatedCharge(matchText, serviceDate, seenCharges);
    let hasBillingDeadline = false;
    for (const { patterns, ...rule } of applicableRules) {
      if (patterns.some((pattern) => pattern.test(matchText)) || (repeatedCharge && rule.id === "med-duplicate-line-item")) {
        addFinding(findings, rule, snippet, clauseIndex);
        if (rule.id === "med-short-dispute-window") hasBillingDeadline = true;
      }
    }
    for (const { matches, ...check } of numericChecks) {
      if (hasBillingDeadline && check.id === "numeric-short-deadline") continue;
      if (matches(matchText)) addFinding(findings, check, snippet, clauseIndex);
    }
  });
  findings.sort(compareFindingPriority);

  const severityCounts = { critical: 0, high: 0, medium: 0 };
  const ruleWeights = new Map();
  for (const finding of findings) {
    severityCounts[finding.severity]++;
    ruleWeights.set(finding.ruleId, finding.weight);
  }
  const riskScore = Math.min(100, Math.max(0, [...ruleWeights.values()].reduce((sum, weight) => sum + weight, 0)));
  const topConcern = findings.length ? "The first concern to review is " + findings[0].title + "." : "The scan found no red flags.";
  const plainSummary = "The document type is " + docTypeLabel + ". The risk score is " + riskScore + " out of 100. " + topConcern;

  return {
    ok: true, docType: resolvedDocType, docTypeLabel, clauses, findings, riskScore,
    riskGrade: getRiskGrade(riskScore), readabilityGrade: estimateReadability(text, clauses),
    severityCounts, safeClausesCount: Math.max(0, clauses.length - findings.length), plainSummary,
  };
}
