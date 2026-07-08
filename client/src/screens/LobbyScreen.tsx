import { useState, type FormEvent } from 'react';
import { socket } from '../socket.js';
import { useGameDispatch, useGameState } from '../state/GameContext.js';

export function LobbyScreen() {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { errorMessage } = useGameState();
  const dispatch = useGameDispatch();

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('room:create', { hostName: name.trim() });
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('room:join', { roomCode: roomCode.trim().toUpperCase(), name: name.trim() });
  }

  return (
    <div className="centered-screen">
      <div className="panel lobby-panel">
        <h1>Chinese President</h1>
        <div className="tab-row">
          <button type="button" className={`tab${mode === 'create' ? ' active' : ''}`} onClick={() => setMode('create')}>
            Create Room
          </button>
          <button type="button" className={`tab${mode === 'join' ? ' active' : ''}`} onClick={() => setMode('join')}>
            Join Room
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="lobby-form">
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="e.g. Alice" autoFocus />
            </label>
            <button className="btn" type="submit">
              Create Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="lobby-form">
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="e.g. Bob" autoFocus />
            </label>
            <label>
              Room code
              <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={6} placeholder="e.g. 7F3K" />
            </label>
            <button className="btn" type="submit">
              Join Room
            </button>
          </form>
        )}

        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </div>
    </div>
  );
}
