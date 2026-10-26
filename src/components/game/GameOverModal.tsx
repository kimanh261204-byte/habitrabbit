"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Zap, ArrowRight, RotateCcw, Home, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MiniGameWord } from "@/types/game";

interface GameOverModalProps {
  score: number;
  accuracy: number;
  xpEarned: number;
  carrotsEarned: number;
  leveledUp?: boolean;
  newLevel?: number;
  reviewedWords: MiniGameWord[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameOverModal({
  score,
  accuracy,
  xpEarned,
  carrotsEarned,
  leveledUp,
  newLevel,
  reviewedWords,
  onPlayAgain,
  onExit,
}: GameOverModalProps) {
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#6366f1", "#10b981", "#ec4899"],
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 text-center relative overflow-hidden">
        {/* Top Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 bg-gradient-to-b from-amber-200/40 to-transparent blur-xl pointer-events-none" />

        {/* Mascot / Trophy Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Trophy className="w-10 h-10 text-white" />
          {leveledUp && (
            <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white animate-bounce">
              LÊN CẤP {newLevel}! 🎉
            </span>
          )}
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900">Hoàn thành ván chơi! 🎉</h2>
          <p className="text-xs text-gray-500">
            Bé Thỏ rất vui vì bạn đã chăm chỉ luyện tập phản xạ từ vựng!
          </p>
        </div>

        {/* Stat Pills */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase text-indigo-500">Điểm số</p>
            <p className="text-xl font-black text-indigo-950 mt-0.5">{score}</p>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase text-emerald-500">Độ chính xác</p>
            <p className="text-xl font-black text-emerald-950 mt-0.5">{accuracy}%</p>
          </div>
          <div className="bg-orange-50/70 border border-orange-100 p-2.5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase text-orange-500">Phần thưởng</p>
            <p className="text-sm font-black text-orange-950 mt-1 flex items-center justify-center gap-1">
              <span>+{xpEarned} XP</span>
              <span>🥕+{carrotsEarned}</span>
            </p>
          </div>
        </div>

        {/* Vocabulary review preview */}
        {reviewedWords && reviewedWords.length > 0 && (
          <div className="space-y-2 text-left bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 max-h-36 overflow-y-auto text-xs">
            <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Từ vựng vừa ôn trong ván:</span>
            </p>
            <div className="space-y-1">
              {reviewedWords.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-0.5 border-b border-gray-100 last:border-none">
                  <span className="font-bold text-indigo-700">{item.word}</span>
                  <span className="text-gray-600 truncate max-w-[160px] text-right">{item.meaning_vi}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <Button
            size="md"
            onClick={onPlayAgain}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Chơi lại ván mới
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onExit}
              className="text-xs font-semibold"
              leftIcon={<Home className="w-3.5 h-3.5" />}
            >
              Về sảnh Game
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = "/lessons";
              }}
              className="text-xs font-semibold"
              leftIcon={<BookOpen className="w-3.5 h-3.5" />}
            >
              Học bài tiếp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
