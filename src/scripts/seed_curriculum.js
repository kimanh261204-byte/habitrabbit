const xlsx = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = '235cd5f2-2ea3-4e40-bf31-9593c42f584f';
const EXCEL_PATH = path.join(__dirname, '../data/default_curriculum.xlsx');

const COURSES = [
  {
    sheetName: 'IPA',
    name: 'Khóa 1: Phát âm & Ký hiệu IPA',
    description: 'Luyện ngữ âm, khẩu hình và làm chủ hệ thống phiên âm quốc tế IPA',
  },
  {
    sheetName: 'Ngữ pháp',
    name: 'Khóa 2: 600 Từ vựng Ngữ pháp Cốt lõi',
    description: 'Từ loại, cấu trúc câu và các từ vựng nền tảng thông dụng nhất',
  },
  {
    sheetName: 'Nghiệm',
    name: 'Khóa 3: Từ vựng Trải nghiệm & Thực tế',
    description: 'Từ vựng thực tế áp dụng trong công việc, đời sống và môi trường làm việc',
  },
  {
    sheetName: 'Khựng',
    name: 'Khóa 4: Phản xạ Nói & Xóa bỏ Khựng',
    description: 'Phát triển tư duy song ngữ tức thì, xóa bỏ thói quen ngập ngừng khi giao tiếp',
  },
  {
    sheetName: 'Giao tiếp 1',
    name: 'Khóa 5: Tiếng Anh Giao tiếp Cơ bản',
    description: 'Các tình huống giao tiếp đời thường, chào hỏi, mua sắm và sinh hoạt',
  },
  {
    sheetName: 'Giao tiếp 2',
    name: 'Khóa 6: Tiếng Anh Giao tiếp Nâng cao',
    description: 'Giao tiếp chuyên sâu, đàm phán, thành ngữ và tình huống phức tạp',
  },
];

async function withRetry(fn, retries = 5, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fn();
      if (res && res.error) {
        throw new Error(res.error.message || JSON.stringify(res.error));
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  [Retry ${attempt}/${retries}] ${err.message || err}. Pausing ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

async function seed() {
  console.log('--- Starting Robust Curriculum Seeding ---');
  const wb = xlsx.readFile(EXCEL_PATH);

  // 1. Clean up old or duplicated libraries
  const { data: oldLibs } = await withRetry(() =>
    supabase.from('vocabulary_libraries').select('id, name').eq('user_id', USER_ID)
  );

  console.log('Existing libraries:', oldLibs?.map(l => l.name));
  for (const lib of oldLibs || []) {
    console.log('Cleaning library:', lib.name);
    await withRetry(() => supabase.from('vocabulary_libraries').delete().eq('id', lib.id));
  }

  // 2. Loop through each Course (Sheet)
  for (const course of COURSES) {
    const sheet = wb.Sheets[course.sheetName];
    if (!sheet) continue;

    const rawRows = xlsx.utils.sheet_to_json(sheet);
    console.log(`\n=== Creating: ${course.name} (${rawRows.length} words) ===`);

    // Create library
    const { data: lib } = await withRetry(() =>
      supabase
        .from('vocabulary_libraries')
        .insert({
          user_id: USER_ID,
          name: course.name,
          description: course.description,
          source_file_name: 'default_curriculum.xlsx',
        })
        .select()
        .single()
    );

    const libraryId = lib.id;

    // Prepare items with accurate mapping
    const itemsToInsert = rawRows.map((row, idx) => {
      const word = String(row['Vocab'] || '').trim();
      return {
        library_id: libraryId,
        user_id: USER_ID,
        source_sheet_name: course.sheetName,
        source_row_number: idx + 2,
        word,
        normalized_word: word.toLowerCase(),
        part_of_speech: row['Type'] ? String(row['Type']).trim() : null,
        ipa: row['IPA'] ? String(row['IPA']).trim() : null,
        ipa_ai_generated: false,
        definition_en: row['Eng. definition'] ? String(row['Eng. definition']).trim() : null,
        definition_en_ai_generated: false,
        meaning_vi: row['Viet. meaning'] ? String(row['Viet. meaning']).trim() : null,
        meaning_vi_ai_generated: false,
        example_en: row['Example'] ? String(row['Example']).trim() : null,
        example_en_ai_generated: false,
        example_vi: null,
      };
    }).filter(i => i.word.length > 0);

    // Insert items in batches of 100
    const insertedItems = [];
    for (let i = 0; i < itemsToInsert.length; i += 100) {
      const chunk = itemsToInsert.slice(i, i + 100);
      const { data } = await withRetry(() =>
        supabase.from('vocabulary_items').insert(chunk).select('id, word')
      );
      if (data) insertedItems.push(...data);
    }
    console.log(`  ✓ Inserted ${insertedItems.length} vocabulary items`);

    // Create lessons
    const LESSON_SIZE = 20;
    const lessonCount = Math.ceil(insertedItems.length / LESSON_SIZE);
    const lessonsPayload = [];
    for (let l = 0; l < lessonCount; l++) {
      const orderIndex = l + 1;
      const count = Math.min(LESSON_SIZE, insertedItems.length - l * LESSON_SIZE);
      lessonsPayload.push({
        library_id: libraryId,
        title: `Bài ${orderIndex}`,
        order_index: orderIndex,
        word_count: count,
        status: 'not_started',
      });
    }

    const { data: createdLessons } = await withRetry(() =>
      supabase.from('lessons').insert(lessonsPayload).select('id, order_index')
    );

    createdLessons.sort((a, b) => a.order_index - b.order_index);

    // Batch create junction items
    const allJunctions = [];
    for (let l = 0; l < createdLessons.length; l++) {
      const lesson = createdLessons[l];
      const lessonItems = insertedItems.slice(l * LESSON_SIZE, (l + 1) * LESSON_SIZE);
      lessonItems.forEach((item, idx) => {
        allJunctions.push({
          lesson_id: lesson.id,
          vocabulary_item_id: item.id,
          order_index: idx,
        });
      });
    }

    // Insert junctions in chunks of 500
    for (let j = 0; j < allJunctions.length; j += 500) {
      const jChunk = allJunctions.slice(j, j + 500);
      await withRetry(() => supabase.from('lesson_vocabulary_items').insert(jChunk));
    }

    console.log(`  ✓ Created ${createdLessons.length} lessons & ${allJunctions.length} junctions`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL 6 OFFICIAL COURSES SEEDED SUCCESSFULLY!');
  console.log('=============================================');
}

seed().catch(console.error);
