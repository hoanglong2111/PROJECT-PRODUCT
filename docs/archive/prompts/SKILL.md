---
name: project-skill-creator
description: Use when creating or updating concise project-local SKILL.md files for AI agents or subagents from a brief, workflow, tool rules, or project constraints.
---

# Project Skill Creator

## Purpose

Create or revise focused `SKILL.md` files that help an AI agent handle one reusable class of work in this project. The result should be practical, scoped, and easy for an agent to load without wasting context.

## Use When

- A user asks to create, update, review, or refine a skill.
- Notes, prompts, workflows, or team conventions need to become a project-local `SKILL.md`.
- An existing skill is too broad, too vague, missing frontmatter, or missing operational steps.
- A subagent needs a clear guide for a repeated task.

## Do Not Use When

- The request is a normal feature, bug fix, test, or documentation change.
- The user needs a plugin, connector, or external integration package instead of a skill.
- The task only needs a one-off prompt and should not become reusable project guidance.

## Inputs

Accept either free-form requirements or this template:

```text
Skill name:
Short description:
Domain:
Target users:
Task types:
Typical inputs:
Expected outputs:
Allowed tools:
Restricted tools:
Special rules:
Detail level:
Language:
```

If input is incomplete:

- infer non-critical details from the project context
- list assumptions when they affect the skill
- do not invent important business, API, security, or permission facts
- ask only when a missing detail would make the skill unsafe or misleading

## Workflow

1. Identify the smallest useful scope for the skill. A good skill handles one focused class of work.
2. Choose a lowercase kebab-case `name` that describes the capability without colliding with existing skills.
3. Write a `description` that says exactly when to use the skill. This is the main activation signal.
4. Create valid YAML frontmatter with required `name` and `description` fields.
5. Draft the body as operational guidance, not general advice.
6. Prefer checklists, short rules, and concrete steps over long prose.
7. Move large examples, schemas, or reference material into separate referenced files only when needed.
8. Keep the skill self-contained enough that an agent can use it without reading unrelated docs.
9. Validate the result against the quality bar before returning or committing it.

## Required Structure

```markdown
---
name: short-skill-name
description: Use when the agent should handle this specific class of work.
---

# Skill Title

## Purpose

What this skill is for and what problem it solves.

## Use When

Concrete triggers for using the skill.

## Do Not Use When

Out-of-scope cases or better alternatives.

## Inputs

Required and optional inputs.

## Workflow

Step-by-step method.

## Output

Expected artifact shape and format.

## Tools

Allowed, preferred, and restricted tools.

## Safety

Rules, boundaries, assumptions, and escalation cases.

## Quality Bar

Checklist for a good answer or artifact.
```

## Output

When creating or updating a skill in a repository, edit the relevant `SKILL.md` directly. When the user only asks for content, return a complete Markdown file that can be saved as `SKILL.md`.

Mention any important assumptions, missing information, or follow-up files that should be created. Keep the final response short and centered on what changed.

## Tools

- Prefer `rg` or `rg --files` to locate existing skills and related instructions.
- Read nearby docs before editing so the skill matches the project's conventions.
- Use `apply_patch` for manual edits.
- Do not create extra `README.md`, changelog, quick reference, or installation files unless the user explicitly asks.

## Safety

- Do not include secrets, credentials, private tokens, or machine-specific paths unless they are already required project conventions.
- Do not invent business rules, API contracts, security requirements, or tool permissions.
- Do not make the skill broad enough to trigger for unrelated work.
- Do not claim a skill is installed or globally active unless its location and metadata support that claim.

## Quality Bar

- Frontmatter is valid YAML and includes `name` and `description`.
- The description clearly states when the skill should be used.
- The skill has one focused responsibility.
- The workflow is actionable without requiring hidden context.
- Inputs, outputs, tools, and safety rules are explicit.
- The body is concise enough to load often.
- The skill avoids broad generic advice and unrelated documentation.
