"use client";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Check,
  X,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { VocabularyItem, QuestionType, AIGradingResult } from "@/types";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { isAnswerCorrect } from "@/lib/utils";
import { evaluateEnglishSentenceLocally } from "@/lib/ai/provider";

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

type QuizItem = { item: VocabularyItem; questionType: QuestionType };

function generateQuiz(items: VocabularyItem[]): QuizItem[] {
  const quiz: QuizItem[] = [];
  const types: QuestionType[] = [
    "english_recall",
    "vietnamese_recall",
    "fill_blank",
    "sentence_writing",
  ];
  items.forEach((item, i) => {
    const type = types[i % types.length];
    if (type === "fill_blank" && !item.example_en) {
      quiz.push({ item, questionType: "english_recall" });
    } else {
      quiz.push({ item, questionType: type });
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
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    feedback: AIGradingResult | null;
  } | null>(null);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [grading, setGrading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const current = quiz[idx];

  useEffect(() => {
    setAnswer("");
    setSubmitted(false);
    setResult(null);
    inputRef.current?.focus();
  }, [idx]);

  if (!current) return null;

  const handleSubmit = async () => {
    if (!answer.trim() || grading) return;
    setGrading(true);

    const { item, questionType } = current;
    let isCorrect = false;
    let feedback: AIGradingResult | null = null;

    if (questionType === "english_recall") {
      isCorrect = isAnswerCorrect(answer, item.word);
    } else if (questionType === "fill_blank" && item.example_en) {
      isCorrect = isAnswerCorrect(answer, item.word);
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
            userAnswer: answer,
            expectedAnswer: targetMeaning,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          isCorrect = data.is_correct;
        } else {
          isCorrect = isAnswerCorrect(answer, targetMeaning);
        }
      } catch {
        isCorrect = isAnswerCorrect(answer, targetMeaning);
      }
    } else if (questionType === "sentence_writing") {
      const targetMeaning = item.meaning_vi || item.definition_en || "";
      const storedKey = typeof window !== "undefined" ? localStorage.getItem("habitrabbit_ai_api_key") : null;

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
            userAnswer: answer,
            part_of_speech: item.part_of_speech,
            example_en: item.example_en,
            example_vi: item.example_vi,
            customApiKey: storedKey || undefined,
          }),
        });

        if (res.ok) {
          feedback = await res.json();
          // STRICT ENGLISH TEACHER CRITERIA:
          // A sentence is ONLY correct if target word is properly used AND score >= 70
          isCorrect = Boolean(feedback?.target_word_used_correctly) && (feedback?.score ?? 0) >= 70;
        } else {
          // If server fails or offline, use our local teacher engine
          feedback = evaluateEnglishSentenceLocally(
            item.word,
            targetMeaning,
            answer,
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
          answer,
          item.part_of_speech,
          item.example_en,
          item.example_vi
        );
        isCorrect = feedback.target_word_used_correctly && feedback.score >= 70;
      }

      // If translation is missing, fetch fast Vietnamese translation
      if (!feedback?.vietnamese_translation && answer.trim()) {
        try {
          const transRes = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(answer.trim())}`
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
      userAnswer: answer,
      expectedAnswer:
        questionType === "english_recall" ? item.word : (item.meaning_vi || item.definition_en || item.word),
      feedback,
    };

    setResults((prev) => [...prev, newResult]);
    setResult({ correct: isCorrect, feedback });
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
    english_recall: "Gợi nhớ Từ vựng tiếng Anh",
    vietnamese_recall: "Dịch nghĩa sang Tiếng Việt",
    fill_blank: "Điền từ vào chỗ trống",
    sentence_writing: "Tự viết câu thực hành (AI chấm điểm)",
    multiple_choice: "Chọn đáp án đúng",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Badge variant="purple" size="sm">
          {questionLabels[questionType]}
        </Badge>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          Câu {idx + 1} / {quiz.length}
        </span>
      </div>

      {/* Main Question Card */}
      <Card className="p-6 sm:p-8 space-y-6 border-gray-100 shadow-sm">
        {/* Question prompt */}
        <div className="space-y-3 text-center sm:text-left">
          {questionType === "english_recall" && (
            <div className="space-y-3">
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                Từ tiếng Anh tương ứng với nghĩa này là gì?
              </p>
              <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {item.meaning_vi || item.definition_en || "Chưa có nghĩa"}
                </h3>
                {item.definition_en && item.meaning_vi && item.definition_en !== item.meaning_vi && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Định nghĩa: {item.definition_en}
                  </p>
                )}
              </div>
              {item.part_of_speech && (
                <div className="flex items-center gap-2">
                  <Badge variant="purple" size="sm">Loại từ: {item.part_of_speech}</Badge>
                  {item.ipa && (
                    <span className="text-xs text-gray-400 font-mono">Phiên âm: /{item.ipa.replace(/^\/+|\/+$/g, "")}/</span>
                  )}
                </div>
              )}
            </div>
          )}

          {questionType === "vietnamese_recall" && (
            <div className="space-y-3">
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                Nghĩa tiếng Việt của từ này là gì?
              </p>
              <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 text-center sm:text-left">
                <h3 className="text-3xl font-extrabold text-gray-900">{item.word}</h3>
                {item.ipa && (
                  <p className="text-sm text-indigo-600 font-mono mt-1 font-medium">/{item.ipa.replace(/^\/+|\/+$/g, "")}/</p>
                )}
              </div>
              {item.part_of_speech && (
                <Badge variant="purple" size="sm">Loại từ: {item.part_of_speech}</Badge>
              )}
            </div>
          )}

          {questionType === "fill_blank" && (
            <div className="space-y-3">
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
              {item.part_of_speech && (
                <Badge variant="purple" size="sm">Loại từ: {item.part_of_speech}</Badge>
              )}
            </div>
          )}

          {questionType === "sentence_writing" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Thực hành đặt câu tiếng Anh có chứa từ:
                </p>
              </div>
              <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  {item.word}{" "}
                  <span className="text-sm font-normal text-gray-600">
                    ({item.meaning_vi || item.definition_en || item.part_of_speech})
                  </span>
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                AI sẽ đánh giá ngữ pháp, độ tự nhiên và giải thích chi tiết bằng tiếng Việt.
              </p>
            </div>
          )}
        </div>

        {/* Input area */}
        {!submitted ? (
          <div className="space-y-4">
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
              placeholder={
                questionType === "sentence_writing"
                  ? "Viết câu tiếng Anh của bạn tại đây... (Nhấn Enter để gửi)"
                  : "Nhập câu trả lời của bạn..."
              }
              rows={questionType === "sentence_writing" ? 3 : 2}
              className="text-base"
              autoFocus
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                loading={grading}
                disabled={!answer.trim()}
                rightIcon={<Send className="w-4 h-4" />}
              >
                {questionType === "sentence_writing" ? "AI Chấm câu" : "Kiểm tra"}
              </Button>
            </div>
          </div>
        ) : (
          /* Result & Feedback Area */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Answer banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                questionType === "sentence_writing" && result?.feedback
                  ? result.feedback.score >= 75
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : result.feedback.score >= 50
                    ? "bg-amber-50/70 border-amber-200 text-amber-900"
                    : "bg-red-50/70 border-red-200 text-red-900"
                  : result?.correct
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-red-50/70 border-red-200 text-red-900"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  questionType === "sentence_writing" && result?.feedback
                    ? result.feedback.score >= 75
                      ? "bg-emerald-100 text-emerald-700"
                      : result.feedback.score >= 50
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                    : result?.correct
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {questionType === "sentence_writing" && result?.feedback ? (
                  result.feedback.score >= 75 ? (
                    <Check className="w-4 h-4" />
                  ) : result.feedback.score >= 50 ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )
                ) : result?.correct ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-bold">
                  {questionType === "sentence_writing" && result?.feedback
                    ? result.feedback.score >= 75
                      ? "✅ Đạt yêu cầu! Câu đúng ngữ pháp và tự nhiên"
                      : result.feedback.score >= 50
                      ? `⚠️ Cần cải thiện (Điểm: ${result.feedback.score}/100)`
                      : `❌ Chưa đạt (Điểm: ${result.feedback.score}/100) — Xem nhận xét sửa bài bên dưới`
                    : result?.correct
                    ? "Chính xác! Làm rất tốt."
                    : "Chưa chính xác"}
                </p>
                <p className="text-xs">
                  Câu trả lời của bạn: <span className="font-semibold underline decoration-dashed">{answer}</span>
                </p>

                {/* Dịch nghĩa câu của bạn (cả đúng lẫn sai để người học đối chiếu) */}
                {result?.feedback?.vietnamese_translation && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs mt-1.5 ${
                      result?.correct
                        ? "bg-emerald-100/70 border-emerald-200/80 text-emerald-950"
                        : "bg-white/90 border-red-200/80 text-gray-900"
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1 text-[11px] text-gray-600 mb-0.5">
                      🇻🇳 Dịch nghĩa câu bạn vừa viết:
                    </span>
                    <p className="text-sm font-semibold italic text-gray-900">
                      "{result.feedback.vietnamese_translation}"
                    </p>
                  </div>
                )}

                {/* Other question types feedback */}
                {questionType !== "sentence_writing" && (
                  <>
                    {result?.correct && (
                      <div className="pt-1 space-y-1 text-xs">
                        {questionType === "english_recall" && (item.meaning_vi || item.definition_en) && (
                          <p className="text-xs text-emerald-800">
                            Nghĩa: <span className="font-semibold">{item.meaning_vi || item.definition_en}</span>
                          </p>
                        )}
                        {questionType === "fill_blank" && item.example_vi && (
                          <p className="text-xs text-emerald-800">
                            Dịch câu: <span className="font-semibold">{item.example_vi}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {!result?.correct && (
                      <div className="pt-1 space-y-2 text-xs">
                        <p className="text-xs text-red-950">
                          Đáp án đúng:{" "}
                          <span className="font-bold underline text-sm">
                            {questionType === "english_recall" || questionType === "fill_blank"
                              ? item.word
                              : (item.meaning_vi || item.definition_en)}
                          </span>
                        </p>
                        {item.example_en && (
                          <div className="bg-white/85 p-3 rounded-xl border border-red-200/70 text-xs space-y-1">
                            <p className="font-bold text-red-900 flex items-center gap-1">
                              💡 Câu ví dụ tham khảo cho từ "{item.word}":
                            </p>
                            <p className="text-sm font-medium italic text-gray-900">
                              "{item.example_en}"
                            </p>
                            {item.example_vi && (
                              <p className="text-gray-600">→ {item.example_vi}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* AI Grading result for sentence writing */}
            {result?.feedback && (
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm space-y-3.5 text-xs text-gray-700">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                    <span className="p-1 rounded-lg bg-indigo-50 text-base">🐰</span>
                    <span>Thỏ HabitRabbit Nhận xét & Hướng dẫn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">
                      Điểm: <span className={result.feedback.score >= 80 ? "text-emerald-600 text-sm" : result.feedback.score >= 50 ? "text-amber-600 text-sm" : "text-rose-600 text-sm"}>{result.feedback.score}</span>/100
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

                {/* Corrected sentence box */}
                {result.feedback.corrected_sentence && (
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/90 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                      <span>✏️ Câu gợi ý chuẩn từ Thỏ HabitRabbit (tự nhiên & đúng ngữ cảnh):</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-950 italic">
                      "{result.feedback.corrected_sentence}"
                    </p>
                  </div>
                )}

                {/* Grammar feedback */}
                {result.feedback.grammar_feedback && (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <span>🔍 Phân tích chi tiết lỗi ngữ pháp:</span>
                    </span>
                    <p className="text-xs text-amber-950 font-medium leading-relaxed whitespace-pre-line">
                      {result.feedback.grammar_feedback}
                    </p>
                  </div>
                )}

                {/* Pedagogical explanation */}
                {result.feedback.vietnamese_explanation && (
                  <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/70 space-y-1.5">
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                      <span>💡 Lời khuyên từ Thỏ:</span>
                    </span>
                    <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-line font-medium">
                      {result.feedback.vietnamese_explanation}
                    </p>
                    {result.feedback.suggested_next_step && (
                      <p className="pt-1 text-xs font-bold text-indigo-700">
                        👉 Hướng dẫn tiếp theo: {result.feedback.suggested_next_step}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

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