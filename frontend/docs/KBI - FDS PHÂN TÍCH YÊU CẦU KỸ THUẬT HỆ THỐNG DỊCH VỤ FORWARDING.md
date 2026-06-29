**BẢNG MÔ TẢ YÊU CẦU KỸ THUẬT**

**DỊCH VỤ FORWARDING HÀNG NHẬP KHẨU — HỆ THỐNG THEO DÕI VẬN CHUYỂN & TÍCH HỢP SAP BUSINESS ONE**

# 1. Mục đích và căn cứ

Tài liệu này mô tả các yêu cầu nghiệp vụ và kỹ thuật mà Nhà cung cấp dịch vụ forwarder (sau đây gọi là “FDS” / “NCC”) cần đáp ứng khi cung cấp dịch vụ vận chuyển hàng nhập khẩu cho Kim Bình (sau đây gọi là “KBI”). Tài liệu được lập trên cơ sở:

* Tài liệu đề xuất của FDS trình bày cho KBI (KimBinh\_FDS — Triển khai hệ thống quản lý chuỗi cung ứng - sản xuất, 3 giai đoạn);
* Kết quả phân tích của Phòng IT KBI ngày 26/05/2026 (Phân tích đề nghị từ FDS) — đối chiếu từng hạng mục đề xuất với hiện trạng SAP Business One và hệ thống WMS QR Code nội bộ;
* Các yêu cầu nghiệp vụ chi tiết của Phòng Mua hàng (P.MH), Phòng Kho vận (P.KV) và Phòng Tài chính Kế toán (P.TCKT).

So với đề xuất 3 giai đoạn ban đầu của FDS, tài liệu này thu gọn phạm vi để tập trung vào phần KBI thực sự cần và tránh để FDS tốn công xây dựng những phần KBI đã vận hành ổn định. Đây là cơ sở để hai bên thống nhất phạm vi và phương án kỹ thuật trước khi bắt tay triển khai.

# 2. Phạm vi hợp tác

## 2.1. Nguyên tắc xác định phạm vi

Phạm vi yêu cầu trong tài liệu này được xác định trên cơ sở đối chiếu từng hạng mục trong đề xuất 3 giai đoạn của FDS với hiện trạng vận hành thực tế trên SAP Business One và hệ thống WMS QR Code nội bộ của KBI (kết quả phân tích của Phòng IT KBI ngày 26/05/2026). Nguyên tắc:

* Hạng mục SAP B1 / WMS nội bộ đã đáp ứng hoặc vượt yêu cầu → KBI không cần hỗ trợ thêm, để FDS không phải dành nguồn lực xây dựng lại.
* Hạng mục là gap thực sự của KBI → đưa vào phạm vi yêu cầu FDS thực hiện, chi tiết hóa tại các mục 3–6.
* Một số hạng mục ngoài phạm vi xây dựng nhưng phát sinh yêu cầu cung cấp dữ liệu từ FDS — được ghi chú rõ tại cột Kết luận và quy định kỹ thuật tại mục 5.

## 2.2. Bảng đối chiếu chi tiết đề xuất của FDS

### 2.2.1. Giai đoạn 1 — Quản lý quy trình mua hàng (Procurement)

| **Hạng mục FDS đề xuất** | **Hiện trạng tại KBI (SAP B1 / WMS QR nội bộ)** | **Kết luận** |
| --- | --- | --- |
| Tạo PR thủ công / template; duyệt đa cấp theo giá trị & phòng ban.  Convert PR → PO (tách cho nhiều NCC).  Quản lý lifecycle PR: Draft → Approved → Converted. | KBI không tạo PR thủ công. Toàn bộ PR được sinh tự động từ MRP (Manufacturing Planning) trong SAP B1 dựa trên nhu cầu sản xuất thực tế. PR sau đó được kế thừa trực tiếp lên PO trong SAP — không qua Excel hay Email. | **✘ Không cần FDS hỗ trợ** |
| Quản lý PO với versioning khi revise sau khi đã gửi NCC.  Phân loại PO theo mode: SEA / AIR / Domestic.  Link ngược PO Lines về PR Lines để trace dữ liệu. | PO trong SAP B1 đầy đủ thông tin header (NCC, Incoterm, payment term); khi kế thừa từ PR sang PO, toàn bộ dữ liệu lines được link sang PO.  SAP B1 lưu đầy đủ Change Log trên tất cả chứng từ (PO, PR, SO, GRN, Invoice...): ai sửa, sửa trường nào, giá trị trước/sau, thời điểm sửa → trace được lịch sử thay đổi PO mà không cần cơ chế versioning riêng. | **✘ Không cần FDS hỗ trợ** |
| Hạn chế theo dõi rời rạc qua Excel/Email.  Relationship Map trace ngược toàn bộ chứng từ.  Báo cáo PR approval theo phòng ban, PO delivery performance. | Relationship Map của SAP B1 trace ngược PR → PO → GRN → A/P Invoice trực quan. Các báo cáo chuẩn Purchase Analysis và Open PO Report có sẵn — KBI đang sử dụng đầy đủ. | **✘ Không cần FDS hỗ trợ** |

### 2.2.2. Giai đoạn 1 — Theo dõi vận chuyển & nhập khẩu (Import & Shipment)

| **Hạng mục FDS đề xuất** | **Hiện trạng tại KBI (SAP B1 / WMS QR nội bộ)** | **Kết luận** |
| --- | --- | --- |
| Quản lý 10 milestones từ Booking → Nhập kho (Booking confirmed, Cargo ready, Pick-up, B/L issued, Gate-in POL, ATD, Customs Draft, ATA/AN, Customs Cleared, EDO & Delivery).  Gắn document (Invoice, B/L, C/O, Tờ khai) vào từng milestone. | SAP B1 không có module Shipment Tracking tích hợp — nhận định của FDS đúng. KBI hiện chưa có công cụ theo dõi 10 milestones trong SAP. Đây là gap thực sự cần giải quyết. | **✔ Cần FDS hỗ trợ**  Chi tiết yêu cầu: mục 3.1–3.2. |
| Khai báo hải quan, phân luồng (Xanh/Vàng/Đỏ).  SOP 5 stage với SLA timer theo giờ làm việc: Báo giá → Chứng từ → Hải quan → Giao hàng → Quyết toán.  Auto-confirm và enforce timer theo SOP. | SAP B1 không có SLA timer tích hợp cho quy trình logistics. KBI chưa có cơ chế cảnh báo tự động khi milestone trễ — nhận định của FDS đúng với phần này. | **✔ Cần FDS hỗ trợ**  Chi tiết yêu cầu và định mức SLA: mục 3.3. |
| Landed cost per PO line: phân bổ cước vận chuyển, thuế, local charges theo số lượng / trọng lượng / giá trị.  Cost tracking: freight + thuế + local charges + demurrage theo từng shipment. | KBI đang sử dụng tính năng Landed Costs chuẩn của SAP B1 — phân bổ chi phí nhập khẩu theo số lượng, trọng lượng hoặc giá trị về từng PO line. Đây là điểm mạnh của SAP B1 mà KBI đã khai thác tốt. | **✘ Không cần FDS xây dựng**  KBI cần FDS cung cấp dữ liệu chi phí chi tiết theo shipment (đối tượng Charge — mục 5.5) làm đầu vào cho Landed Costs trong B1. |

### 2.2.3. Giai đoạn 2 — Quản lý kho (Warehouse Management)

| **Hạng mục FDS đề xuất** | **Hiện trạng tại KBI (SAP B1 / WMS QR nội bộ)** | **Kết luận** |
| --- | --- | --- |
| Cấu trúc vị trí kho 6 cấp: Warehouse → Zone → Aisle → Rack → Shelf → Bin.  Inbound/Putaway: scan barcode, gắn lot/serial/expiry, QC quarantine, GRN tự động.  Outbound/Picking: FIFO/FEFO/LIFO theo wave/batch, Packing + GIN. | KBI đã xây dựng WMS nội bộ sử dụng QR Code, tích hợp API với SAP B1: toàn bộ hàng hóa dán nhãn QR; mọi giao dịch nhập/xuất/điều chuyển bắt buộc quét mã — không cho phép thủ công; tự động đẩy chứng từ GRPO/Delivery/Transfer về SAP B1.  → Vượt so với yêu cầu FDS đề xuất. | **✘ Không cần FDS hỗ trợ** |
| Tồn kho real-time: on-hand / allocated / available / in-transit.  Inventory Ops: Adjustment có duyệt, Cycle count theo ABC, Stocktake toàn phần. | SAP B1 cung cấp tồn kho real-time đầy đủ (In Stock, Committed, Ordered, Available). WMS QR của KBI bổ sung: kiểm tra tồn khả dụng ngay trên giao diện QR; Available = On-hand − Committed − Reserved (Delivery Draft) → tránh xuất trùng khi nhiều lệnh chạy đồng thời.  → Logic vượt trội so với ATP chuẩn của SAP B1. | **✘ Không cần FDS hỗ trợ** |
| BOM Availability Check tức thì: On-hand − Allocated + In-transit (PO/Shipment) → bảng NVL: Required / Available / Shortage / Earliest available date. | SAP B1 có Available to Promise (ATP) kiểm tra khả dụng linh kiện. Tuy nhiên In-transit (PO đã confirm chưa về kho) không tự động tính vào Available — cần cấu hình thêm Scheduled Receipts trong MRP. KBI tự xử lý phần cấu hình này. | **✘ Không cần FDS xây dựng**  Phát sinh yêu cầu dữ liệu: FDS cung cấp số lượng in-transit theo PO line kèm ETA hiện hành (ShipmentLine — mục 5.5, endpoint /in-transit) để KBI nạp Scheduled Receipts. |

### 2.2.4. Giai đoạn 3 — Kế hoạch sản xuất (Production Planning)

| **Hạng mục FDS đề xuất** | **Hiện trạng tại KBI (SAP B1 / WMS QR nội bộ)** | **Kết luận** |
| --- | --- | --- |
| MRP Engine đầy đủ: net requirement = Gross − On-hand − Scheduled receipts; time-phased bucket; pegging MO → NVL → PR/PO.  BOM đa cấp, versioning theo ngày. Item planning data: lead\_time, safety\_stock, reorder\_point, MOQ. | KBI đang sử dụng MRP Wizard của SAP B1 — tính net requirement, tạo recommend PR/PO/MO dựa trên BOM đa cấp. Item Planning Data (Lead Time, Safety Stock, Reorder Point, MOQ) đã được cấu hình. Pegging chi tiết MO → PO cụ thể còn hạn chế trong B1 — KBI chấp nhận hiện trạng. | **✘ Không cần FDS hỗ trợ** |
| Lead-time backward planning: tính ngược từ MO due-date → Latest Order Date, gồm Supplier LT + Transit (SEA 25–45d / AIR 3–7d) + Customs + Buffer.  Cảnh báo tự động khi latest\_order\_date < hôm nay → đề xuất đổi mode SEA→AIR hoặc dời MO. | SAP B1 MRP tính lead time theo chiều xuôi (hôm nay + LT); backward planning từ MO due-date bao gồm transit mode và customs không có sẵn trong B1. KBI tự xử lý trên nền SAP B1 bằng dữ liệu lead time do FDS cung cấp. | **✘ Không cần FDS xây dựng**  Phát sinh yêu cầu dữ liệu: bảng transit time chuẩn theo tuyến/mode + thời gian thông quan trung bình (mục 5.6). |
| What-if simulation: đổi qty/due-date MO, đổi mode (SEA→AIR), đổi supplier → preview impact cost + time.  MO release → backflush NVL từ WMS, ghi nhận completion → nhập kho thành phẩm. | SAP B1 có chức năng Scenario — KBI chỉ cần FDS cung cấp thời gian vận chuyển tương ứng với loại hình vận chuyển (SEA → AIR).  Phần execution SAP B1 đã hỗ trợ đầy đủ: Issue for Production cả hai dạng Backflush và Manual (có quản lý serial); Receipt from Production kích hoạt tự động backflush NVL; WMS QR hỗ trợ nhập kho sản xuất bằng quét mã thành phẩm và kiểm tra tồn khả dụng vật tư trước khi thực hiện.  → Phần execution KBI đã vận hành tốt. | **✘ Không cần FDS xây dựng**  Phát sinh yêu cầu dữ liệu transit time SEA/AIR phục vụ Scenario (mục 5.6). |

### 2.2.5. Tích hợp (Integration)

| **Hạng mục FDS đề xuất** | **Hiện trạng tại KBI (SAP B1 / WMS QR nội bộ)** | **Kết luận** |
| --- | --- | --- |
| Nhất quán dữ liệu từ ERP, Forwarder API, Carrier (B/L, AWB, vessel/flight), Hải quan (VNACCS), WMS, MES.  Đồng bộ PO/GRN, công nợ về Kế toán ERP.  Multi-tenant: mở rộng cho nhiều nhà máy, warehouse. | SAP B1 đã sẵn sàng tích hợp qua Service Layer / DI API; KBI đã tích hợp thực tế WMS QR Code với B1 qua API. Multi-Branch cho nhiều nhà máy đã được B1 hỗ trợ cấu hình.  Kết nối với Forwarder (FDS), Carrier, VNACCS chưa được xây dựng — KBI tự xây middleware tích hợp trên hạ tầng của mình. | **✘ Không cần FDS xây dựng nền tảng**  FDS chỉ cần cung cấp API theo đúng mục 5; KBI đảm nhận toàn bộ phần middleware và ghi dữ liệu vào SAP B1. |

## 2.3. Tổng hợp phạm vi đề xuất FDS hỗ trợ

Từ bảng đối chiếu trên, phạm vi đề xuất FDS hỗ trợ gồm 4 hạng mục:

| **Hạng mục** | **Mô tả tóm tắt** |
| --- | --- |
| 1. Hệ thống theo dõi vận chuyển nhập khẩu (Shipment Tracking) | Quản lý 10 milestones từ Booking đến Nhập kho, gắn chứng từ và chi phí vào từng milestone (mục 2.2.2, dòng 1). Chi tiết tại mục 3.1–3.2. |
| 2. SOP 5 giai đoạn với SLA timer | Vận hành theo SOP 5 giai đoạn (Báo giá → Chứng từ → Hải quan → Giao hàng → Quyết toán) với bộ đếm SLA theo giờ/ngày làm việc, auto-confirm và cảnh báo tự động khi trễ hạn (mục 2.2.2, dòng 2). Định mức SLA theo chính đề xuất của FDS tại mục 3.3. |
| 3. Dữ liệu phục vụ hoạch định trên SAP B1 | (a) Chi phí chi tiết theo shipment làm đầu vào Landed Costs (mục 2.2.2, dòng 3); (b) số lượng in-transit theo PO line kèm ETA cho Scheduled Receipts (mục 2.2.3, dòng 3); (c) bảng transit time chuẩn theo tuyến/mode + thời gian thông quan trung bình cho Item Planning và Scenario (mục 2.2.4). Chi tiết tại mục 5.5–5.6. |
| 4. API tích hợp với SAP B1 | Toàn bộ dữ liệu tracking, chứng từ, chi phí, SLA truyền về hệ thống KBI qua API để tích hợp SAP B1 (mục 5). |

*KBI đề xuất hai bên tập trung nguồn lực vào 4 hạng mục trên. Các hạng mục “Không cần FDS hỗ trợ” tại mục 2.2 KBI đã vận hành ổn định trên SAP B1 và WMS nội bộ — FDS không cần xây dựng để tránh trùng lặp và đỡ tốn công sức.*

# 3. Yêu cầu nghiệp vụ

## 3.1. Quản lý 10 milestones của lô hàng

Mỗi lô hàng nhập khẩu (đường biển FCL/LCL hoặc đường hàng không) được theo dõi theo 10 milestones. Một shipment có thể gắn với nhiều PO line của KBI (giao hàng từng phần — partial shipment); dữ liệu trạng thái và số lượng in-transit phải theo dõi được ở cấp PO line. Mọi mốc thời gian ghi nhận cả giá trị dự kiến (E\*) và thực tế (A\*).

| **#** | **Milestone** | **Mô tả** | **Dữ liệu bắt buộc cập nhật** |
| --- | --- | --- | --- |
| 1 | Booking confirmed | Forwarder/Hãng vận chuyển xác nhận chỗ | Số booking, hãng tàu/hãng bay, tên tàu-số chuyến hoặc số hiệu chuyến bay; ETD, ETA, ngày giao hàng dự kiến.  Thời điểm hoàn tất booking (đối chiếu với ETD/ETA — đảm bảo kế hoạch vận chuyển sẵn sàng ngay khi hàng xong). |
| 2 | Cargo ready | Hàng sẵn sàng tại kho nhà cung cấp | Ngày hàng sẵn sàng thực tế so với ngày cam kết trên PO.  Đầu vào cho KPI tỷ lệ nhà cung cấp hàng hóa chuẩn bị hàng đúng hạn (mục 3.4). |
| 3 | Pick-up | Lấy hàng tại kho shipper | Ngày/giờ lấy hàng thực tế.  Mã delay (delay 1, delay 2...) và nguyên nhân nếu có — để KBI điều chỉnh kế hoạch sản xuất/kinh doanh kịp thời. |
| 4 | B/L issued | Phát hành vận đơn (B/L hoặc AWB), kiểm tra chứng từ | Số B/L hoặc AWB, ngày phát hành; đính kèm file draft và final. |
| 5 | Gate-in POL | Hàng hạ bãi cảng đi / vào kho hàng không | Ngày/giờ gate-in, cảng/sân bay đi (POL), số container, số seal (với hàng SEA). |
| 6 | ATD | Phương tiện khởi hành thực tế | ATD và ETD cập nhật nếu thay đổi.  Cảnh báo khi ATD lệch ETD ban đầu (roll tàu, hoãn chuyến, đổi chuyến bay). |
| 7 | Customs Draft / Submitted | Hoàn tất hồ sơ thủ tục nhập khẩu (tờ khai nháp / truyền tờ khai) | Số tờ khai, ngày lập tờ khai nháp, ngày truyền tờ khai chính thức, trạng thái hồ sơ; đính kèm tờ khai.  Theo SOP: tờ khai nháp có trước 3 ngày so với ETA (mục 3.3). |
| 8 | AN / ATA | Thông báo hàng đến — phương tiện đến cảng/sân bay | ATA, ngày phát hành Arrival Notice (AN); ETA cập nhật nếu thay đổi.  Theo SOP: AN có trước 2 ngày so với ATA. |
| 9 | Customs Cleared | Thông quan | Kết quả phân luồng (Xanh / Vàng / Đỏ).  Ngày truyền tờ khai, ngày nộp thuế, ngày thông quan — đủ để đo lead time từng bước. |
| 10 | EDO & Delivery | Giao hàng đến cửa kho / nhập kho | 1. Ngày release D.O.  2. Thời hạn hoàn tất giao hàng không phát sinh chi phí: hạn gia hạn lệnh, DEM, DET, ngày bắt đầu tính phí lưu kho/lưu bãi.  3. Ngày nhập kho / ngày lên bãi.  4. Thông tin GPS phương tiện giao hàng nội địa (thời gian thực hoặc cập nhật định kỳ).  5. Thời gian hoàn tất giao hàng + đính kèm biên bản giao hàng (P.O.D).  6. Trường trao đổi (comment) hai chiều FDS ↔ KBI trên từng lô hàng. |

## 3.2. Quản lý chứng từ theo milestone

* Mỗi milestone cho phép đính kèm một hoặc nhiều chứng từ, tối thiểu: Commercial Invoice, Packing List, B/L hoặc AWB, C/O, Tờ khai hải quan, Arrival Notice, D/O, Debit Note, Biên bản giao hàng, Hồ sơ thanh toán.
* Chứng từ truy xuất được qua API (URL có kiểm soát truy cập hoặc nội dung file).
* Mỗi chứng từ kèm metadata: loại chứng từ, số tham chiếu, ngày phát hành, ngày upload, người upload, phiên bản (draft/final).
* Hệ thống của FDS là nơi lưu trữ gốc, đồng thời đẩy metadata + file về hệ thống KBI qua API tại thời điểm hoàn tất từng giai đoạn (thay thế thao tác upload Google Drive thủ công hiện nay).

## 3.3. SOP 5 giai đoạn với SLA thống nhất chung

Định mức SLA dưới đây lấy theo chính đề xuất của FDS trong tài liệu trình bày cho KBI — hai bên thống nhất dùng làm mục tiêu vận hành chung. Hệ thống của FDS tự động xác nhận (auto-confirm) khi đủ điều kiện chuyển giai đoạn, vận hành bộ đếm SLA theo giờ/ngày làm việc (bao gồm lịch nghỉ lễ Việt Nam), cảnh báo hai bên khi quá hạn và ghi nhận các trường hợp quá hạn để cùng rà soát, cải tiến.

| **Giai đoạn** | **Nội dung và SLA (theo đề xuất của FDS)** | **Dữ liệu / chứng từ đầu ra** |
| --- | --- | --- |
| 1. Tiếp nhận & Báo giá | Phản hồi yêu cầu báo giá của KBI trong 1 giờ làm việc; gửi báo giá đầy đủ trong 8 giờ làm việc.  Chào giá tối thiểu 02 hãng vận chuyển, gợi ý tối thiểu 02 phương án chuyến có ETD phù hợp kế hoạch giao hàng; kèm dữ liệu so sánh với các lô tương đương trong lịch sử và cảnh báo rủi ro delay/roll tàu/biến động lịch trình.  Xác nhận báo giá: AIR và SEA FCL — KBI xác nhận qua API; SEA LCL — tự động xác nhận theo cấu hình.  Hoàn tất booking trong 4 giờ làm việc kể từ khi báo giá được xác nhận. | Bảng chào giá có cấu trúc, so sánh được giữa các phương án; xác nhận booking. |
| 2. Xử lý chứng từ | Rà soát Draft B/L, Commercial Invoice, Packing List trong tối đa 2 giờ làm việc.  Phát hành Debit Note OF/AF trong 3 giờ làm việc kể từ khi có Final B/L hoặc AWB.  Arrival Notice có trước tối thiểu 2 ngày so với ATA. | Bộ chứng từ + metadata đẩy về KBI qua API (mục 3.2). |
| 3. Khai báo Hải quan | Tờ khai nháp có trước 3 ngày so với ETA, tính từ khi nhận đầy đủ chứng từ final từ KBI.  Sau khi KBI xác nhận tờ khai nháp: truyền tờ khai chính thức trong 2 giờ làm việc.  Cập nhật kết quả phân luồng Xanh / Vàng / Đỏ ngay khi có. | Tờ khai (nháp/chính thức), trạng thái phân luồng, các mốc ngày tại milestone 9. |
| 4. Giải phóng & Giao hàng | Kiểm tra tình trạng released của hàng hóa trước 2 ngày so với ETA.  Nhận D/O ngay trong ngày ATA.  Xác nhận lịch giao hàng với KBI; KBI phản hồi trong 2 giờ làm việc.  Giao hàng đến cửa kho, hoàn tất P.O.D. | D/O, lịch giao hàng, biên bản giao hàng, dữ liệu GPS, các mốc tại milestone 10. |
| 5. Quyết toán & Lưu trữ | Upload toàn bộ hồ sơ lô hàng lên hệ thống và đẩy về KBI qua API.  Phát hành Final Debit Note → xuất hóa đơn → chốt công nợ.  Cung cấp báo cáo chi phí vận chuyển thực tế so sánh với các lô tương đương trước đó. | Hồ sơ thanh toán, Final Debit Note, hóa đơn, bảng chi phí chi tiết theo khoản mục. |

*Trách nhiệm đối ứng của KBI trong SOP (xác nhận báo giá, cung cấp chứng từ final, xác nhận tờ khai nháp, phản hồi lịch giao trong 2 giờ làm việc) sẽ được hệ thống ghi nhận mốc thời gian tương ứng để phân định trách nhiệm khi tính SLA.*

# 4. Luồng dữ liệu hai chiều KBI ↔ FDS

Khác với đề xuất ban đầu của FDS (KBI tạo PR/PO trên nền tảng của FDS), mô hình hợp tác là: KBI giữ toàn bộ nghiệp vụ mua hàng trên SAP B1; FDS nhận thông tin lô hàng từ KBI, vận hành tracking trên hệ thống của FDS và trả dữ liệu về KBI. Cụ thể:

## 4.1. Chiều KBI → FDS

* **Yêu cầu báo giá (RFQ):** KBI đẩy yêu cầu báo giá qua API của FDS, gồm: mã yêu cầu, tuyến (POL/POD), phương thức mong muốn, ngày hàng sẵn sàng dự kiến, thông tin hàng hóa (khối lượng, thể tích, loại cont), PO liên quan.
* **Thông tin PO phục vụ liên kết shipment:** po\_number, company\_code (pháp nhân nhập hàng), vendor\_code, danh sách PO line (mã hàng, số lượng, ngày cargo ready cam kết, Incoterm, mode). FDS dùng dữ liệu này để gắn shipment với PO line và tính KPI Cargo ready đúng hạn.
* **Xác nhận nghiệp vụ:** xác nhận báo giá (AIR/FCL), xác nhận tờ khai nháp, phản hồi lịch giao hàng — thực hiện qua API, có ghi nhận thời điểm.

## 4.2. Chiều FDS → KBI

* Sự kiện milestone, thay đổi lịch trình (ETD/ETA), cảnh báo delay và cảnh báo SLA — qua webhook thời gian thực.
* Chứng từ và metadata theo milestone.
* Chi phí chi tiết theo shipment, liên kết về PO/PO line (đầu vào cho Landed Costs trong SAP B1).
* Số lượng in-transit theo PO line kèm ETA hiện hành (đầu vào cho kiểm tra khả dụng vật tư và Scheduled Receipts trong MRP của SAP B1).
* Bảng transit time chuẩn theo tuyến/phương thức và thời gian thông quan trung bình (mục 5.6).

# 5. Yêu cầu kỹ thuật API

## 5.1. Chuẩn chung

* Kiến trúc RESTful, dữ liệu JSON, mã hóa UTF-8; toàn bộ kết nối qua HTTPS, tối thiểu TLS 1.2.
* Trường thời gian theo ISO 8601 kèm múi giờ (ví dụ: 2026-06-10T14:30:00+07:00).
* Tài liệu API theo chuẩn OpenAPI 3.x, kèm hướng dẫn tích hợp và Postman collection (hoặc tương đương).
* Môi trường sandbox/test tách biệt production, có dữ liệu mẫu đầy đủ 10 milestones và đủ các mode SEA FCL/LCL, AIR.

## 5.2. Mô hình tích hợp

* **Webhook (push, bắt buộc):** khi phát sinh sự kiện (milestone mới, cập nhật ETD/ETA, chứng từ mới, báo giá phát hành, cảnh báo SLA/delay), hệ thống FDS gọi về endpoint do KBI cung cấp trong tối đa 15 phút kể từ khi sự kiện được ghi nhận.
* **REST API (pull, bắt buộc):** KBI chủ động truy vấn lô hàng, milestone, chứng từ, chi phí, transit time — phục vụ đối soát định kỳ và đồng bộ lại khi webhook lỗi.
* **API inbound (bắt buộc):** FDS cung cấp endpoint tiếp nhận RFQ, thông tin PO và các xác nhận nghiệp vụ từ KBI (mục 4.1).

Phía KBI xây dựng middleware tiếp nhận và ghi dữ liệu vào SAP Business One qua Service Layer / DI API. FDS không kết nối trực tiếp vào SAP B1 nhưng phải đảm bảo đầy đủ khóa tham chiếu nêu tại mục 5.5 để hệ thống KBI tự động khớp chứng từ.

## 5.3. Xác thực & bảo mật API

* Xác thực OAuth 2.0 (client credentials) hoặc API key kết hợp chữ ký HMAC trên payload webhook.
* Webhook kèm header chữ ký để KBI xác minh nguồn gửi; hỗ trợ xoay vòng (rotate) secret.
* Hỗ trợ IP whitelist hai chiều nếu KBI yêu cầu.
* Phân quyền theo phạm vi dữ liệu: KBI chỉ truy cập dữ liệu các lô hàng của mình; tách được theo company\_code của từng pháp nhân.

## 5.4. Cơ chế truyền nhận & độ tin cậy

* Mỗi sự kiện webhook có event\_id duy nhất; đảm bảo at-least-once delivery, KBI khử trùng lặp theo event\_id.
* Retry tự động khi endpoint KBI không trả 2xx: tối thiểu 5 lần theo backoff lũy tiến trong 24 giờ; có cơ chế xem và gửi lại sự kiện thất bại.
* API pull hỗ trợ phân trang và lọc theo thời gian cập nhật (updated\_after) để đồng bộ gia tăng.
* Mục tiêu vận hành: uptime API ≥ 99,5%/tháng; thời gian phản hồi < 2 giây cho 95% request; thông báo trước khi bảo trì có kế hoạch.

## 5.5. Mô hình dữ liệu & khóa tham chiếu

| **Đối tượng** | **Trường tối thiểu** | **Khóa tham chiếu SAP B1** |
| --- | --- | --- |
| Shipment (lô hàng) | shipment\_id, mode (SEA\_FCL / SEA\_LCL / AIR / DOMESTIC), trạng thái hiện tại, booking\_no, hãng vận chuyển, tàu-chuyến hoặc số hiệu chuyến bay, POL, POD, ETD/ATD, ETA/ATA, danh sách container (số cont, seal, loại) hoặc kiện hàng AIR. | po\_numbers (một shipment gắn nhiều PO), company\_code, vendor\_code. |
| ShipmentLine (liên kết PO line) | shipment\_id, po\_number, po\_line\_id, mã hàng, số lượng trên shipment (hỗ trợ partial), ETA hiện hành của lượng hàng này. | po\_line\_id của KBI — bắt buộc, phục vụ in-transit theo PO line và Scheduled Receipts. |
| MilestoneEvent | event\_id, shipment\_id, mã milestone (mục 5.7), thời điểm dự kiến/thực tế, mã delay + nguyên nhân (nếu có), người cập nhật, ghi chú. | shipment\_id + po\_numbers. |
| Document (chứng từ) | document\_id, shipment\_id, milestone liên quan, loại chứng từ, số tham chiếu, phiên bản (draft/final), URL/file, ngày phát hành, ngày upload. | shipment\_id; số B/L hoặc AWB, số tờ khai, số Invoice. |
| Charge (chi phí) | shipment\_id, khoản mục (freight, local charges, thuế, DEM/DET, lưu kho...), số tiền, loại tiền tệ, tỷ giá, thuế suất, số Debit Note / hóa đơn FDS, trạng thái quyết toán. | shipment\_id + po\_numbers (đầu vào phân bổ Landed Costs trong SAP B1). |
| Quotation (báo giá) | request\_id, các phương án (hãng vận chuyển, chuyến, ETD/ETA, transit time, giá theo khoản mục), hạn hiệu lực, cảnh báo rủi ro, trạng thái xác nhận (chờ xác nhận / KBI đã xác nhận / auto-confirm LCL). | po\_number hoặc mã RFQ của KBI. |
| TransitTime (lead time chuẩn) | Tuyến (POL–POD), mode, transit time chuẩn (ngày), thời gian thông quan trung bình (ngày), ngày hiệu lực, ghi chú biến động. | Dùng làm master data nạp vào Item Planning / Scenario của SAP B1. |

## 5.6. Dữ liệu transit time phục vụ hoạch định lead time

* FDS cung cấp và duy trì bảng transit time chuẩn cho toàn bộ tuyến KBI đang nhập hàng, tách theo mode (SEA FCL, SEA LCL, AIR), kèm thời gian thông quan trung bình thực tế.
* Cập nhật ngay khi có biến động đáng kể (thay đổi lịch tàu, nghẽn cảng, thay đổi tuyến) và rà soát định kỳ tối thiểu hàng quý.
* Cung cấp qua API (GET /transit-times) và thông báo thay đổi qua webhook để KBI cập nhật Item Planning Data và chạy Scenario mô phỏng đổi mode SEA → AIR trong SAP B1.

## 5.7. Bộ mã milestone chuẩn hóa (gợi ý)

FDS sử dụng bộ mã thống nhất sau trong mọi payload (hoặc cung cấp bảng ánh xạ nếu hệ thống FDS dùng mã khác). Với hàng AIR, các trường vessel/voyage thay bằng flight\_no và bl\_no mang giá trị AWB:

| **Mã** | **Milestone** | **Trường thời gian chính** |
| --- | --- | --- |
| BOOKING\_CONFIRMED | Booking confirmed | booking\_confirmed\_at, etd, eta |
| CARGO\_READY | Cargo ready | cargo\_ready\_planned, cargo\_ready\_actual |
| PICKUP | Pick-up | pickup\_at, delay\_code, delay\_reason |
| BL\_ISSUED | B/L / AWB issued | bl\_no, bl\_issued\_at, version (draft/final) |
| GATE\_IN\_POL | Gate-in POL | gate\_in\_at, pol |
| ATD | Khởi hành | atd, etd\_updated |
| CUSTOMS\_SUBMITTED | Hoàn tất hồ sơ thủ tục nhập khẩu | declaration\_no, draft\_at, kbi\_confirmed\_at, submitted\_at |
| ATA\_AN | Thông báo hàng đến / ATA | ata, an\_issued\_at, eta\_updated |
| CUSTOMS\_CLEARED | Thông quan | channel (GREEN/YELLOW/RED), submitted\_at, tax\_paid\_at, cleared\_at |
| EDO\_DELIVERY | EDO & Delivery | do\_released\_at, dem\_until, det\_until, storage\_fee\_from, gate\_in\_warehouse\_at, delivered\_at, pod\_doc, gps\_link |

## 5.8. Danh sách endpoint tối thiểu

| **Method** | **Endpoint (minh họa)** | **Mô tả** |
| --- | --- | --- |
| POST | /quotation-requests | KBI gửi yêu cầu báo giá (RFQ). |
| POST | /purchase-orders | KBI đẩy thông tin PO + PO lines để liên kết shipment. |
| POST | /quotations/{id}/confirm | KBI xác nhận báo giá (AIR/FCL); LCL auto-confirm theo cấu hình. |
| GET | /quotations?request\_id= | Kết quả báo giá: tối thiểu 2 hãng vận chuyển, 2 phương án chuyến. |
| GET | /shipments?po\_number=&updated\_after=&page= | Danh sách lô hàng theo PO / thời gian cập nhật, phân trang. |
| GET | /shipments/{shipment\_id} | Chi tiết lô hàng: trạng thái, milestone, container/kiện, PO lines liên kết. |
| GET | /shipments/{shipment\_id}/milestones | Lịch sử sự kiện milestone. |
| GET | /shipments/{shipment\_id}/documents | Danh sách chứng từ + link tải có kiểm soát truy cập. |
| GET | /shipments/{shipment\_id}/charges | Chi phí chi tiết theo khoản mục, trạng thái quyết toán. |
| GET | /in-transit?po\_line\_id= | Số lượng đang vận chuyển theo PO line kèm ETA hiện hành. |
| GET | /transit-times?pol=&pod=&mode= | Bảng transit time chuẩn + thời gian thông quan trung bình. |
| POST | (webhook về phía KBI) | Đẩy sự kiện: milestone.updated, document.uploaded, schedule.changed, quotation.issued, sla.warning, delay.reported, transit\_time.changed. |

*Tên endpoint là minh họa; FDS có thể dùng cấu trúc khác nhưng phải phủ đủ các nghiệp vụ trên. Ví dụ payload tại Phụ lục B; danh mục mã chuẩn hóa (loại chứng từ, khoản mục chi phí, mã delay) tại Phụ lục A.*

# 6. Bảo mật dữ liệu

* Dữ liệu lô hàng, chứng từ, chi phí của KBI là tài sản thông tin của KBI; FDS không chia sẻ cho bên thứ ba khi chưa có chấp thuận bằng văn bản.
* Tuân thủ quy định pháp luật Việt Nam về bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) đối với thông tin người dùng, lái xe.
* Sao lưu định kỳ; lưu trữ dữ liệu và chứng từ tối thiểu 5 năm hoặc theo thỏa thuận hợp đồng.
* Khi kết thúc hợp đồng: bàn giao toàn bộ dữ liệu lịch sử (định dạng có cấu trúc CSV/JSON + file chứng từ) trong 30 ngày.
* Quy trình thông báo sự cố bảo mật cho KBI trong 24 giờ kể từ khi phát hiện.

# 7. Triển khai, nghiệm thu và hỗ trợ

* FDS cung cấp: tài liệu API (OpenAPI), tài khoản sandbox, đầu mối kỹ thuật hỗ trợ tích hợp.
* UAT: chạy song song tối thiểu 5–10 lô hàng thực tế (gồm cả SEA và AIR nếu có phát sinh), kiểm đủ 10 milestones, chứng từ, webhook và luồng RFQ/PO inbound trước khi nghiệm thu.
* Tiêu chí nghiệm thu: 100% sự kiện milestone của các lô UAT truyền về hệ thống KBI đúng cấu trúc, đúng khóa tham chiếu PO/PO line, độ trễ ≤ 15 phút; SLA timer hoạt động đúng lịch giờ làm việc.
* Hỗ trợ vận hành: kênh hỗ trợ kỹ thuật, phản hồi sự cố tích hợp ≤ 4 giờ làm việc với lỗi nghiêm trọng.
* Thay đổi cấu trúc API (breaking change) phải thông báo trước tối thiểu 30 ngày và duy trì phiên bản cũ song song trong giai đoạn chuyển đổi.

# 8. Đề xuất các bước phối hợp tiếp theo

Để hai bên triển khai thuận lợi, KBI đề xuất:

* Hai bên trao đổi để xác định phần nào hệ thống FDS đã sẵn có, phần nào cần phát triển thêm, từ đó thống nhất thứ tự ưu tiên triển khai.
* Hai bên thống nhất các định mức SLA tại mục 3.3 (theo đúng đề xuất ban đầu của FDS) làm mục tiêu vận hành chung.
* FDS chia sẻ tài liệu API hiện có (nếu hệ thống đã sẵn sàng) hoặc kế hoạch phát triển dự kiến.
* Tổ chức một buổi làm việc kỹ thuật giữa đội IT KBI và đội phát triển FDS để chốt thiết kế API, bộ mã chuẩn hóa (Phụ lục A) và kế hoạch sandbox/UAT trước khi bắt tay phát triển.
* Thống nhất đầu mối liên hệ hai bên và kênh trao đổi kỹ thuật trong suốt quá trình triển khai.