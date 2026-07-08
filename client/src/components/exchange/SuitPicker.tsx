import { SUITS, type Rank, type Suit } from '@chinese-president/shared';
import { SUIT_COLOR_VAR, SUIT_SYMBOL } from '../card/suitGlyphs.js';

export interface SuitPickerProps {
  rank: Rank;
  onPick: (suit: Suit) => void;
  onCancel: () => void;
}

export function SuitPicker({ rank, onPick, onCancel }: SuitPickerProps) {
  return (
    <div className="suit-picker">
      <p>Choose the suit for your {rank}:</p>
      <div className="suit-picker-row">
        {SUITS.map((suit) => (
          <button
            key={suit}
            className="btn secondary suit-btn"
            type="button"
            style={{ color: SUIT_COLOR_VAR[suit] }}
            onClick={() => onPick(suit)}
          >
            {SUIT_SYMBOL[suit]}
          </button>
        ))}
      </div>
      <button className="btn secondary small" type="button" onClick={onCancel}>
        Back
      </button>
    </div>
  );
}
