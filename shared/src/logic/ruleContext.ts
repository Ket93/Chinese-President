/**
 * Decouples per-round transient state (revolution) from the static GameConfig,
 * so combo logic never needs the full config, just what it needs to compare cards.
 */
export interface RuleContext {
  deckCount: 1 | 2;
  runLength: number;
  revolutionActive: boolean;
}
