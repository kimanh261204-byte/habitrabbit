"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Zap, Sparkles, Volume2, Star, CheckCircle2 } from "lucide-react";
import { MiniGameWord } from "@/types/game";
import { speakWord } from "@/lib/audio/tts";

interface MemoryFlipGameProps {
  words: MiniGameWord[];
  onFinish: (result: {
    score: number;
    accuracy: number;
    wordsPlayed: number;
    durationSeconds: number;
  }) => void;
  onExit: () => void;
}

interface MemoryCard {
  id: string;
  wordId: string;
  text: string;
  ipa?: string | null;
  type: "en" | "vi";
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryFlipGame({ words, onFinish, onExit }: MemoryFlipGameProps) {
  const [pairCount, setPairCount] = useState<4 | 6 | 8>(6);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [matchToast, setMatchToast] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize cards
  const initBoard = (count: number) => {
    if (!words || words.length === 0) return;

    // Pick 'count' words
    const list = words.slice(0, count);
    const cardPool: MemoryCard[] = [];

    list.forEach((w) => {
      cardPool.push({
        id: `en-${w.id}`,
        wordId: w.id,
        text: w.word,
        ipa: w.ipa,
        type: "en",
        isFlipped: false,
        isMatched: false,
      });
      cardPool.push({
        id: `vi-${w.id}`,
        wordId: w.id,
        text: w.meaning_vi,
        type: "vi",
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards([...cardPool].sort(() => Math.random() - 0.5));
    setFlippedIds([]);
    setMatchedCount(0);
    setMoves(0);
    setScore(0);
    setSeconds(0);
  };

  useEffect(() => {
    initBoard(pairCount);
  }, [words, pairCount]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCardClick = (card: MemoryCard) => {
    if (isLocked || card.isFlipped || card.isMatched) return;

    const nextFlipped = [...flippedIds, card.id];
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, isFlipped: true } : c))
    );

    if (card.type === "en") {
      speakWord(card.text);
    }

    if (nextFlipped.length === 1) {
      setFlippedIds(nextFlipped);
    } else if (nextFlipped.length === 2) {
      setFlippedIds(nextFlipped);
      setMoves((m) => m + 1);
      setIsLocked(true);

      const firstCard = cards.find((c) => c.id === nextFlipped[0]);
      const secondCard = card;

      if (firstCard && firstCard.wordId === secondCard.wordId) {
        // MATCH!
        const englishWord = firstCard.type === "en" ? firstCard.text : secondCard.text;
        setMatchToast(`Ghép đúng: ${englishWord}! ✨`);
        setTimeout(() => setMatchToast(null), 1200);

        setScore((s) => s + 25);
        setMatchedCount((m) => {
          const nextMatches = m + 1;
          if (nextMatches === pairCount) {
            finishGame(score + 25, nextMatches, moves + 1);
          }
          return nextMatches;
        });

        setCards((prev) =>
          prev.map((c) =>
            c.id === firstCard.id || c.id === secondCard.id
              ? { ...c, isMatched: true, isFlipped: true }
              : c
          )
        );
        setFlippedIds([]);
        setIsLocked(false);
      } else {
        // NO MATCH -> Flip back after delay
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCard?.id || c.id === secondCard.id
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedIds([]);
          setIsLocked(false);
        }, 850);
      }
    }
  };

  const finishGame = (finalScore: number, pairsMatched: number, totalMoves: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Accuracy formula: 100% if finished in 'pairCount' moves
    const accuracy = Math.min(100, Math.max(30, Math.round((pairsMatched / totalMoves) * 100)));

    setTimeout(() => {
      onFinish({
        score: finalScore,
        accuracy,
        wordsPlayed: pairsMatched,
        durationSeconds: seconds,
      });
    }, 700);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thoát</span>
        </button>

        {/* Board size selector */}
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-semibold text-gray-600">
          <span className="text-[11px] text-gray-400 pl-1.5">Kích thước:</span>
          <button
            onClick={() => setPairCount(4)}
            className={`px-2.5 py-0.5 rounded-lg transition-all ${
              pairCount === 4 ? "bg-white text-indigo-700 font-bold shadow-xs" : "hover:text-gray-900"
            }`}
          >
            4 cặp (8 thẻ)
          </button>
          <button
            onClick={() => setPairCount(6)}
            className={`px-2.5 py-0.5 rounded-lg transition-all ${
              pairCount === 6 ? "bg-white text-indigo-700 font-bold shadow-xs" : "hover:text-gray-900"
            }`}
          >
            6 cặp (12 thẻ)
          </button>
          <button
            onClick={() => setPairCount(8)}
            className={`px-2.5 py-0.5 rounded-lg transition-all ${
              pairCount === 8 ? "bg-white text-indigo-700 font-bold shadow-xs" : "hover:text-gray-900"
            }`}
          >
            8 cặp (16 thẻ)
          </button>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{seconds}s</span>
          </div>

          <div className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-xl">
            Lượt: <span className="text-indigo-600 font-black">{moves}</span>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Điểm</p>
            <p className="text-lg font-black text-indigo-600 leading-none">{score}</p>
          </div>
        </div>
      </div>

      {/* Match Toast Notification */}
      <AnimatePresence>
        {matchToast && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1.05 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            className="text-center font-black text-sm text-emerald-600 flex items-center justify-center gap-1.5"
          >
            <span>{matchToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress info */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
        <span>Đã tìm thấy: {matchedCount} / {pairCount} cặp thẻ</span>
        <span className="text-indigo-600 font-bold">Lật 2 thẻ trùng nghĩa để ghép cặp</span>
      </div>

      {/* Dynamic Grid: 4 cols for 4 or 6 pairs, 4 cols for 8 pairs */}
      <div className={`grid gap-2.5 sm:gap-3.5 ${
        pairCount === 4
          ? "grid-cols-2 sm:grid-cols-4 max-w-xl mx-auto"
          : pairCount === 6
          ? "grid-cols-3 sm:grid-cols-4"
          : "grid-cols-4 sm:grid-cols-4"
      }`}>
        {cards.map((card) => {
          return (
            <motion.div
              key={card.id}
              whileHover={!card.isMatched && !card.isFlipped ? { scale: 1.03 } : {}}
              whileTap={!card.isMatched && !card.isFlipped ? { scale: 0.97 } : {}}
              onClick={() => handleCardClick(card)}
              className="relative h-28 sm:h-32 rounded-2xl cursor-pointer select-none perspective-1000"
            >
              <div
                className={`w-full h-full rounded-2xl border-2 transition-all duration-300 flex items-center justify-center p-2.5 text-center ${
                  card.isMatched
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                    : card.isFlipped
                    ? "bg-indigo-50/90 border-indigo-400 text-indigo-900 shadow-md font-bold"
                    : "bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border-indigo-400 text-white shadow-xs hover:shadow-md"
                }`}
              >
                {card.isFlipped || card.isMatched ? (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                      {card.type === "en" ? "Tiếng Anh" : "Tiếng Việt"}
                    </span>
                    <p className={`text-xs sm:text-sm font-bold line-clamp-2 ${card.type === "en" ? "text-indigo-950 font-black text-sm sm:text-base" : "text-gray-800"}`}>
                      {card.text}
                    </p>
                    {card.type === "en" && card.ipa && (
                      <p className="text-[10px] text-indigo-500 font-mono">
                        /{card.ipa.replace(/^\/+|\/+$/g, "")}/
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 opacity-90">
                    <span className="text-2xl sm:text-3xl">🐰</span>
                    <span className="text-[10px] font-black tracking-wider uppercase opacity-75">Habit</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
