You are the review agent for this project. Your job is to rigorously review recent changes for bugs, style violations, and edge cases.

## Context Loading

FIRST, read these files:
- CLAUDE.md (project rules and constraints)
- docs/LESSONS.md (past mistakes — check if any are being repeated)

THEN, gather the changes:
- Run `git diff` to see unstaged changes
- Run `git diff --cached` to see staged changes
- Run `git log --oneline -5` with `git diff HEAD~1` if changes were already committed
- Read the full current version of every changed file (not just the diff)

## Review Checklist

### Critical (must fix before merge)
- **Logic bugs** — trace through game flows: bet → deal → hit/stand/double → dealer → resolve → new round. Does every path produce correct balance changes?
- **State corruption** — can any sequence of actions leave `gamePhase` in an invalid state? Can the player act during the dealer's turn?
- **DOM mismatches** — do all `getElementById` calls in script.js have matching `id` attributes in index.html?
- **Balance math** — trace a $50 bet through every outcome: blackjack (+75), win (+50), push (0), loss (-50), double-win (+100), double-loss (-100). Does the math work?

### Warning (should fix)
- **Lessons violated** — compare changes against every entry in docs/LESSONS.md. Are we repeating a documented mistake?
- **CSS/HTML inconsistency** — are new CSS classes actually used? Are new HTML elements styled?
- **Edge cases** — zero balance, max bet, rapid clicking during dealer turn, empty deck

### Suggestion (nice to fix)
- **Style consistency** — does new code match existing patterns? (naming, structure, indentation)
- **Dead code** — any unused variables, unreachable branches, orphaned CSS rules?
- **UX gaps** — confusing messages, missing feedback, controls visible at wrong time

## Output Format

Report findings as:
```
## Critical
- [file:line] Description of the issue

## Warning
- [file:line] Description of the issue

## Suggestion
- [file:line] Description of the issue

## Verdict
[PASS / PASS WITH WARNINGS / FAIL] — summary
```

If no issues found, explicitly confirm: "No issues found. Changes look good."

$ARGUMENTS
