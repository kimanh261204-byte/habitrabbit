import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateLibrarySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

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

    const { data: library, error: libError } = await supabase
      .from("vocabulary_libraries")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (libError || !library) {
      return NextResponse.json({ error: "Thư viện không tồn tại" }, { status: 404 });
    }

    // Fetch lessons for this library
    const { data: lessons, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("library_id", id)
      .order("order_index", { ascending: true });

    if (lessonError) {
      return NextResponse.json({ error: lessonError.message }, { status: 500 });
    }

    // Fetch total word count
    const { count: totalWords } = await supabase
      .from("vocabulary_items")
      .select("*", { count: "exact", head: true })
      .eq("library_id", id);

    return NextResponse.json({
      library: {
        ...library,
        total_words: totalWords ?? 0,
        lessons: lessons || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = UpdateLibrarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description?.trim() || null;

    const { data: updated, error } = await supabase
      .from("vocabulary_libraries")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ library: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from("vocabulary_libraries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Đã xóa thư viện thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}