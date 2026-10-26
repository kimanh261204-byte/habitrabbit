// ============================================================
// HabitRabbit V2 — Gamification Core TypeScript Definitions
// ============================================================

export type MiniGameType =
  | "word_match"
  | "missing_word"
  | "memory_flip"
  | "listen_catch"
  | "sentence_builder"
  | "boss_battle";

export type RabbitMood = "happy" | "excited" | "sleepy" | "hungry";

export type RabbitStage = "baby" | "junior" | "explorer" | "master";

export interface RabbitEvolutionInfo {
  stage: RabbitStage;
  title: string;
  description: string;
  badgeEmoji: string;
  imageSrc: string;
  minLevel: number;
  nextStageAtLevel?: number;
}

export type WardrobeCategory = "hat" | "accessory" | "background";

export interface WardrobeItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  icon: string;
  priceCarrots: number;
  requiredLevel: number;
  description: string;
}

export interface UserGameProfile {
  user_id: string;
  xp: number;
  level: number;
  carrots: number;
  streak_freeze: number;
  rabbit_name: string;
  rabbit_mood: RabbitMood;
  rabbit_outfit: string;
  unlocked_items: string[];
  equipped_items: {
    hat?: string;
    accessory?: string;
    background?: string;
  };
  growth_points?: number; // Growth towards next evolution
  study_streak_days?: number;
  last_active_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GameQuest {
  id: string;
  user_id: string;
  quest_key: string;
  title: string;
  description: string;
  target_count: number;
  current_count: number;
  xp_reward: number;
  carrot_reward: number;
  is_completed: boolean;
  is_claimed: boolean;
  quest_date: string;
}

export interface GameAchievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "words" | "games" | "rabbit";
  unlocked_at?: string | null;
}

export interface GameSessionResult {
  game_type: MiniGameType;
  score: number;
  accuracy: number;
  words_played: number;
  xp_earned: number;
  carrots_earned: number;
  duration_seconds: number;
}

export interface MiniGameWord {
  id: string;
  word: string;
  meaning_vi: string;
  ipa?: string | null;
  example_en?: string | null;
  example_vi?: string | null;
  part_of_speech?: string | null;
}
