// ============================================================
// Blackjack — Game Engine + Render Logic
// ============================================================

// --- Constants ---
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const RANK_VALUES = {
    'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
};
const DEALER_DELAY = 600;
const RESHUFFLE_THRESHOLD = 15;
const STARTING_BALANCE = 500;
const STORAGE_KEY_BALANCE = 'blackjack_balance';
const STORAGE_KEY_STATS = 'blackjack_stats';
const STORAGE_KEY_LAST_BET = 'blackjack_lastBet';

// --- Game State ---
let deck = [];
let playerHands = [[]];  // array of hands (for split support)
let activeHandIndex = 0; // which hand is currently being played
let handBets = [];       // bet amount per hand
let dealerHand = [];
let balance = loadBalance();
let currentBet = 0;
let lastBet = loadLastBet();
let gamePhase = 'betting'; // betting | playing | dealerTurn | roundOver
let stats = loadStats();

// --- Persistence ---
function loadBalance() {
    const saved = localStorage.getItem(STORAGE_KEY_BALANCE);
    if (saved !== null) {
        const val = parseInt(saved, 10);
        return val > 0 ? val : STARTING_BALANCE;
    }
    return STARTING_BALANCE;
}

function loadLastBet() {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_BET);
    return saved !== null ? parseInt(saved, 10) : 0;
}

function loadStats() {
    const saved = localStorage.getItem(STORAGE_KEY_STATS);
    if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fall through */ }
    }
    return { handsPlayed: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, biggestWin: 0 };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY_BALANCE, balance);
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    localStorage.setItem(STORAGE_KEY_LAST_BET, lastBet);
}

// --- DOM Elements ---
const messageEl = document.getElementById('message-el');
const balanceEl = document.getElementById('balance-el');
const betEl = document.getElementById('bet-el');
const playerCardsEl = document.getElementById('player-cards');
const dealerCardsEl = document.getElementById('dealer-cards');
const playerScoreEl = document.getElementById('player-score');
const dealerScoreEl = document.getElementById('dealer-score');
const actionRow = document.getElementById('action-row');
const dealAgainBtn = document.getElementById('deal-again-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const clearBetBtn = document.getElementById('clear-bet-btn');
const dealBtn = document.getElementById('deal-btn');
const rebetBtn = document.getElementById('rebet-btn');
const splitBtn = document.getElementById('split-btn');
const bettingControls = document.getElementById('betting-controls');
const statsToggleBtn = document.getElementById('stats-toggle-btn');
const statsPanel = document.getElementById('stats-panel');

// --- Deck Functions ---
function createDeck() {
    const d = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            d.push({ suit, rank, value: RANK_VALUES[rank] });
        }
    }
    return d;
}

function shuffleDeck(d) {
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function dealCard() {
    if (deck.length < RESHUFFLE_THRESHOLD) {
        deck = shuffleDeck(createDeck());
    }
    return deck.pop();
}

// --- Hand Calculation ---
function calculateHandValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
        total += RANK_VALUES[card.rank];
        if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    const isSoft = aces > 0 && total <= 21;
    return { total, isSoft };
}

function isBlackjack(hand) {
    return hand.length === 2 && calculateHandValue(hand).total === 21;
}

// --- Betting ---
function addBet(amount) {
    if (gamePhase !== 'betting') return;
    if (amount > balance - currentBet) return;
    currentBet += amount;
    renderGame();
}

function clearBet() {
    if (gamePhase !== 'betting') return;
    currentBet = 0;
    renderGame();
}

function rebet() {
    if (gamePhase !== 'betting') return;
    if (lastBet === 0 || lastBet > balance) return;
    currentBet = lastBet;
    renderGame();
}

// --- Game Actions ---
function placeBet() {
    if (gamePhase !== 'betting' || currentBet === 0) return;
    lastBet = currentBet;
    balance -= currentBet;
    dealInitialCards();
}

function dealInitialCards() {
    playerHands = [[dealCard(), dealCard()]];
    activeHandIndex = 0;
    handBets = [currentBet];
    dealerHand = [dealCard(), dealCard()];

    if (isBlackjack(playerHands[0]) || isBlackjack(dealerHand)) {
        gamePhase = 'roundOver';
        revealAndResolve();
        return;
    }

    gamePhase = 'playing';
    renderGame();
}

function hit() {
    if (gamePhase !== 'playing') return;
    const hand = playerHands[activeHandIndex];
    hand.push(dealCard());
    const { total } = calculateHandValue(hand);
    if (total > 21 || total === 21) {
        advanceHand();
        return;
    }
    renderGame();
}

function advanceHand() {
    // Move to next hand or to dealer turn
    if (activeHandIndex < playerHands.length - 1) {
        activeHandIndex++;
        // Auto-advance if next hand already has 21
        const { total } = calculateHandValue(playerHands[activeHandIndex]);
        if (total === 21) {
            advanceHand();
            return;
        }
        renderGame();
    } else {
        // All hands done — check if all busted
        const allBusted = playerHands.every(h => calculateHandValue(h).total > 21);
        if (allBusted) {
            gamePhase = 'roundOver';
            resolveRound();
        } else {
            gamePhase = 'dealerTurn';
            renderGame();
            dealerPlay();
        }
    }
}

function stand() {
    if (gamePhase !== 'playing') return;
    advanceHand();
}

function doubleDown() {
    if (gamePhase !== 'playing') return;
    const hand = playerHands[activeHandIndex];
    if (hand.length !== 2) return;
    const bet = handBets[activeHandIndex];
    if (bet > balance) return;

    balance -= bet;
    handBets[activeHandIndex] = bet * 2;
    hand.push(dealCard());

    advanceHand();
}

function split() {
    if (gamePhase !== 'playing') return;
    if (playerHands.length > 1) return; // only one split allowed
    const hand = playerHands[0];
    if (hand.length !== 2) return;
    if (hand[0].rank !== hand[1].rank) return;
    if (handBets[0] > balance) return;

    // Deduct second bet
    balance -= handBets[0];

    // Split into two hands
    const card1 = hand[0];
    const card2 = hand[1];
    playerHands = [[card1, dealCard()], [card2, dealCard()]];
    handBets = [handBets[0], handBets[0]];
    activeHandIndex = 0;

    // If active hand hits 21, auto-advance
    const { total } = calculateHandValue(playerHands[0]);
    if (total === 21) {
        advanceHand();
        return;
    }

    renderGame();
}

// --- Dealer Logic ---
async function dealerPlay() {
    await sleep(DEALER_DELAY);
    renderGame(); // reveal hole card

    while (shouldDealerHit()) {
        await sleep(DEALER_DELAY);
        dealerHand.push(dealCard());
        renderGame();
    }

    gamePhase = 'roundOver';
    resolveRound();
}

function shouldDealerHit() {
    const { total, isSoft } = calculateHandValue(dealerHand);
    if (total < 17) return true;
    if (total === 17 && isSoft) return true; // hit soft 17
    return false;
}

// --- Round Resolution ---
function revealAndResolve() {
    // Called when player or dealer has natural blackjack
    renderGame();
    resolveRound();
}

function resolveHand(hand, bet, dealer, dealerBJ, wasSplit) {
    const player = calculateHandValue(hand);
    // 21 after split is not a natural blackjack
    const playerBJ = !wasSplit && isBlackjack(hand);
    let msg = '';
    let net = 0;

    if (playerBJ && dealerBJ) {
        msg = wasSplit ? 'Push!' : 'Both have Blackjack — Push!';
        balance += bet;
        stats.pushes++;
        stats.blackjacks++;
    } else if (playerBJ) {
        const payout = Math.floor(bet * 1.5);
        msg = wasSplit ? 'BJ! +$' + payout : 'Blackjack! You win $' + payout + '!';
        balance += bet + payout;
        net = payout;
        stats.wins++;
        stats.blackjacks++;
    } else if (dealerBJ) {
        msg = wasSplit ? 'Dealer BJ. -$' + bet : 'Dealer has Blackjack. You lose $' + bet + '.';
        net = -bet;
        stats.losses++;
    } else if (player.total > 21) {
        msg = wasSplit ? 'Bust! -$' + bet : 'Bust! You lose $' + bet + '.';
        net = -bet;
        stats.losses++;
    } else if (dealer.total > 21) {
        msg = wasSplit ? 'Dealer busts! +$' + bet : 'Dealer busts! You win $' + bet + '!';
        balance += bet * 2;
        net = bet;
        stats.wins++;
    } else if (player.total > dealer.total) {
        msg = wasSplit ? 'Win! +$' + bet : 'You win $' + bet + '!';
        balance += bet * 2;
        net = bet;
        stats.wins++;
    } else if (player.total < dealer.total) {
        msg = wasSplit ? 'Lose. -$' + bet : 'Dealer wins. You lose $' + bet + '.';
        net = -bet;
        stats.losses++;
    } else {
        msg = wasSplit ? 'Push.' : 'Push! Bet returned.';
        balance += bet;
        stats.pushes++;
    }

    stats.handsPlayed++;
    return { msg, net };
}

function resolveRound() {
    const dealer = calculateHandValue(dealerHand);
    const dealerBJ = isBlackjack(dealerHand);
    const isSplit = playerHands.length > 1;
    let totalNet = 0;
    const messages = [];

    for (let i = 0; i < playerHands.length; i++) {
        const { msg, net } = resolveHand(playerHands[i], handBets[i], dealer, dealerBJ, isSplit);
        totalNet += net;
        messages.push(isSplit ? 'Hand ' + (i + 1) + ': ' + msg : msg);
    }

    if (totalNet > stats.biggestWin) stats.biggestWin = totalNet;

    gamePhase = 'roundOver';
    messageEl.textContent = messages.join(' | ');
    saveState();
    renderGame();
}

function newRound() {
    if (balance === 0) {
        balance = STARTING_BALANCE;
        messageEl.textContent = 'Restarting with $' + STARTING_BALANCE + '. Good luck!';
        saveState();
    } else {
        messageEl.textContent = 'Place your bet.';
    }
    playerHands = [[]];
    activeHandIndex = 0;
    handBets = [];
    dealerHand = [];
    currentBet = 0;
    gamePhase = 'betting';
    renderGame();
}

// --- Rendering ---
function createCardElement(card, faceDown) {
    const el = document.createElement('div');
    el.classList.add('card');

    if (faceDown) {
        el.classList.add('face-down');
        return el;
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    el.classList.add(isRed ? 'red' : 'black');

    const symbol = SUIT_SYMBOLS[card.suit];
    el.innerHTML =
        '<span class="card-corner top-left"><span class="card-rank">' + card.rank + '</span><span class="card-suit">' + symbol + '</span></span>' +
        '<span class="card-center">' + symbol + '</span>' +
        '<span class="card-corner bottom-right"><span class="card-rank">' + card.rank + '</span><span class="card-suit">' + symbol + '</span></span>';

    return el;
}

function renderGame() {
    // Balance and bet
    balanceEl.textContent = '$' + balance;
    const totalBet = handBets.length > 0 ? handBets.reduce((a, b) => a + b, 0) : currentBet;
    betEl.textContent = totalBet > 0 ? '$' + totalBet : '-';

    // Dealer cards
    dealerCardsEl.innerHTML = '';
    const hideHole = gamePhase === 'playing';
    for (let i = 0; i < dealerHand.length; i++) {
        const faceDown = hideHole && i === 0;
        dealerCardsEl.appendChild(createCardElement(dealerHand[i], faceDown));
    }

    // Dealer score
    if (dealerHand.length > 0) {
        if (hideHole) {
            const upcard = RANK_VALUES[dealerHand[1].rank];
            dealerScoreEl.textContent = upcard;
        } else {
            dealerScoreEl.textContent = calculateHandValue(dealerHand).total;
        }
        dealerScoreEl.classList.remove('hidden');
    } else {
        dealerScoreEl.classList.add('hidden');
    }

    // Player hands
    const playerArea = playerCardsEl.parentElement;
    // Remove any extra hand containers from previous renders
    playerArea.querySelectorAll('.split-hand').forEach(el => el.remove());

    const isSplit = playerHands.length > 1;

    if (isSplit) {
        // Hide the default card row and score — we'll render per-hand
        playerCardsEl.innerHTML = '';
        playerScoreEl.classList.add('hidden');

        for (let h = 0; h < playerHands.length; h++) {
            const hand = playerHands[h];
            const container = document.createElement('div');
            container.classList.add('split-hand');
            if (gamePhase === 'playing' && h === activeHandIndex) {
                container.classList.add('active-hand');
            }

            const label = document.createElement('div');
            label.classList.add('split-hand-label');
            label.textContent = 'Hand ' + (h + 1) + ' ($' + handBets[h] + ')';
            container.appendChild(label);

            const cardRow = document.createElement('div');
            cardRow.classList.add('card-row');
            for (const card of hand) {
                cardRow.appendChild(createCardElement(card, false));
            }
            container.appendChild(cardRow);

            if (hand.length > 0) {
                const score = document.createElement('span');
                score.classList.add('score-badge');
                const hv = calculateHandValue(hand);
                score.textContent = hv.total;
                if (hv.total > 21) score.classList.add('busted');
                label.appendChild(score);
            }

            playerArea.appendChild(container);
        }
    } else {
        // Single hand — use existing elements
        playerCardsEl.innerHTML = '';
        const hand = playerHands[0];
        for (const card of hand) {
            playerCardsEl.appendChild(createCardElement(card, false));
        }

        if (hand.length > 0) {
            const pv = calculateHandValue(hand);
            playerScoreEl.textContent = pv.total;
            playerScoreEl.classList.remove('hidden');
        } else {
            playerScoreEl.classList.add('hidden');
        }
    }

    // Controls visibility
    const isBetting = gamePhase === 'betting';
    const isPlaying = gamePhase === 'playing';
    const isOver = gamePhase === 'roundOver';

    bettingControls.classList.toggle('hidden', !isBetting);
    rebetBtn.classList.toggle('hidden', !isBetting || lastBet === 0 || lastBet > balance);
    actionRow.classList.toggle('hidden', !isPlaying);
    dealAgainBtn.classList.toggle('hidden', !isOver);

    // Double down and split availability
    if (isPlaying) {
        const hand = playerHands[activeHandIndex];
        const bet = handBets[activeHandIndex];
        const canDouble = hand.length === 2 && bet <= balance;
        doubleBtn.disabled = !canDouble;

        const canSplit = !isSplit && hand.length === 2 &&
            hand[0].rank === hand[1].rank && handBets[0] <= balance;
        splitBtn.disabled = !canSplit;
        splitBtn.classList.toggle('hidden', !canSplit);
    } else {
        splitBtn.classList.add('hidden');
    }

    renderStats();
}

// --- Utility ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Stats ---
function toggleStats() {
    statsPanel.classList.toggle('hidden');
    renderStats();
}

function renderStats() {
    if (statsPanel.classList.contains('hidden')) return;
    const winRate = stats.handsPlayed > 0
        ? Math.round((stats.wins / stats.handsPlayed) * 100)
        : 0;
    statsPanel.innerHTML =
        '<div class="stats-grid">' +
        '<span>Hands:</span><span>' + stats.handsPlayed + '</span>' +
        '<span>Wins:</span><span>' + stats.wins + '</span>' +
        '<span>Losses:</span><span>' + stats.losses + '</span>' +
        '<span>Pushes:</span><span>' + stats.pushes + '</span>' +
        '<span>Blackjacks:</span><span>' + stats.blackjacks + '</span>' +
        '<span>Win rate:</span><span>' + winRate + '%</span>' +
        '<span>Biggest win:</span><span>$' + stats.biggestWin + '</span>' +
        '</div>';
}

function resetStats() {
    if (!confirm('Reset all stats and balance?')) return;
    stats = { handsPlayed: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, biggestWin: 0 };
    balance = STARTING_BALANCE;
    lastBet = 0;
    currentBet = 0;
    saveState();
    newRound();
    renderStats();
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', function(e) {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    if (gamePhase === 'betting') {
        if (key === '1') addBet(10);
        else if (key === '2') addBet(25);
        else if (key === '3') addBet(50);
        else if (key === '4') addBet(100);
        else if (key === 'enter') placeBet();
        else if (key === 'c' || key === 'escape') clearBet();
        else if (key === 'r') rebet();
    } else if (gamePhase === 'playing') {
        if (key === 'h') hit();
        else if (key === 's') stand();
        else if (key === 'd') doubleDown();
        else if (key === 'p') split();
    } else if (gamePhase === 'roundOver') {
        if (key === 'enter') newRound();
    }
});

// --- Init ---
deck = shuffleDeck(createDeck());
messageEl.textContent = 'Place your bet.';
renderGame();
