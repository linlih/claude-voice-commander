import { describe, expect, test } from "vitest";
import { parseAsrWorkerOutput } from "../../apps/mcp-server/src/asr-client.js";

describe("parseAsrWorkerOutput", () => {
  test("parses valid worker output", () => {
    const output = JSON.stringify({ ok: true, text: "你好", engine: "stub" });
    const parsed = parseAsrWorkerOutput(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.text).toBe("你好");
  });

  test("throws on invalid payload", () => {
    expect(() => parseAsrWorkerOutput(JSON.stringify({ text: "missing ok" }))).toThrow(
      /missing ok field/i,
    );
  });
});
