export interface CoreCourseDefinition {
  sheetName: string;
  name: string;
  description: string;
  badge: string;
  level: string;
  wordCount: number;
  lessonCount: number;
  color: string;
}

export const CORE_COURSES: CoreCourseDefinition[] = [
  {
    sheetName: "IPA",
    name: "Khóa 1: Phát âm & Ký hiệu IPA",
    description: "Luyện ngữ âm, khẩu hình và làm chủ hệ thống phiên âm quốc tế IPA",
    badge: "Phát âm nền tảng",
    level: "Cơ bản",
    wordCount: 460,
    lessonCount: 23,
    color: "from-blue-500 to-indigo-600",
  },
  {
    sheetName: "Ngữ pháp",
    name: "Khóa 2: 600 Từ vựng Ngữ pháp Cốt lõi",
    description: "Từ loại, cấu trúc câu và các từ vựng nền tảng thông dụng nhất",
    badge: "Ngữ pháp cốt lõi",
    level: "Cơ bản - Trung cấp",
    wordCount: 600,
    lessonCount: 30,
    color: "from-indigo-500 to-violet-600",
  },
  {
    sheetName: "Nghiệm",
    name: "Khóa 3: Từ vựng Trải nghiệm & Thực tế",
    description: "Từ vựng thực tế áp dụng trong công việc, đời sống và môi trường làm việc",
    badge: "Thực tế & Trải nghiệm",
    level: "Trung cấp",
    wordCount: 440,
    lessonCount: 22,
    color: "from-emerald-500 to-teal-600",
  },
  {
    sheetName: "Khựng",
    name: "Khóa 4: Phản xạ Nói & Xóa bỏ Khựng",
    description: "Phát triển tư duy song ngữ tức thì, xóa bỏ thói quen ngập ngừng khi giao tiếp",
    badge: "Phản xạ tức thì",
    level: "Trung cấp - Nâng cao",
    wordCount: 440,
    lessonCount: 22,
    color: "from-amber-500 to-orange-600",
  },
  {
    sheetName: "Giao tiếp 1",
    name: "Khóa 5: Tiếng Anh Giao tiếp Cơ bản",
    description: "Các tình huống giao tiếp đời thường, chào hỏi, mua sắm và sinh hoạt",
    badge: "Giao tiếp cơ bản",
    level: "Giao tiếp đời sống",
    wordCount: 400,
    lessonCount: 20,
    color: "from-pink-500 to-rose-600",
  },
  {
    sheetName: "Giao tiếp 2",
    name: "Khóa 6: Tiếng Anh Giao tiếp Nâng cao",
    description: "Giao tiếp chuyên sâu, đàm phán, thành ngữ và tình huống phức tạp",
    badge: "Giao tiếp chuyên sâu",
    level: "Nâng cao & Chuyên nghiệp",
    wordCount: 560,
    lessonCount: 28,
    color: "from-purple-500 to-fuchsia-600",
  },
];

export const CORE_SOURCE_FILENAME = "default_curriculum.xlsx";
