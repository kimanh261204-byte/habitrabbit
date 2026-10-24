"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowRight,
  Search,
  ChevronLeft,
  GraduationCap,
  Upload,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";

interface Lesson {
  id: string;
  title: string;
  order_index: number;
  word_count: number;
  status: "not_started" | "learning" | "practice_completed" | "completed";
}

interface LibraryDetail {
  id: string;
  name: string;
  description?: string | null;
  total_words: number;
  lessons: Lesson[];
}

export default function LibraryDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [library, setLibrary] = useState<LibraryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/libraries/${id}`);
      const data = await res.json();
      if (res.ok) {
        setLibrary(data.library);
      } else {
        router.push("/libraries");
      }
    } catch (err) {
      console.error("Lỗi khi tải chi tiết thư viện:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang tải chi tiết thư viện...</p>
      </div>
    );
  }

  if (!library) return null;

  const lessons = library.lessons || [];
  const completedLessons = lessons.filter(
    (l) => l.status === "completed" || l.status === "practice_completed"
  ).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  const filteredLessons = lessons.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: Lesson["status"]) => {
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

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
      <Link
        href="/libraries"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Quay lại Thư viện</span>
      </Link>

      {/* Library Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Badge variant="purple">Bộ từ vựng</Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{library.total_words} từ</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{lessons.length} bài học</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{library.name}</h1>
          {library.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{library.description}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>Tiến độ hoàn thành</span>
              <span>{completedLessons}/{lessons.length} bài</span>
            </div>
            <Progress value={progressPercent} color="indigo" />
          </div>

          <Link href="/libraries/import">
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Thêm từ từ file mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Lessons List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Danh sách bài học</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Mỗi bài học chứa khoảng 10 - 20 từ, tối ưu cho một phiên học tập trung
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài học..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Lessons List */}
      {filteredLessons.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Thư viện này chưa có bài học nào</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Hãy tải lên file Excel hoặc CSV để tạo danh sách từ vựng và bài học tự động.
            </p>
          </div>
          <Link href="/libraries/import">
            <Button size="sm" leftIcon={<Upload className="w-4 h-4" />}>
              Import từ vựng vào đây
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow group border-gray-100 hover:border-indigo-100"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Bài {lesson.order_index}
                  </span>
                  {getStatusBadge(lesson.status)}
                </div>

                <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {lesson.title}
                </h3>

                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                  <span>{lesson.word_count} từ vựng</span>
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-gray-100 flex items-center gap-2">
                <Link href={`/lessons/${lesson.id}/learn`} className="flex-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                  >
                    Flashcard
                  </Button>
                </Link>
                <Link href={`/lessons/${lesson.id}/practice`} className="flex-1">
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    leftIcon={<GraduationCap className="w-3.5 h-3.5" />}
                  >
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