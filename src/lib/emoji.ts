// Hermes has no `Intl.Segmenter`, so emoji sequences are grouped by hand.

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const REGIONAL_INDICATOR = /\p{Regional_Indicator}/u;
const KEYCAP_BASE = /[#*0-9]/;
const VARIATION_SELECTOR = "️";
const KEYCAP = "⃣";
const ZWJ = "‍";

const isModifier = (char: string) => /\p{Emoji_Modifier}/u.test(char);
const isTag = (char: string) => /[\u{E0020}-\u{E007F}]/u.test(char);

/** Extracts up to `limit` emoji from free text, dropping everything else. */
export function parseEmojis(text: string, limit = 3): string[] {
  const chars = Array.from(text);
  const found: string[] = [];
  let i = 0;

  while (i < chars.length && found.length < limit) {
    const start = i;
    const char = chars[i++];

    if (REGIONAL_INDICATOR.test(char)) {
      // A flag is exactly two regional indicators.
      if (i < chars.length && REGIONAL_INDICATOR.test(chars[i])) i++;
      else continue;
    } else if (KEYCAP_BASE.test(char)) {
      // Digits and #/* only count when they form a keycap (e.g. 1️⃣).
      if (chars[i] === VARIATION_SELECTOR) i++;
      if (chars[i] === KEYCAP) i++;
      else continue;
    } else if (PICTOGRAPHIC.test(char)) {
      // Pictographic, plus modifiers/selectors/tags, joined by ZWJ into one sequence.
      for (;;) {
        while (
          i < chars.length &&
          (chars[i] === VARIATION_SELECTOR ||
            isModifier(chars[i]) ||
            isTag(chars[i]))
        ) {
          i++;
        }
        if (
          chars[i] === ZWJ &&
          i + 1 < chars.length &&
          PICTOGRAPHIC.test(chars[i + 1])
        ) {
          i += 2;
        } else {
          break;
        }
      }
    } else {
      continue;
    }

    found.push(chars.slice(start, i).join(""));
  }

  return found;
}
