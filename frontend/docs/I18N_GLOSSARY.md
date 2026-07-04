# I18N Glossary For Forwarding Terms

This glossary is the source of truth for KBFE translation work. It follows the
KBI-FDS logistics terminology documents, especially File 02 (Logistics Terms and
Data). When adding or changing UI copy, translate descriptive text but keep
industry abbreviations and invariant terms stable across `en` and `vi`.

## Invariant Terms

Keep these terms unchanged in both English and Vietnamese UI:

| Group | Terms |
| --- | --- |
| Dates and milestones | ETD, ETA, ATD, ATA |
| Documents | B/L, AWB, MBL, HBL, C/O, D/O, P.O.D, AN, Draft B/L, Final B/L, Telex Release, Seaway Bill, Debit Note |
| Ports and orders | POL, POD, PO, DO, DTO, PR, RFQ |
| Standards and systems | SLA, HS Code, VNACCS, SAP B1 |
| Incoterms | EXW, FCA, FOB, CIF, CFR, DDP |
| Load and measure | FCL, LCL, TEU, FEU, CBM, VGM |
| Charges and master data | DEM, DET, Landed Cost, Charge Code, UOM codes |
| Common forwarding terms | Container, Booking, Forwarder, Carrier DO, Copy |

`Forwarder`, `Booking`, `Container`, `Debit Note`, and `Landed Cost` stay
invariant because the Vietnamese KBI-FDS documents use them directly in normal
Vietnamese prose. Translating them back into longer Vietnamese phrases makes the
UI less natural for forwarding users.

## Standard Translations

| English | Vietnamese | Note |
| --- | --- | --- |
| Customs (authority/domain) | Hải quan | Use for the authority or domain. |
| Customs clearance / cleared | Thông quan / Đã thông quan | Use for the process or cleared state. |
| Customs declaration | Tờ khai hải quan |  |
| Carrier (generic) | Hãng vận chuyển | Use when transport mode is not specifically sea. |
| Shipping line | Hãng tàu | Use only when the sea context is clear. |
| Airline | Hãng bay |  |
| Shipment | Lô hàng |  |
| Milestone | Mốc | `Milestone` may stay in compact technical labels when it is clearer. |
| Demurrage (DEM) | Phí lưu container tại cảng (DEM) |  |
| Detention (DET) | Phí lưu container tại kho khách (DET) |  |
| Storage | Phí lưu kho/bãi |  |
| Arrival Notice | Thông báo hàng đến (AN) |  |
| Delivery Order | Lệnh giao hàng (D/O) | Keep `Carrier DO` invariant. |
| Gate-in | Hạ bãi / vào cảng (Gate-in) |  |
| Green channel | Luồng xanh |  |
| Yellow channel | Luồng vàng |  |
| Red channel | Luồng đỏ |  |
| Pick-up | Lấy hàng |  |
| Freight | Cước |  |
| Local charges | Phí local (phụ phí đầu cảng) |  |
| Transit time | Thời gian vận chuyển (transit time) |  |
| Surrendered | Đã Telex Release | Avoid `Đã surrender (Telex)`. |

## Writing Rules

- Translate the descriptive part of a phrase and keep invariant terms as-is:
  `B/L Issued` -> `Đã phát hành B/L`; `Gate in POL` -> `Đã vào cảng đi (Gate-in POL)`.
- Do not code-switch English verbs in Vietnamese sentences. Use Vietnamese verbs
  such as `giải phóng hàng`, `phát hành`, `mở`, `nộp`, and `lấy hàng`.
- Use `Hải quan` for the authority/domain and `Thông quan` for the clearance
  process or cleared status.
- Use `Hãng vận chuyển` for generic `Carrier`; use `Hãng tàu` only in clear sea
  contexts.
- Keep UI-only translation changes presentation-scoped. Do not change filters,
  status codes, payload shapes, API contracts, or data model semantics as part of
  copy cleanup.
