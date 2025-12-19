import { describe, it, expect } from "vitest";
import { extractPromises, unfulfilledHighConfidence } from "../../src/runtime/hooks/completionValidator.js";

describe("completionValidator.extractPromises", () => {
  it("detects progress-style intent ('going to')", () => {
    const text = "I'm going to retrieve the draft products and send the list.";
    const promises = extractPromises(text);
    expect(promises.length).toBeGreaterThan(0);
    const actions = promises.map((p) => p.extractedAction.toLowerCase());
    expect(actions).toContain("retrieve");
  });

  it("detects planning intent ('planning to')", () => {
    const text = "Planning to connect to your store and fetch draft products now.";
    const promises = extractPromises(text);
    expect(promises.some((p) => p.extractedAction.toLowerCase() === "connect")).toBe(true);
  });

  it("keeps unfulfilled promises when confidence is high", () => {
    const text = "Let me connect to your store and retrieve draft products.";
    const promises = extractPromises(text);
    const open = unfulfilledHighConfidence(promises, 0.65);
    expect(open.length).toBeGreaterThan(0);
  });
});
