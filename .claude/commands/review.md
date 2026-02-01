Review recent changes for quality and correctness.

Steps:
1. Read CLAUDE.md and docs/LESSONS.md for project rules and known issues
2. Check git diff to see what changed recently
3. Review each changed file for:
   - **Bugs** — logic errors, off-by-ones, race conditions
   - **Style consistency** — does it match existing patterns?
   - **Edge cases** — empty states, boundary values, error conditions
   - **Project rules** — no frameworks, vanilla only, gold/green theme
   - **Lessons** — are we repeating any mistakes from LESSONS.md?
4. Report findings organized by severity (critical / warning / suggestion)
5. If no issues found, confirm the changes look good

$ARGUMENTS
