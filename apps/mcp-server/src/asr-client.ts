import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type AsrOptions = {
  inputPath: string;
  model?: string;
  language?: string;
  beamSize?: number;
};

export type AsrResult = {
  ok: boolean;
  text?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
  language?: string;
  engine?: string;
  error?: string;
};

export function parseAsrWorkerOutput(stdout: string): AsrResult {
  const parsed = JSON.parse(stdout) as AsrResult;
  if (typeof parsed.ok !== "boolean") {
    throw new Error("Invalid ASR worker response: missing ok field");
  }
  return parsed;
}

export async function transcribeAudioFile(options: AsrOptions): Promise<AsrResult> {
  const workerPath = "/root/claude-voice-commander/services/asr-worker/main.py";
  const args = ["--input", options.inputPath];

  if (options.model) {
    args.push("--model", options.model);
  }

  if (options.language) {
    args.push("--language", options.language);
  }

  if (options.beamSize) {
    args.push("--beam-size", String(options.beamSize));
  }

  const { stdout } = await execFileAsync("python3", [workerPath, ...args], {
    maxBuffer: 1024 * 1024,
  });

  return parseAsrWorkerOutput(stdout);
}
