"use client";
import { useState, useEffect, useRef } from "react";
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
  Headphones,
} from "lucide-react";
import { MiniGameWord } from "@/types/game";
import { speakWord } from "@/lib/audio/tts";
import { Button } from "@/components/ui/Button";

interface ListenCatchGameProps {
  words: MiniGameWord[];
  onFinish: (result: {
    score: number;
    accuracy: number;
    wordsPlayed: number;
    durationSeconds: number;
  }) => void;
  onExit: () => void;
}

interface ListenQuestion {
  targetWord: MiniGameWord;
  options: MiniGameWord[];
  correctWordId: string;
}

export function ListenCatchGame({ words, onFinish, onExit }: ListenCatchGameProps) {
  const [questions, setQuestions] = useState<ListenQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Retry loop
  const [phase, setPhase] = useState<"main" | "retry_intro" | "retry">("main");
  const [missedQuestions, setMissedQuestions] = useState<ListenQuestion[]>([]);
  const [retryIndex, setRetryIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize questions
  useEffect(() => {
    if (!words || words.length === 0) return;

    const list = words.slice(0, 8);
    const qs: ListenQuestion[] = list.map((item) => {
      // Pick 3 distractors
      const others = words.filter((w) => w.id !== item.id);
      const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [item, ...shuffledOthers].sort(() => Math.random() - 0.5);

      return {
        targetWord: item,
        options,
        correctWordId: item.id,
      };
    });

    setQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setCombo(1);
    setFirstTryCorrect(0);
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

  // Play audio when question changes
  const playTargetAudio = (word: string) => {
    setIsPlayingAudio(true);
    speakWord(word);
    setTimeout(() => setIsPlayingAudio(false), 900);
  };

  useEffect(() => {
    const currentQ = phase === "retry" ? missedQuestions[retryIndex] : questions[currentIndex];
    if (currentQ) {
      const timer = setTimeout(() => {
        playTargetAudio(currentQ.targetWord.word);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, phase, retryIndex, questions, missedQuestions]);

  const handleSelectOptionMain = (option: MiniGameWord) => {
    if (isAnswered || !questions[currentIndex]) return;

    setSelectedWordId(option.id);
    setIsAnswered(true);

    const q = questions[currentIndex];
    const isCorrect = option.id === q.correctWordId;

    if (isCorrect) {
      speakWord(q.targetWord.word);
      const points = 10 * combo;
      setScore((s) => s + points);
      setFirstTryCorrect((c) => c + 1);
      setCombo((c) => Math.min(c + 1, 5));
    } else {
      setCombo(1);
      setMissedQuestions((prev) => {
        if (!prev.some((m) => m.targetWord.id === q.targetWord.id)) {
          return [...prev, q];
        }
        return prev;
      });
    }

    // Advance
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedWordId(null);
        setIsAnswered(false);
      } else {
        const allMissed = isCorrect ? missedQuestions : [...missedQuestions, q];
        if (allMissed.length > 0) {
          // Reshuffle options for retry
          const reShuffled = allMissed.map((item) => ({
            ...item,
            options: [...item.options].sort(() => Math.random() - 0.5),
          }));
          setMissedQuestions(reShuffled);
          setPhase("retry_intro");
        } else {
          finishGame(questions.length);
        }
      }
    }, 850);
  };

  const handleSelectOptionRetry = (option: MiniGameWord) => {
    if (isAnswered || missedQuestions.length === 0) return;

    setSelectedWordId(option.id);
    setIsAnswered(true);

    const q = missedQuestions[retryIndex];
    const isCorrect = option.id === q.correctWordId;

    if (isCorrect) {
      speakWord(q.targetWord.word);
      setScore((s) => s + 5);

      setTimeout(() => {
        const remaining = missedQuestions.filter((_, i) => i !== retryIndex);
        setMissedQuestions(remaining);
        setSelectedWordId(null);
        setIsAnswered(false);

        if (remaining.length === 0) {
          finishGame(firstTryCorrect);
        } else {
          setRetryIndex(0);
        }
      }, 900);
    } else {
      setTimeout(() => {
        setSelectedWordId(null);
        setIsAnswered(false);
        const curr = missedQuestions[retryIndex];
        const reordered = [
          ...missedQuestions.slice(retryIndex + 1),
          { ...curr, options: [...curr.options].sort(() => Math.random() - 0.5) },
        ];
        setMissedQuestions(reordered);
        setRetryIndex(0);
      }, 1000);
    }
  };

  const finishGame = (firstTryCount: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const total = questions.length;
    const accuracy = total > 0 ? Math.round((firstTryCount / total) * 100) : 100;

    setTimeout(() => {
      onFinish({
        score,
        accuracy,
        wordsPlayed: total,
        durationSeconds: seconds,
      });
    }, 600);
  };

  if (phase === "retry_intro") {
    return (
      <div className="max-w-md mx-auto text-center py-10 px-4 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
          🎧
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Vòng Luyện Nghe Lại
          </span>
          <h2 className="text-2xl font-black text-gray-900">
            Còn {missedQuestions.length} từ bạn nghe chưa kịp bắt!
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Hãy cùng bé Thỏ nghe lại thật kỹ để bắt chính xác 100% các từ vựng này nhé.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => {
            setRetryIndex(0);
            setSelectedWordId(null);
            setIsAnswered(false);
            setPhase("retry");
          }}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Bắt đầu luyện nghe lại ({missedQuestions.length} từ)
        </Button>
      </div>
    );
  }

  const isRetry = phase === "retry";
  const currentQ = isRetry ? missedQuestions[retryIndex] : questions[currentIndex];
  if (!currentQ) return null;

  const currentDisplayIndex = isRetry ? 1 : currentIndex + 1;
  const totalDisplay = isRetry ? missedQuestions.length : questions.length;

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
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Luyện lại: còn {missedQuestions.length} từ</span>
            </span>
          )}

          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Điểm</p>
            <p className="text-lg font-black text-indigo-600 leading-none">{score}</p>
          </div>
        </div>
      </div>

      {/* Center Sound Speaker */}
      <div className="bg-gradient-to-b from-sky-50 to-indigo-50/40 p-8 rounded-3xl border border-sky-100 text-center space-y-4 shadow-xs">
        <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
          <Headphones className="w-3.5 h-3.5" />
          <span>Lắng nghe và bắt đúng từ</span>
        </span>

        {/* Big Audio Wave Button */}
        <div className="py-2">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => playTargetAudio(currentQ.targetWord.word)}
            className={`w-24 h-24 rounded-full shadow-lg flex items-center justify-center mx-auto text-white transition-all ${
              isPlayingAudio
                ? "bg-gradient-to-r from-sky-400 to-indigo-500 ring-8 ring-sky-200 animate-pulse"
                : "bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-sky-500/25"
            }`}
            title="Nhấn để nghe lại phát âm"
          >
            <Volume2 className="w-10 h-10" />
          </motion.button>
          <p className="text-xs font-semibold text-gray-500 mt-2">
            Chạm vào loa để nghe lại phát âm
          </p>
        </div>

        {/* Word Options: 4 choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = selectedWordId === opt.id;
            const isCorrect = opt.id === currentQ.correctWordId;

            let btnStyle =
              "bg-white border-gray-200 text-gray-800 hover:border-sky-300 hover:bg-sky-50/40";
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
                key={opt.id}
                disabled={isAnswered}
                onClick={() =>
                  isRetry ? handleSelectOptionRetry(opt) : handleSelectOptionMain(opt)
                }
                whileHover={!isAnswered ? { scale: 1.02 } : {}}
                whileTap={!isAnswered ? { scale: 0.98 } : {}}
                className={`p-4 rounded-2xl font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer select-none ${btnStyle}`}
              >
                <span className="text-base sm:text-lg">{opt.word}</span>
                <span className={`text-xs ${isAnswered && (isCorrect || isSelected) ? "text-white/90" : "text-gray-500"}`}>
                  {opt.meaning_vi}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
