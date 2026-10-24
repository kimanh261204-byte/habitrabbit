-- ============================================================
-- VocaFlow Database Schema - Migration 001
-- Run this in your Supabase SQL Editor or psql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'vi',
  preferred_accent TEXT NOT NULL DEFAULT 'us' CHECK (preferred_accent IN ('us', 'uk')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  default_lesson_size INTEGER NOT NULL DEFAULT 20,
  preferred_accent TEXT NOT NULL DEFAULT 'us' CHECK (preferred_accent IN ('us', 'uk')),
  daily_goal INTEGER NOT NULL DEFAULT 20,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- VOCABULARY LIBRARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary_libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocab_libraries_user ON vocabulary_libraries(user_id);

ALTER TABLE vocabulary_libraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own libraries" ON vocabulary_libraries FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- IMPORT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_id UUID REFERENCES vocabulary_libraries(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_library ON import_jobs(library_id);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own import jobs" ON import_jobs FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- VOCABULARY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_id UUID NOT NULL REFERENCES vocabulary_libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_sheet_name TEXT,
  source_row_number INTEGER,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  part_of_speech TEXT,
  ipa TEXT,
  ipa_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  pronunciation_audio_url TEXT,
  definition_en TEXT,
  definition_en_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  meaning_vi TEXT,
  meaning_vi_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  example_en TEXT,
  example_en_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  example_vi TEXT,
  example_vi_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  synonyms TEXT[],
  antonyms TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocab_items_library ON vocabulary_items(library_id);
CREATE INDEX idx_vocab_items_user ON vocabulary_items(user_id);
CREATE INDEX idx_vocab_items_normalized ON vocabulary_items(library_id, normalized_word);

ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own vocab items" ON vocabulary_items FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_id UUID NOT NULL REFERENCES vocabulary_libraries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','learning','practice_completed','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_library ON lessons(library_id);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lessons" ON lessons FOR ALL
  USING (library_id IN (SELECT id FROM vocabulary_libraries WHERE user_id = auth.uid()));

-- ============================================================
-- LESSON VOCABULARY ITEMS (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_vocabulary_items (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  vocabulary_item_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (lesson_id, vocabulary_item_id)
);

CREATE INDEX idx_lesson_vocab_lesson ON lesson_vocabulary_items(lesson_id);

ALTER TABLE lesson_vocabulary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own lesson items" ON lesson_vocabulary_items FOR SELECT
  USING (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN vocabulary_libraries vl ON l.library_id = vl.id
    WHERE vl.user_id = auth.uid()
  ));
CREATE POLICY "Users manage own lesson items" ON lesson_vocabulary_items FOR ALL
  USING (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN vocabulary_libraries vl ON l.library_id = vl.id
    WHERE vl.user_id = auth.uid()
  ));

-- ============================================================
-- USER VOCABULARY PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_item_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  learning_status TEXT NOT NULL DEFAULT 'new' CHECK (learning_status IN ('new','learning','review','relearning','mastered')),
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  times_incorrect INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  -- FSRS fields
  stability FLOAT NOT NULL DEFAULT 0,
  difficulty FLOAT NOT NULL DEFAULT 0,
  elapsed_days FLOAT NOT NULL DEFAULT 0,
  scheduled_days FLOAT NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  fsrs_state INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vocabulary_item_id)
);

CREATE INDEX idx_uvp_user ON user_vocabulary_progress(user_id);
CREATE INDEX idx_uvp_next_review ON user_vocabulary_progress(user_id, next_review_at);
CREATE INDEX idx_uvp_status ON user_vocabulary_progress(user_id, learning_status);

ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON user_vocabulary_progress FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REVIEW LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_item_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  session_id UUID,
  response_type TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  self_rating TEXT CHECK (self_rating IN ('again','hard','good','easy')),
  response_duration_ms INTEGER,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_logs_user ON review_logs(user_id);
CREATE INDEX idx_review_logs_item ON review_logs(vocabulary_item_id);

ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own review logs" ON review_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- STUDY SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_id UUID REFERENCES vocabulary_libraries(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('flashcard','practice','review')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned'))
);

CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
  question_type TEXT NOT NULL,
  vocabulary_item_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  feedback_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_lesson ON quiz_attempts(lesson_id);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile and settings on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vocab_libraries_updated_at BEFORE UPDATE ON vocabulary_libraries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vocab_items_updated_at BEFORE UPDATE ON vocabulary_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uvp_updated_at BEFORE UPDATE ON user_vocabulary_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
