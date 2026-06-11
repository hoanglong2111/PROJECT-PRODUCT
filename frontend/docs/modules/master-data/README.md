# Master Data Module (GD1)

Master Data serves as the system of record for operational constants and lookup profiles within the Kim Binh Platform (GD1).

## Content Structure

- **Partners / Entities:** Profile details for key third parties:
  - **Suppliers:** International supply chain partners, including code, country, payment terms, currency, and standard incoterms.
  - **Carriers:** Domestic transport companies managing vehicles and drivers.
  - **Forwarders:** Freight forwarders handling ocean/air carriage booking.
- **Ports & Gateways:** Standard LOCODE catalogs for airports, sea ports, and land borders.
- **HS Code Tariff Matrix:** Material master items mapped to HS codes with default import duties and VAT rate configurations.

## User Roles

- **ADMIN / PIC_MANAGER:** Write access (CRUD).
- **Other roles:** Read-only access.
