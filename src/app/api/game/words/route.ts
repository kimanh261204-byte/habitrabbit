import { NextRequest, NextResponse, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    await connection();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get("source") || "mixed";
    const libraryId = searchParams.get("libraryId");
    const excludeParam = searchParams.get("exclude") || "";
    const excludeIds = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));
    const limitParam = parseInt(searchParams.get("limit") || "18", 10);
    const limit = Math.min(Math.max(limitParam, 6), 50);

    // If source is due review
    if (source === "due") {
      const now = new Date().toISOString();
      const { data: dueProgress } = await supabase
        .from("user_vocabulary_progress")
        .select("vocabulary_item_id")
        .eq("user_id", user.id)
        .lte("next_review_at", now)
        .limit(60);

      if (dueProgress && dueProgress.length > 0) {
        const ids = dueProgress
          .map((p) => p.vocabulary_item_id)
          .filter((id) => !excludeIds.has(id));

        if (ids.length >= 4) {
          const { data: words } = await supabase
            .from("vocabulary_items")
            .select("id, word, meaning_vi, ipa, example_en, example_vi, part_of_speech")
            .in("id", ids);

          if (words && words.length >= 4) {
            const shuffledDue = [...words].sort(() => Math.random() - 0.5).slice(0, limit);
            return NextResponse.json({ words: shuffledDue });
          }
        }
      }
    }

    // Base query for user's vocabulary
    let baseQuery = supabase
      .from("vocabulary_items")
      .select("id, word, meaning_vi, ipa, example_en, example_vi, part_of_speech", { count: "exact" })
      .eq("user_id", user.id)
      .not("meaning_vi", "is", null);

    if (libraryId) {
      baseQuery = baseQuery.eq("library_id", libraryId);
    }

    // Get count of available words
    const { count, error: countErr } = await baseQuery;
    const totalCount = count || 0;

    let candidateWords: any[] = [];

    if (totalCount > limit) {
      // Pick a random offset window so words are completely different each request
      const maxOffset = Math.max(0, totalCount - limit * 2);
      const randomOffset = Math.floor(Math.random() * maxOffset);

      const { data: windowWords } = await supabase
        .from("vocabulary_items")
        .select("id, word, meaning_vi, ipa, example_en, example_vi, part_of_speech")
        .eq("user_id", user.id)
        .not("meaning_vi", "is", null)
        .range(randomOffset, randomOffset + limit * 2);

      candidateWords = windowWords || [];
    } else {
      const { data: allUserWords } = await baseQuery.limit(100);
      candidateWords = allUserWords || [];
    }

    // Filter valid words and exclude recently played
    let filtered = candidateWords.filter(
      (w) =>
        w.word &&
        w.word.trim().length > 0 &&
        w.meaning_vi &&
        w.meaning_vi.trim().length > 0 &&
        !excludeIds.has(w.id)
    );

    // If excluding caused too few candidates, fall back to candidateWords without exclude filter
    if (filtered.length < limit) {
      filtered = candidateWords.filter(
        (w) => w.word && w.word.trim().length > 0 && w.meaning_vi && w.meaning_vi.trim().length > 0
      );
    }

    // If user has very few words, pull from any vocabulary items in database
    if (filtered.length < 8) {
      const { data: fallbackWords } = await supabase
        .from("vocabulary_items")
        .select("id, word, meaning_vi, ipa, example_en, example_vi, part_of_speech")
        .not("meaning_vi", "is", null)
        .limit(60);

      if (fallbackWords) {
        const seen = new Set(filtered.map((w) => w.id));
        for (const fw of fallbackWords) {
          if (!seen.has(fw.id) && fw.word && fw.meaning_vi) {
            filtered.push(fw);
          }
        }
      }
    }

    // Shuffle and pick limit
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, limit);

    // Enrich missing example_vi for sentences
    const wordsWithTranslation = await Promise.all(
      shuffled.map(async (w) => {
        if (w.example_en && (!w.example_vi || w.example_vi.trim() === "")) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(
                w.example_en
              )}`,
              { signal: controller.signal }
            );
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && Array.isArray(data[0])) {
                const trans = data[0].map((s: any) => s[0]).join("");
                if (trans) return { ...w, example_vi: trans };
              }
            }
          } catch {
            // Keep original
          }
        }
        return w;
      })
    );

    return NextResponse.json({
      words: wordsWithTranslation,
      totalAvailable: totalCount,
    });
  } catch (err: any) {
    console.error("Game words fetch error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
