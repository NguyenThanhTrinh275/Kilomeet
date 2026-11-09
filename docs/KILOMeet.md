# KILOMeet: ứng dụng chạy bộ theo mùa trên Avalanche (UniHack 2026)

Nov 8, 2026 · @Trinh

**KILOMeet** là app chạy bộ theo mùa, mỗi mùa 4 tháng. Người chạy làm nhiệm vụ để nhận token và leo hạng, rồi dùng token mua voucher của cửa hàng đối tác. Cửa hàng trả phí mỗi khi voucher được dùng; Hội viên trả phí để được ghép nhóm chạy chung.

## Bức tranh tổng thể

&#91;embedded content: Các bên và dòng giKILOMeetá trị · 4 bên, 6 luồng\]

Token và voucher nằm trên Avalanche; GPS, nhiệm vụ, hạng và ghép nhóm chạy trên máy chủ.

## Một mùa chạy diễn ra thế nào

Mỗi năm có 3 mùa chạy, mỗi mùa 4 tháng: tháng 1–4, tháng 5–8 và tháng 9–12. Một mùa đi qua 7 bước:

1. **Đầu mùa:** mọi người bắt đầu với token và hạng còn lại sau reset mùa trước. Người mới có 0 token, hạng Đồng.
2. **Chạy mỗi ngày, mỗi tuần:** hệ thống giao nhiệm vụ; hoàn thành thì nhận token.
3. **Leo hạng:** mỗi tuần lên tối đa 1 hạng theo số km; chạy đủ 3 tuần liền thì được lên nhanh; tuần nào chạy thiếu thì tụt 1 hạng.
4. **Mua voucher:** dùng token mua voucher; làm nhiệm vụ riêng của voucher thì được giảm giá. Voucher đã mua có thể tặng một lần.
5. **Dùng voucher:** mua hàng tại quầy, cửa hàng quét QR và trả phí cho nền tảng.
6. **Chạy nhóm (Hội viên):** hệ thống ghép những người gần nhau, hẹn ở điểm hội tụ để chạy chung.
7. **Cuối mùa:** hạng tụt 2 bậc; token giữ lại tùy hạng lúc hết mùa, từ 0 (Đồng) đến 500 (Cao thủ). Voucher đã mua vẫn giữ.

## Kiếm token

Token chỉ kiếm được từ nhiệm vụ hệ thống giao, chỉ dùng để mua voucher, và không chuyển được giữa người chạy.

| Nhiệm vụ | Yêu cầu | Thưởng |
| --- | --- | --- |
| Ngày | Chạy ít nhất 2 km | 10 token |
| Tuần | Mức vừa sức từng người: trung bình 4 tuần gần nhất cộng 10%, ví dụ 15 km | 7 token mỗi km của nhiệm vụ, ví dụ 105 token |

Chạy nhóm vẫn được tính km vào nhiệm vụ như chạy một mình. Chạy nhóm hay làm nhiệm vụ voucher đều không cho thêm token.

## Hạng

Hạng phản ánh mỗi tuần một người đang chạy bao nhiêu km. Hạng lên từ từ, mỗi tuần tối đa 1 bậc; chỉ người chạy đều 3 tuần liền mới được lên nhanh. Hạng càng cao thì hết mùa giữ lại được càng nhiều token. Hệ thống cũng dùng hạng để ghép nhóm chạy, còn cửa hàng dùng hạng để chọn người nhận voucher.

| Hạng | Km mỗi tuần cần đạt | Token giữ lại tối đa khi hết mùa |
| --- | --- | --- |
| Đồng | Không yêu cầu | 0 |
| Bạc | 5 km | 100 |
| Vàng | 10 km | 200 |
| Bạch kim | 15 km | 300 |
| Kim cương | 25 km | 400 |
| Cao thủ | 40 km | 500 |

- **Mức tuần:** Chủ nhật 23:59, hệ thống xem số km tuần đó đạt tới hạng nào trong bảng.
- **Lên từ từ:** mức tuần cao hơn hạng hiện tại thì lên 1 bậc.
- **Lên nhanh:** 3 tuần liên tiếp đều đạt từ một mức trở lên thì lên thẳng mức thấp nhất trong 3 tuần đó.
- **Giữ hạng:** mức tuần bằng hạng hiện tại thì giữ nguyên.
- **Tụt hạng:** mức tuần thấp hơn hạng hiện tại thì tụt 1 bậc. Mỗi mùa được miễn kiểm tra 1 tuần.
- **Cuối mùa:** mỗi người giữ lại số token tối đa theo hạng lúc hết mùa (bảng trên), phần vượt bị xóa; sau đó hạng tụt 2 bậc (thấp nhất là Đồng). Luật này áp dụng như nhau cho cả Hội viên. Voucher đã mua giữ nguyên. App nhắc tiêu token 7 ngày trước khi hết mùa.
- **Huy hiệu mùa** ghi lại hạng cao nhất của mỗi mùa, nên thành tích không mất khi reset.

Ví dụ: Lan đang hạng Đồng.

| Tuần | Km chạy | Kết quả |
| --- | --- | --- |
| 1 | 42 km | Lên Bạc (mỗi tuần tối đa 1 bậc) |
| 2 | 45 km | Lên Vàng |
| 3 | 41 km | 3 tuần liền đạt 40 km: lên thẳng Cao thủ |
| 3, nếu chỉ chạy 20 km | 20 km | Mức thấp nhất 3 tuần là Bạch kim: lên Bạch kim |
| 3, nếu chỉ chạy 12 km | 12 km | Đạt đúng mức Vàng: giữ Vàng |
| 3, nếu chỉ chạy 7 km | 7 km | Dưới mức Vàng: tụt về Bạc |

Cuối mùa, nếu Lan đang Cao thủ với 1.000 token thì mùa mới còn Bạch kim và 500 token. Nếu Lan chỉ có 300 token thì giữ nguyên 300.

## Voucher

Mỗi voucher có một giá gốc bằng token. Cửa hàng có thể gắn thêm một nhiệm vụ riêng; ai làm xong thì được giảm giá voucher đó theo mức cửa hàng đặt, không làm thì mua bằng giá gốc. Ví dụ: voucher giảm 20% tiền nước có giá gốc 500 token; nhiệm vụ “chạy ngang qua quán” giảm 50%, nên ai làm xong chỉ trả 250 token.

| Nhiệm vụ voucher | Cách app xác minh |
| --- | --- |
| Chạy ngang qua quán | Đường chạy đi qua một điểm cách quán dưới 50 m, không cần ghé vào quán |

App tự kiểm tra bằng GPS, cửa hàng không phải làm gì. **Mỗi buổi chạy chỉ nhận một lượt giảm giá:** nếu chạy ngang qua nhiều quán, lúc kết thúc buổi chạy app hiện danh sách các quán đã đi qua và người chạy chọn đúng một quán để nhận giảm giá cho voucher của quán đó.

**Vòng đời một voucher**

1. **Đang bán:** cửa hàng đặt giá gốc, nhiệm vụ và mức giảm (nếu có), số lượng, hạn dùng, hạng tối thiểu và khu vực.
2. **Đã mua:** token bị đốt, voucher vào ví. Mỗi người được giảm giá một lần cho mỗi voucher, trong 7 ngày sau khi làm xong nhiệm vụ.
3. **Được tặng (nếu muốn):** tặng một lần cho người chạy khác, giữ nguyên hạn dùng. Điều kiện hạng và khu vực chỉ xét lúc mua.
4. **Đã dùng:** cửa hàng quét QR tại quầy, voucher bị đốt, phí 5.000 đồng được ghi nhận.
5. **Hết hạn:** người giữ voucher tự chịu, không hoàn token.

## Nhóm chạy cho Hội viên

Chỉ Hội viên được chạy nhóm. Giờ xuất phát luôn là mốc cố định do app đưa ra, nên cả nhóm cùng thấy một giờ mà không phải tự hẹn.

**Vào nhóm**

- **Tự lập nhóm:** chọn giờ xuất phát, điểm hội tụ, quãng đường và phạm vi hạng. App mời các hội viên phù hợp ở gần, tối đa 6 người.
- **Ghép tự động:** chọn ngày, một hoặc vài giờ xuất phát, quãng đường và phạm vi hạng. Hệ thống gom 3–6 người trong bán kính khoảng 3 km, trùng giờ xuất phát, rồi chọn điểm hội tụ có sẵn (công viên, cửa hàng đối tác) ở giữa nhóm.
- **Phạm vi hạng:** cùng hạng, chênh tối đa 1 hạng, chênh tối đa 2 hạng, hoặc mọi hạng. Hai người chỉ vào chung nhóm khi hạng của mỗi người nằm trong phạm vi người kia chọn. Có thể lọc thêm tốc độ gần nhau.

**Giờ hẹn:** giờ xuất phát cách nhau 30 phút, sáng 5:00–7:00 và tối 17:00–20:00.

| Thời điểm | Việc xảy ra |
| --- | --- |
| Trước 2 tiếng | Hạn xác nhận tham gia; dưới 2 người xác nhận thì nhóm bị hủy. Hủy trước mốc này không bị tính vắng |
| Trước 1 tiếng | Nhắc lần 1, kèm thời gian cần để tới điểm hội tụ |
| Trước 30 phút | Bật chia sẻ vị trí; bản đồ hiện từng người và giờ dự kiến tới |
| Trước 10 phút | Nhắc lần 2 cho ai chưa di chuyển |
| Giờ xuất phát | Ai trong bán kính 50 m quanh điểm hội tụ được đánh dấu “đã tới”; nhóm chờ thêm tối đa 10 phút |
| Sau 10 phút | Nhóm bắt đầu. Người tới muộn vẫn chạy và được tính km nhưng không có huy hiệu chạy chung; ai không tới bị ghi vắng |

**Sau buổi chạy:** ai chạy hết vòng cùng nhóm nhận huy hiệu “chạy chung”. Vị trí ngừng chia sẻ ngay khi buổi chạy kết thúc.

**Độ đúng hẹn:** hồ sơ mỗi hội viên hiện tỷ lệ đúng hẹn. Vắng 2 lần không báo trong một mùa thì bị khóa tìm nhóm 1 tuần. Người tự lập nhóm có thể chỉ nhận người đúng hẹn từ 80% trở lên.

## Ai trả tiền

Cửa hàng là nguồn thu chính, Hội viên là nguồn phụ. Người chạy miễn phí dùng đủ mọi chức năng khác.

| Ai trả | Trả gì (giả định) | Vì sao chịu trả |
| --- | --- | --- |
| Cửa hàng | 5.000 đồng mỗi lượt voucher được dùng tại quầy; tự chịu phần giảm giá | Chỉ trả khi có khách thật; nhiệm vụ voucher kéo khách tới quán; voucher đến đúng hạng và khu vực họ chọn |
| Hội viên | 39.000 đồng/tháng | Được ghép nhóm chạy chung gần nhà |

Gói Hội viên chỉ mở thêm chức năng tìm nhóm và chạy theo nhóm; token, hạng, voucher và luật cuối mùa giống hệt người dùng miễn phí. Voucher đã mua mà không dùng thì cửa hàng không phải trả phí.

## Chức năng theo vai trò

Có 4 vai trò và phần hệ thống tự làm. Cột MVP cho biết việc nào phải có trong 12 ngày.

| Vai trò | Chức năng | MVP |
| --- | --- | --- |
| Người chạy | Đăng ký bằng email, ví tự tạo, đồng ý chia sẻ vị trí | Bắt buộc |
| Người chạy | Ghi buổi chạy bằng GPS, xem lịch sử | Bắt buộc |
| Người chạy | Xem và hoàn thành nhiệm vụ ngày, tuần | Bắt buộc |
| Người chạy | Xem token, hạng, km tuần này, km còn thiếu để giữ hạng, số ngày còn lại của mùa | Bắt buộc |
| Người chạy | Xem voucher gần mình, làm nhiệm vụ voucher, mua, hiện QR | Bắt buộc |
| Người chạy | Tặng voucher đã mua cho người chạy khác | Bắt buộc |
| Người chạy | Bảng xếp hạng khu vực; thông báo nhiệm vụ mới, sắp hết mùa | Nên có |
| Hội viên | Đăng ký gói (thanh toán giả lập) | Bắt buộc |
| Hội viên | Tự lập nhóm hoặc ghép tự động, xác nhận, xem vị trí thành viên, chạy chung | Bắt buộc |
| Hội viên | Kết bạn sau buổi chạy | Sau MVP |
| Cửa hàng | Đăng ký và chờ duyệt | Bắt buộc |
| Cửa hàng | Tạo voucher: giá gốc, nhiệm vụ và mức giảm (nếu có), điều kiện | Bắt buộc |
| Cửa hàng | Quét QR voucher của khách tại quầy | Bắt buộc |
| Cửa hàng | Xem số lượt dùng, phí phải trả | Nên có |
| Quản trị | Duyệt cửa hàng; mở, đóng mùa và chạy reset | Bắt buộc |
| Quản trị | Cấu hình mức nhiệm vụ và mốc hạng | Nên có |
| Tự động | Giao, chấm nhiệm vụ, phát token | Bắt buộc |
| Tự động | Xếp hạng theo km mỗi tuần (lên từ từ, lên nhanh, tụt hạng), reset cuối mùa | Bắt buộc |
| Tự động | Xác minh nhiệm vụ voucher (đường chạy đi qua quán trong 50 m), cho chọn một quán sau mỗi buổi | Bắt buộc |
| Tự động | Ghép nhóm, chọn điểm hội tụ, nhắc giờ hẹn, tính độ đúng hẹn | Bắt buộc |
| Tự động | Ghi lượt dùng voucher và tính phí | Bắt buộc |

## Hệ thống và Avalanche

Máy chủ lo GPS, nhiệm vụ, hạng, ghép nhóm và vị trí trực tiếp. Token và voucher nằm trên C-Chain, vì đây là nơi quyền lợi của người chạy, cửa hàng và nền tảng gặp nhau.

| Hợp đồng | Chuẩn | Vai trò | MVP |
| --- | --- | --- | --- |
| RunToken | ERC-20 | Phát khi nhiệm vụ đạt, đốt khi mua voucher, chốt mùa giữ lại số dư tối đa theo hạng; không chuyển được giữa người dùng | Bắt buộc |
| Voucher | ERC-1155 | Cửa hàng tạo loại voucher (giá gốc, mức giảm, số lượng); mua bằng cách đốt token; tặng được một lần; quét QR thì voucher bị đốt, sự kiện này là căn cứ tính phí | Bắt buộc |
| Huy hiệu mùa | NFT không chuyển được | Ghi hạng cao nhất mỗi mùa | Nên có |

Chuỗi giúp các bên không cần tin nhau: voucher không bán quá số lượng và không dùng hai lần, cửa hàng tự đối chiếu số lượt dùng trước khi trả phí, và reset mùa công khai cho tất cả. Trên Fuji, hệ thống chuyển một ít AVAX thử nghiệm vào mỗi ví mới để trả gas.

## Kịch bản demo 3 phút

Demo đi hết một mùa thu nhỏ. Bước nào có giao dịch thì mở Snowtrace cho giám khảo xem.

1. Đăng nhập bằng email, ví hiện ra ngay.
2. Phát một buổi chạy 3 km ghi sẵn: nhiệm vụ ngày đạt, nhận 10 token, km tuần được ghi nhận.
3. Mở tài khoản Cao thủ dựng sẵn để khoe hạng và số km còn thiếu để giữ hạng.
4. Mở voucher của một quán gần HCMUT, giá gốc 500 token. Phát buổi chạy 5 km đi ngang qua hai quán; kết thúc, chọn quán này: voucher còn 250 token.
5. Mua voucher rồi tặng cho tài khoản thứ hai.
6. Web cửa hàng quét QR của tài khoản thứ hai: voucher bị đốt, phí 5.000 đồng được ghi nhận.
7. Bật gói Hội viên, ghép nhóm: 3 tài khoản gần nhau, bản đồ hiện từng người đang tới điểm hội tụ.
8. Quản trị bấm “đóng mùa”: tài khoản Cao thủ 1.000 token còn 500 token, hạng Bạch kim.

Chuẩn bị sẵn các buổi chạy ghi trước, 3–4 tài khoản trên 3 điện thoại, và một video quay lại toàn bộ phòng khi mạng lỗi.
