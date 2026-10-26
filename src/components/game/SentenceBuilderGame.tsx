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
  Undo2,
  Trash2,
  Check,
} from "lucide-react";
import { MiniGameWord } from "@/types/game";
import { speakWord } from "@/lib/audio/tts";
import { Button } from "@/components/ui/Button";

interface SentenceBuilderGameProps {
  words: MiniGameWord[];
  onFinish: (result: {
    score: number;
    accuracy: number;
    wordsPlayed: number;
    durationSeconds: number;
  }) => void;
  onExit: () => void;
}

interface SentenceQuestion {
  id: string;
  targetWord: MiniGameWord;
  rawSentence: string;
  translationVi: string;
  tokens: string[]; // clean words in correct order
}

export function SentenceBuilderGame({ words, onFinish, onExit }: SentenceBuilderGameProps) {
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [availableTokens, setAvailableTokens] = useState<{ id: string; text: string }[]>([]);
  const [placedTokens, setPlacedTokens] = useState<{ id: string; text: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const [hintedTokenId, setHintedTokenId] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Retry queue
  const [phase, setPhase] = useState<"main" | "retry_intro" | "retry">("main");
  const [missedQuestions, setMissedQuestions] = useState<SentenceQuestion[]>([]);
  const [retryIndex, setRetryIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to build sentence question
  const buildSentence = (item: MiniGameWord): SentenceQuestion | null => {
    let sentence = item.example_en;
    let translation = item.example_vi;

    // If no example sentence or too short or too long, generate clean contextual sentence
    if (!sentence || sentence.split(" ").length < 4 || sentence.split(" ").length > 10) {
      sentence = `We need to practice ${item.word} everyday`;
      translation = `Chúng ta cần luyện tập ${item.meaning_vi} mỗi ngày.`;
    }

    if (!translation || translation.trim() === "" || translation.startsWith("Ghép câu hoàn chỉnh")) {
      translation = `Đang nạp nghĩa câu cho từ "${item.word}"...`;
    }

    // Clean sentence tokens (strip ending punctuation for chips, but keep text)
    const rawTokens = sentence
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .trim()
      .split(/\s+/);

    if (rawTokens.length < 3) return null;

    return {
      id: item.id,
      targetWord: item,
      rawSentence: sentence,
      translationVi: translation,
      tokens: rawTokens,
    };
  };

  // Init questions
  useEffect(() => {
    if (!words || words.length === 0) return;

    const qs: SentenceQuestion[] = [];
    for (const w of words) {
      const q = buildSentence(w);
      if (q) qs.push(q);
      if (qs.length >= 6) break;
    }

    setQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setCombo(1);
    setFirstTryCorrect(0);
    setSeconds(0);
    setPhase("main");
    setMissedQuestions([]);
    setRetryIndex(0);
    setHintedTokenId(null);
    setHintMessage(null);

    // Asynchronously enrich any missing translation from /api/game/translate
    qs.forEach((q, idx) => {
      if (q.translationVi.startsWith("Đang nạp nghĩa") || !q.targetWord.example_vi) {
        fetch(`/api/game/translate?q=${encodeURIComponent(q.rawSentence)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.translation) {
              setQuestions((prev) => {
                const updated = [...prev];
                if (updated[idx]) {
                  updated[idx] = { ...updated[idx], translationVi: data.translation };
                }
                return updated;
              });
            }
          })
          .catch(() => {});
      }
    });
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

  // Setup tokens for current question
  const currentQ = phase === "retry" ? missedQuestions[retryIndex] : questions[currentIndex];

  useEffect(() => {
    if (currentQ) {
      const tokenObjects = currentQ.tokens.map((text, idx) => ({
        id: `${currentQ.id}-${idx}-${text}`,
        text,
      }));
      setAvailableTokens([...tokenObjects].sort(() => Math.random() - 0.5));
      setPlacedTokens([]);
      setStatus("idle");
    }
  }, [currentIndex, phase, retryIndex, currentQ]);

  // Move token to placed area
  const handlePlaceToken = (token: { id: string; text: string }) => {
    if (status === "correct") return;
    setAvailableTokens((prev) => prev.filter((t) => t.id !== token.id));
    setPlacedTokens((prev) => [...prev, token]);
    setStatus("idle");
    if (token.id === hintedTokenId) {
      setHintedTokenId(null);
      setHintMessage(null);
    }
  };

  // Move token back to available bank
  const handleReturnToken = (token: { id: string; text: string }) => {
    if (status === "correct") return;
    setPlacedTokens((prev) => prev.filter((t) => t.id !== token.id));
    setAvailableTokens((prev) => [...prev, token]);
    setStatus("idle");
    setHintedTokenId(null);
    setHintMessage(null);
  };

  // Clear all placed
  const handleResetSlots = () => {
    if (status === "correct" || !currentQ) return;
    const allTokens = currentQ.tokens.map((text, idx) => ({
      id: `${currentQ.id}-${idx}-${text}`,
      text,
    }));
    setAvailableTokens([...allTokens].sort(() => Math.random() - 0.5));
    setPlacedTokens([]);
    setStatus("idle");
    setHintedTokenId(null);
    setHintMessage(null);
  };

  // Smart Hint: identify next expected token
  const handleGetHint = () => {
    if (!currentQ || availableTokens.length === 0) return;

    const expectedIndex = placedTokens.length;
    const expectedToken = currentQ.tokens[expectedIndex];
    if (!expectedToken) return;

    const match = availableTokens.find(
      (t) => t.text.toLowerCase() === expectedToken.toLowerCase()
    );

    if (match) {
      setHintedTokenId(match.id);
      setHintMessage(`💡 Từ tiếp theo là: "${match.text}" (đã làm sáng nổi bật màu vàng)`);
    } else {
      setHintMessage(`💡 Gợi ý câu bắt đầu bằng từ: "${currentQ.tokens[0]}"`);
    }
  };

  // Auto-place next word from hint
  const handleAutoPlaceNextWord = () => {
    if (!currentQ || availableTokens.length === 0) return;
    const expectedIndex = placedTokens.length;
    const expectedToken = currentQ.tokens[expectedIndex];
    if (!expectedToken) return;

    const match = availableTokens.find(
      (t) => t.text.toLowerCase() === expectedToken.toLowerCase()
    );

    if (match) {
      handlePlaceToken(match);
      setHintedTokenId(null);
      setHintMessage(null);
    }
  };

  // Check sentence
  const handleCheckSentence = () => {
    if (!currentQ || placedTokens.length !== currentQ.tokens.length) return;

    const userSentence = placedTokens.map((t) => t.text.toLowerCase()).join(" ");
    const expectedSentence = currentQ.tokens.map((t) => t.toLowerCase()).join(" ");

    const isMatch = userSentence === expectedSentence;

    if (isMatch) {
      setStatus("correct");
      speakWord(currentQ.rawSentence);
      const points = 15 * combo;
      setScore((s) => s + points);
      if (phase === "main") {
        setFirstTryCorrect((c) => c + 1);
      }
      setCombo((c) => Math.min(c + 1, 5));

      setTimeout(() => {
        advanceNext(true);
      }, 1200);
    } else {
      setStatus("wrong");
      setCombo(1);

      if (phase === "main") {
        setMissedQuestions((prev) => {
          if (!prev.some((m) => m.id === currentQ.id)) {
            return [...prev, currentQ];
          }
          return prev;
        });
      }

      setTimeout(() => {
        advanceNext(false);
      }, 1200);
    }
  };

  const advanceNext = (wasCorrect: boolean) => {
    if (phase === "main") {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Main phase done
        const allMissed = wasCorrect ? missedQuestions : [...missedQuestions, currentQ];
        if (allMissed.length > 0) {
          setMissedQuestions(allMissed);
          setPhase("retry_intro");
        } else {
          finishGame(questions.length);
        }
      }
    } else {
      // Retry phase
      if (wasCorrect) {
        const remaining = missedQuestions.filter((q) => q.id !== currentQ.id);
        setMissedQuestions(remaining);
        if (remaining.length === 0) {
          finishGame(firstTryCorrect);
        } else {
          setRetryIndex(0);
        }
      } else {
        // Put to end of queue to retry again
        const remaining = missedQuestions.filter((q) => q.id !== currentQ.id);
        setMissedQuestions([...remaining, currentQ]);
        setRetryIndex(0);
      }
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
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
          ✍️
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Vòng Hoàn Thiện Cấu Trúc Câu
          </span>
          <h2 className="text-2xl font-black text-gray-900">
            Còn {missedQuestions.length} câu cần ghép lại!
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Bé Thỏ sẽ đồng hành cùng bạn xếp lại những câu này cho đến khi chính xác 100% ngữ pháp nhé.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => {
            setRetryIndex(0);
            setPhase("retry");
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Bắt đầu hoàn thiện ({missedQuestions.length} câu)
        </Button>
      </div>
    );
  }

  if (!currentQ) return null;

  const isRetry = phase === "retry";
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
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Luyện lại: còn {missedQuestions.length} câu</span>
            </span>
          )}

          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Điểm</p>
            <p className="text-lg font-black text-indigo-600 leading-none">{score}</p>
          </div>
        </div>
      </div>

      {/* Main Sentence Board */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
            {isRetry ? "Xếp lại câu cho đúng" : `Câu ${currentDisplayIndex} / ${totalDisplay}`}
          </span>
          <button
            onClick={() => speakWord(currentQ.rawSentence)}
            className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Nghe câu mẫu"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Vietnamese Meaning Prompt */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Nghĩa câu cần ghép:
          </p>
          <p className="text-base sm:text-lg font-extrabold text-gray-900">
            "{currentQ.translationVi}"
          </p>
          <div className="pt-1">
            <span className="inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              Từ trọng tâm: <strong className="font-black text-emerald-900">{currentQ.targetWord.word}</strong> ({currentQ.targetWord.meaning_vi})
            </span>
          </div>
        </div>

        {/* Sentence Slot Area */}
        <div
          className={`min-h-[72px] p-4 rounded-2xl border-2 transition-all flex flex-wrap items-center gap-2 ${
            status === "correct"
              ? "bg-emerald-50 border-emerald-500 shadow-sm"
              : status === "wrong"
              ? "bg-rose-50 border-rose-400"
              : "bg-gray-50 border-dashed border-gray-300"
          }`}
        >
          {placedTokens.length === 0 && (
            <span className="text-xs text-gray-400 mx-auto select-none">
              Chạm vào các từ bên dưới để ghép vào đây
            </span>
          )}

          {placedTokens.map((token) => (
            <motion.button
              key={token.id}
              layout
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleReturnToken(token)}
              className="bg-white px-3.5 py-1.5 rounded-xl border-2 border-indigo-200 text-indigo-950 font-bold text-sm shadow-2xs hover:border-red-300 hover:text-red-600 transition-colors cursor-pointer"
            >
              {token.text}
            </motion.button>
          ))}
        </div>

        {/* Available Word Chips Pool */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Các từ có sẵn:
            </p>
            <span className="text-[11px] text-gray-500 font-medium">
              💡 Bắt đầu bằng: <strong className="text-emerald-700 font-bold">{currentQ.tokens[0]}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 min-h-[54px] p-2.5 bg-gray-50/70 rounded-2xl border border-gray-100">
            {availableTokens.map((token) => {
              const isHinted = token.id === hintedTokenId;
              return (
                <motion.button
                  key={token.id}
                  layout
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handlePlaceToken(token)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm shadow-xs cursor-pointer select-none transition-all ${
                    isHinted
                      ? "bg-amber-100 border-2 border-amber-500 text-amber-950 ring-4 ring-amber-300 animate-pulse scale-105"
                      : "bg-white border border-gray-200 hover:border-indigo-400 text-gray-800"
                  }`}
                >
                  {isHinted && <span className="mr-1">👉</span>}
                  {token.text}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Hint Notification Banner */}
        {hintMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold px-4 py-2 rounded-xl shadow-2xs"
          >
            <span>{hintMessage}</span>
            <button
              onClick={handleAutoPlaceNextWord}
              className="text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-2.5 py-1 rounded-lg ml-2 shrink-0 cursor-pointer shadow-2xs transition-colors"
            >
              Đặt từ giúp tôi ✨
            </button>
          </motion.div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetSlots}
              disabled={placedTokens.length === 0 || status === "correct"}
              className="text-xs text-gray-500 hover:text-red-600"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Làm lại
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGetHint}
              disabled={availableTokens.length === 0 || status === "correct"}
              className="text-xs text-amber-700 bg-amber-50/70 border-amber-200 hover:bg-amber-100 font-bold"
              leftIcon={<span>💡</span>}
            >
              Gợi ý từ kế tiếp
            </Button>
          </div>

          <Button
            size="md"
            onClick={handleCheckSentence}
            disabled={placedTokens.length !== currentQ.tokens.length || status === "correct"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 shadow-sm"
            leftIcon={<Check className="w-4 h-4" />}
          >
            Kiểm tra câu
          </Button>
        </div>

        {/* Status Feedback */}
        {status === "correct" && (
          <p className="text-xs text-emerald-600 font-bold text-center animate-in fade-in flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Chính xác hoàn hảo! Chuẩn cấu trúc ngữ pháp.</span>
          </p>
        )}
        {status === "wrong" && (
          <p className="text-xs text-rose-600 font-bold text-center animate-in fade-in flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4" />
            <span>Thứ tự từ chưa chính xác! Sẽ được luyện lại ở cuối vòng.</span>
          </p>
        )}
      </div>
    </div>
  );
}
