"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Volume2,
  CheckCircle2,
  ChevronRight,
  Flame,
  ArrowLeft,
  Sparkles,
  Eye,
  BookOpen,
  Keyboard,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { speakWord } from "@/lib/audio/tts";
import { SelfRating, VocabularyItem } from "@/types";

export default function ReviewPage() {
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [counts, setCounts] = useState({ due: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const loadDueWords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/review");
      const data = await res.json();
      if (res.ok) {
        setWords(data.words || []);
        setCounts(data.counts || { due: 0, overdue: 0 });
      }
    } catch (err) {
      console.error("Lỗi khi tải từ cần ôn:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueWords();
  }, []);

  const currentWord = words[currentIndex];

  const handleRate = useCallback(
    async (rating: SelfRating) => {
      if (!currentWord || submitting) return;
      setSubmitting(true);

      const isCorrect = rating !== "again";

      try {
        await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vocabularyItemId: currentWord.id,
            selfRating: rating,
            isCorrect,
            responseType: "flashcard",
            durationMs: 1500,
          }),
        });

        setSessionStats((prev) => ({
          ...prev,
          [rating]: prev[rating] + 1,
        }));

        if (currentIndex + 1 < words.length) {
          setIsFlipped(false);
          setCurrentIndex((prev) => prev + 1);
        } else {
          setCompleted(true);
        }
      } catch (err) {
        console.error("Lỗi khi lưu kết quả ôn tập:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [currentWord, submitting, currentIndex, words.length]
  );

  // Keyboard navigation: Space to flip, 1-4 for ratings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || completed || !currentWord) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && !submitting) {
        if (e.key === "1") handleRate("again");
        if (e.key === "2") handleRate("hard");
        if (e.key === "3") handleRate("good");
        if (e.key === "4") handleRate("easy");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, completed, currentWord, isFlipped, submitting, handleRate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang tải danh sách từ cần ôn tập...</p>
      </div>
    );
  }

  // Session Completed State
  if (completed) {
    const totalRated =
      sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
    const goodEasy = sessionStats.good + sessionStats.easy;
    const accuracy = totalRated > 0 ? Math.round((goodEasy / totalRated) * 100) : 100;

    return (
      <div className="max-w-xl mx-auto py-8 px-4 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in duration-300">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Xuất sắc! Bạn đã hoàn thành phiên ôn tập
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Thuật toán FSRS đã tự động tính toán và lên lịch ôn tập tiếp theo cho từng từ.
        </p>

        {/* Stats card */}
        <Card className="p-6 mb-8 text-left grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/50">
          <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
            <span className="text-xs text-red-500 font-medium">Lại</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{sessionStats.again}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
            <span className="text-xs text-amber-500 font-medium">Khó</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{sessionStats.hard}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
            <span className="text-xs text-emerald-600 font-medium">Tốt</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{sessionStats.good}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
            <span className="text-xs text-indigo-600 font-medium">Dễ</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{sessionStats.easy}</p>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full sm:w-auto">
              Về Trang chủ
            </Button>
          </Link>
          <Link href="/progress">
            <Button className="w-full sm:w-auto" rightIcon={<ChevronRight className="w-4 h-4" />}>
              Xem Thống kê Trí nhớ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Zero Words Due State
  if (words.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tuyệt vời! Không còn từ nào cần ôn</h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          Bạn đã hoàn thành toàn bộ các thẻ từ đến hạn hôm nay. Hãy tiếp tục học bài mới hoặc quay
          lại vào ngày mai để duy trì đường cong trí nhớ!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/libraries">
            <Button leftIcon={<BookOpen className="w-4 h-4" />}>Học bài mới trong Thư viện</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Về Trang chủ</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Active Review Flashcard
  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trang chủ</span>
        </Link>
        <div className="flex items-center gap-2">
          {counts.overdue > 0 && (
            <Badge variant="error" size="sm">
              {counts.overdue} từ quá hạn
            </Badge>
          )}
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {words.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} color="indigo" />

      {/* Main Flashcard */}
      <div
        onClick={() => !isFlipped && setIsFlipped(true)}
        className={`cursor-pointer transition-all duration-300 min-h-[340px] bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col justify-between hover:shadow-md ${
          !isFlipped ? "hover:border-indigo-200" : ""
        }`}
      >
        {/* Top bar of card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">
              {currentWord.part_of_speech || "từ vựng"}
            </Badge>
            {isFlipped && (
              <Badge variant="success" size="sm">
                Mặt sau
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              speakWord(currentWord.word);
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="my-auto text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {currentWord.word}
          </h2>
          {currentWord.ipa && (
            <p className="text-indigo-600 font-mono text-base">{currentWord.ipa}</p>
          )}

          {/* If front is visible */}
          {!isFlipped && (
            <div className="pt-6">
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Nhấn hoặc ấn Space để xem nghĩa</span>
              </button>
            </div>
          )}

          {/* If flipped to back */}
          {isFlipped && (
            <div className="pt-4 space-y-4 animate-in fade-in duration-200 text-left">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100/50">
                <p className="text-xs uppercase tracking-wider font-semibold text-indigo-600 mb-1">
                  Nghĩa Tiếng Việt
                </p>
                <p className="text-lg font-bold text-gray-900">{currentWord.meaning_vi}</p>
              </div>

              {currentWord.definition_en && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3.5 rounded-xl">
                  <span className="font-medium text-gray-800">Định nghĩa: </span>
                  {currentWord.definition_en}
                </div>
              )}

              {currentWord.example_en && (
                <div className="text-sm text-gray-700 bg-gray-50/80 p-3.5 rounded-xl space-y-1">
                  <p className="italic text-gray-800">"{currentWord.example_en}"</p>
                  {currentWord.example_vi && (
                    <p className="text-xs text-gray-500">→ {currentWord.example_vi}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer Hint */}
        <div className="pt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100/80">
          <div className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Phím tắt: Space (Lật thẻ)</span>
          </div>
          <span>Ôn tập ngắt quãng FSRS</span>
        </div>
      </div>

      {/* FSRS Rating Buttons - Only active when card is flipped */}
      {isFlipped ? (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-xs text-center text-gray-500 font-medium">
            Bạn nhớ từ này như thế nào? (Nhấn phím 1 - 4)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleRate("again")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-sm">Lại (Again)</span>
              <span className="text-xs text-red-500 font-normal mt-0.5">&lt; 1 ngày • [1]</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleRate("hard")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-700 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-sm">Khó (Hard)</span>
              <span className="text-xs text-amber-500 font-normal mt-0.5">~1-2 ngày • [2]</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleRate("good")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-sm">Tốt (Good)</span>
              <span className="text-xs text-emerald-600 font-normal mt-0.5">~3-5 ngày • [3]</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleRate("easy")}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-sm">Dễ (Easy)</span>
              <span className="text-xs text-indigo-600 font-normal mt-0.5">~7-14 ngày • [4]</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Button
            size="lg"
            className="w-full sm:w-auto px-8"
            onClick={() => setIsFlipped(true)}
            rightIcon={<Eye className="w-4 h-4" />}
          >
            Lật thẻ để kiểm tra đáp án (Space)
          </Button>
        </div>
      )}
    </div>
  );
}