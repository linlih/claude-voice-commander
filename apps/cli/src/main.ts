import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { VoiceService } from "../../../packages/core/src/voice-service.js";
import { transcribeAudioFile } from "../../mcp-server/src/asr-client.js";

type CliArgs = {
  file?: string;
  model?: string;
  language?: string;
  beamSize?: number;
  text?: string;
  strict?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];

    if (key === "--file" && value) {
      args.file = value;
      i += 1;
      continue;
    }

    if (key === "--model" && value) {
      args.model = value;
      i += 1;
      continue;
    }

    if (key === "--language" && value) {
      args.language = value;
      i += 1;
      continue;
    }

    if (key === "--beam-size" && value) {
      const beam = Number(value);
      if (Number.isInteger(beam) && beam >= 1 && beam <= 10) {
        args.beamSize = beam;
      }
      i += 1;
      continue;
    }

    if (key === "--text" && value) {
      args.text = value;
      i += 1;
      continue;
    }

    if (key === "--strict" && value) {
      args.strict = value !== "false";
      i += 1;
      continue;
    }
  }

  return args;
}

function printState(label: string, state: ReturnType<VoiceService["getState"]>): void {
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(state, null, 2));
}

async function handleFileTranscription(service: VoiceService, cliArgs: CliArgs): Promise<void> {
  if (!cliArgs.file) {
    return;
  }

  const asr = await transcribeAudioFile({
    inputPath: cliArgs.file,
    model: cliArgs.model,
    language: cliArgs.language,
    beamSize: cliArgs.beamSize,
  });

  console.log("\n[ASR]");
  console.log(JSON.stringify(asr, null, 2));

  if (asr.ok && asr.text) {
    const state = service.ingestTranscript(asr.text);
    printState("INGEST_FROM_FILE", state);
  }
}

async function runInteractive(service: VoiceService): Promise<void> {
  const rl = readline.createInterface({ input, output });

  console.log("语音 CLI 交互模式：");
  console.log("- 输入普通文本：注入识别结果");
  console.log("- /file <audio_path>：转写音频并注入");
  console.log("- /commit /cancel /retry /status /start /stop");
  console.log("- /confirm yes|no");
  console.log("- /strict on|off");
  console.log("- /exit 退出\n");

  while (true) {
    const line = (await rl.question("> ")).trim();

    if (!line) {
      continue;
    }

    if (line === "/exit") {
      break;
    }

    if (line === "/start") {
      printState("START", service.start());
      continue;
    }

    if (line === "/stop") {
      printState("STOP", service.stop());
      continue;
    }

    if (line === "/status") {
      printState("STATUS", service.getState());
      continue;
    }

    if (line === "/commit") {
      printState("COMMIT", service.commit());
      continue;
    }

    if (line === "/cancel") {
      printState("CANCEL", service.cancel());
      continue;
    }

    if (line === "/retry") {
      printState("RETRY", service.retry());
      continue;
    }

    if (line.startsWith("/confirm ")) {
      const value = line.slice("/confirm ".length).trim();
      printState("CONFIRM", service.confirmPendingCommand(value === "yes"));
      continue;
    }

    if (line.startsWith("/strict ")) {
      const value = line.slice("/strict ".length).trim();
      printState("STRICT", service.setStrictMode(value !== "off"));
      continue;
    }

    if (line.startsWith("/file ")) {
      const file = line.slice("/file ".length).trim();
      await handleFileTranscription(service, { file });
      continue;
    }

    printState("INGEST", service.ingestTranscript(line));
  }

  rl.close();
}

async function main(): Promise<void> {
  const service = new VoiceService();
  const cliArgs = parseArgs(process.argv.slice(2));

  if (cliArgs.strict !== undefined) {
    service.setStrictMode(cliArgs.strict);
  }

  service.start();

  if (cliArgs.file || cliArgs.text) {
    if (cliArgs.text) {
      printState("INGEST_TEXT", service.ingestTranscript(cliArgs.text));
    }

    await handleFileTranscription(service, cliArgs);
    printState("FINAL", service.getState());
    return;
  }

  await runInteractive(service);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
