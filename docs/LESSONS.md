# Lessons Learned
<!-- Updated by /compound — newest entries at top -->

## Format
### [Date] Category: Title
**Problem:** What went wrong
**Solution:** How it was fixed
**Rule:** What to do going forward

---

### [2026-02-01] Workflow: Plan files go stale when TaskList is the only progress tracker
**Problem:** Tier 5 (7 items) was fully implemented, reviewed, and merged in a previous session. But `docs/plan-roadmap.md` still showed all 7 items unchecked because `/work` only updated TaskList (session-scoped), not the plan files. After context clear, `/work` found an empty TaskList and couldn't determine where to pick up. The roadmap was the only persistent record, and it was wrong.
**Solution:** Systemic fix across all slash commands: `/work` now updates plan file checkboxes AND TaskList on completion. `/compound` verifies plan files match reality. `/plan` reads existing plans before creating new ones and never overwrites. CLAUDE.md documents the invariant: "Plans live in files, not in context."
**Rule:** TaskList is session-scoped and will not survive context clears. Every task completion MUST update the persistent plan file (`docs/plan-*.md`). `/compound` must verify plan freshness as a mandatory step, not an afterthought.

### [2026-02-01] UI: Action buttons overflow when all 5 are visible (Hit/Stand/Double/Split/Surrender)
**Problem:** All 5 action buttons were in a single flex row with no wrapping. On standard viewports, Hit was clipped to just "t" and Surrender was cut off on the right edge. This only manifested when Split and Surrender were both visible (pair of 8s scenario), which is easy to miss in casual testing.
**Solution:** Restructured `#action-row` into two sub-rows: `.action-row-primary` (Hit, Stand — gold buttons) and `.action-row-secondary` (Double, Split, Surrender — white/translucent buttons). Parent is a vertical flex column. Updated the 420px mobile breakpoint to use `flex-wrap` on sub-rows instead of the old 2-column grid.
**Rule:** Always test button layouts with the MAXIMUM number of visible elements, not just the common case. For action buttons, the worst case is a splittable pair with sufficient balance (all 5 buttons visible).

### [2026-02-01] Workflow: Slash commands that read entire source files bloat context unnecessarily
**Problem:** `/test` instructed "Read ALL three source files in full before testing" unconditionally. For scoped tests (e.g., testing just payout math), this loaded ~1400 lines of irrelevant HTML/CSS into context.
**Solution:** Made `/test` scope-aware: accepts arguments like `/test payouts`, `/test split`, `/test dom`. A scope mapping table determines which files to read and which scenarios to run. For logic-only scopes, only script.js (via Grep, not full read) is loaded. Full reads reserved for "all" or no-argument invocations.
**Rule:** Slash commands should load context proportional to their scope. Use Grep to find relevant functions rather than reading entire files. Reserve full file reads for commands that genuinely need the complete picture (like `/review` which needs full files for context around diffs).

### [2026-02-01] Architecture: CSS insertion animations avoid renderGame() refactor
**Problem:** `renderGame()` clears and rebuilds the entire DOM on every call (`innerHTML = ''`). Adding card animations would re-trigger on every re-render, not just when new cards appear. A diffing renderer would fix this but is a massive refactor.
**Solution:** Track `lastRenderedDealerCount` and `lastRenderedHandCounts[]` to know which cards already existed. New cards get `isNew=true` (animated with `--deal-index` stagger). Existing cards get `.no-animate` class. Counts reset in `newRound()` and adjusted in `split()` (`[1, 1]` — one old card per hand). The full-rebuild pattern stays intact; animation tracking is a lightweight overlay.
**Rule:** When adding animations to a full-rebuild renderer, track "what was already visible" rather than refactoring to incremental DOM updates. Reset tracking state at the same points where game state resets.

### [2026-02-01] Architecture: Dealer hole card flip requires element preservation
**Problem:** The dealer hole card needs a smooth 3D flip animation when revealed. But `renderGame()` rebuilds all dealer cards from scratch on every call — the element gets destroyed and recreated, so CSS transitions never trigger.
**Solution:** Build the hole card as a dual-face structure (`.card-flipper-container` > `.card-flipper` > `.card-front` + `.card-back`) with `backface-visibility: hidden`. Preserve the element in `holeCardEl`. Track `prevHideHole` to detect the hide→reveal transition. When flipping, add `.flipping` class to the preserved element instead of rebuilding it. Null `holeCardEl` after flip so subsequent renders rebuild normally.
**Rule:** When a single element needs CSS transitions across render cycles in a full-rebuild renderer, preserve that specific element and apply the transition class surgically. Track a "previous state" variable to detect the transition moment. Null the reference after use to avoid stale DOM.

### [2026-02-01] Workflow: Review catches dead code and unused constants from large feature PRs
**Problem:** The Tier 5 visual polish PR (6 phases, ~580 lines added) shipped with: (1) dead `.card.face-down` CSS rule orphaned by the flipper refactor, (2) three unused JS constants (`DEAL_DURATION`, `DEAL_STAGGER`, `FLIP_DURATION`) that were defined for JS-CSS coordination but never used because timing is CSS-only, (3) a duplicate `.visual-chip` CSS block, (4) an unused `i` parameter in a lambda.
**Solution:** Review caught all four. Cleanup pass removed dead CSS, unused constants, merged duplicate block, removed unused parameter. Done as a separate `/work` step before PR creation.
**Rule:** Large feature PRs that touch multiple systems (JS logic, CSS animations, HTML structure) will accumulate dead code from mid-implementation pivots. Always run `/review` before creating the PR, not after. Clean up findings in a dedicated pass.

### [2026-02-01] UI: Review catches display-layer bugs that code tracing misses
**Problem:** Three UX issues shipped in the Tier 3 PR that passed code-level review (no logic bugs, correct balance math, proper phase guards) but were caught as display inconsistencies: (1) no message when insurance is silently skipped due to insufficient funds, (2) the bet display included the `insuranceBet` amount after the insurance phase ended (stale state in the display), (3) the insurance button said "Insurance" even during the even-money variant where the message said "Even money?".
**Solution:** (1) Added `messageEl.textContent = "Can't afford insurance."` in the fall-through path. (2) Changed bet display to only include `insuranceBet` during the `'insurance'` phase: `mainBet + (gamePhase === 'insurance' ? insuranceBet : 0)`. (3) Added `id="insurance-btn"` to the button and set `insuranceBtn.textContent` dynamically based on `playerBJ` when entering the insurance phase.
**Rule:** After verifying game logic and balance math, do a separate pass for display consistency: do all buttons, messages, and labels that describe the same action use matching terminology? Does the displayed bet/balance reflect only what's relevant to the current phase? Silent skips of optional features (insurance, split, etc.) should show a brief explanation.

### [2026-02-01] Logic: Insurance must handle player-blackjack-plus-dealer-Ace (even money)
**Problem:** The initial insurance implementation had `if (dealerShowsAce && !playerBJ)` — it skipped insurance entirely when the player had blackjack. This missed the standard casino "even money" rule: when you have BJ and dealer shows Ace, you can take insurance to guarantee 1:1 payout instead of risking a push. Without this, the player has no agency in a common situation.
**Solution:** Removed the `!playerBJ` guard. Added a separate branch: if player has BJ, show "Even money?" message instead of "Insurance?". The insurance mechanics are identical — half-bet side wager at 2:1 — but the framing communicates the strategic choice. The existing `resolveHand`/`resolveRound` insurance logic handles the math correctly for both cases.
**Rule:** When adding a feature that interacts with an existing early-exit condition (like blackjack detection), enumerate all combinations: player BJ only, dealer BJ only, both BJ, neither BJ, dealer Ace + player BJ, dealer Ace + no player BJ. Each combination may need distinct behavior.

### [2026-02-01] Architecture: Surrender bypasses resolveRound with self-contained resolution
**Problem:** Surrender ends the round immediately — the player forfeits half the bet and the hand is over. But `resolveRound()` iterates all hands and compares against the dealer, which is unnecessary for surrender. Routing surrender through `resolveRound()` would require special-casing a "surrendered" hand state.
**Solution:** `surrender()` does its own resolution inline: returns half the bet to balance, increments stats, sets `gamePhase = 'roundOver'`, calls `saveState()`, and renders. It never calls `resolveRound()`. This is the third place that calls `saveState()` (after `resolveRound()` and zero-balance reset).
**Rule:** When a new action short-circuits the normal game flow (surrender, insurance timeout, etc.), it's cleaner to self-resolve than to shoehorn it through `resolveRound()`. But document every new `saveState()` call site — the "save only after resolution" rule now has three locations.

### [2026-02-01] Bug: Split auto-advance on 21 was missing
**Problem:** After splitting, `advanceHand()` moved `activeHandIndex` to the next hand and called `renderGame()`, but didn't check if the new hand already totaled 21. The player had to manually stand on an unplayable 21. Single-hand `hit()` already auto-advanced on 21, so this was an inconsistency.
**Solution:** Added a check in `advanceHand()` after incrementing `activeHandIndex`: if the new hand's total is 21, recursively call `advanceHand()` again. This mirrors the auto-stand behavior and handles the edge case where both split hands get 21.
**Rule:** When adding multi-path flow control (like `advanceHand()`), check entry conditions on the new path — don't assume the player always needs to act. Any auto-resolution logic (bust, 21) must apply at every hand transition, not just on hit.

### [2026-02-01] Architecture: The `wasSplit` flag serves double duty
**Problem:** Extracting `resolveHand()` from `resolveRound()` to support per-hand resolution introduced two needs: (1) suppress 3:2 blackjack payout after split (casino rule), and (2) use shorter message format for split results (space-constrained when joined with `|`). Initially, messages were shortened for all cases, which regressed single-hand UX.
**Solution:** The `wasSplit` boolean parameter controls both behaviors — it gates `isBlackjack()` recognition AND selects between long/short message format via ternary expressions. Single-hand games get the original verbose messages; split games get compact ones.
**Rule:** When a function needs to behave differently in two contexts, prefer a single descriptive flag parameter over separate code paths. But always check that the non-flagged path preserves existing behavior — regressions in the common case are worse than missing edge case handling.

### [2026-02-01] Bug: Dealer blackjack was not checked at deal time
**Problem:** The original `dealInitialCards()` only checked `isBlackjack(playerHand)`. If the dealer had a natural blackjack but the player didn't, the player entered the 'playing' phase and could hit/stand/double against an unbeatable hand. This is wrong — casino rules resolve dealer naturals immediately.
**Solution:** Changed the check to `if (isBlackjack(playerHand) || isBlackjack(dealerHand))` so both naturals trigger immediate resolution via `revealAndResolve()`. Added a dedicated `dealerBJ` branch in `resolveRound()` that fires before the bust/comparison checks.
**Rule:** When adding early-exit conditions in `dealInitialCards()`, check both player AND dealer. Any condition that should prevent normal play must be caught before `gamePhase = 'playing'`.

### [2026-02-01] Architecture: Keyboard shortcuts must route through existing guarded functions
**Problem:** When adding keyboard shortcuts, there's a temptation to duplicate game logic inline in the keydown handler (e.g., directly mutating state on keypress).
**Solution:** Every keyboard shortcut calls the same function as the corresponding button: `hit()`, `stand()`, `doubleDown()`, `placeBet()`, etc. Since these functions already guard with `gamePhase` checks, the shortcuts inherit all safety guarantees for free.
**Rule:** Never duplicate game logic in input handlers. Always route through the canonical action functions so phase guards, balance checks, and state mutations stay in one place.

### [2026-02-01] Architecture: saveState() call placement matters for persistence consistency
**Problem:** localStorage must be saved at the right moments — too early and you save mid-mutation, too late and a page refresh loses data. The question was where to call `saveState()`.
**Solution:** `saveState()` is called in exactly two places: (1) end of `resolveRound()` after all balance/stats mutations are complete, (2) in `newRound()` when balance resets to $500 on zero. This ensures every completed hand is persisted, and the zero-balance reset isn't lost.
**Rule:** Call `saveState()` only after all mutations for a logical operation are complete. Don't save mid-round or during betting — only after resolution.

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
