import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*, vocabulary_libraries(user_id, name)")
      .eq("id", id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Bài học không tồn tại" }, { status: 404 });
    }

    // Check ownership
    const libOwner = (lesson.vocabulary_libraries as any)?.user_id;
    if (libOwner && libOwner !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try to get items via junction table
    const { data: junctionItems } = await supabase
      .from("lesson_vocabulary_items")
      .select("order_index, vocabulary_items(*)")
      .eq("lesson_id", id)
      .order("order_index", { ascending: true });

    let items: any[] = [];
    if (junctionItems && junctionItems.length > 0) {
      items = junctionItems
        .map((j) => j.vocabulary_items)
        .filter(Boolean);
    } else {
      // Fallback: fetch items from the same library with offset
      const pageSize = lesson.word_count || 20;
      const offset = Math.max(0, (lesson.order_index - 1) * pageSize);
      const { data: fallbackItems } = await supabase
        .from("vocabulary_items")
        .select("*")
        .eq("library_id", lesson.library_id)
        .range(offset, offset + pageSize - 1);
      items = fallbackItems || [];
    }

    // Attach user vocabulary progress
    if (items.length > 0) {
      const itemIds = items.map((i) => i.id);
      const { data: progressList } = await supabase
        .from("user_vocabulary_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("vocabulary_item_id", itemIds);

      const progressMap = new Map((progressList || []).map((p) => [p.vocabulary_item_id, p]));
      items = items.map((item) => ({
        ...item,
        progress: progressMap.get(item.id) || null,
      }));
    }

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        library_id: lesson.library_id,
        library_name: (lesson.vocabulary_libraries as any)?.name || "Thư viện",
        title: lesson.title,
        order_index: lesson.order_index,
        word_count: lesson.word_count,
        status: lesson.status,
      },
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}