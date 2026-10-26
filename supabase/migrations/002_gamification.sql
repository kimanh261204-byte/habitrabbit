-- ============================================================
-- HabitRabbit V2 Database Schema - Migration 002: Gamification
-- Optional Gamification System: XP, Carrots, Quests & Mini-game Sessions
-- Does NOT touch or alter V1 tables (user_vocabulary_progress, review_logs, etc.)
-- ============================================================

-- 1. USER GAME PROFILES (Companion Rabbit, Level, XP, Carrots)
CREATE TABLE IF NOT EXISTS user_game_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  carrots INTEGER NOT NULL DEFAULT 10,
  streak_freeze INTEGER NOT NULL DEFAULT 0,
  rabbit_name TEXT NOT NULL DEFAULT 'Bé Thỏ',
  rabbit_mood TEXT NOT NULL DEFAULT 'happy' CHECK (rabbit_mood IN ('happy', 'excited', 'sleepy', 'hungry')),
  rabbit_outfit TEXT NOT NULL DEFAULT 'classic',
  unlocked_items TEXT[] NOT NULL DEFAULT ARRAY['classic_bow']::TEXT[],
  equipped_items JSONB NOT NULL DEFAULT '{"hat": "none", "accessory": "classic_bow", "background": "meadow"}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_game_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game profile" ON user_game_profiles FOR ALL USING (auth.uid() = user_id);

-- Trigger updated_at for user_game_profiles
CREATE TRIGGER update_user_game_profiles_updated_at 
  BEFORE UPDATE ON user_game_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. GAME QUESTS (Daily & Weekly Quests)
CREATE TABLE IF NOT EXISTS game_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  current_count INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 20,
  carrot_reward INTEGER NOT NULL DEFAULT 5,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, quest_key, quest_date)
);

CREATE INDEX IF NOT EXISTS idx_game_quests_user_date ON game_quests(user_id, quest_date);

ALTER TABLE game_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game quests" ON game_quests FOR ALL USING (auth.uid() = user_id);

-- 3. GAME ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS game_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_game_achievements_user ON game_achievements(user_id);

ALTER TABLE game_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievements" ON game_achievements FOR ALL USING (auth.uid() = user_id);

-- 4. GAME SESSIONS (History & Anti-cheat record)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('word_match', 'missing_word', 'memory_flip', 'listen_catch', 'sentence_builder', 'boss_battle')),
  score INTEGER NOT NULL DEFAULT 0,
  accuracy FLOAT NOT NULL DEFAULT 0,
  words_played INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  carrots_earned INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game sessions" ON game_sessions FOR ALL USING (auth.uid() = user_id);
