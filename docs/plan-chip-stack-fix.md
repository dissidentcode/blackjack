# Plan: Fix Chip Stack Visual Decomposition

## Overview
`renderBetStack()` uses a greedy decomposition with `[100, 50, 25, 10]` denominations. Since $25 is not a multiple of $10, amounts like $30 and $40 break — the greedy algorithm assigns a $25 chip leaving a remainder below the minimum denomination ($10), so the visual total is wrong.

## Bug Details

The actual bet value (`currentBet`) is always correct. This is purely a visual rendering bug in `renderBetStack()`.

**Broken amounts** (any bet where `(amount % 50)` is 30 or 40):
- $30 → shows $25 (off by $5)
- $40 → shows $35 (off by $5)
- $80 → shows $75 (off by $5)
- $90 → shows $85 (off by $5)
- $130 → shows $125 (off by $5)
- $140 → shows $135 (off by $5)
- etc.

## Fix

- [x] **Replace greedy decomposition with exact decomposition in `renderBetStack()`**

Added `canRepresent()` helper that recursively checks if an amount can be built from a set of denominations. `renderBetStack()` now reduces each denomination's count until the remainder is representable by smaller denominations. This handles all edge cases generically, not just $25.

**Files:** script.js only (function `renderBetStack()` at ~line 735)
**Verification:** Test these bet amounts render correctly: $10, $20, $30, $40, $50, $60, $70, $75, $80, $90, $100, $125, $130, $140, $150

## Risks
- Per LESSONS.md: "Always test with the MAXIMUM number of visible elements" — verify large bets ($500) still render cleanly
- The visual chip stack layout must still look good with potentially more $10 chips showing (e.g., $40 = 4x$10 instead of 1x$25+$mystery)
