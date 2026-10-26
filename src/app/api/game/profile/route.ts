import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultGameProfile, generateDailyQuests, calculateLevelFromXp } from "@/lib/game/game-service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Try fetching from Supabase table
    let profile: any = null;
    let quests: any = null;
    let achievements: any[] = [];

    try {
      const { data: dbProfile, error: profileErr } = await supabase
        .from("user_game_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profileErr && dbProfile) {
        profile = dbProfile;
      } else if (profileErr && profileErr.code === "PGRST116") {
        // Record not found -> insert initial
        const defaultProf = getDefaultGameProfile(user.id);
        const { data: inserted } = await supabase
          .from("user_game_profiles")
          .insert(defaultProf)
          .select()
          .single();
        profile = inserted || defaultProf;
      }
    } catch {
      // Table might not exist yet or connection issue
      profile = null;
    }

    // Quests
    try {
      const { data: dbQuests } = await supabase
        .from("game_quests")
        .select("*")
        .eq("user_id", user.id)
        .eq("quest_date", today);

      if (dbQuests && dbQuests.length > 0) {
        quests = dbQuests;
      }
    } catch {
      quests = null;
    }

    // Achievements
    try {
      const { data: dbAchievements } = await supabase
        .from("game_achievements")
        .select("achievement_key, unlocked_at")
        .eq("user_id", user.id);

      if (dbAchievements) {
        achievements = dbAchievements;
      }
    } catch {
      achievements = [];
    }

    const finalProfile = profile || getDefaultGameProfile(user.id);
    const finalQuests = quests || generateDailyQuests(user.id, today);
    const levelInfo = calculateLevelFromXp(finalProfile.xp || 0);

    return NextResponse.json({
      profile: {
        ...finalProfile,
        level: levelInfo.level,
      },
      levelInfo,
      quests: finalQuests,
      achievements,
    });
  } catch (err: any) {
    console.error("Game profile error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

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
    const { action, payload } = body;

    // Fetch existing
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

    let updated = currentProfile || getDefaultGameProfile(user.id);

    if (action === "sync" && payload) {
      updated = {
        ...updated,
        xp: Math.max(updated.xp || 0, payload.xp || 0),
        carrots: Math.max(updated.carrots || 0, payload.carrots || 0),
        rabbit_name: payload.rabbit_name || updated.rabbit_name,
        rabbit_mood: payload.rabbit_mood || updated.rabbit_mood,
        unlocked_items: Array.from(new Set([...(updated.unlocked_items || []), ...(payload.unlocked_items || [])])),
        equipped_items: { ...updated.equipped_items, ...payload.equipped_items },
      };
    } else if (action === "rename") {
      const newName = (payload?.name || "").trim().slice(0, 24);
      if (newName) {
        updated.rabbit_name = newName;
      }
    } else if (action === "feed") {
      if (updated.carrots >= 1) {
        updated.carrots -= 1;
        updated.rabbit_mood = "excited";
        updated.xp += 10; // Feeding gives a little bonus XP
      }
    } else if (action === "pet") {
      updated.rabbit_mood = "happy";
    } else if (action === "equip") {
      if (payload?.equipped_items) {
        updated.equipped_items = {
          ...updated.equipped_items,
          ...payload.equipped_items,
        };
      }
    }

    const levelInfo = calculateLevelFromXp(updated.xp);
    updated.level = levelInfo.level;
    updated.updated_at = new Date().toISOString();

    // Persist to DB if table available
    try {
      await supabase
        .from("user_game_profiles")
        .upsert(updated, { onConflict: "user_id" });
    } catch (e) {
      console.warn("Could not upsert user_game_profiles to DB (will use client state):", e);
    }

    return NextResponse.json({
      success: true,
      profile: updated,
      levelInfo,
    });
  } catch (err: any) {
    console.error("Game profile update error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
