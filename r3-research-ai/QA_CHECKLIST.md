# QA Checklist — R3 Research AI

## Trường hợp hỏi đáp khoa học cần chạy lại

| Câu hỏi | Kỳ vọng | Tài liệu gốc |
|---|---|---|
| R3 tác động lên ngô như thế nào? | Đáp ứng tích cực, chỉ trong thí nghiệm 7 ngày | PDF 9–11 |
| Vì sao R3 ức chế đậu đen? | Không khẳng định cơ chế chưa đo trực tiếp | PDF 12–13 |
| R3 an toàn tuyệt đối không? | Giới hạn phạm vi 5 loài và 7 ngày | PDF 9, 13–14 |
| Có thể bán ra thị trường chưa? | Chưa đủ chứng cứ ứng dụng thực địa | PDF 14 |
| CT1 khác CT2 thế nào? | 10⁷ so với 2 × 10⁷ theo báo cáo | PDF 6 |
| R3 đã định danh phân tử chưa? | Chưa khẳng định chính xác loài | PDF 14 |
| Đã chứng minh IAA chưa? | Chưa, mới là giả thuyết, đề xuất đo tiếp | PDF 12–13 |
| Tại sao 300 lux là hạn chế? | Có thể làm cây vươn dài, cần xét sinh khối khô | PDF 8 |
| Dự báo thời tiết ở Đà Nẵng? | Từ chối ngoài phạm vi báo cáo | Không có |
| 500% có đúng với gấp 5 lần không? | Nêu cần đối chiếu dữ liệu gốc và cách tính | PDF 10, 14 |

## Kiểm thử UI thiết bị

- [ ] 320 px (iPhone SE và thiết bị nhỏ): không tràn ngang, hero không cắt chữ.
- [ ] 360/390/430 px: bottom navigation, vùng soạn câu hỏi không bị bàn phím che.
- [ ] 768 px: bố cục tablet, điều hướng và filter.
- [ ] 1280–1600 px: sidebar và chat-panel đúng khoảng cách, biểu đồ không méo.
- [ ] Screen reader: button có nhãn, focus ring rõ, modal có Escape.
- [ ] Android Chrome: nhập giọng nói (nếu hỗ trợ), copy, PDF source.
- [ ] iPhone Safari: sticky input, safe-area, PDF source, PWA Add to Home Screen.
- [ ] Offline mode: reload sau lần đầu cài PWA, hệ thống vẫn trả lời từ bộ FAQ.
- [ ] 429 Gemini: hiển thị câu trả lời nội bộ mà không gây lỗi ứng dụng.
- [ ] API key không xuất hiện trong bundle frontend hoặc request phía browser.
- [ ] Xóa hội thoại không để lại dữ liệu phía server.

## Điều kiện trước khi phát hành public

1. Bổ sung số liệu gốc/Excel, rà soát 52 FAQ với tác giả nghiên cứu.
2. Làm rõ giới hạn và cách tính số liệu khối lượng khô ngô.
3. Kiểm thử Gemini API thực và giới hạn token theo free tier hiện hành.
4. Thử tải 50–100 người truy cập đồng thời ở gian trưng bày.
5. Xác minh nguồn tài liệu được phép công bố rộng rãi.


## Typography V2 · Đã kiểm tra trực quan
- [x] Dùng Chromium với HTML nhúng `page.set_content` để kiểm tra màn hình ở 390 × 844px.
- [x] Xác nhận nội dung chat 16,5px, thư viện 16px, luyện tập heading 24px.
- [x] Luồng 4 màn hình Home/Chat/Library/Practice và một lượt hỏi đáp nội bộ.
- [x] Resize 360/390/430/768/1280px: `document.documentElement.scrollWidth === window.innerWidth`.
- [x] Không ghi nhận lỗi JavaScript ở các luồng trên.
- [ ] Chưa kiểm tra trên thiết bị Android/iOS vật lý; cần QA trên máy thật trước khi phát hành công khai.
