# Architecture & Technical Decisions
<!-- Updated by /compound when structural decisions are made -->

## Format
### [Date] Decision: Title
**Context:** Why this decision was needed
**Choice:** What was decided
**Alternatives considered:** What else was evaluated
**Outcome:** How it turned out

---

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
