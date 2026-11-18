# KILOMeet: checklist kiểm thử toàn diện

Dùng file này để test app trên điện thoại thật trước khi quay video và nộp bài. Mỗi dòng có **mã** (để báo lỗi), **cách làm** và **kết quả đúng**. Tick `[x]` khi đạt. Nếu sai, ghi mã vào [Sổ lỗi](#sổ-lỗi) cuối file.

Số liệu trong bảng là **số của dữ liệu demo ngay sau `pnpm demo:reset`**. Nếu đã thử vài bước rồi, số sẽ khác.

---

## 0. Chuẩn bị

| Mã | Việc | Lệnh / cách làm | Đạt |
|---|---|---|---|
| P-01 | Bật database | `cd kilomeet-api && docker compose up -d` | [x] |
| P-02 | Đưa dữ liệu về trạng thái demo | `pnpm demo:reset`, rồi chờ khoảng 1 phút cho các giao dịch seed lên chain | [x] đã reset bằng `pnpm db:seed` |
| P-03 | Chạy backend | `pnpm dev`. Mở `http://<IP LAN>:3000/health` trên trình duyệt điện thoại, phải thấy `"success":true` và `"chain":"fuji"` | [x] |
| P-04 | Đối chiếu chain | `pnpm chain:check`, dòng cuối phải là "Khớp hoàn toàn." | [x] |
| P-05 | Cấu hình app | `kilomeet-app/.env.local` có `EXPO_PUBLIC_API_URL=http://<IP LAN>:3000` và `EXPO_PUBLIC_DEMO=true` | [x] |
| P-06 | Chạy app | `cd kilomeet-app && pnpm start --clear`, quét QR bằng Expo Go. Điện thoại và máy tính dùng chung Wi-Fi | [x] |
| P-07 | Tải lại khi sửa code | Bấm `r` ở terminal Expo, hoặc lắc máy rồi chọn Reload | [x] |

### Tài khoản demo (mật khẩu `demo123`)

| Email | Vai trò | Trạng thái ban đầu |
|---|---|---|
| `lan@demo.com` | Người chạy | Đồng, 0 token, chưa là hội viên |
| `minh@demo.com` | Hội viên | Cao thủ, 1.000 token, 42 km tuần này, 24 buổi chạy |
| `an@demo.com` | Hội viên | Kim cương, 420 token, ở gần HCMUT |
| `binh@demo.com` | Hội viên | Cao thủ, 760 token, ở gần HCMUT |
| `quanfuji@demo.com` | Cửa hàng | Fuji Coffee, đã duyệt, ví phí 150.000đ |
| `juice@demo.com` | Cửa hàng | Juice Factory, ví phí 0đ, nên voucher hiện "Tạm hết" |
| `newcafe@demo.com` | Cửa hàng | New Café Bách Khoa, **chờ duyệt** |
| `admin@demo.com` | Quản trị | |

### Mẫu voucher trong seed

| Mã | Quán | Tên | Giá | Nhiệm vụ | Hạng tối thiểu | Còn |
|---|---|---|---|---|---|---|
| vt-1 | Fuji Coffee | Giảm 20% toàn menu | 500 | Chạy ngang quán, giảm 50% | Đồng | 73/100 |
| vt-2 | Highlands | Trà đào miễn phí size M | 300 | Chạy ngang quán, giảm 30% | Bạc | 32/50 |
| vt-3 | Phúc Long | Giảm 30% trà sữa | 400 | Không | Đồng | 55/80 |
| vt-4 | Cộng Cà Phê | Mua 1 tặng 1 | 600 | Chạy ngang quán, giảm 40% | Vàng | 18/30 |
| vt-5 | Bánh Mì Huỳnh Hoa | Giảm 15k bánh mì đặc biệt | 200 | Chạy ngang quán, giảm 50% | Đồng | 145/200 |
| vt-6 | Juice Factory | Smoothie bowl miễn phí | 450 | Không | Đồng | 28/40, **Tạm hết** |

---

## 1. Giao diện chung (kiểm ở mọi màn)

| Mã | Kiểm tra | Kết quả đúng | Đạt |
|---|---|---|---|
| UI-01 | Theme sáng | Nền kem, chữ đậm màu mực. Không có chữ trắng trên nền sáng | [x] |
| UI-02 | Font tiếng Việt | Tiêu đề Baloo 2, nội dung Nunito, số Lilita One. Chữ có dấu như "Đội", "Cao Thủ", "Bạch Kim" **không** bị đổi font | [x] |
| UI-03 | Thẻ và nút | Có viền mực dày và bóng đậm phía dưới. Bấm thì nút lún xuống | [x] |
| UI-04 | Dòng menu | Icon bên trái, tiêu đề và mô tả **nằm ngang** cạnh icon, mũi tên ở cuối. Không dính sát lề | [x] |
| UI-05 | Thanh tab người chạy | Nút CHẠY tròn màu xanh ở giữa, không che chữ "CHẠY". Tab đang chọn có nền vàng | [x] |
| UI-06 | Thanh tab cửa hàng | Nút Quét QR tròn màu cam ở giữa, không che chữ "QUÉT QR" | [x] |
| UI-07 | Bản đồ hoạt hình | Đường trắng viền đậm, công viên xanh, không có tên đường. Đúng kiểu này ở **mọi** bản đồ, kể cả lúc đang chạy | [x] |
| UI-08 | Thông báo lỗi | Lỗi hiện bằng toast hoặc hộp thoại **tiếng Việt**, không hiện tên lỗi kỹ thuật | [x] |
| UI-09 | Kéo để làm mới | Kéo xuống ở Sảnh, Cửa hàng, Ví và Tổng quan quán: dữ liệu tải lại | [ ] |
| UI-10 | Màn nhỏ | Không có chữ bị cắt hay tràn ngang. Nội dung cuối trang không bị thanh tab che | [x] |
| UI-11 | Mất mạng | Tắt Wi-Fi rồi thao tác: app báo lỗi và không bị treo | [ ] |

---

## 2. Bắt đầu: onboarding, đăng nhập, đăng ký

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| A-01 | Mở app lần đầu, chưa đăng nhập | Vào màn giới thiệu (onboarding), lướt qua các trang, cuối cùng tới màn Đăng nhập | [ ] |
| A-02 | Đăng nhập `lan@demo.com` | Vào Sảnh của người chạy | [x] |
| A-03 | Đăng nhập sai mật khẩu | Báo "Email hoặc mật khẩu không đúng" | [x] |
| A-04 | Gõ email có chữ hoa hoặc dấu cách thừa, ví dụ ` LAN@demo.com ` | Vẫn đăng nhập được | [ ] |
| A-05 | Đăng ký **người chạy** mới bằng email mới | Tạo được tài khoản: hạng Đồng, 0 token, có địa chỉ ví Avalanche | [ ] |
| A-06 | Đăng ký bằng email đã có | Báo "Email đã được sử dụng" | [ ] |
| A-07 | Đăng ký mà bỏ trống hoặc nhập sai trường | Báo lỗi tiếng Việt ngay dưới trường đó | [ ] |
| A-08 | Đăng ký **đối tác**: tên quán, địa chỉ, bấm "Lấy vị trí quán" | Bản đồ hiện ghim tại vị trí. Tạo xong thì vào màn **Đang chờ duyệt** | [ ] |
| A-09 | Tắt app rồi mở lại | Vẫn đăng nhập, vào đúng trang chủ của vai đó | [x] |
| A-10 | Đăng xuất ở từng vai | Có hộp xác nhận, sau đó quay về màn Đăng nhập | [x] |

---

## 3. Người chạy (`lan@demo.com` và `minh@demo.com`)

### 3.1 Sảnh

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| R-01 | Mở Sảnh bằng Minh | Hiện hạng Cao thủ, 1.000 token, 42 km tuần này, 24 buổi chạy, số ngày còn lại của mùa | [x] |
| R-02 | Xem thẻ Nhiệm vụ | Nhiệm vụ ngày (2 km, +10) và nhiệm vụ tuần (mục tiêu km, thưởng 7 token mỗi km mục tiêu) có thanh tiến độ | [x] |
| R-03 | Bấm "BẮT ĐẦU CHẠY" | Chuyển sang tab Chạy | [ ] |
| R-04 | Bấm ô "buổi chạy" | Mở Lịch sử chạy | [ ] |
| R-05 | Minh có token nhiều hơn mức giữ được khi hết mùa (1.000 > 500) | Có nhắc "Tiêu token trước khi hết mùa!" | [x] |
| R-06 | Bấm chuông | Hiện danh sách thông báo, hoặc báo "Chưa có thông báo mới" | [ ] |

### 3.2 Chạy (lõi của demo)

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| R-10 | Mở tab Chạy, cho phép quyền vị trí | Bản đồ hoạt hình, **ghim xanh** ở vị trí của bạn, ghim cam cho các quán. Thẻ trên cùng báo "Sẵn sàng xuất phát" | [x] |
| R-11 | Bấm ghim quán | Hiện tên quán và mức giảm khi chạy ngang quán | [ ] |
| R-12 | Bấm nút định vị | Bản đồ quay về vị trí của bạn | [ ] |
| R-13 | **Demo:** bấm "3 km (không qua quán)" bằng Lan | Lưu buổi chạy, màn chiến thắng hiện khoảng 3 km. Nhiệm vụ ngày đạt: **+10 RUN**, có dòng "ghi lên Avalanche · xem giao dịch" | [x] |
| R-14 | Bấm "xem giao dịch" ở màn kết quả | Mở Ví & giao dịch, có dòng "Thưởng nhiệm vụ +10", trạng thái *Đang gửi lên chain*, sau ít giây đổi thành *Đã xác nhận* | [x] |
| R-15 | Chạy demo lần 2 trong cùng ngày | Không được thêm 10 token, vì nhiệm vụ ngày chỉ nhận 1 lần mỗi ngày | [ ] |
| R-16 | **Demo:** bấm "5 km ngang Fuji + Highlands" bằng Minh | Màn kết quả liệt kê 2 quán đã chạy ngang và cho **chọn 1 quán** để nhận giảm giá | [x] |
| R-17 | Chọn Fuji rồi bấm "Nhận giảm giá" | Báo "Đã nhận giảm giá". Nút chuyển thành "Đã nhận" | [x] |
| R-18 | **GPS thật:** bấm XUẤT PHÁT rồi đi bộ ngoài trời 200–300 m | Màn đang chạy nền tối: số km tăng dần, thời gian, tốc độ, kcal. Thẻ bản đồ **vẫn là bản đồ hoạt hình**, có đường chạy cam viền đậm và ghim xanh di chuyển theo bạn | [ ] |
| R-19 | Đi ngang một quán, trong vòng 50 m | Thẻ bản đồ hiện nhãn "Đã qua <quán> · N m" | [ ] |
| R-20 | Đạt 2 km trong lúc chạy | Hiện băng vàng "Nhiệm vụ ngày hoàn thành!" kèm +10 | [ ] |
| R-21 | Bấm Tạm dừng, rồi Tiếp tục | Đồng hồ dừng rồi chạy tiếp. Lúc tạm dừng không ghi thêm điểm GPS | [ ] |
| R-22 | Bấm nút Dừng (vuông đỏ) | Hộp xác nhận hiện số km và thời gian. "Dừng & lưu" lưu buổi chạy, "Tiếp tục chạy" quay lại | [ ] |
| R-23 | Bấm X trong lúc chạy | Hỏi trước khi thoát, không mất dữ liệu nếu bấm nhầm | [ ] |
| R-24 | Kiểm tra trên máy tính rằng backend tự tính km | Chạy lệnh xem bảng `runs` (xem [Mục 8](#8-kiểm-tra-dữ-liệu-backend)): cột `km` do backend tính từ GPS, `so_diem_gps` > 0 | [ ] |
| R-25 | Mở Lịch sử chạy | Buổi vừa chạy nằm đầu danh sách. Buổi dưới 2 km có nhãn "Chưa đủ 2 km", buổi đủ có nhãn "NV ngày" | [ ] |

### 3.3 Cửa hàng voucher và mua voucher

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| R-30 | Mở tab Cửa hàng | Danh sách voucher gần bạn dạng vé, mỗi vé có số "Còn N" | [x] |
| R-31 | Bấm các bộ lọc: Tất cả / Có nhiệm vụ / Đã mở giảm giá | Danh sách lọc đúng | [x] |
| R-32 | Gõ vào ô tìm kiếm | Lọc theo tên voucher hoặc tên quán. Không có kết quả thì hiện "Không tìm thấy voucher" | [ ] |
| R-33 | Tìm voucher Juice Factory (vt-6) | Vé mờ, nhãn **"TẠM HẾT"**, xếp cuối danh sách | [ ] |
| R-34 | Lan (hạng Đồng) xem vt-2 (cần Bạc) | Nhãn "Cần Bạc". Bấm mua thì báo "Chưa đủ hạng" | [ ] |
| R-35 | Minh đã nhận giảm giá Fuji ở R-17, mở vt-1 | Giá gạch **500**, giá mới **250**, nhãn "Đã chạy ngang quán · -50%" | [x] |
| R-36 | Bấm "Mua · 250" | Token giảm 250 (1.000 → 750, cộng thêm token buổi chạy nếu có). Số "Còn" giảm 1. Voucher vào Kho đồ, có QR | [x] |
| R-37 | Mua vt-1 lần 2 | Giá quay về **500**, vì mỗi mẫu voucher chỉ được giảm 1 lần | [ ] |
| R-38 | Mua khi không đủ token, ví dụ Lan có 10 token | Báo "Không đủ token" và không bị trừ gì | [ ] |
| R-39 | Mở chi tiết vt-6 (Juice Factory) | Nút mua ghi **"Tạm hết"** và không bấm được | [ ] |
| R-40 | Bấm "Về quán" trong chi tiết voucher | Mở trang quán: ảnh bìa, giới thiệu, giờ mở cửa, món nổi bật, bản đồ, danh sách voucher của quán | [ ] |
| R-41 | Bấm "Chỉ đường" hoặc "Chia sẻ" ở trang quán | Mở ứng dụng bản đồ hoặc bảng chia sẻ của máy | [ ] |
| R-42 | Mở tab Kho đồ | Có voucher vừa mua, trạng thái "Có thể dùng" và QR | [x] |

### 3.4 Tặng voucher

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| R-50 | Minh mở voucher đã mua, bấm "Tặng bạn bè", nhập `lan@demo.com` | Báo "Đã tặng thành công" và có nút "Xem giao dịch". Voucher biến khỏi Kho đồ của Minh | [x] |
| R-51 | Lan mở Kho đồ | Có voucher được tặng, QR **khác** mã QR cũ của Minh | [x] QR mới khác mã cũ |
| R-52 | Lan tặng tiếp voucher đó | Báo "Voucher đã được tặng một lần rồi" | [ ] |
| R-53 | Tặng cho chính mình, hoặc cho email không tồn tại | Báo "Không thể tự tặng voucher cho mình", hoặc "Không tìm thấy người nhận" | [ ] |

### 3.5 Hồ sơ, hội viên, ví, huy hiệu

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| R-60 | Lan mở Hồ sơ | Tên, hạng, token, các mục: Lịch sử chạy, Huy hiệu mùa, Ví & giao dịch, Thông báo nhắc chạy | [x] |
| R-61 | Lan bấm "Đăng ký Hội viên" (39.000đ/tháng, thanh toán giả lập), rồi xác nhận | Báo "Bạn đã là Hội viên KILOMeet!". Hồ sơ có nhãn hội viên. Tab Nhóm mở khoá | [ ] |
| R-62 | Mở Ví & giao dịch | Địa chỉ ví và link Snowtrace, số dư token. Mỗi dòng giao dịch có nhãn tiếng Việt, số tiền +/−, trạng thái và link Snowtrace | [x] |
| R-63 | Bấm link Snowtrace của một giao dịch | Mở trang giao dịch trên `testnet.snowtrace.io` | [ ] |
| R-64 | Mở Huy hiệu mùa | Thẻ "Mùa hiện tại", kệ cúp các mùa đã qua, các ô Thành tích. Chữ "Đội", "Cao Thủ" **đúng font** | [ ] |
| R-65 | Bấm "Cài đặt" | Báo "Cài đặt sẽ có trong bản sau" | [ ] |

---

## 4. Nhóm chạy (Hội viên: Minh, An, Bình)

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| G-01 | Lan (chưa là hội viên) mở tab Nhóm | Thấy lời mời đăng ký Hội viên. Các chức năng nhóm bị khoá | [x] |
| G-02 | Minh mở tab Nhóm | Hai thẻ "Tự lập nhóm" và "Ghép tự động", thẻ Độ đúng hẹn (%), "Nhóm của tôi", "Nhóm gần bạn" | [x] |
| G-03 | Đọc dòng dưới Độ đúng hẹn | "Đến trễ hoặc vắng không báo sẽ làm giảm độ đúng hẹn…", **không** còn nói bị khoá | [x] |
| G-04 | Bấm Tự lập nhóm: chọn ngày, giờ (mỗi 30 phút một mốc), điểm hẹn trên bản đồ, quãng đường, phạm vi hạng, mức đúng hẹn tối thiểu | Báo "Đã tạo nhóm chạy mới". Nhóm hiện trong "Nhóm của tôi" | [x] |
| G-05 | Đăng nhập An rồi Bình, tìm nhóm của Minh trong "Nhóm gần bạn", bấm tham gia và xác nhận | Báo "Đã xác nhận tham gia nhóm". Danh sách Đồng đội tăng lên | [x] |
| G-06 | Người hạng lệch quá phạm vi xin vào | Báo "Hạng của bạn không phù hợp" | [ ] |
| G-07 | Nhóm có đặt mức đúng hẹn tối thiểu 80%, người dưới 80% xin vào | Báo "Nhóm chỉ nhận người đúng hẹn từ 80%" | [ ] |
| G-08 | Thêm người khi nhóm đã đủ 6 | Báo "Nhóm đã đầy" | [ ] |
| G-09 | Bấm "Huỷ tham gia", rồi xác nhận | Báo "Đã huỷ tham gia nhóm". Huỷ sát giờ (dưới 2 giờ) thì bị tính là vắng | [ ] |
| G-10 | Ghép tự động: Minh, An, Bình cùng gửi yêu cầu cùng ngày, khung giờ và quãng đường | Hệ thống gom 3 người thành 1 nhóm, điểm hẹn là địa điểm có sẵn | [ ] |
| G-11 | Vào phòng chờ nhóm từ 30 phút trước giờ xuất phát | Bản đồ hiện từng thành viên đang tới điểm hẹn, cập nhật khoảng 8 giây một lần | [x] |
| G-12 | Tới trong vòng 50 m quanh điểm hẹn | Báo "Đã check-in tại điểm hội tụ ✓" | [x] |
| G-13 | Trước giờ chạy 2 tiếng mà chưa đủ 2 người xác nhận | Nhóm tự huỷ | [ ] |
| G-14 | Vắng mặt nhóm (cần tua giờ, xem [Mục 8](#8-kiểm-tra-dữ-liệu-backend)) | Độ đúng hẹn giảm, nhưng **vẫn lập và tham gia nhóm được** | [ ] |

> Test nhóm theo thời gian thực cần 2–3 điện thoại, hoặc tua giờ bằng `POST /admin/clock`. Khi chỉ cần quay demo, thường chỉ cần G-02, G-04, G-05 và G-11.

---

## 5. Cửa hàng (`quanfuji@demo.com`)

### 5.1 Tổng quan và menu

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| S-01 | Đăng nhập Fuji | Đầu màn: tên quán và nhãn "Đã duyệt". 3 ô: **100** voucher tạo, **47** lượt đã dùng, **150K** "ví phí khả dụng" | [x] |
| S-02 | Banner cam dưới 3 ô | "Còn 23 voucher chưa bán được · Ví phí đủ cho 50 / 73 voucher. Nạp thêm 69.000đ…", có dòng "Nạp ngay ›" | [x] |
| S-03 | Bấm banner hoặc ô ví phí | Mở màn Ví phí | [x] |
| S-04 | Thẻ "Hồ sơ quán · N%" | Hiện phần trăm hoàn thiện và gợi ý phần còn thiếu. Bấm vào mở Hồ sơ quán | [ ] |
| S-05 | Thẻ "Lượt dùng 7 ngày qua" | Biểu đồ cột 7 ngày. Dòng chú thích ghi phí **3.000đ**, trừ từ ví phí trả trước | [ ] |
| S-06 | "Đổi gần đây" | Mỗi dòng có tên voucher, tên khách, giờ và nhãn **-3.000đ** | [ ] |
| S-07 | Bấm nút bánh răng (menu) | Các dòng Hồ sơ quán / Ví phí / Voucher của tôi / Giao dịch on-chain / Đăng xuất **nằm ngang, có lề** | [x] |

### 5.2 Ví phí trả trước (quyết định #28)

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| F-01 | Mở Ví phí | Thẻ vàng hiện Khả dụng **150.000đ**, nhãn "Bán thêm 50", thanh xanh và cam, Đang tạm giữ 0đ, Đã trả phí 141.000đ | [x] |
| F-02 | Banner cảnh báo | "Còn 23 voucher chưa bán được… Nạp thêm 69.000đ để bán hết." | [x] |
| F-03 | Các mức nạp nhanh | 30.000đ = 10 voucher, 60.000đ = 20, 150.000đ = 50, 300.000đ = 100. Mức đang chọn có nền vàng | [x] |
| F-04 | Nút "Nạp đủ 69.000đ để bán hết 73 voucher" | Bấm vào thì nút chính đổi thành "Nạp 69.000đ" | [x] |
| F-05 | Bấm Nạp, rồi "Xác nhận nạp" | Báo "Đã nạp …". Khả dụng tăng đúng số đã nạp. Banner thiếu tiền biến mất nếu đã đủ. Lịch sử có dòng "Nạp tiền vào ví phí" | [x] |
| F-06 | Bấm "Xác nhận nạp" thật nhanh 2 lần | Chỉ nạp **1 lần** | [x] |
| F-07 | Minh mua 1 voucher Fuji (vt-1), rồi quán mở lại Ví phí | Tạm giữ **3.000đ**, Khả dụng giảm 3.000đ. Lịch sử có dòng "Tạm giữ phí" | [x] |
| F-08 | Quán quét QR voucher đó | Số dư giảm 3.000đ, Tạm giữ về 0. Lịch sử có dòng "Trừ phí lượt quét −3.000đ" | [x] |
| F-09 | Đăng nhập `juice@demo.com` (ví 0đ) | Ô ví phí màu đỏ, banner "Voucher đang tạm ngừng bán". Nạp 30.000đ thì người chạy mua được vt-6 trở lại | [ ] |
| F-10 | Voucher hết hạn chưa dùng, test bằng backend | Phí đang giữ được **trả lại**, lịch sử có dòng "Trả lại phí" (xem [Mục 8](#8-kiểm-tra-dữ-liệu-backend)) | [x] test tự động `store-fee.test.ts` |
| F-11 | Bấm icon (i) trên thanh tiêu đề | Hiện giải thích: giữ phí khi bán, trừ khi quét, trả lại khi hết hạn | [ ] |

### 5.3 Voucher của quán

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| S-20 | Mở "Voucher của tôi" | Danh sách voucher của quán: đã bán / đã dùng / còn, nhãn trạng thái ("Hết lượt" nếu bán hết) | [x] |
| S-21 | Bấm "Tạo" để mở màn Tạo voucher | Form có: Tiêu đề, Mô tả, Giá token, % giảm, Số lượng, Hạn (dd/mm/yyyy), Khu vực, nhiệm vụ "Chạy ngang quán" kèm % giảm, Hạng tối thiểu. Vé xem trước đổi theo từng thay đổi | [ ] |
| S-22 | Banner ví phí trong form | "Ví phí đủ cho N voucher bán ra". Nhập số lượng lớn hơn mức ví đủ thì banner chuyển cam: "Nạp thêm Xđ…" kèm "Nạp ›" | [ ] |
| S-23 | Bỏ trống tiêu đề, giá âm, hoặc hạn sai định dạng | Báo lỗi tiếng Việt. Hạn ở quá khứ thì báo "Hạn sử dụng phải ở tương lai" | [ ] |
| S-24 | Tạo voucher hợp lệ | Báo "Đã tạo voucher thành công". Người chạy thấy voucher mới ở tab Cửa hàng. Giao dịch on-chain có dòng "Tạo voucher" | [ ] |

### 5.4 Quét QR

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| S-30 | Bấm nút Quét QR, cho phép camera | Camera mở, có khung quét | [x] camera mở được |
| S-31 | Quét QR voucher Lan được tặng (sau R-51) | Sheet "Voucher hợp lệ · chưa sử dụng", phí nền tảng **3.000đ**. Bấm "Xác nhận dùng" thì hiện màn THÀNH CÔNG, dòng "Trừ từ ví phí −3.000đ" và nút Xem giao dịch | [x] |
| S-32 | Quét lại đúng mã đó | Báo "Voucher đã được sử dụng" | [x] |
| S-33 | Quét mã cũ của Minh (trước khi tặng) | Báo "QR không hợp lệ" | [ ] |
| S-34 | Quét voucher của quán khác | Báo "Voucher không thuộc cửa hàng này" | [ ] |
| S-35 | Bấm "Nhập mã thủ công", dán mã | Hoạt động giống quét camera | [x] |
| S-36 | Lan mở Kho đồ sau khi bị quét | Voucher có trạng thái "Đã sử dụng" | [x] |

### 5.5 Hồ sơ quán và giao dịch

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| S-40 | Mở Hồ sơ quán | Sửa được: tên, câu giới thiệu, giới thiệu chi tiết, giờ mở cửa, thẻ tag, món nổi bật (thêm và xoá), số điện thoại, ảnh bìa theo chủ đề, vị trí trên bản đồ | [ ] |
| S-41 | Bấm "Xem trước" | Thấy trang quán đúng như người chạy sẽ thấy | [ ] |
| S-42 | Bấm "Lưu hồ sơ" | Báo "Đã lưu hồ sơ quán". Người chạy mở trang quán thấy nội dung mới. Phần trăm hoàn thiện tăng | [ ] |
| S-43 | Mở Giao dịch on-chain | Có các dòng "Quét voucher «…» của …", "Tạo voucher", "Duyệt quán", mỗi dòng có link Snowtrace | [ ] |
| S-44 | Đăng nhập `newcafe@demo.com` (chưa duyệt) | Màn "Đang chờ duyệt" với 4 bước, nút "Kiểm tra lại" và "Hoàn thiện hồ sơ quán". Chưa tạo voucher được | [ ] |

---

## 6. Quản trị (`admin@demo.com`)

| Mã | Cách làm | Kết quả đúng | Đạt |
|---|---|---|---|
| AD-01 | Đăng nhập admin | Màn Điều hành có 3 mục: Duyệt cửa hàng, Quản lý mùa, Chuỗi Avalanche Fuji | [x] |
| AD-02 | Mở Duyệt cửa hàng | Danh sách quán chờ duyệt (New Café, Fresh Juice), có bản đồ vị trí quán | [x] |
| AD-03 | Bấm "Duyệt" New Café | Quán biến khỏi danh sách. `newcafe@demo.com` bấm "Kiểm tra lại" thì vào Tổng quan. Có giao dịch "Duyệt quán" trên chain | [x] |
| AD-04 | Bấm "Từ chối" một quán | Có hộp xác nhận, quán bị từ chối | [ ] |
| AD-05 | Mở Quản lý mùa | Mùa hiện tại, bậc thang hạng, phần thưởng nhiệm vụ, danh sách mùa trước | [x] |
| AD-06 | **Bước 8 của demo:** bấm "Đóng mùa & chạy reset", rồi xác nhận | Báo thành công, kèm nút Xem giao dịch. Mùa chuyển sang trạng thái đã đóng | [x] |
| AD-07 | Minh đăng nhập lại sau khi đóng mùa | 1.000 token còn **500**. Hạng Cao thủ xuống **Bạch kim** (tụt 2 bậc). Có màn kết quả mùa, bấm "Vào mùa mới". Huy hiệu mùa thêm 1 cúp | [x] |
| AD-08 | Lan (300 token trở xuống, hạng Đồng) sau khi đóng mùa | Hạng Đồng giữ 0 token. Ai đang dưới mức giữ của hạng thì giữ nguyên | [x] |
| AD-09 | Bấm đóng mùa lần nữa | Báo lỗi "Không có mùa đang chạy" | [x] test tự động `seasons-admin.test.ts` |
| AD-10 | Bấm "Mở mùa mới" | Mùa mới bắt đầu | [x] |
| AD-11 | Mở Chuỗi Avalanche Fuji | 50 giao dịch gần nhất của cả hệ thống, có nhãn kèm tên người. Lúc đóng mùa chỉ có **khoảng 4 giao dịch** (chốt token theo lô, ghi huy hiệu theo lô, đóng mùa, mở mùa) | [x] |

---

## 7. Blockchain (Avalanche Fuji)

| Mã | Kiểm tra | Kết quả đúng | Đạt |
|---|---|---|---|
| B-01 | Mở 3 hợp đồng trên Snowtrace (link trong `README.md`) | Có dấu tick xanh "Contract Source Code Verified" | [x] kiểm qua API Routescan lúc deploy |
| B-02 | Giao dịch thưởng nhiệm vụ (R-14) | Snowtrace hiện lời gọi `reward`, token RUN được mint vào ví người chạy | [x] giao dịch mint đã xác nhận, chain:check khớp |
| B-03 | Giao dịch mua voucher (R-36) | Lời gọi `purchase`: token RUN bị đốt, voucher ERC-1155 vào ví | [x] giao dịch mua đã xác nhận |
| B-04 | Giao dịch quét voucher (S-31) | Sự kiện `VoucherRedeemed` có `feeVnd = 3000` | [ ] |
| B-05 | Đóng mùa (AD-06) | Một giao dịch `settleSeason` cho nhiều ví, và một giao dịch `recordBadges` | [x] chốt mùa 1 lô + huy hiệu 1 lô |
| B-06 | `pnpm chain:check` sau khi test xong | ✓ hoặc ~ (lệch nhiều nhất 1 token do làm tròn giá giảm). Không có ✗ | [x] |
| B-07 | Thử chuyển token RUN giữa hai ví (nếu muốn) | Bị từ chối, vì token không chuyển được | [ ] |

---

## 8. Kiểm tra dữ liệu backend

Chạy trên máy tính, trong thư mục `kilomeet-api`.

```bash
# Kiểm thử tự động: phải là 188/188 xanh
pnpm typecheck && pnpm test
cd ../blockchain && npm test          # 24 test hợp đồng
cd ../kilomeet-app && pnpm exec tsc --noEmit

# Xem các buổi chạy điện thoại gửi lên (R-24)
docker exec kilomeet-db psql -U kilomeet -d kilomeet -c "select u.email, r.started_at, round(r.distance_km::numeric,2) km, jsonb_array_length(r.route) so_diem_gps from runs r join users u on u.id=r.user_id order by r.started_at desc limit 5"

# Xem vị trí chạy nhóm (G-11)
docker exec kilomeet-db psql -U kilomeet -d kilomeet -c "select u.email, l.lat, l.lng, l.updated_at from group_locations l join users u on u.id=l.user_id order by l.updated_at desc"

# Xem sổ ví phí của quán (F-07, F-08, F-10)
docker exec kilomeet-db psql -U kilomeet -d kilomeet -c "select kind, amount_vnd, balance_delta, held_delta, ref, created_at from store_fee_entries where store_id='store-fuji' order by created_at desc limit 10"

# Lệnh chain đang chờ / lỗi
docker exec kilomeet-db psql -U kilomeet -d kilomeet -c "select status, count(*) from chain_outbox group by status"
```

Tua giờ để test hết hạn voucher hoặc lịch nhóm. Lấy token admin bằng `POST /auth/login` trước:

```bash
curl -X POST http://localhost:3000/admin/clock -H "authorization: Bearer <token admin>" -H 'content-type: application/json' -d '{"now":"2027-01-20T03:00:00Z"}'
curl -X POST http://localhost:3000/admin/run-fee-release -H "authorization: Bearer <token admin>"      # trả lại phí voucher hết hạn
curl -X POST http://localhost:3000/admin/run-group-timeline -H "authorization: Bearer <token admin>"   # chạy mốc nhóm
curl -X POST http://localhost:3000/admin/clock -H "authorization: Bearer <token admin>" -H 'content-type: application/json' -d '{"offsetMs":0}'   # trả giờ về thật
```

| Mã | Kiểm tra | Kết quả đúng | Đạt |
|---|---|---|---|
| BE-01 | Test tự động | 188 test backend, 24 test hợp đồng, typecheck sạch | [x] |
| BE-02 | Gọi URL không tồn tại, ví dụ `/abc` | JSON `{"success":false,"message":"…"}` bằng tiếng Việt | [x] test tự động `envelope.test.ts` |
| BE-03 | Gọi API không kèm token | `"Vui lòng đăng nhập lại"` | [x] test tự động `auth.test.ts` |
| BE-04 | Bấm "Dừng & lưu" 2 lần liên tiếp | Không được thưởng token 2 lần | [x] test tự động `runs-quests.test.ts` |
| BE-05 | Hai máy mua cùng lúc voucher chỉ còn 1 | Đúng 1 máy mua được | [x] test tự động `vouchers-store.test.ts` |

---

## 9. Chạy thử kịch bản demo 3 phút (trước khi quay)

Chạy `pnpm demo:reset`, chờ 1 phút, rồi đi một lượt liền mạch. Bấm giờ, mục tiêu là **≤ 3 phút**.

| Bước | Tài khoản | Thao tác | Điều cần thấy trên màn hình | Đạt |
|---|---|---|---|---|
| 1 | Lan | Đăng nhập, mở Hồ sơ → Ví & giao dịch | Có ví Avalanche và link Snowtrace | [ ] |
| 2 | Lan | Chạy → demo "3 km (không qua quán)" | Nhiệm vụ ngày đạt, **+10 RUN**, xem giao dịch | [x] |
| 3 | Minh | Đăng nhập, Sảnh | Hạng Cao thủ, km còn thiếu để giữ hạng | [x] |
| 4 | Minh | Chạy demo "5 km ngang Fuji + Highlands", chọn Fuji, mở vt-1 | Giá 500 thành **250** | [x] |
| 5 | Minh | Mua, rồi tặng cho `lan@demo.com` | Token bị trừ 250. Báo đã tặng, kèm Xem giao dịch | [x] |
| 6 | Fuji | Quét QR trên máy Lan | THÀNH CÔNG, trừ 3.000đ từ ví phí. Mở **Ví phí** để thấy dòng tạm giữ và dòng trừ | [x] |
| 7 | Minh / An / Bình | Ghép nhóm, mở phòng chờ | Bản đồ hiện từng người đang tới điểm hẹn | [x] |
| 8 | Admin | Đóng mùa | Minh 1.000 → **500 token**, xuống Bạch kim, nhận huy hiệu NFT | [x] |

---

## Kết quả test tự động trên Samsung S23+ (18/11/2026, 23:00–23:45)

Claude điều khiển máy qua `adb` (chụp màn hình, bấm, gõ). Các mục đã tick ở trên là đã chạy đạt. Kịch bản demo bước 2–8 đạt; bước 1 (ví của Lan) chưa mở riêng. Lỗi tìm thấy và đã sửa:

| Mã | Lỗi | Sửa |
|---|---|---|
| UI-02 | Android cắt chữ cuối với chữ có dấu ạ/ồ/ữ… và font Lilita/Nunito Black ("ĐỒN", "1.06", "Tạm giữ") | `GText` thêm dấu cách không ngắt ở cuối (`components/game/primitives.tsx`) |
| UI-04 | Nút dùng style hàm mất toàn bộ style trên Android | `components/game/Press.tsx` |
| UI-05/06 | Nút tròn giữa thanh tab lệch trái / che nhãn; nội dung lọt dưới thanh tab; nhãn "CỬA HÀ…" | `TabBar.tsx` |
| UI-07 | Bản đồ khi đang chạy mất kiểu hoạt hình; hẻm nhỏ rối | `GameMap.tsx`, `GAME_MAP_STYLE` |
| R-13 | Tốc độ hiện 5'60" | làm tròn tổng giây (`lib/format.ts`, `run.tsx`) |
| R-14 | **Sau demo:reset, thưởng nhiệm vụ không mint trên chain** (khoá thưởng trùng toàn cục) → chain lệch DB | khoá thưởng gắn ví (`kilomeet-api/src/lib/ledger.ts`) |
| R-36 | Vé sau khi mua hiện 500 thay vì 250 | `voucher/[id].tsx` |
| S-35 | Bàn phím che ô nhập mã QR / email tặng | `GameSheet` dùng `padding` cả Android |
| F-06 | Bấm nạp 2 lần → lần 2 báo "Lỗi máy chủ" | BE bắt trùng `requestId`, app chặn bấm 2 lần |
| S-01/AD-01 | Tổng quan quán / admin không cập nhật sau khi quét / duyệt | tải lại khi quay về màn |
| AD-06 | Hộp thoại đóng mùa tràn màn hình | `GameDialog` chừa vùng an toàn + cuộn |
| AD-07 | Màn "Mùa giải kết thúc" không tự hiện | Sảnh mở 1 lần khi có huy hiệu mùa mới |
| — | Nhiều chỗ tràn/cắt chữ: thẻ ví phí, bảng hạng admin, vé voucher quán, nút "Xác nhậ…", "Đăng ký ngay", số ngày còn lại lệch 43/44 | sửa từng màn |

Chưa test trên máy: đăng ký tài khoản mới (A-05–A-08), tạo voucher (S-21–S-24), hồ sơ quán (S-40–S-42), ghép tự động (G-10), huỷ nhóm (G-09), hết hạn voucher trả phí (F-10, đã có test tự động), GPS thật ngoài đường (R-18–R-23).

## Sổ lỗi

Ghi mỗi lỗi một dòng, kèm ảnh chụp màn hình nếu có.

| Mã test | Máy (Android / iOS) | Mô tả lỗi | Ảnh | Mức độ (chặn demo / xấu / nhỏ) | Đã sửa |
|---|---|---|---|---|---|
| | | | | | [ ] |
| | | | | | [ ] |
| | | | | | [ ] |
