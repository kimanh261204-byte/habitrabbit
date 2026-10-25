// ============================================================
// VocaFlow — Core TypeScript Types
// ============================================================

export type LearningStatus =
  | "new"
  | "learning"
  | "review"
  | "relearning"
  | "mastered";

export type LessonStatus =
  | "not_started"
  | "learning"
  | "practice_completed"
  | "completed";

export type ImportJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type QuestionType =
  | "english_recall"
  | "vietnamese_recall"
  | "fill_blank"
  | "sentence_writing"
  | "multiple_choice";

export type SelfRating = "again" | "hard" | "good" | "easy";

export interface UserProfile {
  id: string;
  display_name: string | null;
  preferred_locale: string;
  preferred_accent: "us" | "uk";
  created_at: string;
  updated_at: string;
}

export interface VocabularyLibrary {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  source_file_name: string | null;
  total_words: number;
  total_lessons: number;
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ImportJob {
  id: string;
  user_id: string;
  library_id: string | null;
  file_name: string;
  status: ImportJobStatus;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  error_summary: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface VocabularyItem {
  id: string;
  library_id: string;
  user_id: string;
  source_sheet_name: string | null;
  source_row_number: number | null;
  word: string;
  normalized_word: string;
  part_of_speech: string | null;
  ipa: string | null;
  ipa_ai_generated: boolean;
  pronunciation_audio_url: string | null;
  definition_en: string | null;
  definition_en_ai_generated: boolean;
  meaning_vi: string | null;
  meaning_vi_ai_generated: boolean;
  example_en: string | null;
  example_en_ai_generated: boolean;
  example_vi: string | null;
  example_vi_ai_generated: boolean;
  synonyms: string[] | null;
  antonyms: string[] | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  library_id: string;
  title: string;
  order_index: number;
  word_count: number;
  status: LessonStatus;
  created_at: string;
  updated_at: string;
}

export interface LessonWithItems extends Lesson {
  vocabulary_items: VocabularyItem[];
}

export interface UserVocabularyProgress {
  id: string;
  user_id: string;
  vocabulary_item_id: string;
  learning_status: LearningStatus;
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  // FSRS fields
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  created_at: string;
  updated_at: string;
}

export interface ReviewLog {
  id: string;
  user_id: string;
  vocabulary_item_id: string;
  session_id: string | null;
  response_type: QuestionType;
  is_correct: boolean;
  self_rating: SelfRating | null;
  response_duration_ms: number | null;
  reviewed_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  library_id: string | null;
  lesson_id: string | null;
  session_type: "flashcard" | "practice" | "review";
  started_at: string;
  completed_at: string | null;
  status: "active" | "completed" | "abandoned";
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  lesson_id: string;
  session_id: string | null;
  question_type: QuestionType;
  vocabulary_item_id: string;
  user_answer: string;
  expected_answer: string;
  is_correct: boolean;
  feedback_json: AIGradingResult | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  default_lesson_size: number;
  preferred_accent: "us" | "uk";
  daily_goal: number;
  theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

// ---- Import types ----
export interface ParsedColumn {
  index: number;
  header: string;
  detectedField: VocabFieldKey | null;
  confidence: number; // 0-1
}

export type VocabFieldKey =
  | "word"
  | "part_of_speech"
  | "ipa"
  | "definition_en"
  | "meaning_vi"
  | "example_en"
  | "example_vi"
  | "synonyms"
  | "antonyms";

export interface ParsedRow {
  rowIndex: number;
  sheetName: string;
  raw: Record<string, string>;
  mapped: Partial<Record<VocabFieldKey, string>>;
  isEmpty: boolean;
  isDuplicate: boolean;
  missingFields: VocabFieldKey[];
  selected: boolean;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  selected: boolean;
}

// ---- AI types ----
export interface AIEnrichmentRequest {
  word: string;
  partOfSpeech?: string;
  fields: VocabFieldKey[];
}

export interface AIEnrichmentResult {
  ipa?: string;
  definition_en?: string;
  meaning_vi?: string;
  example_en?: string;
  example_vi?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface AIGradingResult {
  original_sentence: string;
  corrected_sentence: string;
  grammar_feedback: string;
  vocabulary_usage_feedback: string;
  naturalness_feedback: string;
  vietnamese_explanation: string;
  vietnamese_translation?: string;
  target_word_used_correctly: boolean;
  suggested_next_step: string;
  score: number; // 0-100
}

// ---- Dashboard stats ----
export interface DashboardStats {
  total_words: number;
  words_seen: number;
  words_mastered: number;
  words_due_today: number;
  words_overdue: number;
  lessons_completed: number;
  total_sessions: number;
  current_streak: number;
  libraries: LibrarySummary[];
}

export interface LibrarySummary {
  id: string;
  name: string;
  total_words: number;
  words_completed: number;
  progress_percent: number;
}
