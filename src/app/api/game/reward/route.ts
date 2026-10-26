import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultGameProfile, calculateLevelFromXp, generateDailyQuests } from "@/lib/game/game-service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { gameType, score = 0, accuracy = 0, wordsPlayed = 0, durationSeconds = 5 } = body;

    // Validation
    const validGames = ["word_match", "missing_word", "memory_flip", "listen_catch", "sentence_builder", "boss_battle"];
    if (!validGames.includes(gameType)) {
      return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
    }

    const safeWords = Math.min(Math.max(Number(wordsPlayed) || 0, 1), 50);
    const safeAccuracy = Math.min(Math.max(Number(accuracy) || 0, 0), 100);
    const safeDuration = Math.max(Number(durationSeconds) || 0, 3);

    // Compute fair rewards
    let xpEarned = safeWords * 3;
    if (safeAccuracy >= 90) xpEarned += 10;
    if (safeAccuracy === 100) xpEarned += 5;
    // Cap XP per game to prevent spam
    xpEarned = Math.min(xpEarned, 60);

    let carrotsEarned = 2;
    if (safeAccuracy >= 80) carrotsEarned += 2;
    if (safeAccuracy === 100) carrotsEarned += 1;
    carrotsEarned = Math.min(carrotsEarned, 5);

    // Fetch existing profile
    let currentProfile = null;
    try {
      const { data } = await supabase
        .from("user_game_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      currentProfile = data;
    } catch {
      currentProfile = null;
    }

    const profile = currentProfile || getDefaultGameProfile(user.id);
    const oldLevel = calculateLevelFromXp(profile.xp).level;

    profile.xp += xpEarned;
    profile.carrots += carrotsEarned;
    profile.rabbit_mood = "excited"; // Happy after playing

    const newLevelInfo = calculateLevelFromXp(profile.xp);
    profile.level = newLevelInfo.level;
    const leveledUp = newLevelInfo.level > oldLevel;

    profile.updated_at = new Date().toISOString();

    // Persist profile
    try {
      await supabase
        .from("user_game_profiles")
        .upsert(profile, { onConflict: "user_id" });
    } catch (e) {
      console.warn("Could not upsert profile reward to DB:", e);
    }

    // Log game session
    try {
      await supabase.from("game_sessions").insert({
        user_id: user.id,
        game_type: gameType,
        score: Math.round(Number(score) || 0),
        accuracy: safeAccuracy,
        words_played: safeWords,
        xp_earned: xpEarned,
        carrots_earned: carrotsEarned,
        duration_seconds: safeDuration,
      });
    } catch (e) {
      console.warn("Could not log game session:", e);
    }

    // First game achievement check
    let newAchievement = null;
    try {
      const { data: existingAch } = await supabase
        .from("game_achievements")
        .select("id")
        .eq("user_id", user.id)
        .eq("achievement_key", "first_game")
        .single();

      if (!existingAch) {
        await supabase.from("game_achievements").insert({
          user_id: user.id,
          achievement_key: "first_game",
        });
        newAchievement = "first_game";
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      xpEarned,
      carrotsEarned,
      leveledUp,
      oldLevel,
      newLevel: newLevelInfo.level,
      profile,
      levelInfo: newLevelInfo,
      newAchievement,
    });
  } catch (err: any) {
    console.error("Game reward error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
