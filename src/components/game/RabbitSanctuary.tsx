"use client";
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Heart,
  Smile,
  Zap,
  Award,
  Edit3,
  Check,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import { UserGameProfile, RabbitMood, WardrobeCategory, WardrobeItem } from "@/types/game";
import { getRabbitStage, RABBIT_DIALOGUES, WARDROBE_CATALOG } from "@/lib/game/game-service";
import { Button } from "@/components/ui/Button";
import { WardrobeModal } from "./WardrobeModal";

interface RabbitSanctuaryProps {
  profile: UserGameProfile;
  levelInfo: {
    level: number;
    currentLevelXp: number;
    xpNeededForNext: number;
    progressPercent: number;
  };
  onFeedRabbit: () => Promise<void>;
  onPetRabbit: () => void;
  onRenameRabbit: (newName: string) => Promise<void>;
  onEquipItem: (category: WardrobeCategory, itemId: string) => Promise<void>;
  onBuyItem: (item: WardrobeItem) => Promise<void>;
  feeding: boolean;
}

export function RabbitSanctuary({
  profile,
  levelInfo,
  onFeedRabbit,
  onPetRabbit,
  onRenameRabbit,
  onEquipItem,
  onBuyItem,
  feeding,
}: RabbitSanctuaryProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.rabbit_name);
  const [floatingHeart, setFloatingHeart] = useState(false);
  const [floatingXp, setFloatingXp] = useState<number | null>(null);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [dialogue, setDialogue] = useState<string | null>(null);

  const stageInfo = getRabbitStage(profile.level);

  // Background themes based on equipped background
  const bgStyles: Record<string, string> = {
    meadow: "from-emerald-50/70 via-amber-50/40 to-teal-50/60 border-emerald-100",
    study_room: "from-amber-100/60 via-orange-50/40 to-yellow-50/70 border-amber-200",
    carrot_farm: "from-orange-100/70 via-amber-50 to-orange-50 border-orange-200",
    sky_island: "from-sky-100/70 via-indigo-50/50 to-pink-50/60 border-sky-200",
  };
  const activeBg = bgStyles[profile.equipped_items?.background || "meadow"] || bgStyles.meadow;

  // Equipped hat and accessory items
  const equippedHat = WARDROBE_CATALOG.find(
    (i) => i.id === profile.equipped_items?.hat && i.id !== "none"
  );
  const equippedAccessory = WARDROBE_CATALOG.find(
    (i) => i.id === profile.equipped_items?.accessory && i.id !== "none"
  );

  const handlePet = () => {
    setFloatingHeart(true);
    onPetRabbit();

    // Trigger dialogue
    const quotes = RABBIT_DIALOGUES[stageInfo.stage] || RABBIT_DIALOGUES.baby;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setDialogue(randomQuote);

    setTimeout(() => setFloatingHeart(false), 1200);
    setTimeout(() => setDialogue(null), 3500);
  };

  const handleFeed = async () => {
    if (profile.carrots < 1 || feeding) return;
    setFloatingXp(15);
    await onFeedRabbit();

    setDialogue("Cà rốt giòn ngọt quá! Mình được nạp thêm nhiều năng lượng rồi! 🥕✨");
    setTimeout(() => setFloatingXp(null), 1500);
    setTimeout(() => setDialogue(null), 3500);
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      await onRenameRabbit(tempName.trim());
    }
    setEditingName(false);
  };

  const moodConfig: Record<RabbitMood, { label: string; color: string; emoji: string }> = {
    happy: { label: "Vui vẻ", color: "bg-emerald-50 text-emerald-700 border-emerald-200", emoji: "😊" },
    excited: { label: "Hào hứng", color: "bg-amber-50 text-amber-700 border-amber-200", emoji: "✨" },
    sleepy: { label: "Buồn ngủ", color: "bg-purple-50 text-purple-700 border-purple-200", emoji: "💤" },
    hungry: { label: "Đói bụng", color: "bg-rose-50 text-rose-700 border-rose-200", emoji: "🥕" },
  };

  const currentMood = moodConfig[profile.rabbit_mood] || moodConfig.happy;

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${activeBg} p-6 sm:p-8 border shadow-sm transition-all duration-500`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Mascot & Evolution Stage */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-5">
            <div
              className="relative group cursor-pointer"
              onClick={handlePet}
              title="Nhấn để vuốt ve và trò chuyện cùng Bé Thỏ!"
            >
              {/* Animated aura ring */}
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-amber-400 via-pink-400 to-indigo-400 opacity-30 blur-sm group-hover:opacity-70 transition duration-300 animate-pulse" />

              {/* Mascot Container */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-white/95 p-3.5 shadow-md border border-white flex items-center justify-center overflow-visible">
                {/* Equipped Hat Overlay */}
                {equippedHat && (
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl select-none z-20 drop-shadow-md"
                    title={equippedHat.name}
                  >
                    {equippedHat.icon}
                  </motion.div>
                )}

                {/* Rabbit Mascot Image */}
                <motion.div
                  key={stageInfo.stage}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full h-full flex items-center justify-center cursor-pointer"
                >
                  <Image
                    src={stageInfo.imageSrc || "/rabbit-mascot.png"}
                    alt={`${profile.rabbit_name} - ${stageInfo.title}`}
                    width={130}
                    height={130}
                    className="object-contain max-h-full drop-shadow-sm select-none rounded-2xl"
                    priority
                    unoptimized
                  />
                </motion.div>

                {/* Equipped Accessory Overlay */}
                {equippedAccessory && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1 text-2xl select-none z-20 drop-shadow-sm bg-white/90 p-0.5 rounded-full border border-gray-100"
                    title={equippedAccessory.name}
                  >
                    {equippedAccessory.icon}
                  </motion.div>
                )}

                {/* Floating heart on pet */}
                <AnimatePresence>
                  {floatingHeart && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.5 }}
                      animate={{ opacity: 1, y: -25, scale: 1.2 }}
                      exit={{ opacity: 0, y: -40 }}
                      className="absolute top-2 text-2xl pointer-events-none z-20"
                    >
                      ❤️
                    </motion.div>
                  )}
                  {floatingXp && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.6 }}
                      animate={{ opacity: 1, y: -30, scale: 1.1 }}
                      exit={{ opacity: 0, y: -45 }}
                      className="absolute top-1 bg-amber-500 text-white font-extrabold text-xs px-2 py-0.5 rounded-full shadow-md z-20"
                    >
                      +{floatingXp} XP 🥕
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Level Badge */}
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 shrink-0 border border-white">
                <Zap className="w-3 h-3 fill-current" />
                <span>Lv.{levelInfo.level}</span>
              </div>
            </div>

            {/* Name, Stage & Status */}
            <div className="space-y-2 max-w-sm">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      maxLength={20}
                      className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      title="Lưu tên"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      {profile.rabbit_name}
                    </h2>
                    <button
                      onClick={() => {
                        setTempName(profile.rabbit_name);
                        setEditingName(true);
                      }}
                      className="text-gray-400 hover:text-indigo-600 p-1 rounded-md transition-colors"
                      title="Đổi tên thỏ"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Evolution Stage Pill */}
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs flex items-center gap-1">
                  <span>{stageInfo.badgeEmoji}</span>
                  <span>{stageInfo.title}</span>
                </span>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${currentMood.color} flex items-center gap-1`}
                >
                  <span>{currentMood.emoji}</span>
                  <span>{currentMood.label}</span>
                </span>
              </div>

              {/* Rabbit Speech Bubble */}
              <AnimatePresence>
                {dialogue && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white/95 border border-indigo-100 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-2xl shadow-sm inline-block"
                  >
                    💬 {dialogue}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Level Progress bar & Evolution Goal */}
              <div className="space-y-1 w-full max-w-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                  <span>Kinh nghiệm (XP)</span>
                  <span className="text-indigo-600 font-bold">
                    {levelInfo.currentLevelXp} / {levelInfo.xpNeededForNext} XP
                  </span>
                </div>
                <div className="h-2.5 w-full bg-white/80 rounded-full overflow-hidden p-0.5 border border-black/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progressPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 italic">
                  {stageInfo.nextStageAtLevel
                    ? `Cần đạt Cấp độ ${stageInfo.nextStageAtLevel} để tiến hóa giai đoạn tiếp theo!`
                    : "Đã đạt đỉnh cao tiến hóa: Đại Sư Thần Thỏ!"}
                </p>

                {/* Evolution Stage Milestones */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[
                    { stage: "baby", label: "Sơ sinh", emoji: "🐣", lvl: 1 },
                    { stage: "junior", label: "Học sinh", emoji: "🎒", lvl: 3 },
                    { stage: "explorer", label: "Thám hiểm", emoji: "🧭", lvl: 6 },
                    { stage: "master", label: "Đại sư", emoji: "👑", lvl: 10 },
                  ].map((step, idx) => {
                    const isPassed = levelInfo.level >= step.lvl;
                    const isCurrent = stageInfo.stage === step.stage;
                    return (
                      <div
                        key={step.stage}
                        className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                          isCurrent
                            ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300"
                            : isPassed
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                        title={`Giai đoạn ${step.label} (Cấp độ ${step.lvl}+)`}
                      >
                        <span className="mr-0.5">{step.emoji}</span>
                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Wallet & Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Carrot Wallet */}
            <div className="bg-white/90 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-orange-200/80 shadow-xs flex items-center gap-2.5">
              <span className="text-2xl animate-bounce">🥕</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Cà rốt</p>
                <p className="text-xl font-black text-gray-900 leading-tight">{profile.carrots}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center">
              <Button
                id="btn-feed-rabbit"
                variant="secondary"
                size="sm"
                onClick={handleFeed}
                disabled={profile.carrots < 1 || feeding}
                className="bg-orange-500 hover:bg-orange-600 text-white border-transparent shadow-xs font-bold text-xs"
                leftIcon={<span>🥕</span>}
              >
                Cho ăn (-1 🥕)
              </Button>
              <Button
                id="btn-pet-rabbit"
                variant="outline"
                size="sm"
                onClick={handlePet}
                className="bg-white hover:bg-pink-50 border-pink-200 text-pink-700 font-bold text-xs"
                leftIcon={<Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />}
              >
                Xoa đầu
              </Button>
              <Button
                id="btn-open-wardrobe"
                size="sm"
                onClick={() => setWardrobeOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
              >
                Tủ đồ thời trang 👗
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Wardrobe Modal */}
      <WardrobeModal
        profile={profile}
        isOpen={wardrobeOpen}
        onClose={() => setWardrobeOpen(false)}
        onEquipItem={onEquipItem}
        onBuyItem={onBuyItem}
      />
    </>
  );
}
