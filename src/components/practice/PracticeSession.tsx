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
      try {
        const res = await fetch("/api/ai/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "vietnamese_recall",
            word: item.word,
            meaning_vi: item.meaning_vi,
            userAnswer: answer,
            expectedAnswer: item.meaning_vi,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          isCorrect = data.is_correct;
        } else {
          isCorrect = isAnswerCorrect(answer, item.meaning_vi ?? "");
        }
      } catch {
        isCorrect = isAnswerCorrect(answer, item.meaning_vi ?? "");
      }
    } else if (questionType === "sentence_writing") {
      try {
        const res = await fetch("/api/ai/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "sentence_writing",
            word: item.word,
            meaning_vi: item.meaning_vi,
            userAnswer: answer,
          }),
        });
        if (res.ok) {
          feedback = await res.json();
          isCorrect = feedback?.target_word_used_correctly ?? false;
        } else {
          isCorrect = answer.toLowerCase().includes(item.word.toLowerCase());
        }
      } catch {
        isCorrect = answer.toLowerCase().includes(item.word.toLowerCase());
      }
    }

    // Record review log with SRS update
    await fetch("/api/review", {
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
        questionType === "english_recall" ? item.word : item.meaning_vi ?? item.word,
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
        <div className="space-y-2 text-center sm:text-left">
          {questionType === "english_recall" && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                Từ tiếng Anh tương ứng với nghĩa này là gì?
              </p>
              <h3 className="text-2xl font-bold text-gray-900">{item.meaning_vi}</h3>
              {item.part_of_speech && (
                <p className="text-xs text-indigo-600 mt-1">Loại từ: {item.part_of_speech}</p>
              )}
            </div>
          )}

          {questionType === "vietnamese_recall" && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                Nghĩa tiếng Việt của từ này là gì?
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900">{item.word}</h3>
              {item.ipa && (
                <p className="text-sm text-indigo-600 font-mono mt-0.5">/{item.ipa}/</p>
              )}
            </div>
          )}

          {questionType === "fill_blank" && item.example_en && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                Điền từ thích hợp vào chỗ trống (Nghĩa: {item.meaning_vi})
              </p>
              <p className="text-lg text-gray-800 italic bg-gray-50 p-4 rounded-2xl border border-gray-100 font-serif">
                "{highlightBlank(item.example_en, item.word)}"
              </p>
            </div>
          )}

          {questionType === "sentence_writing" && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Thực hành đặt câu tiếng Anh có chứa từ:
                </p>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {item.word}{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({item.meaning_vi || item.part_of_speech})
                </span>
              </h3>
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
                result?.correct
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-red-50/70 border-red-200 text-red-900"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  result?.correct
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {result?.correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">
                  {result?.correct ? "Chính xác! Làm rất tốt." : "Chưa chính xác"}
                </p>
                <p className="text-xs">
                  Câu trả lời của bạn: <span className="font-semibold">{answer}</span>
                </p>
                {!result?.correct && questionType !== "sentence_writing" && (
                  <p className="text-xs">
                    Đáp án đúng:{" "}
                    <span className="font-bold underline">
                      {questionType === "english_recall" || questionType === "fill_blank"
                        ? item.word
                        : item.meaning_vi}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* AI Grading result for sentence writing */}
            {result?.feedback && (
              <div className="bg-gray-50/90 rounded-2xl p-5 border border-gray-100 space-y-3.5 text-xs text-gray-700">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-700">
                    <Sparkles className="w-4 h-4" />
                    <span>Đánh giá từ AI (Điểm: {result.feedback.score}/100)</span>
                  </div>
                  <Badge variant={result.feedback.score >= 80 ? "success" : "warning"}>
                    {result.feedback.score >= 80 ? "Tự nhiên" : "Cần hoàn thiện"}
                  </Badge>
                </div>

                {result.feedback.corrected_sentence && (
                  <div>
                    <span className="font-semibold text-gray-900">Câu gợi ý tự nhiên hơn: </span>
                    <p className="text-sm font-medium text-emerald-700 mt-0.5 italic">
                      "{result.feedback.corrected_sentence}"
                    </p>
                  </div>
                )}

                {result.feedback.grammar_feedback && (
                  <div>
                    <span className="font-semibold text-gray-800">Nhận xét ngữ pháp: </span>
                    <p className="mt-0.5">{result.feedback.grammar_feedback}</p>
                  </div>
                )}

                {result.feedback.vietnamese_explanation && (
                  <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                    <span className="font-semibold text-indigo-900">Giải thích tiếng Việt: </span>
                    <p className="mt-0.5 text-indigo-900/90">
                      {result.feedback.vietnamese_explanation}
                    </p>
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