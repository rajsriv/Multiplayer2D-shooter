import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const GameContext = createContext();

const SYNC_CHANNEL = "retro_strike_sync";

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

  const [channel, setChannel] = useState(null);
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  const handleDeath = useCallback(() => {
    setGameState((prev) => ({ ...prev, isDead: true, respawnTime: 10 }));
  }, []);

  const createRoom = useCallback((name) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = Date.now() + 2 * 60 * 1000;
    const myId = Math.random().toString(36).substring(7);
    const me = { name, color: randomColor(), id: myId, team: "blue", x: 400, y: 300, angle: 0 };
    
    setGameState((prev) => ({
      ...prev,
      playerName: name,
      roomCode: code,
      isJoined: true,
      isHost: true,
      roomExpiry: expiry,
      players: [me],
    }));
  }, []);

  const joinRoom = useCallback((name, code) => {
    const myId = Math.random().toString(36).substring(7);
    const me = { name, color: randomColor(), id: myId, team: "red", x: 400, y: 300, angle: 0 };
    
    setGameState((prev) => ({
      ...prev,
      playerName: name,
      roomCode: code,
      isJoined: true,
      isHost: false,
      players: [me], 
    }));

    if (channel) {
      channel.postMessage({
        type: "PLAYER_JOINED",
        payload: { roomCode: code, player: me }
      });
      setTimeout(() => {
        channel.postMessage({
          type: "SYNC_REQUEST",
          payload: { roomCode: code }
        });
      }, 300);
    }
  }, [channel]);

  const startGame = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState) return;
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
    
    if (channel && currentState.roomCode) {
      channel.postMessage({
        type: "GAME_STARTED",
        payload: { 
          roomCode: currentState.roomCode, 
          mapObstacles: obs,
          allowBots: currentState.allowBots 
        }
      });
    }
  }, [channel]);

  const updateSettings = useCallback((newMode, newBots) => {
    const currentState = stateRef.current;
    if (!currentState) return;
    setGameState(prev => ({ ...prev, gameMode: newMode, allowBots: newBots }));
    if (channel && currentState.roomCode) {
      channel.postMessage({
        type: "SETTINGS_UPDATE",
        payload: { roomCode: currentState.roomCode, gameMode: newMode, allowBots: newBots }
      });
    }
  }, [channel]);

  const broadcastMove = useCallback((x, y, angle) => {
    const currentState = stateRef.current;
    if (!currentState) return;
    if (channel && currentState.roomCode) {
      const me = (currentState.players || []).find(p => p.name === currentState.playerName);
      if (!me) return;
      channel.postMessage({
        type: "PLAYER_MOVE",
        payload: { roomCode: currentState.roomCode, playerId: me.id, x, y, angle }
      });
    }
  }, [channel]);

  const reportKill = useCallback((targetId) => {
    const currentState = stateRef.current;
    if (!currentState) return;
    if (channel && currentState.roomCode) {
      channel.postMessage({
        type: "PLAYER_DIED",
        payload: { roomCode: currentState.roomCode, targetId }
      });
    }
  }, [channel]);

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
    const bc = new BroadcastChannel(SYNC_CHANNEL);
    setChannel(bc);

    bc.onmessage = (event) => {
      if (!event.data) return;
      const { type, payload } = event.data;
      const currentState = stateRef.current;
      if (!currentState) return;
      const myId = (currentState.players || []).find(p => p.name === currentState.playerName)?.id;
      
      switch (type) {
        case "PLAYER_DIED":
          if (payload.roomCode === currentState.roomCode && payload.targetId === myId) {
            handleDeath();
          }
          break;
        case "SETTINGS_UPDATE":
          if (payload.roomCode === currentState.roomCode) {
            setGameState(prev => ({ 
              ...prev, 
              gameMode: payload.gameMode, 
              allowBots: payload.allowBots 
            }));
          }
          break;
        case "PLAYER_JOINED":
          if (payload.roomCode === currentState.roomCode) {
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
          }
          break;
        case "SYNC_REQUEST":
          if (currentState.isHost && currentState.roomCode && payload.roomCode === currentState.roomCode) {
            bc.postMessage({
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
          if (currentState.roomCode && payload.roomCode === currentState.roomCode) {
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
          }
          break;
        case "PLAYER_MOVE":
          if (currentState.roomCode && payload.roomCode === currentState.roomCode) {
            if (!payload.playerId) return;
            setGameState(prev => ({
              ...prev,
              players: (prev.players || []).map(p => 
                p.id === payload.playerId ? { ...p, x: payload.x, y: payload.y, angle: payload.angle } : p
              )
            }));
          }
          break;
        case "GAME_STARTED":
          if (currentState.roomCode && payload.roomCode === currentState.roomCode) {
            setGameState(prev => ({ 
              ...prev, 
              isStarted: true,
              mapObstacles: payload.mapObstacles || prev.mapObstacles,
              allowBots: payload.allowBots ?? prev.allowBots
            }));
          }
          break;
        default:
          break;
      }
    };

    return () => bc.close();
  }, [handleDeath]);

  useEffect(() => {
    let timer;
    if (gameState.isDead && gameState.respawnTime > 0) {
      timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          respawnTime: Math.max(0, prev.respawnTime - 1),
          isDead: prev.respawnTime > 1,
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.isDead, gameState.respawnTime]);

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
