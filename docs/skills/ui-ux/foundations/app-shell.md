# App Shell Foundation

Use this when designing global navigation, sidebar, header, page body, and optional footer behavior.

## Shell Anatomy

```text
AppShell
  Sidebar navigation
  Header / top bar
  Main content body
  Optional footer/status strip
```

## Sidebar

- Keep primary modules visible: Dashboard, Workflow, Purchase Requests, Purchase Orders, Shipments/Delivery Orders, Tasks.
- Use icon + label for primary nav items.
- Highlight the active route clearly.
- Keep future secondary modules grouped below primary modules: Suppliers, Items, Departments, Users, Settings.
- Avoid deep nesting; operational users need fast module switching.

## Header

- Use for compact global context only: app name, environment, workspace, current user/actions, and optional global search.
- Do not duplicate page title in the header if the page header already owns it.
- Keep height stable so page content does not jump between routes.

## Main Body

- The main body should scroll, not the whole shell, when practical.
- Give every page a consistent inner width and vertical rhythm.
- Keep operational content full-width; do not place the whole page inside a decorative card.

## Footer

Use a footer/status strip only for durable system information:

- sync status.
- last refresh time.
- environment.
- background job status.

## Invariants

- Navigation must remain usable on smaller widths.
- Deep-linked routes should land with the correct nav item active.
- Shell changes should not force every page to rework spacing.
