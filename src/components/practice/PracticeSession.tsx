"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Check,
  X,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Volume2,
  RotateCcw,
  Undo2,
  Headphones,
  CheckCircle2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { VocabularyItem, QuestionType, AIGradingResult } from "@/types";
import { Button } from "@/components/ui/Button";
import { Textarea, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { isAnswerCorrect } from "@/lib/utils";
import { evaluateEnglishSentenceLocally } from "@/lib/ai/provider";
import { speakWord } from "@/lib/audio/tts";

interface PracticeResult {
  itemId: string;
  questionType: QuestionType;
  isCorrect: boolean;
  userAnswer: string;
  expectedAnswer: string;
  feedback: AIGradingResult | null;
}

interface PracticeEngineProps {
  items: VocabularyItem[];
  onComplete: (results: PracticeResult[]) => void;
}

export interface QuizItem {
  item: VocabularyItem;
  questionType: QuestionType;
  // Multiple Choice / Listening options
  options?: string[];
  mcMode?: "word_to_meaning" | "meaning_to_word";
  expectedAnswer: string;
  // Sentence Scramble
  rawSentence?: string;
  sentenceTokens?: string[];
  sentenceTranslation?: string;
}

interface ScrambleToken {
  id: string;
  text: string;
}

const COMMON_EN_DISTRACTORS = [
  "practice",
  "develop",
  "improve",
  "remember",
  "express",
  "discover",
  "achieve",
  "organize",
];

const COMMON_VI_DISTRACTORS = [
  "thực hành",
  "phát triển",
  "cải thiện",
  "ghi nhớ",
  "diễn đạt",
  "khám phá",
  "đạt được",
  "tổ chức",
];

function cleanToken(token: string): string {
  return token.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "").trim();
}

function buildScrambleData(item: VocabularyItem): {
  rawSentence: string;
  sentenceTokens: string[];
  sentenceTranslation: string;
} {
  let sentence = item.example_en?.trim();
  let translation = item.example_vi?.trim();

  const wordClean = cleanToken(item.word);
  if (!sentence || sentence.split(/\s+/).length < 3 || sentence.split(/\s+/).length > 12) {
    sentence = `We need to practice ${wordClean} every single day.`;
    translation = `Chúng ta cần luyện tập "${item.meaning_vi || wordClean}" mỗi ngày.`;
  }

  const rawTokens = sentence
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);

  return {
    rawSentence: sentence,
    sentenceTokens: rawTokens,
    sentenceTranslation: translation || `Sắp xếp các từ để diễn đạt từ "${item.word}".`,
  };
}

function generateOptions(
  correct: string,
  allItems: VocabularyItem[],
  isEnglish: boolean
): string[] {
  const distractorsPool = isEnglish
    ? allItems.map((i) => i.word).filter((w) => cleanToken(w) !== cleanToken(correct))
    : allItems
        .map((i) => i.meaning_vi || i.definition_en || "")
        .filter((m) => m && m.trim().toLowerCase() !== correct.trim().toLowerCase());

  const fallbackPool = isEnglish ? COMMON_EN_DISTRACTORS : COMMON_VI_DISTRACTORS;
  const uniqueDistractors = Array.from(
    new Set([...distractorsPool, ...fallbackPool].filter((d) => d && d !== correct))
  );

  const shuffledDistractors = [...uniqueDistractors].sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...shuffledDistractors].sort(() => Math.random() - 0.5);
}

function generateQuiz(items: VocabularyItem[]): QuizItem[] {
  if (!items || items.length === 0) return [];

  const quiz: QuizItem[] = [];
  // Balanced cycle of diverse exercise types
  const typeCycle: QuestionType[] = [
    "multiple_choice",
    "sentence_scramble",
    "listening_catch",
    "fill_blank",
    "sentence_writing",
    "multiple_choice",
    "sentence_scramble",
    "listening_catch",
    "vietnamese_recall",
    "english_recall",
  ];

  items.forEach((item, i) => {
    const qType = typeCycle[i % typeCycle.length];

    if (qType === "multiple_choice") {
      const mode: "word_to_meaning" | "meaning_to_word" =
        i % 2 === 0 ? "word_to_meaning" : "meaning_to_word";
      const expected =
        mode === "word_to_meaning"
          ? item.meaning_vi || item.definition_en || item.word
          : item.word;
      const opts = generateOptions(expected, items, mode === "meaning_to_word");
      quiz.push({
        item,
        questionType: "multiple_choice",
        mcMode: mode,
        expectedAnswer: expected,
        options: opts,
      });
    } else if (qType === "sentence_scramble") {
      const { rawSentence, sentenceTokens, sentenceTranslation } = buildScrambleData(item);
      quiz.push({
        item,
        questionType: "sentence_scramble",
        rawSentence,
        sentenceTokens,
        sentenceTranslation,
        expectedAnswer: sentenceTokens.join(" "),
      });
    } else if (qType === "listening_catch") {
      const opts = generateOptions(item.word, items, true);
      quiz.push({
        item,
        questionType: "listening_catch",
        options: opts,
        expectedAnswer: item.word,
      });
    } else if (qType === "fill_blank") {
      if (item.example_en && item.example_en.toLowerCase().includes(item.word.toLowerCase())) {
        quiz.push({
          item,
          questionType: "fill_blank",
          expectedAnswer: item.word,
        });
      } else {
        // Fallback to multiple choice if no example with target word
        const opts = generateOptions(item.word, items, true);
        quiz.push({
          item,
          questionType: "multiple_choice",
          mcMode: "meaning_to_word",
          expectedAnswer: item.word,
          options: opts,
        });
      }
    } else if (qType === "sentence_writing") {
      quiz.push({
        item,
        questionType: "sentence_writing",
        expectedAnswer: item.example_en || item.word,
      });
    } else if (qType === "vietnamese_recall") {
      quiz.push({
        item,
        questionType: "vietnamese_recall",
        expectedAnswer: item.meaning_vi || item.definition_en || item.word,
      });
    } else {
      quiz.push({
        item,
        questionType: "english_recall",
        expectedAnswer: item.word,
      });
    }
  });

  return quiz;
}

function highlightBlank(sentence: string, word: string): string {
  return sentence.replace(new RegExp(word, "gi"), "______");
}

export function PracticeSession({ items, onComplete }: PracticeEngineProps) {
  const [quiz] = useState<QuizItem[]>(() => generateQuiz(items));
  const [idx, setIdx] = useState(0);

  // General state
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    feedback: AIGradingResult | null;
  } | null>(null);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [grading, setGrading] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(0.9);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Sentence Scramble state
  const [availableTokens, setAvailableTokens] = useState<ScrambleToken[]>([]);
  const [placedTokens, setPlacedTokens] = useState<ScrambleToken[]>([]);

  // Multiple Choice / Listening state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const current = quiz[idx];

  // Initialize per question
  useEffect(() => {
    setAnswer("");
    setSubmitted(false);
    setResult(null);
    setSelectedOption(null);

    if (!current) return;

    if (current.questionType === "sentence_scramble" && current.sentenceTokens) {
      const tokens: ScrambleToken[] = current.sentenceTokens.map((t, i) => ({
        id: `${t}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        text: t,
      }));
      // Shuffle tokens for bank
      setAvailableTokens([...tokens].sort(() => Math.random() - 0.5));
      setPlacedTokens([]);
    } else {
      setAvailableTokens([]);
      setPlacedTokens([]);
    }

    // Auto-play audio for listening questions
    let timer: NodeJS.Timeout | null = null;
    if (current.questionType === "listening_catch") {
      timer = setTimeout(() => {
        handlePlayAudio(current.item.word, 0.9);
      }, 350);
    }

    // Auto focus
    if (current.questionType === "sentence_writing") {
      inputRef.current?.focus();
    } else if (
      current.questionType === "english_recall" ||
      current.questionType === "vietnamese_recall" ||
      current.questionType === "fill_blank" ||
      current.questionType === "listening_catch"
    ) {
      textInputRef.current?.focus();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [idx]);

  if (!current) return null;

  const handlePlayAudio = (text: string, rate: number = 0.9) => {
    setIsPlayingAudio(true);
    speakWord(text, "us", rate).finally(() => setIsPlayingAudio(false));
  };

  // Scramble interactions
  const handleSelectToken = (token: ScrambleToken) => {
    if (submitted) return;
    setAvailableTokens((prev) => prev.filter((t) => t.id !== token.id));
    setPlacedTokens((prev) => [...prev, token]);
  };

  const handleRemoveToken = (token: ScrambleToken) => {
    if (submitted) return;
    setPlacedTokens((prev) => prev.filter((t) => t.id !== token.id));
    setAvailableTokens((prev) => [...prev, token]);
  };

  const handleUndoToken = () => {
    if (submitted || placedTokens.length === 0) return;
    const last = placedTokens[placedTokens.length - 1];
    setPlacedTokens((prev) => prev.slice(0, -1));
    setAvailableTokens((prev) => [...prev, last]);
  };

  const handleResetTokens = () => {
    if (submitted || !current.sentenceTokens) return;
    const tokens: ScrambleToken[] = current.sentenceTokens.map((t, i) => ({
      id: `${t}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      text: t,
    }));
    setAvailableTokens([...tokens].sort(() => Math.random() - 0.5));
    setPlacedTokens([]);
  };

  const handleSubmit = async () => {
    if (grading) return;

    let finalAnswer = answer.trim();

    // Check by question type
    if (current.questionType === "sentence_scramble") {
      if (placedTokens.length === 0) return;
      finalAnswer = placedTokens.map((t) => t.text).join(" ");
    } else if (current.questionType === "multiple_choice") {
      if (!selectedOption) return;
      finalAnswer = selectedOption.trim();
    } else if (current.questionType === "listening_catch") {
      if (!finalAnswer && selectedOption) {
        finalAnswer = selectedOption.trim();
      }
      if (!finalAnswer) return;
    } else {
      if (!finalAnswer) return;
    }

    setGrading(true);

    const { item, questionType, expectedAnswer } = current;
    let isCorrect = false;
    let feedback: AIGradingResult | null = null;

    if (questionType === "multiple_choice") {
      isCorrect = cleanToken(finalAnswer).toLowerCase() === cleanToken(expectedAnswer).toLowerCase();
    } else if (questionType === "sentence_scramble") {
      const cleanPlaced = placedTokens.map((t) => cleanToken(t.text).toLowerCase()).join(" ");
      const cleanExpected = (current.sentenceTokens || [])
        .map((t) => cleanToken(t).toLowerCase())
        .join(" ");
      isCorrect = cleanPlaced === cleanExpected;
    } else if (questionType === "listening_catch") {
      isCorrect = isAnswerCorrect(finalAnswer, item.word);
    } else if (questionType === "english_recall") {
      isCorrect = isAnswerCorrect(finalAnswer, item.word);
    } else if (questionType === "fill_blank") {
      isCorrect = isAnswerCorrect(finalAnswer, item.word);
    } else if (questionType === "vietnamese_recall") {
      const targetMeaning = item.meaning_vi || item.definition_en || "";
      try {
        const res = await fetch("/api/ai/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "vietnamese_recall",
            word: item.word,
            meaning_vi: targetMeaning,
            userAnswer: finalAnswer,
            expectedAnswer: targetMeaning,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          isCorrect = data.is_correct;
        } else {
          isCorrect = isAnswerCorrect(finalAnswer, targetMeaning);
        }
      } catch {
        isCorrect = isAnswerCorrect(finalAnswer, targetMeaning);
      }
    } else if (questionType === "sentence_writing") {
      const targetMeaning = item.meaning_vi || item.definition_en || "";
      const storedKey =
        typeof window !== "undefined" ? localStorage.getItem("habitrabbit_ai_api_key") : null;

      try {
        const res = await fetch("/api/ai/grade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(storedKey ? { "x-ai-api-key": storedKey } : {}),
          },
          body: JSON.stringify({
            type: "sentence_writing",
            word: item.word,
            meaning_vi: targetMeaning,
            userAnswer: finalAnswer,
            part_of_speech: item.part_of_speech,
            example_en: item.example_en,
            example_vi: item.example_vi,
            customApiKey: storedKey || undefined,
          }),
        });

        if (res.ok) {
          feedback = await res.json();
          isCorrect = Boolean(feedback?.target_word_used_correctly) && (feedback?.score ?? 0) >= 70;
        } else {
          feedback = evaluateEnglishSentenceLocally(
            item.word,
            targetMeaning,
            finalAnswer,
            item.part_of_speech,
            item.example_en,
            item.example_vi
          );
          isCorrect = feedback.target_word_used_correctly && feedback.score >= 70;
        }
      } catch {
        feedback = evaluateEnglishSentenceLocally(
          item.word,
          targetMeaning,
          finalAnswer,
          item.part_of_speech,
          item.example_en,
          item.example_vi
        );
        isCorrect = feedback.target_word_used_correctly && feedback.score >= 70;
      }

      // If translation missing, fetch fast Vietnamese translation
      if (!feedback?.vietnamese_translation && finalAnswer.trim()) {
        try {
          const transRes = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(
              finalAnswer.trim()
            )}`
          );
          if (transRes.ok) {
            const transData = await transRes.json();
            const translatedText = transData?.[0]?.[0]?.[0] || "";
            if (translatedText && feedback) {
              feedback.vietnamese_translation = translatedText;
            }
          }
        } catch {}
      }
    }

    // Record review log with SRS update
    fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vocabularyItemId: item.id,
        selfRating: isCorrect ? "good" : "again",
        isCorrect,
        responseType: questionType,
      }),
    }).catch(() => {});

    const newResult: PracticeResult = {
      itemId: item.id,
      questionType,
      isCorrect,
      userAnswer: finalAnswer,
      expectedAnswer,
      feedback,
    };

    setResults((prev) => [...prev, newResult]);
    setResult({ correct: isCorrect, feedback });
    setAnswer(finalAnswer);
    setSubmitted(true);
    setGrading(false);
  };

  const handleNext = () => {
    if (idx < quiz.length - 1) {
      setIdx((i) => i + 1);
    } else {
      onComplete(results);
    }
  };

  const { item, questionType } = current;

  const questionLabels: Record<QuestionType, string> = {
    multiple_choice: "Chọn đáp án đúng (Quiz)",
    sentence_scramble: "Sắp xếp lại câu (Word Order)",
    listening_catch: "Nghe và bắt từ (Listening)",
    fill_blank: "Điền từ vào chỗ trống",
    sentence_writing: "Tự viết câu thực hành (AI chấm điểm & sửa câu)",
    english_recall: "Gợi nhớ Từ vựng tiếng Anh",
    vietnamese_recall: "Dịch nghĩa sang Tiếng Việt",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">
            {questionLabels[questionType]}
          </Badge>
          {item.part_of_speech && (
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {item.part_of_speech}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          Câu {idx + 1} / {quiz.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.round(((idx + 1) / quiz.length) * 100)}%` }}
        />
      </div>

      {/* Main Question Card */}
      <Card className="p-6 sm:p-8 space-y-6 border-gray-100 shadow-sm">
        {/* ==================== 1. CHỌN ĐÁP ÁN ĐÚNG (MULTIPLE CHOICE) ==================== */}
        {questionType === "multiple_choice" && (
          <div className="space-y-5">
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                {current.mcMode === "word_to_meaning"
                  ? "Chọn nghĩa tiếng Việt chính xác của từ sau:"
                  : "Chọn từ tiếng Anh phù hợp với định nghĩa sau:"}
              </p>
              <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {current.mcMode === "word_to_meaning"
                      ? item.word
                      : item.meaning_vi || item.definition_en}
                  </h3>
                  {current.mcMode === "word_to_meaning" && item.ipa && (
                    <p className="text-xs text-indigo-600 font-mono mt-1 font-semibold">
                      /{item.ipa.replace(/^\/+|\/+$/g, "")}/
                    </p>
                  )}
                </div>
                {current.mcMode === "word_to_meaning" && (
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(item.word)}
                    className="p-3 bg-white rounded-xl text-indigo-600 hover:bg-indigo-100/70 border border-indigo-200 transition-colors shadow-xs"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* 4 Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {(current.options || []).map((opt, i) => {
                const labelLetter = String.fromCharCode(65 + i);
                const isSelected = selectedOption === opt;
                const isCorrectOption =
                  cleanToken(opt).toLowerCase() === cleanToken(current.expectedAnswer).toLowerCase();

                let btnStyle = "bg-white border-gray-200 text-gray-800 hover:border-indigo-300 hover:bg-indigo-50/30";
                if (submitted) {
                  if (isCorrectOption) {
                    btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-2 ring-emerald-300";
                  } else if (isSelected && !isCorrectOption) {
                    btnStyle = "bg-red-50 border-red-400 text-red-900 shadow-xs";
                  } else {
                    btnStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                  }
                } else if (isSelected) {
                  btnStyle = "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-200";
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelectedOption(opt)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all duration-150 cursor-pointer ${btnStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        submitted && isCorrectOption
                          ? "bg-emerald-600 text-white"
                          : submitted && isSelected && !isCorrectOption
                          ? "bg-red-600 text-white"
                          : isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {labelLetter}
                    </span>
                    <span className="text-sm font-semibold flex-1 mt-0.5">{opt}</span>
                    {submitted && isCorrectOption && (
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {submitted && isSelected && !isCorrectOption && (
                      <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== 2. SẮP XẾP LẠI CÂU (SENTENCE SCRAMBLE) ==================== */}
        {questionType === "sentence_scramble" && (
          <div className="space-y-5">
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-between">
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Chạm vào các từ để sắp xếp thành câu hoàn chỉnh:
                </p>
                {current.rawSentence && (
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(current.rawSentence!)}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe câu mẫu</span>
                  </button>
                )}
              </div>

              {/* Translation Prompt */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
                <p className="text-xs font-bold text-gray-500 mb-1">🇻🇳 Nghĩa của câu:</p>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  "{current.sentenceTranslation}"
                </h4>
              </div>
            </div>

            {/* Answer Tray (Khay ghép câu) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-500">Câu bạn đang ghép:</span>
                {!submitted && placedTokens.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUndoToken}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Hoàn tác
                    </button>
                    <button
                      type="button"
                      onClick={handleResetTokens}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Xếp lại
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`min-h-[72px] p-4 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 items-center transition-colors ${
                  submitted
                    ? result?.correct
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-red-300 bg-red-50/40"
                    : placedTokens.length > 0
                    ? "border-indigo-300 bg-indigo-50/30"
                    : "border-gray-200 bg-gray-50/70"
                }`}
              >
                {placedTokens.length === 0 ? (
                  <p className="text-xs text-gray-400 italic mx-auto">
                    Chạm các từ bên dưới để ghép thành câu ở đây...
                  </p>
                ) : (
                  placedTokens.map((token) => (
                    <button
                      key={token.id}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleRemoveToken(token)}
                      className="px-3.5 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{token.text}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Word Bank (Kho từ vựng) */}
            {!submitted && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-gray-500 px-1">Kho từ vựng:</span>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap gap-2.5">
                  {availableTokens.map((token) => (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => handleSelectToken(token)}
                      className="px-3.5 py-2 bg-white text-gray-800 font-semibold text-sm rounded-xl border border-gray-200 shadow-2xs hover:border-indigo-400 hover:text-indigo-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {token.text}
                    </button>
                  ))}
                  {availableTokens.length === 0 && placedTokens.length > 0 && (
                    <span className="text-xs text-emerald-600 font-semibold mx-auto py-1">
                      ✨ Đã dùng hết các từ! Nhấn "Kiểm tra" bên dưới để hoàn thành.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. NGHE VÀ BẮT TỪ (LISTENING) ==================== */}
        {questionType === "listening_catch" && (
          <div className="space-y-6 text-center sm:text-left">
            <div className="space-y-2">
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                Nghe phát âm chuẩn và nhập hoặc chọn từ vựng bạn nghe được:
              </p>
            </div>

            {/* Central Speaker Box */}
            <div className="p-6 bg-gradient-to-b from-indigo-50/80 via-white to-purple-50/40 rounded-3xl border border-indigo-100 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(item.word, audioSpeed)}
                  className={`w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    isPlayingAudio ? "ring-8 ring-indigo-200 animate-pulse" : ""
                  }`}
                  title="Nghe lại phát âm"
                >
                  <Volume2 className="w-10 h-10" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAudioSpeed(0.9);
                    handlePlayAudio(item.word, 0.9);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                    audioSpeed === 0.9
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  ⚡ Tốc độ 1.0x
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioSpeed(0.7);
                    handlePlayAudio(item.word, 0.7);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                    audioSpeed === 0.7
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  🐢 Tốc độ chậm 0.7x
                </button>
              </div>

              {/* Hint pills */}
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                  Gợi ý: Từ có <b>{item.word.length} chữ cái</b>
                </span>
                {item.part_of_speech && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                    Loại từ: <b>{item.part_of_speech}</b>
                  </span>
                )}
              </div>
            </div>

            {/* Quick choices chips */}
            {!submitted && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">Chạm chọn nhanh đáp án:</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(current.options || []).map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedOption(opt);
                        setAnswer(opt);
                      }}
                      className={`p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        selectedOption === opt
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-gray-800 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. GỢI NHỚ TỪ TIẾNG ANH (ENGLISH RECALL) ==================== */}
        {questionType === "english_recall" && (
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
              Từ tiếng Anh tương ứng với nghĩa này là gì?
            </p>
            <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 text-center sm:text-left">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {item.meaning_vi || item.definition_en || "Chưa có nghĩa"}
              </h3>
              {item.definition_en && item.meaning_vi && item.definition_en !== item.meaning_vi && (
                <p className="text-xs text-gray-500 mt-1 italic">Định nghĩa: {item.definition_en}</p>
              )}
            </div>
            {item.part_of_speech && (
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="sm">
                  Loại từ: {item.part_of_speech}
                </Badge>
                {item.ipa && (
                  <span className="text-xs text-gray-400 font-mono">
                    Phiên âm: /{item.ipa.replace(/^\/+|\/+$/g, "")}/
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. DỊCH NGHĨA SANG TIẾNG VIỆT (VIETNAMESE RECALL) ==================== */}
        {questionType === "vietnamese_recall" && (
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
              Nghĩa tiếng Việt của từ này là gì?
            </p>
            <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 text-center sm:text-left flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900">{item.word}</h3>
                {item.ipa && (
                  <p className="text-sm text-indigo-600 font-mono mt-1 font-medium">
                    /{item.ipa.replace(/^\/+|\/+$/g, "")}/
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handlePlayAudio(item.word)}
                className="p-3 bg-white rounded-xl text-indigo-600 hover:bg-indigo-100/70 border border-indigo-200 transition-colors shadow-xs"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== 6. ĐIỀN TỪ VÀO CHỖ TRỐNG (FILL BLANK) ==================== */}
        {questionType === "fill_blank" && (
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
              Điền từ thích hợp vào chỗ trống (Nghĩa: {item.meaning_vi || item.definition_en})
            </p>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <p className="text-lg text-gray-800 italic font-serif leading-relaxed">
                "{item.example_en ? highlightBlank(item.example_en, item.word) : `I need to ______ the ${item.word}.`}"
              </p>
              {item.example_vi && (
                <p className="text-xs text-gray-500 mt-2 font-sans">→ {item.example_vi}</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== 7. TỰ VIẾT CÂU THỰC HÀNH (SENTENCE WRITING) ==================== */}
        {questionType === "sentence_writing" && (
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                Thực hành đặt câu tiếng Anh có chứa từ:
              </p>
            </div>
            <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {item.word}{" "}
                  <span className="text-sm font-normal text-gray-600">
                    ({item.meaning_vi || item.definition_en || item.part_of_speech})
                  </span>
                </h3>
                {item.ipa && (
                  <p className="text-xs text-indigo-600 font-mono mt-0.5">
                    /{item.ipa.replace(/^\/+|\/+$/g, "")}/
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handlePlayAudio(item.word)}
                className="p-2.5 bg-white rounded-xl text-indigo-600 hover:bg-indigo-100/70 border border-indigo-200 shadow-xs"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              🐰 AI sẽ chấm điểm, phân tích lỗi ngữ pháp, sửa luôn câu của bạn cho đúng chuẩn và gợi ý thêm câu mẫu.
            </p>
          </div>
        )}

        {/* ==================== INPUT AREA ==================== */}
        {!submitted ? (
          <div className="space-y-4 pt-2">
            {questionType === "sentence_writing" ? (
              <Textarea
                ref={inputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Viết câu tiếng Anh của bạn tại đây... (Nhấn Enter để gửi)"
                rows={3}
                className="text-base"
                autoFocus
              />
            ) : questionType === "sentence_scramble" ? null : questionType === "multiple_choice" ? null : (
              <div className="space-y-2">
                <Input
                  ref={textInputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    questionType === "listening_catch"
                      ? "Nhập từ bạn nghe được hoặc chọn các từ ở trên..."
                      : "Nhập câu trả lời của bạn..."
                  }
                  className="text-base"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSubmit}
                loading={grading}
                disabled={
                  questionType === "sentence_scramble"
                    ? placedTokens.length === 0
                    : questionType === "multiple_choice"
                    ? !selectedOption
                    : !answer.trim() && !selectedOption
                }
                rightIcon={<Send className="w-4 h-4" />}
              >
                {questionType === "sentence_writing" ? "AI Chấm & Sửa câu" : "Kiểm tra"}
              </Button>
            </div>
          </div>
        ) : (
          /* ==================== RESULT & FEEDBACK AREA ==================== */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Answer banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                result?.correct
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                  : "bg-red-50/80 border-red-200 text-red-950"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  result?.correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {result?.correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-bold">
                  {questionType === "sentence_writing" && result?.feedback
                    ? result.feedback.score >= 75
                      ? `✅ Đạt yêu cầu! (Điểm: ${result.feedback.score}/100)`
                      : result.feedback.score >= 50
                      ? `⚠️ Cần cải thiện (Điểm: ${result.feedback.score}/100)`
                      : `❌ Chưa đạt (Điểm: ${result.feedback.score}/100)`
                    : result?.correct
                    ? "Chính xác! Làm rất tốt."
                    : "Chưa chính xác!"}
                </p>

                <p className="text-xs">
                  Câu trả lời của bạn:{" "}
                  <span className="font-semibold underline decoration-dashed">{answer}</span>
                </p>

                {/* For sentence writing, show repaired sentence directly in the banner when incorrect */}
                {questionType === "sentence_writing" && !result?.correct && result?.feedback?.corrected_sentence && (
                  <div className="pt-2 mt-2 border-t border-red-200/70 space-y-1">
                    <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <span>✏️ Câu sửa lại cho đúng từ câu của bạn:</span>
                    </p>
                    <p className="text-sm font-extrabold text-emerald-950 bg-white/90 p-2.5 rounded-xl border border-red-200 shadow-2xs italic">
                      "{result.feedback.corrected_sentence}"
                    </p>
                  </div>
                )}

                {/* For non sentence writing, show expected answer if wrong */}
                {questionType !== "sentence_writing" && !result?.correct && (
                  <div className="pt-1 space-y-1 text-xs">
                    <p className="text-red-950 font-medium">
                      Đáp án đúng:{" "}
                      <span className="font-bold underline text-sm text-emerald-800">
                        {current.expectedAnswer}
                      </span>
                    </p>
                    {item.example_en && (
                      <p className="text-gray-600 italic mt-1">
                        Câu ví dụ: "{item.example_en}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ==================== AI FEEDBACK FOR SENTENCE WRITING ==================== */}
            {questionType === "sentence_writing" && result?.feedback && (
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm space-y-4 text-xs text-gray-700">
                {/* Header with Mascot and Score */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                    <span className="p-1 rounded-lg bg-indigo-50 text-base">🐰</span>
                    <span>Thỏ HabitRabbit Nhận xét & Sửa bài</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">
                      Điểm:{" "}
                      <span
                        className={
                          result.feedback.score >= 80
                            ? "text-emerald-600 text-sm font-extrabold"
                            : result.feedback.score >= 50
                            ? "text-amber-600 text-sm font-extrabold"
                            : "text-rose-600 text-sm font-extrabold"
                        }
                      >
                        {result.feedback.score}
                      </span>
                      /100
                    </span>
                    <Badge
                      variant={
                        result.feedback.score >= 80
                          ? "success"
                          : result.feedback.score >= 50
                          ? "warning"
                          : "error"
                      }
                    >
                      {result.feedback.score >= 80
                        ? "Chuẩn & Tự nhiên"
                        : result.feedback.score >= 50
                        ? "Cần cải thiện"
                        : "Sai cấu trúc"}
                    </Badge>
                  </div>
                </div>

                {/* 1. DỊCH NGHĨA CÂU BẠN VỪA VIẾT */}
                {result.feedback.vietnamese_translation && (
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-xs text-gray-600">
                      🇻🇳 Dịch nghĩa câu bạn vừa viết:
                    </span>
                    <p className="text-sm font-semibold italic text-gray-900">
                      "{result.feedback.vietnamese_translation}"
                    </p>
                  </div>
                )}

                {/* 2. SỬA LUÔN CÂU CỦA NGƯỜI HỌC VIẾT SAI CHO ĐÚNG LẠI (Requirement 3) */}
                {result.feedback.corrected_sentence && (
                  <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200/90 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        ✏️ Câu của bạn đã được sửa lại cho đúng ngữ pháp:
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(result.feedback!.corrected_sentence)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Nghe
                      </button>
                    </div>
                    <p className="text-sm font-bold text-emerald-950 italic">
                      "{result.feedback.corrected_sentence}"
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      (Giữ nguyên ý tưởng của bạn và sửa tất cả các lỗi ngữ pháp, thì, từ loại và dấu câu)
                    </p>
                  </div>
                )}

                {/* 3. PHÂN TÍCH CHỖ SAI CỦA NGỮ PHÁP (Requirement 3) */}
                {result.feedback.grammar_feedback && (
                  <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 space-y-1.5">
                    <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      🔍 Phân tích chi tiết các lỗi ngữ pháp cần lưu ý:
                    </span>
                    <p className="text-xs text-amber-950 font-medium leading-relaxed whitespace-pre-line">
                      {result.feedback.grammar_feedback}
                    </p>
                  </div>
                )}

                {/* 4. CÂU GỢI Ý MẪU THAM KHẢO THÊM TỪ THỎ (Requirement 3) */}
                {result.feedback.suggested_native_sentence &&
                  result.feedback.suggested_native_sentence.trim().toLowerCase() !==
                    result.feedback.corrected_sentence.trim().toLowerCase() && (
                    <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                          💡 Câu gợi ý thêm từ Thỏ HabitRabbit (Mẫu tự nhiên chuẩn bản xứ):
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(result.feedback!.suggested_native_sentence!)}
                          className="text-xs font-semibold text-indigo-800 hover:text-indigo-950 flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Nghe
                        </button>
                      </div>
                      <p className="text-sm font-bold text-indigo-950 italic">
                        "{result.feedback.suggested_native_sentence}"
                      </p>
                      <p className="text-[11px] text-indigo-700">
                        (Tham khảo thêm cách người bản xứ diễn đạt phong phú với từ "{item.word}")
                      </p>
                    </div>
                  )}

                {/* 5. LỜI KHUYÊN & GIẢI THÍCH TỪ THỎ */}
                {result.feedback.vietnamese_explanation && (
                  <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200/70 space-y-1.5">
                    <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                      🐰 Lời khuyên từ Thỏ:
                    </span>
                    <p className="text-xs text-purple-950 leading-relaxed whitespace-pre-line font-medium">
                      {result.feedback.vietnamese_explanation}
                    </p>
                    {result.feedback.suggested_next_step && (
                      <p className="pt-1 text-xs font-bold text-purple-800">
                        👉 Hướng dẫn tiếp theo: {result.feedback.suggested_next_step}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Next Question button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleNext} rightIcon={<ChevronRight className="w-4 h-4" />}>
                {idx < quiz.length - 1 ? "Câu tiếp theo" : "Xem kết quả bài học"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}