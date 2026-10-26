import {
  UserGameProfile,
  GameQuest,
  GameAchievement,
  GameSessionResult,
  MiniGameType,
  RabbitStage,
  RabbitEvolutionInfo,
  WardrobeItem,
} from "@/types/game";

// ============================================================
// LEVEL & XP FORMULA
// Level 1: 0 - 99 XP (100 to L2)
// Level 2: 100 - 249 XP (150 to L3)
// Level 3: 250 - 449 XP (200 to L4)
// Formula: XP required for level L -> L+1 is 50 * (L + 1)
// ============================================================

export function getXpForNextLevel(level: number): number {
  return 50 * (level + 1);
}

export function calculateLevelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (true) {
    const needed = getXpForNextLevel(level);
    if (remainingXp < needed) {
      const progressPercent = Math.min(100, Math.round((remainingXp / needed) * 100));
      return {
        level,
        currentLevelXp: remainingXp,
        xpNeededForNext: needed,
        progressPercent,
      };
    }
    remainingXp -= needed;
    level += 1;
  }
}

// ============================================================
// RABBIT EVOLUTION STAGES
// Level 1-2: Baby Bunny (Thỏ Sơ Sinh)
// Level 3-5: Junior Bunny (Thỏ Học Sinh)
// Level 6-9: Explorer Bunny (Thỏ Thám Hiểm)
// Level 10+: Master Sage Bunny (Đại Sư Thần Thỏ)
// ============================================================

export function getRabbitStage(level: number): RabbitEvolutionInfo {
  if (level < 3) {
    return {
      stage: "baby",
      title: "Thỏ Con Sơ Sinh",
      description: "Bé thỏ nhỏ nhắn, thích được vuốt ve và ăn cà rốt để mau lớn!",
      badgeEmoji: "🐣",
      imageSrc: "/stages/baby.png",
      minLevel: 1,
      nextStageAtLevel: 3,
    };
  } else if (level < 6) {
    return {
      stage: "junior",
      title: "Thỏ Học Sinh Chăm Chỉ",
      description: "Thỏ đã bắt đầu biết đeo kính, đeo cặp sách và ham học hỏi từ vựng mới!",
      badgeEmoji: "🎒",
      imageSrc: "/stages/junior.png",
      minLevel: 3,
      nextStageAtLevel: 6,
    };
  } else if (level < 10) {
    return {
      stage: "explorer",
      title: "Thỏ Thám Hiểm Trưởng Thành",
      description: "Bé thỏ nay đã dũng cảm, tự tin phiêu lưu qua mọi bài kiểm tra khó nhằn!",
      badgeEmoji: "🧭",
      imageSrc: "/stages/explorer.png",
      minLevel: 6,
      nextStageAtLevel: 10,
    };
  } else {
    return {
      stage: "master",
      title: "Đại Sư Thần Thỏ Tri Thức",
      description: "Bậc thầy từ vựng tối thượng với hào quang trí tuệ rực rỡ!",
      badgeEmoji: "👑",
      imageSrc: "/stages/master.png",
      minLevel: 10,
    };
  }
}

// Dialogues spoken by the rabbit when clicked or fed
export const RABBIT_DIALOGUES: Record<RabbitStage, string[]> = {
  baby: [
    "Chíp chíp! Cà rốt ngon quá đi à! 🥕",
    "Bé Thỏ đang lớn từng ngày cùng bạn đó nha! ✨",
    "Mỗi ngày học một chút là mình mau lớn lắm! 🥰",
    "Hôm nay mình lại học thêm nhiều từ mới nhé! 🐰",
  ],
  junior: [
    "Cặp sách của mình đã chứa được nhiều từ vựng hay lắm rồi! 🎒",
    "Bạn học chăm thật đấy, cùng giải đố mini-game nào! 🧩",
    "Tiếng Anh càng ngày càng dễ hiểu hơn rồi đúng không! 📖",
    "Cảm ơn bạn đã luôn chăm sóc mình mỗi ngày! 🌟",
  ],
  explorer: [
    "Không có bài tập hay thử thách nào làm khó được chúng ta! 🧭",
    "Bạn và mình là cặp đôi thám hiểm từ vựng đỉnh nhất! ⚡",
    "Hôm nay bạn muốn chinh phục bài học nào tiếp theo? 🎯",
    "Cà rốt tiếp thêm 100% năng lượng chiến đấu! 🥕",
  ],
  master: [
    "Trí tuệ của bạn đã đạt đến cảnh giới phi thường! 👑",
    "Một ngày không học tập là một ngày lãng phí ánh sáng tri thức! ✨",
    "Bé Thỏ ngày xưa giờ đã cùng bạn đứng trên đỉnh cao Anh ngữ! 🌟",
    "Hãy tiếp tục duy trì chuỗi học tập bất bại nhé! 🏆",
  ],
};

// ============================================================
// WARDROBE CATALOG (HATS, ACCESSORIES, BACKGROUNDS)
// ============================================================

export const WARDROBE_CATALOG: WardrobeItem[] = [
  // Hats
  {
    id: "none",
    name: "Không đội nón",
    category: "hat",
    icon: "🚫",
    priceCarrots: 0,
    requiredLevel: 1,
    description: "Phong cách tự nhiên mộc mạc của Bé Thỏ.",
  },
  {
    id: "straw_hat",
    name: "Nón Rơm Đồng Quê",
    category: "hat",
    icon: "👒",
    priceCarrots: 5,
    requiredLevel: 1,
    description: "Chiếc nón rơm vàng che nắng khi làm vườn hái cà rốt.",
  },
  {
    id: "grad_cap",
    name: "Mũ Cử Nhân",
    category: "hat",
    icon: "🎓",
    priceCarrots: 15,
    requiredLevel: 3,
    description: "Mũ học giả danh giá biểu tượng cho sự thông thái.",
  },
  {
    id: "wizard_hat",
    name: "Nón Phù Thủy",
    category: "hat",
    icon: "🧙‍♂️",
    priceCarrots: 25,
    requiredLevel: 5,
    description: "Mũ ma thuật huyền bí tăng độ nhạy bén trí não.",
  },
  {
    id: "crown",
    name: "Vương Miện Hoàng Gia",
    category: "hat",
    icon: "👑",
    priceCarrots: 40,
    requiredLevel: 7,
    description: "Vương miện vàng nạm ngọc cho bé thỏ quý tộc.",
  },

  // Accessories
  {
    id: "classic_bow",
    name: "Nơ Hồng Quý Tộc",
    category: "accessory",
    icon: "🎀",
    priceCarrots: 0,
    requiredLevel: 1,
    description: "Chiếc nơ cổ thanh lịch quen thuộc của HabitRabbit.",
  },
  {
    id: "glasses",
    name: "Kính Mắt Bác Học",
    category: "accessory",
    icon: "👓",
    priceCarrots: 10,
    requiredLevel: 2,
    description: "Cặp kính gọng tròn giúp đọc từ điển rõ hơn.",
  },
  {
    id: "backpack",
    name: "Cặp Sách Học Sinh",
    category: "accessory",
    icon: "🎒",
    priceCarrots: 15,
    requiredLevel: 3,
    description: "Đựng đầy thẻ ghi nhớ flashcard và sổ tay từ vựng.",
  },
  {
    id: "magic_wand",
    name: "Đũa Thần Cà Rốt",
    category: "accessory",
    icon: "🪄",
    priceCarrots: 30,
    requiredLevel: 5,
    description: "Mỗi khi vung đũa, các từ mới sẽ khắc sâu vào trí nhớ.",
  },
  {
    id: "golden_medal",
    name: "Huy Chương Vô Địch",
    category: "accessory",
    icon: "🏅",
    priceCarrots: 45,
    requiredLevel: 8,
    description: "Minh chứng cho chuỗi học tập kiên cường không bỏ cuộc.",
  },

  // Backgrounds
  {
    id: "meadow",
    name: "Đồng Cỏ Xanh Ngát",
    category: "background",
    icon: "🌿",
    priceCarrots: 0,
    requiredLevel: 1,
    description: "Gió mát thoang thoảng giữa thảo nguyên ngập tràn hoa dại.",
  },
  {
    id: "study_room",
    name: "Góc Đọc Sách Ấm Cúng",
    category: "background",
    icon: "📚",
    priceCarrots: 15,
    requiredLevel: 2,
    description: "Kệ sách gỗ, đèn vàng dịu nhẹ và tách trà nóng thơm lừng.",
  },
  {
    id: "carrot_farm",
    name: "Nông Trại Cà Rốt",
    category: "background",
    icon: "🥕",
    priceCarrots: 25,
    requiredLevel: 4,
    description: "Khu vườn bội thu bạt ngàn những củ cà rốt cam mọng nước.",
  },
  {
    id: "sky_island",
    name: "Đảo Mây Bay Bổng",
    category: "background",
    icon: "☁️",
    priceCarrots: 50,
    requiredLevel: 6,
    description: "Thế giới cổ tích lơ lửng trên chín tầng mây hồng bồng bềnh.",
  },
];

// Default initial profile
export function getDefaultGameProfile(userId: string): UserGameProfile {
  return {
    user_id: userId,
    xp: 0,
    level: 1,
    carrots: 15,
    streak_freeze: 0,
    rabbit_name: "Bé Thỏ",
    rabbit_mood: "happy",
    rabbit_outfit: "classic",
    unlocked_items: ["none", "classic_bow", "straw_hat", "meadow"],
    equipped_items: {
      hat: "none",
      accessory: "classic_bow",
      background: "meadow",
    },
    growth_points: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Generate default daily quests for today
export function generateDailyQuests(userId: string, dateStr: string): GameQuest[] {
  return [
    {
      id: `${userId}-${dateStr}-quest-1`,
      user_id: userId,
      quest_key: "play_any_game",
      title: "Khởi động cùng Bé Thỏ",
      description: "Chơi ít nhất 1 ván mini-game bất kỳ hôm nay",
      target_count: 1,
      current_count: 0,
      xp_reward: 25,
      carrot_reward: 5,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
    {
      id: `${userId}-${dateStr}-quest-2`,
      user_id: userId,
      quest_key: "earn_50_xp",
      title: "Nhà thông thái nhí",
      description: "Tích lũy tối thiểu 50 XP từ các trò chơi",
      target_count: 50,
      current_count: 0,
      xp_reward: 40,
      carrot_reward: 10,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
    {
      id: `${userId}-${dateStr}-quest-3`,
      user_id: userId,
      quest_key: "word_match_win",
      title: "Bậc thầy Nối từ",
      description: "Hoàn thành 1 ván mini-game Nối từ với độ chính xác trên 80%",
      target_count: 1,
      current_count: 0,
      xp_reward: 35,
      carrot_reward: 8,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
    {
      id: `${userId}-${dateStr}-quest-4`,
      user_id: userId,
      quest_key: "listen_catch_win",
      title: "Đôi tai tinh tường",
      description: "Hoàn thành 1 ván Nghe & Bắt từ (Listen & Catch)",
      target_count: 1,
      current_count: 0,
      xp_reward: 35,
      carrot_reward: 8,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
    {
      id: `${userId}-${dateStr}-quest-5`,
      user_id: userId,
      quest_key: "sentence_builder_win",
      title: "Kiến trúc sư ngữ pháp",
      description: "Hoàn thành 1 ván Sắp xếp câu (Sentence Builder)",
      target_count: 1,
      current_count: 0,
      xp_reward: 40,
      carrot_reward: 10,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
    {
      id: `${userId}-${dateStr}-quest-6`,
      user_id: userId,
      quest_key: "memory_flip_win",
      title: "Siêu trí nhớ lật thẻ",
      description: "Hoàn thành 1 ván Lật thẻ bài (Memory Flip)",
      target_count: 1,
      current_count: 0,
      xp_reward: 30,
      carrot_reward: 6,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
    {
      id: `${userId}-${dateStr}-quest-7`,
      user_id: userId,
      quest_key: "feed_rabbit_quest",
      title: "Nuôi dưỡng Bé Thỏ",
      description: "Cho Bé Thỏ ăn ít nhất 1 củ cà rốt tươi ngon",
      target_count: 1,
      current_count: 0,
      xp_reward: 20,
      carrot_reward: 5,
      is_completed: false,
      is_claimed: false,
      quest_date: dateStr,
    },
  ];
}

// Achievements definitions
export const GAME_ACHIEVEMENTS: GameAchievement[] = [
  {
    key: "first_game",
    title: "Bước chân đầu tiên",
    description: "Hoàn thành mini-game đầu tiên cùng Bé Thỏ",
    icon: "🎮",
    category: "games",
  },
  {
    key: "feed_rabbit",
    title: "Người bạn chu đáo",
    description: "Tặng cà rốt và chăm sóc Bé Thỏ",
    icon: "🥕",
    category: "rabbit",
  },
  {
    key: "evolution_stage_2",
    title: "Lớn nhanh như thổi",
    description: "Nuôi Bé Thỏ tiến hóa lên giai đoạn Thỏ Học Sinh (Lv.3)",
    icon: "🎒",
    category: "rabbit",
  },
  {
    key: "combo_master",
    title: "Phản xạ thần tốc",
    description: "Đạt chuỗi combo 5 câu trả lời đúng liên tiếp",
    icon: "⚡",
    category: "games",
  },
  {
    key: "level_5",
    title: "Đồng đội kỳ cựu",
    description: "Đưa Bé Thỏ đạt cấp độ 5",
    icon: "👑",
    category: "rabbit",
  },
  {
    key: "perfect_score",
    title: "Trí nhớ siêu phàm",
    description: "Hoàn thành 1 ván chơi với độ chính xác tuyệt đối 100%",
    icon: "🌟",
    category: "words",
  },
];

// Local storage key for offline fallback
export const GAME_LOCAL_STORAGE_KEY = "habitrabbit_game_state_v2";

export interface StoredGameState {
  profile: UserGameProfile;
  quests: GameQuest[];
  achievements: string[];
  lastUpdated: string;
}

export function getLocalGameState(userId: string): StoredGameState {
  if (typeof window === "undefined") {
    const today = new Date().toISOString().split("T")[0];
    return {
      profile: getDefaultGameProfile(userId),
      quests: generateDailyQuests(userId, today),
      achievements: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(`${GAME_LOCAL_STORAGE_KEY}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().split("T")[0];
      if (!parsed.quests || parsed.quests[0]?.quest_date !== today) {
        parsed.quests = generateDailyQuests(userId, today);
      }
      return parsed;
    }
  } catch (e) {
    console.error("Lỗi đọc local game state:", e);
  }

  const today = new Date().toISOString().split("T")[0];
  const initialState: StoredGameState = {
    profile: getDefaultGameProfile(userId),
    quests: generateDailyQuests(userId, today),
    achievements: [],
    lastUpdated: new Date().toISOString(),
  };
  saveLocalGameState(userId, initialState);
  return initialState;
}

export function saveLocalGameState(userId: string, state: StoredGameState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${GAME_LOCAL_STORAGE_KEY}_${userId}`, JSON.stringify(state));
  } catch (e) {
    console.error("Lỗi lưu local game state:", e);
  }
}
