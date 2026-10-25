"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  BookMarked,
  GraduationCap,
  RotateCcw,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Flame,
  Target,
  Brain,
  Upload,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface LibStat {
  id: string;
  name: string;
  description?: string | null;
  source_file_name?: string | null;
  total: number;
  completed: number;
  progress: number;
  isCore: boolean;
}

interface Stats {
  totalWords: number;
  wordsSeen: number;
  wordsMastered: number;
  wordsDueToday: number;
  lessonsCompleted: number;
  coreLibraries: LibStat[];
  customLibraries: LibStat[];
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("bạn");
  const [greeting, setGreeting] = useState("Xin chào");
  const isEnsuringRef = useRef(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối");

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserName(
        user.user_metadata?.full_name?.split(" ").pop() ?? user.email?.split("@")[0] ?? "bạn"
      );

      // Fetch user libraries
      let { data: libraries } = await supabase
        .from("vocabulary_libraries")
        .select("id, name, description, source_file_name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      // Trigger ensure curriculum ONLY ONCE if user has less than 6 core courses
      if ((!libraries || libraries.length < 6) && !isEnsuringRef.current) {
        isEnsuringRef.current = true;
        fetch("/api/curriculum/ensure", { method: "POST" })
          .catch((e) => console.error("Auto-seed error:", e))
          .finally(() => {
            isEnsuringRef.current = false;
          });
      }

      const userLibs = libraries ?? [];
      const libIds = userLibs.map((l) => l.id);

      // Fetch progress
      const { data: progress } = await supabase
        .from("user_vocabulary_progress")
        .select("learning_status, next_review_at, times_seen, vocabulary_item_id")
        .eq("user_id", user.id);

      const userProgress = progress ?? [];
      const now = new Date().toISOString();
      const wordsDue = userProgress.filter((p) => p.next_review_at && p.next_review_at <= now).length;
      const wordsSeen = userProgress.filter((p) => p.times_seen > 0).length;
      const wordsMastered = userProgress.filter((p) => p.learning_status === "mastered").length;

      // Fetch lessons and completed lessons in batch
      const [{ data: allLessons }, { count: completedLessonsCount }] = await Promise.all([
        supabase.from("lessons").select("id, library_id, word_count").in("library_id", libIds),
        supabase.from("lessons").select("*", { count: "exact", head: true }).in("library_id", libIds).eq("status", "completed"),
      ]);

      const wordsByLib = new Map<string, number>();
      for (const lesson of allLessons || []) {
        const current = wordsByLib.get(lesson.library_id) || 0;
        wordsByLib.set(lesson.library_id, current + (lesson.word_count || 0));
      }

      const libStats: LibStat[] = userLibs.map((lib) => {
        const totalNum = wordsByLib.get(lib.id) || 0;
        const completedCount = 0;
        const pct = 0;
        const isCore = lib.source_file_name === "default_curriculum.xlsx" || lib.name.startsWith("Khóa ");

        return {
          id: lib.id,
          name: lib.name,
          description: lib.description,
          source_file_name: lib.source_file_name,
          total: totalNum,
          completed: completedCount,
          progress: pct,
          isCore,
        };
      });

      const lessonsCompleted = completedLessonsCount ?? 0;

      // Sort core libraries 1 -> 6
      const coreLibraries = libStats
        .filter((l) => l.isCore)
        .sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));

      const customLibraries = libStats.filter((l) => !l.isCore);

      setStats({
        totalWords: userProgress.length,
        wordsSeen,
        wordsMastered,
        wordsDueToday: wordsDue,
        lessonsCompleted,
        coreLibraries,
        customLibraries,
      });
      setLoading(false);

      // Auto-poll quietly if core courses are still initializing
      if (coreLibraries.length < 6) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(load, 2500);
      }
    };

    load();

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang tải trang tổng quan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting}, {userName}! 👋
          </h1>
          <p className="text-indigo-100 text-sm max-w-xl">
            {stats?.wordsDueToday
              ? `Bạn có ${stats.wordsDueToday} từ vựng đã đến hạn ôn tập FSRS hôm nay. Hãy duy trì nhịp học để không bị quên!`
              : "Không có từ nào đến hạn ôn tập hôm nay. Bạn có thể học bài mới hoặc tiếp tục luyện tập."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          {stats?.wordsDueToday ? (
            <Link href="/review">
              <Button
                variant="secondary"
                size="md"
                className="bg-white text-indigo-700 hover:bg-indigo-50 border-transparent shadow-xs"
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Ôn tập ngay ({stats.wordsDueToday})
              </Button>
            </Link>
          ) : (
            <Link href="/lessons">
              <Button
                variant="secondary"
                size="md"
                className="bg-white text-indigo-700 hover:bg-indigo-50 border-transparent shadow-xs"
                leftIcon={<GraduationCap className="w-4 h-4" />}
              >
                Học bài mới
              </Button>
            </Link>
          )}
          <Link href="/libraries/import">
            <Button
              variant="ghost"
              size="md"
              className="text-white hover:bg-white/10 border border-white/20"
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import từ mới
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Từ cần ôn hôm nay</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.wordsDueToday || 0}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang học</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.wordsSeen || 0}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đã làm chủ (Mastered)</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.wordsMastered || 0}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Bài học hoàn thành</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats?.lessonsCompleted || 0}</p>
          </div>
        </Card>
      </div>

      {/* Core Curriculum Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <h2 className="text-xl font-bold text-gray-900">
                Chương trình Cốt lõi (HabitRabbit Core Curriculum)
              </h2>
              <Badge variant="purple" size="sm">6 Khóa học chính thức</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Bộ tài liệu 2,900 từ vựng nền tảng được tích hợp sẵn — Bạn có thể học ngay mà không cần tải lên file!
            </p>
          </div>
          <Link
            href="/libraries"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
          >
            <span>Quản lý thư viện</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.coreLibraries && stats.coreLibraries.length > 0 ? (
          <div className="space-y-3">
            {stats.coreLibraries.length < 6 && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 font-medium">
                  <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>
                    Đang nạp nốt các khóa học cốt lõi còn lại ({stats.coreLibraries.length}/6)... Bạn có thể học ngay các khóa bên dưới!
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.coreLibraries.map((lib, idx) => (
                <Card
                  key={lib.id}
                  className="p-5 flex flex-col justify-between hover:shadow-md transition-all hover:border-indigo-200 group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                          0{idx + 1}
                        </span>
                        <Badge variant="purple" size="sm">
                          {lib.total} từ
                        </Badge>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Cốt lõi
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {lib.name}
                      </h3>
                      {lib.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {lib.description}
                        </p>
                      )}
                    </div>

                    <Progress value={lib.progress} showLabel label="Tiến độ hoàn thành" />
                  </div>

                  <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Đã thuộc: <strong className="text-gray-900">{lib.completed}</strong> /{lib.total}
                    </span>
                    <Link href={`/libraries/${lib.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Học ngay
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3 bg-indigo-50/20 border-dashed border-indigo-200">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-gray-900 text-sm">Đang tải và chuẩn bị 6 khóa học cốt lõi cho bạn...</p>
            <p className="text-xs text-gray-500 max-w-sm">
              Hệ thống đang tích hợp bộ 2,900 từ vựng nền tảng vào tài khoản mới. Vui lòng đợi trong giây lát, các khóa học sẽ tự động xuất hiện.
            </p>
          </Card>
        )}
      </div>

      {/* Custom Libraries Section */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Thư viện mở rộng tự tải lên
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sau khi học xong lộ trình cốt lõi hoặc muốn học thêm chuyên ngành riêng, bạn có thể tự tải thêm file Excel/CSV tại đây.
            </p>
          </div>
          <Link href="/libraries/import">
            <Button size="sm" variant="secondary" leftIcon={<Upload className="w-3.5 h-3.5" />}>
              + Tải lên file mới
            </Button>
          </Link>
        </div>

        {stats?.customLibraries && stats.customLibraries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.customLibraries.map((lib) => (
              <Card
                key={lib.id}
                className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{lib.name}</h3>
                    <Badge variant="info" size="sm">
                      {lib.total} từ
                    </Badge>
                  </div>
                  {lib.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">{lib.description}</p>
                  )}
                  <Progress value={lib.progress} showLabel label="Tiến độ" />
                </div>
                <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Đã thuộc: <strong className="text-gray-800">{lib.completed}</strong>
                  </span>
                  <Link href={`/libraries/${lib.id}`}>
                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Mở học
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 border-dashed border-2 border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-500 flex items-center justify-center shrink-0 shadow-xs">
                <Plus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  Chưa có bộ từ vựng tự tải nào
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bạn có thể tập trung học 6 khóa học cốt lõi ở trên trước, hoặc thêm file từ vựng riêng bất cứ khi nào bạn muốn.
                </p>
              </div>
            </div>
            <Link href="/libraries/import" className="shrink-0">
              <Button size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />}>
                Thêm file từ vựng
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}