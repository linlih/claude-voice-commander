import type { VoiceCommand } from "./intent-parser.js";

export type EditorState = {
  segments: string[];
  committedText: string;
};

type Snapshot = EditorState;

export class EditorEngine {
  private state: EditorState = { segments: [], committedText: "" };
  private undoStack: Snapshot[] = [];

  getState(): EditorState {
    return {
      segments: [...this.state.segments],
      committedText: this.state.committedText,
    };
  }

  appendSegment(text: string): void {
    const segment = text.trim();
    if (!segment) return;
    this.pushUndo();
    this.state.segments.push(segment);
  }

  commit(): string {
    this.pushUndo();
    this.state.committedText = this.state.segments.join(" ").trim();
    return this.state.committedText;
  }

  execute(command: VoiceCommand): string {
    this.pushUndo();

    switch (command) {
      case "delete_current_segment": {
        this.state.segments.pop();
        return "已删除当前段落";
      }
      case "delete_previous_sentence": {
        const index = this.state.segments.length - 1;
        if (index < 0) return "没有可删除的内容";
        const current = this.state.segments[index] || "";
        const next = current
          .replace(/[^。！？]*[。！？]?\s*$/, "")
          .trim()
          .replace(/[，、]\s*$/, "");
        if (!next) {
          this.state.segments.pop();
        } else {
          this.state.segments[index] = next;
        }
        return "已删除前面一句";
      }
      case "cancel_input": {
        this.state.segments = [];
        this.state.committedText = "";
        return "已取消输入";
      }
      case "retry_input": {
        this.state.segments = [];
        return "已清空并准备重新输入";
      }
      default:
        return "未知命令";
    }
  }

  undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.state = {
      segments: [...previous.segments],
      committedText: previous.committedText,
    };
    return true;
  }

  private pushUndo(): void {
    this.undoStack.push({
      segments: [...this.state.segments],
      committedText: this.state.committedText,
    });

    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
  }
}
