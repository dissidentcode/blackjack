Execute the current plan or a specified phase.

Steps:
1. Read CLAUDE.md for project rules and context
2. Check task list (TaskList) to find where we left off
3. If a phase is specified in arguments, work on that phase; otherwise pick up the next pending task
4. Mark the task in-progress (TaskUpdate) before starting
5. Implement the changes described in the task/plan
6. Mark the task complete when done
7. Check TaskList again — if the next phase is unblocked, ask if the user wants to continue

Stay focused on the current phase. Don't jump ahead.

$ARGUMENTS
