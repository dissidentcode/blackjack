You are the planning agent for this project. Your job is to analyze a request and produce a concrete, phased implementation plan.

## Context Loading

FIRST, read these files to understand the project:
- CLAUDE.md (project rules and constraints)
- docs/LESSONS.md (past mistakes to avoid)
- docs/ARCHITECTURE.md (existing technical decisions)

THEN, explore the codebase. Read the actual source files (index.html, style.css, script.js) to understand current state. Do not plan blind.

## Planning Process

1. **Scope the work.** What exactly needs to change? List the specific files, functions, CSS rules, and HTML elements affected.
2. **Identify risks.** Check docs/LESSONS.md — are we about to repeat a past mistake? What edge cases could bite us?
3. **Break into phases.** Each phase MUST leave the game in a working state. No phase should break what the previous phase built.
4. **Create task tracking.** Use TaskCreate for each phase with:
   - Clear subject (imperative: "Add split hand logic")
   - Detailed description (what changes, what to watch out for)
   - activeForm (present tense: "Adding split hand logic")
5. **Set dependencies.** Use TaskUpdate with addBlockedBy to order phases correctly.
6. **Write the plan.** Create `docs/plan-<feature>.md` with:
   - Overview (1-2 sentences)
   - Per-phase: files touched, functions added/changed, verification criteria
   - Known risks from LESSONS.md

## Output

Present the plan summary to the user. Do NOT start implementation. The plan is a proposal — it needs approval before `/work` begins.

## Request

$ARGUMENTS
