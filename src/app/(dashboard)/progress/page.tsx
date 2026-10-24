"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Flame,
  Award,
  Brain,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Volume2,
  CheckCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { speakWord } from "@/lib/audio/tts";

interface ProgressData {
  counts: {
    total: number;
    new: number;
    learning: number;
    review: number;
    relearning: number;
    mastered: number;
    dueToday: number;
    overdue: number;
  };
  retentionRate: number;
  streak: number;
  dailyActivity: { date: string; count: number; accuracy: number }[];
  weakWords: {
    id: string;
    word: string;
    ipa?: string;
    meaning_vi?: string;
    lapses: number;
    times_seen: number;
    times_incorrect: number;
    stability: number;
  }[];
  totalReviewsLogged: number;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/progress");
        const json = await res.json();
        if (res.ok) {
          setData(json);
        }
      } catch (err) {
        console.error("Lỗi khi tải tiến độ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang phân tích dữ liệu học tập...</p>
      </div>
    );
  }

  const counts = data?.counts || {
    total: 0,
    new: 0,
    learning: 0,
    review: 0,
    relearning: 0,
    mastered: 0,
    dueToday: 0,
    overdue: 0,
  };

  const totalWords = counts.total || 1;
  const masteredPct = Math.round((counts.mastered / totalWords) * 100);
  const reviewPct = Math.round((counts.review / totalWords) * 100);
  const learningPct = Math.round(((counts.learning + counts.relearning) / totalWords) * 100);
  const newPct = Math.max(0, 100 - masteredPct - reviewPct - learningPct);

  return (
    <div className="space-y-8 pb-20">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phân tích & Tiến độ Ghi nhớ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi độ ổn định trí nhớ và đường cong lãng quên FSRS của bạn
          </p>
        </div>
        {counts.dueToday > 0 && (
          <Link href="/review">
            <Button leftIcon={<RotateCcw className="w-4 h-4" />}>
              Ôn tập ngay ({counts.dueToday})
            </Button>
          </Link>
        )}
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng từ trong hệ thống</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{counts.total}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Chuỗi ngày học</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{data?.streak || 0} ngày</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Độ lưu giữ (Retention)</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{data?.retentionRate || 100}%</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đã làm chủ (Mastered)</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{counts.mastered}</p>
          </div>
        </Card>
      </div>

      {/* Memory Status Breakdown */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Trạng thái Phân bổ Trí nhớ</h3>
        <p className="text-xs text-gray-500 mb-6">
          Hệ thống phân loại từ theo thuật toán FSRS để tối ưu khoảng cách ôn tập
        </p>

        {/* Stacked Bar */}
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex mb-6">
          <div
            style={{ width: `${masteredPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Đã làm chủ: ${counts.mastered}`}
          />
          <div
            style={{ width: `${reviewPct}%` }}
            className="bg-indigo-500 transition-all duration-500"
            title={`Đang ôn tập: ${counts.review}`}
          />
          <div
            style={{ width: `${learningPct}%` }}
            className="bg-amber-400 transition-all duration-500"
            title={`Đang học: ${counts.learning + counts.relearning}`}
          />
          <div
            style={{ width: `${newPct}%` }}
            className="bg-gray-300 transition-all duration-500"
            title={`Từ mới: ${counts.new}`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Đã làm chủ (Mastered)</p>
              <p className="text-base font-bold text-gray-900">
                {counts.mastered} <span className="text-xs font-normal text-gray-400">({masteredPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Đang ôn tập (Review)</p>
              <p className="text-base font-bold text-gray-900">
                {counts.review} <span className="text-xs font-normal text-gray-400">({reviewPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Đang học / Cần củng cố</p>
              <p className="text-base font-bold text-gray-900">
                {counts.learning + counts.relearning}{" "}
                <span className="text-xs font-normal text-gray-400">({learningPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Chưa bắt đầu</p>
              <p className="text-base font-bold text-gray-900">
                {counts.new} <span className="text-xs font-normal text-gray-400">({newPct}%)</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 14-day Study Activity Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Hoạt động 14 ngày qua</h3>
            <p className="text-xs text-gray-500">Số lượng lượt ôn tập và độ chính xác theo ngày</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {data?.totalReviewsLogged || 0} lượt ôn tập gần đây
          </span>
        </div>

        <div className="flex items-end justify-between gap-1.5 h-44 pt-6 pb-2 px-1">
          {data?.dailyActivity?.map((item, idx) => {
            const maxCount = Math.max(
              ...((data?.dailyActivity || []).map((a) => a.count) || [1]),
              10
            );
            const heightPercent = Math.max(6, Math.round((item.count / maxCount) * 100));
            const dayLabel = item.date.slice(5); // MM-DD

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip on hover */}
                <span className="text-[10px] font-semibold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.count} từ ({item.accuracy}%)
                </span>
                {/* Bar */}
                <div className="w-full max-w-[28px] bg-gray-100 rounded-t-lg relative flex items-end h-full overflow-hidden">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      item.count > 0
                        ? "bg-gradient-to-t from-indigo-600 to-violet-500"
                        : "bg-transparent"
                    }`}
                  />
                </div>
                {/* Date label */}
                <span className="text-[10px] text-gray-400">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weak Words / High-lapse Words */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-900">
              Từ vựng cần củng cố ({data?.weakWords?.length || 0})
            </h3>
          </div>
          <p className="text-xs text-gray-400">Các từ bạn hay quên hoặc trả lời sai nhiều lần</p>
        </div>

        {!data?.weakWords || data.weakWords.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            Tuyệt vời! Không có từ nào bị quên lặp lại.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.weakWords.map((word) => (
              <div
                key={word.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/60 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => speakWord(word.word)}
                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{word.word}</span>
                      {word.ipa && (
                        <span className="text-xs text-indigo-600 font-mono">{word.ipa}</span>
                      )}
                    </div>
                    {word.meaning_vi && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{word.meaning_vi}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-red-500">
                      Quên {word.lapses} lần
                    </span>
                    <p className="text-[11px] text-gray-400">Sai {word.times_incorrect} lần</p>
                  </div>
                  <Link href="/review">
                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Ôn lại
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}