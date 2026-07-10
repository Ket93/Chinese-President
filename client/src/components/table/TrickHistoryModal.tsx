import type { Combo, PlayerPublic, TrickLogEntry } from '@chinese-president/shared';
import { SvgCard } from '../card/SvgCard.js';

export interface TrickHistoryModalProps {
  trickHistory: TrickLogEntry[][];
  players: PlayerPublic[];
  onClose: () => void;
}

function playerName(players: PlayerPublic[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? 'Unknown';
}

export function TrickHistoryModal({ trickHistory, players, onClose }: TrickHistoryModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel modal-panel history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h3>Played Tricks</h3>
          <button className="btn secondary small" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {trickHistory.length === 0 ? (
          <p className="exchange-waiting">No tricks completed yet this round.</p>
        ) : (
          <div className="history-list">
            {trickHistory.map((trick, i) => (
              <div key={i} className="history-trick">
                <div className="history-trick-label">Trick {trickHistory.length - i}</div>
                {trick
                  .filter((entry) => entry.action !== 'pass')
                  .map((entry, j) => {
                    const combo = entry.action as Combo;
                    return (
                      <div key={j} className="history-play-row">
                        <span className="history-play-name">{playerName(players, entry.playerId)}</span>
                        <div className="mini-hand">
                          {combo.cards.map((c) => (
                            <div key={c.id} className="hand-card-slot">
                              <SvgCard rank={c.rank} suit={c.suit} size="small" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
