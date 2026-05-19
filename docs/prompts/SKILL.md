# Skill Master Prompt

Use this prompt template to create concise project-local `SKILL.md` files for AI agents/subagents.

## Input Template

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

## Generation Instruction

Create a complete `SKILL.md` that helps an AI agent handle one focused class of work. The skill should be reusable, scoped, and operational.

If input is missing:

- infer non-critical details reasonably
- list assumptions
- do not invent important business/API/security facts
- add `Missing Information` only when needed

## Required Structure

```markdown
---
name: short-skill-name
description: One sentence describing when to use this skill.
---

# Skill Title

## Purpose

What this skill is for and what problem it solves.

## Use When

Concrete triggers.

## Do Not Use When

Out-of-scope cases or better skills.

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

Checklist for a good answer/artifact.
```

## Writing Rules

- Keep the skill short enough to load often.
- Prefer checklists and tables over long prose.
- Include project-specific constraints when the skill is for a specific repo.
- Point to references instead of duplicating large docs.
- Make activation conditions clear.
- Make unsafe or out-of-scope behavior explicit.

## Quality Checklist

- The description says exactly when to use the skill.
- The workflow is actionable.
- The output format is clear.
- Tool usage is bounded.
- Safety rules are specific.
- The skill avoids broad generic advice.
