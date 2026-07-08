import { useState } from 'react';

export function RoomCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — the code is still visible to copy manually.
    }
  }

  return (
    <button type="button" className="room-code-badge" onClick={copy} title="Click to copy">
      <span className="room-code-label">ROOM CODE</span>
      <span className="room-code-value">{code}</span>
      {copied && <span className="room-code-copied">Copied!</span>}
    </button>
  );
}
