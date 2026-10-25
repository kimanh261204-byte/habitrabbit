import Image from "next/image";
import Link from "next/link";
import {
  Zap,
  Upload,
  BookOpen,
  RotateCcw,
  TrendingUp,
  Check,
  ChevronRight,
  Star,
  Brain,
  Sparkles,
  Award,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HabitRabbit - Học từ vựng tiếng Anh cá nhân hóa bằng AI",
  description:
    "Tải lên file từ vựng của bạn, học với flashcard thông minh, luyện viết câu AI chấm điểm và hệ thống ôn tập lặp lại ngắt quãng FSRS cùng HabitRabbit.",
};

const steps = [
  {
    icon: Upload,
    title: "1. Import tài liệu của bạn",
    desc: "Tải lên file Excel hoặc CSV chứa danh sách từ vựng. Hệ thống tự động nhận diện cột và phân bổ thành từng bài học vừa vặn.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Sparkles,
    title: "2. AI bổ sung thông tin thiếu",
    desc: "Nếu file thiếu phiên âm IPA, nghĩa tiếng Việt hay ví dụ ngữ cảnh, AI tự động tra cứu và điền đầy đủ với độ chính xác cao.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: BookOpen,
    title: "3. Học với Flashcard & Quiz",
    desc: "Luyện phát âm chuẩn, ghi nhớ nghĩa và luyện viết câu thực hành. AI đóng vai giáo viên chấm điểm và giải thích chi tiết.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: RotateCcw,
    title: "4. Ôn tập ngắt quãng FSRS",
    desc: "Thuật toán FSRS hiện đại nhất dự đoán chính xác thời điểm bạn sắp quên từng từ để lên lịch nhắc nhở tối ưu nhất.",
    color: "from-pink-500 to-rose-500",
  },
];

const highlights = [
  "Tự động đọc mọi định dạng file Excel (.xlsx, .xls) và CSV",
  "Tự động phát hiện cột từ vựng, nghĩa, ví dụ, loại từ",
  "Tự động chia bài học 10 - 20 từ dễ tiếp thu",
  "AI bổ sung IPA, định nghĩa, ví dụ song ngữ chuẩn xác",
  "Phát âm chuẩn giọng Anh - Mỹ (US) và Anh - Anh (UK)",
  "Hệ thống ôn tập ngắt quãng FSRS thay thế Anki truyền thống",
  "AI chấm câu viết tự do và giải thích bằng tiếng Việt",
  "Theo dõi độ lưu giữ trí nhớ và chuỗi học tập Streak hằng ngày",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/habitrabbit-logo.png"
              alt="HabitRabbit Logo"
              width={34}
              height={46}
              className="h-10 w-auto object-contain"
              priority
              unoptimized
            />
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              HabitRabbit
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors shadow-xs"
            >
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-indigo-50/50 via-white to-white overflow-hidden">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full blur-md opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <Image
                src="/mascot.png"
                alt="HabitRabbit Mascot"
                width={140}
                height={140}
                className="relative w-28 sm:w-32 h-auto drop-shadow-md transition-transform duration-300 hover:scale-105"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Vocabulary Engine + FSRS Spaced Repetition</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.2]">
            Biến mọi file từ vựng thành{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              trí nhớ vĩnh cửu
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Tải lên tài liệu Excel hoặc CSV của bạn. HabitRabbit tự động phân tích, làm giàu dữ liệu bằng
            AI và thiết kế lộ trình ôn tập cá nhân hóa chuẩn khoa học não bộ.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-sm transition-all hover:scale-[1.02]"
            >
              <span>Trải nghiệm ngay bây giờ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl transition-all"
            >
              <span>Đăng nhập tài khoản</span>
            </Link>
          </div>

          {/* Feature Badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> Miễn phí sử dụng
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> Không cần cài đặt phần mềm
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> Đồng bộ đa thiết bị
            </span>
          </div>
        </div>
      </section>

      {/* Workflow Steps Section */}
      <section className="py-20 px-4 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Quy trình học tập thông minh 4 bước
            </h2>
            <p className="text-sm text-gray-500">
              Từ danh sách từ thô đến khả năng sử dụng tiếng Anh tự nhiên và lưu giữ dài hạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-xs`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Tính năng vượt trội cho người học nghiêm túc
            </h2>
            <p className="text-sm text-gray-500">
              Tích hợp công nghệ AI tiên tiến nhất và thuật toán ghi nhớ FSRS chuẩn quốc tế
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80 border border-gray-100"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Sẵn sàng làm chủ vốn từ vựng của bạn?
          </h2>
          <p className="text-indigo-200 text-base max-w-xl mx-auto">
            Không còn phải mất hàng giờ ghi chép thẻ flashcard thủ công. Hãy để AI và HabitRabbit làm
            việc đó cho bạn.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-indigo-900 bg-white hover:bg-indigo-50 rounded-2xl shadow-lg transition-transform hover:scale-105"
            >
              <span>Bắt đầu ngay hôm nay - Hoàn toàn miễn phí</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>© 2026 HabitRabbit. Nền tảng học từ vựng tiếng Anh cá nhân hóa bằng AI.</p>
      </footer>
    </div>
  );
}