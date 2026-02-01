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

// --- Game State ---
let deck = [];
let playerHand = [];
let dealerHand = [];
let balance = STARTING_BALANCE;
let currentBet = 0;
let gamePhase = 'betting'; // betting | playing | dealerTurn | roundOver

// --- DOM Elements ---
const messageEl = document.getElementById('message-el');
const balanceEl = document.getElementById('balance-el');
const betEl = document.getElementById('bet-el');
const playerCardsEl = document.getElementById('player-cards');
const dealerCardsEl = document.getElementById('dealer-cards');
const playerScoreEl = document.getElementById('player-score');
const dealerScoreEl = document.getElementById('dealer-score');
const chipRow = document.getElementById('chip-row');
const actionRow = document.getElementById('action-row');
const dealAgainBtn = document.getElementById('deal-again-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const clearBetBtn = document.getElementById('clear-bet-btn');
const dealBtn = document.getElementById('deal-btn');
const bettingControls = document.getElementById('betting-controls');

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

// --- Game Actions ---
function placeBet() {
    if (gamePhase !== 'betting' || currentBet === 0) return;
    balance -= currentBet;
    dealInitialCards();
}

function dealInitialCards() {
    playerHand = [dealCard(), dealCard()];
    dealerHand = [dealCard(), dealCard()];

    if (isBlackjack(playerHand)) {
        gamePhase = 'roundOver';
        revealAndResolve();
        return;
    }

    gamePhase = 'playing';
    renderGame();
}

function hit() {
    if (gamePhase !== 'playing') return;
    playerHand.push(dealCard());
    const { total } = calculateHandValue(playerHand);
    if (total > 21) {
        gamePhase = 'roundOver';
        resolveRound();
        return;
    }
    if (total === 21) {
        stand();
        return;
    }
    renderGame();
}

function stand() {
    if (gamePhase !== 'playing') return;
    gamePhase = 'dealerTurn';
    renderGame();
    dealerPlay();
}

function doubleDown() {
    if (gamePhase !== 'playing') return;
    if (playerHand.length !== 2) return;
    if (currentBet > balance) return;

    balance -= currentBet;
    currentBet *= 2;
    playerHand.push(dealCard());

    const { total } = calculateHandValue(playerHand);
    if (total > 21) {
        gamePhase = 'roundOver';
        resolveRound();
        return;
    }

    gamePhase = 'dealerTurn';
    renderGame();
    dealerPlay();
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
    // Called when player has natural blackjack
    renderGame();
    resolveRound();
}

function resolveRound() {
    const player = calculateHandValue(playerHand);
    const dealer = calculateHandValue(dealerHand);
    const playerBJ = isBlackjack(playerHand);
    const dealerBJ = isBlackjack(dealerHand);
    let msg = '';

    if (playerBJ && dealerBJ) {
        msg = 'Both have Blackjack — Push!';
        balance += currentBet;
    } else if (playerBJ) {
        const payout = Math.floor(currentBet * 1.5);
        msg = 'Blackjack! You win $' + payout + '!';
        balance += currentBet + payout;
    } else if (player.total > 21) {
        msg = 'Bust! You lose $' + currentBet + '.';
    } else if (dealer.total > 21) {
        msg = 'Dealer busts! You win $' + currentBet + '!';
        balance += currentBet * 2;
    } else if (player.total > dealer.total) {
        msg = 'You win $' + currentBet + '!';
        balance += currentBet * 2;
    } else if (player.total < dealer.total) {
        msg = 'Dealer wins. You lose $' + currentBet + '.';
    } else {
        msg = 'Push! Bet returned.';
        balance += currentBet;
    }

    gamePhase = 'roundOver';
    messageEl.textContent = msg;
    renderGame();
}

function newRound() {
    if (balance === 0) {
        balance = STARTING_BALANCE;
        messageEl.textContent = 'Restarting with $' + STARTING_BALANCE + '. Good luck!';
    } else {
        messageEl.textContent = 'Place your bet.';
    }
    playerHand = [];
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
    betEl.textContent = currentBet > 0 ? '$' + currentBet : '-';

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

    // Player cards
    playerCardsEl.innerHTML = '';
    for (const card of playerHand) {
        playerCardsEl.appendChild(createCardElement(card, false));
    }

    // Player score
    if (playerHand.length > 0) {
        const pv = calculateHandValue(playerHand);
        playerScoreEl.textContent = pv.total;
        playerScoreEl.classList.remove('hidden');
    } else {
        playerScoreEl.classList.add('hidden');
    }

    // Controls visibility
    const isBetting = gamePhase === 'betting';
    const isPlaying = gamePhase === 'playing';
    const isOver = gamePhase === 'roundOver';

    bettingControls.classList.toggle('hidden', !isBetting);
    actionRow.classList.toggle('hidden', !isPlaying);
    dealAgainBtn.classList.toggle('hidden', !isOver);

    // Double down availability
    if (isPlaying) {
        const canDouble = playerHand.length === 2 && currentBet <= balance;
        doubleBtn.disabled = !canDouble;
    }
}

// --- Utility ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Init ---
deck = shuffleDeck(createDeck());
balance -= 0; // no-op, just establishing initial balance display
messageEl.textContent = 'Place your bet.';
renderGame();
