# Architecture & Technical Decisions
<!-- Updated by /compound when structural decisions are made -->

## Format
### [Date] Decision: Title
**Context:** Why this decision was needed
**Choice:** What was decided
**Alternatives considered:** What else was evaluated
**Outcome:** How it turned out

---

### [2026-02-01] Decision: Plan persistence in files, not session context
**Context:** After implementing Tier 5 and clearing context, `/work` couldn't find its place — TaskList was empty and the roadmap was stale. The project had no reliable way to resume across sessions.
**Choice:** `docs/plan-roadmap.md` is the master plan of record. Feature plans use `docs/plan-<feature>.md`. All slash commands read and update these files. `/work` checks off items on completion. `/compound` verifies freshness. `/plan` never overwrites — reads existing plans and updates in place. CLAUDE.md documents the invariant under "Plan Persistence Rules."
**Alternatives considered:** (1) Persist TaskList to localStorage or a file — rejected because TaskList is a session UX tool, not a durable store. (2) Rely solely on `/compound` to fix staleness — rejected because it only runs at session end, and the user might clear context before running it. (3) Use git commit messages as the progress record — rejected because they don't have the checkbox structure needed for "what's next."
**Outcome:** Every slash command can now recover project state from files alone. Context clears are safe after any command. The Tier 5 staleness bug is structurally prevented.

### [2026-02-01] Decision: Two-row action button layout
**Context:** With Split and Surrender added in Tier 3, the action row could show up to 5 buttons. All 5 in a single flex row overflowed on standard viewports.
**Choice:** Split into `.action-row-primary` (Hit, Stand) and `.action-row-secondary` (Double, Split, Surrender) inside a vertical flex column. Primary buttons are gold (main actions), secondary are white/translucent (situational actions). This groups by action frequency and visual importance.
**Alternatives considered:** (1) `flex-wrap` on the single row — would work but wraps unpredictably depending on viewport width, creating inconsistent layouts. (2) Reduce button padding/font-size — rejected because touch targets were already at minimum for mobile. (3) Icon-only buttons — rejected because text labels are clearer for a card game.
**Outcome:** Clean two-row layout. Primary actions always visible and prominent. Secondary actions grouped below. Mobile 420px breakpoint uses flex-wrap within each sub-row for graceful degradation.

### [2026-02-01] Decision: Scope-aware /test command
**Context:** `/test` loaded all three source files (~1400 lines) unconditionally, even for targeted tests. This bloated context and made testing slower.
**Choice:** Argument-based scope mapping. `/test payouts` loads only script.js via Grep. `/test dom` loads HTML + CSS + targeted JS functions. `/test all` loads everything. A mapping table translates arguments to scenario subsets and file loading strategies.
**Alternatives considered:** (1) Always load everything — simple but wasteful, and gets worse as the codebase grows. (2) Separate test commands per area (`/test-payouts`, `/test-dom`) — rejected because it would mean many small command files that are hard to maintain. (3) Load nothing and let the agent decide — rejected because explicit guidance produces more consistent results.
**Outcome:** Context usage proportional to scope. The full 22-scenario suite is still available when needed.

### [2026-02-01] Decision: CSS-only animations with JS render count tracking
**Context:** Adding card deal animations, score popups, and dealer flip to a game where `renderGame()` clears and rebuilds all DOM elements on every call. Animations would re-trigger on every re-render.
**Choice:** CSS `@keyframes` for all animations (deal slide-in, score float, chip drop, confetti fall). JS tracks `lastRenderedDealerCount` and `lastRenderedHandCounts[]` to distinguish new vs. existing cards. New cards get `--deal-index` CSS custom property for stagger; existing cards get `.no-animate` class. Timing constants live in CSS custom properties on `:root` only — no JS timing constants needed.
**Alternatives considered:** (1) Refactor `renderGame()` to a diffing renderer that preserves existing DOM nodes — rejected as too large a change for visual-only features. (2) Use `requestAnimationFrame` + JS-driven animations — rejected because CSS animations are simpler and more performant for insertion effects. (3) Add/remove individual elements instead of full rebuild — rejected because it would require tracking every card element individually.
**Outcome:** Clean separation: game logic untouched, animation is a CSS layer with minimal JS tracking. The one exception is the dealer hole card flip which requires element preservation (`holeCardEl` + `prevHideHole` state).

### [2026-02-01] Decision: Phase transitions via opacity/max-height instead of display:none
**Context:** Phase control groups (betting, insurance, action row, deal-again) used `.hidden { display: none !important }` which can't be animated. Needed smooth fade transitions between game phases.
**Choice:** New `setPhaseVisibility()` function replaces `.hidden` toggles for the four phase control groups. Uses `.phase-hidden` (opacity:0, max-height:0, pointer-events:none) and `.phase-visible` (opacity:1, max-height:500px) with CSS transitions on `.phase-group`. The original `.hidden` class is kept for non-phase elements (stats panel, split/surrender buttons).
**Alternatives considered:** (1) Replace `.hidden` globally with animated classes — rejected because many elements (stats, conditional buttons) need instant show/hide without transitions. (2) Use CSS `@starting-style` for display:none animations — rejected because browser support is still limited. (3) JavaScript `requestAnimationFrame` timing — rejected as overengineered for simple fades.
**Outcome:** Two visibility systems coexist cleanly: `.hidden` for instant toggle, `setPhaseVisibility()` for animated phase transitions. `pointer-events: none` blocks clicks during fade-out; keyboard shortcuts are already guarded by `gamePhase` checks in action functions.

### [2026-02-01] Decision: Insurance as a new game phase with extracted blackjack check
**Context:** Insurance must be offered after dealing but before checking for blackjack — because the insurance decision depends on not yet knowing whether the dealer has BJ. The existing `dealInitialCards()` checked for blackjack and immediately resolved. Insurance needed to insert a decision point between dealing and BJ resolution.
**Choice:** New `'insurance'` game phase. Extracted `checkBlackjacksAndContinue()` from the bottom of `dealInitialCards()` so it can be called either immediately (no insurance scenario) or after the insurance decision. Insurance controls (Insurance / No Thanks buttons) shown only during this phase. `takeInsurance()` deducts the side bet and calls `checkBlackjacksAndContinue()`. Insurance payout resolved at the end of `resolveRound()` after all hand resolutions.
**Alternatives considered:** (1) Boolean flag `insuranceOffered` without a new phase — rejected because the UI needs a distinct state where only insurance buttons are visible and all play actions are blocked. (2) Resolve insurance inline in `dealInitialCards()` with a confirm() dialog — rejected because blocking dialogs break the async flow and feel terrible. (3) Insurance as part of the betting phase — rejected because cards must already be dealt for the player to see the dealer's upcard.
**Outcome:** Clean phase insertion. The `checkBlackjacksAndContinue()` extraction is reusable — any future pre-play decision point (e.g., early surrender variant) can hook in the same way. Insurance payout in `resolveRound()` is additive — it doesn't interfere with per-hand resolution.

### [2026-02-01] Decision: Multi-hand data model for split pairs
**Context:** Adding split pairs required the game to track multiple player hands simultaneously. The existing code used a single `playerHand` array and `currentBet` number. Every function — hit, stand, double, render, resolve — referenced these directly.
**Choice:** Three new state variables: `playerHands` (array of hand arrays), `activeHandIndex` (which hand the player is currently playing), `handBets` (per-hand bet amounts). A new `advanceHand()` function handles transitioning between hands or to dealer turn. `resolveHand()` was extracted from `resolveRound()` to resolve each hand independently. Single-hand play uses `playerHands[0]` transparently — no special-casing needed outside of rendering and resolution.
**Alternatives considered:** (1) Separate `playerHand1`/`playerHand2` variables — rejected because it doesn't generalize and would require duplicating logic. (2) Hand objects with embedded bets `{cards: [], bet: 50}` — considered but rejected because arrays are simpler and `handBets[i]` parallel array is sufficient for max 2 hands. (3) Re-splitting (multiple splits) — deferred; current model supports it structurally but guards limit to one split for simplicity.
**Outcome:** Clean refactor. All 22 existing test scenarios pass unchanged. Split adds 7 new scenarios, all passing. The `advanceHand()` abstraction handles both single and multi-hand flow without branching in the action functions — `hit()`, `stand()`, and `doubleDown()` all call `advanceHand()` and it does the right thing regardless of hand count.

### [2026-02-01] Decision: localStorage persistence model
**Context:** Players lose their balance and progress on page refresh. Need persistence without a backend.
**Choice:** Three localStorage keys: `blackjack_balance` (int), `blackjack_stats` (JSON object), `blackjack_lastBet` (int). Load functions run at variable initialization time (before DOM refs). Save happens in `resolveRound()` and on zero-balance reset in `newRound()`. Stats object tracks: handsPlayed, wins, losses, pushes, blackjacks, biggestWin.
**Alternatives considered:** (1) Save on every state change — rejected because betting-phase saves would persist incomplete state. (2) Single localStorage key with all game state — rejected because loading a mid-round state on refresh would be broken (no deck, no hands). (3) IndexedDB — overkill for simple key-value storage.
**Outcome:** Clean separation. Balance and stats survive refresh. Game always starts in betting phase with a fresh deck regardless of persistence.

### [2026-02-01] Decision: Rebet replaces current bet, not adds to it
**Context:** The rebet function needed to decide whether pressing "Rebet" with an existing partial bet should add lastBet on top or replace the current bet entirely.
**Choice:** Replace: `currentBet = lastBet`. This is simpler and matches casino rebet button behavior — it's a "bet the same as last time" shortcut, not an accumulator.
**Alternatives considered:** Additive (`currentBet += lastBet` with overflow guard) — rejected because it creates confusing UX when combined with chip buttons.
**Outcome:** Simple, predictable. Players can still fine-tune by clearing and using chips after rebet.

### [2026-02-01] Decision: Deduct-on-deal balance model
**Context:** The game needs to track balance through bet placement, wins, losses, and double-downs. The question was when to deduct the bet from balance.
**Choice:** Deduct in placeBet() when the deal button is clicked. addBet() only increments currentBet without touching balance. This means during the betting phase, balance shows the player's total money, and currentBet shows what they've committed. On deal, balance drops and only gets replenished by resolveRound().
**Alternatives considered:** (1) Deduct in addBet() — rejected because clearing a bet would require adding money back, creating more state transitions. (2) Never deduct, just check at resolve — rejected because balance display would be misleading during play.
**Outcome:** Clean model, but requires care in doubleDown() which also deducts. Two deduction points total: placeBet() and doubleDown().

### [2026-02-01] Decision: Phase-based state machine for game flow
**Context:** The game has distinct modes (betting, playing, dealer turn, round over) with different UI controls visible in each.
**Choice:** A single `gamePhase` string variable with four states: 'betting', 'playing', 'dealerTurn', 'roundOver'. Every action function guards with `if (gamePhase !== 'expected') return`. renderGame() toggles UI visibility based on phase.
**Alternatives considered:** (1) Boolean flags (isPlaying, isBetting, etc.) — rejected because multiple booleans can get out of sync. (2) Numeric states — rejected because string states are self-documenting.
**Outcome:** Simple and effective. The phase guards also prevent race conditions during async dealer play since gamePhase moves to 'dealerTurn' before dealerPlay() starts.

### [2026-02-01] Decision: Five-stage development workflow with compounding
**Context:** Needed a structured way to make changes to this project across sessions without losing context or repeating mistakes.
**Choice:** Five slash commands (/plan, /work, /review, /test, /compound) each triggering a specialized agent role. docs/LESSONS.md and docs/ARCHITECTURE.md serve as persistent memory. CLAUDE.md serves as the root context file.
**Alternatives considered:** (1) Single CLAUDE.md with all context — rejected because it would grow unbounded. (2) No workflow, ad-hoc changes — rejected because mistakes get repeated.
**Outcome:** First compound run captured 3 lessons and 3 architecture decisions from the initial implementation session.
