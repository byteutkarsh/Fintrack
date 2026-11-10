export async function fetchAIInsights(transactions, fetchImpl = globalThis.fetch) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error("Add transactions before requesting AI insights.");
  }

  const response = await fetchImpl("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: transactions })
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The AI service returned an invalid response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(result.error || "Unable to load AI insights.");
  }
  if (typeof result.insights !== "string" || !result.insights.trim()) {
    throw new Error("The AI service returned no insights. Please try again.");
  }

  return result.insights;
}
