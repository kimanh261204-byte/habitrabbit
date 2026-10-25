"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  BookMarked,
  Trash2,
  Upload,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";

interface Library {
  id: string;
  name: string;
  description?: string | null;
  source_file_name?: string | null;
  total_words: number;
  total_lessons: number;
  words_completed: number;
  progress_percent: number;
  created_at: string;
}

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "core" | "custom">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [newLibDesc, setNewLibDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLibraries = async () => {
    try {
      const res = await fetch("/api/libraries");
      const data = await res.json();
      if (res.ok) {
        setLibraries(data.libraries || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách thư viện:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLibName.trim(), description: newLibDesc.trim() || null }),
      });
      if (res.ok) {
        setNewLibName("");
        setNewLibDesc("");
        setCreateModalOpen(false);
        fetchLibraries();
      }
    } catch (err) {
      console.error("Lỗi tạo thư viện:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/libraries/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteId(null);
        fetchLibraries();
      }
    } catch (err) {
      console.error("Lỗi xóa thư viện:", err);
    } finally {
      setDeleting(false);
    }
  };

  const isCore = (lib: Library) =>
    lib.source_file_name === "default_curriculum.xlsx" || lib.name.startsWith("Khóa ");

  const coreCount = libraries.filter(isCore).length;
  const customCount = libraries.length - coreCount;

  const filtered = libraries
    .filter((lib) => {
      if (tab === "core") return isCore(lib);
      if (tab === "custom") return !isCore(lib);
      return true;
    })
    .filter(
      (lib) =>
        lib.name.toLowerCase().includes(search.toLowerCase()) ||
        lib.description?.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang tải danh sách thư viện...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thư viện từ vựng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gồm 6 khóa học Cốt lõi mặc định và các bộ tài liệu tự tải lên bổ sung
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo thư viện mới
          </Button>
          <Link href="/libraries/import">
            <Button leftIcon={<Upload className="w-4 h-4" />}>Import Excel/CSV</Button>
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "all"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tất cả ({libraries.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("core")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              tab === "core"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Lộ trình Cốt lõi ({coreCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "custom"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tự tải lên ({customCount})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm thư viện..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Libraries */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {tab === "custom" ? "Chưa có thư viện tự tải nào" : "Không tìm thấy thư viện phù hợp"}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {tab === "custom"
                ? "Bạn có thể học bộ từ vựng Cốt lõi trước, hoặc tải file Excel/CSV lên để mở rộng vốn từ bất cứ khi nào."
                : "Thử thay đổi từ khóa tìm kiếm hoặc lọc theo tab khác."}
            </p>
          </div>
          {tab === "custom" && (
            <div className="flex gap-2 justify-center">
              <Link href="/libraries/import">
                <Button size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                  Import file Excel/CSV
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((lib) => {
            const core = isCore(lib);
            return (
              <Card
                key={lib.id}
                className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow group border-gray-100 hover:border-indigo-100"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <BookMarked className="w-5 h-5" />
                      </div>
                      {core ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Cốt lõi mặc định
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          Tự tải lên
                        </span>
                      )}
                    </div>

                    {!core && (
                      <button
                        type="button"
                        onClick={() => setDeleteId(lib.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Xóa thư viện"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {lib.name}
                    </h3>
                    {lib.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lib.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="purple" size="sm">
                      {lib.total_words} từ vựng
                    </Badge>
                    <Badge variant="default" size="sm">
                      {lib.total_lessons} bài học
                    </Badge>
                  </div>

                  <div className="pt-2">
                    <Progress value={lib.progress_percent} showLabel label="Đã ghi nhớ" />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Đã thuộc: <strong className="text-gray-800">{lib.words_completed}</strong> từ
                  </span>
                  <Link href={`/libraries/${lib.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Xem chi tiết
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Library Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tạo Thư viện mới"
        description="Đặt tên cho bộ từ vựng mới của bạn"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Tạo thư viện
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Tên thư viện *"
            value={newLibName}
            onChange={(e) => setNewLibName(e.target.value)}
            placeholder="Ví dụ: IELTS Vocabulary Band 7+"
            required
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả (tùy chọn)</label>
            <textarea
              value={newLibDesc}
              onChange={(e) => setNewLibDesc(e.target.value)}
              rows={3}
              placeholder="Ghi chú về bộ từ vựng này..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xác nhận xóa thư viện"
        description="Bạn có chắc chắn muốn xóa thư viện này? Tất cả các bài học và dữ liệu tiến độ liên quan sẽ bị xóa vĩnh viễn."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Xóa vĩnh viễn
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Thao tác này không thể hoàn tác. Dữ liệu ôn tập FSRS của các từ trong thư viện này cũng sẽ
          được dọn dẹp.
        </p>
      </Modal>
    </div>
  );
}