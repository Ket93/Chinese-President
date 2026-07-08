import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './socket/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// In production the client is built to client/dist and served from this same
// process/port, so the deployed app is a single service with one URL — no
// separate frontend host or CORS config needed.
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found — client build missing. Run `npm run build` first.');
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`Chinese President server listening on :${PORT}`);
});
