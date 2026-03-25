import { describe, expect, test } from "vitest";
import { normalizeTranscript } from "../../packages/core/src/normalizer.js";

describe("normalizeTranscript", () => {
  test("removes strong fillers while preserving meaning", () => {
    const result = normalizeTranscript("嗯 我今天想做一个功能");
    expect(result.cleaned).toBe("我今天想做一个功能");
    expect(result.removedTokens.length).toBeGreaterThan(0);
  });

  test("keeps protected phrase", () => {
    const result = normalizeTranscript("这个方案就是这样推进");
    expect(result.cleaned).toContain("就是这样");
  });

  test("removes weak filler at sentence start", () => {
    const result = normalizeTranscript("然后，我们先写计划");
    expect(result.cleaned).toBe("，我们先写计划");
  });
});
