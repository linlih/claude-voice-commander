import { normalizeTranscript } from "./normalizer.js";
import { parseIntent, type VoiceCommand } from "./intent-parser.js";
import { EditorEngine } from "./editor-engine.js";

export type VoiceServiceState = {
  listening: boolean;
  strictMode: boolean;
  pendingCommand?: VoiceCommand;
  pendingRawText?: string;
  buffer: string;
  committedText: string;
  lastMessage?: string;
};

export class VoiceService {
  private editor = new EditorEngine();
  private listening = false;
  private strictMode = true;
  private pendingCommand?: VoiceCommand;
  private pendingRawText?: string;
  private lastMessage?: string;

  start(): VoiceServiceState {
    this.listening = true;
    this.lastMessage = "录音已开始";
    return this.getState();
  }

  stop(): VoiceServiceState {
    this.listening = false;
    this.lastMessage = "录音已停止";
    return this.getState();
  }

  setStrictMode(enabled: boolean): VoiceServiceState {
    this.strictMode = enabled;
    this.lastMessage = enabled ? "已开启严格模式" : "已关闭严格模式";
    return this.getState();
  }

  ingestTranscript(rawText: string): VoiceServiceState {
    const normalized = normalizeTranscript(rawText);
    const intent = parseIntent(normalized.cleaned, this.strictMode);

    if (intent.type === "command") {
      if (intent.requiresConfirm) {
        this.pendingCommand = intent.command;
        this.pendingRawText = rawText;
        this.lastMessage = `检测到高风险命令，等待确认: ${intent.command}`;
        return this.getState();
      }

      this.lastMessage = this.editor.execute(intent.command);
      return this.getState();
    }

    this.editor.appendSegment(intent.text);
    this.lastMessage = `已追加文本（清理语气词 ${normalized.removedTokens.length} 个）`;
    return this.getState();
  }

  confirmPendingCommand(confirm: boolean): VoiceServiceState {
    if (!this.pendingCommand) {
      this.lastMessage = "当前没有待确认命令";
      return this.getState();
    }

    const cmd = this.pendingCommand;
    this.pendingCommand = undefined;
    this.pendingRawText = undefined;

    if (!confirm) {
      this.lastMessage = "已取消待确认命令";
      return this.getState();
    }

    this.lastMessage = this.editor.execute(cmd);
    return this.getState();
  }

  commit(): VoiceServiceState {
    this.editor.commit();
    this.lastMessage = "已提交输入";
    return this.getState();
  }

  cancel(): VoiceServiceState {
    this.editor.execute("cancel_input");
    this.pendingCommand = undefined;
    this.pendingRawText = undefined;
    this.lastMessage = "已取消输入";
    return this.getState();
  }

  retry(): VoiceServiceState {
    this.editor.execute("retry_input");
    this.pendingCommand = undefined;
    this.pendingRawText = undefined;
    this.lastMessage = "已清空并准备重新输入";
    return this.getState();
  }

  getState(): VoiceServiceState {
    const state = this.editor.getState();
    return {
      listening: this.listening,
      strictMode: this.strictMode,
      pendingCommand: this.pendingCommand,
      pendingRawText: this.pendingRawText,
      buffer: state.segments.join(" ").trim(),
      committedText: state.committedText,
      lastMessage: this.lastMessage,
    };
  }
}
