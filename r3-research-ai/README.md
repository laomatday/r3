# R3 Research AI — Vercel + Gemini Free Tier (tùy chọn)

Ứng dụng mobile-first React/Vite/TypeScript/PWA với 52 FAQ từ báo cáo BC149.02.04.pdf. Giao diện Typography V2, thư viện, hỏi đáp có dẫn nguồn PDF và luyện phản biện vẫn hoạt động **không cần API key**. Backend dùng **Vercel Functions**; không cần Cloudflare hay Wrangler.

## Triển khai trên Vercel

1. Import repository `laomatday/r3` hoặc mở dự án Vercel đã liên kết.
2. **Root Directory: `r3-research-ai`** (thư mục chứa `package.json`).
3. **Framework Preset: Vite** · **Build Command: `npm run build`** · **Output Directory: `dist`**.
4. Deploy. Chưa có Gemini key, frontend và các endpoint chạy ở chế độ tra cứu nội bộ.
5. Muốn bật Gemini: thêm **`GEMINI_API_KEY`** vào **Project Settings → Environment Variables** (Production/Preview tùy mục đích), và tùy chọn `GEMINI_MODEL=gemini-2.5-flash-lite`. Redeploy sau khi thêm biến. Tạo key tại https://aistudio.google.com/api-keys. **Không commit hoặc dán key vào HTML, GitHub hay biến `VITE_*`.**
6. Truy cập `https://<domain>/api/health`: `mode=local` khi không có key, `mode=gemini` khi có biến môi trường. Cần thử hỏi thực tế vì trạng thái này không kiểm tra quota Gemini.

Hai route API nằm tại `api/health.ts` và `api/chat.ts`; logic dùng chung trong `server/chat.ts`. Vercel tự build các file `api/*.ts` thành Node.js Functions. Timeout tối đa của chat được cấu hình trong `vercel.json`.

## Chạy và kiểm thử

Yêu cầu Node 20.19+ hoặc 22+:

```bash
cd r3-research-ai
npm install
npm run dev         # localhost:5173, chế độ hỏi đáp nội bộ
npm run typecheck
npm run test
npm run build
```

Nếu muốn thử chức năng API trên máy tính, dùng `npx vercel dev` (có thể cần đăng nhập Vercel). Biến môi trường tùy chọn có thể lưu trong `.env.local` ở máy riêng; tệp này đã được .gitignore bảo vệ. Khi không có key, ứng dụng luôn fallback về FAQ nội bộ.

## Vì sao thay đổi kiến trúc?

Bản đầu khai báo `wrangler@^4.48.0` và `@cloudflare/workers-types@^4.20251115.0`; npm chọn Wrangler mới yêu cầu Workers Types 5.x, gây `ERESOLVE` trên Vercel. Bản sửa **loại bỏ cả hai dependency** và thay Worker bằng Vercel Functions. Không dùng `--force` hoặc `--legacy-peer-deps`.

## Dữ liệu và giới hạn

- `src/data/knowledge.ts`: 52 FAQ đã biên tập. `src/data/source-chunks.json`: 59 đoạn trích có trang PDF. `public/media` và `public/bao-cao-r3.pdf`: dữ liệu thực nghiệm.
- AI chỉ dùng các nguồn được truy xuất, phân loại mức độ bằng chứng và giới hạn nhận định an toàn/cơ chế; hết quota hoặc lỗi Gemini sẽ tự dùng FAQ.
- Không lưu lịch sử hội thoại vào database. Khi bật Gemini Free Tier, câu hỏi và đoạn trích liên quan được gửi cho Google, có thể chịu điều khoản xử lý dữ liệu của Free Tier. Không gửi dữ liệu mật.
- Rate limit 18 lượt/phút/IP là **best effort theo từng instance**, không phải bảo vệ chống lạm dụng phân tán. Theo dõi quota và chi phí trên nhà cung cấp.
- Chưa có kết nối ESP32 trực tiếp hay chấm điểm AI. Chưa xác nhận API Gemini live cho đến khi có key hợp lệ.


## Growth Chamber · Trang QR cho buồng sinh trưởng

Trang hướng dẫn độc lập: **`/growth-chamber/index.html`**. Tệp nằm ở `public/growth-chamber/index.html` nên Vite tự sao chép sang `dist/`. Đường dẫn này có thể dùng tạo QR sau khi bản deploy được nghiệm thu.

Nội dung gồm đúng bốn phần theo yêu cầu: **Cấu tạo – Tính năng – Hướng dẫn dùng trên điện thoại – Ứng dụng trong CTGDPT 2018**. Bản hotfix cập nhật từ báo cáo `BC149.02.04.pdf` và tệp `hướng dẫn.docx` (thiết bị ESP32 thực tế).

### Cấu hình & vận hành được xác nhận
- ESP32 đọc DHT11 (GPIO27) và BH1750 (SDA GPIO21, SCL GPIO22). TFT ST7789 240 × 240 hiển thị số liệu, chế độ, IP; relay 1 GPIO25 là gia nhiệt, relay 2 GPIO26 là quạt.
- Relay kích LOW để bật và HIGH để tắt. Khi khởi động hai relay ở trạng thái tắt và ESP32 vào chế độ Tự động.
- ESP32 phát Wi-Fi cục bộ `ESP32_ENV` và chạy web server; điện thoại kết nối mạng này, sau đó mở **IP hiển thị trên TFT**. Không cần Internet, không giả định địa chỉ IP cố định.
- Ngưỡng tự động mặc định: <25°C bật gia nhiệt; 25–37°C hai relay tắt; >37°C bật quạt. Chỉ **nhiệt độ** tự điều khiển; độ ẩm và ánh sáng chỉ giám sát. Có thể sửa ngưỡng với điều kiện thấp < cao.
- Ở chế độ Thủ công hai relay điều khiển độc lập. Phải giám sát thiết bị gia nhiệt; không mặc định rằng hệ thống sẽ tự ngắt khi đang Thủ công.
- Cảm biến đọc 2 giây/lần, TFT cập nhật 1 giây/lần, web lấy dữ liệu 1,5 giây/lần, Serial 115200 baud. Báo cáo có nêu chu kỳ ghi dữ liệu 10 phút/lần nhưng **tài liệu firmware chưa xác nhận lưu nhật ký bền vững**.
- **Chưa có kích thước tổng thể của buồng** trong tài liệu. Khay 10 × 15 cm không phải kích thước buồng.

**Bảo mật:** Tài liệu nguồn ghi mật khẩu Wi-Fi mặc định `12345678`. Đây là mật khẩu yếu và được nhắc rõ trên trang QR; cần **đổi mật khẩu và kiểm soát quyền truy cập** trước khi sử dụng công khai tại triển lãm. Website QR không phải ứng dụng điều khiển từ Internet: chức năng mở IP chỉ dẫn đến máy chủ web **cục bộ** của ESP32.

**Dạy học:** Danh mục môn học là đề xuất theo chủ đề của CTGDPT 2018; số bài có thể thay đổi theo bộ SGK.
