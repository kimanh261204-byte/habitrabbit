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

    // Fetch lessons and user progress
    const libIds = libraries.map((l) => l.id);
    const [{ data: allLessons }, { data: allProgress }] = await Promise.all([
      supabase.from("lessons").select("id, library_id, word_count").in("library_id", libIds),
      supabase
        .from("user_vocabulary_progress")
        .select("vocabulary_item_id, learning_status")
        .eq("user_id", user.id)
        .eq("learning_status", "mastered"),
    ]);

    const wordsByLib = new Map<string, number>();
    const lessonsCountByLib = new Map<string, number>();

    for (const lesson of allLessons || []) {
      const currentWords = wordsByLib.get(lesson.library_id) || 0;
      wordsByLib.set(lesson.library_id, currentWords + (lesson.word_count || 0));

      const currentLessons = lessonsCountByLib.get(lesson.library_id) || 0;
      lessonsCountByLib.set(lesson.library_id, currentLessons + 1);
    }

    const masteredCount = (allProgress || []).length;

    const enriched = libraries.map((lib) => {
      const totalWords = wordsByLib.get(lib.id) || 0;
      const totalLessons = lessonsCountByLib.get(lib.id) || 0;
      // Progress calculation
      const progressPercent = 0; // Freshly seeded or computed from progress

      return {
        ...lib,
        total_words: totalWords,
        total_lessons: totalLessons,
        words_completed: 0,
        progress_percent: progressPercent,
      };
    });

    // Sort libraries Khóa 1 -> Khóa 6, then custom
    enriched.sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));

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