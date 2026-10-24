import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateLessonStatusSchema = z.object({
  status: z.enum(["not_started", "learning", "practice_completed", "completed"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateLessonStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const { data: lesson, error: fetchError } = await supabase
      .from("lessons")
      .select("*, vocabulary_libraries(user_id)")
      .eq("id", id)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json({ error: "Bài học không tồn tại" }, { status: 404 });
    }

    const libOwner = (lesson.vocabulary_libraries as any)?.user_id;
    if (libOwner && libOwner !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("lessons")
      .update({
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lesson: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}