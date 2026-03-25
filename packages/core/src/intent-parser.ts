export type VoiceIntent =
  | { type: "dictation"; text: string }
  | { type: "command"; command: VoiceCommand; confidence: number; requiresConfirm: boolean };

export type VoiceCommand =
  | "delete_current_segment"
  | "delete_previous_sentence"
  | "cancel_input"
  | "retry_input";

const COMMAND_PATTERNS: Array<{
  command: VoiceCommand;
  patterns: RegExp[];
  risk: "low" | "high";
}> = [
  {
    command: "delete_current_segment",
    risk: "high",
    patterns: [
      /^命令[:：]?删除(这段话|当前段落)[。！!]?$/,
      /^删除(这段话|当前段落)(吧)?[。！!]?$/,
    ],
  },
  {
    command: "delete_previous_sentence",
    risk: "low",
    patterns: [
      /^命令[:：]?删除前面一句[。！!]?$/,
      /^删除前面一句(吧)?[。！!]?$/,
      /^把前面那句删(了|掉)(吧)?[。！!]?$/,
    ],
  },
  {
    command: "cancel_input",
    risk: "high",
    patterns: [/^命令[:：]?取消输入[。！!]?$/, /^取消输入(吧)?[。！!]?$/],
  },
  {
    command: "retry_input",
    risk: "low",
    patterns: [
      /^命令[:：]?(重新输入|重来一遍)[。！!]?$/,
      /^(重新输入|重来一遍)(吧)?[。！!]?$/,
    ],
  },
];

export function parseIntent(text: string, strictMode = true): VoiceIntent {
  const normalized = text.trim();

  if (!normalized) {
    return { type: "dictation", text: "" };
  }

  for (const item of COMMAND_PATTERNS) {
    const matched = item.patterns.some((pattern) => pattern.test(normalized));
    if (matched) {
      const explicit = /^命令[:：]?/.test(normalized);
      const confidence = explicit ? 0.98 : item.risk === "high" ? 0.78 : 0.86;
      const requiresConfirm = strictMode && item.risk === "high" && !explicit;

      return {
        type: "command",
        command: item.command,
        confidence,
        requiresConfirm,
      };
    }
  }

  return { type: "dictation", text: normalized };
}
