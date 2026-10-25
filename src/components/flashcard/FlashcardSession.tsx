"use client";
import { useState, useEffect, useCallback } from "react";
import { Volume2, ChevronLeft, ChevronRight, Bookmark, Sparkles, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
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
  isSubmitting?: boolean;
  lessonId?: string;
}



export function FlashcardSession({
  items,
  accent,
  onComplete,
  isSubmitting = false,
  lessonId,
}: FlashcardProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [speaking, setSpeaking] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const current = items[currentIdx];
  const progress = items.length > 0 ? (currentIdx / items.length) * 100 : 0;
  const speechSupported = isSpeechSupported();

  useEffect(() => {
    setFlipped(false);
    setImgError(false);
    setImgLoading(true);
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
        className="cursor-pointer transition-all duration-300 min-h-[380px] bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col justify-between hover:shadow-md hover:border-indigo-200"
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          /* Front */
          <div className="flex-1 flex flex-col justify-between select-none">
            {/* Top Bar: Bookmark on right */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar();
                }}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  starredIds.has(current.id)
                    ? "text-amber-500 bg-amber-50"
                    : "text-gray-300 hover:text-amber-500 hover:bg-gray-50"
                )}
                title="Đánh dấu từ quan trọng"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            {/* Middle: Centered Part of speech, Word, clear IPA, and centered voice pronunciation button */}
            <div className="my-auto text-center flex flex-col items-center justify-center gap-3 py-6">
              {current.part_of_speech && (
                <div className="flex justify-center">
                  <Badge variant="purple" size="md">
                    {current.part_of_speech}
                  </Badge>
                </div>
              )}

              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                {current.word}
              </h2>

              {current.ipa && (
                <p className="text-indigo-600 font-mono text-xl font-medium tracking-wide">
                  /{current.ipa.replace(/^\/+|\/+$/g, "")}/
                </p>
              )}

              {/* Voice button centered directly below IPA */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(current.word);
                  }}
                  className={cn(
                    "mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer",
                    speaking && "ring-2 ring-indigo-400 bg-indigo-100 animate-pulse"
                  )}
                  title="Bấm để nghe phát âm (hoặc phím P)"
                >
                  <Volume2
                    className={cn(
                      "w-4 h-4",
                      speaking ? "text-indigo-600 animate-bounce" : "text-indigo-600"
                    )}
                  />
                  <span>{speaking ? "Đang phát âm..." : "Phát âm"}</span>
                </button>
              )}
            </div>

            {/* Bottom helper */}
            <div className="pt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100">
              <span>Nhấn thẻ hoặc bấm Space để xem nghĩa</span>
              <span>Phím P: Phát âm</span>
            </div>
          </div>
        ) : (
          /* Back */
          <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-200">
            {/* Back Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-gray-900">{current.word}</h3>
                    {current.part_of_speech && (
                      <Badge variant="purple" size="sm">
                        {current.part_of_speech}
                      </Badge>
                    )}
                  </div>
                  {current.ipa && (
                    <p className="text-indigo-600 font-mono text-sm mt-0.5 font-medium">
                      /{current.ipa.replace(/^\/+|\/+$/g, "")}/
                    </p>
                  )}
                </div>
              </div>
              {speechSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(current.word);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition-colors",
                    speaking && "opacity-50"
                  )}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe lại</span>
                </button>
              )}
            </div>

            <div className="py-4 space-y-3.5 flex-1">
              {/* Illustration Image: Only show if item actually has image_url */}
              {current.image_url && !imgError && (
                <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-xs group">
                  <img
                    src={current.image_url}
                    alt={current.word}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] text-white font-medium flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Hình ảnh minh họa</span>
                  </div>
                </div>
              )}

              {current.meaning_vi && (
                <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100/60">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                    Nghĩa Tiếng Việt
                  </p>
                  <p className="text-lg font-bold text-gray-900">{current.meaning_vi}</p>
                </div>
              )}

              {current.definition_en && (
                <div className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-xl">
                  <span className="font-semibold text-gray-900">Định nghĩa tiếng Anh: </span>
                  {current.definition_en}
                </div>
              )}

              {current.example_en && (
                <div className="text-sm text-gray-700 bg-gray-50/80 p-3.5 rounded-xl space-y-1">
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
              <span>Bấm Space để lật lại mặt trước</span>
              <span>HabitRabbit Visual Flashcards</span>
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
          disabled={currentIdx === 0 || isSubmitting}
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
            loading={isSubmitting && currentIdx === items.length - 1}
            disabled={isSubmitting}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            {currentIdx < items.length - 1 ? (
              "Từ tiếp theo"
            ) : isSubmitting ? (
              "Đang chuyển..."
            ) : (
              "Chuyển sang Luyện tập"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}