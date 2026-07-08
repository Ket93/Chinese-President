import { RANK_VALUE, generateLegalMoves, type Card, type Combo, type Rank, type RuleContext } from '@chinese-president/shared';

/**
 * Lowest legal combo that beats the table, preferring not to spend a bomb
 * unless it's the only option; null means pass. When `requireThreeClubs` is
 * set (round 1's opening lead), only considers combos that include the
 * literal 3 of clubs — the bot always holds it in that situation, since it's
 * the reason it was chosen to lead, so a single 3♣ is always a fallback.
 */
export function chooseBotPlay(hand: Card[], currentCombo: Combo | null, ctx: RuleContext, requireThreeClubs = false): Combo | null {
  let moves = generateLegalMoves(hand, currentCombo, ctx); // already sorted ascending by defining rank
  if (requireThreeClubs) {
    moves = moves.filter((m) => m.cards.some((c) => c.rank === '3' && c.suit === 'clubs'));
  }
  if (moves.length === 0) return null;
  const nonBomb = moves.filter((m) => m.kind !== 'bomb');
  return nonBomb.length > 0 ? nonBomb[0]! : moves[0]!;
}

export function chooseLowestCard(cards: Card[]): Card {
  return [...cards].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0]!;
}

const REQUESTABLE_RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10'];

/** Bots keep exchange requests simple: always request the <=10 rank they hold the fewest of. */
export function chooseBotExchangeRequestRank(hand: Card[]): Rank {
  let best: Rank = REQUESTABLE_RANKS[0]!;
  let bestCount = Infinity;
  for (const rank of REQUESTABLE_RANKS) {
    const count = hand.filter((c) => c.rank === rank).length;
    if (count < bestCount) {
      bestCount = count;
      best = rank;
    }
  }
  return best;
}
