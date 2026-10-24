"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { PageLoader } from "@/components/ui/Spinner";
import { VocabularyItem } from "@/types";

export default function LessonPracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`);
        const data = await res.json();
        if (res.ok && data.items) {
          setItems(data.items);
        }
      } catch (err) {
        console.error("Lỗi tải bài luyện tập:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
  }, [id]);

  const handleComplete = async (_results: { itemId: string; isCorrect: boolean }[]) => {
    try {
      await fetch(`/api/lessons/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "practice_completed" }),
      });
    } catch {}
    router.push(`/lessons/${id}/complete`);
  };

  if (loading) return <PageLoader text="Đang chuẩn bị câu hỏi luyện tập..." />;

  return (
    <div className="max-w-2xl mx-auto py-4">
      <PracticeSession items={items} onComplete={handleComplete} />
    </div>
  );
}