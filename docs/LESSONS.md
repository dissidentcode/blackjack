# Lessons Learned
<!-- Updated by /compound — newest entries at top -->

## Format
### [Date] Category: Title
**Problem:** What went wrong
**Solution:** How it was fixed
**Rule:** What to do going forward

---

### [2026-02-01] Bug: Double-down guard used wrong comparison
**Problem:** The doubleDown() guard was `if (currentBet > balance - currentBet) return` which double-subtracted currentBet. Since placeBet() already deducted the initial bet from balance, the guard was too restrictive — it blocked valid double-downs when the player could afford them (e.g. balance=250, currentBet=250: `250 > 250-250` → blocked).
**Solution:** Changed to `if (currentBet > balance) return` — simple check against remaining balance.
**Rule:** After placeBet() deducts, `balance` already reflects remaining funds. Guards on balance should compare directly against `balance`, not `balance - currentBet`.

### [2026-02-01] Documentation: Balance rule in CLAUDE.md was misleading
**Problem:** CLAUDE.md stated "Balance deducted in placeBet() — not in addBet(), not anywhere else" but doubleDown() also deducts from balance at line 152. A future session taking this literally could introduce a bug.
**Solution:** Reworded to "initial bet in placeBet(), double-down addition in doubleDown(), nowhere else."
**Rule:** When documenting invariants in CLAUDE.md, verify them against actual code. Trace every write to the variable, not just the obvious one.

### [2026-02-01] Workflow: Slash commands need directive agent framing
**Problem:** Initial slash commands were passive instruction lists ("Steps: 1. Read... 2. Check..."). They didn't drive strong agent behavior — no context loading sequence, no structured output format, no explicit stop conditions.
**Solution:** Rewrote all 5 commands with: role identity ("You are the X agent"), mandatory context loading section, specific checklists/scenarios, structured output formats, and clear boundaries (e.g., /plan must NOT implement).
**Rule:** Slash commands should open with a role assignment, mandate reading project context files first, and specify the exact output format expected.
