"use client";
import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Sliders,
  Sparkles,
  Save,
  CheckCircle,
  Volume2,
  BookOpen,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [accent, setAccent] = useState<"us" | "uk">("us");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [lessonSize, setLessonSize] = useState(20);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [customApiKey, setCustomApiKey] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");

        // Load settings from user_settings table
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (userSettings) {
          setAccent(userSettings.preferred_accent || "us");
          setDailyGoal(userSettings.daily_goal || 20);
          setLessonSize(userSettings.default_lesson_size || 20);
        }
      }
      setLoading(false);
    };

    loadUserData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: displayName },
      });

      // Update user_settings
      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          preferred_accent: accent,
          daily_goal: dailyGoal,
          default_lesson_size: lessonSize,
          updated_at: new Date().toISOString(),
        });

      if (!upsertError) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Lỗi khi lưu cài đặt:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang tải cấu hình cá nhân...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tùy chỉnh trải nghiệm học tập, mục tiêu hằng ngày và tích hợp AI
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Hồ sơ cá nhân</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Tên hiển thị"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
              />
            </div>
            <div>
              <Input
                label="Email tài khoản"
                value={email}
                disabled
                hint="Email không thể thay đổi trực tiếp"
              />
            </div>
          </div>
        </Card>

        {/* Study Preferences */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Tùy chọn Học tập</h2>
          </div>

          {/* Accent choice */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giọng phát âm ưu tiên (TTS)
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setAccent("us")}
                className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                  accent === "us"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <div>
                  <p className="text-sm">Anh - Mỹ (US)</p>
                  <p className="text-xs text-gray-400 font-normal">American English</p>
                </div>
                {accent === "us" && <CheckCircle className="w-4 h-4 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => setAccent("uk")}
                className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                  accent === "uk"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <div>
                  <p className="text-sm">Anh - Anh (UK)</p>
                  <p className="text-xs text-gray-400 font-normal">British English</p>
                </div>
                {accent === "uk" && <CheckCircle className="w-4 h-4 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* Daily Goal & Lesson Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mục tiêu từ cần học mỗi ngày
              </label>
              <select
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10 từ / ngày (Nhẹ nhàng)</option>
                <option value={20}>20 từ / ngày (Tiêu chuẩn)</option>
                <option value={30}>30 từ / ngày (Tích cực)</option>
                <option value={50}>50 từ / ngày (Chuyên sâu)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Giúp hệ thống nhắc nhở và tính chuỗi Streak hằng ngày.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kích thước mỗi bài học (Lesson size)
              </label>
              <select
                value={lessonSize}
                onChange={(e) => setLessonSize(Number(e.target.value))}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10 từ / bài học</option>
                <option value={15}>15 từ / bài học</option>
                <option value={20}>20 từ / bài học (Khuyên dùng)</option>
                <option value={30}>30 từ / bài học</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Số từ tối đa trong một bài học khi Import file mới.
              </p>
            </div>
          </div>
        </Card>

        {/* AI Preferences */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Tính năng AI Thông minh</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoEnrich}
                onChange={(e) => setAutoEnrich(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Tự động điền dữ liệu còn thiếu bằng AI
                </p>
                <p className="text-xs text-gray-500">
                  Khi import file, nếu từ thiếu IPA, phiên âm, câu ví dụ hoặc nghĩa tiếng Việt, AI sẽ
                  tự động bổ sung chính xác theo ngữ cảnh.
                </p>
              </div>
            </label>

            <div>
              <Input
                label="Custom Google Gemini API Key (Tùy chọn)"
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy..."
                hint="Mặc định hệ thống sử dụng khóa máy chủ. Bạn có thể nhập khóa cá nhân nếu muốn hạn mức riêng biệt."
              />
            </div>
          </div>
        </Card>

        {/* Save button & status */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Đã lưu cài đặt thành công!
            </span>
          ) : (
            <span />
          )}

          <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}