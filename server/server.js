import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';

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
    if (!roomCode) {
      console.warn(`[WARN] join-room received with no roomCode from ${playerName}`);
      return;
    }
    
    socket.join(roomCode);
    console.log(`[JOIN] Player "${playerName}" (${socket.id}) joined room: ${roomCode}`);
    
    // Check how many people are in the room
    const clients = io.sockets.adapter.rooms.get(roomCode);
    const numClients = clients ? clients.size : 0;
    console.log(`[ROOM] Room ${roomCode} now has ${numClients} participants`);

    if (playerInfo) {
      io.in(roomCode).emit('game-event', {
        type: 'PLAYER_JOINED',
        payload: { roomCode, player: playerInfo }
      });
      console.log(`[BROADCAST] PLAYER_JOINED in room ${roomCode}`);
    }

    socket.emit('room-joined-ack', { roomCode });
  });

  socket.on('game-event', (data) => {
    const { type, payload } = data;
    if (payload && payload.roomCode) {
      console.log(`[EVENT] ${type} in room ${payload.roomCode} from ${socket.id}`);
      io.in(payload.roomCode).emit('game-event', data);
    } else {
      console.warn(`[WARN] game-event ${type} received with no roomCode:`, data);
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

const getLocalIPs = () => {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
};

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 WebSocket server running on port ${PORT}`);
  console.log(`📡 Local interfaces accessible at:`);
  console.log(`   - localhost:${PORT}`);
  getLocalIPs().forEach(ip => console.log(`   - ${ip}:${PORT}`));
  console.log(`\nUse one of the IP addresses above to connect from other devices on your Wi-Fi!\n`);
});
