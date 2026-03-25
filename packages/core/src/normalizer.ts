export type NormalizeResult = {
  original: string;
  cleaned: string;
  removedTokens: string[];
};

const STRONG_FILLERS = ["嗯", "呃", "啊", "额", "唔"];
const WEAK_FILLERS = ["就是", "然后", "那个"];
const PROTECTED_PHRASES = ["就是这样", "那个年代", "然后呢"];

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withProtectedPhrases(input: string): {
  text: string;
  restore: (value: string) => string;
} {
  const replacements = new Map<string, string>();
  let text = input;

  PROTECTED_PHRASES.forEach((phrase, index) => {
    const key = `__KEEP_${index}__`;
    replacements.set(key, phrase);
    text = text.replace(new RegExp(escapeRegExp(phrase), "g"), key);
  });

  return {
    text,
    restore: (value: string) => {
      let output = value;
      for (const [key, phrase] of replacements.entries()) {
        output = output.replace(new RegExp(escapeRegExp(key), "g"), phrase);
      }
      return output;
    },
  };
}

export function normalizeTranscript(input: string): NormalizeResult {
  const original = input;
  const removedTokens: string[] = [];

  const { text, restore } = withProtectedPhrases(input.trim());
  let cleaned = text;

  const strongPattern = new RegExp(
    `(^|[，。！？、\\s])(${STRONG_FILLERS.map(escapeRegExp).join("|")})(?=([，。！？、\\s]|$))`,
    "g",
  );

  cleaned = cleaned.replace(strongPattern, (match, prefix, token) => {
    removedTokens.push(token);
    return prefix || "";
  });

  const weakStartPattern = new RegExp(
    `(^|[。！？]\\s*)(${WEAK_FILLERS.map(escapeRegExp).join("|")})(?=([，、\\s]|$))`,
    "g",
  );

  cleaned = cleaned.replace(weakStartPattern, (match, prefix, token) => {
    removedTokens.push(token);
    return prefix || "";
  });

  const repeatedWeakPattern = new RegExp(
    `(${WEAK_FILLERS.map(escapeRegExp).join("|")})([，、\\s]*)\\1+`,
    "g",
  );

  cleaned = cleaned.replace(repeatedWeakPattern, (match, token) => {
    removedTokens.push(token);
    return token;
  });

  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/[，、]{2,}/g, "，").trim();
  cleaned = restore(cleaned);

  return {
    original,
    cleaned,
    removedTokens,
  };
}
