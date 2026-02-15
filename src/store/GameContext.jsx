import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const GameContext = createContext();

const SOCKET_URL = "http://localhost:3001";

const WEAPONS = [
  { name: "Knife", range: 100, killsRequired: 0 },
  { name: "Pistol", range: 250, killsRequired: 5 },
  { name: "SMG", range: 350, killsRequired: 10 },
  { name: "Rifle", range: 500, killsRequired: 15 },
  { name: "Sniper", range: 800, killsRequired: 20 },
];

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    playerName: "",
    roomCode: null,
    isJoined: false,
    players: [],
    gameMode: "FFA",
    isStarted: false,
    isHost: false,
    isSpectator: false,
    roomExpiry: null,
    kills: 0,
    weaponLevel: 0,
    isDead: false,
    respawnTime: 0,
    teamKills: { red: 0, blue: 0 },
    winner: null,
    mapObstacles: [],
    allowBots: true,
  });

  const [socket, setSocket] = useState(null);
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  const handleDeath = useCallback(() => {
    setGameState((prev) => ({ ...prev, isDead: true, respawnTime: 5 }));
  }, []);

  const createRoom = useCallback((name) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = Date.now() + 2 * 60 * 1000;
    const myId = Math.random().toString(36).substring(7);
    const me = { name, color: randomColor(), id: myId, team: "blue", x: 400, y: 300, angle: 0, isDead: false, isHost: true };
    
    console.log(`[CREATE] Room: ${code} for player: ${name}`);

    setGameState((prev) => ({
      ...prev,
      playerName: name,
      roomCode: code,
      isJoined: true,
      isHost: true,
      roomExpiry: expiry,
      players: [me],
    }));

    if (socket) {
      socket.emit('join-room', { roomCode: code, playerName: name, playerInfo: me });
    }
  }, [socket]);

  const joinRoom = useCallback((name, code) => {
    const myId = Math.random().toString(36).substring(7);
    const me = { name, color: randomColor(), id: myId, team: "red", x: 400, y: 300, angle: 0, isDead: false, isHost: false };
    
    console.log(`[JOIN] Room: ${code} for player: ${name}`);

    setGameState((prev) => ({
      ...prev,
      playerName: name,
      roomCode: code,
      isJoined: true,
      isHost: false,
      players: [me], 
    }));

    if (socket) {
      socket.emit('join-room', { roomCode: code, playerName: name, playerInfo: me });
      
      // Wait a bit for the host to process the join broadcast from server
      setTimeout(() => {
        console.log(`[SYNC] Requesting sync for room: ${code}`);
        socket.emit('game-event', {
          type: "SYNC_REQUEST",
          payload: { roomCode: code }
        });
      }, 500);
    }
  }, [socket]);

  const startGame = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState || !currentState.isHost) return;
    
    console.log(`[START] Game in room: ${currentState.roomCode}`);

    const obs = [];
    const count = 6 + Math.floor(Math.random() * 4);
    const wLimit = 800;
    const hLimit = 600;
    for (let i = 0; i < count; i++) {
        const w = 40 + Math.random() * 100;
        const h = 40 + Math.random() * 100;
        const x = Math.random() * (wLimit - w);
        const y = Math.random() * (hLimit - h);
        if (Math.hypot(x + w / 2 - wLimit / 2, y + h / 2 - hLimit / 2) > 100) {
            obs.push({ x, y, w, h });
        }
    }

    setGameState(prev => ({ ...prev, isStarted: true, mapObstacles: obs }));
    
    if (socket && currentState.roomCode) {
      socket.emit('game-event', {
        type: "GAME_STARTED",
        payload: { 
          roomCode: currentState.roomCode, 
          mapObstacles: obs,
          allowBots: currentState.allowBots 
        }
      });
    }
  }, [socket]);

  const updateSettings = useCallback((newMode, newBots) => {
    const currentState = stateRef.current;
    if (!currentState || !currentState.isHost) return;
    
    setGameState(prev => ({ ...prev, gameMode: newMode, allowBots: newBots }));
    if (socket && currentState.roomCode) {
      socket.emit('game-event', {
        type: "SETTINGS_UPDATE",
        payload: { roomCode: currentState.roomCode, gameMode: newMode, allowBots: newBots }
      });
    }
  }, [socket]);

  const broadcastMove = useCallback((x, y, angle) => {
    const currentState = stateRef.current;
    if (!currentState || !currentState.isStarted || currentState.isDead) return;
    
    if (socket && currentState.roomCode) {
      const me = (currentState.players || []).find(p => p.name === currentState.playerName);
      if (!me) return;
      socket.emit('player-move', { 
        roomCode: currentState.roomCode, 
        playerId: me.id, 
        x, 
        y, 
        angle 
      });
    }
  }, [socket]);

  const reportKill = useCallback((targetId) => {
    const currentState = stateRef.current;
    if (!currentState || !currentState.roomCode) return;
    
    if (socket) {
      socket.emit('game-event', {
        type: "PLAYER_DIED",
        payload: { roomCode: currentState.roomCode, targetId }
      });
    }
  }, [socket]);

  const addKill = useCallback(() => {
    setGameState(prev => {
      const me = (prev.players || []).find(p => p.name === prev.playerName);
      const myTeam = me?.team || "blue";
      const newKills = prev.kills + 1;
      const newTeamKills = { ...prev.teamKills, [myTeam]: (prev.teamKills[myTeam] || 0) + 1 };
      
      let newLevel = prev.weaponLevel;
      if (newLevel < WEAPONS.length - 1 && newKills >= WEAPONS[newLevel + 1]?.killsRequired) {
        newLevel++;
      }
      
      let winner = prev.winner;
      if (prev.gameMode === "TDM") {
        if (newTeamKills.blue >= 40) winner = 'BLUE TEAM';
        else if (newTeamKills.red >= 40) winner = 'RED TEAM';
      } else {
        if (newKills >= 40) winner = prev.playerName;
      }

      return { ...prev, kills: newKills, teamKills: newTeamKills, weaponLevel: newLevel, winner };
    });
  }, []);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`[SOCKET] Connected: ${newSocket.id}`);
    });

    newSocket.on('game-event', (event) => {
      if (!event) return;
      const { type, payload } = event;
      const currentState = stateRef.current;
      
      // In a real app, we'd check roomCode, but since the server handles room isolation
      // and React state is async, we allow events through to avoid stale state issues.
      // console.log(`[RECV] Event: ${type}`, payload);

      const myId = (currentState.players || []).find(p => p.name === currentState.playerName)?.id;
      
      switch (type) {
        case "PLAYER_DIED":
          setGameState(prev => ({
            ...prev,
            players: (prev.players || []).map(p => 
              p.id === payload.targetId ? { ...p, isDead: true } : p
            )
          }));
          if (payload.targetId === myId) {
            handleDeath();
          }
          break;
        case "SETTINGS_UPDATE":
          setGameState(prev => ({ 
            ...prev, 
            gameMode: payload.gameMode, 
            allowBots: payload.allowBots 
          }));
          break;
        case "PLAYER_JOINED":
          setGameState(prev => {
            if ((prev.players || []).find(p => p.id === payload.player.id)) return prev;
            const newPlayer = { ...payload.player };
            const newPlayers = [...prev.players, newPlayer];
            if (prev.gameMode === "TDM") {
              const blueCount = newPlayers.filter(p => p.team === "blue").length;
              const redCount = newPlayers.filter(p => p.team === "red").length;
              const assignedTeam = blueCount <= redCount ? "blue" : "red";
              newPlayer.team = assignedTeam;
              newPlayer.color = assignedTeam === 'blue' ? '#3b82f6' : '#ef4444';
            }
            return { ...prev, players: newPlayers };
          });
          break;
        case "SYNC_REQUEST":
          if (currentState.isHost) {
            console.log(`[HOST] Sending sync response to joining player`);
            newSocket.emit('game-event', {
              type: "SYNC_RESPONSE",
              payload: {
                roomCode: currentState.roomCode,
                players: currentState.players,
                isStarted: currentState.isStarted,
                gameMode: currentState.gameMode,
                mapObstacles: currentState.mapObstacles,
                allowBots: currentState.allowBots
              }
            });
          }
          break;
        case "SYNC_RESPONSE":
          console.log(`[JOINER] Received sync response from host`);
          setGameState(prev => {
            if (prev.isHost) return prev;
            const innerMyId = (prev.players || []).find(p => p.name === prev.playerName)?.id;
            const me = (prev.players || []).find(p => p.id === innerMyId);
            const incomingPlayers = payload.players || [];
            const otherPlayers = incomingPlayers.filter(p => p.id !== innerMyId);
            return {
              ...prev,
              players: me ? [me, ...otherPlayers] : incomingPlayers,
              isStarted: payload.isStarted,
              gameMode: payload.gameMode,
              mapObstacles: payload.mapObstacles || prev.mapObstacles,
              isSpectator: payload.isStarted,
              allowBots: payload.allowBots
            };
          });
          break;
        case "PLAYER_RESPAWNED":
          if (payload.roomCode === currentState.roomCode) {
            setGameState(prev => ({
              ...prev,
              players: (prev.players || []).map(p => 
                p.id === payload.playerId ? { ...p, isDead: false } : p
              )
            }));
          }
          break;
        case "GAME_STARTED":
          // ... (existing)
          setGameState(prev => ({ 
            ...prev, 
            isStarted: true,
            mapObstacles: payload.mapObstacles || prev.mapObstacles,
            allowBots: payload.allowBots ?? prev.allowBots
          }));
          break;
        default:
          break;
      }
    });

    newSocket.on('player-move', (payload) => {
      if (!payload.playerId) return;
      setGameState(prev => ({
          ...prev,
          players: (prev.players || []).map(p => 
            p.id === payload.playerId ? { ...p, x: payload.x, y: payload.y, angle: payload.angle } : p
          )
        }));
    });

    newSocket.on('disconnect', () => {
      console.log("[SOCKET] Disconnected");
    });

    return () => newSocket.close();
  }, [handleDeath]);

  useEffect(() => {
    let timer;
    if (gameState.isDead && gameState.respawnTime > 0) {
      timer = setInterval(() => {
        setGameState((prev) => {
          const newTime = Math.max(0, prev.respawnTime - 1);
          const nowAlive = newTime === 0;
          
          if (nowAlive && socket && prev.roomCode) {
            const myId = (prev.players || []).find(p => p.name === prev.playerName)?.id;
            socket.emit('game-event', {
              type: "PLAYER_RESPAWNED",
              payload: { roomCode: prev.roomCode, playerId: myId }
            });
          }

          return {
            ...prev,
            respawnTime: newTime,
            isDead: newTime > 0,
            // Also update local entry in players list immediately
            players: (prev.players || []).map(p => 
              p.name === prev.playerName ? { ...p, isDead: newTime > 0 } : p
            )
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isDead, gameState.respawnTime, socket]);

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        createRoom,
        joinRoom,
        startGame,
        updateSettings,
        broadcastMove,
        reportKill,
        addKill,
        handleDeath,
        weapons: WEAPONS,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
