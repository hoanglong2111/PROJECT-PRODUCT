# Worked example — a complete generated SKILL.md

This is the reference example for the `skill-builder` skill: a realistic, fully-written
sample showing actual frontmatter, workflow steps, rules, checklist, and error handling
(not placeholder text). Copy it as a starting template.

**User request:** "Create a skill to generate Express CRUD APIs from a database schema"

> Assumption: TypeScript. Schema provided as SQL DDL or JSON object.
> Assumption: Output follows MVC pattern (routes / controllers / services).

**Suggested path:** `project/skills/express-crud-generator/SKILL.md`

```markdown
---
name: express-crud-generator
description: >
  Generates complete Express.js CRUD API code from a database schema. Use whenever
  the user provides a DB schema and wants backend routes, controllers, or services
  generated. Trigger on: "generate API", "create endpoints", "scaffold routes",
  "build CRUD", or any request to turn a schema into working Express code.
---

# Express CRUD Generator

Reads a database schema and produces a full MVC Express.js API with routes,
controllers, services, validation, and example requests.

## Inputs
| Field | Required | Description |
|-------|----------|-------------|
| schema | YES | SQL DDL or JSON object describing tables and columns |
| framework_preference | optional | Zod or Joi (default: Zod) |

## Outputs
A file tree containing: route files, controller files, service files, Zod schemas,
error middleware, curl examples, and a README listing all generated files.

## Workflow
1. Parse schema — identify tables, columns, primary keys, and foreign keys
2. For each table, generate route file with GET, GET/:id, POST, PUT/:id, DELETE/:id
3. Generate controller — request parsing, response shaping, HTTP status codes
4. Generate service — business logic, DB query calls, error propagation
5. Generate Zod validation schema for POST and PUT request bodies
6. Generate error handling middleware covering 404, 422, and 500 cases
7. Generate sample curl request and expected response for each endpoint
8. Validate — confirm all FK relations have corresponding handlers,
   all routes follow /resource/:id naming convention
9. Output as a file tree with README listing all generated files

## Rules
- Only generate code for tables present in the schema — do not invent fields.
- If a table has no primary key, flag it and skip route generation for that table.

## Validation Checklist
| Check | Pass Criteria |
|-------|---------------|
| All tables covered | Each table has a complete route file |
| FK relations handled | No orphaned foreign key references |
| Naming consistent | All routes follow /resource/:id convention |

## Error Handling
| Situation | Action |
|-----------|--------|
| Schema is empty | Return error: schema must contain at least one table |
| Missing primary key | Skip table, note in README with reason |
| Ambiguous FK relation | Add comment in service layer; flag for manual review |
```
