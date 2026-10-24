# VocaFlow — Nền tảng Học từ vựng Tiếng Anh Cá nhân hóa bằng AI & Spaced Repetition

VocaFlow là ứng dụng web học từ vựng tiếng Anh hiện đại, chuyển đổi tài liệu từ vựng cá nhân (Excel, CSV) thành các bài học có cấu trúc, flashcard thông minh, bài kiểm tra tương tác và hệ thống ôn tập lặp lại ngắt quãng (Spaced Repetition) chuẩn thuật toán FSRS.

---

## 🚀 Các Tính năng Nổi bật

### 1. 📂 Import Tài liệu Thông minh (Smart Import Wizard)
- Tải lên file **Excel (.xlsx, .xls)** hoặc **CSV (.csv)** dung lượng lên tới 10MB.
- **Hỗ trợ đa Sheet**: Tự động nhận diện danh sách các trang tính để người dùng chọn.
- **Tự động nhận diện cột (Auto Column Detection)**: Khớp thông minh các cột *Từ tiếng Anh*, *Phiên âm IPA*, *Nghĩa tiếng Việt*, *Định nghĩa*, *Ví dụ*, *Từ loại*, *Đồng nghĩa/Trái nghĩa*.
- **Tự động chia bài học**: Phân bổ danh sách từ thành các bài học vừa vặn (10 - 20 từ) tối ưu cho việc học hàng ngày.

### 2. 🧠 Bổ sung Dữ liệu bằng AI (AI Enrichment)
- Tự động tra cứu và điền các trường còn thiếu bằng Google Gemini / AI Provider:
  - Phiên âm chuẩn IPA (theo bảng ký hiệu quốc tế)
  - Nghĩa tiếng Việt chuẩn ngữ cảnh
  - Định nghĩa tiếng Anh ngắn gọn, dễ hiểu
  - Câu ví dụ tự nhiên kèm bản dịch tiếng Việt tương ứng.

### 3. 🃏 Flashcard Học tập & Phát âm chuẩn (Audio TTS)
- Lật thẻ mượt mà kèm phím tắt bàn phím:
  - `Space` hoặc `Enter`: Lật thẻ kiểm tra đáp án.
  - `→` / `←`: Chuyển nhanh giữa các từ.
  - `P`: Nghe phát âm từ vựng.
- Phát âm giọng bản xứ với tùy chọn **Anh - Mỹ (US)** hoặc **Anh - Anh (UK)**.

### 4. ✍️ Luyện tập Đa dạng & AI Chấm điểm Câu viết (Practice Engine)
- **Gợi nhớ từ tiếng Anh (English Recall)**
- **Dịch nghĩa tiếng Việt (Vietnamese Recall)**
- **Điền từ vào chỗ trống (Fill-in-the-blank)**
- **Tự viết câu thực hành (Sentence Writing)**: AI phân tích ngữ pháp, kiểm tra độ tự nhiên, chấm điểm (0-100) và đưa ra lời giải thích chi tiết bằng tiếng Việt.

### 5. ⏳ Ôn tập Lặp lại Ngắt quãng FSRS (Spaced Repetition System)
- Triển khai thuật toán **FSRS (Free Spaced Repetition Scheduler)** thế hệ mới:
  - 4 nút đánh giá: `Lại (Again)`, `Khó (Hard)`, `Tốt (Good)`, `Dễ (Easy)`.
  - Phím tắt `1`, `2`, `3`, `4` tương ứng.
  - Tự động tính toán độ ổn định trí nhớ (Stability) và độ khó (Difficulty) để lên lịch ôn tập vào đúng thời điểm não bộ sắp quên.

### 6. 📊 Phân tích Tiến độ & Sức khỏe Trí nhớ (Analytics & Progress)
- Tỷ lệ lưu giữ trí nhớ (Retention Rate).
- Chuỗi học tập liên tục (Study Streak).
- Biểu đồ nhiệt hoạt động ôn tập 14 ngày gần nhất.
- Danh sách từ vựng hay quên (Weak Words / High Lapses) để ưu tiên củng cố.

---

## 🛠️ Công nghệ Sử dụng (Tech Stack)

- **Frontend & Backend**: Next.js 16 (App Router, Turbopack, React 19, TypeScript)
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security - RLS, Auth SSR)
- **Thuật toán Spaced Repetition**: FSRS (Free Spaced Repetition Scheduler)
- **Xử lý File**: XLSX (SheetJS), React-Dropzone
- **Phát âm TTS**: Web Speech API (US/UK voices)
- **AI Engine**: Google Gemini API (@google/genai)

---

## 📦 Cấu trúc Thư mục Dự án

```
vocaflow/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Đăng nhập, Đăng ký, Quên mật khẩu
│   │   ├── (dashboard)/            # Dashboard, Thư viện, Bài học, Ôn tập, Tiến độ, Cài đặt
│   │   │   ├── dashboard/
│   │   │   ├── libraries/
│   │   │   │   ├── [id]/
│   │   │   │   └── import/         # Import Wizard (Excel, CSV)
│   │   │   ├── lessons/
│   │   │   │   └── [id]/
│   │   │   │       ├── learn/      # Flashcard học bài
│   │   │   │       ├── practice/   # Quiz & AI Chấm câu
│   │   │   │       └── complete/   # Màn hình chúc mừng & tổng kết
│   │   │   ├── review/             # Ôn tập ngắt quãng FSRS
│   │   │   ├── progress/           # Biểu đồ trí nhớ & phân tích
│   │   │   └── settings/           # Cài đặt cá nhân, giọng US/UK
│   │   └── api/                    # REST API routes (Libraries, Lessons, Review, AI, Import)
│   ├── components/                 # UI components (Button, Modal, Input, Flashcard, Practice)
│   ├── lib/
│   │   ├── ai/                     # Gemini Provider & Prompt Engineering
│   │   ├── audio/                  # TTS Web Speech
│   │   ├── import/                 # Parser Excel / CSV & Header Matching
│   │   ├── spaced-repetition/      # Thuật toán FSRS scheduling
│   │   └── supabase/               # Client, Server, SSR Middleware
│   └── types/                      # TypeScript definitions
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Toàn bộ SQL Schema & RLS Policies
├── sample_vocab.csv                # Tệp từ vựng mẫu để thử nghiệm Import
└── package.json
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy Dự án

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Biến Môi trường (.env.local)
Sao chép `.env.example` thành `.env.local` và điền các thông tin:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Provider (Google Gemini)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Thiết lập Database (Supabase)
1. Mở trang quản trị Supabase Dashboard của bạn.
2. Vào mục **SQL Editor**.
3. Sao chép toàn bộ nội dung trong file [001_initial_schema.sql](file:///D:/Projects/vocaflow/supabase/migrations/001_initial_schema.sql) và nhấn **Run**.
4. Toàn bộ các bảng (`vocabulary_libraries`, `lessons`, `vocabulary_items`, `user_vocabulary_progress`, `review_logs`, `user_settings`) và phân quyền bảo mật RLS sẽ được khởi tạo tự động.

### 4. Khởi chạy Môi trường Phát triển (Development)
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng.

### 5. Kiểm tra & Build Bản Sản phẩm (Production)
```bash
# Kiểm tra TypeScript
npx tsc --noEmit

# Tạo bản build tối ưu hóa
npm run build

# Khởi chạy server production
npm start
```

---

## 🧪 Thử nghiệm Ngay với File Mẫu
Dự án có sẵn tệp [sample_vocab.csv](file:///D:/Projects/vocaflow/sample_vocab.csv) gồm 10 từ vựng tiếng Anh học thuật phổ biến (ubiquitous, resilience, ephemeral, v.v.). Bạn có thể tải tệp này lên thông qua trang **Import từ vựng** để thử nghiệm ngay quy trình nhận diện, chia bài và ôn tập FSRS.