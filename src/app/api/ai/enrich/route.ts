import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichVocabulary, isAIConfigured } from "@/lib/ai/provider";
import { z } from "zod";

const EnrichSchema = z.object({
  word: z.string().min(1).max(100),
  partOfSpeech: z.string().optional(),
  fields: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: "AI chưa được cấu hình. Vui lòng thêm AI_API_KEY vào .env.local" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = EnrichSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const result = await enrichVocabulary({
      word: parsed.data.word,
      partOfSpeech: parsed.data.partOfSpeech,
      fields: parsed.data.fields as import("@/types").VocabFieldKey[],
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("AI enrich error:", err);
    const msg = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
