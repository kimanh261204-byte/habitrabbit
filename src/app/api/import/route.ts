import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkArray, generateLessonTitle, normalizeWord } from "@/lib/utils";
import { ParsedRow, VocabFieldKey } from "@/types";
import { z } from "zod";

const ImportSchema = z.object({
  libraryName: z.string().min(1).max(200),
  fileName: z.string().optional(),
  rows: z.array(z.object({
    rowIndex: z.number(),
    sheetName: z.string(),
    mapped: z.record(z.string()),
    selected: z.boolean(),
    isDuplicate: z.boolean().optional(),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ImportSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { libraryName, fileName, rows } = parsed.data;
    const selectedRows = rows.filter(r => r.selected && r.mapped.word);

    // Check max size
    if (selectedRows.length > 5000) {
      return NextResponse.json({ error: "Tối đa 5000 từ mỗi lần import" }, { status: 400 });
    }

    // Get lesson size from settings
    const { data: settings } = await supabase.from("user_settings").select("default_lesson_size").eq("user_id", user.id).single();
    const lessonSize = settings?.default_lesson_size ?? 20;

    // Create library
    const { data: library, error: libErr } = await supabase
      .from("vocabulary_libraries")
      .insert({ user_id: user.id, name: libraryName, source_file_name: fileName ?? null })
      .select()
      .single();

    if (libErr || !library) {
      return NextResponse.json({ error: "Failed to create library" }, { status: 500 });
    }

    // Create import job
    const { data: job } = await supabase
      .from("import_jobs")
      .insert({ user_id: user.id, library_id: library.id, file_name: fileName ?? "unknown", status: "processing", total_rows: selectedRows.length })
      .select()
      .single();

    // Insert vocabulary items
    const vocabItems = selectedRows.map((row, i) => ({
      library_id: library.id,
      user_id: user.id,
      source_sheet_name: row.sheetName,
      source_row_number: row.rowIndex,
      word: row.mapped.word?.trim() ?? "",
      normalized_word: normalizeWord(row.mapped.word ?? ""),
      part_of_speech: row.mapped.part_of_speech ?? null,
      ipa: row.mapped.ipa ?? null,
      ipa_ai_generated: !!(row.mapped.ipa_ai_generated),
      definition_en: row.mapped.definition_en ?? null,
      definition_en_ai_generated: !!(row.mapped.definition_en_ai_generated),
      meaning_vi: row.mapped.meaning_vi ?? null,
      meaning_vi_ai_generated: !!(row.mapped.meaning_vi_ai_generated),
      example_en: row.mapped.example_en ?? null,
      example_en_ai_generated: !!(row.mapped.example_en_ai_generated),
      example_vi: row.mapped.example_vi ?? null,
      example_vi_ai_generated: !!(row.mapped.example_vi_ai_generated),
      synonyms: row.mapped.synonyms ? row.mapped.synonyms.split(",").map(s => s.trim()) : null,
      antonyms: row.mapped.antonyms ? row.mapped.antonyms.split(",").map(s => s.trim()) : null,
    }));

    // Insert in chunks to avoid request size limits
    const chunks = chunkArray(vocabItems, 100);
    let importedCount = 0;
    const insertedIds: string[] = [];

    for (const chunk of chunks) {
      const { data: inserted, error: insertErr } = await supabase
        .from("vocabulary_items")
        .insert(chunk)
        .select("id");
      if (!insertErr && inserted) {
        importedCount += inserted.length;
        insertedIds.push(...inserted.map(v => v.id));
      }
    }

    // Generate lessons
    const idChunks = chunkArray(insertedIds, lessonSize);
    const lessonInserts = idChunks.map((chunk, i) => ({
      library_id: library.id,
      title: generateLessonTitle(i),
      order_index: i,
      word_count: chunk.length,
      status: "not_started",
    }));

    const { data: lessons } = await supabase.from("lessons").insert(lessonInserts).select("id");

    if (lessons) {
      const lessonItems = lessons.flatMap((lesson, lessonIdx) =>
        idChunks[lessonIdx].map((vocabId, orderIdx) => ({
          lesson_id: lesson.id,
          vocabulary_item_id: vocabId,
          order_index: orderIdx,
        }))
      );
      await supabase.from("lesson_vocabulary_items").insert(lessonItems);
    }

    // Update import job
    if (job) {
      await supabase.from("import_jobs").update({
        status: "completed",
        imported_rows: importedCount,
        failed_rows: selectedRows.length - importedCount,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
    }

    return NextResponse.json({
      libraryId: library.id,
      imported: importedCount,
      failed: selectedRows.length - importedCount,
      lessons: lessons?.length ?? 0,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
