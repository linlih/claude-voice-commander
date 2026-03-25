import { describe, expect, test } from "vitest";
import { VoiceService } from "../../packages/core/src/voice-service.js";

describe("VoiceService integration", () => {
  test("dictation -> command confirm -> commit flow", () => {
    const service = new VoiceService();

    service.start();
    service.ingestTranscript("嗯 我们先把项目骨架搭起来");

    const pending = service.ingestTranscript("删除这段话");
    expect(pending.pendingCommand).toBe("delete_current_segment");

    const confirmed = service.confirmPendingCommand(true);
    expect(confirmed.buffer).toBe("");

    service.ingestTranscript("重新输入新的内容");
    const committed = service.commit();

    expect(committed.committedText).toContain("新的内容");
  });

  test("cancel clears all", () => {
    const service = new VoiceService();

    service.start();
    service.ingestTranscript("先输入一些文本");
    const canceled = service.cancel();

    expect(canceled.buffer).toBe("");
    expect(canceled.committedText).toBe("");
  });
});
