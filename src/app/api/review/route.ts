import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fsrsSchedule, selfRatingToFSRS, FSRSCard } from "@/lib/spaced-repetition/fsrs";
import { z } from "zod";

const ReviewSchema = z.object({
  vocabularyItemId: z.string().uuid(),
  selfRating: z.enum(["again", "hard", "good", "easy"]),
  isCorrect: z.boolean(),
  responseType: z.string(),
  sessionId: z.string().uuid().optional(),
  durationMs: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const { vocabularyItemId, selfRating, isCorrect, responseType, sessionId, durationMs } = parsed.data;

    // Get existing progress
    const { data: existing } = await supabase
      .from("user_vocabulary_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("vocabulary_item_id", vocabularyItemId)
      .single();

    const card: FSRSCard = existing
      ? {
          state: existing.fsrs_state as 0 | 1 | 2 | 3,
          stability: existing.stability,
          difficulty: existing.difficulty,
          elapsed_days: existing.elapsed_days,
          scheduled_days: existing.scheduled_days,
          reps: existing.reps,
          lapses: existing.lapses,
          last_review: existing.last_reviewed_at ? new Date(existing.last_reviewed_at) : null,
        }
      : { state: 0, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, last_review: null };

    const rating = selfRatingToFSRS(selfRating);
    const { card: newCard, next_review } = fsrsSchedule(card, rating);

    // Determine learning status
    let learningStatus = "new";
    if (newCard.state === 1) learningStatus = "learning";
    else if (newCard.state === 2) learningStatus = newCard.reps >= 3 && newCard.stability > 20 ? "mastered" : "review";
    else if (newCard.state === 3) learningStatus = "relearning";

    const progressData = {
      user_id: user.id,
      vocabulary_item_id: vocabularyItemId,
      learning_status: learningStatus,
      times_seen: (existing?.times_seen ?? 0) + 1,
      times_correct: (existing?.times_correct ?? 0) + (isCorrect ? 1 : 0),
      times_incorrect: (existing?.times_incorrect ?? 0) + (isCorrect ? 0 : 1),
      last_reviewed_at: new Date().toISOString(),
      next_review_at: next_review.toISOString(),
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      reps: newCard.reps,
      lapses: newCard.lapses,
      fsrs_state: newCard.state,
    };

    if (existing) {
      await supabase.from("user_vocabulary_progress").update(progressData).eq("id", existing.id);
    } else {
      await supabase.from("user_vocabulary_progress").insert(progressData);
    }

    // Log review
    await supabase.from("review_logs").insert({
      user_id: user.id,
      vocabulary_item_id: vocabularyItemId,
      session_id: sessionId ?? null,
      response_type: responseType,
      is_correct: isCorrect,
      self_rating: selfRating,
      response_duration_ms: durationMs ?? null,
    });

    return NextResponse.json({ next_review: next_review.toISOString(), learning_status: learningStatus, scheduled_days: newCard.scheduled_days });
  } catch (err) {
    console.error("Review error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: fetch due words for review
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date().toISOString();
    const { data: dueProgress } = await supabase
      .from("user_vocabulary_progress")
      .select("vocabulary_item_id, next_review_at, learning_status")
      .eq("user_id", user.id)
      .lte("next_review_at", now)
      .order("next_review_at", { ascending: true })
      .limit(50);

    if (!dueProgress?.length) return NextResponse.json({ words: [], counts: { due: 0, overdue: 0 } });

    const vocabIds = dueProgress.map(p => p.vocabulary_item_id);
    const { data: words } = await supabase
      .from("vocabulary_items")
      .select("*")
      .in("id", vocabIds);

    const overdueCount = dueProgress.filter(p =>
      p.next_review_at && new Date(p.next_review_at) < new Date(Date.now() - 86400000)
    ).length;

    return NextResponse.json({ words: words ?? [], counts: { due: dueProgress.length, overdue: overdueCount } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
