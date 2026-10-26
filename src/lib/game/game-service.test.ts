import { describe, it, expect } from "vitest";
import {
  calculateLevelFromXp,
  getXpForNextLevel,
  getDefaultGameProfile,
  generateDailyQuests,
  getRabbitStage,
} from "./game-service";
import { fsrsSchedule, newFSRSCard, selfRatingToFSRS } from "../spaced-repetition/fsrs";

describe("HabitRabbit V2 — Gamification Engine", () => {
  it("calculates level 1 for 0 XP correctly", () => {
    const res = calculateLevelFromXp(0);
    expect(res.level).toBe(1);
    expect(res.currentLevelXp).toBe(0);
    expect(res.progressPercent).toBe(0);
    expect(res.xpNeededForNext).toBe(100);
  });

  it("calculates level progression accurately across XP thresholds", () => {
    // Level 1: 0 - 99 XP (needs 100)
    expect(calculateLevelFromXp(50).level).toBe(1);
    expect(calculateLevelFromXp(50).progressPercent).toBe(50);

    // Level 2: 100 XP (needs 150 to reach Level 3)
    const at100 = calculateLevelFromXp(100);
    expect(at100.level).toBe(2);
    expect(at100.currentLevelXp).toBe(0);
    expect(at100.xpNeededForNext).toBe(150);

    // Level 2 at 175 XP (75 into Level 2 = 50%)
    const at175 = calculateLevelFromXp(175);
    expect(at175.level).toBe(2);
    expect(at175.currentLevelXp).toBe(75);
    expect(at175.progressPercent).toBe(50);

    // Level 3 at 250 XP
    expect(calculateLevelFromXp(250).level).toBe(3);
  });

  it("generates default profile with starting carrots and classic outfit", () => {
    const prof = getDefaultGameProfile("test-user-123");
    expect(prof.user_id).toBe("test-user-123");
    expect(prof.level).toBe(1);
    expect(prof.carrots).toBeGreaterThanOrEqual(10);
    expect(prof.rabbit_name).toBe("Bé Thỏ");
    expect(prof.rabbit_mood).toBe("happy");
  });

  it("generates 7 diverse daily quests for today", () => {
    const quests = generateDailyQuests("test-user-123", "2026-10-26");
    expect(quests.length).toBe(7);
    expect(quests.some((q) => q.quest_key === "play_any_game")).toBe(true);
    expect(quests.some((q) => q.quest_key === "earn_50_xp")).toBe(true);
    expect(quests.some((q) => q.quest_key === "word_match_win")).toBe(true);
    expect(quests.some((q) => q.quest_key === "listen_catch_win")).toBe(true);
    expect(quests.some((q) => q.quest_key === "sentence_builder_win")).toBe(true);
    expect(quests.some((q) => q.quest_key === "memory_flip_win")).toBe(true);
    expect(quests.some((q) => q.quest_key === "feed_rabbit_quest")).toBe(true);
  });

  it("determines correct rabbit evolution stages and images based on level", () => {
    // Level 1-2: baby
    const baby = getRabbitStage(1);
    expect(baby.stage).toBe("baby");
    expect(baby.imageSrc).toBe("/stages/baby.png");
    expect(baby.nextStageAtLevel).toBe(3);

    // Level 3-5: junior
    const junior = getRabbitStage(3);
    expect(junior.stage).toBe("junior");
    expect(junior.imageSrc).toBe("/stages/junior.png");
    expect(junior.nextStageAtLevel).toBe(6);

    // Level 6-9: explorer
    const explorer = getRabbitStage(6);
    expect(explorer.stage).toBe("explorer");
    expect(explorer.imageSrc).toBe("/stages/explorer.png");
    expect(explorer.nextStageAtLevel).toBe(10);

    // Level 10+: master
    const master = getRabbitStage(10);
    expect(master.stage).toBe("master");
    expect(master.imageSrc).toBe("/stages/master.png");
    expect(master.nextStageAtLevel).toBeUndefined();
  });
});

describe("V1 Preservation — FSRS Algorithm Integrity Check", () => {
  it("FSRS scheduling behaves with mathematical fidelity on new cards", () => {
    const card = newFSRSCard();
    expect(card.state).toBe(0);
    expect(card.reps).toBe(0);

    // Test Rating 3 (Good)
    const ratingGood = selfRatingToFSRS("good");
    expect(ratingGood).toBe(3);

    const result = fsrsSchedule(card, ratingGood, new Date("2026-10-26T12:00:00Z"));
    expect(result.card.state).toBe(2); // State moves to Review
    expect(result.card.reps).toBe(1);
    expect(result.card.stability).toBeGreaterThan(0);
    expect(result.scheduled_days).toBeGreaterThanOrEqual(1);
  });

  it("FSRS handles Again (rating 1) into Learning state", () => {
    const card = newFSRSCard();
    const result = fsrsSchedule(card, selfRatingToFSRS("again"), new Date("2026-10-26T12:00:00Z"));
    expect(result.card.state).toBe(1); // Learning
    expect(result.scheduled_days).toBe(0);
  });
});
