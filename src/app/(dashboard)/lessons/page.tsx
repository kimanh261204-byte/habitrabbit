"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  CheckCircle,
  Clock,
  Search,
  ArrowRight,
  Upload,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

interface LessonItem {
  id: string;
  title: string;
  order_index: number;
  word_count: number;
  status: "not_started" | "learning" | "practice_completed" | "completed";
  library_id: string;
  library_name: string;
}

export default function LessonsPage() {
  const supabase = createClient();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [libraries, setLibraries] = useState<{ id: string; name: string }[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "not_started" | "learning" | "completed">("all");

  useEffect(() => {
    const fetchAllLessons = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch libraries for user
        const { data: userLibraries } = await supabase
          .from("vocabulary_libraries")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name", { ascending: true });

        const libs = userLibraries || [];
        setLibraries(libs);

        if (libs.length === 0) {
          setLessons([]);
          setLoading(false);
          return;
        }

        const libMap = new Map(libs.map((l) => [l.id, l.name]));
        const libIds = libs.map((l) => l.id);

        const { data: rawLessons } = await supabase
          .from("lessons")
          .select("*")
          .in("library_id", libIds)
          .order("order_index", { ascending: true });

        const mapped: LessonItem[] = (rawLessons || []).map((l) => ({
          ...l,
          library_name: libMap.get(l.library_id) || "Thư viện",
        }));

        setLessons(mapped);
      } catch (err) {
        console.error("Lỗi khi tải danh sách bài học:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLessons();
  }, []);

  const filtered = lessons.filter((lesson) => {
    if (selectedLibraryId !== "all" && lesson.library_id !== selectedLibraryId) {
      return false;
    }
    const matchesSearch =
      lesson.title.toLowerCase().includes(search.toLowerCase()) ||
      lesson.library_name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "completed") return lesson.status === "completed" || lesson.status === "practice_completed";
    return lesson.status === filter;
  });

  const getStatusBadge = (status: LessonItem["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Hoàn thành</Badge>;
      case "practice_completed":
        return <Badge variant="purple">Đã kiểm tra</Badge>;
      case "learning":
        return <Badge variant="warning">Đang học</Badge>;
      default:
        return <Badge variant="default">Chưa học</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang tải danh sách bài học...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tất cả Bài học</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng cộng {lessons.length} bài học được chia nhỏ từ các tài liệu bạn đã tải lên
          </p>
        </div>
        <Link href="/libraries/import">
          <Button leftIcon={<Upload className="w-4 h-4" />}>Import tài liệu mới</Button>
        </Link>
      </div>

      {/* Course / Library Filter Pills */}
      {libraries.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 font-medium whitespace-nowrap pl-1">Khóa học:</span>
          <button
            type="button"
            onClick={() => setSelectedLibraryId("all")}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              selectedLibraryId === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Tất cả ({lessons.length})
          </button>
          {libraries.map((lib) => {
            const count = lessons.filter((l) => l.library_id === lib.id).length;
            const shortName = lib.name.replace(/^Khóa \d+:\s*/, "");
            return (
              <button
                key={lib.id}
                type="button"
                onClick={() => setSelectedLibraryId(lib.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedLibraryId === lib.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {lib.name.startsWith("Khóa ") ? lib.name.split(":")[0] : shortName} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bài học..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Tất cả trạng thái" },
            { id: "not_started", label: "Chưa học" },
            { id: "learning", label: "Đang học" },
            { id: "completed", label: "Đã xong" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Không tìm thấy bài học nào</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {lessons.length === 0
                ? "Bạn chưa có bài học nào. Hãy import file từ vựng Excel/CSV để AI tự động chia bài học!"
                : "Không có bài học nào khớp với bộ lọc hiện tại."}
            </p>
          </div>
          {lessons.length === 0 && (
            <Link href="/libraries/import">
              <Button size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                Import từ vựng ngay
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lesson) => (
            <Card
              key={lesson.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow group border-gray-100 hover:border-indigo-100"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                    {lesson.library_name}
                  </span>
                  {getStatusBadge(lesson.status)}
                </div>

                <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {lesson.title}
                </h3>

                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                  <span>{lesson.word_count} từ vựng</span>
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-gray-100 flex items-center gap-2">
                <Link href={`/lessons/${lesson.id}/learn`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full text-xs" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
                    Flashcard
                  </Button>
                </Link>
                <Link href={`/lessons/${lesson.id}/practice`} className="flex-1">
                  <Button size="sm" className="w-full text-xs" leftIcon={<GraduationCap className="w-3.5 h-3.5" />}>
                    Luyện tập
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}