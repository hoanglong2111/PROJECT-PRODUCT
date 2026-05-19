# Page Anatomy Foundation

Use this before designing any new page. The default KBFE page is an operational work surface.

## Default Page Structure

```text
Page
  Page Header
    Title
    Context subtitle
    Primary action / contextual action
  Optional Context Alert
  Metrics / Summary strip
  Toolbar
    Search
    Filters
    Toggles
    Secondary actions
  Main Content
    Table / list / board / timeline / calendar
  Detail Surface
    Drawer / tabs / modal
```

## Page Header

- Title names the module or entity family.
- Subtitle explains operational scope in one sentence.
- Primary action must advance or inspect the workflow, not advertise features.
- Keep header compact; page content should be visible in the first viewport.

## Consistent Mode

Use this by default for CRUD, dashboard, and operational pages:

- page header.
- compact metrics.
- toolbar with search/filter.
- dense table/list.
- drawer or tabbed detail.

## Divergent Mode

Allow a page to differ when the workflow requires another primary surface:

- Calendar for date planning.
- Kanban for workload staging.
- Map/timeline for logistics tracking.
- AI workspace/chat for guided risk triage.
- Analytics canvas for exploratory analysis.

Even in Divergent Mode, keep navigation, status colors, risk semantics, loading/empty/error states, and entity links consistent.

## New Page Brief

Before designing a new page, capture:

- user role.
- entity/entities involved.
- workflow step.
- primary decision/action.
- required data fields.
- expected density.
- default view and alternate views.
- risk/exception states.
- API/mutation availability.

## Done Checklist

- The page tells users what they are looking at.
- The primary operational action is obvious.
- The page works with empty, loading, and error states.
- The layout can survive long codes, names, and status labels.
