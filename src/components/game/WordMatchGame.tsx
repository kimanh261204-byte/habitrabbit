"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Clock,
  Zap,
  ArrowRight,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { MiniGameWord } from "@/types/game";
import { speakWord } from "@/lib/audio/tts";
import { Button } from "@/components/ui/Button";

interface WordMatchGameProps {
  words: MiniGameWord[];
  onFinish: (result: {
    score: number;
    accuracy: number;
    wordsPlayed: number;
    durationSeconds: number;
  }) => void;
  onExit: () => void;
  onLoadMoreWords?: () => Promise<MiniGameWord[]>;
}

interface Tile {
  id: string;
  wordId: string;
  text: string;
  partOfSpeech?: string | null;
  type: "en" | "vi";
  isMatched: boolean;
  isError: boolean;
}

export function WordMatchGame({ words, onFinish, onExit }: WordMatchGameProps) {
  const [roundWords, setRoundWords] = useState<MiniGameWord[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [enTiles, setEnTiles] = useState<Tile[]>([]);
  const [viTiles, setViTiles] = useState<Tile[]>([]);
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedVi, setSelectedVi] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [matchesCount, setMatchesCount] = useState(0);
  const [totalMatchesAllRounds, setTotalMatchesAllRounds] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [praiseText, setPraiseText] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const poolIndexRef = useRef(0);

  // Setup round from pool of words
  const setupRound = (roundNum: number, startWordIndex: number) => {
    const safeSlice = words.slice(startWordIndex, startWordIndex + 6);
    // If we reached end of word pool, loop around with shuffle
    const roundList = safeSlice.length >= 4 ? safeSlice : words.slice(0, 6);
    setRoundWords(roundList);

    const en: Tile[] = roundList.map((w) => ({
      id: `en-${w.id}-${roundNum}`,
      wordId: w.id,
      text: w.word,
      partOfSpeech: w.part_of_speech,
      type: "en",
      isMatched: false,
      isError: false,
    }));
    const vi: Tile[] = roundList.map((w) => ({
      id: `vi-${w.id}-${roundNum}`,
      wordId: w.id,
      text: w.meaning_vi,
      partOfSpeech: w.part_of_speech,
      type: "vi",
      isMatched: false,
      isError: false,
    }));

    setEnTiles([...en].sort(() => Math.random() - 0.5));
    setViTiles([...vi].sort(() => Math.random() - 0.5));
    setSelectedEn(null);
    setSelectedVi(null);
    setMatchesCount(0);
    setRoundComplete(false);
  };

  useEffect(() => {
    poolIndexRef.current = 0;
    setCurrentRound(1);
    setScore(0);
    setCombo(1);
    setTotalMatchesAllRounds(0);
    setWrongAttempts(0);
    setSeconds(0);
    setupRound(1, 0);
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

  const handleTileClick = (tile: Tile) => {
    if (tile.isMatched) return;

    if (tile.type === "en") {
      speakWord(tile.text);
      if (selectedEn === tile.id) {
        setSelectedEn(null);
      } else {
        setSelectedEn(tile.id);
        if (selectedVi) {
          checkMatch(tile.id, selectedVi);
        }
      }
    } else {
      if (selectedVi === tile.id) {
        setSelectedVi(null);
      } else {
        setSelectedVi(tile.id);
        if (selectedEn) {
          checkMatch(selectedEn, tile.id);
        }
      }
    }
  };

  const checkMatch = (enTileId: string, viTileId: string) => {
    const enTile = enTiles.find((t) => t.id === enTileId);
    const viTile = viTiles.find((t) => t.id === viTileId);

    if (!enTile || !viTile) return;

    if (enTile.wordId === viTile.wordId) {
      // MATCH
      const currentCombo = combo;
      const points = 10 * currentCombo;
      setScore((s) => s + points);
      setTotalMatchesAllRounds((t) => t + 1);

      // Trigger praise on combo
      const praises = ["⚡ Nhanh nhẹn!", "🔥 Tuyệt vời!", "🌟 Xuất sắc!", "👑 Đỉnh cao!"];
      if (currentCombo >= 2) {
        const text = praises[Math.min(currentCombo - 2, praises.length - 1)];
        setPraiseText(text);
        setTimeout(() => setPraiseText(null), 1200);
      }

      setCombo((c) => Math.min(c + 1, 5));

      setEnTiles((prev) =>
        prev.map((t) => (t.id === enTileId ? { ...t, isMatched: true } : t))
      );
      setViTiles((prev) =>
        prev.map((t) => (t.id === viTileId ? { ...t, isMatched: true } : t))
      );
      setSelectedEn(null);
      setSelectedVi(null);

      const nextMatches = matchesCount + 1;
      setMatchesCount(nextMatches);

      if (nextMatches >= roundWords.length) {
        // Round complete!
        setRoundComplete(true);
      }
    } else {
      // Mismatch
      setWrongAttempts((w) => w + 1);
      setCombo(1);

      setEnTiles((prev) =>
        prev.map((t) => (t.id === enTileId ? { ...t, isError: true } : t))
      );
      setViTiles((prev) =>
        prev.map((t) => (t.id === viTileId ? { ...t, isError: true } : t))
      );

      setTimeout(() => {
        setEnTiles((prev) =>
          prev.map((t) => (t.id === enTileId ? { ...t, isError: false } : t))
        );
        setViTiles((prev) =>
          prev.map((t) => (t.id === viTileId ? { ...t, isError: false } : t))
        );
        setSelectedEn(null);
        setSelectedVi(null);
      }, 500);
    }
  };

  const handleNextRound = () => {
    const nextRoundIndex = poolIndexRef.current + 6;
    poolIndexRef.current = nextRoundIndex;
    const nextRoundNumber = currentRound + 1;
    setCurrentRound(nextRoundNumber);
    setupRound(nextRoundNumber, nextRoundIndex);
  };

  const handleFinishAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalAttempts = totalMatchesAllRounds + wrongAttempts;
    const accuracy = totalAttempts > 0 ? Math.round((totalMatchesAllRounds / totalAttempts) * 100) : 100;

    onFinish({
      score,
      accuracy,
      wordsPlayed: totalMatchesAllRounds,
      durationSeconds: seconds,
    });
  };

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

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl">
              Vòng {currentRound}
            </span>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.2, 1] }}
                className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200"
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Combo {combo}x</span>
              </motion.div>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Điểm</p>
            <p className="text-lg font-black text-indigo-600 leading-none">{score}</p>
          </div>
        </div>
      </div>

      {/* Praise Toast */}
      <AnimatePresence>
        {praiseText && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1.1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            className="text-center font-black text-sm sm:text-base text-amber-500 flex items-center justify-center gap-1.5"
          >
            <span>{praiseText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress info */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
        <span>Vòng {currentRound}: Ghép đúng {matchesCount} / {roundWords.length} cặp</span>
        <span className="text-indigo-600 font-bold">Chạm vào từ tiếng Anh rồi chạm vào nghĩa tiếng Việt</span>
      </div>

      {/* Round Finished Celebration Card */}
      {roundComplete ? (
        <div className="bg-emerald-50/80 border border-emerald-200 p-6 rounded-3xl text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
            🎉
          </div>
          <div>
            <h3 className="text-xl font-black text-emerald-950">
              Xuất sắc hoàn thành Vòng {currentRound}!
            </h3>
            <p className="text-xs text-emerald-800 mt-1">
              Bạn đã ghép chuẩn xác cả {roundWords.length} cặp từ vựng.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
            <Button
              size="md"
              onClick={handleNextRound}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Chơi tiếp Vòng {currentRound + 1} (6 từ mới)
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleFinishAll}
              className="font-bold text-xs"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Tổng kết & Nhận thưởng
            </Button>
          </div>
        </div>
      ) : (
        /* 2 Column Matching Board */
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* English Column */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
              Từ Tiếng Anh
            </p>
            {enTiles.map((tile) => {
              const isSelected = selectedEn === tile.id;
              return (
                <motion.button
                  key={tile.id}
                  type="button"
                  disabled={tile.isMatched}
                  onClick={() => handleTileClick(tile)}
                  animate={tile.isError ? { x: [-6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className={`w-full min-h-[58px] p-3.5 rounded-2xl font-bold text-sm sm:text-base border-2 transition-all flex items-center justify-center gap-2 text-center cursor-pointer select-none ${
                    tile.isMatched
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-400 opacity-40 cursor-not-allowed scale-[0.98]"
                      : tile.isError
                      ? "bg-rose-50 border-rose-400 text-rose-700"
                      : isSelected
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm scale-[1.02]"
                      : "bg-white border-gray-100 hover:border-indigo-200 text-gray-800 hover:bg-indigo-50/30 shadow-xs"
                  }`}
                >
                  <span>{tile.text}</span>
                  {tile.isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </motion.button>
              );
            })}
          </div>

          {/* Vietnamese Column */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
              Nghĩa Tiếng Việt
            </p>
            {viTiles.map((tile) => {
              const isSelected = selectedVi === tile.id;
              return (
                <motion.button
                  key={tile.id}
                  type="button"
                  disabled={tile.isMatched}
                  onClick={() => handleTileClick(tile)}
                  animate={tile.isError ? { x: [-6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className={`w-full min-h-[58px] p-3.5 rounded-2xl font-medium text-xs sm:text-sm border-2 transition-all flex items-center justify-center gap-2 text-center cursor-pointer select-none ${
                    tile.isMatched
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-400 opacity-40 cursor-not-allowed scale-[0.98]"
                      : tile.isError
                      ? "bg-rose-50 border-rose-400 text-rose-700"
                      : isSelected
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm scale-[1.02]"
                      : "bg-white border-gray-100 hover:border-indigo-200 text-gray-700 hover:bg-indigo-50/30 shadow-xs"
                  }`}
                >
                  <span className="line-clamp-2">{tile.text}</span>
                  {tile.isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
