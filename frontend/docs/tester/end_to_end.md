# Kịch bản Kiểm thử End-to-End (E2E) — KBFE Frontend

> **Phiên bản:** 1.0 | **Ngày tạo:** 2026-06-17
> **Ứng dụng:** KBFE — Hệ thống Quản lý Logistics & Hải quan
> **URL:** `http://localhost:5173`

---

## Mục lục

1. [Thông tin chung](#1-thông-tin-chung)
2. [Module Authentication & Authorization](#2-module-authentication--authorization)
3. [Module Dashboard](#3-module-dashboard)
4. [Module Master Data](#4-module-master-data)
5. [Module Purchase Orders (PO)](#5-module-purchase-orders-po)
6. [Module Delivery Orders (DO)](#6-module-delivery-orders-do)
7. [Module Quotation (trong DO)](#7-module-quotation-trong-do)
8. [Module Shipments](#8-module-shipments)
9. [Module Customs Declaration (trong Shipment)](#9-module-customs-declaration-trong-shipment)
10. [Module Carrier Delivery Order (trong Shipment)](#10-module-carrier-delivery-order-trong-shipment)
11. [Module Domestic Transport Orders (DTO)](#11-module-domestic-transport-orders-dto)
12. [Module Tasks](#12-module-tasks)
13. [Module Profile & Settings](#13-module-profile--settings)
14. [Luồng E2E toàn trình — Golden Path](#14-luồng-e2e-toàn-trình--golden-path)
15. [Negative & Edge Cases](#15-negative--edge-cases)

---

## 1. Thông tin chung

### 1.1 Môi trường test

| Hạng mục | Giá trị |
|---|---|
| URL | `http://localhost:5173` |
| Khởi động | `npm run dev` |
| Trình duyệt | Chrome / Edge (phiên bản mới nhất) |
| Ngôn ngữ hỗ trợ | Tiếng Việt (`vi`), Tiếng Anh (`en`) |

### 1.2 Tài khoản test

| Email | Password | Role | Ghi chú |
|---|---|---|---|
| `admin@kbfe.local` | `admin123` | ADMIN | Toàn quyền, bao gồm Master Data & Quản lý tài khoản |
| `manager@kbfe.local` | `manager123` | PIC_MANAGER | Quyền quản lý nghiệp vụ, không có Quản lý tài khoản |

> **Lưu ý:** Hệ thống hiện dùng mock auth (localStorage). Email chứa từ "admin" → role ADMIN, còn lại → PIC_MANAGER.

### 1.3 Ma trận phân quyền menu

| Module | ADMIN | PIC_MANAGER | SALE_STAFF | PORT_OFFICER | CUSTOMS_OFFICER | FINANCE_OFFICER | WAREHOUSE_STAFF |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | x | x | x | x | x | x | x |
| Purchase Orders | x | x | x | - | - | x | - |
| Delivery Orders | x | x | - | x | x | - | x |
| Shipments | x | x | - | x | x | x | x |
| Domestic Transport Orders | x | x | - | x | x | x | x |
| Master Data | x | x | - | - | - | - | - |
| Tasks | x | x | - | x | x | x | x |

### 1.4 Quy ước

- **TC-ID:** Mã test case theo format `[Module]-[Số thứ tự]` (vd: `AUTH-01`)
- **Precondition:** Điều kiện trước khi test
- **Steps:** Các bước thực hiện
- **Expected:** Kết quả mong đợi
- **Status:** `PASS` / `FAIL` / `SKIP` / `BLOCKED` (tester tự điền)

---

## 2. Module Authentication & Authorization

### AUTH-01: Đăng nhập thành công với tài khoản Admin

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Chưa đăng nhập (chưa có dữ liệu localStorage), truy cập `http://localhost:5173` |
| **Steps** | 1. Trang tự chuyển hướng đến `/login`<br>2. Nhập Email: `admin@kbfe.local`<br>3. Nhập Password: `admin123`<br>4. Nhấn nút **Đăng nhập** |
| **Expected** | - Chuyển hướng đến Dashboard (`/`)<br>- Header hiển thị tên "KBFE Admin" và role "Admin"<br>- Sidebar hiển thị tất cả menu (Dashboard, Purchase Orders, Delivery Orders, Shipments, DTO, Master Data, Tasks) |
| **Status** | |

### AUTH-02: Đăng nhập thành công với tài khoản Manager

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Chưa đăng nhập |
| **Steps** | 1. Truy cập `/login`<br>2. Nhập Email: `manager@kbfe.local`<br>3. Nhập Password: `manager123`<br>4. Nhấn nút **Đăng nhập** |
| **Expected** | - Chuyển hướng đến Dashboard<br>- Header hiển thị tên "KBFE Manager" và role "PIC Manager"<br>- Sidebar hiển thị tất cả menu (giống Admin về visibility vì PIC_MANAGER có quyền trên tất cả module) |
| **Status** | |

### AUTH-03: Đăng nhập thất bại — để trống email

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang `/login` |
| **Steps** | 1. Xóa trống ô Email<br>2. Nhập Password bất kỳ<br>3. Nhấn nút **Đăng nhập** |
| **Expected** | - Hiển thị lỗi validation dưới ô Email<br>- Không chuyển trang |
| **Status** | |

### AUTH-04: Đăng nhập thất bại — để trống password

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang `/login` |
| **Steps** | 1. Nhập Email hợp lệ<br>2. Xóa trống ô Password<br>3. Nhấn nút **Đăng nhập** |
| **Expected** | - Hiển thị lỗi validation dưới ô Password<br>- Không chuyển trang |
| **Status** | |

### AUTH-05: Đăng xuất

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập với bất kỳ tài khoản nào |
| **Steps** | 1. Click vào avatar/tên user ở góc trên phải<br>2. Chọn **Đăng xuất** |
| **Expected** | - Chuyển hướng về trang `/login`<br>- localStorage key `kbfe.ui.auth.user` bị xóa<br>- Truy cập lại `/` → tự chuyển hướng về `/login` |
| **Status** | |

### AUTH-06: Route guard — truy cập trang khi chưa đăng nhập

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Chưa đăng nhập |
| **Steps** | 1. Truy cập trực tiếp URL: `http://localhost:5173/purchase-orders` |
| **Expected** | - Tự chuyển hướng về `/login`<br>- Sau khi đăng nhập, quay lại `/purchase-orders` (redirect back) |
| **Status** | |

### AUTH-07: Redirect back sau đăng nhập

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Chưa đăng nhập |
| **Steps** | 1. Truy cập `http://localhost:5173/shipments`<br>2. Bị redirect về `/login`<br>3. Đăng nhập với `admin@kbfe.local / admin123` |
| **Expected** | - Sau đăng nhập, chuyển hướng đúng về `/shipments` (không phải Dashboard) |
| **Status** | |

### AUTH-08: Tự động đăng nhập khi đã có session

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập trước đó (localStorage còn dữ liệu user) |
| **Steps** | 1. Đóng trình duyệt<br>2. Mở lại và truy cập `http://localhost:5173/login` |
| **Expected** | - Tự chuyển hướng đến Dashboard (không hiện form đăng nhập) |
| **Status** | |

---

## 3. Module Dashboard

### DASH-01: Hiển thị Dashboard sau đăng nhập

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập với role ADMIN hoặc PIC_MANAGER |
| **Steps** | 1. Click menu **Dashboard** trên sidebar |
| **Expected** | - Hiển thị trang Dashboard tại URL `/`<br>- Hiển thị các KPI metrics (PO Overview, Lot Distribution, Shipment metrics…)<br>- Không có lỗi console |
| **Status** | |

### DASH-02: Hiển thị số liệu Shipment metrics

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập, ở trang Dashboard, có dữ liệu shipment trong hệ thống |
| **Steps** | 1. Quan sát phần Shipment metrics trên Dashboard |
| **Expected** | - Hiển thị các chỉ số: In Transit, Awaiting Supplier, Arrived Port, Delivered<br>- Số liệu khớp với tổng số shipment ở trang Shipments |
| **Status** | |

### DASH-03: Navigate từ Dashboard đến chi tiết

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập, ở trang Dashboard |
| **Steps** | 1. Click vào một card/metric trên Dashboard có link đến module chi tiết (vd: PO, Shipment) |
| **Expected** | - Chuyển đến trang chi tiết tương ứng<br>- Dữ liệu hiển thị đúng |
| **Status** | |

### DASH-04: Risk queue hiển thị đúng

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có dữ liệu risk (overdue tasks, delayed shipments, blocked items) |
| **Steps** | 1. Quan sát phần Risk Queue trên Dashboard |
| **Expected** | - Hiển thị danh sách các item có risk/overdue<br>- Mỗi item hiển thị mức độ severity và SLA |
| **Status** | |

---

## 4. Module Master Data

### MD-01: Truy cập Master Data với role ADMIN

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với `admin@kbfe.local` (role ADMIN) |
| **Steps** | 1. Click menu **Master Data** trên sidebar |
| **Expected** | - Hiển thị trang Master Data tại URL `/master-data`<br>- Hiển thị các tab/section: Currencies, Incoterms, Transport Modes, Suppliers, Items, Item Groups |
| **Status** | |

### MD-02: Tạo mới Currency

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Master Data, tab Currencies |
| **Steps** | 1. Nhấn nút **Tạo mới** (hoặc nút +)<br>2. Nhập Currency Code: `EUR`<br>3. Nhập Currency Name: `Euro`<br>4. Nhập Symbol: `€`<br>5. Nhập Decimal Places: `2`<br>6. Nhấn **Lưu** |
| **Expected** | - Hiển thị thông báo tạo thành công<br>- Currency mới xuất hiện trong danh sách<br>- Các field hiển thị đúng giá trị đã nhập |
| **Status** | |

### MD-03: Sửa Currency

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có ít nhất 1 currency trong danh sách |
| **Steps** | 1. Click vào currency cần sửa<br>2. Đổi Currency Name thành giá trị mới<br>3. Nhấn **Lưu** |
| **Expected** | - Thông báo cập nhật thành công<br>- Giá trị mới hiển thị đúng trong danh sách |
| **Status** | |

### MD-04: Xóa Currency

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có currency chưa được sử dụng bởi bất kỳ PO/DO nào |
| **Steps** | 1. Click vào currency cần xóa<br>2. Nhấn nút **Xóa**<br>3. Xác nhận xóa |
| **Expected** | - Thông báo xóa thành công<br>- Currency biến mất khỏi danh sách |
| **Status** | |

### MD-05: CRUD Incoterm

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Master Data, tab Incoterms |
| **Steps** | 1. **Tạo:** Nhấn tạo mới → nhập Code: `CIF`, Name: `Cost, Insurance and Freight` → Lưu<br>2. **Đọc:** Xác nhận incoterm mới hiện trong danh sách<br>3. **Sửa:** Click vào incoterm → sửa description → Lưu<br>4. **Xóa:** Chọn incoterm → Xóa → Xác nhận |
| **Expected** | - Mỗi thao tác có thông báo thành công<br>- Danh sách cập nhật đúng sau mỗi thao tác |
| **Status** | |

### MD-06: CRUD Transport Mode

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Master Data, tab Transport Modes |
| **Steps** | 1. **Tạo:** Nhấn tạo mới → nhập Mode Code, Mode Type (SEA/AIR/ROAD), Mode Name, is_international → Lưu<br>2. **Đọc:** Xác nhận mode mới hiện trong danh sách<br>3. **Sửa:** Click → sửa thông tin → Lưu<br>4. **Xóa:** Chọn → Xóa → Xác nhận |
| **Expected** | - Tạo/Sửa/Xóa thành công với thông báo phù hợp |
| **Status** | |

### MD-07: CRUD Supplier

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Master Data, tab Suppliers |
| **Steps** | 1. **Tạo:** Nhấn tạo mới → nhập:<br>&nbsp;&nbsp;- Supplier Code: `SUP-001`<br>&nbsp;&nbsp;- Supplier Name: `ABC Trading Co.`<br>&nbsp;&nbsp;- Roles: chọn `SUPPLIER`<br>&nbsp;&nbsp;- Contact Name, Email, Phone<br>&nbsp;&nbsp;- Default Currency, Default Incoterm<br>&nbsp;&nbsp;- Country, Address<br>&nbsp;&nbsp;→ Lưu<br>2. **Đọc:** Xác nhận supplier hiện trong danh sách<br>3. **Sửa:** Click → sửa contact info → Lưu<br>4. **Xóa:** Chọn → Xóa → Xác nhận |
| **Expected** | - Supplier tạo thành công với đầy đủ thông tin<br>- Roles hiển thị đúng (SUPPLIER, FORWARDER, CUSTOMS_BROKER, TRUCKING_VENDOR…) |
| **Status** | |

### MD-08: CRUD Item Group

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Master Data, tab Item Groups |
| **Steps** | 1. **Tạo:** Nhập Group Code, Group Name, Description, Default HS Code → Lưu<br>2. **Đọc:** Xác nhận item group hiện trong danh sách<br>3. **Sửa:** Click → sửa → Lưu<br>4. **Xóa:** Chọn → Xóa → Xác nhận |
| **Expected** | - CRUD thành công |
| **Status** | |

### MD-09: CRUD Item + Tax Profile

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã có ít nhất 1 Item Group |
| **Steps** | 1. **Tạo Item:** Nhập Item Code, Item Name, chọn Item Group, Unit (PCS/KG/BOX), Origin Country → Lưu<br>2. **Thêm Tax Profile:** Mở detail item → thêm Tax Profile:<br>&nbsp;&nbsp;- HS Code: `8471.30.00`<br>&nbsp;&nbsp;- Import Duty Rate: `5%`<br>&nbsp;&nbsp;- VAT Rate: `10%`<br>&nbsp;&nbsp;- Excise Tax Rate: `0%`<br>&nbsp;&nbsp;- Đánh dấu `is_default`<br>&nbsp;&nbsp;→ Lưu<br>3. **Sửa Tax Profile:** Đổi Import Duty Rate → Lưu<br>4. **Xóa Tax Profile:** Chọn → Xóa |
| **Expected** | - Item tạo thành công, hiển thị trong danh sách<br>- Tax Profile gắn đúng với item<br>- Flag `is_default` hoạt động đúng |
| **Status** | |

### MD-10: Role gate — SALE_STAFF không truy cập được Master Data

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với tài khoản có role SALE_STAFF |
| **Steps** | 1. Kiểm tra sidebar → không có menu Master Data<br>2. Truy cập trực tiếp URL `/master-data` |
| **Expected** | - Menu Master Data không hiển thị trên sidebar<br>- Truy cập trực tiếp URL → hiển thị trang Unauthorized hoặc redirect |
| **Status** | |

---

## 5. Module Purchase Orders (PO)

### PO-01: Xem danh sách Purchase Orders

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với role ADMIN hoặc PIC_MANAGER |
| **Steps** | 1. Click menu **Purchase Orders** trên sidebar |
| **Expected** | - Hiển thị trang PO tại URL `/purchase-orders`<br>- Hiển thị bảng danh sách PO với các cột: PO No, Supplier, Status, Currency, ETD, ETA…<br>- Có thanh tìm kiếm và bộ lọc trạng thái<br>- Phân trang hoạt động (20 item/trang) |
| **Status** | |

### PO-02: Tìm kiếm PO theo PO Number

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang PO List, có ít nhất 1 PO trong hệ thống |
| **Steps** | 1. Nhập PO number vào ô tìm kiếm (vd: `PO-2026`)<br>2. Quan sát danh sách |
| **Expected** | - Danh sách lọc đúng các PO có mã chứa từ khóa<br>- Xóa từ khóa → hiển thị lại toàn bộ |
| **Status** | |

### PO-03: Lọc PO theo trạng thái

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang PO List, có PO ở nhiều trạng thái khác nhau |
| **Steps** | 1. Click vào tab lọc trạng thái (DRAFT, SENT, CONFIRMED…)<br>2. Quan sát danh sách |
| **Expected** | - Chỉ hiển thị PO có trạng thái tương ứng<br>- Badge đếm số lượng trên mỗi tab đúng |
| **Status** | |

### PO-04: Tạo mới Purchase Order

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã có Supplier, Currency, Incoterm, Transport Mode trong Master Data |
| **Steps** | 1. Nhấn nút **Tạo PO mới**<br>2. Nhập thông tin header:<br>&nbsp;&nbsp;- PO Number (hoặc để auto-generate)<br>&nbsp;&nbsp;- Chọn Supplier từ dropdown<br>&nbsp;&nbsp;- Chọn PO Type: `SEA`<br>&nbsp;&nbsp;- Chọn Currency: `USD`<br>&nbsp;&nbsp;- Chọn Incoterm: `FOB`<br>&nbsp;&nbsp;- Chọn Transport Mode<br>&nbsp;&nbsp;- Nhập Expected ETD, Expected ETA<br>3. Thêm Line Items:<br>&nbsp;&nbsp;- Chọn Item từ dropdown<br>&nbsp;&nbsp;- Qty Ordered: `100`<br>&nbsp;&nbsp;- Unit Price: `50`<br>&nbsp;&nbsp;- Tax Rate: `10%`<br>4. Nhấn **Lưu** |
| **Expected** | - PO tạo thành công với status = `DRAFT`<br>- Hiển thị trong danh sách PO<br>- Line items hiển thị đúng thông tin, amount = qty × unit_price |
| **Status** | |

### PO-05: Sửa Purchase Order (trạng thái DRAFT)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO ở trạng thái `DRAFT` |
| **Steps** | 1. Click vào PO trong danh sách để mở detail<br>2. Sửa thông tin header (vd: đổi Exchange Rate)<br>3. Thêm/sửa/xóa Line Item<br>4. Nhấn **Lưu** |
| **Expected** | - Cập nhật thành công<br>- Thông tin mới hiển thị đúng<br>- Status vẫn là `DRAFT` |
| **Status** | |

### PO-06: Gửi PO cho Supplier (DRAFT → SENT)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO ở trạng thái `DRAFT` với ít nhất 1 line item hợp lệ |
| **Steps** | 1. Mở PO detail<br>2. Nhấn nút **Gửi** (Send) |
| **Expected** | - Status chuyển từ `DRAFT` → `SENT`<br>- Badge status cập nhật màu tương ứng<br>- Không thể chỉnh sửa header fields nữa (disabled/readonly) |
| **Status** | |

### PO-07: Xác nhận Supplier (SENT → CONFIRMED)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO ở trạng thái `SENT` |
| **Steps** | 1. Mở PO detail<br>2. Nhấn **Supplier Confirmation**<br>3. Nhập cargo_ready_date, chọn can_fulfill = Yes<br>4. Nhấn **Xác nhận** |
| **Expected** | - Status chuyển thành `CONFIRMED`<br>- Thông tin confirmation hiển thị đúng (cargo ready date, fulfilled status) |
| **Status** | |

### PO-08: Chuyển trạng thái CONFIRMED → IN_PRODUCTION → READY_TO_SHIP

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO ở trạng thái `CONFIRMED` |
| **Steps** | 1. Mở PO detail<br>2. Nhấn **Mark In Production** → xác nhận<br>3. Kiểm tra status = `IN_PRODUCTION`<br>4. Nhấn **Mark Ready to Ship** → xác nhận<br>5. Kiểm tra status = `READY_TO_SHIP` |
| **Expected** | - Mỗi lần chuyển trạng thái có thông báo thành công<br>- Status badge cập nhật đúng<br>- Các nút action thay đổi phù hợp với trạng thái hiện tại |
| **Status** | |

### PO-09: Hủy PO (Cancel)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO ở trạng thái không phải `CANCELLED` |
| **Steps** | 1. Mở PO detail<br>2. Nhấn nút **Hủy** (Cancel)<br>3. Xác nhận hủy |
| **Expected** | - Status chuyển thành `CANCELLED`<br>- Tất cả nút action bị ẩn/disabled<br>- PO không thể chỉnh sửa |
| **Status** | |

### PO-10: Lot Planning — Xem board phân lô

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO với ít nhất 1 line item, status ≥ CONFIRMED |
| **Steps** | 1. Mở PO detail<br>2. Chuyển đến tab/section **Lot Planning** |
| **Expected** | - Hiển thị board phân lô với LOT-001 mặc định<br>- Các line items hiển thị trong lot với qty_ordered, qty_lotted |
| **Status** | |

### PO-11: Lot Planning — Tạo Lot mới

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở Lot Planning board của PO |
| **Steps** | 1. Nhấn nút **Tạo Lot mới**<br>2. Nhập thông tin lot (tên, ghi chú)<br>3. Nhấn **Lưu** |
| **Expected** | - Lot mới xuất hiện trên board với status `PLANNED`<br>- Board có ≥ 2 lots |
| **Status** | |

### PO-12: Lot Planning — Split line giữa các lot

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | PO có ≥ 2 lots và line item trong LOT-001, lot status = `PLANNED` |
| **Steps** | 1. Chọn 1 line item trong LOT-001<br>2. Nhấn **Split**<br>3. Nhập số lượng muốn tách sang lot mới<br>4. Chọn lot đích<br>5. Xác nhận |
| **Expected** | - Line item được tách: qty trong lot nguồn giảm, lot đích có line mới với qty đã tách<br>- Tổng qty_lotted không thay đổi |
| **Status** | |

### PO-13: Lot Planning — Move line giữa các lot

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | PO có ≥ 2 lots, lot status = `PLANNED` |
| **Steps** | 1. Chọn 1 line item<br>2. Nhấn **Move**<br>3. Chọn lot đích<br>4. Xác nhận |
| **Expected** | - Line item chuyển hoàn toàn sang lot đích<br>- Lot nguồn không còn line đó |
| **Status** | |

### PO-14: Lot Planning — Không thể sửa lot đã lock

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có lot ở trạng thái `ASSIGNED_TO_SHIPMENT` hoặc `SHIPPED` |
| **Steps** | 1. Thử split/move line trong lot đã lock |
| **Expected** | - Các nút Split/Move bị ẩn hoặc disabled<br>- Không thể thay đổi line items trong lot đã lock |
| **Status** | |

---

## 6. Module Delivery Orders (DO)

### DO-01: Xem danh sách Delivery Orders

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với role có quyền xem DO (ADMIN, PIC_MANAGER, PORT_OFFICER, CUSTOMS_OFFICER, WAREHOUSE_STAFF) |
| **Steps** | 1. Click menu **Delivery Orders** trên sidebar |
| **Expected** | - Hiển thị trang DO tại URL `/delivery-orders`<br>- Bảng danh sách DO với các cột: DO No, PO Ref, Status, Transport Mode, ETD, ETA…<br>- Tab lọc theo nhóm trạng thái: Processing, Handover, Customs, Completed, Issues<br>- Phân trang 20 item/trang |
| **Status** | |

### DO-02: Tạo DO từ PO Lots

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO với lot ở trạng thái `READY` (hoặc `PLANNED`) |
| **Steps** | 1. Ở trang PO detail hoặc DO list, nhấn **Tạo DO từ Lots**<br>2. Chọn PO nguồn<br>3. Chọn lot(s) cần tạo DO<br>4. Nhập DO number (hoặc để auto)<br>5. Nhấn **Tạo** |
| **Expected** | - DO mới tạo thành công với status `DRAFT` hoặc `CREATED`<br>- DO chứa các lines tương ứng với lot đã chọn<br>- Lot status chuyển sang `ASSIGNED_TO_SHIPMENT` (nếu applicable) |
| **Status** | |

### DO-03: Xem DO Detail

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có ít nhất 1 DO trong hệ thống |
| **Steps** | 1. Click vào 1 DO trong danh sách |
| **Expected** | - Hiển thị detail view với đầy đủ thông tin:<br>&nbsp;&nbsp;- Header: DO No, PO Ref, Status, Transport Mode<br>&nbsp;&nbsp;- Logistics Shipping: Port of Departure/Destination, ETD/ETA<br>&nbsp;&nbsp;- Warehouse: Warehouse Code, Deadline<br>&nbsp;&nbsp;- Lines/Lots: Danh sách line items<br>&nbsp;&nbsp;- Quotations tab |
| **Status** | |

### DO-04: Chuyển trạng thái CREATED → READY_FOR_QUOTATION

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có DO ở trạng thái `CREATED` |
| **Steps** | 1. Mở DO detail<br>2. Nhấn **Ready for Quotation** |
| **Expected** | - Status chuyển thành `READY_FOR_QUOTATION`<br>- Có thể bắt đầu tạo Quotation cho DO này |
| **Status** | |

### DO-05: Chuyển trạng thái sau khi Quotation confirmed

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DO ở trạng thái `READY_FOR_QUOTATION`, có Quotation đã được confirm và mark final |
| **Steps** | 1. Mở DO detail<br>2. Xác nhận quotation → status DO chuyển `QUOTATION_CONFIRMED`<br>3. Nhấn **Assign to Shipment** → status DO chuyển `ASSIGNED_TO_SHIPMENT` |
| **Expected** | - Mỗi chuyển trạng thái có thông báo<br>- DO ở trạng thái `ASSIGNED_TO_SHIPMENT` sẵn sàng cho tạo Shipment |
| **Status** | |

### DO-06: Hủy DO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có DO ở trạng thái cho phép hủy |
| **Steps** | 1. Mở DO detail<br>2. Nhấn **Hủy**<br>3. Xác nhận |
| **Expected** | - Status chuyển thành `CANCELLED`<br>- Các actions bị ẩn<br>- Lot liên quan được unlock (nếu applicable) |
| **Status** | |

### DO-07: Tab lọc DO theo nhóm trạng thái

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có DO ở nhiều trạng thái khác nhau |
| **Steps** | 1. Ở trang DO List, click lần lượt các tab:<br>&nbsp;&nbsp;- **Processing** (DRAFT, CREATED, READY_FOR_QUOTATION, QUOTATION_CONFIRMED)<br>&nbsp;&nbsp;- **Handover** (ASSIGNED_TO_SHIPMENT, IN_TRANSIT, ARRIVED_PORT, CUSTOMS_PROCESSING, WAREHOUSE_PENDING)<br>&nbsp;&nbsp;- **Completed** (CLOSED, DELIVERED)<br>&nbsp;&nbsp;- **Issues** (DELAYED, CANCELLED) |
| **Expected** | - Mỗi tab chỉ hiển thị DO thuộc nhóm trạng thái tương ứng<br>- Số đếm trên tab badge đúng |
| **Status** | |

---

## 7. Module Quotation (trong DO)

### QT-01: Tạo Quotation cho DO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DO ở trạng thái `READY_FOR_QUOTATION` |
| **Steps** | 1. Mở DO detail → tab **Quotations**<br>2. Nhấn **Tạo Quotation mới**<br>3. Chọn Shipping Mode (SEA/AIR/ROAD)<br>4. Nhấn **Tạo** |
| **Expected** | - Quotation mới tạo với status `DRAFT`<br>- Quotation No auto-generate theo format `QT-{doNo}-{timestamp}`<br>- Hiển thị trong danh sách quotations của DO |
| **Status** | |

### QT-02: Thêm Charge Lines vào Quotation

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có Quotation ở trạng thái `DRAFT` |
| **Steps** | 1. Mở Quotation detail<br>2. Nhấn **Thêm Charge Line**<br>3. Nhập:<br>&nbsp;&nbsp;- Charge Type: `OCEAN_FREIGHT`<br>&nbsp;&nbsp;- Description: `Ocean freight charge`<br>&nbsp;&nbsp;- Quantity: `1`<br>&nbsp;&nbsp;- Unit Price: `2500`<br>&nbsp;&nbsp;- Tax Rate: `0%`<br>4. Nhấn **Lưu**<br>5. Thêm thêm charge line: `LOCAL_CHARGE`, qty=1, price=350 |
| **Expected** | - Mỗi charge line hiển thị đúng: amount = qty × unit_price<br>- Total amount = tổng tất cả charge lines<br>- Quotation type tự suy luận từ charge lines (OCEAN_FREIGHT → type FREIGHT) |
| **Status** | |

### QT-03: Sửa/Xóa Charge Line

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Quotation `DRAFT` có ít nhất 1 charge line |
| **Steps** | 1. Click vào charge line cần sửa → đổi unit_price → Lưu<br>2. Chọn charge line khác → Xóa → Xác nhận |
| **Expected** | - Sửa: giá trị mới cập nhật, total recalculate<br>- Xóa: line biến mất, total recalculate |
| **Status** | |

### QT-04: Workflow Quotation: DRAFT → REQUESTED → RECEIVED → SUBMITTED → CONFIRMED

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Quotation ở trạng thái `DRAFT` với charge lines |
| **Steps** | 1. Nhấn **Send Preliminary** → status = `REQUESTED`<br>2. Nhấn **Receive** → status = `RECEIVED`<br>3. Nhấn **Submit to KBI** → status = `SUBMITTED_TO_KBI`<br>4. Nhấn **Confirm by KBI** → status = `CONFIRMED_BY_KBI` |
| **Expected** | - Mỗi bước chuyển trạng thái thành công<br>- UI status badge hiển thị đúng mapping:<br>&nbsp;&nbsp;- REQUESTED → "Preliminary Sent"<br>&nbsp;&nbsp;- RECEIVED → "Official Sent"<br>&nbsp;&nbsp;- SUBMITTED_TO_KBI → "Official Sent"<br>&nbsp;&nbsp;- CONFIRMED_BY_KBI → "Approved" |
| **Status** | |

### QT-05: Mark Quotation Final

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Quotation ở trạng thái `CONFIRMED_BY_KBI` |
| **Steps** | 1. Nhấn **Mark Final** |
| **Expected** | - Quotation có flag `is_final = true`<br>- UI hiển thị status "Booked"<br>- DO có thể chuyển sang `QUOTATION_CONFIRMED` |
| **Status** | |

### QT-06: Reject Quotation

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Quotation ở trạng thái ≥ RECEIVED |
| **Steps** | 1. Nhấn **Reject**<br>2. Xác nhận |
| **Expected** | - Status chuyển thành `REJECTED`<br>- Không thể thao tác thêm trên quotation này<br>- Có thể tạo quotation version mới |
| **Status** | |

### QT-07: Tạo Quotation Version mới

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có quotation đã bị REJECTED hoặc cần revise |
| **Steps** | 1. Nhấn **Create New Version**<br>2. Sửa charge lines cho phiên bản mới<br>3. Thực hiện lại workflow |
| **Expected** | - Version mới tạo thành công, liên kết cùng quotation_group_id<br>- Có thể xem lịch sử các versions |
| **Status** | |

---

## 8. Module Shipments

### SH-01: Xem danh sách Shipments

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với role có quyền (ADMIN, PIC_MANAGER, PORT_OFFICER, CUSTOMS_OFFICER, FINANCE_OFFICER, WAREHOUSE_STAFF) |
| **Steps** | 1. Click menu **Shipments** trên sidebar |
| **Expected** | - Hiển thị trang tại URL `/shipments`<br>- Bảng danh sách với cột: Shipment No, DO Ref, Mode, Status, Carrier, POL, POD, ETD, ETA…<br>- Bộ lọc trạng thái và tìm kiếm<br>- Phân trang |
| **Status** | |

### SH-02: Tạo Shipment từ DO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DO ở trạng thái `ASSIGNED_TO_SHIPMENT` và có final quotation |
| **Steps** | 1. Nhấn **Tạo Shipment**<br>2. Chọn DO nguồn<br>3. Nhập thông tin:<br>&nbsp;&nbsp;- Shipment Number (hoặc auto)<br>&nbsp;&nbsp;- Shipping Mode: `SEA`<br>&nbsp;&nbsp;- Carrier Name<br>&nbsp;&nbsp;- Vessel/Flight<br>&nbsp;&nbsp;- Voyage No<br>&nbsp;&nbsp;- B/L AWB No<br>&nbsp;&nbsp;- Container Numbers<br>&nbsp;&nbsp;- POL, POD<br>&nbsp;&nbsp;- ETD, ETA<br>4. Nhấn **Tạo** |
| **Expected** | - Shipment tạo thành công với status `BOOKING_PENDING` hoặc `BOOKING_CONFIRMED`<br>- Lines tự động kế thừa từ DO<br>- Milestones khởi tạo với 10 bước |
| **Status** | |

### SH-03: Xem Shipment Detail — Tabs

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có ít nhất 1 Shipment |
| **Steps** | 1. Click vào Shipment trong danh sách<br>2. Duyệt qua các tab: **Overview, Milestones, Documents, Customs Declarations, Costs, Tasks, Carrier DO, DTOs** |
| **Expected** | - Mỗi tab load đúng dữ liệu<br>- Không có lỗi khi chuyển tab<br>- Tab active highlight đúng |
| **Status** | |

### SH-04: Milestone flow — Đánh dấu hoàn thành từng milestone

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment ở trạng thái `BOOKING_CONFIRMED` |
| **Steps** | 1. Mở tab **Milestones**<br>2. Đánh dấu từng milestone theo thứ tự:<br>&nbsp;&nbsp;① BOOKING_CONFIRMED → ② CARGO_READY → ③ PICKED_UP → ④ BL_ISSUED → ⑤ GATE_IN_POL → ⑥ ATD → ⑦ CUSTOMS_DRAFT → ⑧ ARRIVAL_NOTICE → ⑨ CUSTOMS_CLEARED → ⑩ DELIVERED<br>3. Với mỗi milestone, nhập actual date và nhấn **Mark Done** |
| **Expected** | - Mỗi milestone chuyển sang trạng thái hoàn thành<br>- Planned date vs Actual date hiển thị đúng<br>- Shipment status cập nhật tương ứng với milestone hiện tại<br>- Milestone tiếp theo được enable<br>- Không thể đánh dấu milestone khi bước trước chưa hoàn thành |
| **Status** | |

### SH-05: Quản lý Documents — Upload

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở Shipment detail, tab **Documents** |
| **Steps** | 1. Nhấn **Upload Document**<br>2. Chọn loại document: `COMMERCIAL_INVOICE`<br>3. Chọn file (PDF, PNG, JPEG, hoặc WebP)<br>4. Nhấn **Upload** |
| **Expected** | - Document upload thành công<br>- Hiển thị trong danh sách documents với: file name, size, loại, ngày upload<br>- Status document = `DRAFT` |
| **Status** | |

### SH-06: Quản lý Documents — Verify / Reject

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có document ở trạng thái `RECEIVED` |
| **Steps** | 1. Click vào document<br>2. Nhấn **Verify** → status = `VERIFIED`<br>3. (Hoặc) Upload document khác → nhấn **Reject** → status = `REJECTED` |
| **Expected** | - Verify: document badge chuyển xanh "Verified"<br>- Reject: document badge chuyển đỏ "Rejected" |
| **Status** | |

### SH-07: Quản lý Documents — Xóa

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có document ở trạng thái `DRAFT` |
| **Steps** | 1. Chọn document<br>2. Nhấn **Xóa** → Xác nhận |
| **Expected** | - Document bị xóa khỏi danh sách |
| **Status** | |

### SH-08: Sửa thông tin Shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment chưa ở trạng thái terminal (DELIVERED, CANCELLED) |
| **Steps** | 1. Mở Shipment detail<br>2. Sửa thông tin: Carrier, Vessel, Container Numbers, ETD/ETA<br>3. Nhấn **Lưu** |
| **Expected** | - Thông tin cập nhật thành công<br>- Giá trị mới hiển thị đúng |
| **Status** | |

### SH-09: Hủy Shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment ở trạng thái cho phép hủy |
| **Steps** | 1. Mở Shipment detail<br>2. Nhấn **Hủy** → Xác nhận |
| **Expected** | - Status chuyển thành `CANCELLED`<br>- Tất cả actions disabled |
| **Status** | |

---

## 9. Module Customs Declaration (trong Shipment)

### CD-01: Tạo Customs Declaration từ Shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment ở trạng thái ≥ `CUSTOMS_DRAFT` |
| **Steps** | 1. Mở Shipment detail → tab **Customs Declarations**<br>2. Nhấn **Tạo Customs Declaration**<br>3. Chọn Customs Type: `IMPORT`<br>4. Chọn Broker (supplier có role CUSTOMS_BROKER)<br>5. Nhấn **Tạo** |
| **Expected** | - Declaration tạo thành công với status `DRAFT`<br>- Lines tự động map từ Shipment lines (nếu applicable) |
| **Status** | |

### CD-02: Thêm/Sửa Declaration Lines

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Customs Declaration ở trạng thái `DRAFT` |
| **Steps** | 1. Mở Declaration detail<br>2. Nhấn **Thêm Line**<br>3. Nhập:<br>&nbsp;&nbsp;- Line No: `1`<br>&nbsp;&nbsp;- HS Code: `8471.30.00`<br>&nbsp;&nbsp;- Quantity: `100`, Unit: `PCS`<br>&nbsp;&nbsp;- Origin Country: `CN`<br>&nbsp;&nbsp;- Customs Value: `5000`<br>&nbsp;&nbsp;- Currency: `USD`<br>&nbsp;&nbsp;- Import Duty Rate: `5%`<br>&nbsp;&nbsp;- VAT Rate: `10%`<br>4. Nhấn **Lưu** |
| **Expected** | - Line thêm thành công với thông tin đúng<br>- Tax amounts tính toán chính xác |
| **Status** | |

### CD-03: Workflow: DRAFT → DRAFT_OPENED → OFFICIAL_OPENED → SUBMITTED → CLEARED

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Customs Declaration ở trạng thái `DRAFT` với ít nhất 1 line |
| **Steps** | 1. Nhấn **Open Draft** → status = `DRAFT_OPENED`<br>2. Nhấn **Open Official** → status = `OFFICIAL_OPENED`<br>&nbsp;&nbsp;- Nhập Declaration Number (nếu cần)<br>&nbsp;&nbsp;- Chọn Customs Channel: `GREEN` / `YELLOW` / `RED`<br>3. Nhấn **Submit** → status = `SUBMITTED`<br>4. (Nếu channel = YELLOW/RED) Nhấn **Inspection** → status = `INSPECTION`<br>5. Nhấn **Clear** → status = `CLEARED` |
| **Expected** | - Mỗi bước chuyển trạng thái thành công<br>- Customs Channel gán lúc official opening và persist trên shipment<br>- Sau OFFICIAL_OPENED: không thể sửa declaration lines<br>- Sau CLEARED: shipment có thể tiến đến milestone CUSTOMS_CLEARED |
| **Status** | |

### CD-04: Customs Channel — luồng Xanh (GREEN)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Declaration ở trạng thái `DRAFT_OPENED` |
| **Steps** | 1. Nhấn **Open Official** với channel = `GREEN`<br>2. Submit<br>3. Clear (không qua Inspection) |
| **Expected** | - Không yêu cầu bước Inspection<br>- Flow nhanh: OFFICIAL_OPENED → SUBMITTED → CLEARED<br>- Customs channel trên shipment = GREEN |
| **Status** | |

### CD-05: Customs Channel — luồng Đỏ (RED)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Declaration ở trạng thái `DRAFT_OPENED` |
| **Steps** | 1. Nhấn **Open Official** với channel = `RED`<br>2. Submit<br>3. Nhấn **Inspection** → status = `INSPECTION`<br>4. Sau inspection, nhấn **Clear** |
| **Expected** | - Bắt buộc qua bước Inspection trước khi Clear<br>- Customs channel trên shipment = RED (persist sau clearance) |
| **Status** | |

### CD-06: Hủy Customs Declaration

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Declaration chưa ở trạng thái CLEARED |
| **Steps** | 1. Nhấn **Cancel** → xác nhận |
| **Expected** | - Status = `CANCELLED`<br>- Có thể tạo declaration mới cho shipment |
| **Status** | |

---

## 10. Module Carrier Delivery Order (trong Shipment)

### CDO-01: Tạo Carrier DO cho Shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment đã có customs clearance (hoặc đang xử lý), ở tab **Carrier DO** |
| **Steps** | 1. Nhấn **Tạo Carrier DO**<br>2. Nhập thông tin:<br>&nbsp;&nbsp;- Carrier DO No<br>&nbsp;&nbsp;- Forwarder (supplier có role FORWARDER)<br>&nbsp;&nbsp;- Container No<br>&nbsp;&nbsp;- Release Location<br>&nbsp;&nbsp;- Local Charge Amount, Currency<br>&nbsp;&nbsp;- Issued Date, Expired Date<br>3. Nhấn **Tạo** |
| **Expected** | - CDO tạo thành công với status `PENDING`<br>- Hiển thị trong danh sách CDO của shipment |
| **Status** | |

### CDO-02: Workflow: PENDING → ISSUED → RELEASED

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | CDO ở trạng thái `PENDING` |
| **Steps** | 1. Nhấn **Issue** → status = `ISSUED`<br>2. Nhấn **Release** → status = `RELEASED` |
| **Expected** | - Mỗi chuyển trạng thái có thông báo<br>- RELEASED = hàng có thể thu thập tại release location |
| **Status** | |

### CDO-03: Hủy Carrier DO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | CDO chưa ở trạng thái RELEASED |
| **Steps** | 1. Nhấn **Cancel** → Xác nhận |
| **Expected** | - Status = `CANCELLED`<br>- Có thể tạo CDO mới |
| **Status** | |

---

## 11. Module Domestic Transport Orders (DTO)

### DTO-01: Xem danh sách DTO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với role có quyền (ADMIN, PIC_MANAGER, PORT_OFFICER, CUSTOMS_OFFICER, FINANCE_OFFICER, WAREHOUSE_STAFF) |
| **Steps** | 1. Click menu **Domestic Transport Orders** trên sidebar |
| **Expected** | - Hiển thị trang tại URL `/domestic-transport-orders`<br>- Bảng danh sách DTO: DTO No, Shipment Ref, Status, Truck Vendor, Origin, Destination, Scheduled Pickup/Delivery<br>- Bộ lọc và tìm kiếm |
| **Status** | |

### DTO-02: Tạo DTO từ Shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment ở trạng thái ≥ `CUSTOMS_CLEARED` |
| **Steps** | 1. Mở Shipment detail → tab **DTOs**<br>2. Nhấn **Tạo DTO**<br>3. Nhập thông tin:<br>&nbsp;&nbsp;- Origin, Destination, Warehouse<br>&nbsp;&nbsp;- Vehicle Type, Vehicle Plate<br>&nbsp;&nbsp;- Driver Name, Driver Phone<br>&nbsp;&nbsp;- Truck Vendor (supplier có role TRUCKING_VENDOR)<br>&nbsp;&nbsp;- Scheduled Pickup, Scheduled Delivery<br>4. Nhấn **Tạo** |
| **Expected** | - DTO tạo thành công với status `DRAFT`<br>- DTO tự động link với shipment<br>- Hiển thị trong cả danh sách DTO chung và tab DTOs của shipment |
| **Status** | |

### DTO-03: Workflow DTO: DRAFT → QUOTE_PENDING → QUOTED → QUOTE_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → POD_RECEIVED → CLOSED

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DTO ở trạng thái `DRAFT` |
| **Steps** | 1. **DRAFT → QUOTE_PENDING:** Nhấn action "Quote Pending"<br>2. **QUOTE_PENDING → QUOTED:** Nhận báo giá → cập nhật thông tin giá<br>3. **QUOTED → QUOTE_CONFIRMED:** Nhấn "Confirm Quote"<br>4. **QUOTE_CONFIRMED → DISPATCHED:** Nhấn "Dispatch"<br>5. **DISPATCHED → IN_TRANSIT:** Nhấn "Start Transit"<br>6. **IN_TRANSIT → DELIVERED:** Nhấn "Deliver" + nhập actual_delivery_at<br>7. **DELIVERED → POD_RECEIVED:** Cập nhật POD document reference<br>8. **POD_RECEIVED → CLOSED:** Nhấn "Close" |
| **Expected** | - Mỗi chuyển trạng thái thành công với thông báo<br>- Badge status cập nhật đúng màu và text<br>- Dates (actual_pickup_at, actual_delivery_at) ghi nhận đúng<br>- POD document ref bắt buộc trước khi close |
| **Status** | |

### DTO-04: Link/Unlink DTO với Shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có DTO và Shipment đã tồn tại |
| **Steps** | 1. Mở Shipment detail → tab **DTOs**<br>2. Nhấn **Link DTO** → chọn DTO có sẵn → Xác nhận<br>3. Kiểm tra DTO hiện trong danh sách<br>4. Nhấn **Unlink** trên DTO → Xác nhận |
| **Expected** | - Link: DTO xuất hiện trong tab DTOs của shipment<br>- Unlink: DTO bị gỡ khỏi shipment (không xóa DTO, chỉ bỏ liên kết)<br>- Quan hệ many-to-many hoạt động đúng |
| **Status** | |

### DTO-05: Hủy DTO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DTO chưa ở trạng thái CLOSED hoặc CANCELLED |
| **Steps** | 1. Mở DTO detail<br>2. Nhấn **Cancel** → Xác nhận |
| **Expected** | - Status = `CANCELLED`<br>- Tất cả actions disabled |
| **Status** | |

---

## 12. Module Tasks

### TASK-01: Xem Task Board

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với role có quyền |
| **Steps** | 1. Click menu **Tasks** trên sidebar |
| **Expected** | - Hiển thị trang Tasks tại URL `/tasks`<br>- Task board hiển thị tasks theo stage:<br>&nbsp;&nbsp;SUPPLIER_CONFIRMATION → LOT_PLANNING → INTERNAL_DO → QUOTATION → SHIPMENT → CUSTOMS → CARRIER_DO → DTO |
| **Status** | |

### TASK-02: Lọc tasks theo trạng thái

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có tasks ở nhiều trạng thái |
| **Steps** | 1. Sử dụng bộ lọc: TODO, IN_PROGRESS, BLOCKED, COMPLETED… |
| **Expected** | - Danh sách chỉ hiển thị tasks có trạng thái tương ứng |
| **Status** | |

### TASK-03: Cập nhật Task status

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có task ở trạng thái `TODO` |
| **Steps** | 1. Click vào task<br>2. Chuyển status: TODO → IN_PROGRESS<br>3. Lưu |
| **Expected** | - Status cập nhật thành công<br>- Task di chuyển đúng vị trí trên board |
| **Status** | |

### TASK-04: Block/Unblock Task

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có task ở trạng thái `IN_PROGRESS` |
| **Steps** | 1. Click vào task<br>2. Nhấn **Block** → nhập blocked_reason<br>3. Kiểm tra status = `BLOCKED`<br>4. Nhấn **Resume** → status trở lại `IN_PROGRESS` |
| **Expected** | - Block: task hiển thị badge BLOCKED với lý do<br>- Resume: task trở lại IN_PROGRESS, reason bị xóa |
| **Status** | |

### TASK-05: Cập nhật Priority

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có task bất kỳ |
| **Steps** | 1. Click vào task<br>2. Đổi Priority: LOW → HIGH<br>3. Lưu |
| **Expected** | - Priority badge cập nhật đúng (màu + text)<br>- Priorities: LOW (xanh), MEDIUM (vàng), HIGH (cam), URGENT (đỏ) |
| **Status** | |

### TASK-06: SLA/Overdue tracking

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có task với due_at đã qua |
| **Steps** | 1. Quan sát task trên board |
| **Expected** | - Task quá hạn hiển thị badge/indicator "Overdue"<br>- Delay badge hiển thị số ngày trễ |
| **Status** | |

---

## 13. Module Profile & Settings

### PROF-01: Xem Profile

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập |
| **Steps** | 1. Click avatar → chọn **Profile**<br>(hoặc truy cập `/profile`) |
| **Expected** | - Hiển thị trang Profile với 2 tab: **Identity** và **Security**<br>- Tab Identity: avatar, fullName, position, department, phoneNumber, workLocation, workShift, defaultWarehouseCode, preferredModule, operationFocus, profileNote<br>- Badge hiển thị role hiện tại |
| **Status** | |

### PROF-02: Cập nhật Profile — Core Fields

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Identity |
| **Steps** | 1. Sửa Full Name: `Nguyen Van Test`<br>2. Sửa Position: `Senior PIC`<br>3. Chọn Department: `Sales Operations`<br>4. Nhập Phone Number: `+84 900 111 222`<br>5. Nhấn **Lưu** |
| **Expected** | - Thông báo "Profile saved" hiện lên<br>- Thông tin cập nhật đúng<br>- Header hiển thị tên mới |
| **Status** | |

### PROF-03: Cập nhật Profile — ERP Preferences

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Identity |
| **Steps** | 1. Nhập Work Location: `HCM Office`<br>2. Nhập Work Shift: `Office hours`<br>3. Nhập Default Warehouse Code: `WH-HCM`<br>4. Chọn Preferred Module: `Purchase Orders`<br>5. Nhập Operation Focus: `Sea FCL`<br>6. Nhập Profile Note: `Test note`<br>7. Nhấn **Lưu** |
| **Expected** | - Tất cả thông tin cập nhật thành công<br>- Sau logout → login lại, redirect đến `/purchase-orders` (preferred module) |
| **Status** | |

### PROF-04: Upload Avatar

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Identity |
| **Steps** | 1. Nhấn **Upload** ở section Avatar<br>2. Chọn file ảnh (PNG/JPEG/WebP, ≤ 1.5MB)<br>3. Nhấn **Lưu** |
| **Expected** | - Avatar preview hiển thị ảnh mới<br>- Sau lưu, avatar cập nhật trên header |
| **Status** | |

### PROF-05: Upload Avatar quá kích thước

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile |
| **Steps** | 1. Upload file ảnh > 1.5MB |
| **Expected** | - Hiển thị lỗi "Avatar too large"<br>- Avatar không thay đổi |
| **Status** | |

### PROF-06: Đổi Email (tab Security)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Security |
| **Steps** | 1. Nhập Email mới: `newemail@kbfe.local`<br>2. Nhập Current Password<br>3. Nhấn **Save Email** |
| **Expected** | - Thông báo "Email saved"<br>- Email cập nhật trong profile |
| **Status** | |

### PROF-07: Đổi Password (tab Security)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Security |
| **Steps** | 1. Nhập Current Password<br>2. Nhập New Password (≥ 6 ký tự)<br>3. Nhập Confirm Password (trùng khớp)<br>4. Nhấn **Update Password** |
| **Expected** | - Thông báo "Password saved"<br>- Form reset về trống |
| **Status** | |

### PROF-08: Đổi Password — Confirm không khớp

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Security |
| **Steps** | 1. Nhập New Password: `newpass123`<br>2. Nhập Confirm Password: `different456`<br>3. Nhấn **Update Password** |
| **Expected** | - Hiển thị lỗi validation "Password mismatch" dưới ô Confirm Password<br>- Không submit |
| **Status** | |

### SET-01: Đổi Appearance Mode

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Truy cập `/settings`, tab Preferences |
| **Steps** | 1. Chọn Appearance Mode: `Dark`<br>2. Quan sát giao diện |
| **Expected** | - Giao diện chuyển sang Dark mode ngay lập tức<br>- Giá trị "Current Appearance" hiển thị "Dark"<br>- Preference lưu vào localStorage, persist sau reload |
| **Status** | |

### SET-02: Đổi Language (vi ↔ en)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Settings |
| **Steps** | 1. Đổi Language sang `English`<br>2. Quan sát toàn bộ giao diện |
| **Expected** | - Tất cả label, menu, button text chuyển sang Tiếng Anh<br>- Format số thay đổi (1.000 → 1,000)<br>- Đổi lại `Tiếng Việt` → giao diện trở về Tiếng Việt |
| **Status** | |

### SET-03: Đổi Color Preset

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Settings |
| **Steps** | 1. Chọn Color Preset khác (vd: từ Blue → Green)<br>2. Quan sát |
| **Expected** | - Accent color thay đổi trên toàn bộ giao diện (buttons, links, badges…)<br>- Theme Preview cập nhật |
| **Status** | |

### SET-04: Đổi Density

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Settings |
| **Steps** | 1. Chọn Density: Compact / Default / Comfortable |
| **Expected** | - Khoảng cách giữa các phần tử thay đổi (padding, margin, font-size)<br>- Bảng dữ liệu hiển thị dày hơn (compact) hoặc thưa hơn (comfortable) |
| **Status** | |

### SET-05: Admin — Quản lý tài khoản

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với `admin@kbfe.local` (role ADMIN), ở trang Settings |
| **Steps** | 1. Click tab **Accounts**<br>2. Điền form tạo tài khoản mới:<br>&nbsp;&nbsp;- Full Name: `Test User`<br>&nbsp;&nbsp;- Email: `test@kbfe.local`<br>&nbsp;&nbsp;- Password: `test123` (≥ 6 ký tự)<br>&nbsp;&nbsp;- Role: chọn `PORT_OFFICER`<br>&nbsp;&nbsp;- Position: `Port Staff`<br>&nbsp;&nbsp;- Department: `Port Operations`<br>3. Nhấn **Create Account** |
| **Expected** | - Thông báo tạo tài khoản thành công<br>- Tài khoản mới xuất hiện trong bảng danh sách<br>- Form reset về trống |
| **Status** | |

### SET-06: Non-Admin không thấy tab Accounts

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với `manager@kbfe.local` (role PIC_MANAGER) |
| **Steps** | 1. Truy cập `/settings`<br>2. Kiểm tra có tab Accounts không<br>3. Truy cập `/settings?section=accounts` |
| **Expected** | - Tab Accounts không hiển thị<br>- URL param `section=accounts` tự chuyển thành `section=preferences` |
| **Status** | |

---

## 14. Luồng E2E toàn trình — Golden Path

> Kịch bản này test toàn bộ luồng nghiệp vụ từ đầu đến cuối:
> **PO → Lot Planning → DO → Quotation → Shipment → Customs → Carrier DO → DTO → Delivered**

### GP-01: Golden Path — End-to-End

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | - Đăng nhập với role ADMIN<br>- Đã có Master Data: Supplier (roles: SUPPLIER + FORWARDER + CUSTOMS_BROKER + TRUCKING_VENDOR), Currency (USD), Incoterm (FOB), Transport Mode (SEA), Items với Tax Profile |

#### Bước 1: Tạo Purchase Order

| Step | Thao tác | Expected |
|---:|---|---|
| 1 | Vào **Purchase Orders** → **Tạo PO mới** | Form tạo PO hiển thị |
| 2 | Nhập header: Supplier, PO Type=SEA, Currency=USD, Incoterm=FOB, ETD, ETA | Fields chấp nhận giá trị |
| 3 | Thêm 2 Line Items: Item A (qty=200, price=50), Item B (qty=100, price=80) | Lines hiển thị, total tính đúng |
| 4 | Nhấn **Lưu** | PO tạo thành công, status=DRAFT |

#### Bước 2: Gửi PO & Xác nhận Supplier

| Step | Thao tác | Expected |
|---:|---|---|
| 5 | Nhấn **Send** | Status → SENT |
| 6 | Nhấn **Supplier Confirmation** → nhập cargo_ready_date, can_fulfill=Yes | Status → CONFIRMED |
| 7 | Nhấn **Mark In Production** | Status → IN_PRODUCTION |
| 8 | Nhấn **Mark Ready to Ship** | Status → READY_TO_SHIP |

#### Bước 3: Lot Planning

| Step | Thao tác | Expected |
|---:|---|---|
| 9 | Mở tab **Lot Planning** | Board hiện LOT-001 mặc định chứa 2 lines |
| 10 | Tạo **LOT-002** | Lot mới xuất hiện trên board |
| 11 | **Split** Item A: 100 qty sang LOT-002 | LOT-001: Item A=100, LOT-002: Item A=100 |
| 12 | **Move** Item B sang LOT-002 | LOT-001: Item A=100 / LOT-002: Item A=100 + Item B=100 |

#### Bước 4: Tạo Delivery Order từ Lots

| Step | Thao tác | Expected |
|---:|---|---|
| 13 | Nhấn **Tạo DO từ Lots** → chọn LOT-001 | DO-1 tạo thành công, chứa Item A=100 |
| 14 | Tạo DO thứ 2 từ LOT-002 | DO-2 tạo thành công, chứa Item A=100 + Item B=100 |

#### Bước 5: Quotation cho DO

| Step | Thao tác | Expected |
|---:|---|---|
| 15 | Mở DO-1 → **Ready for Quotation** | Status DO = READY_FOR_QUOTATION |
| 16 | Tạo Quotation → thêm charge lines (OCEAN_FREIGHT: $2500, LOCAL_CHARGE: $350) | Quotation tạo, total=$2850 |
| 17 | Workflow: Send Preliminary → Receive → Submit to KBI → Confirm by KBI | Quotation status = CONFIRMED_BY_KBI |
| 18 | **Mark Final** | is_final=true, DO status → QUOTATION_CONFIRMED |

#### Bước 6: Tạo Shipment

| Step | Thao tác | Expected |
|---:|---|---|
| 19 | DO-1 → **Assign to Shipment** | Status = ASSIGNED_TO_SHIPMENT |
| 20 | **Tạo Shipment** → nhập mode=SEA, carrier, vessel, voyage, B/L, containers, POL, POD, ETD, ETA | Shipment tạo thành công |
| 21 | Kiểm tra tab **Milestones** | 10 milestones hiển thị với planned dates |

#### Bước 7: Milestone tracking

| Step | Thao tác | Expected |
|---:|---|---|
| 22 | Mark milestones: BOOKING_CONFIRMED → CARGO_READY → PICKED_UP → BL_ISSUED → GATE_IN_POL → ATD | Shipment status cập nhật theo milestone |
| 23 | Upload documents: COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING | 3 documents hiển thị trong tab Documents |
| 24 | Verify documents | Document status = VERIFIED |

#### Bước 8: Customs Declaration

| Step | Thao tác | Expected |
|---:|---|---|
| 25 | Mark milestone **CUSTOMS_DRAFT** | Shipment status = CUSTOMS_DRAFT |
| 26 | Tab Customs → **Tạo Customs Declaration** (type=IMPORT, broker=supplier) | Declaration tạo, status=DRAFT |
| 27 | Thêm declaration lines với HS code, duty rates, VAT | Lines hiển thị với tax tính đúng |
| 28 | Workflow: Open Draft → Open Official (channel=GREEN) → Submit → Clear | Declaration status = CLEARED |
| 29 | Mark milestone **CUSTOMS_CLEARED** | Shipment customs_channel = GREEN |

#### Bước 9: Carrier DO

| Step | Thao tác | Expected |
|---:|---|---|
| 30 | Tab Carrier DO → **Tạo CDO** (carrier_do_no, release_location, local_charge) | CDO tạo, status=PENDING |
| 31 | **Issue** CDO | Status = ISSUED |
| 32 | **Release** CDO | Status = RELEASED |

#### Bước 10: Domestic Transport Order

| Step | Thao tác | Expected |
|---:|---|---|
| 33 | Tab DTOs → **Tạo DTO** (origin, destination, truck_vendor, schedule) | DTO tạo, status=DRAFT |
| 34 | Workflow: Quote Pending → Confirm Quote → Dispatch → Start Transit → Deliver (nhập actual dates) | DTO status từng bước đúng |
| 35 | Cập nhật POD document reference → **Close** | DTO status = CLOSED |

#### Bước 11: Hoàn tất Shipment

| Step | Thao tác | Expected |
|---:|---|---|
| 36 | Mark milestone **DELIVERED** | Shipment status = DELIVERED |
| 37 | Kiểm tra Dashboard | Shipment metrics cập nhật: +1 Delivered |

#### Kết quả cuối cùng

| Entity | Final Status |
|---|---|
| Purchase Order | READY_TO_SHIP |
| Lot (LOT-001) | SHIPPED |
| Delivery Order | DELIVERED / CLOSED |
| Quotation | FINAL (is_final=true) |
| Shipment | DELIVERED |
| Customs Declaration | CLEARED |
| Carrier DO | RELEASED |
| DTO | CLOSED |

---

## 15. Negative & Edge Cases

### NEG-01: Truy cập route không tồn tại

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập |
| **Steps** | 1. Truy cập URL: `http://localhost:5173/non-existent-page` |
| **Expected** | - Hiển thị trang **Not Found** |
| **Status** | |

### NEG-02: Truy cập module không có quyền

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập với role không có quyền truy cập module (vd: SALE_STAFF truy cập `/delivery-orders`) |
| **Steps** | 1. Truy cập trực tiếp URL module bị hạn chế |
| **Expected** | - Hiển thị trang **Unauthorized** (`/unauthorized`)<br>- Hoặc redirect về Dashboard |
| **Status** | |

### NEG-03: Submit form PO thiếu Supplier

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đang tạo PO mới |
| **Steps** | 1. Điền các field khác nhưng không chọn Supplier<br>2. Nhấn **Lưu** |
| **Expected** | - Hiển thị lỗi validation tại field Supplier<br>- PO không được tạo |
| **Status** | |

### NEG-04: Submit PO Line với qty = 0

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đang tạo/sửa PO |
| **Steps** | 1. Thêm line item với Qty Ordered = 0<br>2. Nhấn **Lưu** |
| **Expected** | - Line với qty=0 bị lọc ra (không được lưu)<br>- Hoặc hiển thị validation error |
| **Status** | |

### NEG-05: Tạo Shipment khi DO chưa có final quotation

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DO ở trạng thái READY_FOR_QUOTATION, chưa có quotation final |
| **Steps** | 1. Thử tạo Shipment từ DO này |
| **Expected** | - Nút tạo Shipment bị disabled hoặc ẩn<br>- Hoặc hiển thị thông báo "Quotation chưa được duyệt" |
| **Status** | |

### NEG-06: Đánh dấu milestone không theo thứ tự

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment ở milestone BOOKING_CONFIRMED (milestone 1) |
| **Steps** | 1. Thử đánh dấu milestone BL_ISSUED (milestone 4) trước khi hoàn thành CARGO_READY (milestone 2) |
| **Expected** | - Milestone 4 bị disabled<br>- Chỉ milestone tiếp theo (milestone 2) mới có thể đánh dấu |
| **Status** | |

### NEG-07: Sửa declaration lines sau khi Official Opening

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Customs Declaration ở trạng thái `OFFICIAL_OPENED` |
| **Steps** | 1. Thử thêm/sửa/xóa declaration line |
| **Expected** | - Các nút Thêm/Sửa/Xóa bị ẩn hoặc disabled<br>- Lines ở chế độ read-only |
| **Status** | |

### NEG-08: Tạo tài khoản với email không hợp lệ (Admin)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập Admin, ở Settings → Accounts |
| **Steps** | 1. Nhập Email: `invalid-email`<br>2. Điền đầy đủ các field khác<br>3. Nhấn **Create Account** |
| **Expected** | - Validation error: "Email không hợp lệ"<br>- Tài khoản không được tạo |
| **Status** | |

### NEG-09: Tạo tài khoản với password < 6 ký tự

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập Admin, ở Settings → Accounts |
| **Steps** | 1. Nhập Password: `12345` (5 ký tự)<br>2. Điền đầy đủ các field khác<br>3. Nhấn **Create Account** |
| **Expected** | - Validation error tại field Password<br>- Tài khoản không được tạo |
| **Status** | |

### NEG-10: Profile — để trống Full Name

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Ở trang Profile, tab Identity |
| **Steps** | 1. Xóa trống ô Full Name<br>2. Nhấn **Lưu** |
| **Expected** | - Validation error: "Full name is required"<br>- Profile không được cập nhật |
| **Status** | |

### NEG-11: Cancel entities ở trạng thái terminal

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có PO/DO/Shipment/DTO ở trạng thái CANCELLED hoặc DELIVERED/CLOSED |
| **Steps** | 1. Mở entity detail<br>2. Kiểm tra xem có nút Cancel không |
| **Expected** | - Nút Cancel không hiển thị ở trạng thái terminal<br>- Không thể thực hiện bất kỳ action nào |
| **Status** | |

### NEG-12: Lot Planning — Split qty lớn hơn qty có sẵn

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Lot có line item với qty = 100 |
| **Steps** | 1. Split line → nhập qty = 150 (> 100) |
| **Expected** | - Validation error hoặc qty bị giới hạn ≤ qty có sẵn<br>- Thao tác bị từ chối |
| **Status** | |

### NEG-13: Global Search — tìm entity không tồn tại

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập |
| **Steps** | 1. Click vào ô Global Search<br>2. Nhập: `NONEXISTENT-99999` |
| **Expected** | - Hiển thị "No results found" hoặc danh sách trống<br>- Không có lỗi |
| **Status** | |

### NEG-14: Refresh toàn bộ cache

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đã đăng nhập, đang ở bất kỳ trang nào |
| **Steps** | 1. Nhấn nút **Refresh** trên header (global refresh) |
| **Expected** | - Tất cả query cache bị invalidate<br>- Dữ liệu load lại mới nhất<br>- Không mất trạng thái UI (tab, filter…) |
| **Status** | |

---

> **Ghi chú cho Tester:**
> - Điền cột **Status** sau khi test: `PASS` / `FAIL` / `SKIP` / `BLOCKED`
> - Nếu `FAIL`: ghi chú bug kèm screenshot vào cột ghi chú hoặc file bug report riêng
> - Test trên cả 2 ngôn ngữ (vi/en) cho các case liên quan đến i18n
> - Test responsive: thu nhỏ cửa sổ trình duyệt kiểm tra sidebar collapse, bảng scroll ngang
> - Khuyến nghị test theo thứ tự: Master Data → PO → DO → Quotation → Shipment → Customs → CDO → DTO → Tasks (theo đúng luồng nghiệp vụ)
