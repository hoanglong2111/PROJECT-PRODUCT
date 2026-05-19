# Tabs Implementation Pattern

Use this when implementing detail sections with Mantine Tabs.

## Component Pattern

```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">...</Tabs.Panel>
</Tabs>
```

## Rules

- Keep tab value stable.
- Keep critical blockers visible outside tabs too.
- Do not fetch independent heavy data for hidden tabs unless needed.
- Use route/query state for selected tab only if users need shareable tab URLs.

## DO Target Tabs

- `overview`
- `logistics`
- `documents`
- `warehouse`
- `closure`
- `finance`
- `audit`

## Accessibility

Use Mantine Tabs semantics. Avoid replacing tabs with custom div buttons unless necessary.
