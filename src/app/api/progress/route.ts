import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all user vocabulary progress records
    const { data: progressList } = await supabase
      .from("user_vocabulary_progress")
      .select("*, vocabulary_items(id, word, ipa, meaning_vi)")
      .eq("user_id", user.id);

    const records = progressList || [];
    const now = new Date();
    const nowIso = now.toISOString();

    const counts = {
      total: records.length,
      new: records.filter((r) => r.learning_status === "new").length,
      learning: records.filter((r) => r.learning_status === "learning").length,
      review: records.filter((r) => r.learning_status === "review").length,
      relearning: records.filter((r) => r.learning_status === "relearning").length,
      mastered: records.filter((r) => r.learning_status === "mastered").length,
      dueToday: records.filter((r) => r.next_review_at && r.next_review_at <= nowIso).length,
      overdue: records.filter(
        (r) => r.next_review_at && new Date(r.next_review_at).getTime() < now.getTime() - 86400000
      ).length,
    };

    // Calculate accuracy & retention rate
    let totalCorrect = 0;
    let totalAttempts = 0;
    for (const r of records) {
      totalCorrect += r.times_correct || 0;
      totalAttempts += (r.times_correct || 0) + (r.times_incorrect || 0);
    }
    const retentionRate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 100;

    // 2. Fetch review logs for past 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: recentLogs } = await supabase
      .from("review_logs")
      .select("reviewed_at, is_correct")
      .eq("user_id", user.id)
      .gte("reviewed_at", fourteenDaysAgo)
      .order("reviewed_at", { ascending: true });

    // Group logs by day (YYYY-MM-DD)
    const dailyMap: Record<string, { count: number; correct: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { count: 0, correct: 0 };
    }

    for (const log of recentLogs || []) {
      const day = log.reviewed_at.split("T")[0];
      if (dailyMap[day]) {
        dailyMap[day].count += 1;
        if (log.is_correct) dailyMap[day].correct += 1;
      }
    }

    const dailyActivity = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      count: data.count,
      accuracy: data.count > 0 ? Math.round((data.correct / data.count) * 100) : 0,
    }));

    // Calculate current streak
    let streak = 0;
    const todayStr = now.toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    // Check if user reviewed today or yesterday to maintain streak
    const hasReviewedToday = (dailyMap[todayStr]?.count ?? 0) > 0;
    const hasReviewedYesterday = (dailyMap[yesterdayStr]?.count ?? 0) > 0;

    if (hasReviewedToday || hasReviewedYesterday) {
      streak = hasReviewedToday ? 1 : 0;
      let checkDate = new Date(Date.now() - (hasReviewedToday ? 1 : 2) * 86400000);
      while (true) {
        const k = checkDate.toISOString().split("T")[0];
        if (dailyMap[k] && dailyMap[k].count > 0) {
          streak += 1;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
      if (!hasReviewedToday && hasReviewedYesterday) {
        streak += 1;
      }
    }

    // 3. Find weak words (high lapse count or low accuracy)
    const weakWords = records
      .filter((r) => (r.lapses > 0 || r.times_incorrect > 1) && r.vocabulary_items)
      .sort((a, b) => b.lapses - a.lapses || b.times_incorrect - a.times_incorrect)
      .slice(0, 10)
      .map((r) => ({
        id: (r.vocabulary_items as any)?.id,
        word: (r.vocabulary_items as any)?.word,
        ipa: (r.vocabulary_items as any)?.ipa,
        meaning_vi: (r.vocabulary_items as any)?.meaning_vi,
        lapses: r.lapses,
        times_seen: r.times_seen,
        times_incorrect: r.times_incorrect,
        stability: Math.round(r.stability * 10) / 10,
      }));

    return NextResponse.json({
      counts,
      retentionRate,
      streak,
      dailyActivity,
      weakWords,
      totalReviewsLogged: (recentLogs || []).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}