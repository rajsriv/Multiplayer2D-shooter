import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

io.on('connection', (socket) => {
  console.log(`[CONNECT] Socket ID: ${socket.id}`);

  socket.on('join-room', ({ roomCode, playerName, playerInfo }) => {
    socket.join(roomCode);
    console.log(`[JOIN] Player "${playerName}" joined room: ${roomCode}`);
    
    // Broadcast to others in the room that a player joined
    if (playerInfo) {
      socket.to(roomCode).emit('game-event', {
        type: 'PLAYER_JOINED',
        payload: { roomCode, player: playerInfo }
      });
      console.log(`[BROADCAST] PLAYER_JOINED for "${playerName}" in room ${roomCode}`);
    }

    // Acknowledge the join back to the client
    socket.emit('room-joined-ack', { roomCode });
  });

  socket.on('game-event', (data) => {
    const { type, payload } = data;
    if (payload && payload.roomCode) {
      console.log(`[EVENT] ${type} from ${socket.id} to room ${payload.roomCode}`);
      socket.to(payload.roomCode).emit('game-event', data);
    }
  });

  socket.on('player-move', (data) => {
    if (data.roomCode) {
      socket.to(data.roomCode).emit('player-move', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Socket ID: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
