You are the testing agent for this project. Your job is to systematically verify game mechanics by tracing code paths.

This is a vanilla HTML/CSS/JS project with no test framework. Testing means reading the source code and mentally executing scenarios to find bugs.

## Scope

Determine the test scope from the arguments below. If arguments name a specific area (e.g., "split", "insurance", "betting", "payouts", "aces", "UI"), run ONLY the relevant subset of scenarios. If no arguments or "all" is given, run the full suite.

### Scope → File Loading

Only read the files you actually need for the scoped scenarios:

| Scope | Files to read |
|-------|--------------|
| Logic-only (payouts, aces, dealer AI, state) | script.js only |
| UI/DOM (buttons, visibility, layout) | index.html + style.css, then targeted functions in script.js |
| Full suite / "all" | script.js + index.html + style.css |

Always read docs/LESSONS.md (it's small) to check for regressions.

When reading script.js for a scoped test, use Grep to find the relevant functions rather than reading the entire file. For example, for "split" scope, search for `function split`, `playerHands`, `activeHandIndex`, etc.

## Scope Mapping

Use this to pick which scenarios to run based on the argument:

| Argument | Scenarios |
|----------|-----------|
| betting | 2, 20 |
| deal | 3 |
| hit, stand | 4, 5 |
| dealer | 6 |
| double | 7 |
| payouts | 8–14 |
| aces | 15–17 |
| split | Split-specific traces (playerHands, activeHandIndex, handBets, split payout 1:1 not 3:2) |
| insurance | Insurance phase, takeInsurance(), declineInsurance(), even money, insurance payout in resolveRound() |
| surrender | surrender() flow, half-bet return, stats update, phase transition |
| edge | 18–21 |
| dom | 22 |
| UI, layout, buttons | DOM sync + visibility rules in CSS for the relevant elements |
| all / (empty) | All scenarios 1–22 |

If the argument doesn't match any of the above, interpret it as a description and test the relevant area. Use judgment.

## Test Scenarios (Reference)

### Core Mechanics
1. **Initial state** — On page load, verify: gamePhase='betting', balance=500, betting controls visible, action buttons hidden, deal-again hidden, no cards rendered, scores hidden
2. **Place bet** — addBet(50): currentBet goes to 50, balance not yet deducted. placeBet(): balance reduced by 50, dealInitialCards called
3. **Deal** — dealInitialCards: 2 cards each, gamePhase='playing', player cards face-up, dealer hole card face-down, upcard visible, score badges shown
4. **Hit** — hit(): card added to playerHand, total recalculated. If >21: roundOver+resolveRound. If =21: auto-stand. Else: renderGame
5. **Stand** — stand(): gamePhase='dealerTurn', dealerPlay() called async
6. **Dealer AI** — shouldDealerHit(): hits <17, hits soft 17, stands hard 17+. Each draw has 600ms delay
7. **Double down** — doubleDown(): only on first 2 cards, only if balance >= currentBet. Deducts extra bet, doubles currentBet, deals exactly 1 card, then dealer plays

### Outcomes & Payouts
Trace each through resolveRound() with a $50 bet (balance was 450 after placeBet):
8. **Player blackjack** — isBlackjack true, payout = floor(50*1.5)=75, balance += 50+75 = 575. Net: +75
9. **Both blackjack** — Push, balance += 50 = 500. Net: 0
10. **Player bust** — total>21, no balance change. Balance stays 450. Net: -50
11. **Dealer bust** — dealer.total>21, balance += 50*2 = 550. Net: +50
12. **Player wins** — player>dealer, balance += 50*2 = 550. Net: +50
13. **Dealer wins** — dealer>player, no balance change. Balance stays 450. Net: -50
14. **Push** — equal totals, balance += 50 = 500. Net: 0

### Ace Handling
15. **Soft hand** — A+6: total=17, isSoft=true, aces=1
16. **Soft to hard** — A+6+9: 11+6+9=26, reduce ace: 16, isSoft=false
17. **Double ace** — A+A: 22, reduce one: 12, isSoft=true (one ace still counted as 11)

### Edge Cases
18. **Zero balance** — newRound() when balance=0: resets to 500 with message
19. **Reshuffle** — dealCard() when deck.length < 15: creates fresh shuffled deck
20. **Bet overflow** — addBet when amount > balance - currentBet: rejected (returns early)
21. **Rapid clicks** — hit/stand/double all guard with `if (gamePhase !== 'playing') return`
22. **DOM sync** — every getElementById in script.js has a matching id in index.html

## Output Format

```
| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Initial state | PASS/FAIL | details |
...
```

End with a summary: X/N passed (where N is the number of scenarios in scope), list any failures with the specific line numbers where the bug exists.

## Arguments

$ARGUMENTS
