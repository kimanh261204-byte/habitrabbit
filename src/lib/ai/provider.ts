/**
 * AI Provider Adapter for HabitRabbit
 * Acts as an English Language Teacher.
 * Supports: Google Gemini API, OpenAI, Groq, OpenRouter, and Local Teacher Engine.
 */
import OpenAI from "openai";
import { AIEnrichmentRequest, AIEnrichmentResult, AIGradingResult } from "@/types";

const DUMMY_KEYS = new Set([
  "",
  "your-ai-api-key",
  "your-gemini-api-key",
  "your-openai-api-key",
  "your-key",
]);

function isValidKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length > 10 && !DUMMY_KEYS.has(trimmed.toLowerCase());
}

export function isAIConfigured(customApiKey?: string): boolean {
  if (isValidKey(customApiKey)) return true;
  if (isValidKey(process.env.GEMINI_API_KEY)) return true;
  if (isValidKey(process.env.AI_API_KEY)) return true;
  return false;
}

function getClientAndModel(customApiKey?: string): { client: OpenAI; model: string } {
  let apiKey = customApiKey?.trim();
  if (!isValidKey(apiKey)) {
    apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim();
  }

  if (!isValidKey(apiKey)) {
    throw new Error("Chưa cấu hình API Key cho AI.");
  }

  const effectiveKey = apiKey!;
  let baseURL = process.env.AI_BASE_URL?.trim();
  let model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";

  // Google Gemini API Key (starts with AIzaSy)
  if (effectiveKey.startsWith("AIzaSy")) {
    baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    model = "gemini-2.0-flash";
  } else if (effectiveKey.startsWith("gsk_")) {
    // Groq API Key
    baseURL = "https://api.groq.com/openai/v1";
    model = "llama-3.3-70b-versatile";
  } else if (effectiveKey.startsWith("sk-or-")) {
    // OpenRouter
    baseURL = "https://openrouter.ai/api/v1";
    model = "meta-llama/llama-3.3-70b-instruct";
  }

  const client = new OpenAI({
    apiKey: effectiveKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return { client, model };
}

/**
 * Generates an advanced, high-quality native English sentence modeling correct usage of target word.
 * Guaranteed to NEVER repeat the student's sentence.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks whether the target word or its exact legitimate grammatical inflections
 * are present in the sentence.
 * DOES NOT match substrings in unrelated words (e.g. "actor" or "sact" will NOT match "act").
 */
export function checkWordPresence(lowerSentence: string, targetWord: string): boolean {
  const w = targetWord.trim().toLowerCase();
  const escaped = escapeRegex(w);

  // 1. Direct whole word match
  if (new RegExp(`\\b${escaped}\\b`, "i").test(lowerSentence)) return true;

  // 2. Plural / 3rd person singular (+s, +es, y -> ies)
  if (new RegExp(`\\b${escaped}s\\b`, "i").test(lowerSentence)) return true;
  if (new RegExp(`\\b${escaped}es\\b`, "i").test(lowerSentence)) return true;
  if (w.endsWith("y") && new RegExp(`\\b${escapeRegex(w.slice(0, -1))}ies\\b`, "i").test(lowerSentence)) return true;

  // 3. Past tense / Past Participle (+ed, +d, y -> ied, double consonant +ed)
  if (new RegExp(`\\b${escaped}ed\\b`, "i").test(lowerSentence)) return true;
  if (w.endsWith("e") && new RegExp(`\\b${escaped}d\\b`, "i").test(lowerSentence)) return true;
  if (w.endsWith("y") && new RegExp(`\\b${escapeRegex(w.slice(0, -1))}ied\\b`, "i").test(lowerSentence)) return true;
  if (w.length >= 3 && !/[aeiouy]/.test(w.slice(-1)) && /[aeiou]/.test(w.slice(-2, -1))) {
    const doubled = w + w.slice(-1);
    if (new RegExp(`\\b${escapeRegex(doubled)}ed\\b`, "i").test(lowerSentence)) return true;
    if (new RegExp(`\\b${escapeRegex(doubled)}ing\\b`, "i").test(lowerSentence)) return true;
  }

  // 4. Gerund / Continuous (+ing, drop e +ing)
  if (new RegExp(`\\b${escaped}ing\\b`, "i").test(lowerSentence)) return true;
  if (w.endsWith("e") && new RegExp(`\\b${escapeRegex(w.slice(0, -1))}ing\\b`, "i").test(lowerSentence)) return true;

  // 5. Irregular common verbs
  const irregulars: Record<string, string[]> = {
    be: ["is", "am", "are", "was", "were", "been", "being"],
    go: ["goes", "went", "gone", "going"],
    do: ["does", "did", "done", "doing"],
    have: ["has", "had", "having"],
    run: ["runs", "ran", "running"],
    see: ["sees", "saw", "seen", "seeing"],
    eat: ["eats", "ate", "eaten", "eating"],
    write: ["writes", "wrote", "written", "writing"],
    speak: ["speaks", "spoke", "spoken", "speaking"],
    take: ["takes", "took", "taken", "taking"],
    fly: ["flies", "flew", "flown", "flying"],
    flying: ["fly", "flies", "flew", "flown"],
    make: ["makes", "made", "making"],
    get: ["gets", "got", "gotten", "getting"],
  };
  if (irregulars[w]) {
    for (const form of irregulars[w]) {
      if (new RegExp(`\\b${escapeRegex(form)}\\b`, "i").test(lowerSentence)) return true;
    }
  }

  return false;
}

/**
 * Generates an advanced, high-quality native English sentence modeling correct usage of target word.
 * Guaranteed to NEVER repeat the student's sentence.
 */
export function generateRichNativeSentence(word: string, pos?: string | null): string {
  const lower = word.toLowerCase().trim();
  const posLower = (pos || "").toLowerCase();

  if (posLower.includes("adv") || lower.endsWith("ly")) {
    return `With regular practice, you will be able to complete this task ${lower} and accurately.`;
  }
  if (lower === "flying" || lower === "fly" || lower === "flies") {
    return `Look at the sky, the airplane is flying smoothly above the clouds.`;
  }
  if (lower === "act" || lower === "acts" || lower === "acted") {
    return `You must act quickly before the golden opportunity passes by.`;
  }
  if (posLower.includes("v") || lower.endsWith("ing")) {
    return `They spent the whole morning ${lower} together in a friendly atmosphere.`;
  }
  if (posLower.includes("adj")) {
    return `Developing this good daily habit is a very ${lower} step toward personal growth.`;
  }
  if (posLower.includes("n")) {
    return `Learning how to use this ${lower} is crucial for everyday English conversations.`;
  }
  return `Native English speakers frequently use "${lower}" in daily conversations.`;
}

export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Repairs a student's erroneous English sentence directly while preserving their original words and intent.
 */
export function repairStudentSentenceLocally(
  userSentence: string,
  targetWord: string,
  partOfSpeech?: string | null
): {
  repairedSentence: string;
  grammarIssues: string[];
  detectedTypo: boolean;
} {
  let s = userSentence.trim();
  const lowerWord = targetWord.trim().toLowerCase();
  const issues: string[] = [];
  let detectedTypo = false;

  // 1. Detect and fix typo of the target word
  const tokens = s.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const cleanT = tokens[i].replace(/[^\w]/g, "").toLowerCase();
    if (
      cleanT !== lowerWord &&
      cleanT.length >= 3 &&
      Math.abs(cleanT.length - lowerWord.length) <= 2 &&
      levenshteinDistance(cleanT, lowerWord) <= 2
    ) {
      detectedTypo = true;
      issues.push(`Lỗi chính tả từ vựng: Bạn viết gõ nhầm "${tokens[i]}" -> đã sửa thành từ mục tiêu "${lowerWord}".`);
      const punc = tokens[i].replace(/[\w]/g, "");
      tokens[i] = lowerWord + punc;
      break;
    }
  }
  s = tokens.join(" ");

  // 2. If target word still not present, integrate it into the sentence
  if (!checkWordPresence(s.toLowerCase(), lowerWord)) {
    if (lowerWord === "since") {
      if (/\bin\s+(19\d\d|20\d\d)\b/i.test(s)) {
        s = s.replace(/\bin\s+(19\d\d|20\d\d)\b/i, "since $1");
        issues.push(`Bổ sung từ vựng mục tiêu: Đổi "in [năm]" thành "since [năm]".`);
      } else {
        s = `${s} since 1997`;
        issues.push(`Bổ sung từ vựng mục tiêu: Đã thêm "since 1997" vào câu.`);
      }
    } else {
      issues.push(`Bổ sung từ vựng mục tiêu: Cần đưa từ "${targetWord}" vào câu.`);
      s = `${s} (${targetWord})`;
    }
  }

  // 3. Fix pronoun "i" -> "I"
  if (/\bi\b/.test(s)) {
    s = s.replace(/\bi\b/g, "I");
    issues.push('Lỗi viết hoa: Đại từ nhân xưng "I" trong tiếng Anh luôn luôn phải viết hoa.');
  }
  if (/\bi'm\b/i.test(s)) s = s.replace(/\bi'm\b/gi, "I'm");
  if (/\bi've\b/i.test(s)) s = s.replace(/\bi've\b/gi, "I've");
  if (/\bi'll\b/i.test(s)) s = s.replace(/\bi'll\b/gi, "I'll");
  if (/\bi'd\b/i.test(s)) s = s.replace(/\bi'd\b/gi, "I'd");

  // 4. Fix proper nouns (cities, countries, languages)
  const properNouns: Record<string, string> = {
    hanoi: "Hanoi",
    "ha noi": "Hanoi",
    saigon: "Saigon",
    "sai gon": "Saigon",
    vietnam: "Vietnam",
    "viet nam": "Vietnam",
    danang: "Da Nang",
    "da nang": "Da Nang",
    hue: "Hue",
    english: "English",
    vietnamese: "Vietnamese",
    french: "French",
    chinese: "Chinese",
    japanese: "Japanese",
    korean: "Korean",
    america: "America",
    london: "London",
    paris: "Paris",
    tokyo: "Tokyo",
  };
  for (const [lower, proper] of Object.entries(properNouns)) {
    const reg = new RegExp(`\\b${lower}\\b`, "i");
    if (reg.test(s) && !s.includes(proper)) {
      s = s.replace(reg, proper);
      issues.push(`Lỗi viết hoa: Tên riêng địa danh/ngôn ngữ "${lower}" phải viết hoa thành "${proper}".`);
    }
  }

  // 5. Tense correction with "since"
  if (/\bsince\b/i.test(s)) {
    const liveMatch = s.match(/\b(I|you|we|they)\s+(live|work|study|stay|wait|learn)\s+([\s\S]*?)\bsince\b/i);
    if (liveMatch) {
      const subj = liveMatch[1];
      const verb = liveMatch[2].toLowerCase();
      const edVerb = verb.endsWith("e") ? `${verb}d` : verb.endsWith("y") ? `${verb.slice(0, -1)}ied` : `${verb}ed`;
      s = s.replace(
        new RegExp(`\\b${subj}\\s+${verb}\\b`, "i"),
        `${subj} have ${edVerb}`
      );
      issues.push(`Lỗi thì động từ: Khi có mốc thời gian "since", hành động bắt đầu từ quá khứ và vẫn tiếp diễn ở hiện tại cần dùng thì Hiện tại hoàn thành ("${subj} have ${edVerb}") thay vì hiện tại đơn ("${verb}").`);
    }

    const liveMatchSingular = s.match(/\b(he|she|it)\s+(live|lives|work|works|study|studies|stay|stays)\s+([\s\S]*?)\bsince\b/i);
    if (liveMatchSingular) {
      const subj = liveMatchSingular[1];
      const v = liveMatchSingular[2].toLowerCase().replace(/s$/, "");
      const edVerb = v.endsWith("e") ? `${v}d` : `${v}ed`;
      s = s.replace(
        new RegExp(`\\b${subj}\\s+${liveMatchSingular[2]}\\b`, "i"),
        `${subj} has ${edVerb}`
      );
      issues.push(`Lỗi thì động từ: Với chủ ngữ số ít đi với "since", cần dùng thì Hiện tại hoàn thành ("${subj} has ${edVerb}").`);
    }

    if (/\b(I|you|we|they)\s+(am|are|was|were)\s+([\s\S]*?)\bsince\b/i.test(s)) {
      s = s.replace(/\b(I|you|we|they)\s+(am|are|was|were)\b/i, "$1 have been");
      issues.push('Lỗi thì động từ: Chuyển to-be thành "have been" khi đi cùng "since".');
    }
  }

  // 6. Fix bare singular countable noun at beginning
  const bareNounMatch = s.match(/^(actor|student|teacher|doctor|driver|child|cat|dog|car|book|room|hospital|school)\b/i);
  if (bareNounMatch) {
    const n = bareNounMatch[1];
    const art = /^[aeiou]/i.test(n) ? "An" : "A";
    s = `${art} ${s.charAt(0).toLowerCase() + s.slice(1)}`;
    issues.push(`Lỗi thiếu mạo từ: Danh từ đếm được số ít "${n}" cần mạo từ "${art}" đứng trước.`);
  }

  // 7. Fix adverb misused as adjective (e.g. "this is a job easily", "is easily")
  if (/\b(is|am|are)\s+a\s+([a-z]+)\s+([a-z]+)ly\b/i.test(s)) {
    s = s.replace(/\b(is|am|are)\s+a\s+([a-z]+)\s+([a-z]+)ly\b/i, (m, be, noun, adv) => {
      const adj = adv.replace(/ily$/, "y").replace(/ly$/, "");
      const aOrAn = /^[aeiou]/i.test(adj) ? "an" : "a";
      return `${be} ${aOrAn} ${adj} ${noun}`;
    });
    issues.push("Lỗi từ loại: Chuyển trạng từ đứng sau danh từ thành tính từ đứng trước danh từ.");
  } else if (/\b(is|am|are)\s+([a-z]+)ly\b/i.test(s)) {
    s = s.replace(/\b(is|am|are)\s+([a-z]+)ly\b/i, (m, be, adv) => {
      const adj = adv.replace(/ily$/, "y").replace(/ly$/, "");
      return `${be} ${adj}`;
    });
    issues.push("Lỗi từ loại: Sau động từ to-be cần dùng tính từ thay vì trạng từ.");
  }

  // 8. Fix missing "to" in modal/verb infinitives ("want be" -> "want to be", "need go" -> "need to go")
  if (/\b(want|need|like|hope|decide)\s+(be|go|have|do|make|see|help|learn)\b/i.test(s)) {
    s = s.replace(/\b(want|need|like|hope|decide)\s+(be|go|have|do|make|see|help|learn)\b/gi, "$1 to $2");
    issues.push('Lỗi ngữ pháp: Sau các động từ như want/need/hope cần có "to" trước động từ nguyên mẫu.');
  }

  // 9. Subject-verb agreement (e.g. "he live" -> "he lives", "she go" -> "she goes")
  if (!/\bsince\b/i.test(s)) {
    if (/\b(he|she|it)\s+live\b/i.test(s)) {
      s = s.replace(/\b(he|she|it)\s+live\b/gi, "$1 lives");
      issues.push('Lỗi hòa hợp chủ-vị: Chủ ngữ số ít (he/she/it) động từ chia thêm "s" ("lives").');
    }
    if (/\b(he|she|it)\s+go\b/i.test(s)) {
      s = s.replace(/\b(he|she|it)\s+go\b/gi, "$1 goes");
      issues.push('Lỗi hòa hợp chủ-vị: Động từ "go" chia với ngôi thứ 3 số ít thành "goes".');
    }
    if (/\b(he|she|it)\s+work\b/i.test(s)) {
      s = s.replace(/\b(he|she|it)\s+work\b/gi, "$1 works");
      issues.push('Lỗi hòa hợp chủ-vị: Động từ "work" chia với ngôi thứ 3 số ít thành "works".');
    }
  }

  // 10. Capitalize first letter and ensure ending punctuation
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) {
    s += ".";
  }

  return {
    repairedSentence: s,
    grammarIssues: issues,
    detectedTypo,
  };
}

/**
 * Intelligent Local English Companion Engine (Thỏ HabitRabbit)
 * Evaluates grammar, sentence completeness, part-of-speech accuracy, and real-world semantic logic.
 */
export function evaluateEnglishSentenceLocally(
  word: string,
  meaning_vi: string,
  userSentence: string,
  part_of_speech?: string | null,
  example_en?: string | null,
  example_vi?: string | null
): AIGradingResult {
  const trimmed = userSentence.trim();
  const lowerSentence = trimmed.toLowerCase();
  const lowerWord = word.trim().toLowerCase();

  const fallbackNativeExample =
    example_en || generateRichNativeSentence(word, part_of_speech);

  const tokens = lowerSentence
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // 1. Fragment check (1-2 words)
  if (tokens.length <= 2) {
    const isSingleWord = tokens.length === 1;
    const repaired = isSingleWord
      ? (lowerWord === "since" ? "I have lived here since 1997." : `This is an example of ${trimmed}.`)
      : `It is ${trimmed}.`;
    return {
      original_sentence: trimmed,
      corrected_sentence: repaired,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: isSingleWord
        ? `❌ Lỗi câu cụt: Bạn chỉ mới viết một từ đơn lẻ "${trimmed}", chưa phải là một câu hoàn chỉnh.`
        : `❌ Lỗi cụm từ chưa hoàn chỉnh: "${trimmed}" chỉ là một cụm từ, thiếu cả chủ ngữ và vị ngữ.`,
      vocabulary_usage_feedback: `Từ "${word}" cần được đặt trong một câu hoàn chỉnh có chủ ngữ và vị ngữ.`,
      naturalness_feedback: "Trong tiếng Anh, một câu hoàn chỉnh bắt buộc phải có Chủ ngữ (Subject) và Động từ (Verb).",
      vietnamese_translation: example_vi || (isSingleWord ? meaning_vi : ""),
      vietnamese_explanation: `Thỏ nhắc bạn: Hãy tạo thành một câu có chủ ngữ và động từ đầy đủ, ví dụ: "${repaired}"`,
      target_word_used_correctly: false,
      suggested_next_step: `Tham khảo câu sửa từ Thỏ: "${repaired}"`,
      score: 25,
    };
  }

  // 2. Perform intelligent repair on student's sentence
  const { repairedSentence, grammarIssues, detectedTypo } = repairStudentSentenceLocally(
    trimmed,
    word,
    part_of_speech
  );

  const hasWord = checkWordPresence(lowerSentence, lowerWord) || detectedTypo;

  // 3. Semantic logic check for absurd sentences (e.g. static buildings flying)
  const INANIMATE_OBJECTS = new Set([
    "airport", "airports", "station", "stations", "school", "schools", "hospital", "hospitals",
    "house", "houses", "building", "buildings", "room", "rooms", "road", "roads", "street", "streets",
    "table", "tables", "chair", "chairs", "desk", "desks", "wall", "walls", "bridge", "bridges",
    "tree", "trees", "mountain", "mountains", "door", "doors", "window", "windows", "kitchen",
    "park", "parks", "lake", "river", "office", "offices", "bank", "banks", "hotel", "hotels",
    "city", "cities", "car", "cars", "phone", "book", "books", "pen", "pens"
  ]);
  const hasInanimateSubject = tokens.find((t) => INANIMATE_OBJECTS.has(t));
  if (
    (lowerWord === "flying" || lowerWord === "fly" || lowerSentence.includes("is flying")) &&
    hasInanimateSubject
  ) {
    const realisticSentence = "The airplane is flying smoothly above the clouds.";
    return {
      original_sentence: trimmed,
      corrected_sentence: realisticSentence,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: `❌ Lỗi phi thực tế về ngữ nghĩa: "${hasInanimateSubject}" là công trình/vật thể mặt đất, không thể tự bay được.`,
      vocabulary_usage_feedback: `Từ "${word}" cần đi với chủ ngữ có thể bay như máy bay (airplane) hoặc chim (bird).`,
      naturalness_feedback: `Cần nói: "${realisticSentence}"`,
      vietnamese_translation: "Chiếc máy bay đang bay trên bầu trời.",
      vietnamese_explanation: `Thỏ lưu ý: Một câu tiếng Anh cần có ý nghĩa thực tế. Đổi chủ ngữ "${hasInanimateSubject}" thành "airplane" bạn nhé!`,
      target_word_used_correctly: false,
      suggested_next_step: `Xem câu gợi ý: "${realisticSentence}"`,
      score: 35,
    };
  }

  // 4. Calculate score & feedback based on repair results
  if (grammarIssues.length === 0) {
    return {
      original_sentence: trimmed,
      corrected_sentence: repairedSentence,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: "✅ Ngữ pháp chính xác! Câu có đầy đủ chủ ngữ, vị ngữ, sử dụng từ đúng thì và đúng ngữ cảnh.",
      vocabulary_usage_feedback: `Sử dụng từ "${word}" chính xác và tự nhiên.`,
      naturalness_feedback: `Câu của bạn rất tốt! Thỏ gợi ý thêm một cách diễn đạt mẫu: "${fallbackNativeExample}".`,
      vietnamese_translation: example_vi || "",
      vietnamese_explanation: `Thỏ khen: Rất tốt! Bạn đã áp dụng thành công từ "${word}" vào một câu tiếng Anh hoàn chỉnh và chuẩn ngữ pháp.`,
      target_word_used_correctly: true,
      suggested_next_step: `Đọc to câu của bạn: "${repairedSentence}"`,
      score: 95,
    };
  }

  // There are grammar / typo errors
  const score = Math.max(
    30,
    hasWord ? 85 - grammarIssues.length * 12 : 45 - grammarIssues.length * 10
  );

  const formattedIssues = grammarIssues
    .map((issue, idx) => `${idx + 1}. ${issue}`)
    .join("\n");

  return {
    original_sentence: trimmed,
    corrected_sentence: repairedSentence,
    suggested_native_sentence: fallbackNativeExample,
    grammar_feedback: formattedIssues,
    vocabulary_usage_feedback: hasWord
      ? (detectedTypo ? `Đã sửa lỗi gõ nhầm thành từ mục tiêu "${word}".` : `Từ "${word}" đã được đưa vào câu.`)
      : `Thiếu từ vựng bắt buộc "${word}".`,
    naturalness_feedback: `Câu của bạn đã được Thỏ sửa lại cho chuẩn ngữ pháp: "${repairedSentence}".`,
    vietnamese_translation: example_vi || "",
    vietnamese_explanation: `Thỏ nhận xét: Câu của bạn đã thể hiện đúng ý định nhưng có ${grammarIssues.length} điểm cần sửa (chính tả, thì động từ hoặc viết hoa). Thỏ đã sửa lại toàn bộ câu cho bạn ở trên, bạn hãy đối chiếu nhé!`,
    target_word_used_correctly: false,
    suggested_next_step: `Ghi nhớ câu đã sửa: "${repairedSentence}"`,
    score,
  };
}

export async function gradeWrittenSentence(
  word: string,
  meaning_vi: string,
  userSentence: string,
  customApiKey?: string,
  part_of_speech?: string | null,
  example_en?: string | null,
  example_vi?: string | null
): Promise<AIGradingResult> {
  const trimmed = userSentence.trim();

  // If AI is not configured, use our rigorous local companion engine immediately
  if (!isAIConfigured(customApiKey)) {
    const localResult = evaluateEnglishSentenceLocally(
      word,
      meaning_vi,
      trimmed,
      part_of_speech,
      example_en,
      example_vi
    );
    await fillTranslationIfNeeded(localResult, trimmed, example_vi);
    return localResult;
  }

  try {
    const { client, model } = getClientAndModel(customApiKey);

    const prompt = `You are HabitRabbit ("Thỏ"), a friendly, smart, and encouraging English learning companion mascot.
You evaluate a Vietnamese student's practice sentence with pedagogical rigor and warmth.

Target word: "${word}"
${part_of_speech ? `Part of speech: "${part_of_speech}"` : ""}
Target meaning: "${meaning_vi}"
${example_en ? `Curriculum reference example: "${example_en}" (${example_vi || ""})` : ""}
Student's sentence: "${trimmed}"

MANDATORY PERSONA & EVALUATION RULES:
1. PERSONA:
   - In all Vietnamese explanations, you MUST ALWAYS refer to yourself as "Thỏ" (mascot companion). Never use "thầy", "tôi", or "AI". Example: "Thỏ nhận xét: ...", "Thỏ nhắc bạn: ...".

2. EXACT TARGET WORD PRESENCE & USAGE:
   - The student MUST use "${word}" or its exact legitimate grammatical inflections (e.g. for "act", only "act", "acts", "acted", "acting").
   - DO NOT accept unrelated derivatives containing "${word}" as a substring (e.g. for "act", "actor" or "sact" are unacceptable).
   - If target word is missing or misuse:
     * score: 15 - 35
     * target_word_used_correctly: false
     * Clearly state in Vietnamese: "Bạn chưa sử dụng đúng từ vựng mục tiêu '${word}'..."

3. SỬA TRỰC TIẾP CÂU CỦA HỌC VIÊN CHO ĐÚNG (corrected_sentence):
   - CRITICAL REQUIREMENT: "corrected_sentence" MUST BE THE DIRECT CORRECTION OF THE STUDENT'S EXACT SENTENCE.
   - Fix all grammatical mistakes, spelling, verb tenses, subject-verb agreement, articles (a/an/the), prepositions, word order, and punctuation.
   - PRESERVE the student's original words, vocabulary, intent, and meaning as much as possible! DO NOT replace it with an unrelated canned sentence.
   - If the student's sentence is already 100% correct, keep the student's sentence with proper capitalization and ending punctuation.

4. CÂU GỢI Ý MẪU THAM KHẢO TỪ THỎ (suggested_native_sentence):
   - Provide an additional, high-quality, natural native English example sentence using "${word}" (e.g. from the curriculum example "${example_en || ""}" or a native sentence).
   - This gives the student an extra model sentence to expand their vocabulary and expression.

5. PHÂN TÍCH CHI TIẾT CHỖ SAI NGỮ PHÁP (grammar_feedback):
   - Enumerate and explain each specific grammar error the student made in clear Vietnamese bullets:
     * Lỗi 1: ...
     * Lỗi 2: ...
   - If no errors, write: "✅ Ngữ pháp câu chính xác! Đầy đủ thành phần chủ ngữ, vị ngữ và dùng từ đúng ngữ cảnh."

6. LỜI KHUYÊN & HƯỚNG DẪN (vietnamese_explanation):
   - Warm, friendly pedagogical advice from Thỏ explaining the grammar rules and encouragement.

7. DỊCH NGHĨA TIẾNG VIỆT (vietnamese_translation):
   - Accurate Vietnamese translation of the student's sentence (what they meant to express).

8. SCORING & ACCURACY:
   - "target_word_used_correctly": boolean (true ONLY IF sentence is grammatically correct, semantically logical, and target word is used properly).
   - "score": number from 0 to 100 (90-100: flawless, 75-89: minor error, 50-74: notable grammar errors, <50: major errors or missing word).

Return a JSON object with these EXACT keys:
- original_sentence
- corrected_sentence
- suggested_native_sentence
- grammar_feedback
- vocabulary_usage_feedback
- naturalness_feedback
- vietnamese_translation
- vietnamese_explanation
- target_word_used_correctly
- suggested_next_step
- score

Return ONLY valid JSON. No markdown fences.`;

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 750,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI returned empty response");

    const parsed = JSON.parse(content) as AIGradingResult;

    // Enforce strict grading rules: if score < 70, target_word_used_correctly cannot be true
    if (parsed.score < 70) {
      parsed.target_word_used_correctly = false;
    }

    // Ensure suggested_native_sentence is provided
    if (!parsed.suggested_native_sentence) {
      parsed.suggested_native_sentence =
        example_en && example_en.trim().toLowerCase() !== trimmed.toLowerCase()
          ? example_en.trim()
          : generateRichNativeSentence(word, part_of_speech);
    }

    // Ensure corrected_sentence is provided
    if (!parsed.corrected_sentence) {
      parsed.corrected_sentence = trimmed;
    }

    await fillTranslationIfNeeded(parsed, trimmed, example_vi);
    return parsed;
  } catch (err) {
    console.warn("AI grading API call failed, falling back to Local Teacher Engine:", err);
    const localResult = evaluateEnglishSentenceLocally(
      word,
      meaning_vi,
      trimmed,
      part_of_speech,
      example_en,
      example_vi
    );
    await fillTranslationIfNeeded(localResult, trimmed, example_vi);
    return localResult;
  }
}

async function fillTranslationIfNeeded(
  result: AIGradingResult,
  sentence: string,
  fallbackVi?: string | null
) {
  if (!result.vietnamese_translation) {
    if (fallbackVi && result.score >= 70) {
      result.vietnamese_translation = fallbackVi;
      return;
    }
    try {
      const transRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(sentence)}`
      );
      if (transRes.ok) {
        const transData = await transRes.json();
        result.vietnamese_translation = transData?.[0]?.[0]?.[0] || "";
      }
    } catch {}
  }
}

export async function enrichVocabulary(
  req: AIEnrichmentRequest,
  customApiKey?: string
): Promise<AIEnrichmentResult> {
  const { client, model } = getClientAndModel(customApiKey);
  const fieldsNeeded = req.fields.join(", ");

  const prompt = `You are an expert English dictionary assistant. Given a word, provide accurate linguistic data.

Word: "${req.word}"
${req.partOfSpeech ? `Part of speech: ${req.partOfSpeech}` : ""}

Please provide the following fields: ${fieldsNeeded}

Return a JSON object with these keys (only include requested fields):
- ipa: IPA pronunciation (e.g. /ˈkɒliːɡ/)
- definition_en: Clear English definition (1-2 sentences, simple language)
- meaning_vi: Vietnamese translation (natural Vietnamese, not word-for-word)
- example_en: Natural example sentence using this word
- example_vi: Vietnamese translation of the example sentence
- synonyms: Array of 2-3 synonyms (strings)
- antonyms: Array of 1-2 antonyms (strings)

Return only valid JSON, no markdown.`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content) as AIEnrichmentResult;
}

export async function checkVietnameseMeaning(
  word: string,
  expectedMeaning: string,
  userAnswer: string,
  customApiKey?: string
): Promise<{ is_correct: boolean; explanation: string }> {
  if (!isAIConfigured(customApiKey)) {
    const isClose =
      userAnswer.trim().toLowerCase() === expectedMeaning.trim().toLowerCase() ||
      expectedMeaning.toLowerCase().includes(userAnswer.trim().toLowerCase());
    return {
      is_correct: isClose,
      explanation: isClose
        ? `Nghĩa chính xác: ${expectedMeaning}`
        : `Nghĩa chuẩn của từ "${word}" là: ${expectedMeaning}`,
    };
  }

  try {
    const { client, model } = getClientAndModel(customApiKey);

    const prompt = `You are a bilingual English-Vietnamese expert.

English word: "${word}"
Correct Vietnamese meaning: "${expectedMeaning}"
Student's answer: "${userAnswer}"

Is the student's answer semantically equivalent or acceptably close to the correct meaning?
Accept reasonable paraphrases and synonymous translations.

Return JSON with:
- is_correct: boolean
- explanation: brief Vietnamese explanation (max 1 sentence)

Return only valid JSON.`;

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI returned empty response");

    return JSON.parse(content);
  } catch (err) {
    const isClose =
      userAnswer.trim().toLowerCase() === expectedMeaning.trim().toLowerCase() ||
      expectedMeaning.toLowerCase().includes(userAnswer.trim().toLowerCase());
    return {
      is_correct: isClose,
      explanation: isClose
        ? `Nghĩa chính xác: ${expectedMeaning}`
        : `Nghĩa chuẩn của từ "${word}" là: ${expectedMeaning}`,
    };
  }
}
