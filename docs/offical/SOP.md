### 1. Tổng quan hệ thống (Context & Scope)
Tài liệu SOP này đóng vai trò là "Business Requirement" nhằm chuẩn hóa luồng giao tiếp giữa công ty Forwarder (FDS) và khách hàng (KBI). 
Hệ thống cần quản lý toàn bộ vòng đời của dịch vụ freight forwarding, bao gồm các module chính:
*   Tiếp nhận yêu cầu (Quotation Request)
*   Phản hồi báo giá và xác nhận dịch vụ (Quotation & Confirmation)
*   Bàn giao vận hành (Ops Handover)
*   Trao đổi chứng từ (Document Management)
*   Xử lý công nợ/hóa đơn (Billing & Invoicing).

**Quy tắc ràng buộc (Constraints):**
*   **Single Point of Contact:** Mỗi đơn hàng KBI chỉ được gán (assign) cho một (01) nhân sự chuyên trách của FDS để đảm bảo tính nhất quán.
*   **Audit Trail:** Mọi trao đổi, thay đổi trạng thái, báo giá phải được thực hiện/cập nhật qua email (có thể hiểu hệ thống cần tích hợp email service hoặc in-app notification để lưu vết truy xuất dữ liệu).
*   **Fixed Pricing:** Giá trị báo giá là "trọn gói" (lưu log không thay đổi), trừ khi trigger các exception: KBI đổi thông tin/chậm trễ hoặc lỗi từ bên thứ ba.

### 2. Phân quyền và Trách nhiệm (Role-Based Access Control - RBAC)
Trong hệ thống, chúng ta sẽ có 4 nhóm User Role chính tương tác trên giao diện với các phân quyền trạng thái khác nhau:
*   **KBI (Khách hàng):** 
    *   *Action:* Gửi yêu cầu mua, duyệt báo giá, kiểm tra Draft BL/AWB và phản hồi công nợ.
*   **FDS Sales (Account Manager):** 
    *   *Action:* Nhận yêu cầu, báo giá, chốt dịch vụ với KBI. Khi xong, kích hoạt luồng "Handover" chuyển state sang cho bộ phận Ops. Sẽ tham gia lại nếu có "phát sinh thương mại".
*   **FDS Ops (Operations / Dispatcher):** 
    *   *Action:* Nhận task sau handover. Thực hiện cập nhật lịch trình tàu/bay, upload và gửi Draft/Final BL/AWB, tracking quá trình vận chuyển.
*   **FDS Kế toán (Billing / Finance):** 
    *   *Action:* Generate Debit Note, xuất hóa đơn và đối chiếu công nợ trên hệ thống khi có phát sinh.

### 3. Business Logic: Thuật toán tính giá Trucking (Dynamic Pricing Engine)
Đây là một logic quan trọng mà backend cần xử lý khi sinh báo giá đợt 2. Hệ thống cần track tỷ giá dầu để tính chi phí tự động:
*   **Variables cần lưu:** `Quotation_Date` (Ngày báo giá), `Petrol_Price_Quote` (Giá dầu ngày báo giá - crawl từ nguồn Petrolimex), `Delivery_Date` (Ngày giao hàng), `Petrol_Price_Delivery` (Giá dầu ngày giao).
*   **Constant:** `Petrol_Impact_Ratio` = 0.36 (Tỷ lệ đóng góp xăng dầu vào giá bán là 36%).
*   **Công thức (Algorithm):** 
    `Giá_bán_mới = Giá_bán_ban_đầu * (1 + ((Petrol_Price_Delivery - Petrol_Price_Quote) / Petrol_Price_Quote) * 0.36)`.
*   *Lưu ý cho dev:* Module Sales phải lưu snapshot các mốc ngày và giá dầu này để đối chiếu khi cần.

### 4. Luồng Workflow chuẩn & SLA Timer (SOP 5 Giai đoạn)
Mặc dù SOP chỉ ra lưu đồ tổng quan (Báo giá -> Vận chuyển -> Hoàn thành hồ sơ), nhưng đối chiếu với tài liệu yêu cầu kỹ thuật và kế hoạch hệ thống, workflow này được chia thành 5 Stage chính với bộ đếm thời gian (SLA Timer) rất nghiêm ngặt để cảnh báo (Auto-action/Notify):
*   **Stage 1 - Tiếp nhận & Báo giá:** FDS phải phản hồi ≤ 1h, báo giá ≤ 8h và lấy Booking ≤ 4h kể từ khi KBI xác nhận.
*   **Stage 2 - Xử lý chứng từ:** Rà soát chứng từ draft ≤ 2h, xuất Debit Note ≤ 3h sau khi có Final BL, và có Arrival Notice trước ATA 2 ngày.
*   **Stage 3 - Khai báo Hải quan:** Tờ khai nháp trước ETA 3 ngày; sau khi KBI confirm, khai chính thức trong vòng ≤ 2h.
*   **Stage 4 - Giải phóng & Giao hàng:** Check Release trước ETA 2 ngày, chốt lịch giao hàng trong vòng ≤ 2h.
*   **Stage 5 - Quyết toán:** Upload hồ sơ & xuất Final Debit Note sau ngày ATA 5 ngày.

### 5. Quy trình xử lý sự cố (Incident Management / Escalation Matrix)
Hệ thống cần có một module để log Ticket/Issue khi vận hành xảy ra lỗi. Quá trình chia làm 3 bước:
*   **B1. Định tuyến (Routing):** Khi có issue, hệ thống yêu cầu tag bộ phận gây lỗi (Sales, Ops, Fin) thuộc Stage nào. Manager các bộ phận sẽ coordinate. Nếu không rõ, Giám đốc (Director) sẽ assign thủ công.
*   **B2. Phân loại mức độ (Severity Levels) & Ma trận ARI:**
    *   **Level 1 (Minor):** Ảnh hưởng nhỏ, xử lý ngay, không delay thời gian/chi phí. *Assignee:* Nhân viên (Executive) giữ quyền Accountable (A).
    *   **Level 2 (Major):** Ảnh hưởng lớn, rủi ro delay SLA hoặc đội chi phí. *Assignee:* Quản lý (Manager) giữ quyền (A), Nhân viên là Responsible (R), Director được cảnh báo (Informed - I).
    *   **Level 3 (Critical):** Sự cố cực kỳ nghiêm trọng. *Assignee:* Giám đốc (Director) giữ quyền Accountable (A), Manager và Executive làm Responsible (R).
*   **B3. Assign người cụ thể:** Dữ liệu nhân sự được hardcode/config sẵn trong DB với Format mã nhân viên: `[Phòng ban][STT]` (Ví dụ: S01 cho Sales Executive, O02 cho Custom Manager, A01 cho Kế toán, D01 cho Director).

Tóm lại, để code hóa SOP này, bạn cần setup một State Machine cho 5 giai đoạn, tích hợp Background Job (CRON) để chạy bộ đếm SLA, xây dựng một Pricing Engine nhỏ cho việc tracking giá dầu, và thiết lập một hệ thống RBAC đi kèm Ticket Escalation cho xử lý sự cố.