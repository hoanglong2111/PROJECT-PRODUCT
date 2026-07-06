# PHÂN TÍCH NGHIỆP VỤ & YÊU CẦU HỆ THỐNG

# 1. Tổng quan & bối cảnh dự án

## 1.1. Bối cảnh

**KBI (Kim Bình)** là doanh nghiệp sản xuất, đang vận hành **SAP Business One (SAP B1)** làm lõi ERP, kết hợp **hệ thống WMS QR Code nội bộ** tự xây dựng (quét mã bắt buộc cho mọi giao dịch nhập/xuất/điều chuyển kho, tích hợp API hai chiều với SAP B1).

> 💡 **Nói đơn giản:** SAP B1 là "bộ não" ghi sổ mọi hoạt động mua hàng – kế toán – kho của KBI; WMS QR là "tay chân" trong kho — muốn nhập/xuất bất cứ thứ gì đều phải quét mã, và số liệu tự chảy về bộ não. KBI đã đầu tư bài bản, nên **không cần ai xây lại những gì họ đã có**.

**FDS (Fado Solution Co., Ltd)** là forwarder chính (primary forwarder, mã **FWD-001**) phụ trách vận chuyển hàng nhập khẩu cho KBI — chủ yếu tuyến **Trung Quốc → Việt Nam đường biển**, cùng một số tuyến từ Thổ Nhĩ Kỳ, Hàn Quốc, Anh, Ý, Ấn Độ, Singapore, Đài Loan, Malaysia. FDS quản lý thêm **7 forwarder vendor nội bộ** (Dolphin Sea Air, Seal Transport, MN Shipping, Daco Logistics, Quanterm Logistics, SB&P, Bee Logistics) và làm việc trực tiếp với **10 hãng vận chuyển** (7 hãng tàu: MSC, CNC, COSCO, YML, WAN HAI, MSK, EMC; 3 hãng bay: ShunFeng O3, Turkish Airlines, Vietnam Airlines Cargo).

Toàn bộ tài liệu phân tích đứng từ **góc nhìn FDS**: KBI đã phát hành yêu cầu — FDS cần hiểu chính xác phải đáp ứng những gì, xử lý dữ liệu nào, và tác động ra sao lên hệ thống/quy trình hiện tại.

## 1.2. Diễn tiến hình thành tài liệu

| Mốc thời gian | Tài liệu / Sự kiện | Vai trò |
|---|---|---|
| (trước 29/05/2026) | FDS trình đề xuất hệ thống quản lý chuỗi cung ứng 3 giai đoạn (Procurement → Warehouse → Production Planning) | Đề xuất gốc của FDS — phạm vi rộng, bao trùm cả phần KBI đã tự vận hành |
| 26/05/2026 | Phòng IT KBI đối chiếu từng hạng mục đề xuất với hiện trạng SAP B1 / WMS QR nội bộ | Xác định phần nào KBI đã có, phần nào là gap thật |
| 29/05/2026 | **SOP FDS × KBI phiên bản R7** ban hành (tham chiếu xuyên suốt trong 04_Task_Template) | SOP vận hành chi tiết — ⚠️ *không nằm trong bộ tài liệu được cung cấp, xem mục 7* |
| 10/06/2026 | **"KBI–FDS: Bảng mô tả yêu cầu kỹ thuật" v1.0** (Nguyễn Hoàng Phong biên soạn, phía KBI) | Tài liệu yêu cầu chính thức — **nguồn chính** của phân tích này |
| 18/06/2026 | **Bộ Master Data Template** (6 sheet: Item Master, Supplier, Forwarder, Task Template, Charge Code, UOM) — Phase 1: PO + Import Tracking | Dữ liệu nền để nhập liệu & tích hợp hệ thống |
| 01–02/07/2026 | Bộ tài liệu phân tích BA (4 file + file tổng quan) | Hệ thống hoá yêu cầu + dữ liệu, đánh giá tác động cho FDS |

## 1.3. Mục tiêu của bộ tài liệu phân tích

- Hệ thống hoá **đầy đủ, chính xác** các yêu cầu nghiệp vụ và kỹ thuật KBI đặt ra cho FDS — không diễn giải sai lệch, không bỏ sót điều khoản.
- Làm rõ nghĩa thuật ngữ, mã dữ liệu chuyên ngành Logistics/Forwarding để **đội ngũ FDS (kể cả nhân sự không chuyên sâu Logistics)** hiểu và triển khai đúng.
- Đánh giá tác động cụ thể lên hệ thống, quy trình, nhân sự của FDS — so sánh hiện trạng (SOP R7 / Task Template) với yêu cầu mới.
- Tổng hợp danh sách endpoint/API cần xây và dựng workflow cuối cùng thống nhất giữa hai bên.
- Nêu bật vấn đề, khoảng trống, mâu thuẫn giữa các tài liệu nguồn để FDS **chủ động trao đổi với KBI trước khi cam kết**.

---

# 2. Phạm vi hợp tác

## 2.1. Nguyên tắc xác định phạm vi

KBI đối chiếu từng hạng mục trong đề xuất của FDS với hiện trạng vận hành trên SAP B1 và WMS QR, theo 3 nguyên tắc:

| Nguyên tắc | Ý nghĩa |
|---|---|
| **Đã đáp ứng / vượt yêu cầu** | SAP B1 / WMS nội bộ đã làm được → KBI không cần hỗ trợ thêm, FDS không phải tốn nguồn lực xây lại |
| **Gap thực sự** | Khoảng trống thật của KBI → đưa vào phạm vi FDS thực hiện |
| **Chỉ cần dữ liệu đầu vào** | Ngoài phạm vi xây dựng nhưng FDS phải **cung cấp dữ liệu** theo đặc tả kỹ thuật |

## 2.2. Bảng đối chiếu chi tiết đề xuất của FDS

*Ký hiệu: ✔ = Cần FDS hỗ trợ theo yêu cầu mới | ✘ = Không cần FDS xây dựng (KBI đã tự đáp ứng qua SAP B1 / WMS)*

### 2.2.1. Giai đoạn 1 — Quản lý quy trình mua hàng (Procurement)

| Hạng mục FDS từng đề xuất | Hiện trạng KBI (SAP B1 / WMS) | Kết luận |
|---|---|---|
| Tạo PR thủ công/template; duyệt đa cấp; convert PR→PO; quản lý lifecycle PR | PR sinh **tự động từ MRP** trong SAP B1 theo nhu cầu sản xuất, kế thừa thẳng lên PO — không qua Excel/Email | ✘ Không cần |
| Quản lý PO versioning; phân loại theo mode SEA/AIR/Domestic; link PO Lines ↔ PR Lines | PO đầy đủ header; SAP B1 lưu **Change Log** toàn bộ chứng từ (ai sửa, trường nào, giá trị trước/sau) | ✘ Không cần |
| Relationship Map trace chứng từ; báo cáo PR approval, PO delivery performance | Relationship Map SAP B1 trace PR→PO→GRN→A/P Invoice; báo cáo Purchase Analysis, Open PO có sẵn | ✘ Không cần |

### 2.2.2. Giai đoạn 1 — Theo dõi vận chuyển & nhập khẩu (Import & Shipment)

| Hạng mục FDS từng đề xuất | Hiện trạng KBI | Kết luận |
|---|---|---|
| Quản lý 10 milestones Booking→Nhập kho; gắn chứng từ vào từng milestone | SAP B1 **không có** module Shipment Tracking tích hợp — nhận định của FDS đúng, đây là gap thật | ✔ **CẦN FDS** — chi tiết §3.1–3.2 |
| Khai báo hải quan, phân luồng; SOP 5 giai đoạn với SLA timer theo giờ làm việc; auto-confirm | SAP B1 không có SLA timer cho logistics; chưa có cảnh báo tự động khi trễ | ✔ **CẦN FDS** — chi tiết §3.3 |
| Landed cost per PO line; cost tracking freight + thuế + local charges + demurrage | KBI đã dùng tính năng **Landed Costs chuẩn của SAP B1** — điểm mạnh sẵn có | ✘ Không cần xây, nhưng **CẦN FDS cung cấp dữ liệu Charge chi tiết theo shipment** làm đầu vào |

### 2.2.3. Giai đoạn 2 — Quản lý kho (Warehouse Management)

| Hạng mục FDS từng đề xuất | Hiện trạng KBI | Kết luận |
|---|---|---|
| Cấu trúc vị trí kho 6 cấp; Inbound/Putaway quét barcode; Outbound FIFO/FEFO/LIFO | WMS QR nội bộ: **bắt buộc quét mã mọi giao dịch**, tự động đẩy GRPO/Delivery/Transfer về SAP B1 — vượt yêu cầu đề xuất | ✘ Không cần |
| Tồn kho real-time on-hand/allocated/available/in-transit; Inventory Ops có duyệt | SAP B1 + WMS QR: Available = On-hand − Committed − Reserved, tránh xuất trùng — vượt logic ATP chuẩn | ✘ Không cần |
| BOM Availability Check tức thì gồm In-transit (PO/Shipment) | SAP B1 có ATP nhưng In-transit chưa tự tính vào Available; KBI tự cấu hình Scheduled Receipts | ✘ Không cần xây, nhưng **CẦN FDS cung cấp số lượng in-transit theo PO line kèm ETA** (endpoint /in-transit) |

### 2.2.4. Giai đoạn 3 — Kế hoạch sản xuất (Production Planning)

| Hạng mục FDS từng đề xuất | Hiện trạng KBI | Kết luận |
|---|---|---|
| MRP Engine đầy đủ; BOM đa cấp; Item planning data (lead time, safety stock, ROP, MOQ) | SAP B1 MRP Wizard đã tính net requirement, tạo recommend PR/PO/MO; Item Planning Data đã cấu hình | ✘ Không cần |
| Lead-time backward planning từ MO due-date, gồm Supplier LT + Transit + Customs + Buffer | SAP B1 MRP chỉ tính lead time chiều xuôi; backward planning gồm transit/customs chưa có sẵn | ✘ Không cần xây, nhưng **CẦN FDS cung cấp bảng transit time chuẩn theo tuyến/mode + thời gian thông quan TB** |
| What-if simulation đổi mode/supplier; MO release → backflush NVL | SAP B1 có Scenario; phần execution (Issue/Receipt from Production, backflush) đã vận hành tốt | ✘ Không cần xây, chỉ cần dữ liệu transit time SEA/AIR phục vụ Scenario |

### 2.2.5. Tích hợp (Integration)

| Hạng mục FDS từng đề xuất | Hiện trạng KBI | Kết luận |
|---|---|---|
| Nhất quán dữ liệu ERP/Forwarder API/Carrier/Hải quan (VNACCS)/WMS/MES; Multi-tenant | SAP B1 sẵn sàng qua Service Layer/DI API, đã tích hợp thực tế với WMS QR; Multi-Branch đã hỗ trợ. Kết nối Forwarder/Carrier/VNACCS chưa xây — **KBI tự xây middleware** | ✘ Không cần xây nền tảng — FDS chỉ cần **cung cấp API đúng đặc tả** (xem File 4) |

## 2.3. Bốn hạng mục chính thức FDS cần triển khai

| # | Hạng mục | Mô tả tóm tắt | Tham chiếu |
|---|---|---|---|
| 1 | **Hệ thống theo dõi vận chuyển nhập khẩu (Shipment Tracking)** | Quản lý 10 milestones từ Booking đến Nhập kho, gắn chứng từ và chi phí vào từng milestone | §3.1–3.2 |
| 2 | **SOP 5 giai đoạn với SLA timer** | Vận hành 5 giai đoạn (Báo giá → Chứng từ → Hải quan → Giao hàng → Quyết toán) với SLA theo giờ/ngày làm việc, auto-confirm, cảnh báo trễ hạn | §3.3 |
| 3 | **Dữ liệu phục vụ hoạch định trên SAP B1** | (a) Chi phí chi tiết theo shipment cho Landed Costs; (b) số lượng in-transit theo PO line kèm ETA; (c) bảng transit time chuẩn + thời gian thông quan TB | §3.4, File 4 |
| 4 | **API tích hợp với SAP B1** | Toàn bộ dữ liệu tracking, chứng từ, chi phí, SLA truyền về hệ thống KBI qua API | §4, File 4 |

> 📌 **NHẬN XÉT CỦA BA — thay đổi kiến trúc mấu chốt:** Mô hình hợp tác cuối cùng **KHÔNG** phải như FDS đề xuất ban đầu ("KBI tạo PR/PO trên nền tảng FDS"). KBI giữ toàn bộ nghiệp vụ mua hàng trên SAP B1; FDS chỉ **nhận** thông tin lô hàng từ KBI, vận hành tracking trên hệ thống của FDS, và **TRẢ** dữ liệu về qua API/webhook. Bản chất là mô hình **"KBI điều phối — FDS theo dõi & báo cáo" (Track-and-Feed)**, không phải nền tảng dùng chung.
>
> 💡 **Ví von:** KBI là chủ nhà tự nấu ăn trong bếp riêng; FDS là dịch vụ đi chợ hộ — mua đúng, giao đúng giờ, và nhắn tin báo tiến độ từng chặng — chứ không vào bếp nấu chung.

---

# 3. Yêu cầu nghiệp vụ chi tiết

## 3.1. Quản lý 10 milestones của lô hàng

Mỗi lô hàng nhập khẩu (đường biển FCL/LCL hoặc hàng không) được theo dõi qua **10 milestones chuẩn hoá** — như 10 trạm kiểm soát trên hành trình. Lưu ý 3 nguyên tắc:

- **1 shipment có thể gắn nhiều PO line** của KBI (giao hàng từng phần — partial shipment).
- Trạng thái và số lượng in-transit phải theo dõi được **ở cấp PO line** (từng dòng hàng), không chỉ cấp lô.
- Mọi mốc thời gian ghi nhận cả giá trị **dự kiến (E\*)** và **thực tế (A\*)**.

| # | Milestone | Mô tả | Dữ liệu bắt buộc cập nhật |
|---|---|---|---|
| 1 | **Booking confirmed** | Forwarder/hãng vận chuyển xác nhận chỗ | Số booking, hãng tàu/hãng bay, tên tàu–số chuyến hoặc số hiệu chuyến bay; ETD, ETA, ngày giao hàng dự kiến. Thời điểm hoàn tất booking (đối chiếu ETD/ETA — đảm bảo kế hoạch vận chuyển sẵn sàng ngay khi hàng xong) |
| 2 | **Cargo ready** | Hàng sẵn sàng tại kho nhà cung cấp | Ngày hàng sẵn sàng **thực tế** so với ngày **cam kết trên PO**. Đầu vào cho KPI tỷ lệ NCC chuẩn bị hàng đúng hạn (mục 3.4 YCKT — ⚠️ *xem Vấn đề mở §7: mục này chưa có nội dung trong bản gốc*) |
| 3 | **Pick-up** | Lấy hàng tại kho shipper | Ngày/giờ lấy hàng thực tế. **Mã delay** (delay 1, delay 2…) và nguyên nhân nếu có — để KBI điều chỉnh kế hoạch sản xuất/kinh doanh kịp thời |
| 4 | **B/L issued** | Phát hành vận đơn (B/L hoặc AWB), kiểm tra chứng từ | Số B/L hoặc AWB, ngày phát hành; đính kèm file **draft và final** |
| 5 | **Gate-in POL** | Hàng hạ bãi cảng đi / vào kho hàng không | Ngày/giờ gate-in, cảng/sân bay đi (POL), **số container, số seal** (với hàng SEA) |
| 6 | **ATD** | Phương tiện khởi hành thực tế | ATD và ETD cập nhật nếu thay đổi. **Cảnh báo khi ATD lệch ETD ban đầu** (roll tàu, hoãn chuyến, đổi chuyến bay) |
| 7 | **Customs Draft / Submitted** | Hoàn tất hồ sơ thủ tục nhập khẩu (tờ khai nháp / truyền tờ khai) | Số tờ khai, ngày lập tờ khai nháp, ngày truyền tờ khai chính thức, trạng thái hồ sơ; đính kèm tờ khai. **Theo SOP: tờ khai nháp có trước 3 ngày so với ETA** |
| 8 | **AN / ATA** | Thông báo hàng đến — phương tiện đến cảng/sân bay | ATA, ngày phát hành Arrival Notice (AN); ETA cập nhật nếu thay đổi. **Theo SOP: AN có trước 2 ngày so với ATA** |
| 9 | **Customs Cleared** | Thông quan | Kết quả **phân luồng (Xanh / Vàng / Đỏ)**. Ngày truyền tờ khai, ngày nộp thuế, ngày thông quan — đủ để đo lead time từng bước |
| 10 | **EDO & Delivery** | Giao hàng đến cửa kho / nhập kho | (1) Ngày release D.O. (2) Hạn hoàn tất giao hàng không phát sinh phí: hạn gia hạn lệnh, **DEM, DET**, ngày bắt đầu tính phí lưu kho/lưu bãi. (3) Ngày nhập kho/lên bãi. (4) **GPS phương tiện giao hàng nội địa** (thời gian thực hoặc định kỳ). (5) Thời gian hoàn tất giao hàng + **biên bản giao hàng (P.O.D)**. (6) **Trường trao đổi (comment) 2 chiều FDS ↔ KBI** |

> 💡 Muốn hình dung 10 milestone như một **câu chuyện lô hàng** (thay vì bảng field) → xem File 2 §6.

## 3.2. Quản lý chứng từ theo milestone

- Mỗi milestone cho phép đính kèm một hoặc nhiều chứng từ, tối thiểu: **Commercial Invoice, Packing List, B/L hoặc AWB, C/O, Tờ khai hải quan, Arrival Notice, D/O, Debit Note, Biên bản giao hàng, Hồ sơ thanh toán** (10 loại).
- Chứng từ truy xuất được qua API (URL có kiểm soát truy cập hoặc nội dung file).
- Mỗi chứng từ kèm **metadata**: loại chứng từ, số tham chiếu, ngày phát hành, ngày upload, người upload, phiên bản (draft/final).
- Hệ thống FDS là **nơi lưu trữ gốc**, đồng thời đẩy metadata + file về KBI qua API tại thời điểm hoàn tất từng giai đoạn — **thay thế thao tác upload Google Drive thủ công hiện nay**.

> 💡 **Nói đơn giản:** Mỗi tờ giấy (invoice, vận đơn…) đều phải có "nhãn hồ sơ" đi kèm — nó là loại gì, số mấy, bản nháp hay bản chính, ai nộp, lúc nào — để máy tính hai bên tự xếp đúng chỗ, không cần người mở email ra dò.

## 3.3. SOP 5 giai đoạn với SLA thống nhất chung

Định mức SLA lấy theo **chính đề xuất của FDS** trong tài liệu trình bày cho KBI — hai bên thống nhất dùng làm mục tiêu vận hành chung. Hệ thống FDS **tự động xác nhận (auto-confirm)** khi đủ điều kiện chuyển giai đoạn, vận hành SLA theo **giờ/ngày làm việc (bao gồm lịch nghỉ lễ Việt Nam)**, cảnh báo hai bên khi quá hạn.

| GĐ | Giai đoạn | Nội dung & SLA | Dữ liệu / chứng từ đầu ra |
|---|---|---|---|
| 1 | **Tiếp nhận & Báo giá** | Phản hồi RFQ **≤ 1 giờ làm việc**; gửi báo giá đầy đủ **≤ 8 giờ làm việc**. Chào giá **tối thiểu 2 hãng vận chuyển, ≥ 2 phương án chuyến ETD** phù hợp, kèm so sánh lịch sử + cảnh báo rủi ro delay/roll tàu. Xác nhận: AIR & SEA FCL qua API; **SEA LCL auto-confirm** theo cấu hình. Hoàn tất booking **≤ 4 giờ làm việc** từ khi báo giá được xác nhận | Bảng chào giá có cấu trúc, so sánh được; xác nhận booking |
| 2 | **Xử lý chứng từ** | Rà soát Draft B/L, Commercial Invoice, Packing List **≤ 2 giờ làm việc**. Phát hành Debit Note OF/AF **≤ 3 giờ làm việc** kể từ khi có Final B/L/AWB. Arrival Notice **≥ 2 ngày trước ATA** | Bộ chứng từ + metadata đẩy về KBI qua API |
| 3 | **Khai báo Hải quan** | Tờ khai nháp có **trước 3 ngày so với ETA** (tính từ khi nhận đủ chứng từ final từ KBI). Sau khi KBI xác nhận tờ khai nháp: truyền tờ khai chính thức **≤ 2 giờ làm việc**. Cập nhật phân luồng Xanh/Vàng/Đỏ ngay khi có | Tờ khai (nháp/chính thức), trạng thái phân luồng, mốc milestone 9 |
| 4 | **Giải phóng & Giao hàng** | Kiểm tra tình trạng released **≥ 2 ngày trước ETA**. Nhận D/O **trong ngày ATA**. Xác nhận lịch giao với KBI — KBI phản hồi **≤ 2 giờ làm việc**. Giao đến cửa kho, hoàn tất P.O.D | D/O, lịch giao hàng, biên bản giao hàng, dữ liệu GPS, mốc milestone 10 |
| 5 | **Quyết toán & Lưu trữ** | Upload toàn bộ hồ sơ lô hàng + đẩy về KBI qua API. Phát hành **Final Debit Note** → xuất hoá đơn → chốt công nợ. Cung cấp báo cáo chi phí thực tế so với lô tương đương | Hồ sơ thanh toán, Final Debit Note, hoá đơn, bảng chi phí chi tiết |

*Trách nhiệm đối ứng của KBI trong SOP (xác nhận báo giá, cung cấp chứng từ final, xác nhận tờ khai nháp, phản hồi lịch giao trong 2 giờ làm việc) được hệ thống **ghi nhận mốc thời gian tương ứng để phân định trách nhiệm** khi tính SLA — nghĩa là nếu trễ do KBI phản hồi chậm, đồng hồ không tính vào lỗi FDS.*

> 💡 **SLA là gì?** Giống cam kết "giao đồ ăn trong 30 phút": mỗi việc có hạn giờ rõ ràng, máy tự bấm giờ theo lịch làm việc (trừ tối, cuối tuần, nghỉ lễ), và tự nhắc khi sắp/đã trễ — không còn cãi nhau "email gửi lúc mấy giờ".

## 3.4. Luồng dữ liệu hai chiều KBI ↔ FDS

### Chiều KBI → FDS *(KBI "nói" gì với FDS)*

- **Yêu cầu báo giá (RFQ):** mã yêu cầu, tuyến (POL/POD), phương thức mong muốn, ngày hàng sẵn sàng dự kiến, thông tin hàng hóa (khối lượng, thể tích, loại cont), PO liên quan.
- **Thông tin PO phục vụ liên kết shipment:** po_number, company_code (pháp nhân nhập hàng), vendor_code, danh sách PO line (mã hàng, số lượng, ngày cargo ready cam kết, Incoterm, mode) — dùng để gắn shipment với PO line và tính KPI Cargo ready đúng hạn.
- **Xác nhận nghiệp vụ:** xác nhận báo giá (AIR/FCL), xác nhận tờ khai nháp, phản hồi lịch giao hàng — **qua API, có ghi nhận thời điểm**.

### Chiều FDS → KBI *(FDS "báo cáo" gì cho KBI)*

- Sự kiện milestone, thay đổi lịch trình (ETD/ETA), cảnh báo delay và cảnh báo SLA — qua **webhook thời gian thực**.
- Chứng từ và metadata theo milestone.
- **Chi phí chi tiết theo shipment**, liên kết về PO/PO line (đầu vào Landed Costs SAP B1).
- **Số lượng in-transit theo PO line kèm ETA hiện hành** (đầu vào Scheduled Receipts trong MRP).
- **Bảng transit time chuẩn** theo tuyến/phương thức và **thời gian thông quan trung bình**.

---

# 4. Yêu cầu kỹ thuật API (tóm tắt — diễn giải cho người không làm IT)

> 💡 **Hình dung 3 kênh giao tiếp như 3 cách liên lạc quen thuộc:**
> 1. **Webhook (push)** — FDS **chủ động nhắn tin** cho KBI ngay khi có chuyện (như shipper báo "đơn của bạn đang giao").
> 2. **API pull (GET)** — KBI **chủ động gọi điện hỏi** bất cứ lúc nào ("lô SHP-… đang ở đâu rồi?") — dùng để đối soát định kỳ hoặc khi nghi webhook lỗi.
> 3. **API inbound (POST)** — **hòm thư** FDS mở sẵn để KBI gửi hồ sơ vào (RFQ, thông tin PO, các xác nhận).
>
> Đặc tả đầy đủ endpoint, cấu trúc dữ liệu, webhook và workflow chi tiết → **File 4**.

## 4.1. Chuẩn chung

- Kiến trúc **RESTful**, dữ liệu **JSON**, mã hóa UTF-8; toàn bộ kết nối qua **HTTPS tối thiểu TLS 1.2** *(kênh truyền được mã hoá — như phong bì dán kín)*.
- Trường thời gian theo **ISO 8601 kèm múi giờ** (VD: `2026-06-10T14:30:00+07:00`) — để hai hệ thống không bao giờ hiểu nhầm giờ giấc.
- Tài liệu API theo chuẩn **OpenAPI 3.x**, kèm hướng dẫn tích hợp và **Postman collection** *(bộ "hướng dẫn sử dụng + đồ nghề thử")*.
- **Môi trường sandbox/test** tách biệt production, có dữ liệu mẫu đầy đủ 10 milestones và các mode SEA FCL/LCL, AIR *(phòng tập lái trước khi ra đường thật)*.

## 4.2. Mô hình tích hợp

- **Webhook (push, bắt buộc):** khi phát sinh sự kiện, FDS gọi endpoint do KBI cung cấp **trong ≤ 15 phút** kể từ khi sự kiện được ghi nhận.
- **REST API (pull, bắt buộc):** KBI chủ động truy vấn lô hàng, milestone, chứng từ, chi phí, transit time — phục vụ đối soát định kỳ và **đồng bộ lại khi webhook lỗi**.
- **API inbound (bắt buộc):** FDS cung cấp endpoint tiếp nhận RFQ, thông tin PO và xác nhận nghiệp vụ từ KBI.

KBI xây middleware tiếp nhận và ghi dữ liệu vào SAP B1 qua Service Layer/DI API. **FDS không kết nối trực tiếp vào SAP B1** nhưng phải đảm bảo đầy đủ **khóa tham chiếu** (mục 4.4) để hệ thống KBI tự động khớp chứng từ.

## 4.3. Bảo mật, độ tin cậy & vận hành

- Xác thực **OAuth 2.0 (client credentials)** hoặc **API key + chữ ký HMAC** trên payload webhook; hỗ trợ rotate secret; IP whitelist hai chiều nếu cần. *(💡 Như thẻ ra vào toà nhà + chữ ký chống giả trên từng công văn — kẻ lạ không vào được, tin nhắn không thể bị giả mạo.)*
- **Phân quyền theo phạm vi dữ liệu:** KBI chỉ truy cập dữ liệu lô hàng của mình, tách theo `company_code`.
- Mỗi sự kiện webhook có **event_id duy nhất**, đảm bảo **at-least-once delivery**; **retry tối thiểu 5 lần** theo backoff lũy tiến trong 24 giờ. *(💡 Mỗi tin nhắn có số biên nhận; nếu bên kia chưa "nhận được", hệ thống tự gửi lại — thà gửi trùng còn hơn thất lạc, và số biên nhận giúp lọc trùng.)*
- API pull hỗ trợ **phân trang** và lọc theo `updated_after` để đồng bộ gia tăng *(chỉ hỏi "có gì mới từ lúc X" thay vì tải lại tất cả)*.
- Mục tiêu vận hành: **uptime API ≥ 99,5%/tháng** *(tối đa ≈ 3 giờ 39 phút gián đoạn/tháng)*; **thời gian phản hồi < 2 giây cho 95% request**; báo trước khi bảo trì có kế hoạch.

## 4.4. Mô hình dữ liệu tối thiểu — "khoá tham chiếu" để 2 hệ thống nhận ra nhau

> 💡 Khoá tham chiếu giống **số hồ sơ chung**: FDS gọi lô hàng là SHP-xxx, KBI gọi đơn hàng là PO-xxx — nhờ ghi kèm po_number/po_line_id trên mọi bản tin, máy KBI tự khớp đúng chứng từ về đúng đơn hàng, không cần người dò tay.

| Đối tượng | Khóa tham chiếu SAP B1 |
|---|---|
| **Shipment** (lô hàng) | `po_numbers` (1 shipment có thể gắn nhiều PO), `company_code`, `vendor_code` |
| **ShipmentLine** (liên kết PO line) | `po_line_id` của KBI — **bắt buộc**, phục vụ in-transit theo PO line và Scheduled Receipts |
| **MilestoneEvent** | `shipment_id` + `po_numbers` |
| **Document** (chứng từ) | `shipment_id`; số B/L hoặc AWB, số tờ khai, số Invoice |
| **Charge** (chi phí) | `shipment_id` + `po_numbers` (đầu vào phân bổ Landed Costs trong SAP B1) |
| **Quotation** (báo giá) | `po_number` hoặc mã RFQ của KBI |
| **TransitTime** (lead time chuẩn) | Dùng làm master data nạp vào Item Planning / Scenario của SAP B1 |

*Đặc tả field chi tiết từng đối tượng → File 4, §4.*

---

# 5. Phân tích dữ liệu nền (Master Data)

## 5.1. Tổng quan bộ Master Data Template

Bộ template **"MASTER DATA TEMPLATE — PHASE 1: PO + IMPORT TRACKING"** (v1.0, 18/06/2026) bám theo SOP FDS–KBI R7 (29/05/2026), quy định thứ tự nhập liệu 01 → 02 → 03 → 04:

| Sheet | Nội dung | Bộ phận nhập liệu | Người xác nhận | Ghi chú |
|---|---|---|---|---|
| 01_Item_Master | Danh mục hàng hóa / NVL | KBI – Mua hàng | — | Nền tảng cho PO |
| 02_Supplier | Danh mục Nhà cung cấp | KBI – Mua hàng | — | Cần trước khi tạo PO |
| 03_Forwarder | Đơn vị vận chuyển & Hãng tàu/bay | KBI – Mua hàng + FDS Ops | FDS Ops Manager | FDS là forwarder chính |
| 04_Task_Template | Mẫu công việc theo SOP workflow | FDS Sales + FDS Ops + KBI | FDS Director | Core của phase này |

> ⚠️ **PHÁT HIỆN DỮ LIỆU:** Hướng dẫn (HƯỚNG_DẪN.html) chỉ liệt kê 4 sheet 01–04 trong bảng "Danh sách sheet & phân công". Hai sheet **05_Charge_Code** và **06_UOM** tồn tại trong bộ file thực tế nhưng **KHÔNG được liệt kê** ở bảng phân công — chưa rõ bộ phận nhập liệu, người xác nhận và deadline chính thức. Cần làm rõ với KBI (xem §7, vấn đề #5).

## 5.2. 01_Item Master — Danh mục hàng hóa / NVL

Phạm vi Giai đoạn 1 chỉ cần các trường phục vụ **tạo PO và khai báo hải quan**; trường tồn kho/BOM bổ sung ở giai đoạn 2–3. Dữ liệu mẫu hiện có **55 dòng, toàn bộ thuộc category BTP (Bán thành phẩm) / type SEMI** — linh kiện máy phát điện, động cơ (bộ điều khiển, cảm biến, rơ-le, đầu nối, két nước…).

| Trường dữ liệu | Diễn giải |
|---|---|
| item_code \* | Mã nội bộ hoặc để trống (hệ thống tự sinh) |
| item_name \* | Tên đầy đủ tiếng Việt |
| item_name_en \* | Tên tiếng Anh — in trên PO & chứng từ hải quan |
| item_category \* | NVL / BTP / TP / CCDC / DONG_GOI (Nguyên vật liệu / Bán thành phẩm / Thành phẩm / Công cụ dụng cụ / Đóng gói) |
| item_type \* | RAW / SEMI / FG / CONSUMABLE / PACKAGING |
| base_uom \* | Đơn vị cơ sở: KG / M / PCS / CTN / SET… |
| purchase_uom | Đơn vị mua (nếu khác base_uom) |
| uom_conversion (purchase→base) \* | VD: 1 CTN = 12 PCS → nhập 12. Để 1 nếu giống base_uom |
| hs_code \* (8 số) | HS Code hải quan 8 số — **bắt buộc cho import** |
| country_of_origin | VD: CN / VN / KR / IT / TR |
| unit_price_usd (tham chiếu) | Giá tham chiếu USD (dùng cho Proforma Invoice) |
| barcode | EAN13 / QR / mã nội bộ |

*(\*) = trường bắt buộc trước Go-Live. **Ví dụ thực tế:** item_code BTP-001 "Bộ điều khiển KBI7921C-CAN", base_uom PCS, purchase_uom CTN, hệ số quy đổi 24 (1 thùng = 24 cái), HS code 853710, xuất xứ CN.*

## 5.3. 02_Supplier — Danh mục Nhà cung cấp

**57 nhà cung cấp**, tuyệt đại đa số **OVERSEAS_SEA từ Trung Quốc (~50/57)**, còn lại rải rác Thổ Nhĩ Kỳ, Anh (OVERSEAS_AIR), Hàn Quốc, Ý, Ấn Độ, Đài Loan, Singapore, Malaysia. Incoterm phổ biến nhất: **FOB**, kế đến EXW và một số FCA. Currency hầu hết là **USD**.

| Trường dữ liệu | Diễn giải |
|---|---|
| supplier_code \* | VD: SUP-001 |
| supplier_name \* / supplier_name_en | Tên tiếng Việt / tên tiếng Anh in trên PO chính thức |
| supplier_type \* | OVERSEAS_SEA / OVERSEAS_AIR / DOMESTIC — ảnh hưởng cách tính lead-time & chi phí nhập khẩu |
| country \* / city | VD: CN / KR / IT / VN / TR… |
| contact_person \* / contact_email \* / contact_phone | Đầu mối đặt hàng, nhận PO |
| payment_term \* | NET30 / NET45 / NET60 / TT_ADVANCE / LC |
| currency \* | USD / EUR / CNY / KRW / VND |
| default_incoterm \* | EXW / FOB / CIF / DDP |
| lead_time_production_days \* | Ngày sản xuất (từ đặt PO đến hàng ready) — **CHƯA gồm transit** |
| bank_info | Tên NH │ Số TK │ SWIFT |

> ⚠️ **LIÊN KẾT NGHIỆP VỤ QUAN TRỌNG:** `lead_time_production_days` **KHÔNG bao gồm** thời gian vận chuyển. Transit time (biển ~25–45 ngày, hàng không ~3–7 ngày, thông quan ~2–5 ngày) được cấu hình **RIÊNG** — đây chính là dữ liệu TransitTime FDS phải cung cấp (endpoint `GET /transit-times`). Đồng thời, cột `lead_time_production_days` trong **57/57 dòng dữ liệu mẫu hiện đang để TRỐNG** — cần KBI bổ sung trước Go-Live (§7, vấn đề #8).
>
> 💡 **Phân biệt nhanh:** *Lead time sản xuất* = thời gian NCC làm ra hàng. *Transit time* = thời gian hàng đi trên đường. Cộng thêm thông quan + buffer mới ra tổng thời gian từ "đặt PO" đến "hàng vào kho".

## 5.4. 03_Forwarder & Carrier — Đơn vị vận chuyển & Hãng tàu/bay

### Phần A — Forwarder

| Mã | Tên | Loại | Quốc gia | Primary? | Ghi chú |
|---|---|---|---|---|---|
| **FWD-001** | **Fado Solution Co., Ltd (FDS)** | MULTI | VN | **Y** | Forwarder chính — SOP FDS×KBI R7. Ops Manager: Châu Thị Mỹ Ánh |
| FWD-002 | DOLPHIN SEA AIR SERVICES CORP. | SEA / AIR | VN | N | Vendor nội bộ FDS |
| FWD-003 | SEAL TRANSPORT SOLUTIONS | SEA / AIR | VN | N | Vendor nội bộ FDS |
| FWD-004 | MN SHIPPING CO., LTD | SEA / AIR | VN | N | Vendor nội bộ FDS |
| FWD-005 | DACO LOGISTICS | SEA / AIR | VN | N | Vendor nội bộ FDS |
| FWD-006 | QUANTERM LOGISTICS VIETNAM | SEA / AIR | VN | N | Vendor nội bộ FDS |
| FWD-007 | SB&P JOINT STOCK COMPANY | SEA / AIR | VN | N | Vendor nội bộ FDS |
| FWD-008 | BEE LOGISTICS | SEA / AIR | VN | N | Vendor nội bộ FDS |

### Phần B — Carrier (hãng tàu / hãng bay)

| Mã (SCAC/IATA) | Tên hãng | Loại | Tuyến chính |
|---|---|---|---|
| MSC | Mediterranean Shipping Company | Hãng tàu | CN → VN SEA |
| CNC | Cheng Lie Navigation Company (CNC) | Hãng tàu | CN → VN SEA |
| COSCO | COSCO Shipping Lines | Hãng tàu | CN → VN SEA |
| YML | YangMing Marine Transport Corp. | Hãng tàu | CN → VN SEA |
| WAN HAI | WAN HAI Lines Ltd. | Hãng tàu | CN → VN SEA |
| MSK | Maersk Line | Hãng tàu | CN → VN SEA |
| EMC | Evergreen Marine Corporation (EMC) | Hãng tàu | CN → VN SEA |
| O3 | ShunFeng Airlines | Hãng bay | CN → SGN AIR |
| TURKISH | Turkish Airlines | Hãng bay | UK → SGN AIR |
| VN | Vietnam Airlines Cargo | Hãng bay | UK → SGN AIR |

*Carrier thường do FDS chọn và booking; KBI chỉ cần biết để tracking. FDS Ops (mã O01–O03) chịu trách nhiệm cập nhật danh sách carrier theo thực tế.*

## 5.5. 04_Task Template — Mẫu công việc theo SOP hiện hành của FDS

Đây là bảng SOP tác nghiệp **NỘI BỘ đang dùng** của FDS (8 nhóm việc / 20 task, theo SOP R7) — **khác với, và cần đối chiếu kỹ với,** mô hình 10 milestones mà YCKT chính thức yêu cầu (§3.1). Phân tích khoảng cách đầy đủ giữa hai mô hình → **File 3 §3**.

| # | Nhóm việc (Milestone liên quan) | Công việc | Mô tả tóm tắt | SLA | Bộ phận | Assign |
|---|---|---|---|---|---|---|
| 1 | Báo giá & Xác nhận dịch vụ (trước shipment) | Tiếp nhận yêu cầu báo giá từ KBI | KBI gửi yêu cầu qua email; Sales kiểm tra đủ thông tin: loại hàng, HS code, trọng lượng/kích thước, tuyến, Incoterm, ETD dự kiến | 4 giờ | FDS Sales | S01/S02 |
| 2 | ″ | Chuẩn bị & gửi báo giá (Quotation) | Tính giá theo route/mode/cargo type, áp dụng nguyên tắc giá trucking §5 (36% cơ cấu xăng dầu). Gửi qua email chính thức | Trước ngày hàng đi 2 ngày | FDS Sales | S01/S02 → S03 review |
| 3 | ″ | Xác nhận dịch vụ & bàn giao Ops | KBI xác nhận báo giá qua email; Sales làm Handover note cho Ops | Trước ngày hàng đi 1 ngày | FDS Sales → FDS Ops | S01/S02 → O03 |
| 4 | Tạo & Quản lý PO (trước shipment) | Tạo PO trên hệ thống | KBI tạo PO: supplier, item list, qty, unit price, currency, Incoterm, payment term, ETD dự kiến. Gắn mode SEA/AIR | 2 giờ | KBI – Mua hàng | (KBI bổ sung) |
| 5 | ″ | Gửi PO & theo dõi xác nhận NCC | PO gửi NCC qua email (PDF); theo dõi phản hồi xác nhận | 48 giờ | KBI – Mua hàng | (KBI bổ sung) |
| 6 | ″ | Cập nhật trạng thái PO theo tiến độ NCC | Theo dõi In-Production → Ready-to-Ship; nếu NCC đổi ETD → cập nhật hệ thống, báo FDS Sales | 24 giờ | KBI – Mua hàng | (KBI bổ sung) |
| 7 | Booking & Chuẩn bị hàng (MS-1, MS-2) | Booking tàu/chuyến bay với Carrier | Booking theo route và ETD yêu cầu; xác nhận booking number, vessel/flight name | 24 giờ | FDS Ops | O01/O02 |
| 8 | ″ | Thông báo Cargo Ready & kiểm tra hàng tại origin | NCC báo hàng ready; Ops/Agent xác nhận cargo condition, số kiện, trọng lượng, thể tích | 8 giờ | FDS Ops + NCC | O01 |
| 9 | Vận chuyển & Tracking (MS-3, MS-4) | Xác nhận hàng đã lên tàu/máy bay (Loaded) | Xác nhận Onboard từ Carrier; cập nhật ATD thực tế, vessel/flight, voyage/flight number | 4 giờ | FDS Ops | O01 |
| 10 | ″ | Theo dõi in-transit & cập nhật ETA | Cập nhật định kỳ (2 ngày/lần SEA, hàng ngày AIR); cập nhật ETA nếu thay đổi | 48 giờ | FDS Ops | O01/O03 |
| 11 | ″ | Gửi Draft B/L hoặc Draft AWB cho KBI | Nhận Draft từ Carrier, gửi KBI kiểm tra: shipper, consignee, notify party, mô tả hàng, HS code, weight, measure | 24 giờ | FDS Ops | O02/O01 |
| 12 | ″ | KBI xác nhận / yêu cầu chỉnh sửa Draft B/L hoặc AWB | KBI phản hồi trong SLA; nếu cần sửa, Ops phối hợp Carrier sửa & gửi lại re-confirm trước khi phát hành Final | 24 giờ | KBI | (KBI bổ sung) |
| 13 | Thông quan — Customs (MS-5, MS-6, MS-7) | Chuẩn bị hồ sơ thông quan | Tổng hợp bộ chứng từ: Commercial Invoice, Packing List, B/L gốc/Telex Release, C/O (nếu có), Catalogue nếu hải quan yêu cầu | 8 giờ | FDS Ops (Customs) | O02 |
| 14 | ″ | Nộp tờ khai hải quan | Nộp tờ khai VNACCS (qua đại lý hải quan); ghi nhận số tờ khai, ngày nộp, loại luồng | 4 giờ | FDS Ops (Customs) | O02 |
| 15 | ″ | Theo dõi & hoàn tất thông quan | Theo dõi phân luồng; xử lý nếu Vàng/Đỏ; xác nhận Customs Cleared; báo KBI | 24 giờ | FDS Ops (Customs) | O02/O03 |
| 16 | Giao nhận & Kho (MS-7 → MS-8) | Vận chuyển trucking từ cảng về kho KBI | Điều phối xe tải lấy hàng sau thông quan; báo giá trucking theo SOP §5; xác nhận lịch giao với KBI | 8 giờ | FDS Ops + Trucking | O01/O03 |
| 17 | ″ | Giao hàng tại cổng kho KBI (Gate-in) | Ghi nhận ATA thực tế; KBI kiểm đếm, kiểm tra tình trạng, ký xác nhận giao nhận | 2 giờ | FDS Ops + KBI Kho | O01 + (KBI bổ sung) |
| 18 | Chứng từ hoàn chỉnh (MS-8) | Thu thập & gửi bộ chứng từ gốc cho KBI | Original B/L hoặc Seaway Bill, Final Invoice, Packing List, C/O gốc, Tờ khai đã thông quan, Debit Note | 48 giờ | FDS Ops | O02/O01 |
| 19 | Công nợ & Hóa đơn (MS-8 + payment term) | Phát hành Debit Note / Hóa đơn dịch vụ | Tổng hợp chi phí lô hàng: cước biển/hàng không, phí local, phí thông quan, trucking; gửi KBI qua email kế toán | 48 giờ | FDS Kế toán | A01/A02 |
| 20 | ″ | Đối chiếu công nợ & xác nhận thanh toán | KBI đối chiếu Debit Note với báo giá; nếu chênh lệch → giải trình; xác nhận thanh toán, lưu hồ sơ | 72 giờ | FDS Kế toán + KBI | A02 + (KBI bổ sung) |

### 8 mã milestone hiện dùng trong Task Template (MS-1 → MS-8)

| Mã | Tên milestone |
|---|---|
| MS-1 | Booking confirmed |
| MS-2 | Cargo ready |
| MS-3 | Loaded on vessel/flight |
| MS-4 | In transit |
| MS-5 | Arrived at destination port |
| MS-6 | Customs declaration submitted |
| MS-7 | Customs cleared |
| MS-8 | Delivered to warehouse gate |

*Ghi chú gốc: "KBI cần bổ sung tên nhân sự cụ thể vào cột Người assign cho các task thuộc KBI. FDS Ops Manager (O03 – Châu Thị Mỹ Ánh) xác nhận toàn bộ task nhóm 3, 4, 5, 6, 7."*

## 5.6. 05_Charge Code — Danh mục mã khoản mục chi phí

**80 mã khoản mục chi phí**, chia **7 nhóm** (Origin/Export, Main Freight, Freight Surcharges, Documentation & Filing, Destination/Import, Ancillary/Accessorial, Service/Other), gắn cờ áp dụng theo 5 phương thức (Sea FCL, Sea LCL, Air, Road, Rail), UOM mặc định, tính chất Revenue/Cost, và có chịu thuế (Taxable) hay không. Đây chính là bộ mã dùng cho đối tượng **Charge** và là một phần của "Phụ lục A — danh mục mã chuẩn hóa" (được nhắc tới nhưng chưa có nội dung). **Bảng đầy đủ 80 mã kèm diễn giải dễ hiểu → File 2 §4.**

> ⚠️ **LỖI DỮ LIỆU NGHIÊM TRỌNG:** Mã **"EXC" bị dùng trùng cho HAI khoản phí khác nhau** — (1) "Export Customs Clearance" nhóm Origin (dòng 4) và (2) "Customs Declaration (Extra cont/CDS)" nhóm Ancillary (dòng 73). Đây là lỗi **trùng khóa chính (duplicate primary key)** — bắt buộc đổi mã một trong hai (đề xuất: đổi mã (2) thành "CDS" hoặc "EXC2") **trước khi import vào hệ thống**. Nếu không, hệ thống đích sẽ không phân biệt được hai khoản phí khi đối soát Landed Cost.
>
> 💡 **Vì sao nghiêm trọng?** Giống hai nhân viên khác nhau cùng mang một mã số nhân viên — máy chấm công sẽ trộn lẫn dữ liệu của cả hai, và tiền phí khai hải quan xuất có thể bị cộng nhầm vào phí khai hải quan nhập.

## 5.7. 06_UOM — Danh mục đơn vị tính chuẩn hoá

**26 đơn vị tính (UOM)** chuẩn hoá dùng xuyên suốt Item Master, Charge Code và các đối tượng dữ liệu khác — từ đơn vị vật lý (KG, CBM, PCS…) đến đơn vị nghiệp vụ đặc thù ngành forwarding (WM – Weight/Measure, CW – Chargeable Weight, TEU/FEU…). **Bảng đầy đủ kèm diễn giải → File 2 §3.**

## 5.8. Mối quan hệ giữa các bảng dữ liệu

> 💡 **Cách hình dung:** Item, Supplier, Forwarder/Carrier, Charge Code, UOM là các **"từ điển"** (master data) — Shipment, PO, Charge là các **"giao dịch"** (transaction data) tham chiếu tới từ điển đó. Từ điển sai một chữ, mọi giao dịch tra theo đều sai.

- **Item_Master.base_uom / purchase_uom** → tham chiếu 06_UOM
- **Charge_Code.Default UOM** → tham chiếu 06_UOM
- **Charge (trong Shipment)** → tham chiếu 05_Charge_Code làm danh mục khoản mục chi phí
- **MilestoneEvent.mã milestone** → cần đối chiếu/hợp nhất giữa **10 mã milestone (YCKT)** và **8 mã MS-1…MS-8 (04_Task_Template)** — xem File 3
- **Shipment.forwarder / carrier** → tham chiếu 03_Forwarder (Phần A & B)
- **PO.vendor_code** → tham chiếu 02_Supplier
- **PO line.item_code** → tham chiếu 01_Item_Master
- **Task_Template.Người assign** → tham chiếu bảng nhân sự SOP §6.2 *(⚠️ chưa có trong bộ tài liệu được cung cấp)*