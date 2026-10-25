import * as xlsx from "xlsx";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { CORE_COURSES, CORE_SOURCE_FILENAME } from "./constants";

import * as fs from "fs";

// In-memory cache for parsed Excel rows to prevent re-reading file from disk
let cachedParsedCourses: Map<string, Record<string, unknown>[]> | null = null;

function resolveCurriculumPath(): string {
  const candidates = [
    path.join(process.cwd(), "src/data/default_curriculum.xlsx"),
    path.join(process.cwd(), "vocaflow/src/data/default_curriculum.xlsx"),
    "D:/HabitRabbit/vocaflow/src/data/default_curriculum.xlsx",
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return candidates[0];
}

function getParsedCourses(): Map<string, Record<string, unknown>[]> {
  if (cachedParsedCourses) return cachedParsedCourses;

  const excelPath = resolveCurriculumPath();
  const fileBuffer = fs.readFileSync(excelPath);
  const wb = xlsx.read(fileBuffer, { type: "buffer" });
  cachedParsedCourses = new Map();

  for (const course of CORE_COURSES) {
    const sheet = wb.Sheets[course.sheetName];
    if (sheet) {
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);
      cachedParsedCourses.set(course.sheetName, rows);
    }
  }

  return cachedParsedCourses;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

export async function seedCoreCurriculumForUser(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const parsedCourses = getParsedCourses();

  // Check which core courses the user already has
  const { data: existingLibs } = await withRetry(async () =>
    supabase
      .from("vocabulary_libraries")
      .select("id, name")
      .eq("user_id", userId)
  );

  const existingNames = new Set((existingLibs || []).map((l) => l.name));

  // Process courses sequentially with retry to avoid network connection timeouts
  for (const course of CORE_COURSES) {
    if (existingNames.has(course.name)) {
      continue; // Skip courses that already exist for this user
    }

    // Double-check in database immediately before creating to prevent race condition between concurrent requests
    const { data: alreadyExists } = await supabase
      .from("vocabulary_libraries")
      .select("id")
      .eq("user_id", userId)
      .eq("name", course.name)
      .maybeSingle();

    if (alreadyExists) {
      existingNames.add(course.name);
      continue;
    }

    const rawRows = parsedCourses.get(course.sheetName);
    if (!rawRows || rawRows.length === 0) continue;

    try {
      // 1. Create library with retry
      const lib = await withRetry(async () => {
        const { data, error } = await supabase
          .from("vocabulary_libraries")
          .insert({
            user_id: userId,
            name: course.name,
            description: course.description,
            source_file_name: CORE_SOURCE_FILENAME,
          })
          .select()
          .single();

        if (error || !data) throw error || new Error("Failed to insert library");
        return data;
      });

      const libraryId = lib.id;

      // 2. Prepare vocabulary items
      const itemsToInsert = rawRows
        .map((row, idx) => {
          const word = String(row["Vocab"] || "").trim();
          return {
            library_id: libraryId,
            user_id: userId,
            source_sheet_name: course.sheetName,
            source_row_number: idx + 2,
            word,
            normalized_word: word.toLowerCase(),
            part_of_speech: row["Type"] ? String(row["Type"]).trim() : null,
            ipa: row["IPA"] ? String(row["IPA"]).trim() : null,
            ipa_ai_generated: false,
            definition_en: row["Eng. definition"] ? String(row["Eng. definition"]).trim() : null,
            definition_en_ai_generated: false,
            meaning_vi: row["Viet. meaning"] ? String(row["Viet. meaning"]).trim() : null,
            meaning_vi_ai_generated: false,
            example_en: row["Example"] ? String(row["Example"]).trim() : null,
            example_en_ai_generated: false,
            example_vi: null,
          };
        })
        .filter((i) => i.word.length > 0);

      // Batch insert items in chunks of 200 with retry
      const insertedItems: { id: string; word: string }[] = [];
      for (let i = 0; i < itemsToInsert.length; i += 200) {
        const chunk = itemsToInsert.slice(i, i + 200);
        const data = await withRetry(async () => {
          const { data, error } = await supabase
            .from("vocabulary_items")
            .insert(chunk)
            .select("id, word");
          if (error) throw error;
          return data;
        });
        if (data) insertedItems.push(...data);
      }

      // 3. Create lessons of 20 words each
      const LESSON_SIZE = 20;
      const lessonCount = Math.ceil(insertedItems.length / LESSON_SIZE);
      const lessonsPayload: Array<{
        library_id: string;
        title: string;
        order_index: number;
        word_count: number;
        status: string;
      }> = [];
      for (let l = 0; l < lessonCount; l++) {
        const startIdx = l * LESSON_SIZE;
        const endIdx = Math.min(startIdx + LESSON_SIZE, insertedItems.length);
        const count = endIdx - startIdx;
        lessonsPayload.push({
          library_id: libraryId,
          title: `Bài ${l + 1}`,
          order_index: l + 1,
          word_count: count,
          status: "not_started",
        });
      }

      const insertedLessons = await withRetry(async () => {
        const { data, error } = await supabase
          .from("lessons")
          .insert(lessonsPayload)
          .select("id, order_index");
        if (error) throw error;
        return data;
      });

      if (insertedLessons) {
        insertedLessons.sort((a, b) => a.order_index - b.order_index);
        const junctions = [];
        for (let l = 0; l < insertedLessons.length; l++) {
          const lesson = insertedLessons[l];
          const startIdx = l * LESSON_SIZE;
          const endIdx = Math.min(startIdx + LESSON_SIZE, insertedItems.length);
          const lessonWords = insertedItems.slice(startIdx, endIdx);

          for (let w = 0; w < lessonWords.length; w++) {
            junctions.push({
              lesson_id: lesson.id,
              vocabulary_item_id: lessonWords[w].id,
              order_index: w + 1,
            });
          }
        }

        for (let j = 0; j < junctions.length; j += 400) {
          const chunk = junctions.slice(j, j + 400);
          await withRetry(async () => {
            const { error } = await supabase.from("lesson_vocabulary_items").insert(chunk);
            if (error) throw error;
          });
        }
      }

      // Mark this course as existing in our set so we don't repeat it
      existingNames.add(course.name);
    } catch (courseErr) {
      console.error(`Error seeding course ${course.name}:`, courseErr);
    }
  }

  return true;
}
