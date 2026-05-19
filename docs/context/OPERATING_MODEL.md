# Logistics Operating Model

This document consolidates the source dossier for the KBFE Digital Logistics Control Tower. It is the canonical project-wide reference for operating flow, hard business rules, SLA timers, and data blocks.

For the detailed eFMS job workflow and SOP code mapping, use `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md`.

## Source Dossier

The operating model was synthesized from 11 source artifacts:

| Source group | Count | Content |
|---|---:|---|
| Entity schemas | 2 | Purchase Request and Delivery Order |
| System document | 1 | eFMS Sea FCL Export logistics data management |
| People/work document | 1 | Task Management |
| Process and architecture PDFs | 2 | SOP and Digital Logistics Control Tower |
| Mindmaps and flowcharts | 4 | PR to warehouse entry, SOP, and responsibility assignment |
| Video | 1 | Supply-chain relay and domino-delay effect |

## Business Scope

KBFE describes a Digital Logistics Control Tower for international logistics and supply-chain operations, with Sea FCL Export as the current reference process.

The control tower monitors the physical movement of goods while keeping operational and financial data synchronized with SAP ERP. The target is to reduce manual entry, synchronize vendor and PO identifiers, and preserve a traceable chain from production demand to warehouse receipt and final finance closure.

## Core Processes

| Process | Summary |
|---|---|
| Demand management | Production creates PRs with `warehouse_deadline_date` as the critical promise date. |
| Coordination and logistics | DOs carry route, customs, port, warehouse, and task execution data. |
| Transport booking | Sale/logistics confirms quotation and reserves carrier space. |
| Customs clearance | Customs declaration follows green/yellow/red lane handling. |
| Delivery and cost closure | Final delivery, POD upload, and finance note issuance close the chain. |

## Operating Relay

The process works as a relay across operational roles. Any late handoff can create downstream delay against the warehouse deadline.

| Stage | Owner | Operational responsibility |
|---|---|---|
| 1. Production and purchasing | PIC Manager / Purchasing | Create PR, create PO, sync SAP, and generate linked DO. |
| 2. Logistics and sales | Sale Staff | Validate shipment information, respond with preliminary quotation within 1 hour, issue official quotation or booking within 8 hours. |
| 3. Port operation | Port Officer | Cross-check Draft B/L, Commercial Invoice, and Packing List within 1 hour, finalize B/L, and issue international freight Debit Note. |
| 4. Customs | Customs Officer | Submit declaration and handle customs lane result. Green clears immediately, yellow requires documents, red requires field inspection. |
| 5. Delivery and accounting | Warehouse / Finance | Verify Telex Release gate, deliver goods, upload POD to cloud storage, issue Final Debit Note, and calculate `delay_days`. |

## Hard Rules

| Rule | System behavior |
|---|---|
| Silence is acceptance | For LCL cargo, if the customer does not respond within 2 hours, the system records acceptance so booking can continue. |
| Document cross-check | Draft B/L, Commercial Invoice, and Packing List must match each other and the quotation before Final B/L confirmation. |
| Two-touch cost separation | International freight Debit Note OF/AF is issued first and remains separate from final inland/local charges. |
| Finance data lock | Selling charges are system-locked against edit/delete after confirmation. Buying charges may be adjusted by authorized users. |

## SLA Timers

| Timer | Trigger |
|---|---|
| 1 hour | Respond with preliminary quotation information. |
| 8 hours | Send official quotation or complete booking hold. |
| 1 hour | Port Officer verifies document consistency. |
| 1 hour | Issue Debit Note OF/AF after receiving complete information. |

## Data Blocks

| Block | Main data |
|---|---|
| PR and DO coordination | `requested_order_id`, production contract, priority, packaging specification, ETD/ETA route data. |
| eFMS transport | MBL, HBL, manifest, booking number, POL/POD, container, seal number, and vehicle type. |
| Charges and notes | Selling, Buying, OBH, Debit Note code S, Credit Note code B, Invoice, and accounting push data. |
| Task Management | PIC Manager, Sale, Port, and Customs task ownership with `progress` from 0 to 100 and `completed_at` timestamp. |

## Derived Outcomes

- `delay_days` is calculated by comparing actual warehouse entry date against the original `warehouse_deadline_date`.
- Missing or mismatched documents block customs readiness and final B/L confirmation.
- Blocked or incomplete required tasks prevent DO closure.
- SAP synchronization state must remain visible on PR, PO, and DO surfaces.
