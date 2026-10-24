"use client";
import { useState, useEffect, useCallback } from "react";
import { Volume2, ChevronLeft, ChevronRight, Eye, EyeOff, Bookmark } from "lucide-react";
import { VocabularyItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { speakWord, isSpeechSupported } from "@/lib/audio/tts";
import { cn } from "@/lib/utils";

interface FlashcardProps {
  items: VocabularyItem[];
  accent: "us" | "uk";
  onComplete: (seenIds: string[]) => void;
}

export function FlashcardSession({ items, accent, onComplete }: FlashcardProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [speaking, setSpeaking] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const current = items[currentIdx];
  const progress = items.length > 0 ? (currentIdx / items.length) * 100 : 0;
  const speechSupported = isSpeechSupported();

  useEffect(() => {
    setFlipped(false);
    setShowHint(false);
  }, [currentIdx]);

  useEffect(() => {
    if (current) {
      setSeenIds((prev) => new Set([...prev, current.id]));
    }
  }, [current]);

  const handleSpeak = useCallback(
    async (text: string) => {
      if (!speechSupported || speaking) return;
      setSpeaking(true);
      try {
        await speakWord(text, accent);
      } catch {}
      setSpeaking(false);
    },
    [accent, speaking, speechSupported]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === "ArrowRight" && currentIdx < items.length - 1) {
        setCurrentIdx((i) => i + 1);
      }
      if (e.key === "ArrowLeft" && currentIdx > 0) {
        setCurrentIdx((i) => i - 1);
      }
      if (e.key.toLowerCase() === "p" && current?.word) {
        handleSpeak(current.word);
      }
    },
    [currentIdx, items.length, current, handleSpeak]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const goNext = () => {
    if (currentIdx < items.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      onComplete([...seenIds]);
    }
  };

  const toggleStar = () => {
    if (!current) return;
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <Progress value={progress} className="flex-1" />
        <span className="text-sm text-gray-500 shrink-0 font-medium">
          {currentIdx + 1} / {items.length}
        </span>
      </div>

      {/* Flashcard container */}
      <div
        className="cursor-pointer transition-all duration-300 min-h-[340px] bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col justify-between hover:shadow-md hover:border-indigo-200"
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          /* Front */
          <div className="flex-1 flex flex-col justify-between select-none">
            <div className="flex items-center justify-between">
              {current.part_of_speech ? (
                <Badge variant="purple">{current.part_of_speech}</Badge>
              ) : (
                <span />
              )}
              {speechSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(current.word);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="my-auto text-center space-y-3 py-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                {current.word}
              </h2>
              {current.ipa && (
                <div className="flex items-center justify-center gap-2">
                  <p
                    className={cn(
                      "text-indigo-600 font-mono text-lg transition-all",
                      !showHint && "blur-xs select-none"
                    )}
                  >
                    /{current.ipa}/
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint((h) => !h);
                    }}
                    className="text-gray-400 hover:text-indigo-600 p-1"
                    title={showHint ? "Ẩn phiên âm" : "Hiện phiên âm"}
                  >
                    {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100">
              <span>Nhấn thẻ hoặc bấm phím Space để xem nghĩa</span>
              <span>Phím P: Phát âm</span>
            </div>
          </div>
        ) : (
          /* Back */
          <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{current.word}</h3>
                {current.ipa && (
                  <p className="text-indigo-600 font-mono text-sm mt-0.5">/{current.ipa}/</p>
                )}
              </div>
              {speechSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(current.word);
                  }}
                  className={cn(
                    "p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors",
                    speaking && "opacity-50"
                  )}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="py-4 space-y-3.5 flex-1">
              {current.meaning_vi && (
                <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100/60">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                    Nghĩa Tiếng Việt
                  </p>
                  <p className="text-lg font-bold text-gray-900">{current.meaning_vi}</p>
                </div>
              )}

              {current.definition_en && (
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                  <span className="font-semibold text-gray-900">Định nghĩa tiếng Anh: </span>
                  {current.definition_en}
                </div>
              )}

              {current.example_en && (
                <div className="text-sm text-gray-700 bg-gray-50/80 p-3 rounded-xl space-y-1">
                  <p className="italic text-gray-900 font-medium">"{current.example_en}"</p>
                  {current.example_vi && (
                    <p className="text-xs text-gray-500">→ {current.example_vi}</p>
                  )}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeak(current.example_en!);
                      }}
                      className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Nghe ví dụ
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>Bấm Space để lật lại</span>
              <span>VocaFlow Smart Flashcards</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Từ trước
        </Button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleStar}
            className={cn(
              "p-2.5 rounded-xl border transition-colors",
              starredIds.has(current.id)
                ? "text-amber-500 bg-amber-50 border-amber-200"
                : "text-gray-400 border-gray-200 hover:text-amber-500 hover:bg-gray-50"
            )}
            title="Đánh dấu từ quan trọng"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          <Button
            size="md"
            onClick={goNext}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            {currentIdx < items.length - 1 ? "Từ tiếp theo" : "Chuyển sang Luyện tập"}
          </Button>
        </div>
      </div>
    </div>
  );
}