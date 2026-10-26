"use client";
import { useState } from "react";
import { X, Sparkles, Check, Lock, ShoppingBag } from "lucide-react";
import { UserGameProfile, WardrobeCategory, WardrobeItem } from "@/types/game";
import { WARDROBE_CATALOG } from "@/lib/game/game-service";
import { Button } from "@/components/ui/Button";

interface WardrobeModalProps {
  profile: UserGameProfile;
  isOpen: boolean;
  onClose: () => void;
  onEquipItem: (category: WardrobeCategory, itemId: string) => Promise<void>;
  onBuyItem: (item: WardrobeItem) => Promise<void>;
}

export function WardrobeModal({
  profile,
  isOpen,
  onClose,
  onEquipItem,
  onBuyItem,
}: WardrobeModalProps) {
  const [activeTab, setActiveTab] = useState<WardrobeCategory>("hat");
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen) return null;

  const unlocked = new Set(profile.unlocked_items || ["none", "classic_bow", "straw_hat", "meadow"]);
  const equipped = profile.equipped_items || {};

  const items = WARDROBE_CATALOG.filter((item) => item.category === activeTab);

  const handleAction = async (item: WardrobeItem) => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      if (unlocked.has(item.id)) {
        // Equip
        await onEquipItem(item.category, item.id);
      } else {
        // Buy if enough carrots and level
        if (profile.carrots >= item.priceCarrots && profile.level >= item.requiredLevel) {
          await onBuyItem(item);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 text-left relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl shadow-xs">
              👗
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Tủ Đồ Thời Trang Của Bé Thỏ</h3>
              <p className="text-xs text-gray-500">Mặc thử trang phục và đổi phong cách cho thỏ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency & Level pill */}
        <div className="flex items-center justify-between bg-orange-50/70 p-3 rounded-2xl border border-orange-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥕</span>
            <div>
              <p className="text-[10px] font-bold uppercase text-orange-600">Cà rốt hiện có</p>
              <p className="text-base font-black text-orange-950">{profile.carrots} củ</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-xs">
              Cấp độ {profile.level}
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("hat")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "hat"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>🎩</span>
            <span>Mũ & Nón</span>
          </button>
          <button
            onClick={() => setActiveTab("accessory")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "accessory"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>🎀</span>
            <span>Phụ kiện</span>
          </button>
          <button
            onClick={() => setActiveTab("background")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "background"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>🏞️</span>
            <span>Bối cảnh</span>
          </button>
        </div>

        {/* Item Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
          {items.map((item) => {
            const isUnlocked = unlocked.has(item.id);
            const isEquipped = equipped[item.category] === item.id;
            const canAfford = profile.carrots >= item.priceCarrots;
            const levelMet = profile.level >= item.requiredLevel;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2.5 ${
                  isEquipped
                    ? "bg-indigo-50/80 border-indigo-500 shadow-sm"
                    : isUnlocked
                    ? "bg-white border-gray-200 hover:border-indigo-300"
                    : "bg-gray-50 border-gray-100 opacity-80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl shadow-xs shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                      {isEquipped && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded-md">
                          Đang mặc
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  {isUnlocked ? (
                    <Button
                      size="sm"
                      onClick={() => handleAction(item)}
                      disabled={isEquipped || actionLoading}
                      className={`h-7 text-xs font-bold px-3 w-full rounded-xl ${
                        isEquipped
                          ? "bg-indigo-100 text-indigo-700 border-transparent cursor-default"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      {isEquipped ? "Đang mặc" : "Mặc đồ"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAction(item)}
                      disabled={!canAfford || !levelMet || actionLoading}
                      className={`h-7 text-xs font-bold px-3 w-full rounded-xl ${
                        canAfford && levelMet
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed border-transparent"
                      }`}
                      leftIcon={
                        !levelMet ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <ShoppingBag className="w-3 h-3" />
                        )
                      }
                    >
                      {!levelMet
                        ? `Cần Cấp ${item.requiredLevel}`
                        : `Mua: ${item.priceCarrots} 🥕`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
