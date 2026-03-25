#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { transcribeAudioFile } from "../apps/mcp-server/src/asr-client.js";

type CaseItem = {
  name: string;
  file: string;
  expectedIncludes?: string[];
};

const DEFAULT_CASES: CaseItem[] = [
  {
    name: "sample-command",
    file: "samples/command-delete-prev.wav",
    expectedIncludes: ["删除前面一句"],
  },
  {
    name: "sample-dictation",
    file: "samples/dictation-feature.wav",
    expectedIncludes: ["语音输入", "插件"],
  },
];

function normalizeCases(rawCases: string[]): CaseItem[] {
  if (rawCases.length === 0) {
    return DEFAULT_CASES;
  }

  return rawCases.map((file, index) => ({
    name: `case-${index + 1}`,
    file,
  }));
}

async function runCase(item: CaseItem): Promise<{ pass: boolean; reason?: string }> {
  const filePath = resolve(item.file);
  if (!existsSync(filePath)) {
    return { pass: false, reason: `file not found: ${filePath}` };
  }

  const result = await transcribeAudioFile({
    inputPath: filePath,
    language: "zh",
  });

  if (!result.ok || !result.text) {
    return { pass: false, reason: result.error || "asr failed" };
  }

  if (item.expectedIncludes?.length) {
    const missed = item.expectedIncludes.filter((token) => !result.text?.includes(token));
    if (missed.length > 0) {
      return { pass: false, reason: `missing tokens: ${missed.join(", ")}` };
    }
  }

  return { pass: true };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cases = normalizeCases(args);

  if (args.length === 0) {
    const existing = cases.filter((item) => existsSync(resolve(item.file)));
    if (existing.length === 0) {
      console.log("No default sample audio found under ./samples, skip regression.");
      console.log("Use: npm run asr:regression -- <audio1> <audio2>");
      return;
    }
  }

  console.log(`Running ASR regression with ${cases.length} case(s)...`);

  let failed = 0;

  for (const item of cases) {
    const result = await runCase(item);
    if (result.pass) {
      console.log(`✅ ${item.name} (${item.file})`);
    } else {
      failed += 1;
      console.log(`❌ ${item.name} (${item.file}) -> ${result.reason}`);
    }
  }

  if (failed > 0) {
    console.log(`\nRegression failed: ${failed}/${cases.length}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nRegression passed: ${cases.length}/${cases.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
