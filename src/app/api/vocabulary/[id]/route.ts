import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeWord } from "@/lib/utils";
import { z } from "zod";

const UpdateVocabularySchema = z.object({
  word: z.string().min(1).optional(),
  part_of_speech: z.string().optional().nullable(),
  ipa: z.string().optional().nullable(),
  meaning_vi: z.string().optional().nullable(),
  definition_en: z.string().optional().nullable(),
  example_en: z.string().optional().nullable(),
  example_vi: z.string().optional().nullable(),
  synonyms: z.array(z.string()).optional().nullable(),
  antonyms: z.array(z.string()).optional().nullable(),
});

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
    const parsed = UpdateVocabularySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.word) {
      updateData.normalized_word = normalizeWord(parsed.data.word);
    }

    const { data: updated, error } = await supabase
      .from("vocabulary_items")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ word: updated });
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
      .from("vocabulary_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Đã xóa từ vựng" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}