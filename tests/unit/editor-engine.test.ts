import { describe, expect, test } from "vitest";
import { EditorEngine } from "../../packages/core/src/editor-engine.js";

describe("EditorEngine", () => {
  test("append and commit text", () => {
    const editor = new EditorEngine();
    editor.appendSegment("第一句");
    editor.appendSegment("第二句");
    const committed = editor.commit();
    expect(committed).toBe("第一句 第二句");
  });

  test("delete previous sentence", () => {
    const editor = new EditorEngine();
    editor.appendSegment("先写一句。再写一句。最后一句。");
    editor.execute("delete_previous_sentence");
    const state = editor.getState();
    expect(state.segments[0]).toBe("先写一句。再写一句。");
  });

  test("undo restores previous state", () => {
    const editor = new EditorEngine();
    editor.appendSegment("内容A");
    editor.execute("retry_input");
    expect(editor.getState().segments.length).toBe(0);
    expect(editor.undo()).toBe(true);
    expect(editor.getState().segments[0]).toBe("内容A");
  });
});
