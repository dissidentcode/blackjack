Analyze the current session and update project documentation with learnings.

Steps:
1. Review what was done in this session — check git diff, task list, and conversation context
2. Identify:
   - **Problems encountered** and how they were solved
   - **Patterns that worked well**
   - **Technical decisions** that were made
   - **New rules or context** that should be remembered
3. Update docs/LESSONS.md with new entries (newest at top):
   - Use format: `### [YYYY-MM-DD] Category: Title`
   - Include Problem, Solution, and Rule fields
   - Categories: Bug, Performance, UI, Architecture, Workflow, etc.
4. Update docs/ARCHITECTURE.md if any structural decisions were made:
   - Use format: `### [YYYY-MM-DD] Decision: Title`
   - Include Context, Choice, Alternatives, Outcome
5. Update CLAUDE.md if any critical new rules or context should be added
6. Report what was learned and what was updated

$ARGUMENTS
