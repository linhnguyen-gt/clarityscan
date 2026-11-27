// Optional browser-direct OpenAI-compatible BYOK Q&A helper.
// Keys remain in session memory only and are never saved to storage or URLs.

export async function askByokQuestion({ apiKey, baseUrl, model, documentText, findings, question }) {
  const key = String(apiKey || "").trim();
  const q = String(question || "").trim();
  const base = String(baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const modelName = String(model || "gpt-4o-mini").trim();

  if (!key) {
    return { ok: false, reason: "Provide a BYOK API key for optional follow-up Q&A.", field: "apiKey" };
  }
  if (!q) {
    return { ok: false, reason: "Enter a question about the document.", field: "question" };
  }
  let parsedBase;
  try {
    parsedBase = new URL(base);
    if (parsedBase.protocol !== "https:" && parsedBase.hostname !== "localhost" && parsedBase.hostname !== "127.0.0.1") {
      return { ok: false, reason: "BYOK base URL must use HTTPS.", field: "baseUrl" };
    }
  } catch {
    return { ok: false, reason: "Invalid BYOK base URL.", field: "baseUrl" };
  }

  const summary = (findings || [])
    .slice(0, 6)
    .map((f) => `- [${f.severity}] ${f.title}: ${f.plainExplanation}`)
    .join("\n");

  const systemPrompt = [
    "You explain contracts, leases, job offers, medical bills, and terms of service in plain, calm English.",
    "Never give formal legal or medical advice. Base answers strictly on the provided excerpt and deterministic findings.",
  ].join(" ");

  const userPrompt = [
    "Deterministic findings:",
    summary || "None flagged.",
    "",
    "Document excerpt:",
    String(documentText || "").slice(0, 6000),
    "",
    `User question: ${q}`,
  ].join("\n");

  try {
    const res = await fetch(`${parsedBase.href}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false, reason: `Provider returned HTTP ${res.status}.` };
    }
    const payload = await res.json();
    const answer = payload?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return { ok: false, reason: "Provider returned an empty response." };
    }
    return { ok: true, answer };
  } catch (error) {
    return { ok: false, reason: error?.message || "Network or CORS error calling BYOK endpoint." };
  }
}
