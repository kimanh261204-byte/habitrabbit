"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Sparkles,
  Trophy,
  ArrowRight,
  Play,
  RotateCcw,
  BookOpen,
  Filter,
  CheckCircle2,
  Zap,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { RabbitSanctuary } from "@/components/game/RabbitSanctuary";
import { DailyQuestsCard } from "@/components/game/DailyQuestsCard";
import { WordMatchGame } from "@/components/game/WordMatchGame";
import { MissingWordGame } from "@/components/game/MissingWordGame";
import { MemoryFlipGame } from "@/components/game/MemoryFlipGame";
import { ListenCatchGame } from "@/components/game/ListenCatchGame";
import { SentenceBuilderGame } from "@/components/game/SentenceBuilderGame";
import { GameOverModal } from "@/components/game/GameOverModal";
import {
  UserGameProfile,
  GameQuest,
  MiniGameType,
  MiniGameWord,
  WardrobeCategory,
  WardrobeItem,
} from "@/types/game";
import {
  calculateLevelFromXp,
  getDefaultGameProfile,
  generateDailyQuests,
  getLocalGameState,
  saveLocalGameState,
} from "@/lib/game/game-service";
import { createClient } from "@/lib/supabase/client";

interface LevelInfo {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export default function GamePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string>("guest");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserGameProfile>(() => getDefaultGameProfile("guest"));
  const [levelInfo, setLevelInfo] = useState<LevelInfo>(() => calculateLevelFromXp(0));
  const [quests, setQuests] = useState<GameQuest[]>([]);
  const [feeding, setFeeding] = useState(false);

  // Mini-game state
  const [activeGame, setActiveGame] = useState<MiniGameType | null>(null);
  const [gameWords, setGameWords] = useState<MiniGameWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [wordSource, setWordSource] = useState<"mixed" | "due">("mixed");
  const recentlyPlayedRef = useRef<Set<string>>(new Set());

  // Game over state
  const [gameOverResult, setGameOverResult] = useState<{
    score: number;
    accuracy: number;
    xpEarned: number;
    carrotsEarned: number;
    leveledUp?: boolean;
    newLevel?: number;
    words: MiniGameWord[];
  } | null>(null);

  // Load user profile & quests
  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentId = user?.id || "guest";
      setUserId(currentId);

      const local = getLocalGameState(currentId);
      let mergedProfile = local.profile;
      let mergedQuests = local.quests;

      // Attempt API fetch
      try {
        const res = await fetch("/api/game/profile");
        if (res.ok) {
          const json = await res.json();
          if (json.profile) {
            // Keep the HIGHEST xp and carrots so level is NEVER lost on reload!
            const cloudXp = json.profile.xp || 0;
            const localXp = local.profile.xp || 0;
            const effectiveXp = Math.max(cloudXp, localXp);
            const effectiveCarrots = Math.max(json.profile.carrots ?? 15, local.profile.carrots ?? 15);
            const levelData = calculateLevelFromXp(effectiveXp);

            mergedProfile = {
              ...json.profile,
              xp: effectiveXp,
              level: levelData.level,
              carrots: effectiveCarrots,
              rabbit_name: local.profile.rabbit_name || json.profile.rabbit_name || "Bé Thỏ",
              equipped_items: {
                ...json.profile.equipped_items,
                ...local.profile.equipped_items,
              },
              unlocked_items: Array.from(
                new Set([...(json.profile.unlocked_items || []), ...(local.profile.unlocked_items || [])])
              ),
              study_streak_days: Math.max(local.profile.study_streak_days || 1, json.profile.study_streak_days || 1),
            };

            // If local was ahead of cloud, sync to cloud
            if (localXp > cloudXp) {
              fetch("/api/game/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "sync", payload: mergedProfile }),
              }).catch(() => {});
            }
          }
          if (json.quests && json.quests.length > 0) {
            mergedQuests = json.quests;
          }
        }
      } catch (err) {
        console.warn("Could not load cloud game profile, using local:", err);
      }

      setProfile(mergedProfile);
      setLevelInfo(calculateLevelFromXp(mergedProfile.xp));
      setQuests(mergedQuests);

      // Save to local storage
      saveLocalGameState(currentId, {
        profile: mergedProfile,
        quests: mergedQuests,
        achievements: [],
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Load data error:", e);
      const local = getLocalGameState(userId);
      setProfile(local.profile);
      setLevelInfo(calculateLevelFromXp(local.profile.xp));
      setQuests(local.quests);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pet action
  const handlePetRabbit = () => {
    setProfile((prev) => {
      const updated = { ...prev, rabbit_mood: "happy" as const };
      // Sync local state
      saveLocalGameState(userId, {
        profile: updated,
        quests,
        achievements: [],
        lastUpdated: new Date().toISOString(),
      });
      return updated;
    });

    fetch("/api/game/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pet" }),
    }).catch(() => {});
  };

  // Feed action
  const handleFeedRabbit = async () => {
    if (profile.carrots < 1 || feeding) return;
    setFeeding(true);

    try {
      const updatedXp = profile.xp + 10;
      const updatedCarrots = profile.carrots - 1;
      const newLvl = calculateLevelFromXp(updatedXp);

      const updatedProfile = {
        ...profile,
        xp: updatedXp,
        carrots: updatedCarrots,
        rabbit_mood: "excited" as const,
        level: newLvl.level,
      };

      setProfile(updatedProfile);
      setLevelInfo(newLvl);

      // Advance feed quest if present
      const updatedQuests = quests.map((q) => {
        if (q.quest_key === "feed_rabbit_quest") {
          const count = q.current_count + 1;
          return { ...q, current_count: count, is_completed: count >= q.target_count };
        }
        return q;
      });
      setQuests(updatedQuests);

      // Sync local storage immediately
      saveLocalGameState(userId, {
        profile: updatedProfile,
        quests: updatedQuests,
        achievements: [],
        lastUpdated: new Date().toISOString(),
      });

      await fetch("/api/game/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feed" }),
      });
    } catch (e) {
      console.error("Feed error:", e);
    } finally {
      setFeeding(false);
    }
  };

  // Rename action
  const handleRenameRabbit = async (newName: string) => {
    setProfile((prev) => ({ ...prev, rabbit_name: newName }));
    saveLocalGameState(userId, {
      profile: { ...profile, rabbit_name: newName },
      quests,
      achievements: [],
      lastUpdated: new Date().toISOString(),
    });

    await fetch("/api/game/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", payload: { name: newName } }),
    }).catch(() => {});
  };

  // Equip wardrobe item
  const handleEquipItem = async (category: WardrobeCategory, itemId: string) => {
    setProfile((prev) => {
      const updated = {
        ...prev,
        equipped_items: {
          ...prev.equipped_items,
          [category]: itemId,
        },
      };
      saveLocalGameState(userId, {
        profile: updated,
        quests,
        achievements: [],
        lastUpdated: new Date().toISOString(),
      });
      return updated;
    });

    await fetch("/api/game/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "equip",
        payload: {
          equipped_items: { [category]: itemId },
        },
      }),
    }).catch(() => {});
  };

  // Buy wardrobe item with carrots
  const handleBuyItem = async (item: WardrobeItem) => {
    if (profile.carrots < item.priceCarrots || profile.level < item.requiredLevel) return;

    const newCarrots = profile.carrots - item.priceCarrots;
    const newUnlocked = Array.from(new Set([...(profile.unlocked_items || []), item.id]));
    const newEquipped = {
      ...profile.equipped_items,
      [item.category]: item.id,
    };

    setProfile((prev) => {
      const updated = {
        ...prev,
        carrots: newCarrots,
        unlocked_items: newUnlocked,
        equipped_items: newEquipped,
      };
      saveLocalGameState(userId, {
        profile: updated,
        quests,
        achievements: [],
        lastUpdated: new Date().toISOString(),
      });
      return updated;
    });

    await fetch("/api/game/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "equip",
        payload: {
          equipped_items: { [item.category]: item.id },
        },
      }),
    }).catch(() => {});
  };

  // Claim quest reward
  const handleClaimQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === questId && q.is_completed && !q.is_claimed) {
          // Award XP and Carrots
          const newXp = profile.xp + q.xp_reward;
          const newCarrots = profile.carrots + q.carrot_reward;
          const newLvl = calculateLevelFromXp(newXp);
          const updatedProf = { ...profile, xp: newXp, carrots: newCarrots, level: newLvl.level };
          setProfile(updatedProf);
          setLevelInfo(newLvl);

          const updatedQuests = prev.map((item) =>
            item.id === questId ? { ...item, is_claimed: true } : item
          );

          saveLocalGameState(userId, {
            profile: updatedProf,
            quests: updatedQuests,
            achievements: [],
            lastUpdated: new Date().toISOString(),
          });

          return { ...q, is_claimed: true };
        }
        return q;
      })
    );
  };

  // Start a mini-game
  const handleStartGame = async (gameType: MiniGameType) => {
    setLoadingWords(true);
    setActiveGame(gameType);
    setGameOverResult(null);

    try {
      const excludeIds = Array.from(recentlyPlayedRef.current).slice(-40).join(",");
      const res = await fetch(`/api/game/words?source=${wordSource}&limit=24&exclude=${excludeIds}`);
      const data = await res.json();
      if (res.ok && data.words && data.words.length > 0) {
        setGameWords(data.words);
        // Track recently played to avoid repeating in subsequent games
        data.words.forEach((w: MiniGameWord) => recentlyPlayedRef.current.add(w.id));
      } else {
        // Fallback words if database returned empty
        setGameWords([
          { id: "1", word: "resilience", meaning_vi: "khả năng phục hồi, kiên cường", part_of_speech: "noun" },
          { id: "2", word: "ubiquitous", meaning_vi: "có mặt ở khắp nơi", part_of_speech: "adjective" },
          { id: "3", word: "ephemeral", meaning_vi: "phù du, chóng tàn", part_of_speech: "adjective" },
          { id: "4", word: "serendipity", meaning_vi: "sự tình cờ may mắn", part_of_speech: "noun" },
          { id: "5", word: "meticulous", meaning_vi: "tỉ mỉ, cẩn thận", part_of_speech: "adjective" },
          { id: "6", word: "pragmatic", meaning_vi: "thực dụng, thực tế", part_of_speech: "adjective" },
        ]);
      }
    } catch (e) {
      console.error("Lỗi tải từ vựng mini-game:", e);
    } finally {
      setLoadingWords(false);
    }
  };

  // Finish mini-game handler
  const handleFinishGame = async (result: {
    score: number;
    accuracy: number;
    wordsPlayed: number;
    durationSeconds: number;
  }) => {
    try {
      const res = await fetch("/api/game/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: activeGame,
          score: result.score,
          accuracy: result.accuracy,
          wordsPlayed: result.wordsPlayed,
          durationSeconds: result.durationSeconds,
        }),
      });

      let xp = 20;
      let carrots = 3;
      let leveledUp = false;
      let newLvlNumber = profile.level;

      let updatedFinalProfile: UserGameProfile = {
        ...profile,
        xp: profile.xp + xp,
        carrots: profile.carrots + carrots,
        level: newLvlNumber,
        rabbit_mood: "excited",
        last_active_date: new Date().toISOString().split("T")[0],
      };

      if (res.ok) {
        const data = await res.json();
        xp = data.xpEarned;
        carrots = data.carrotsEarned;
        leveledUp = data.leveledUp;
        newLvlNumber = data.newLevel;

        const safeXp = Math.max(data.profile?.xp || 0, profile.xp + xp);
        const safeCarrots = Math.max(data.profile?.carrots ?? 0, profile.carrots + carrots);
        const newLvl = calculateLevelFromXp(safeXp);

        updatedFinalProfile = {
          ...(data.profile || profile),
          xp: safeXp,
          carrots: safeCarrots,
          level: newLvl.level,
          last_active_date: new Date().toISOString().split("T")[0],
        };

        setProfile(updatedFinalProfile);
        setLevelInfo(newLvl);
      } else {
        // Offline calculation
        xp = Math.min(60, result.wordsPlayed * 3 + (result.accuracy >= 90 ? 10 : 0));
        carrots = result.accuracy >= 80 ? 4 : 2;
        const totalXp = profile.xp + xp;
        const newLvl = calculateLevelFromXp(totalXp);
        leveledUp = newLvl.level > profile.level;
        newLvlNumber = newLvl.level;

        updatedFinalProfile = {
          ...profile,
          xp: totalXp,
          carrots: profile.carrots + carrots,
          level: newLvlNumber,
          last_active_date: new Date().toISOString().split("T")[0],
        };
        setProfile(updatedFinalProfile);
        setLevelInfo(newLvl);
      }

      // Check daily quests progression for all quest types
      const updatedQuests = quests.map((q) => {
        let updatedCount = q.current_count;
        if (q.quest_key === "play_any_game") updatedCount += 1;
        if (q.quest_key === "earn_50_xp") updatedCount += xp;
        if (q.quest_key === "word_match_win" && activeGame === "word_match" && result.accuracy >= 80) {
          updatedCount += 1;
        }
        if (q.quest_key === "listen_catch_win" && activeGame === "listen_catch") {
          updatedCount += 1;
        }
        if (q.quest_key === "sentence_builder_win" && activeGame === "sentence_builder") {
          updatedCount += 1;
        }
        if (q.quest_key === "memory_flip_win" && activeGame === "memory_flip") {
          updatedCount += 1;
        }
        const isDone = updatedCount >= q.target_count;
        return {
          ...q,
          current_count: updatedCount,
          is_completed: isDone,
        };
      });
      setQuests(updatedQuests);

      // ALWAYS SAVE TO LOCAL STORAGE IMMEDIATELY
      saveLocalGameState(userId, {
        profile: updatedFinalProfile,
        quests: updatedQuests,
        achievements: [],
        lastUpdated: new Date().toISOString(),
      });

      setGameOverResult({
        score: result.score,
        accuracy: result.accuracy,
        xpEarned: xp,
        carrotsEarned: carrots,
        leveledUp,
        newLevel: newLvlNumber,
        words: gameWords.slice(0, result.wordsPlayed),
      });
    } catch (e) {
      console.error("Finish game error:", e);
    }
  };

  const handleExitGame = () => {
    setActiveGame(null);
    setGameOverResult(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Đang nạp thế giới trò chơi HabitRabbit...</p>
      </div>
    );
  }

  // Mini-game active screen
  if (activeGame) {
    if (loadingWords) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Spinner size="lg" />
          <p className="text-gray-500 text-sm">Đang chuẩn bị từ vựng cho trò chơi...</p>
        </div>
      );
    }

    return (
      <div className="py-4">
        {activeGame === "word_match" && (
          <WordMatchGame
            words={gameWords}
            onFinish={handleFinishGame}
            onExit={handleExitGame}
          />
        )}
        {activeGame === "missing_word" && (
          <MissingWordGame
            words={gameWords}
            onFinish={handleFinishGame}
            onExit={handleExitGame}
          />
        )}
        {activeGame === "memory_flip" && (
          <MemoryFlipGame
            words={gameWords}
            onFinish={handleFinishGame}
            onExit={handleExitGame}
          />
        )}
        {activeGame === "listen_catch" && (
          <ListenCatchGame
            words={gameWords}
            onFinish={handleFinishGame}
            onExit={handleExitGame}
          />
        )}
        {activeGame === "sentence_builder" && (
          <SentenceBuilderGame
            words={gameWords}
            onFinish={handleFinishGame}
            onExit={handleExitGame}
          />
        )}

        {gameOverResult && (
          <GameOverModal
            score={gameOverResult.score}
            accuracy={gameOverResult.accuracy}
            xpEarned={gameOverResult.xpEarned}
            carrotsEarned={gameOverResult.carrotsEarned}
            leveledUp={gameOverResult.leveledUp}
            newLevel={gameOverResult.newLevel}
            reviewedWords={gameOverResult.words}
            onPlayAgain={() => handleStartGame(activeGame)}
            onExit={handleExitGame}
          />
        )}
      </div>
    );
  }

  // Main Game Lobby Page
  return (
    <div className="space-y-8 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg shadow-xs">
              🎮
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Góc Giải Trí HabitRabbit
            </h1>
            <Badge variant="purple" size="sm">V2 Gamification</Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
            Luyện phản xạ và củng cố từ vựng qua các mini-game vui nhộn. Tích lũy XP, thu thập cà rốt để nuôi nấng và chăm sóc Bé Thỏ!
          </p>
        </div>

        {/* Back to study CTA */}
        <Link href="/dashboard" className="shrink-0">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-gray-600">
            ← Về Dashboard học tập
          </Button>
        </Link>
      </div>

      {/* Learning Streak & Level Protection Reminder Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-200/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
            🔥
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-gray-900">
                Chuỗi học tập: {profile.study_streak_days || 1} ngày liên tiếp
              </h4>
              <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Check className="w-3 h-3 text-emerald-600" /> Cấp độ được bảo vệ
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              💡 <strong>Quy tắc bảo vệ cấp độ:</strong> Hãy duy trì chuỗi học đều đặn mỗi ngày (chơi ít nhất 1 ván mini-game hoặc ôn tập SRS). Nếu để chuỗi đứt quãng liên tiếp nhiều ngày, Bé Thỏ sẽ bị mệt mỏi và có nguy cơ tuột cấp độ!
            </p>
          </div>
        </div>

        <Link href="/review" className="shrink-0">
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs"
            leftIcon={<span>📚</span>}
          >
            Ôn tập SRS ngay
          </Button>
        </Link>
      </div>

      {/* 1. Companion Rabbit Sanctuary Card */}
      <RabbitSanctuary
        profile={profile}
        levelInfo={levelInfo}
        onFeedRabbit={handleFeedRabbit}
        onPetRabbit={handlePetRabbit}
        onRenameRabbit={handleRenameRabbit}
        onEquipItem={handleEquipItem}
        onBuyItem={handleBuyItem}
        feeding={feeding}
      />

      {/* 2. Grid: Daily Quests & Word Source Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Game Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chọn Mini-game</h2>
              <p className="text-xs text-gray-400">Chọn một trò chơi để bắt đầu rèn luyện</p>
            </div>

            {/* Word Source Picker */}
            <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-semibold text-gray-600">
              <button
                onClick={() => setWordSource("mixed")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  wordSource === "mixed"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "hover:text-gray-900"
                }`}
              >
                Tất cả từ
              </button>
              <button
                onClick={() => setWordSource("due")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  wordSource === "due"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "hover:text-gray-900"
                }`}
              >
                Từ cần ôn (SRS)
              </button>
            </div>
          </div>

          {/* Mini-game Cards - 5 Games */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Game 1: Word Match */}
            <Card
              id="card-game-word-match"
              className="p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 relative group cursor-pointer bg-gradient-to-b from-white to-indigo-50/20"
              onClick={() => handleStartGame("word_match")}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                  🧩
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base group-hover:text-indigo-600 transition-colors">
                    Nối từ (Word Match)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Nối nhanh các cặp thẻ tiếng Anh và nghĩa tiếng Việt tương ứng theo chuỗi combo điểm thưởng.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Phản xạ nhanh
                </span>
                <span
                  id="btn-play-word-match"
                  className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                >
                  <span>Chơi ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>

            {/* Game 2: Missing Word */}
            <Card
              id="card-game-missing-word"
              className="p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 relative group cursor-pointer bg-gradient-to-b from-white to-orange-50/20"
              onClick={() => handleStartGame("missing_word")}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                    Từ còn thiếu (Missing Word)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Đọc câu ngữ cảnh và chọn từ khuyết để giúp bé Thỏ nhảy vượt chướng ngại vật về vườn cà rốt.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Hiểu ngữ cảnh
                </span>
                <span
                  id="btn-play-missing-word"
                  className="text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                >
                  <span>Chơi ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>

            {/* Game 3: Memory Flip */}
            <Card
              id="card-game-memory-flip"
              className="p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-purple-300 relative group cursor-pointer bg-gradient-to-b from-white to-purple-50/20"
              onClick={() => handleStartGame("memory_flip")}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                  🃏
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base group-hover:text-purple-600 transition-colors">
                    Lật thẻ bài (Memory Flip)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Lật tìm các cặp thẻ bài úp để rèn luyện trí nhớ hình ảnh kết hợp phát âm tiếng Anh.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  Rèn trí nhớ
                </span>
                <span
                  id="btn-play-memory-flip"
                  className="text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                >
                  <span>Chơi ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>

            {/* Game 4: Listen & Catch */}
            <Card
              id="card-game-listen-catch"
              className="p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 relative group cursor-pointer bg-gradient-to-b from-white to-sky-50/20"
              onClick={() => handleStartGame("listen_catch")}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                  🎧
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base group-hover:text-sky-600 transition-colors">
                    Nghe & Bắt từ (Listen & Catch)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Lắng nghe phát âm bản xứ và bấm chọn chính xác từ vựng tương ứng rơi xuống rổ của thỏ.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                  Luyện kỹ năng nghe
                </span>
                <span
                  id="btn-play-listen-catch"
                  className="text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                >
                  <span>Chơi ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>

            {/* Game 5: Sentence Builder */}
            <Card
              id="card-game-sentence-builder"
              className="p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 relative group cursor-pointer bg-gradient-to-b from-white to-emerald-50/20"
              onClick={() => handleStartGame("sentence_builder")}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                  ✍️
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base group-hover:text-emerald-600 transition-colors">
                    Sắp xếp câu (Sentence Builder)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Sắp xếp các khối từ vựng thành câu ví dụ hoàn chỉnh đúng cấu trúc ngữ pháp chuẩn.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Luyện cấu trúc câu
                </span>
                <span
                  id="btn-play-sentence-builder"
                  className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                >
                  <span>Chơi ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Right 1 Col: Daily Quests Card */}
        <div>
          <DailyQuestsCard quests={quests} onClaimQuest={handleClaimQuest} />
        </div>
      </div>
    </div>
  );
}
