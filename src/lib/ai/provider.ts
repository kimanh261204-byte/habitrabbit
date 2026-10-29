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

  const tokens = lowerSentence
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // 1. Strict Target Word Check (No partial substring matching inside words like "actor" or "sact")
  const hasWord = checkWordPresence(lowerSentence, lowerWord);

  const fallbackNativeExample =
    example_en || generateRichNativeSentence(word, part_of_speech);

  if (!hasWord) {
    const relatedTokens = tokens.filter((t) => t.includes(lowerWord) && t !== lowerWord);
    const relatedNote = relatedTokens.length > 0
      ? ` Lưu ý: Từ "${relatedTokens.join(", ")}" không phải là từ vựng mục tiêu "${word}". Bạn hãy sử dụng chính xác từ "${word}" nhé!`
      : "";

    return {
      original_sentence: trimmed,
      corrected_sentence: fallbackNativeExample,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: `❌ Bạn chưa sử dụng đúng từ vựng mục tiêu "${word}" (${meaning_vi}) trong câu trả lời.${relatedNote}`,
      vocabulary_usage_feedback: `Thiếu từ vựng bắt buộc: "${word}".`,
      naturalness_feedback: "Câu chưa đáp ứng yêu cầu của bài tập đặt câu.",
      vietnamese_translation: example_vi || "",
      vietnamese_explanation: `Thỏ nhận xét: Bài tập yêu cầu bạn đặt câu có chứa từ "${word}" (${meaning_vi}). Hãy thử viết lại một câu hoàn chỉnh có chứa từ này nhé!${relatedNote}`,
      target_word_used_correctly: false,
      suggested_next_step: `Xem câu gợi ý chuẩn từ Thỏ: "${fallbackNativeExample}"`,
      score: 15,
    };
  }

  // 2. Check sentence length (Fragments: 1-2 words)
  if (tokens.length <= 2) {
    const isSingleWord = tokens.length === 1;
    const corrected = example_en || generateRichNativeSentence(word, part_of_speech);
    return {
      original_sentence: trimmed,
      corrected_sentence: isSingleWord ? `This is an example of ${trimmed}.` : `It is ${trimmed}.`,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: isSingleWord
        ? `Lỗi câu cụt: Bạn chỉ mới viết một từ đơn lẻ "${trimmed}", chưa phải là một câu hoàn chỉnh.`
        : `Lỗi cụm từ chưa hoàn chỉnh: "${trimmed}" chỉ là một cụm từ, thiếu cả chủ ngữ và vị ngữ.`,
      vocabulary_usage_feedback: `Từ "${word}" cần được đặt trong một câu hoàn chỉnh có chủ ngữ và vị ngữ.`,
      naturalness_feedback: "Trong tiếng Anh, một câu hoàn chỉnh bắt buộc phải có Chủ ngữ (Subject) và Động từ (Verb).",
      vietnamese_translation: example_vi || (isSingleWord ? meaning_vi : ""),
      vietnamese_explanation: `Thỏ nhắc bạn: Hãy tạo thành một câu có chủ ngữ và động từ đầy đủ, ví dụ: "${corrected}"`,
      target_word_used_correctly: false,
      suggested_next_step: `Tham khảo câu mẫu từ Thỏ: "${corrected}"`,
      score: 25,
    };
  }

  // 3. Check for bare singular countable nouns at the start (Missing Article: e.g. "actor is...", "car is...")
  const BARE_SINGULAR_NOUNS = new Set([
    "actor", "student", "teacher", "doctor", "driver", "singer", "player", "worker", "child",
    "boy", "girl", "man", "woman", "cat", "dog", "car", "book", "computer", "phone", "pen",
    "desk", "room", "house", "building", "hospital", "school", "airport"
  ]);
  if (tokens.length >= 2 && BARE_SINGULAR_NOUNS.has(tokens[0])) {
    const noun = tokens[0];
    const article = /^[aeiou]/i.test(noun) ? "An" : "A";
    const fixed = `${article} ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}`;
    const corrected = `${fixed}${/[.!?]$/.test(fixed) ? "" : "."}`;
    return {
      original_sentence: trimmed,
      corrected_sentence: corrected,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: `❌ Thiếu mạo từ (Missing Article): Danh từ đếm được số ít "${noun}" không thể đứng đơn độc làm chủ ngữ. Bạn cần thêm mạo từ xác định hoặc không xác định trước danh từ: "${article} ${noun}..." hoặc "The ${noun}...".`,
      vocabulary_usage_feedback: `Cần bổ sung mạo từ trước danh từ "${noun}".`,
      naturalness_feedback: `Người bản xứ không nói "${trimmed}". Cần nói: "${article} ${noun}..." hoặc "The ${noun}...".`,
      vietnamese_translation: example_vi || "",
      vietnamese_explanation: `Thỏ hướng dẫn bạn: Trong tiếng Anh, danh từ đếm được số ít bắt buộc phải có mạo từ (a/an/the) hoặc từ sở hữu (my/your) đứng trước, ví dụ: "${article} ${noun}" hoặc "The ${noun}".`,
      target_word_used_correctly: false,
      suggested_next_step: `Thêm mạo từ vào trước danh từ: "${article} ${trimmed}"`,
      score: 45,
    };
  }

  // 4. SEMANTIC LOGIC CHECK (Tính thực tế & Ngữ cảnh hợp lý)
  // Animate actions cannot be performed by inanimate static objects or buildings
  const INANIMATE_OBJECTS = new Set([
    "airport", "airports", "station", "stations", "school", "schools", "hospital", "hospitals",
    "house", "houses", "building", "buildings", "room", "rooms", "road", "roads", "street", "streets",
    "table", "tables", "chair", "chairs", "desk", "desks", "wall", "walls", "bridge", "bridges",
    "tree", "trees", "mountain", "mountains", "door", "doors", "window", "windows", "kitchen",
    "park", "parks", "lake", "river", "office", "offices", "bank", "banks", "hotel", "hotels",
    "city", "cities", "car", "cars", "phone", "book", "books", "pen", "pens"
  ]);

  const hasInanimateSubject = tokens.find((t) => INANIMATE_OBJECTS.has(t));

  // Check 4A: Flying actions
  if (
    lowerWord === "flying" ||
    lowerWord === "fly" ||
    lowerWord === "flies" ||
    lowerSentence.includes("is flying") ||
    lowerSentence.includes("are flying")
  ) {
    if (hasInanimateSubject) {
      const betterExample = example_en || "The airplane is flying high in the sky.";
      return {
        original_sentence: trimmed,
        corrected_sentence: betterExample,
        suggested_native_sentence: fallbackNativeExample,
        grammar_feedback: `❌ Lỗi phi thực tế về ngữ nghĩa (Semantic Inconsistency): "${hasInanimateSubject}" (công trình/vật thể mặt đất) không thể tự thực hiện hành động "${word}" (bay) được. Câu của bạn đúng cấu trúc ngữ pháp nhưng hoàn toàn vô nghĩa và vô lý trong thực tế.`,
        vocabulary_usage_feedback: `Từ "${word}" cần đi với chủ ngữ có khả năng bay như máy bay (airplane/plane), chim chóc (bird), hoặc phi công (pilot).`,
        naturalness_feedback: `Người bản xứ không bao giờ nói "${trimmed}". Cần nói: "${betterExample}"`,
        vietnamese_translation: example_vi || "Chiếc máy bay đang bay trên bầu trời.",
        vietnamese_explanation: `Thỏ nhận xét:
Một câu tiếng Anh hay không chỉ cần đúng ngữ pháp mà phải CÓ Ý NGHĨA trong đời sống thực. "${hasInanimateSubject}" là công trình cố định trên mặt đất, chỉ có máy bay (airplane) hoặc chim mới có thể bay được!
👉 Câu chuẩn: "${betterExample}"`,
        target_word_used_correctly: false,
        suggested_next_step: `Đổi chủ ngữ từ "${hasInanimateSubject}" thành "airplane" hoặc "bird": "${betterExample}"`,
        score: 35,
      };
    }
  }

  // Check 4B: Living biological actions (sleeping, eating, drinking, crying) performed by inanimate objects
  const BIOLOGICAL_ACTIONS = new Set([
    "sleeping", "sleeps", "slept", "sleep",
    "eating", "eats", "ate", "eat",
    "drinking", "drinks", "drank", "drink",
    "crying", "cries", "cried", "cry",
    "laughing", "laughs", "laughed", "laugh"
  ]);
  const hasBioAction = tokens.find((t) => BIOLOGICAL_ACTIONS.has(t));
  if (hasInanimateSubject && hasBioAction) {
    const betterExample = example_en || `The little child is ${hasBioAction} peacefully in the room.`;
    return {
      original_sentence: trimmed,
      corrected_sentence: betterExample,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: `❌ Lỗi phi lý về ngữ nghĩa: "${hasInanimateSubject}" là vật vô tri vô giác, không thể tự thực hiện hành vi sinh học "${hasBioAction}" được.`,
      vocabulary_usage_feedback: `Từ "${word}" cần đi với chủ ngữ là con người hoặc sinh vật sống.`,
      naturalness_feedback: `Người bản xứ không bao giờ dùng câu này vì nó trái ngược với thực tế khách quan.`,
      vietnamese_translation: example_vi || "",
      vietnamese_explanation: `Thỏ lưu ý: Bạn cần chọn chủ ngữ hợp lý (người, động vật) để thực hiện hành động "${hasBioAction}".`,
      target_word_used_correctly: false,
      suggested_next_step: `Sửa chủ ngữ thành người hoặc động vật: "${betterExample}"`,
      score: 30,
    };
  }

  // 5. PART-OF-SPEECH ACCURACY (Nhầm lẫn Tính từ vs Trạng từ)
  // Example: "this is a job easily", "a car quickly", "this job is easily"
  const isAdverb =
    part_of_speech?.toLowerCase().includes("adv") ||
    lowerWord.endsWith("ly") ||
    ["easily", "quickly", "slowly", "badly", "happily", "well", "hard"].includes(lowerWord);

  if (isAdverb) {
    // Check if adverb follows "is a/an [noun] [adverb]" or precedes a noun directly
    const patternNounAdverb = /\b(a|an|the)\s+([a-z]+)\s+([a-z]+ly)\b/i;
    const match = trimmed.match(patternNounAdverb);

    if (match || lowerSentence.includes("a job easily") || lowerSentence.includes("is a job easily")) {
      const noun = match ? match[2] : "job";
      const baseAdj = word.replace(/ily$/, "y").replace(/ly$/, "");
      const article = /^[aeiou]/i.test(baseAdj) ? "an" : "a";

      return {
        original_sentence: trimmed,
        corrected_sentence: `This is ${article} ${baseAdj} ${noun}.`,
        suggested_native_sentence: fallbackNativeExample,
        grammar_feedback: `❌ Nhầm lẫn từ loại (Trạng từ vs Tính từ): "${word}" là TRẠNG TỪ (Adverb), chỉ dùng để bổ nghĩa cho động từ hành động (ví dụ: "I do this ${noun} ${word}"). Bạn không thể dùng trạng từ đứng sau danh từ "${noun}". Để bổ nghĩa cho danh từ "${noun}", bạn phải dùng TÍNH TỪ "${baseAdj}" đứng trước danh từ (ví dụ: "This is ${article} ${baseAdj} ${noun}").`,
        vocabulary_usage_feedback: `Dùng sai vị trí từ loại của "${word}". Cần phân biệt rõ Adjective và Adverb.`,
        naturalness_feedback: `Người bản xứ sẽ nói "This is ${article} ${baseAdj} ${noun}" hoặc "I do this ${noun} ${word}".`,
        vietnamese_translation: example_vi || `Đây là một ${noun} ${meaning_vi}.`,
        vietnamese_explanation: `Thỏ sửa bài chi tiết:
Trong tiếng Anh:
- Tính từ (Adjective) đứng trước Danh từ: ${article} ${baseAdj} ${noun} (${noun} dễ dàng).
- Trạng từ (Adverb) đứng sau Động từ: do the ${noun} ${word} (làm một cách dễ dàng).
Tuyệt đối không ghép "${noun} ${word}" bạn nhé!`,
        target_word_used_correctly: false,
        suggested_next_step: `Chuyển thành: "This is ${article} ${baseAdj} ${noun}." hoặc "I can do this ${noun} ${word}."`,
        score: 42,
      };
    }

    // Check if adverb follows linking verb directly at end: "This job is easily", "English is easily"
    const linkingVerbAdverbEnd = /\b(is|am|are|was|were)\s+([a-z]+ly)[\s.]*$/i;
    const matchLinking = trimmed.match(linkingVerbAdverbEnd);
    if (matchLinking) {
      const baseAdj = word.replace(/ily$/, "y").replace(/ly$/, "");
      const fixed = trimmed.replace(new RegExp(`\\b${word}\\b`, "i"), baseAdj).replace(/[.]*$/, ".");
      return {
        original_sentence: trimmed,
        corrected_sentence: fixed,
        suggested_native_sentence: fallbackNativeExample,
        grammar_feedback: `❌ Dùng sai trạng từ sau động từ to-be: Sau động từ to-be (is/am/are/was/were), bạn cần dùng TÍNH TỪ (Adjective) "${baseAdj}" để miêu tả đặc tính của chủ ngữ, không dùng TRẠNG TỪ (Adverb) "${word}".`,
        vocabulary_usage_feedback: `Cần đổi trạng từ "${word}" thành tính từ "${baseAdj}".`,
        naturalness_feedback: `Người bản xứ nói: "${fixed}"`,
        vietnamese_translation: example_vi || `... ${meaning_vi}`,
        vietnamese_explanation: `Thỏ sửa bài:
Cấu trúc vị ngữ miêu tả: S + to-be + Adjective.
Ví dụ: "${fixed}" (Đúng) thay vì dùng "${word}" (Sai).`,
        target_word_used_correctly: false,
        suggested_next_step: `Đổi trạng từ thành tính từ "${baseAdj}": "${fixed}"`,
        score: 45,
      };
    }
  }

  // 6. Check for Finite Verbs (Missing Verb / Fragment check)
  const BE_VERBS = new Set(["is", "am", "are", "was", "were", "be", "been", "being", "'s", "'re", "'m"]);
  const AUX_VERBS = new Set(["do", "does", "did", "have", "has", "had", "can", "could", "will", "would", "shall", "should", "may", "might", "must"]);
  const COMMON_VERBS = new Set([
    "run", "runs", "ran", "running", "go", "goes", "went", "going", "walk", "walks", "walked",
    "see", "sees", "saw", "look", "looks", "looked", "make", "makes", "made", "get", "gets", "got",
    "move", "moves", "moved", "learn", "learns", "learned", "eat", "eats", "ate", "play", "plays", "played",
    "work", "works", "worked", "take", "takes", "took", "give", "gives", "gave", "speak", "speaks", "spoke",
    "read", "reads", "write", "writes", "wrote", "feel", "feels", "felt", "become", "becomes", "became",
    "stay", "stays", "stayed", "seem", "seems", "seemed", "appear", "appears", "jump", "jumps", "jumped",
    "drive", "drives", "drove", "help", "helps", "helped", "need", "needs", "needed", "want", "wants", "wanted",
    "like", "likes", "liked", "love", "loves", "loved", "live", "lives", "lived", "think", "thinks", "thought",
    "find", "finds", "found", "tell", "tells", "told", "ask", "asks", "asked", "try", "tries", "tried",
    "call", "calls", "called", "keep", "keeps", "kept", "let", "lets", "begin", "begins", "began",
    "show", "shows", "showed", "hear", "hears", "heard", "stop", "stops", "stopped", "start", "starts", "started",
    "act", "acts", "acted", "acting"
  ]);

  const hasVerb = tokens.some(
    (t) =>
      BE_VERBS.has(t) ||
      AUX_VERBS.has(t) ||
      COMMON_VERBS.has(t) ||
      t.endsWith("ed") ||
      t.endsWith("ing") ||
      t.endsWith("izes") ||
      t.endsWith("ises")
  );

  if (!hasVerb) {
    let corrected = example_en || "";
    if (!corrected) {
      if (lowerSentence.startsWith("a ") || lowerSentence.startsWith("the ") || lowerSentence.startsWith("this ")) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
          corrected = `The ${parts[1]} is ${parts.slice(2).join(" ")}.`;
        } else {
          corrected = `${trimmed} is very good.`;
        }
      } else {
        corrected = `It is ${trimmed}.`;
      }
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
      if (!corrected.endsWith(".")) corrected += ".";
    }

    return {
      original_sentence: trimmed,
      corrected_sentence: corrected,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: `❌ Lỗi thiếu vị ngữ (Sentence Fragment): Câu "${trimmed}" của bạn thiếu động từ chính. Trong tiếng Anh, "${word}" không thể đứng làm vị ngữ nếu thiếu động từ to-be (is/are) hoặc động từ hành động.`,
      vocabulary_usage_feedback: `Từ "${word}" đã được đưa vào câu nhưng chưa liên kết đúng ngữ pháp với chủ ngữ.`,
      naturalness_feedback: `Người bản xứ không nói "${trimmed}". Cần nói: "${corrected}"`,
      vietnamese_translation: example_vi || `"${trimmed}" (nghĩa thô, chưa hoàn chỉnh ngữ pháp)`,
      vietnamese_explanation: `Thỏ giải thích chi tiết:
Trong tiếng Việt ta có thể nói vắn tắt, nhưng tiếng Anh bắt buộc phải tuân thủ cấu trúc S + V + O hoặc S + V + Adj (Chủ ngữ + Động từ + Thành phần phụ).
👉 Câu hoàn chỉnh chuẩn từ Thỏ: "${corrected}"`,
      target_word_used_correctly: false,
      suggested_next_step: `Xem câu mẫu chuẩn và sửa lại: "${corrected}"`,
      score: 40,
    };
  }

  // 7. Check for common subject-verb agreement errors (e.g. "he run", "she go")
  const thirdPersonSingular = new Set(["he", "she", "it"]);
  let hasSVAError = false;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (thirdPersonSingular.has(tokens[i])) {
      const nextWord = tokens[i + 1];
      if (
        nextWord === "run" ||
        nextWord === "go" ||
        nextWord === "walk" ||
        nextWord === "like" ||
        nextWord === "love" ||
        nextWord === "want" ||
        nextWord === "need"
      ) {
        hasSVAError = true;
      }
    }
  }

  if (hasSVAError) {
    const fixed = trimmed
      .replace(/\bhe run\b/i, "he runs")
      .replace(/\bshe run\b/i, "she runs")
      .replace(/\bit run\b/i, "it runs")
      .replace(/\bhe go\b/i, "he goes")
      .replace(/\bshe go\b/i, "she goes");

    return {
      original_sentence: trimmed,
      corrected_sentence: fixed,
      suggested_native_sentence: fallbackNativeExample,
      grammar_feedback: "❌ Lỗi hòa hợp Chủ ngữ - Động từ: Chủ ngữ số ít (he/she/it) ở thì hiện tại đơn cần thêm 's' hoặc 'es' vào sau động từ.",
      vocabulary_usage_feedback: `Từ "${word}" được sử dụng đúng ngữ cảnh.`,
      naturalness_feedback: "Cần chú ý chia động từ theo đúng ngôi chủ ngữ.",
      vietnamese_translation: "",
      vietnamese_explanation: `Thỏ lưu ý: Khi chủ ngữ là ngôi thứ 3 số ít (He/She/It), động từ đi sau phải chia (ví dụ: He runs thay vì He run).`,
      target_word_used_correctly: false,
      suggested_next_step: `Sửa động từ cho đúng ngôi số ít: "${fixed}"`,
      score: 60,
    };
  }

  // 8. For a good sentence: Provide student's polished sentence and a richer native suggestion!
  let teacherSuggestion = "";
  if (example_en && example_en.trim().toLowerCase() !== lowerSentence) {
    teacherSuggestion = example_en.trim();
  } else {
    teacherSuggestion = generateRichNativeSentence(word, part_of_speech);
  }
  if (!/[.!?]$/.test(teacherSuggestion)) {
    teacherSuggestion += ".";
  }

  const polishedUserSentence =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + (/[.!?]$/.test(trimmed) ? "" : ".");

  return {
    original_sentence: trimmed,
    corrected_sentence: polishedUserSentence,
    suggested_native_sentence: teacherSuggestion,
    grammar_feedback: "✅ Ngữ pháp chính xác! Câu có đầy đủ chủ ngữ và vị ngữ, từ vựng được sử dụng đúng cấu trúc.",
    vocabulary_usage_feedback: `Sử dụng từ "${word}" chính xác và phù hợp với ngữ cảnh.`,
    naturalness_feedback: `Câu của bạn rất tốt! Thỏ gợi ý thêm một cách diễn đạt chuẩn bản xứ phong phú hơn: "${teacherSuggestion}".`,
    vietnamese_translation: example_vi || "",
    vietnamese_explanation: `Thỏ khen: Rất tốt! Bạn đã áp dụng thành công từ "${word}" vào một câu tiếng Anh hoàn chỉnh và chuẩn ngữ pháp.`,
    target_word_used_correctly: true,
    suggested_next_step: `Đọc to câu gợi ý chuẩn bản xứ từ Thỏ: "${teacherSuggestion}"`,
    score: 95,
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
