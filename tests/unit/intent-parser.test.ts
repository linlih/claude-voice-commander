import { describe, expect, test } from "vitest";
import { parseIntent } from "../../packages/core/src/intent-parser.js";

describe("parseIntent", () => {
  test("parses explicit command with high confidence", () => {
    const intent = parseIntent("命令：删除前面一句", true);
    expect(intent.type).toBe("command");
    if (intent.type === "command") {
      expect(intent.command).toBe("delete_previous_sentence");
      expect(intent.confidence).toBeGreaterThan(0.9);
      expect(intent.requiresConfirm).toBe(false);
    }
  });

  test("requires confirm for risky natural command in strict mode", () => {
    const intent = parseIntent("删除这段话", true);
    expect(intent.type).toBe("command");
    if (intent.type === "command") {
      expect(intent.command).toBe("delete_current_segment");
      expect(intent.requiresConfirm).toBe(true);
    }
  });

  test("treats ordinary text as dictation", () => {
    const intent = parseIntent("我想实现语音输入插件", true);
    expect(intent.type).toBe("dictation");
  });

  test("does not trigger delete command inside descriptive sentence", () => {
    const intent = parseIntent("我们需要删除这段历史记录里的敏感字段", true);
    expect(intent.type).toBe("dictation");
  });

  test("does not trigger cancel command for conversational phrase", () => {
    const intent = parseIntent("这个方案先不要了，我们换一个", true);
    expect(intent.type).toBe("dictation");
  });

  test("still supports short natural command with punctuation", () => {
    const intent = parseIntent("重新输入吧。", true);
    expect(intent.type).toBe("command");
    if (intent.type === "command") {
      expect(intent.command).toBe("retry_input");
    }
  });
});
