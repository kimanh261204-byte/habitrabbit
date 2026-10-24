/**
 * AI Provider Adapter
 * Configured via environment variables:
 *   AI_PROVIDER = openai | anthropic | openrouter
 *   AI_MODEL    = gpt-4o-mini | claude-3-haiku | etc.
 *   AI_API_KEY  = your key
 *   AI_BASE_URL = optional custom endpoint
 */
import OpenAI from "openai";
import { AIEnrichmentRequest, AIEnrichmentResult, AIGradingResult } from "@/types";

function getClient(): OpenAI {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL;

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured. Please set it in .env.local");
  }

  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

function getModel(): string {
  return process.env.AI_MODEL ?? "gpt-4o-mini";
}

export function isAIConfigured(): boolean {
  return !!process.env.AI_API_KEY;
}

export async function enrichVocabulary(
  req: AIEnrichmentRequest
): Promise<AIEnrichmentResult> {
  const client = getClient();
  const model = getModel();

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

Be accurate. For IPA, use standard British or American phonetic notation.
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

export async function gradeWrittenSentence(
  word: string,
  meaning_vi: string,
  userSentence: string
): Promise<AIGradingResult> {
  const client = getClient();
  const model = getModel();

  const prompt = `You are an English language teacher grading a student's sentence.

Target word: "${word}"
Vietnamese meaning: "${meaning_vi}"
Student's sentence: "${userSentence}"

Evaluate the sentence and return a JSON object with these exact keys:
- original_sentence: the student's exact sentence
- corrected_sentence: corrected version (same if correct)
- grammar_feedback: specific grammar feedback in Vietnamese (brief, clear)
- vocabulary_usage_feedback: feedback on word usage in Vietnamese
- naturalness_feedback: feedback on naturalness in Vietnamese
- vietnamese_explanation: overall explanation in Vietnamese for the student
- target_word_used_correctly: boolean - was "${word}" used correctly?
- suggested_next_step: actionable advice in Vietnamese
- score: integer 0-100 (grammar + word usage + naturalness combined)

Be honest and educational. Do not say a sentence is correct if it has errors.
Return only valid JSON, no markdown.`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    response_format: { type: "json_object" },
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content) as AIGradingResult;
}

export async function checkVietnameseMeaning(
  word: string,
  expectedMeaning: string,
  userAnswer: string
): Promise<{ is_correct: boolean; explanation: string }> {
  const client = getClient();
  const model = getModel();

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
    max_tokens: 100,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content);
}
