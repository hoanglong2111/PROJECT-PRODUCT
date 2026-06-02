---
name: i18n-translation
description: Use when translating or synchronizing terminology across English and Vietnamese locale files (e.g., messages.ts) in the KBFE project.
---

# i18n Translation & Terminology Synchronization

## Purpose

Ensure absolute separation of languages and maintain strict adherence to the GD1 Logistics Control Tower terminology dictionary across all UI screens. It prevents bilingual mixing (e.g., "Shipments / Lô hàng") and enforces consistent domain language for both English and Vietnamese users.

## Use When

- A user requests to translate a new feature, screen, or component.
- Updating `src/shared/i18n/messages.ts` or related translation files.
- Terminology inconsistencies or mixed languages are detected between English and Vietnamese strings.
- Standardizing legacy terms (e.g., "Delivery Orders") to GD1 terms.

## Do Not Use When

- Refactoring internal code logic or variables that do not affect user-facing text.
- Modifying backend database schemas or API contracts (unless translating enums specifically intended for UI mapping).

## Inputs

- The target keys or text to be translated.
- The context of the UI component (Dashboard, Delivery Orders, eFMS, etc.).

## Workflow

1. Locate the target English (`en`) and Vietnamese (`vi`) objects, primarily in `src/shared/i18n/messages.ts`.
2. Audit the strings to ensure English strings do not contain Vietnamese, and Vietnamese strings do not contain English (unless it's an approved abbreviation like PR, PO).
3. Apply standard GD1 terms consistently:
   - "Delivery Order" / "Delivery Orders" / "DO" -> **"Shipment(s)"** (EN), **"Lô hàng"** (VI).
   - "Purchase Order" -> **"Purchase Order"** (EN), **"Đơn mua hàng"** (VI).
   - "Purchase Request" -> **"Purchase Request"** (EN), **"Yêu cầu mua hàng"** (VI).
   - "Task Management" -> **"Task Management"** (EN), **"Quản lý công việc"** (VI).
   - "Dashboard" -> **"Dashboard"** (EN), **"Tổng quan"** (VI).
4. For domain-specific terms (eFMS, Customs, Finance), use industry-standard terminology. Some terms may remain in English within the Vietnamese locale if widely accepted (e.g., "Debit Note", "Commercial Invoice", "Draft B/L").
5. Execute the replacements carefully, ensuring exact syntax for dynamic interpolation variables is preserved (e.g., `{count}`, `{days}`).
6. Validate integrity by running TypeScript compilation.

## Output

- Updated translation files (e.g., `messages.ts`) with clear, synchronized, and culturally appropriate terminology.

## Tools

- `multi_replace_file_content` or `replace_file_content` to safely update specific translation lines.
- `run_command` -> `pnpm typecheck` to ensure the TypeScript `MessageKey` interface remains strictly identical between both `en` and `vi` objects.

## Safety

- **Never** modify the object keys (the left side of the colon); only translate the string values (the right side).
- **Never** mix languages within a single string value (e.g., completely avoid formats like "Shipment / Lô hàng").
- **Always** ensure dynamic variables (like `{percent}`, `{id}`) remain perfectly matching between both languages.

## Quality Bar

- [ ] Frontmatter is valid YAML and includes `name` and `description`.
- [ ] The English object contains strictly English text.
- [ ] The Vietnamese object contains strictly Vietnamese text (with exceptions for universal acronyms like PR, PO, DO, HBL, ETA).
- [ ] Legacy terms like "Delivery Orders" are entirely eradicated from UI strings.
- [ ] `pnpm typecheck` passes with `Exit code: 0`.
