import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeWrittenSentence, checkVietnameseMeaning, isAIConfigured } from "@/lib/ai/provider";
import { z } from "zod";

const GradeSchema = z.object({
  type: z.enum(["sentence_writing", "vietnamese_recall"]),
  word: z.string(),
  meaning_vi: z.string(),
  userAnswer: z.string(),
  expectedAnswer: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await req.json();
    const parsed = GradeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { type, word, meaning_vi, userAnswer, expectedAnswer } = parsed.data;

    if (type === "sentence_writing") {
      const result = await gradeWrittenSentence(word, meaning_vi, userAnswer);
      return NextResponse.json(result);
    } else {
      const result = await checkVietnameseMeaning(word, expectedAnswer ?? meaning_vi, userAnswer);
      return NextResponse.json(result);
    }
  } catch (err) {
    console.error("AI grade error:", err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
