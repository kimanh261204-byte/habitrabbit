"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FlashcardSession } from "@/components/flashcard/FlashcardSession";
import { PageLoader } from "@/components/ui/Spinner";
import { VocabularyItem } from "@/types";

export default function LessonLearnPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accent, setAccent] = useState<"us" | "uk">("us");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from("user_settings")
            .select("preferred_accent")
            .eq("user_id", user.id)
            .single();
          if (settings?.preferred_accent) {
            setAccent(settings.preferred_accent as "us" | "uk");
          }
        }

        // Fetch lesson items from API route
        const res = await fetch(`/api/lessons/${id}`);
        const data = await res.json();
        if (res.ok && data.items) {
          setItems(data.items);
        }

        // Mark lesson status as learning
        fetch(`/api/lessons/${id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "learning" }),
        }).catch(() => {});
      } catch (err) {
        console.error("Lỗi tải bài học:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
  }, [id]);

  const handleComplete = (seenIds: string[]) => {
    if (submitting) return;
    setSubmitting(true);

    // Run review updates asynchronously in parallel without blocking navigation
    if (seenIds.length > 0) {
      Promise.allSettled(
        seenIds.map((itemId) =>
          fetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vocabularyItemId: itemId,
              selfRating: "good",
              isCorrect: true,
              responseType: "flashcard",
            }),
          })
        )
      ).catch(() => {});
    }

    // Navigate immediately to practice
    router.push(`/lessons/${id}/practice`);
  };

  if (loading) return <PageLoader text="Đang tải dữ liệu bài học..." />;

  return (
    <div className="max-w-2xl mx-auto py-4">
      <FlashcardSession
        items={items}
        accent={accent}
        onComplete={handleComplete}
        isSubmitting={submitting}
        lessonId={id}
      />
    </div>
  );
}