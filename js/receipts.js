const key = "fairfare-contribution-receipts";
const maxReceipts = 100;
let memory = [];

const validReceipt = (receipt) =>
  receipt &&
  typeof receipt.reference === "string" &&
  typeof receipt.category === "string" &&
  ["purchase", "contributor"].includes(receipt.kind) &&
  Number.isFinite(receipt.price) &&
  receipt.price > 0 &&
  typeof receipt.observed === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(receipt.observed);

export function contributionReceipts() {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(stored)) {
      const known = new Set(memory.map((receipt) => receipt.reference));
      return [
        ...memory,
        ...stored.filter(
          (receipt) => validReceipt(receipt) && !known.has(receipt.reference),
        ),
      ].slice(0, maxReceipts);
    }
  } catch {
    /* Some browsers block site storage. */
  }
  return memory;
}

export function rememberContribution(response, submission) {
  const receipt = {
    reference: typeof response?.id === "string" ? response.id.slice(0, 8) : "",
    category: submission.category_id,
    kind: submission.kind,
    price: submission.price_inr,
    observed: submission.observed_at,
  };
  if (!receipt.reference || !validReceipt(receipt)) return;
  const next = [
    receipt,
    ...contributionReceipts().filter(
      (item) => item.reference !== receipt.reference,
    ),
  ].slice(0, maxReceipts);
  try {
    localStorage.setItem(key, JSON.stringify(next));
    memory = [];
  } catch {
    memory = next;
  }
}

export function clearContributionReceipts() {
  memory = [];
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
