"use client";
import { useEffect, useState } from "react";
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

interface Stats {
  totalWords: number;
  wordsSeen: number;
  wordsMastered: number;
  wordsDueToday: number;
  lessonsCompleted: number;
  libraries: { id: string; name: string; total: number; completed: number; progress: number }[];
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("bạn");
  const [greeting, setGreeting] = useState("Xin chào");

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
      const { data: libraries } = await supabase
        .from("vocabulary_libraries")
        .select("id, name")
        .eq("user_id", user.id);

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

      // Compute word count per library
      const libStats = await Promise.all(
        userLibs.map(async (lib) => {
          const { count: total } = await supabase
            .from("vocabulary_items")
            .select("*", { count: "exact", head: true })
            .eq("library_id", lib.id);

          const { data: itemRows } = await supabase
            .from("vocabulary_items")
            .select("id")
            .eq("library_id", lib.id);

          const itemIds = new Set((itemRows || []).map((i) => i.id));
          const completedCount = userProgress.filter(
            (p) => itemIds.has(p.vocabulary_item_id) && p.learning_status === "mastered"
          ).length;

          const totalNum = total ?? 0;
          const pct = totalNum > 0 ? Math.round((completedCount / totalNum) * 100) : 0;

          return {
            id: lib.id,
            name: lib.name,
            total: totalNum,
            completed: completedCount,
            progress: pct,
          };
        })
      );

      let lessonsCompleted = 0;
      if (libIds.length > 0) {
        const { count } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .in("library_id", libIds)
          .eq("status", "completed");
        lessonsCompleted = count ?? 0;
      }

      setStats({
        totalWords: userProgress.length,
        wordsSeen,
        wordsMastered,
        wordsDueToday: wordsDue,
        lessonsCompleted,
        libraries: libStats,
      });
      setLoading(false);
    };

    load();
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

      {/* Libraries section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Thư viện từ vựng của bạn</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tiến độ ghi nhớ theo từng tài liệu</p>
          </div>
          <Link href="/libraries" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!stats?.libraries || stats.libraries.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Chưa có thư viện từ vựng nào</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Tải lên file Excel hoặc CSV đầu tiên của bạn để VocaFlow tự động nhận diện và chia nhỏ bài học.
              </p>
            </div>
            <Link href="/libraries/import">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Import tài liệu ngay
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.libraries.map((lib) => (
              <Card key={lib.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{lib.name}</h3>
                    <Badge variant="purple" size="sm">
                      {lib.total} từ
                    </Badge>
                  </div>
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
        )}
      </div>
    </div>
  );
}