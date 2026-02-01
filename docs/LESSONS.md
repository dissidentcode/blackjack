# Lessons Learned
<!-- Updated by /compound — newest entries at top -->

## Format
### [Date] Category: Title
**Problem:** What went wrong
**Solution:** How it was fixed
**Rule:** What to do going forward

---

### [2026-02-01] Workflow: Slash commands work inline when session can't see new files
**Problem:** After creating the slash command files mid-session, the CLI couldn't see them as registered commands because the session was still open. The user needed /review and /compound run immediately.
**Solution:** Read the .md file directly with the Read tool, then executed its instructions manually. The commands are just prompt files — they work whether invoked as `/command` or read and followed inline.
**Rule:** If a slash command was just created and the session hasn't refreshed, read the .md and execute its instructions. The commands are portable prompts, not magic.

### [2026-02-01] Testing: Structured test scenarios with expected values catch bugs systematically
**Problem:** Ad-hoc testing ("does it work?") misses edge cases. The first round of testing was less structured and still caught the double-down bug, but only because it was obvious.
**Solution:** The /test command now has 22 numbered scenarios with exact expected values (e.g., "$50 bet blackjack: payout=75, balance=575, net=+75"). Tracing each against actual code line by line leaves no ambiguity.
**Rule:** Every test scenario should include the specific expected numeric result, not just "verify it works." Trace the actual code lines, don't reason abstractly.

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
