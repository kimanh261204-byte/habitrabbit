import { NextRequest, NextResponse } from "next/server";

// In-memory translation cache to avoid duplicate network requests
const translationCache = new Map<string, string>();

export async function GET(req: NextRequest) {
  try {
    const text = req.nextUrl.searchParams.get("q")?.trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text query" }, { status: 400 });
    }

    // Check cache
    if (translationCache.has(text)) {
      return NextResponse.json({ translation: translationCache.get(text) });
    }

    // Call Google public translation endpoint with 4-second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Translation upstream error" }, { status: 502 });
    }

    const data = await res.json();
    let translated = "";
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translated = data[0].map((item: any) => item[0]).join("");
    }

    if (translated) {
      translationCache.set(text, translated);
      return NextResponse.json({ translation: translated });
    }

    return NextResponse.json({ error: "No translation extracted" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Translation error" }, { status: 500 });
  }
}
