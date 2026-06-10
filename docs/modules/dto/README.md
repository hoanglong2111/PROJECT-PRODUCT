# Domestic Transport Order (DTO) Module

DTO handles inland trucking after an import shipment reaches customs clearance.

## Trigger

```text
Shipment milestone CUSTOM_CLEARED
-> DTO created or enabled
-> trucking quotation / price adjustment
-> vehicle and driver assignment
-> delivery
-> POD upload
-> close
```

## Scope

In scope:

- Link DTO to the cleared shipment.
- Capture delivery warehouse/address and schedule.
- Store carrier, vehicle plate, driver name, and driver contact.
- Track quoted price, fuel reference snapshots, adjusted price, and exception reason.
- Upload Proof of Delivery (POD).
- Log delivery issues such as delay, vehicle breakdown, or cargo damage.
- Link carrier debit note or settlement reference when available.

Out of scope:

- Bin/rack putaway and warehouse scanning.
- Full accounting ledger.

## Fuel Adjustment Rule

Per SOP/TRD, trucking price can be adjusted from fuel movement:

```text
Adjusted price = Original price * (1 + ((Petrol price at delivery - Petrol price at quote) / Petrol price at quote) * 0.36)
```

Required data:

- Quotation date.
- Petrol price at quote date.
- Delivery date.
- Petrol price at delivery date.
- Original quoted price.
- Adjusted price.
- Adjustment reason/audit log.

## DTO States

```text
DRAFT -> QUOTED -> ASSIGNED -> IN_TRANSIT -> DELIVERED -> CLOSED
CANCELLED
```

## UI Notes

DTO list should show shipment number, PO references, destination, carrier, driver, planned/actual delivery, state, fuel adjustment status, POD status, and issue flag.
