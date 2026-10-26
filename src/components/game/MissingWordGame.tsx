"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  Zap,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import { MiniGameWord } from "@/types/game";
import { speakWord } from "@/lib/audio/tts";
import { Button } from "@/components/ui/Button";

interface MissingWordGameProps {
  words: MiniGameWord[];
  onFinish: (result: {
    score: number;
    accuracy: number;
    wordsPlayed: number;
    durationSeconds: number;
  }) => void;
  onExit: () => void;
}

interface Question {
  id: string;
  targetWord: MiniGameWord;
  sentencePrompt: string;
  translationHint: string;
  options: string[];
  correctIndex: number;
}

export function MissingWordGame({ words, onFinish, onExit }: MissingWordGameProps) {
  const [mainQuestions, setMainQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [combo, setCombo] = useState(1);
  const [seconds, setSeconds] = useState(0);

  // Spaced loop state
  const [phase, setPhase] = useState<"main" | "retry_intro" | "retry">("main");
  const [missedQuestions, setMissedQuestions] = useState<Question[]>([]);
  const [retryIndex, setRetryIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate question helper
  const createQuestion = (item: MiniGameWord, allWords: MiniGameWord[]): Question => {
    let prompt = "";
    let hint = item.meaning_vi;

    if (item.example_en && item.example_en.toLowerCase().includes(item.word.toLowerCase())) {
      const regex = new RegExp(`\\b${item.word}\\b`, "gi");
      prompt = item.example_en.replace(regex, "______");
      if (item.example_vi) hint = item.example_vi;
    } else {
      prompt = `Từ nào có nghĩa là: "${item.meaning_vi}"?`;
    }

    // Distractors
    const others = allWords.filter((w) => w.id !== item.id).map((w) => w.word);
    const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const fallback = ["resilience", "ubiquitous", "pragmatic", "meticulous", "focus"];
    while (shuffledOthers.length < 3) {
      const fb = fallback.pop();
      if (fb && fb !== item.word) shuffledOthers.push(fb);
    }

    const options = [item.word, ...shuffledOthers].sort(() => Math.random() - 0.5);
    return {
      id: item.id,
      targetWord: item,
      sentencePrompt: prompt,
      translationHint: hint,
      options,
      correctIndex: options.indexOf(item.word),
    };
  };

  // Prepare questions
  useEffect(() => {
    if (!words || words.length === 0) return;

    const list = words.slice(0, 8);
    const qs = list.map((item) => createQuestion(item, words));

    setMainQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setFirstTryCorrectCount(0);
    setCombo(1);
    setSeconds(0);
    setPhase("main");
    setMissedQuestions([]);
    setRetryIndex(0);
  }, [words]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle choice selection in Main Phase
  const handleSelectOptionMain = (idx: number) => {
    if (isAnswered || !mainQuestions[currentIndex]) return;

    setSelectedOption(idx);
    setIsAnswered(true);

    const q = mainQuestions[currentIndex];
    const isCorrect = idx === q.correctIndex;

    if (isCorrect) {
      speakWord(q.targetWord.word);
      const points = 10 * combo;
      setScore((s) => s + points);
      setFirstTryCorrectCount((c) => c + 1);
      setCombo((c) => Math.min(c + 1, 5));
    } else {
      setCombo(1);
      // Add to missed questions queue for retry phase
      setMissedQuestions((prev) => {
        if (!prev.some((m) => m.id === q.id)) {
          return [...prev, q];
        }
        return prev;
      });
    }

    // Auto next after 850ms
    setTimeout(() => {
      if (currentIndex + 1 < mainQuestions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        // Main phase completed!
        checkTransitionToRetry(isCorrect ? [] : [q]);
      }
    }, 850);
  };

  const checkTransitionToRetry = (lastMissed: Question[]) => {
    const allMissed = Array.from(new Set([...missedQuestions, ...lastMissed]));
    if (allMissed.length > 0) {
      // Re-shuffle options for missed questions so they can't just recall position
      const reShuffledMissed = allMissed.map((q) => {
        const reShuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
        return {
          ...q,
          options: reShuffledOptions,
          correctIndex: reShuffledOptions.indexOf(q.targetWord.word),
        };
      });

      setMissedQuestions(reShuffledMissed);
      setPhase("retry_intro");
    } else {
      // 100% on first try!
      finishGame(mainQuestions.length, 0);
    }
  };

  // Handle choice in Retry Phase (loop until correct!)
  const handleSelectOptionRetry = (idx: number) => {
    if (isAnswered || missedQuestions.length === 0) return;

    setSelectedOption(idx);
    setIsAnswered(true);

    const q = missedQuestions[retryIndex];
    const isCorrect = idx === q.correctIndex;

    if (isCorrect) {
      speakWord(q.targetWord.word);
      setScore((s) => s + 5);

      setTimeout(() => {
        // Remove this question from missedQuestions
        const updatedMissed = missedQuestions.filter((_, i) => i !== retryIndex);
        setMissedQuestions(updatedMissed);
        setSelectedOption(null);
        setIsAnswered(false);

        if (updatedMissed.length === 0) {
          // Solved ALL missed questions!
          finishGame(firstTryCorrectCount, mainQuestions.length - firstTryCorrectCount);
        } else {
          // Next in retry
          setRetryIndex(0);
        }
      }, 900);
    } else {
      // Still wrong: re-shuffle and move to back of queue
      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswered(false);
        // Move current question to end of queue with shuffled options
        const currentQ = missedQuestions[retryIndex];
        const newOptions = [...currentQ.options].sort(() => Math.random() - 0.5);
        const reShuffled = {
          ...currentQ,
          options: newOptions,
          correctIndex: newOptions.indexOf(currentQ.targetWord.word),
        };

        const reordered = [
          ...missedQuestions.slice(retryIndex + 1),
          reShuffled,
        ];
        setMissedQuestions(reordered);
        setRetryIndex(0);
      }, 1000);
    }
  };

  const finishGame = (firstTryCorrect: number, totalErrors: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const total = mainQuestions.length;
    const accuracy = total > 0 ? Math.round((firstTryCorrect / total) * 100) : 100;

    setTimeout(() => {
      onFinish({
        score,
        accuracy,
        wordsPlayed: total,
        durationSeconds: seconds,
      });
    }, 600);
  };

  // If in Retry Intro screen
  if (phase === "retry_intro") {
    return (
      <div className="max-w-md mx-auto text-center py-10 px-4 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
          🔁
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Vòng Khắc Sâu Trí Nhớ
          </span>
          <h2 className="text-2xl font-black text-gray-900">
            Bạn có {missedQuestions.length} từ cần củng cố lại!
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Bé Thỏ sẽ cùng bạn làm lại những câu vừa rồi đến khi chọn đúng 100% để não bộ ghi nhớ thật lâu nhé.
          </p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70 text-left space-y-2">
          <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Các từ cần thử lại:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missedQuestions.map((q) => (
              <span
                key={q.id}
                className="text-xs font-semibold bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-amber-950"
              >
                {q.targetWord.word}
              </span>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => {
            setRetryIndex(0);
            setSelectedOption(null);
            setIsAnswered(false);
            setPhase("retry");
          }}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Bắt đầu củng cố ({missedQuestions.length} câu)
        </Button>
      </div>
    );
  }

  // Active question depends on phase
  const isRetry = phase === "retry";
  const currentQ = isRetry ? missedQuestions[retryIndex] : mainQuestions[currentIndex];
  if (!currentQ) return null;

  const currentDisplayIndex = isRetry ? 1 : currentIndex + 1;
  const totalDisplay = isRetry ? missedQuestions.length : mainQuestions.length;
  const progressPercent = isRetry
    ? 100
    : Math.round(((currentIndex + (isAnswered && selectedOption === currentQ.correctIndex ? 1 : 0)) / mainQuestions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thoát</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{seconds}s</span>
          </div>

          {!isRetry && combo > 1 && (
            <div className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Combo {combo}x</span>
            </div>
          )}

          {isRetry && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Vòng củng cố từ sai: còn {missedQuestions.length} từ</span>
            </span>
          )}

          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Điểm</p>
            <p className="text-lg font-black text-indigo-600 leading-none">{score}</p>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      {!isRetry && (
        <div className="bg-gradient-to-r from-emerald-50 via-amber-50 to-orange-50 p-4 rounded-2xl border border-orange-100 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-2">
            <span>Câu hỏi {currentDisplayIndex} / {totalDisplay}</span>
            <span>Đích đến: Vườn cà rốt 🥕</span>
          </div>

          <div className="relative h-2 bg-orange-100 rounded-full w-full">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
            <motion.div
              className="absolute -top-3.5 text-xl select-none"
              style={{ left: `calc(${Math.min(progressPercent, 90)}% - 10px)` }}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              🐰
            </motion.div>
            <div className="absolute -top-3 right-0 text-lg">🥕</div>
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className={`bg-white p-6 sm:p-8 rounded-3xl border shadow-sm text-center space-y-4 ${
        isRetry ? "border-amber-200 bg-amber-50/20" : "border-gray-100"
      }`}>
        <div className="flex items-center justify-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            isRetry ? "text-amber-800 bg-amber-100" : "text-indigo-600 bg-indigo-50"
          }`}>
            {isRetry ? "Luyện lại từ này đến khi đúng" : "Chọn từ còn thiếu"}
          </span>
          <button
            onClick={() => speakWord(currentQ.targetWord.word)}
            className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-relaxed px-2">
          {currentQ.sentencePrompt}
        </h3>

        {currentQ.translationHint && (
          <p className="text-xs sm:text-sm text-gray-500 italic bg-gray-50 p-3 rounded-2xl max-w-lg mx-auto">
            Gợi ý: "{currentQ.translationHint}"
          </p>
        )}

        {/* 4 Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let btnStyle = "bg-white border-gray-200 text-gray-800 hover:border-indigo-300 hover:bg-indigo-50/30";
            if (isAnswered) {
              if (isCorrect) {
                btnStyle = "bg-emerald-500 border-emerald-500 text-white shadow-md font-black";
              } else if (isSelected) {
                btnStyle = "bg-rose-500 border-rose-500 text-white font-bold";
              } else {
                btnStyle = "bg-gray-100 border-gray-100 text-gray-400 opacity-50";
              }
            }

            return (
              <motion.button
                key={opt}
                disabled={isAnswered}
                onClick={() => (isRetry ? handleSelectOptionRetry(idx) : handleSelectOptionMain(idx))}
                whileHover={!isAnswered ? { scale: 1.02 } : {}}
                whileTap={!isAnswered ? { scale: 0.98 } : {}}
                className={`p-4 rounded-2xl font-bold text-sm sm:text-base border-2 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none ${btnStyle}`}
              >
                <span>{opt}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
              </motion.button>
            );
          })}
        </div>

        {/* Helper reminder if wrong in main phase */}
        {isAnswered && selectedOption !== currentQ.correctIndex && !isRetry && (
          <p className="text-xs text-rose-600 font-semibold animate-in fade-in">
            Chưa đúng! Không sao cả, bạn sẽ được luyện lại từ này ở cuối vòng nhé!
          </p>
        )}
      </div>
    </div>
  );
}
