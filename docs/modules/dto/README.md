# Domestic Transport Order (DTO) Module (GD1)

The DTO module handles domestic carriage planning, dispatch, cost adjustments, and proof-of-delivery tracking after a Shipment achieves the Customs Cleared milestone.

## Key Workflows

1. **DTO Initialization:** Auto-generated upon `CUSTOMS_CLEARED` shipment event or manually created. Linked 1:1 with a Shipment/DO.
2. **Quotation & Versioning (Quote 1 / Quote 2):**
   - Supports carrier bidding records.
   - Adjusts final freight prices using formula-based fuel triggers against fuel reference price.
3. **Vehicle & Driver Assignment:** Details truck registration plate, driver fullName, and contact phone.
4. **Delivery & POD Upload:** Records actual delivery timestamp and stores the PDF/Image proof of delivery.
5. **Debit Note Linkage:** Links logistics cost allocation logs to specific carrier debit note IDs.
6. **Transport Issues Log:** Flags transit delays, vehicle breakdowns, or cargo damage.
