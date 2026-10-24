"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy, RotateCcw, ArrowRight, Home, CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function LessonCompletePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [lesson, setLesson] = useState<{ title: string; word_count: number; library_id: string } | null>(null);
  const [nextLesson, setNextLesson] = useState<{ id: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const confettiFired = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: l } = await supabase
          .from("lessons")
          .select("title, word_count, library_id, order_index")
          .eq("id", id)
          .single();

        if (l) {
          setLesson(l);
          // Mark completed
          await supabase.from("lessons").update({ status: "completed" }).eq("id", id);

          // Find next lesson
          const { data: next } = await supabase
            .from("lessons")
            .select("id, title")
            .eq("library_id", l.library_id)
            .eq("order_index", l.order_index + 1)
            .single();

          setNextLesson(next);
        }
      } catch (err) {
        console.error("Lỗi hoàn thành bài học:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
  }, [id]);

  useEffect(() => {
    if (!loading && !confettiFired.current) {
      confettiFired.current = true;
      import("canvas-confetti")
        .then((m) => {
          m.default({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"],
          });
        })
        .catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center py-12 px-4 space-y-6">
      <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-in zoom-in duration-300">
        <Trophy className="w-12 h-12 text-white" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Xuất sắc hoàn thành! 🎉</h1>
        <p className="text-gray-600">
          Bạn đã chinh phục bài học <strong>"{lesson?.title}"</strong>
        </p>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Toàn bộ {lesson?.word_count} từ vựng mới đã được đưa vào hệ thống lặp lại ngắt quãng FSRS
          để tự động lên lịch ôn tập định kỳ.
        </p>
      </div>

      <Card className="p-5 text-left bg-indigo-50/50 border-indigo-100 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-indigo-900">Mẹo ghi nhớ lâu bền</p>
          <p className="text-xs text-indigo-700/80 mt-0.5">
            Hãy ghé qua mục <strong>Ôn tập SRS</strong> vào ngày mai để kiểm tra lại các từ đã học khi
            não bộ bắt đầu quá trình củng cố trí nhớ!
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-3 pt-2">
        {nextLesson ? (
          <Link href={`/lessons/${nextLesson.id}/learn`}>
            <Button className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Học bài tiếp theo ({nextLesson.title})
            </Button>
          </Link>
        ) : null}

        <Link href="/review">
          <Button variant="secondary" className="w-full" leftIcon={<RotateCcw className="w-4 h-4" />}>
            Xem từ cần ôn tập (SRS)
          </Button>
        </Link>

        {lesson?.library_id && (
          <Link href={`/libraries/${lesson.library_id}`}>
            <Button variant="ghost" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
              Về danh sách bài học
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}