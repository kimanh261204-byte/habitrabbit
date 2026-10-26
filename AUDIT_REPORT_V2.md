# BÁO CÁO AUDIT GIAI ĐOẠN 0 — HABITRABBIT V2 (GAMIFICATION)

## 1. Tổng quan Kiến trúc Hiện tại (V1)

Ứng dụng **HabitRabbit** (trước đây là VocaFlow) được xây dựng trên nền tảng:
- **Framework**: Next.js 16 (Turbopack, App Router, React 19, TypeScript).
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion.
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security - RLS, Auth SSR).
- **Spaced Repetition**: Thuật toán FSRS-4.5 (Free Spaced Repetition Scheduler).
- **TTS**: Web Speech API (`speakWord` hỗ trợ giọng US/UK).
- **Tài liệu nền tảng**: Bộ 6 khóa học cốt lõi (2,900 từ) tự động nạp từ `default_curriculum.xlsx`.

---

## 2. Các chức năng V1 cần BẢO TOÀN NGUYÊN VẸN

| Phân hệ V1 | File / Route chính | Nguyên tắc bảo toàn |
| :--- | :--- | :--- |
| **Hệ thống Ôn tập SRS (FSRS)** | `src/lib/spaced-repetition/fsrs.ts`, `/api/review`, `/review` | **Tuyệt đối không sửa logic toán học FSRS**. Mini-game không được can thiệp vào Stability, Difficulty, Reps, Lapses của từ vựng nếu không qua quy trình đánh giá 4 mức chuẩn (Again/Hard/Good/Easy). |
| **Thư viện & Khóa học cốt lõi** | `/libraries`, `/libraries/[id]`, `/api/curriculum/ensure` | Giữ nguyên 6 khóa học nền tảng (IPA, Ngữ pháp, Nghiệm, Khựng, Giao tiếp 1 & 2) và tính năng import Excel/CSV. |
| **Bài học & Luyện tập** | `/lessons`, `/lessons/[id]/learn`, `/lessons/[id]/practice`, `/lessons/[id]/complete` | Flashcards, Quiz 4 dạng và AI chấm câu viết tự do tiếp tục hoạt động độc lập, không bị cản trở bởi cơ chế game. |
| **Thống kê & Sức khỏe trí nhớ** | `/progress`, `/api/progress` | Tỷ lệ lưu giữ trí nhớ (Retention Rate), chuỗi học tập (Streak) và danh sách từ hay quên (Weak Words) duy trì tính toàn vẹn. |
| **Tài khoản, Cài đặt & Phân quyền** | `/settings`, `src/lib/supabase/*`, RLS Policies | Giữ nguyên cài đặt giọng đọc US/UK, số từ mỗi bài, mục tiêu ngày. |

---

## 3. Cấu trúc Dữ liệu & Đề xuất Mở rộng cho V2

### A. Bảng dữ liệu V1 hiện có
- `profiles`, `user_settings`
- `vocabulary_libraries`, `lessons`, `lesson_vocabulary_items`, `vocabulary_items`
- `user_vocabulary_progress`, `review_logs`, `study_sessions`, `quiz_attempts`

### B. Bảng dữ liệu V2 bổ sung (Độc lập, Không trùng lặp, Không phá vỡ V1)
Tạo file migration `supabase/migrations/002_gamification.sql`:
1. **`user_game_profiles`**:
   - `user_id` (PK, references auth.users)
   - `xp` (kinh nghiệm), `level` (cấp độ thỏ)
   - `carrots` (cà rốt thưởng để mở khóa vật phẩm/trang phục)
   - `rabbit_name` (tên thỏ đồng hành, mặc định 'Bé Thỏ')
   - `rabbit_mood` ('happy' | 'excited' | 'sleepy' | 'hungry')
   - `unlocked_items`, `equipped_items` (vật phẩm trang trí, trang phục)
   - RLS Policy: `auth.uid() = user_id`.

2. **`game_quests`**:
   - `user_id`, `quest_key`, `title`, `target_count`, `current_count`, `xp_reward`, `carrot_reward`, `is_claimed`, `quest_date`
   - Phục vụ nhiệm vụ hàng ngày (Daily Quests).

3. **`game_achievements`**:
   - `user_id`, `achievement_key`, `unlocked_at`
   - Huy hiệu & thành tựu học tập.

4. **`game_sessions`**:
   - `user_id`, `game_type`, `score`, `accuracy`, `words_played`, `xp_earned`, `carrots_earned`, `played_at`
   - Lưu lịch sử chơi game và đối soát chống spam request.

> [!NOTE]
> **Cơ chế Kháng lỗi (Resilient Fallback)**:
> Hệ thống V2 hỗ trợ cả 2 chế độ:
> - Khi Supabase migration đã được chạy: Lưu và đồng bộ trực tiếp lên Cloud với RLS an toàn.
> - Khi chưa kịp chạy migration DB: Hệ thống tự động kích hoạt **Local Storage Adapter** thông minh, cho phép chơi game, nhận thưởng, nuôi thỏ mượt mà ngay lập tức mà không gây ra bất kỳ lỗi 500 nào.

---

## 4. Các Thành phần & Module Tái sử dụng được

1. **Dữ liệu Từ vựng Đang học & Cần ôn**:
   - Mini-game sẽ lấy trực tiếp các từ vựng từ:
     - Thư viện hiện tại của người dùng (`vocabulary_items`).
     - Hoặc danh sách từ đến hạn ôn (`/api/review`).
     - Hoặc danh sách từ hay quên (`weakWords`).
   - Nhờ đó, chơi game thực sự giúp củng cố kiến thức mà người dùng đang học trong V1.
2. **Audio Web Speech TTS (`src/lib/audio/tts.ts`)**:
   - Tái sử dụng trực tiếp hàm `speakWord(word)` cho mini-game **Listen & Catch** và âm thanh tương tác của thỏ.
3. **Mascot & Hình ảnh Brand có sẵn**:
   - `public/rabbit-mascot.png`, `public/habitrabbit-logo.png`, `public/mascot.png` có độ phân giải cao, phù hợp hoàn hảo cho nhân vật thỏ đồng hành.
4. **Hiệu ứng & UI Toolkit**:
   - `canvas-confetti` (đã cài đặt).
   - `framer-motion` (đã cài đặt).
   - Các UI primitives: `Card`, `Button`, `Badge`, `Progress`, `Modal`.

---

## 5. Danh sách Mini-game Triển khai trong V2

| Tên Mini-game | Cơ chế & Giá trị Luyện tập | Trạng thái Dự kiến |
| :--- | :--- | :--- |
| **1. Word Match (Nối từ)** | Nối từ tiếng Anh với nghĩa tiếng Việt tương ứng theo cặp thẻ màu sắc, có tính giờ và chuỗi combo. | Giai đoạn 1 (Ưu tiên) |
| **2. Missing Word (Từ còn thiếu)** | Cho câu ví dụ có chỗ trống khuyết từ, người chơi chọn từ đúng trong 4 đáp án để thỏ nhảy qua chướng ngại vật. | Giai đoạn 1 (Ưu tiên) |
| **3. Memory Flip (Lật thẻ ghi nhớ)** | Lật các ô bài úp để tìm cặp Từ Anh ↔ Nghĩa Việt, rèn luyện trí nhớ hình ảnh kết hợp phản xạ ngôn ngữ. | Giai đoạn 1 (Ưu tiên) |
| **4. Listen & Catch (Nghe & Bắt từ)** | Nghe phát âm chuẩn giọng US/UK từ Web Speech TTS và chọn nhanh từ vựng tương ứng rơi xuống rổ của thỏ. | Giai đoạn 1 (Ưu tiên) |
| **5. Sentence Builder (Xếp câu)** | Sắp xếp các bong bóng từ vựng thành câu ví dụ hoàn chỉnh theo đúng ngữ pháp. | Giai đoạn 1 (Ưu tiên) |

---

## 6. Phân tích Rủi ro & Kế hoạch Phòng ngừa

| Rủi ro tiềm ẩn | Mức độ | Biện pháp Phòng ngừa |
| :--- | :---: | :--- |
| **Xáo trộn thuật toán FSRS** | 🔴 Nghiêm trọng | **Tách biệt hoàn toàn**: Mini-game chỉ ghi nhận XP và Cà rốt vào `user_game_profiles`. Không tự động đổi trạng thái `learning_status` hoặc tính toán lại chu kỳ FSRS. |
| **Lạm phát thưởng / Spam request** | 🟠 Trung bình | API nhận thưởng `/api/game/reward` xác thực session người dùng, giới hạn trần XP tối đa mỗi ván, chặn gửi trùng lặp (deduplication token). |
| **Giao diện game che khuất nút học V1** | 🟠 Trung bình | Tất cả điểm truy cập game trên Dashboard, bài học và trang ôn tập đều là banner/card trang nhã hoặc liên kết gợi ý, không dùng pop-up ép buộc. |
| **Lỗi tương thích thiết bị di động** | 🟡 Thấp | Các mini-game được thiết kế theo tỷ lệ Touch-friendly trên màn hình cảm ứng điện thoại lẫn chuột bàn phím máy tính. |

---

## 7. Kế hoạch Kiểm thử (Test Plan)

1. **Unit Tests (Vitest)**:
   - Kiểm thử thuật toán FSRS không bị suy chuyển.
   - Kiểm thử công thức tính XP, thăng cấp Thỏ (Level formula).
   - Kiểm thử logic sinh bộ thẻ nối từ & chống trùng lặp.
2. **Type Checking**:
   - `npm run typecheck` đạt 0 lỗi.
3. **E2E / Regression Checks**:
   - Kiểm tra toàn bộ luồng V1: Dashboard -> Học bài mới -> Ôn tập SRS -> Thư viện -> Settings.
   - Kiểm tra luồng V2: Vào trang `/game`, chọn mini-game, chơi và nhận XP/cà rốt, nâng cấp thỏ, kiểm tra các điểm truy cập từ Dashboard và màn hình hoàn thành bài học.
