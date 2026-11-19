# R3 Research AI — Typography V2 · Mobile-first Research Assistant

Ứng dụng nghiên cứu khoa học tương tác dùng báo cáo **BC149.02.04.pdf** làm nguồn tri thức chính. Bản MVP gồm **React + Vite + TypeScript + PWA + Cloudflare Worker + Gemini Free API (tùy chọn)**.

> **Quan trọng:** Bản demo HTML hoạt động offline ở chế độ **tra cứu từ thư viện câu hỏi–đáp án**, không phải mô hình tạo sinh. Khi có Gemini API key hợp lệ trong Cloudflare Worker, ứng dụng mới có tính năng AI tạo sinh giới hạn theo nội dung báo cáo và dẫn nguồn. Không có API key cũng không cần thanh toán để dùng chế độ tra cứu.

## Typography V2 — nâng độ dễ đọc (17/11/2026)

Bản này làm lại toàn bộ hệ phân cấp chữ của ứng dụng, không thay đổi dữ liệu hoặc cách hoạt động:

- Nội dung chat: **16,5px trên mobile**, 17px trên desktop, line-height 1,72–1,76.
- Mô tả, tài liệu, nội dung luyện bảo vệ: **16px**; label phụ 12–14px.
- Tiêu đề màn hình khoảng **24–35px trên mobile**, ưu tiên độ tương phản và khoảng trắng.
- Ô nhập liệu giữ **16px** để tránh Safari/iOS tự zoom khi focus.
- Nút bấm và điều hướng đáy được nâng kích thước mục tiêu chạm.
- Thẻ câu hỏi trên điện thoại chuyển **một cột**, bố cục có icon và nội dung dễ đọc.
- Đã kiểm tra Chromium mô phỏng viewport **360, 390, 430, 768, 1280px**, các màn Home/Chat/Thư viện/Luyện tập không tràn ngang và không có lỗi JavaScript trong luồng kiểm thử.

**Cách mở dùng ngay:** Mở `R3-Research-AI-Typography-V2.html` trong Chrome/Safari từ thiết bị. Đây là bản một tệp, không cần Cloudflare, tài khoản, API key hay cài npm. Đây là bản tra cứu FAQ, **chưa** gọi Gemini API tạo sinh khi mở file độc lập.

## 1. Thành phần đã làm

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| Mobile-first UX / desktop responsive | Đã viết mã | Màn hình Home, Chat, Library, Practice |
| Nội dung 15 trang PDF gốc | Đã đóng gói | `public/bao-cao-r3.pdf` |
| 52 FAQ biên tập theo báo cáo | Đã biên tập | `src/data/knowledge.ts` |
| 59 source chunks theo trang PDF | Đã trích xuất | `src/data/source-chunks.json` |
| Ảnh/biểu đồ từ PDF | Đã trích xuất | `public/media/` |
| Hỏi đáp offline miễn phí | Đã kiểm thử logic | Không dùng mô hình sinh văn bản |
| Cloudflare API Worker | Đã viết mã | `/api/health`, `/api/chat` |
| Gemini API free-tier | Đã tích hợp trong mã | **Chưa thể kiểm thử trực tiếp** khi thiếu API key |
| PWA | Đã tạo manifest & service worker | Cần HTTPS khi cài trên mobile |
| Dẫn nguồn PDF | Đã tích hợp | Số trang tính theo **PDF** (1–15) |
| Luyện phản biện | Tự luyện | 5 câu có gợi ý và đáp án; **chưa phải chấm AI** |

## 2. Dùng thử ngay — không cần cài đặt

Mở tệp **R3-Research-AI-Typography-V2.html** (nằm cạnh file ZIP sau khi tải) trong trình duyệt. Tệp đã chứa cả báo cáo gốc và ảnh minh họa; hoạt động khi offline. Có thể truy cập bốn màn hình: **Khám phá / Hỏi đáp / Thư viện / Luyện phản biện**.

**Lưu ý trên điện thoại:** Một số ứng dụng quản lý tệp có thể hạn chế mở `file://` hoặc ngăn popup xem PDF. Nếu có lỗi, mở tệp trong Chrome/Safari hoặc đưa lên một static host. Riêng lời giải dẫn nguồn vẫn hiển thị số trang.

## 3. Chạy dự án React / Cloudflare cục bộ

Máy tính cài Node.js 20.19+ hoặc 22+ và npm, có quyền tải package qua `registry.npmjs.org`.

```bash
cd r3-research-ai
npm install
npm run build
```

**Cửa sổ lệnh 1** — chạy Cloudflare Worker (chạy chế độ offline nếu chưa có key):

```bash
npm run worker:dev
```

**Cửa sổ lệnh 2** — chạy giao diện Vite (proxy API tới port 8787):

```bash
npm run dev
```

Truy cập `http://localhost:5173`. Có thể kiểm tra sức khỏe API ở `http://localhost:8787/api/health`.

Chạy test TypeScript sau khi cài npm:

```bash
npm run test
```

## 4. Bật Gemini API miễn phí

1. Tạo key qua Google AI Studio: https://aistudio.google.com/api-keys
2. Chọn mô hình có **free tier** phù hợp. Mặc định trong cấu hình là `gemini-2.5-flash-lite`; kiểm tra mục Pricing và Rate limits của Google trước triển khai.
3. Với chạy local, sao chép `.dev.vars.example` thành `.dev.vars` rồi đặt `GEMINI_API_KEY=...`.
4. **Không** đặt key vào code React, `VITE_*`, HTML hoặc GitHub. `.dev.vars` đã có trong `.gitignore`.

Hệ thống tự trả lời theo thư viện nội bộ khi thiếu key, lỗi mạng hoặc vượt quota Gemini. Không tự động gọi API trả phí.

## 5. Phát hành bằng Cloudflare Workers

Một ứng dụng Workers duy nhất có thể phục vụ **frontend đã build** từ `dist/` và **API `/api/*`** bằng `worker/index.ts`, không cần domain riêng.

```bash
npm install
npm run build
npx wrangler login
npx wrangler deploy
npx wrangler secret put GEMINI_API_KEY
```

Lệnh `secret put` cấu hình khóa bí mật trong hệ thống Cloudflare. Chỉ có thể kích hoạt Gemini thực tế với key do chủ sở hữu cung cấp. Trang sẽ được Cloudflare cung cấp URL `.workers.dev` nếu cấu hình tài khoản cho phép.

Để tránh phí ngoài ý muốn: **không nâng cấp gói Cloudflare/Gemini lên paid tier**, giám sát rate limit; kiểm tra quota tại AI Studio. Free-tier thay đổi theo tài khoản và thời điểm, không bảo đảm vô hạn.

Tài liệu liên quan:
- Gemini free tier: https://ai.google.dev/gemini-api/docs/pricing
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Workers static assets: https://developers.cloudflare.com/workers/static-assets/

## 6. Kiến trúc dữ liệu & đảm bảo chính xác

```
Tương tác người dùng
    │
    ├─ Không có API Key -> FAQ retrieval (miễn phí, offline)
    │
    └─ Có API Key -> /api/chat (Cloudflare Worker)
                        ├─ lọc câu hỏi
                        ├─ tìm các source chunks PDF (có số trang)
                        ├─ thêm câu hỏi/hội thoại làm ngữ cảnh
                        ├─ Gemini Flash-Lite (JSON)
                        ├─ kiểm tra ID nguồn phải nằm trong các chunks đã lấy
                        └─ lỗi / quota -> FAQ fallback
```

**Các nguồn tri thức:**
- `src/data/knowledge.ts`: 52 FAQ biên tập thủ công, loại thông tin `reported / hypothesis / limitation`.
- `src/data/source-chunks.json`: 59 đoạn nội dung trích từ PDF, có `id`, `page`, `section`, `text`.
- `public/media/`: ảnh/biểu đồ trích nguyên từ tài liệu (không phải ảnh tạo bởi AI).
- `public/bao-cao-r3.pdf`: bản nguồn gốc.

### Quy tắc học thuật

- Không suy rộng “R3 an toàn tuyệt đối”, chỉ trình bày kết quả trong phạm vi 5 loài và 7 ngày.
- Không nói R3 tốt cho mọi cây — dữ liệu cho thấy khác biệt lúa/ngô với đậu đen/rau muống.
- IAA, khoáng hóa dinh dưỡng, tổn thương rễ là **giả thuyết** chưa chứng minh trực tiếp.
- Không gọi tên loài cụ thể cho R3 khi chưa có định danh phân tử đa locus.
- Cách diễn đạt “khối lượng khô ngô tăng gấp >5 lần” vs “tăng 500%” cần đối chiếu số liệu gốc để thống nhất.
- Không nói thử nghiệm nhà lưới hoặc 14–21 ngày đã hoàn thành: đây là đề xuất tương lai.
- Nếu thiếu dữ liệu, trả lời rõ “chưa đủ thông tin” thay vì bịa số liệu.

## 7. Bảo mật và quyền riêng tư

- API key chỉ ở Worker env secret, không gửi tới browser.
- Hỏi đáp không lưu vào cơ sở dữ liệu; hội thoại tồn tại tạm thời trên bộ nhớ của trang. Refresh sẽ mất dữ liệu.
- Với Gemini Free Tier, nội dung prompt và đoạn trích gửi tới Google có thể được dùng cải thiện dịch vụ theo điều khoản của họ; không sử dụng cho dữ liệu cá nhân hay dữ liệu nghiên cứu mật khi chưa đánh giá chính sách.
- Có giới hạn 650 ký tự/câu hỏi, 18 lượt/phút/IP trong Worker memory **best-effort** (không phải bộ giới hạn rate phân tán hoặc chống DDoS). Với lưu lượng công khai, nên bật Cloudflare WAF/Turnstile và rate limiting nền tảng.
- Không có kết nối trực tiếp ESP32; dữ liệu buồng sinh trưởng ở MVP lấy từ PDF và không phải realtime.

## 8. QA và giới hạn nghiệm thu

**Đã kiểm tra trong môi trường hiện tại**: syntax của TypeScript/JS thông qua TypeScript transpilation, 26 kiểm tra syntax, truy xuất tri thức và luồng giao diện offline bằng Node sandbox. Kết quả 26/26 đạt sau khi sửa lỗi khớp từ khóa.

**Chưa thể kiểm tra tại môi trường tạo mã nguồn này**: `npm install` (DNS truy cập npm registry bị chặn), trình duyệt Chromium (policy hạn chế truy cập URL), và Gemini API live (chưa có key). Vì vậy **chưa được xem là bản production đã nghiệm thu**. Khi triển khai trên môi trường có Internet, cần chạy `npm install`, `npm run build`, `npm run test`, kiểm thử thực tế Android/iOS và live Gemini trước khi công bố.

### Gợi ý nâng cấp tiếp

Có thể tích hợp đánh giá bằng rubric, QR động, dữ liệu ESP32 từ API, dashboard thống kê, nhiều tài liệu, người quản trị cập nhật tri thức và hàng đợi kiểm duyệt. Những hạng mục này chưa được thực hiện trong MVP.
