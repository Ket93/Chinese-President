import { CardBack } from '../card/CardBack.js';

export interface DeckPileProps {
  trickCount: number;
  onClick: () => void;
}

export function DeckPile({ trickCount, onClick }: DeckPileProps) {
  return (
    <button type="button" className="deck-pile" onClick={onClick} title="View played tricks">
      <div className="deck-pile-stack">
        <CardBack size="small" />
      </div>
      <span className="deck-pile-label">
        {trickCount} trick{trickCount === 1 ? '' : 's'} played
      </span>
    </button>
  );
}
