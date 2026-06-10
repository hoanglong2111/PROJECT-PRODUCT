---
name: agent-skill-builder
description: >
  Creates well-structured, reusable SKILL.md files for agent workflows. Use whenever
  a user wants to: create a new skill, design an agent skill, turn a workflow or SOP
  into a skill, standardize a repeating task for the agent, or refactor an existing
  skill. Trigger on phrases like "create a skill", "build a skill", "make this reusable",
  "turn this into a skill", "write an instruction for the agent", or "capture this workflow".
  Use this skill only when the user explicitly intends to create, refactor, or formalize
  a skill — not for general questions about skills or SKILL.md format.
---

# Agent Skill Builder

Turns a user's workflow or task description into a complete, well-structured SKILL.md file
ready for use as an agent skill.

---

## Inputs

| Field | Required | Description |
|-------|----------|-------------|
| skill_goal | YES | What the skill should enable the agent to do |
| task_type | optional | Suggested: code-gen, api, db-design, testing, docs, data-transform, analysis, planning, tool-use, integration, review, automation |
| input_data | optional | What the skill receives |
| expected_output | optional | What the skill must produce |
| constraints | optional | Technical or business constraints |
| examples | optional | Sample inputs/outputs |
| existing_skill | optional | Current SKILL.md if refactoring |

If inputs are missing: make reasonable assumptions, state them with "> Assumption:", and
produce a draft immediately. Ask at most one clarifying question — never block on a perfect brief.

---

## Output: a complete SKILL.md with these sections

1. YAML frontmatter — name (kebab-case) + description (the trigger mechanism)
2. One-line summary — what the skill does in plain language
3. When to Use — 3-5 specific trigger contexts
4. Inputs — required vs optional, with types
5. Outputs — concrete deliverables, format specified
6. Workflow — numbered, verb-first steps in execution order
7. Rules — constraints keeping the agent in scope
8. Validation Checklist — pass/fail criteria for the output
9. Error Handling — responses to missing data, ambiguity, failures
10. Example — a realistic, fully-written sample (not placeholder text)

Keep SKILL.md under 150 lines. If the skill is complex, move reference content to a
references/ subdirectory and link to it from the main file.

---

## Output Mode

Return results in this order — no long preamble unless the user asks for reasoning:

1. Any assumptions made (brief, with `> Assumption:` prefix)
2. Suggested file path: `<project-root>/skills/<skill-name>/SKILL.md`
3. Complete SKILL.md in a single markdown code block
4. One-line prompt: "Does the workflow match your mental model?"

Do not generate tool implementation code. Do not create folder structures unless asked.

---

## Workflow

1. Extract intent — Read the request. Pull goal, task type, and any visible examples
   from the conversation. Do not ask if the answer is already present.

2. Decide whether to ask or assume — If ambiguity is non-blocking (e.g., output format,
   language preference), make an assumption and note it. Only ask one question if the
   ambiguity changes the core purpose of the skill (e.g., "is this for code generation
   or documentation?"). In either case, do not wait — produce a draft in the same turn.

3. Write the frontmatter first.
   - name: kebab-case, specific (e.g., express-crud-generator not api-skill)
   - description: 3-5 sentences covering what it does, when to trigger, and 3+ exact
     trigger phrases. Write it slightly pushy — lean toward triggering over missing.

4. Write the skill body following the Output section above. Each workflow step must
   start with a verb and specify what gets produced. Vague steps like "process the data"
   are not allowed.

5. Write a real Example section — show actual frontmatter, actual workflow steps
   written correctly, not just a list of section names. The example should be complete
   enough that someone could copy it as a starting template.

6. Self-validate using the checklist below before presenting the output.

7. Present the draft and ask: does the workflow match your mental model? Revise once
   based on feedback, then finalize.

---

## Rules

- Frontmatter name and description are mandatory — without them the skill never triggers.
- Scope must be narrow enough to describe in one sentence. If not, split into two skills.
- Every workflow step must be actionable. No generic verbs without a specific object.
- Example section must contain real content — no placeholder or TBD.
- If refactoring: preserve the original name field exactly.
- If the skill involves destructive operations (delete, overwrite, deploy), add an explicit
  confirmation step in the workflow.
- Always suggest a file path for the generated skill using the pattern: `<project-root>/skills/<skill-name>/SKILL.md`
- Do not generate tool implementation code inside a skill — skills are instructions,
  not implementations. If the skill depends on a tool, describe its required contract only.

---

## Validation Checklist

| Check | Pass Criteria |
|-------|---------------|
| Frontmatter complete | name and description both present and non-empty |
| Description triggers | Contains 3+ specific trigger phrases |
| Inputs labeled | Required vs optional clearly marked |
| Outputs concrete | Format, structure, and deliverables named explicitly |
| Workflow ordered | Steps numbered, verb-first, each produces something |
| Example is real | No placeholders — actual names, steps, and content |
| Error handling present | Covers missing input and ambiguous scope |
| Under 150 lines | Or has references/ with clear pointers |

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Request too vague | Draft with Assumption callouts. Offer to refine after review. |
| Output format unspecified | Use the most common format for that task type. |
| Scope too broad | Split into two focused skills. Name each clearly. |
| Missing required input | Add a check at step 1 of workflow: if X is missing, prompt user or apply assumption Y. |
| Refactoring a read-only file | Copy to /tmp/skill-name/, edit the copy, present from there. |

---

## Example

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