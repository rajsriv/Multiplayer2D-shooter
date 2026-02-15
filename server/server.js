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
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomCode, playerName }) => {
    socket.join(roomCode);
    console.log(`User ${playerName} (${socket.id}) joined room: ${roomCode}`);
  });

  socket.on('game-event', (data) => {
    if (data.payload && data.payload.roomCode) {
      socket.to(data.payload.roomCode).emit('game-event', data);
    }
  });

  socket.on('player-move', (data) => {
    if (data.roomCode) {
      socket.to(data.roomCode).emit('player-move', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
