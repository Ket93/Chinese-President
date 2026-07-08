import type { Combo, PlayerPublic } from '@chinese-president/shared';
import { SvgCard } from '../card/SvgCard.js';

export interface TableComboProps {
  combo: Combo | null;
  leaderId: string | null;
  players: PlayerPublic[];
}

export function TableCombo({ combo, leaderId, players }: TableComboProps) {
  const leaderName = players.find((p) => p.id === leaderId)?.name;

  if (!combo) {
    return <div className="table-combo empty">{leaderName ? `${leaderName} to lead` : 'Waiting to start…'}</div>;
  }

  return (
    <div className="table-combo">
      <div className="table-combo-cards mini-hand">
        {combo.cards.map((c) => (
          <div key={c.id} className="hand-card-slot">
            <SvgCard rank={c.rank} suit={c.suit} size="small" />
          </div>
        ))}
      </div>
      {leaderName && <div className="table-combo-label">{leaderName}</div>}
    </div>
  );
}
