import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seedCoreCurriculumForUser } from "@/lib/curriculum/seed";
import { CORE_COURSES } from "@/lib/curriculum/constants";

// In-memory mutex to prevent duplicate concurrent seeding for the same user
const activeSeedings = new Set<string>();

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (activeSeedings.has(user.id)) {
      return NextResponse.json({
        seeded: false,
        inProgress: true,
        message: "Quá trình nạp khóa học đang diễn ra trong nền.",
      });
    }

    // Check which core courses exist for user
    const { data: userLibs } = await supabase
      .from("vocabulary_libraries")
      .select("name")
      .eq("user_id", user.id);

    const existingNames = new Set((userLibs || []).map((l) => l.name));
    const isMissingAny = CORE_COURSES.some((c) => !existingNames.has(c.name));

    if (isMissingAny) {
      activeSeedings.add(user.id);
      try {
        await seedCoreCurriculumForUser(user.id);
        return NextResponse.json({
          seeded: true,
          message: "Đã nạp đầy đủ các khóa học cốt lõi.",
        });
      } finally {
        activeSeedings.delete(user.id);
      }
    }

    return NextResponse.json({
      seeded: false,
      message: "Tất cả 6 khóa học cốt lõi đã sẵn sàng.",
    });
  } catch (err: any) {
    console.error("Error ensuring curriculum:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
