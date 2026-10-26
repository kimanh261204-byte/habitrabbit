"use client";
import { useState } from "react";
import { CheckCircle2, Gift, Sparkles, Target, X, ListFilter, ArrowRight } from "lucide-react";
import { GameQuest } from "@/types/game";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DailyQuestsCardProps {
  quests: GameQuest[];
  onClaimQuest?: (questId: string) => void;
}

export function DailyQuestsCard({ quests, onClaimQuest }: DailyQuestsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const completedCount = quests.filter((q) => q.is_completed).length;

  const filteredQuests = quests.filter((q) => {
    if (filter === "completed") return q.is_completed;
    if (filter === "pending") return !q.is_completed;
    return true;
  });

  return (
    <>
      <Card className="p-5 border-indigo-100/80 bg-white/90 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nhiệm vụ hằng ngày</h3>
              <p className="text-[11px] text-gray-400">
                Đạt {completedCount}/{quests.length} nhiệm vụ
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            id="btn-open-quests-modal"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          >
            Xem tất cả ({quests.length}) 📋
          </button>
        </div>

        {/* Preview of Quests (Show top 3 on sidebar) */}
        <div className="space-y-3">
          {quests.slice(0, 3).map((quest) => {
            const progressPct = Math.min(
              100,
              Math.round((quest.current_count / Math.max(1, quest.target_count)) * 100)
            );

            return (
              <div
                key={quest.id}
                className="flex flex-col gap-2 p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-800">{quest.title}</p>
                      {quest.is_completed && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Đạt
                        </span>
                      )}
                    </div>
                    {/* Full description without cutting off */}
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                      {quest.description}
                    </p>
                  </div>

                  {/* Reward badge */}
                  <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 shrink-0">
                    <span>+{quest.xp_reward} XP</span>
                    <span>•</span>
                    <span>+{quest.carrot_reward} 🥕</span>
                  </div>
                </div>

                {/* Progress bar & Claim button */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 shrink-0">
                      {quest.current_count} / {quest.target_count}
                    </span>
                  </div>

                  {quest.is_completed && !quest.is_claimed && onClaimQuest && (
                    <Button
                      size="sm"
                      onClick={() => onClaimQuest(quest.id)}
                      className="h-6 text-[10px] px-2.5 py-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs shrink-0"
                      leftIcon={<Gift className="w-3 h-3" />}
                    >
                      Nhận thưởng
                    </Button>
                  )}
                  {quest.is_claimed && (
                    <span className="text-[10px] font-medium text-gray-400 shrink-0">Đã nhận</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View all quests link */}
        {quests.length > 3 && (
          <div className="pt-3 text-center border-t border-gray-100 mt-3">
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
            >
              <span>Xem thêm {quests.length - 3} nhiệm vụ khác</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </Card>

      {/* Full Quests Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-100 text-left relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-xs">
                  🎯
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Danh Sách Nhiệm Vụ Hằng Ngày</h3>
                  <p className="text-xs text-gray-500">
                    Hoàn thành các thử thách để nhận Cà rốt và tăng cấp Bé Thỏ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-2.5 rounded-2xl shrink-0">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setFilter("all")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filter === "all"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Tất cả ({quests.length})
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filter === "pending"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Chưa xong ({quests.length - completedCount})
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filter === "completed"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Đã đạt ({completedCount})
                </button>
              </div>

              <span className="text-xs font-semibold text-gray-500">
                Tự động làm mới lúc <strong>00:00</strong>
              </span>
            </div>

            {/* Quests Scrollable List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {filteredQuests.map((quest) => {
                const progressPct = Math.min(
                  100,
                  Math.round((quest.current_count / Math.max(1, quest.target_count)) * 100)
                );

                return (
                  <div
                    key={quest.id}
                    className="p-4 rounded-2xl bg-white border border-gray-100 hover:border-indigo-200 shadow-2xs space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-900">{quest.title}</h4>
                          {quest.is_completed && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã hoàn thành
                            </span>
                          )}
                        </div>
                        {/* FULL UNTRUNCATED DESCRIPTION */}
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {quest.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100 shrink-0">
                        <span>+{quest.xp_reward} XP</span>
                        <span>•</span>
                        <span>+{quest.carrot_reward} 🥕</span>
                      </div>
                    </div>

                    {/* Progress Bar & Claim Button */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-500 shrink-0">
                          {quest.current_count} / {quest.target_count}
                        </span>
                      </div>

                      {quest.is_completed && !quest.is_claimed && onClaimQuest && (
                        <Button
                          size="sm"
                          onClick={() => onClaimQuest(quest.id)}
                          className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs"
                          leftIcon={<Gift className="w-3.5 h-3.5" />}
                        >
                          Nhận thưởng
                        </Button>
                      )}
                      {quest.is_claimed && (
                        <span className="text-xs font-bold text-gray-400">Đã nhận thưởng</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
