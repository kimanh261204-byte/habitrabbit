import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateLibrarySchema = z.object({
  name: z.string().min(1, "Tên thư viện không được để trống").max(100),
  description: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user libraries
    const { data: libraries, error } = await supabase
      .from("vocabulary_libraries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!libraries || libraries.length === 0) {
      return NextResponse.json({ libraries: [] });
    }

    // For each library, compute total words, lessons count, and progress
    const enriched = await Promise.all(
      libraries.map(async (lib) => {
        const [{ count: totalWords }, { count: totalLessons }, { data: items }] = await Promise.all([
          supabase
            .from("vocabulary_items")
            .select("*", { count: "exact", head: true })
            .eq("library_id", lib.id),
          supabase
            .from("lessons")
            .select("*", { count: "exact", head: true })
            .eq("library_id", lib.id),
          supabase
            .from("vocabulary_items")
            .select("id")
            .eq("library_id", lib.id),
        ]);

        let wordsCompleted = 0;
        if (items && items.length > 0) {
          const itemIds = items.map((i) => i.id);
          const { count: masteredCount } = await supabase
            .from("user_vocabulary_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("vocabulary_item_id", itemIds)
            .eq("learning_status", "mastered");

          wordsCompleted = masteredCount ?? 0;
        }

        const total = totalWords ?? 0;
        const progressPercent = total > 0 ? Math.round((wordsCompleted / total) * 100) : 0;

        return {
          ...lib,
          total_words: total,
          total_lessons: totalLessons ?? 0,
          words_completed: wordsCompleted,
          progress_percent: progressPercent,
        };
      })
    );

    return NextResponse.json({ libraries: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateLibrarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const { data: library, error } = await supabase
      .from("vocabulary_libraries")
      .insert({
        user_id: user.id,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ library }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}