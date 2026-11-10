import test from "node:test";
import assert from "node:assert/strict";
import { fetchAIInsights } from "../ai-insights.js";

const sampleTransactions = [
  { text: "Groceries", amount: -42, category: "Food & Dining", date: "2026-11-01" }
];

test("posts stored transactions and returns the insights text", async () => {
  let request;
  const insights = await fetchAIInsights(sampleTransactions, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ insights: "Try setting a weekly grocery budget." }) };
  });

  assert.equal(request.url, "/api/insights");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(request.options.body), { data: sampleTransactions });
  assert.equal(insights, "Try setting a weekly grocery budget.");
});

test("rejects empty transaction data without calling the API", async () => {
  let called = false;
  await assert.rejects(
    fetchAIInsights([], async () => { called = true; }),
    /Add transactions/
  );
  assert.equal(called, false);
});

test("surfaces backend errors", async () => {
  await assert.rejects(
    fetchAIInsights(sampleTransactions, async () => ({
      ok: false,
      json: async () => ({ error: "AI service is not configured" })
    })),
    /AI service is not configured/
  );
});

test("rejects a successful response with missing insights", async () => {
  await assert.rejects(
    fetchAIInsights(sampleTransactions, async () => ({
      ok: true,
      json: async () => ({ insights: "  " })
    })),
    /returned no insights/
  );
});
