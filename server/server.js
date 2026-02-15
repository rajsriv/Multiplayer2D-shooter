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
    
    if (playerInfo) {
      // Use io.in to send to EVERYONE in the room including the sender
      io.in(roomCode).emit('game-event', {
        type: 'PLAYER_JOINED',
        payload: { roomCode, player: playerInfo }
      });
      console.log(`[BROADCAST] PLAYER_JOINED for "${playerName}" in room ${roomCode}`);
    }

    socket.emit('room-joined-ack', { roomCode });
  });

  socket.on('game-event', (data) => {
    const { type, payload } = data;
    if (payload && payload.roomCode) {
      console.log(`[EVENT] ${type} in room ${payload.roomCode}`);
      // Use io.in to send to EVERYONE in the room
      io.in(payload.roomCode).emit('game-event', data);
    }
  });

  socket.on('player-move', (data) => {
    if (data.roomCode) {
      // Moves still use to().emit (exclude sender) for performance
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
