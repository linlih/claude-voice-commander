import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { VoiceService } from "../../../packages/core/src/voice-service.js";
import { transcribeAudioFile } from "./asr-client.js";

const voice = new VoiceService();
const server = new McpServer({
  name: "claude-voice-commander",
  version: "0.1.0",
});

server.tool("voice_start", "开始语音输入会话", {}, async () => {
  return {
    content: [{ type: "text", text: JSON.stringify(voice.start(), null, 2) }],
  };
});

server.tool("voice_stop", "停止语音输入会话", {}, async () => {
  return {
    content: [{ type: "text", text: JSON.stringify(voice.stop(), null, 2) }],
  };
});

server.tool(
  "voice_ingest_text",
  "注入一段识别文本（用于测试/模拟）",
  { text: z.string().min(1) },
  async ({ text }) => {
    return {
      content: [{ type: "text", text: JSON.stringify(voice.ingestTranscript(text), null, 2) }],
    };
  },
);

server.tool(
  "voice_transcribe_file",
  "转写本地音频文件并注入语音输入流程",
  {
    path: z.string().min(1),
    model: z.string().optional(),
    language: z.string().optional(),
    beamSize: z.number().int().min(1).max(10).optional(),
  },
  async ({ path, model, language, beamSize }) => {
    const asr = await transcribeAudioFile({
      inputPath: path,
      model,
      language,
      beamSize,
    });

    if (!asr.ok || !asr.text) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: false, asr, state: voice.getState() }, null, 2),
          },
        ],
      };
    }

    const state = voice.ingestTranscript(asr.text);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true, asr, state }, null, 2),
        },
      ],
    };
  },
);

server.tool("voice_commit", "提交当前输入缓冲区", {}, async () => {
  return {
    content: [{ type: "text", text: JSON.stringify(voice.commit(), null, 2) }],
  };
});

server.tool("voice_cancel", "取消当前输入", {}, async () => {
  return {
    content: [{ type: "text", text: JSON.stringify(voice.cancel(), null, 2) }],
  };
});

server.tool("voice_retry", "清空并重新输入", {}, async () => {
  return {
    content: [{ type: "text", text: JSON.stringify(voice.retry(), null, 2) }],
  };
});

server.tool(
  "voice_confirm_pending",
  "确认/拒绝待确认命令",
  { confirm: z.boolean() },
  async ({ confirm }) => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(voice.confirmPendingCommand(confirm), null, 2),
        },
      ],
    };
  },
);

server.tool(
  "voice_set_strict_mode",
  "设置严格模式（高风险自然语句需确认）",
  { enabled: z.boolean() },
  async ({ enabled }) => {
    return {
      content: [{ type: "text", text: JSON.stringify(voice.setStrictMode(enabled), null, 2) }],
    };
  },
);

server.tool("voice_status", "查看当前语音输入状态", {}, async () => {
  return {
    content: [{ type: "text", text: JSON.stringify(voice.getState(), null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
