# eFMS Sea FCL Export Workflow

This document is the detailed eFMS workflow for KBFE's Sea FCL Export operating model. It extends the PR/PO/DO control tower by treating a DO as the eFMS shipment job.

## Scope

Unlike a pure forwarder process, KBFE starts from production demand:

```text
Production PR -> Purchasing PO -> SAP sync -> DO/eFMS Job -> Booking -> SI/Manifest/HBL/Container -> Customs -> Delivery/POD -> Notes/Accounting
```

The DO is the bridge between SAP ERP demand data and eFMS logistics execution data.

## Step 0: Production Demand And ERP Integration

| Area | Rule |
|---|---|
| Trigger | Production creates a PR with `warehouse_deadline_date`. |
| Purchasing | Purchasing creates PO from PR source lines. |
| SAP | SAP ERP identifiers for supplier, material, and PO are synchronized into DO. |
| eFMS mapping | DO acts as the shipment/job record in eFMS. |

## Step 1: General Info And Booking

When KBI accepts the quotation, Sale/logistics obtains booking and creates or updates the eFMS job.

Required job data:

- ETD and ETA.
- Master Bill `MBL`.
- Booking number.
- Shipping Line, Vessel, or carrier schedule.
- Port of Loading and Port of Destination.
- Incoterms.

## Step 2: Manifest And Shipping Instruction

Document control must happen before final transport confirmation.

| Item | Requirement |
|---|---|
| Cross-check | Draft B/L, Commercial Invoice, and Packing List must match each other and the quotation. |
| Manifest | Manifest contains cargo, vessel, port, and agent information for customs declaration. |
| Shipping Instruction | SI must include `gross_weight` and `cbm`; both values must be greater than 0 before save. |

## Step 3: House Bill And Container Declaration

House Bill data:

- HBL code.
- Shipper.
- Consignee.
- Place of receipt.
- Place of delivery.
- Linked eFMS job/DO.

Container and field data:

- Container type.
- Container number.
- Seal number.
- Vehicle type.
- Vehicle number.

This data supports Port Officer work at port and field handoff.

## Step 4: Charges And Profit

eFMS separates charges into three streams:

| Stream | Meaning | Edit rule |
|---|---|---|
| Selling | Receivable charges from customer | Locked after confirmation; no edit/delete. |
| Buying | Payable charges to carrier/vendor | Authorized users may adjust/delete. |
| OBH | On-behalf / thu chi ho | Recorded separately from Selling and Buying. |

## Step 5: Debit/Credit Notes And Accounting Sync

Payment follows the SOP two-touch finance flow:

| Note | Timing | Scope |
|---|---|---|
| Debit Note OF/AF | After Final B/L information is complete | International freight charges. |
| Final Debit Note | End of process | Remaining charges, excluding OF/AF already issued. |

Accounting note mapping:

| Code | Target note | Charge stream |
|---|---|---|
| `S` | Debit Note | Selling / receivable |
| `B` | Credit Note | Buying / payable |
| `OBH` | OBH Note | On-behalf / thu chi ho |

Notes must support `Send to Acc` for accounting synchronization.

## Step 6: Assignment And Attachments

Assignment:

- Manager assigns operational tasks to Port Officer, Customs Officer, Finance Officer, or Warehouse Staff.
- Example task: `Make Advance Settlement`.
- Assignees update `progress` from 0 to 100 and set `completed_at` when finished.

Attachments:

- Quotation.
- Customs declaration.
- Draft B/L and Final B/L.
- Arrival Notice.
- Vehicle plate/control number.
- POD / delivery minutes.
- Debit Note, Credit Note, OBH note.

Files are attached to the job and uploaded to KBI Google Drive for electronic storage.

## SOP Flow Codes

The SOP flow is grouped by actor/action family:

| Code family | Meaning |
|---|---|
| `C.*` | Customer/KBI confirmation, rejection, adjustment, or acceptance points. |
| `S.*` | Sale/logistics quotation and booking actions. |
| `O.*` | Operations actions for documents, B/L, customs, release, delivery, and POD. |
| `A.*` | Accounting/finance actions for Debit Notes, invoice, and receivable status. |

## SOP Flow Detail

| Code | Step | Owner | SLA / rule |
|---|---|---|---|
| `C.01` | Send request and order information | KBI / Customer | Starts workflow. |
| `S.01` | Receive information | Sale Staff | Open request intake. |
| `S.02` | Check information completeness | Sale Staff | If incomplete, request additional information. |
| `S.03` | Respond with preliminary information | Sale Staff | Respond within 1 hour. Preliminary response includes quotation ETA and responsible quotation staff. |
| `C.02` | Provide additional information | KBI / Customer | Required when preliminary information is incomplete. |
| `S.04` | Send quotation | Sale Staff | Within 8 hours after `S.03`; urgent cases should be shortened as much as practical. |
| `C.03` | Confirm quotation | KBI / Customer | AIR/FCL requires email acceptance. For LCL, no rejection or adjustment request within 2 hours means accepted. |
| `S.05` | Obtain booking | Sale Staff | Continue after accepted quotation. |
| `O.02` | Receive documents, check, and notify result | Port Officer / Operations | Within 1 hour after receiving Draft B/L, CI, and Packing List. Documents must match each other and quotation. |
| `O.03` | Request information adjustment and update B/L | Operations | Used when information is not suitable. |
| `C.04` | Confirm Draft B/L information | KBI / Customer | Customer accepts or requests adjustment. |
| `C.05` | Confirm Final B/L information | KBI / Customer | Final confirmation before downstream finance/customs. |
| `O.04` | Transfer confirmed Final B/L information | Operations | Triggers OF/AF Debit Note. |
| `A.01` | Send Debit Note OF/AF | Finance | Within 1 hour after complete information from `O.04`. |
| `A.02` | Issue OF/AF invoice | Finance | After accepted Debit Note OF/AF. |
| `O.05` | Update Arrival Notice | Operations | Supports customs and delivery planning. |
| `C.06` | Confirm Debit Note OF/AF | KBI / Customer | Customer accepts or requests adjustment. |
| `O.06` | Check cargo release status, including Telex Release | Operations | If unreleased, request shipper payment. |
| `C.07` | Send shipper payment request | KBI / Customer / Shipper | Required when cargo is not released. |
| `O.07` | Send draft customs declaration | Customs Officer | Customer reviews declaration draft. |
| `C.08` | Confirm customs declaration | KBI / Customer | Customer accepts or requests adjustment. |
| `O.08` | Perform customs declaration | Customs Officer | Submit declaration after acceptance. |
| `O.09` | Classify customs lane | Customs Officer | Green, yellow, or red lane. |
| `O.10` | Notify customs clearance | Customs Officer | Used when goods are cleared. |
| `O.11` | Supplement documents and information | Customs Officer / KBI | Yellow lane handling. |
| `O.12` | Field inspection | Customs Officer / Port Officer | Red lane handling. |
| `O.13` | Handle incident/case | Customs Officer / Manager | Used when inspection finds violation. |
| `O.14` | Receive D.O and continue delivery | Operations | Continue only after release/clearance gates pass. |
| `C.09` | Confirm delivery schedule | KBI / Customer | Customer accepts or requests adjustment. |
| `C.10` | Confirm Final Debit Note | KBI / Customer | Customer accepts or requests adjustment. |
| `A.03` | Receive order dossier | Finance | Start final finance closure. |
| `A.04` | Consolidate dossier and upload to KBI Drive | Finance / Operations | Dossier includes quotation, Final B/L, declaration, vehicle plate/control number, and OBH records. |
| `A.05` | Send Final Debit Note | Finance | Includes remaining charges, excluding OF/AF already issued in `A.01/A.02`. |
| `A.06` | Issue invoice | Finance | After accepted Final Debit Note. |
| `A.07` | Update dossier and receivable status | Finance | Ends finance closure. |

## Decision And Exception Flows

| Decision point | Condition | Next action |
|---|---|---|
| Information completeness | Preliminary information is incomplete | Request KBI to provide additional information, then re-check before quotation. |
| Quotation response | KBI requests adjustment | Revise quotation and send again. |
| Quotation response | KBI rejects | End quotation flow. |
| Quotation response | KBI accepts | Continue to booking. |
| LCL quotation response | KBI is silent for 2 hours without rejection or adjustment request | Treat as accepted and continue to booking. |
| Document check | Draft B/L, CI, Packing List, and quotation do not match | Request information adjustment and update B/L. |
| Draft/Final B/L confirmation | KBI requests adjustment | Update document information and re-confirm. |
| Debit Note OF/AF confirmation | KBI requests adjustment | Finance revises note before invoice. |
| Telex Release gate | Cargo is not released | Send shipper payment request and wait for release. |
| Telex Release gate | Cargo is released | Continue to delivery planning. |
| Delivery schedule | KBI requests adjustment | Revise delivery schedule and re-confirm. |
| Delivery completion | Goods delivered | Notify delivery completion and transfer POD. |
| Final Debit Note confirmation | KBI requests adjustment | Finance revises final note before invoice. |

## Customs Lane Handling

| Lane | Handling |
|---|---|
| Green | Goods are cleared immediately. |
| Yellow | Supplement documents and information. |
| Red | Field inspection. If no violation, continue clearance; if violation exists, handle by case. |

## Closure Gates

The eFMS job/DO cannot be considered complete until:

- Final B/L is confirmed.
- Required customs declaration and release gates are clear.
- POD or delivery minutes are attached.
- Debit Note OF/AF and Final Debit Note are issued as separate finance events.
- Required tasks are completed or explicitly waived.
- Actual warehouse entry is recorded so `delay_days` can be calculated against the original PR `warehouse_deadline_date`.
